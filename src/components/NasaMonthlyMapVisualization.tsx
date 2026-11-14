import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countriesAtlas from 'world-atlas/countries-110m.json';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  MapPin,
  X,
  ExternalLink,
  AlertCircle,
  Loader2,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  SpatialDatasetId,
  SpatialDatasetMetadata,
  SpatialMonthSlice,
  anomalyToRgb,
  formatLatLon,
  nasaSpatialMapService,
} from '../services/nasaSpatialMapService';
import {
  lookupNetCdfGridCell,
  mapPianoEngine,
  temperatureAnomalyToPianoFrequency,
} from '../services/mapPianoEngine';

export interface SpatialCellExtreme {
  lat: number;
  lon: number;
  value: number;
}

export interface SpatialMapTelemetry {
  dataset: SpatialDatasetId;
  year: number;
  month: number;
  slice: SpatialMonthSlice | null;
  metadata: SpatialDatasetMetadata | null;
  minCell: SpatialCellExtreme | null;
  maxCell: SpatialCellExtreme | null;
  isLoading: boolean;
}

interface NasaMonthlyMapVisualizationProps {
  initialYear?: number;
  onTelemetryChange?: (telemetry: SpatialMapTelemetry) => void;
}

interface InspectedCell {
  latIdx: number;
  lonIdx: number;
  lat: number;
  lon: number;
  value: number | null;
}

type RingCoords = number[][];

function extractRingsFromGeoJson(geojson: unknown): RingCoords[] {
  const rings: RingCoords[] = [];
  const fc = geojson as {
    type?: string;
    features?: Array<{
      geometry?: {
        type?: string;
        coordinates?: unknown;
      };
    }>;
  };
  if (!fc || !Array.isArray(fc.features)) return rings;

  for (const feat of fc.features) {
    const geom = feat.geometry;
    if (!geom || !geom.coordinates) continue;
    if (geom.type === 'Polygon') {
      const poly = geom.coordinates as RingCoords[];
      for (const ring of poly) rings.push(ring);
    } else if (geom.type === 'MultiPolygon') {
      const mpoly = geom.coordinates as RingCoords[][];
      for (const poly of mpoly) {
        for (const ring of poly) rings.push(ring);
      }
    }
  }
  return rings;
}

const CANVAS_W = 2160;
const CANVAS_H = 1080;

export const NasaMonthlyMapVisualization: React.FC<NasaMonthlyMapVisualizationProps> = ({
  initialYear = 2025,
  onTelemetryChange,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();

  const [dataset, setDataset] = useState<SpatialDatasetId>('land-ocean');
  const [metadata, setMetadata] = useState<SpatialDatasetMetadata | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(12);
  const [slice, setSlice] = useState<SpatialMonthSlice | null>(null);

  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);
  const [isLoadingSlice, setIsLoadingSlice] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeedMs, setPlaySpeedMs] = useState<number>(650);
  const [showMetadataPanel, setShowMetadataPanel] = useState<boolean>(false);

  const [hoveredCell, setHoveredCell] = useState<InspectedCell | null>(null);
  const [pinnedCell, setPinnedCell] = useState<InspectedCell | null>(null);

  const [listenToEarth, setListenToEarth] = useState<boolean>(true);
  const [pianoVolume, setPianoVolume] = useState<number>(0.65);
  const [activeFrequencyHz, setActiveFrequencyHz] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hatchPatternRef = useRef<CanvasPattern | null>(null);
  const hatchContrastRef = useRef<boolean | null>(null);
  const isPointerInsideRef = useRef<boolean>(false);

  // Decode Natural Earth vector coastlines once
  const coastlineRings = useMemo(() => {
    const topology = countriesAtlas as unknown as Topology;
    const countriesObj = topology.objects.countries;
    const geojson = feature(topology, countriesObj);
    return extractRingsFromGeoJson(geojson);
  }, []);

  // Lookup set of valid (year-month) pairs in the loaded NetCDF file
  const availableMonthSet = useMemo(() => {
    const set = new Set<string>();
    if (metadata) {
      for (const m of metadata.availableMonths) {
        set.add(`${m.year}-${m.month}`);
      }
    }
    return set;
  }, [metadata]);

  const yearOptions = useMemo(() => {
    if (!metadata) return [];
    const years: number[] = [];
    for (let y = metadata.maxYear; y >= metadata.minYear; y--) {
      years.push(y);
    }
    return years;
  }, [metadata]);

  const selectionRef = useRef({ year: selectedYear, month: selectedMonth });
  selectionRef.current = { year: selectedYear, month: selectedMonth };

  // Load NetCDF metadata whenever dataset switches
  const loadDatasetMetadata = useCallback(
    async (dsId: SpatialDatasetId, forceRefresh = false) => {
      setIsLoadingMeta(true);
      setErrorMsg(null);
      try {
        const meta = await nasaSpatialMapService.getMetadata(dsId, forceRefresh);
        setMetadata(meta);

        // Ensure current (year, month) exists in dataset; otherwise clamp to latest available month
        const { year: curYear, month: curMonth } = selectionRef.current;
        const clampedY = Math.max(meta.minYear, Math.min(meta.maxYear, curYear));
        const exists = meta.availableMonths.some(
          (m) => m.year === clampedY && m.month === curMonth
        );
        let nextM = curMonth;
        if (!exists) {
          const monthsInYear = meta.availableMonths.filter((m) => m.year === clampedY);
          nextM =
            monthsInYear.length > 0
              ? monthsInYear[monthsInYear.length - 1].month
              : meta.maxMonth;
        }
        if (clampedY !== curYear) setSelectedYear(clampedY);
        if (nextM !== curMonth) setSelectedMonth(nextM);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to load NASA GISTEMP spatial NetCDF data.';
        setErrorMsg(msg);
      } finally {
        setIsLoadingMeta(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDatasetMetadata(dataset, false);
  }, [dataset, loadDatasetMetadata]);

  // Load monthly spatial slice when (dataset, selectedYear, selectedMonth) changes
  useEffect(() => {
    if (!metadata) return;
    if (!availableMonthSet.has(`${selectedYear}-${selectedMonth}`)) return;

    let cancelled = false;
    setIsLoadingSlice(true);
    setErrorMsg(null);

    nasaSpatialMapService
      .getMonthlySlice(dataset, selectedYear, selectedMonth)
      .then((loadedSlice) => {
        if (cancelled) return;
        setSlice(loadedSlice);

        // Update hovered & pinned cell values when month/year/dataset slice changes
        setHoveredCell((prev) => {
          if (!prev) return null;
          const nextVal =
            loadedSlice.values[prev.latIdx * loadedSlice.lonCount + prev.lonIdx] ?? null;
          return { ...prev, value: nextVal };
        });

        setPinnedCell((prev) => {
          if (!prev) return null;
          const nextVal =
            loadedSlice.values[prev.latIdx * loadedSlice.lonCount + prev.lonIdx] ?? null;
          return { ...prev, value: nextVal };
        });

        // Pre-fetch the next chronological month for smooth playback/stepping
        const curIdx = loadedSlice.timeIndex;
        if (curIdx + 1 < metadata.availableMonths.length) {
          const next = metadata.availableMonths[curIdx + 1];
          nasaSpatialMapService.prefetchSlice(dataset, next.year, next.month);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load monthly spatial slice.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlice(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataset, selectedYear, selectedMonth, metadata, availableMonthSet]);

  // Synchronize interactive piano engine enabled state, volume, and unmount cleanup
  useEffect(() => {
    mapPianoEngine.setEnabled(listenToEarth);
    if (!listenToEarth) {
      setActiveFrequencyHz(null);
    }
  }, [listenToEarth]);

  useEffect(() => {
    mapPianoEngine.setVolume(pianoVolume);
  }, [pianoVolume]);

  useEffect(() => {
    return () => {
      mapPianoEngine.releaseAllNotes();
    };
  }, []);

  // Re-evaluate hovered cell's piano frequency when historical slice updates while hovering
  useEffect(() => {
    if (!slice || !listenToEarth || !isPointerInsideRef.current || !hoveredCell) return;
    const cellKey = `${slice.dataset}:${slice.year}:${slice.month}:${hoveredCell.latIdx}:${hoveredCell.lonIdx}`;
    const freq = mapPianoEngine.handleHoveredCell(hoveredCell.value, cellKey, slice.fillValue);
    setActiveFrequencyHz(freq);
  }, [slice, hoveredCell, listenToEarth]);

  // Compute exact coldest and warmest 2°x2° grid cell coordinates for the active slice
  const { minCell, maxCell } = useMemo(() => {
    if (!slice || !metadata) {
      return { minCell: null as SpatialCellExtreme | null, maxCell: null as SpatialCellExtreme | null };
    }
    let minVal = Infinity;
    let maxVal = -Infinity;
    let minIdx = -1;
    let maxIdx = -1;
    const { values } = slice;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v === null) continue;
      if (v < minVal) {
        minVal = v;
        minIdx = i;
      }
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }
    const toCell = (idx: number, val: number): SpatialCellExtreme | null => {
      if (idx < 0) return null;
      const latIdx = Math.floor(idx / slice.lonCount);
      const lonIdx = idx % slice.lonCount;
      return {
        lat: metadata.lat[latIdx] ?? -89 + latIdx * 2,
        lon: metadata.lon[lonIdx] ?? -179 + lonIdx * 2,
        value: val,
      };
    };
    return {
      minCell: toCell(minIdx, minVal),
      maxCell: toCell(maxIdx, maxVal),
    };
  }, [slice, metadata]);

  // Report synchronized spatial telemetry to parent dashboard panel
  useEffect(() => {
    if (!onTelemetryChange) return;
    onTelemetryChange({
      dataset,
      year: selectedYear,
      month: selectedMonth,
      slice,
      metadata,
      minCell,
      maxCell,
      isLoading: isLoadingMeta || isLoadingSlice,
    });
  }, [
    onTelemetryChange,
    dataset,
    selectedYear,
    selectedMonth,
    slice,
    metadata,
    minCell,
    maxCell,
    isLoadingMeta,
    isLoadingSlice,
  ]);

  // Chronological month navigation helpers
  const stepMonth = useCallback(
    (delta: number) => {
      if (!metadata || metadata.availableMonths.length === 0) return;
      const curIdx = metadata.availableMonths.findIndex(
        (m) => m.year === selectedYear && m.month === selectedMonth
      );
      const baseIdx = curIdx >= 0 ? curIdx : metadata.availableMonths.length - 1;
      let nextIdx = baseIdx + delta;
      if (nextIdx < 0) nextIdx = 0;
      if (nextIdx >= metadata.availableMonths.length) {
        if (isPlaying) {
          setIsPlaying(false);
          announceToScreenReader('Monthly temperature map animation reached final available observation.');
          return;
        }
        nextIdx = metadata.availableMonths.length - 1;
      }
      const next = metadata.availableMonths[nextIdx];
      setSelectedYear(next.year);
      setSelectedMonth(next.month);
    },
    [metadata, selectedYear, selectedMonth, isPlaying, announceToScreenReader]
  );

  // Automatic monthly playback interval
  useEffect(() => {
    if (!isPlaying || !metadata || isLoadingMeta) return;
    const timer = window.setInterval(() => {
      stepMonth(1);
    }, playSpeedMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, metadata, isLoadingMeta, playSpeedMs, stepMonth]);

  // Draw gridded spatial slice + coastlines + graticule + active reticle on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !slice || !metadata) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Prepare subtle diagonal hatch pattern for missing (_FillValue) cells
    if (!hatchPatternRef.current || hatchContrastRef.current !== settings.highContrast) {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 16;
      pCanvas.height = 16;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.fillStyle = settings.highContrast ? '#000000' : '#050811';
        pCtx.fillRect(0, 0, 16, 16);
        pCtx.strokeStyle = settings.highContrast
          ? 'rgba(255, 230, 0, 0.16)'
          : 'rgba(148, 163, 184, 0.16)';
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        pCtx.moveTo(0, 16);
        pCtx.lineTo(16, 0);
        pCtx.moveTo(-8, 8);
        pCtx.lineTo(8, -8);
        pCtx.moveTo(8, 24);
        pCtx.lineTo(24, 8);
        pCtx.stroke();
        hatchPatternRef.current = ctx.createPattern(pCanvas, 'repeat');
        hatchContrastRef.current = settings.highContrast;
      }
    }

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (hatchPatternRef.current) {
      ctx.fillStyle = hatchPatternRef.current;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 2. Render exact 180 x 90 NetCDF grid cells onto offscreen ImageData (nearest-neighbor crispness)
    const { latCount, lonCount, values } = slice;
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    if (offCanvas.width !== lonCount || offCanvas.height !== latCount) {
      offCanvas.width = lonCount;
      offCanvas.height = latCount;
    }
    const offCtx = offCanvas.getContext('2d');
    if (offCtx) {
      const imgData = offCtx.createImageData(lonCount, latCount);
      const data = imgData.data;
      // NetCDF lat is ordered South (-89) to North (+89); Canvas y=0 is North (+90)
      for (let latIdx = 0; latIdx < latCount; latIdx++) {
        const canvasRow = latCount - 1 - latIdx;
        const srcRowOffset = latIdx * lonCount;
        const dstRowOffset = canvasRow * lonCount;

        for (let lonIdx = 0; lonIdx < lonCount; lonIdx++) {
          const val = values[srcRowOffset + lonIdx];
          const pxOffset = (dstRowOffset + lonIdx) * 4;
          const rgb = anomalyToRgb(val);
          if (!rgb) {
            // Missing data (_FillValue): keep transparent to reveal hatch pattern
            data[pxOffset] = 0;
            data[pxOffset + 1] = 0;
            data[pxOffset + 2] = 0;
            data[pxOffset + 3] = 0;
          } else {
            data[pxOffset] = rgb[0];
            data[pxOffset + 1] = rgb[1];
            data[pxOffset + 2] = rgb[2];
            data[pxOffset + 3] = 240;
          }
        }
      }
      offCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offCanvas, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    // 3. Draw 30° latitude/longitude graticule lines
    ctx.save();
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = ((lon + 180) / 360) * CANVAS_W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.strokeStyle =
        lon === 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = lon === 0 ? 1.5 : 1;
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * CANVAS_H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.strokeStyle =
        lat === 0 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = lat === 0 ? 1.5 : 1;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Draw crisp Natural Earth vector coastlines & borders (with antimeridian wrap handling)
    ctx.save();
    ctx.beginPath();
    for (let r = 0; r < coastlineRings.length; r++) {
      const ring = coastlineRings[r];
      if (ring.length < 2) continue;
      let prevLon = ring[0][0];
      ctx.moveTo(((prevLon + 180) / 360) * CANVAS_W, ((90 - ring[0][1]) / 180) * CANVAS_H);
      for (let p = 1; p < ring.length; p++) {
        const lon = ring[p][0];
        const lat = ring[p][1];
        const x = ((lon + 180) / 360) * CANVAS_W;
        const y = ((90 - lat) / 180) * CANVAS_H;
        // Prevent horizontal streak lines across antimeridian (-180/+180)
        if (Math.abs(lon - prevLon) > 180) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        prevLon = lon;
      }
    }
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = settings.highContrast
      ? 'rgba(255, 230, 0, 0.85)'
      : 'rgba(248, 250, 252, 0.65)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();

    // 5. Highlight inspected (hovered or pinned) 2°x2° cell
    const activeCell = hoveredCell || pinnedCell;
    if (activeCell) {
      const cellW = CANVAS_W / lonCount;
      const cellH = CANVAS_H / latCount;
      const cellX = activeCell.lonIdx * cellW;
      const cellY = (latCount - 1 - activeCell.latIdx) * cellH;

      ctx.save();
      ctx.strokeStyle = settings.highContrast ? '#ffe600' : '#22d3ee';
      ctx.lineWidth = 3;
      ctx.strokeRect(cellX - 1.5, cellY - 1.5, cellW + 3, cellH + 3);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cellX, cellY, cellW, cellH);

      // Subtle crosshair guides
      ctx.strokeStyle = settings.highContrast
        ? 'rgba(255, 230, 0, 0.35)'
        : 'rgba(34, 211, 238, 0.32)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cellX + cellW / 2, 0);
      ctx.lineTo(cellX + cellW / 2, CANVAS_H);
      ctx.moveTo(0, cellY + cellH / 2);
      ctx.lineTo(CANVAS_W, cellY + cellH / 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [slice, metadata, coastlineRings, hoveredCell, pinnedCell, settings.highContrast]);

  // Pointer coordinate -> exact NetCDF grid cell lookup
  const resolveCellAtPointer = (clientX: number, clientY: number): InspectedCell | null => {
    const canvas = canvasRef.current;
    if (!canvas || !slice || !metadata) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return lookupNetCdfGridCell(relX, relY, slice, metadata);
  };

  const triggerPianoForCell = (cell: InspectedCell | null) => {
    if (!cell || !slice || !listenToEarth) {
      if (!cell || !listenToEarth) {
        mapPianoEngine.releaseAllNotes();
        setActiveFrequencyHz(null);
      }
      return;
    }
    const cellKey = `${slice.dataset}:${slice.year}:${slice.month}:${cell.latIdx}:${cell.lonIdx}`;
    const freq = mapPianoEngine.handleHoveredCell(cell.value, cellKey, slice.fillValue);
    setActiveFrequencyHz(freq);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPointerInsideRef.current = true;
    const cell = resolveCellAtPointer(e.clientX, e.clientY);
    if (cell) {
      setHoveredCell(cell);
      triggerPianoForCell(cell);
    }
  };

  const handleCanvasMouseLeave = () => {
    isPointerInsideRef.current = false;
    setHoveredCell(null);
    mapPianoEngine.releaseAllNotes();
    setActiveFrequencyHz(null);
  };

  const handleCanvasTouchInspect = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isPointerInsideRef.current = true;
    mapPianoEngine.unlock();
    const touch = e.touches[0];
    if (!touch) return;
    const cell = resolveCellAtPointer(touch.clientX, touch.clientY);
    if (cell) {
      setHoveredCell(cell);
      triggerPianoForCell(cell);
    }
  };

  const handleCanvasTouchEnd = () => {
    isPointerInsideRef.current = false;
    mapPianoEngine.releaseAllNotes();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mapPianoEngine.unlock();
    const cell = resolveCellAtPointer(e.clientX, e.clientY);
    if (!cell) return;
    const isUnpinning =
      pinnedCell !== null &&
      pinnedCell.latIdx === cell.latIdx &&
      pinnedCell.lonIdx === cell.lonIdx;

    if (isUnpinning) {
      setPinnedCell(null);
      return;
    }

    setPinnedCell(cell);
    announceToScreenReader(
      `Pinned grid cell ${formatLatLon(cell.lat, cell.lon)} for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}: ${
        cell.value === null
          ? 'Unavailable'
          : `${cell.value > 0 ? '+' : ''}${cell.value.toFixed(2)} degrees Celsius`
      }.`
    );
  };

  const inspectedCell = hoveredCell || pinnedCell;

  const isAtStart =
    metadata !== null &&
    selectedYear === metadata.minYear &&
    selectedMonth === metadata.minMonth;
  const isAtEnd =
    metadata !== null &&
    selectedYear === metadata.maxYear &&
    selectedMonth === metadata.maxMonth;

  const handleYearChange = (newYear: number) => {
    if (!metadata) return;
    setSelectedYear(newYear);
    if (!availableMonthSet.has(`${newYear}-${selectedMonth}`)) {
      const validMonths = metadata.availableMonths.filter((m) => m.year === newYear);
      if (validMonths.length > 0) {
        setSelectedMonth(validMonths[validMonths.length - 1].month);
      }
    }
  };

  return (
    <div
      className={`w-full rounded-2xl border p-3.5 sm:p-4 transition-colors space-y-3 ${
        settings.highContrast
          ? 'bg-black border-2 border-[#ffe600] text-white'
          : 'bg-black/90 border-cyan-900/60 text-slate-100 shadow-2xl'
      }`}
      aria-label="Interactive NASA GISTEMP v4 Monthly Temperature Anomaly Map"
    >
      {/* Top Header: Title, Baseline & Dataset Selector */}
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={`text-sm sm:text-base font-extrabold tracking-tight ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              Monthly Temperature Anomaly (°C)
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                settings.highContrast
                  ? 'bg-black text-[#ffe600] border-[#ffe600]'
                  : 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
              }`}
            >
              Baseline: {metadata?.baseline ?? '1951–1980'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            NASA GISTEMP v4 Spatial NetCDF · Historical Monthly Dataset ({metadata ? `${metadata.minYear}–${metadata.maxYear}` : '1880–2026'}) · Non-Real-Time
          </p>
        </div>

        {/* Dataset Toggle + Metadata Info + Refresh */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className={`p-0.5 rounded-lg border flex items-center gap-0.5 text-[11px] font-mono ${
              settings.highContrast
                ? 'bg-black border-[#ffe600]'
                : 'bg-slate-950 border-slate-800'
            }`}
            role="group"
            aria-label="Select NASA GISTEMP NetCDF spatial coverage"
          >
            <button
              onClick={() => {
                setDataset('land-ocean');
                announceToScreenReader('Selected Land plus Ocean spatial dataset.');
              }}
              className={`px-2 py-1 rounded-md transition-colors ${
                dataset === 'land-ocean'
                  ? settings.highContrast
                    ? 'bg-[#ffe600] text-black font-bold'
                    : 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-pressed={dataset === 'land-ocean'}
            >
              Land + Ocean
            </button>
            <button
              onClick={() => {
                setDataset('land-only');
                announceToScreenReader('Selected Land Only spatial dataset.');
              }}
              className={`px-2 py-1 rounded-md transition-colors ${
                dataset === 'land-only'
                  ? settings.highContrast
                    ? 'bg-[#ffe600] text-black font-bold'
                    : 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-pressed={dataset === 'land-only'}
            >
              Land Only
            </button>
          </div>

          <button
            onClick={() => setShowMetadataPanel((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono border flex items-center gap-1 transition-colors ${
              showMetadataPanel
                ? settings.highContrast
                  ? 'bg-[#ffe600] text-black border-[#ffe600] font-bold'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                : settings.highContrast
                ? 'bg-black text-[#ffe600] border-[#ffe600]'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-700'
            }`}
            aria-expanded={showMetadataPanel}
            title="Inspect raw NetCDF metadata, dimensions, units, and fill value"
          >
            <Info className="w-3.5 h-3.5" />
            <span>NetCDF</span>
          </button>

          <button
            onClick={() => loadDatasetMetadata(dataset, true)}
            disabled={isLoadingMeta}
            className={`p-1.5 rounded-lg border transition-colors ${
              settings.highContrast
                ? 'bg-black text-[#ffe600] border-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-cyan-300 hover:border-cyan-700'
            } disabled:opacity-40`}
            title="Refresh NetCDF archive directly from NASA GISS"
            aria-label="Refresh NetCDF archive directly from NASA GISS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMeta ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Authentic NetCDF Header Metadata Inspector */}
      {showMetadataPanel && metadata && (
        <div
          className={`p-3 rounded-xl border text-[11px] font-mono space-y-1.5 ${
            settings.highContrast
              ? 'bg-black border-[#ffe600] text-slate-200'
              : 'bg-slate-950/90 border-cyan-900/50 text-slate-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{metadata.filename}</span>
            </span>
            <a
              href={metadata.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
            >
              <span>Download Official .nc.gz</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="text-slate-500">Institution:</span>{' '}
              <span>{String(metadata.globalAttributes.institution ?? 'NASA GISS')}</span>
            </div>
            <div>
              <span className="text-slate-500">Conventions:</span>{' '}
              <span>{String(metadata.globalAttributes.Conventions ?? 'CF-1.6')}</span>
            </div>
            <div>
              <span className="text-slate-500">Dimensions:</span>{' '}
              <span>
                {metadata.dimensions.map((d) => `${d.name}=${d.length}`).join(', ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Variable:</span>{' '}
              <span>
                {metadata.variable.name} ({metadata.variable.units}, scale={metadata.variable.scaleFactor}, _FillValue={metadata.variable.fillValue})
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Time Axis:</span>{' '}
              <span>
                {metadata.timeUnits} ({metadata.totalMonths} monthly observations)
              </span>
            </div>
            <div className="sm:col-span-2 text-slate-400 break-words">
              <span className="text-slate-500">History:</span>{' '}
              <span>{String(metadata.globalAttributes.history ?? '')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Global Map Viewport (Exact 2:1 Equirectangular Projection) */}
      <div
        className={`relative w-full aspect-[2/1] rounded-xl overflow-hidden border select-none ${
          settings.highContrast ? 'border-[#ffe600] bg-black' : 'border-cyan-900/60 bg-[#050811]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onTouchStart={handleCanvasTouchInspect}
          onTouchMove={handleCanvasTouchInspect}
          onTouchEnd={handleCanvasTouchEnd}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-crosshair touch-manipulation"
        />

        {/* Top-Left Timestamp Badge */}
        <div
          className={`absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border backdrop-blur-md font-mono text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 max-w-[calc(100%-12px)] truncate pointer-events-none ${
            settings.highContrast
              ? 'bg-black border-[#ffe600] text-[#ffe600]'
              : 'bg-black/80 border-cyan-800/60 text-white'
          }`}
        >
          <span className="font-bold shrink-0">
            {MONTH_SHORT_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
          {slice?.areaWeightedMean !== null && slice?.areaWeightedMean !== undefined && (
            <>
              <span className="text-slate-500">|</span>
              <span
                className={`truncate ${
                  slice.areaWeightedMean > 0 ? 'text-orange-400 font-bold' : 'text-sky-400 font-bold'
                }`}
              >
                <span className="hidden sm:inline">Global Spatial Mean: </span>
                <span className="sm:hidden">Mean: </span>
                {slice.areaWeightedMean > 0 ? '+' : ''}
                {slice.areaWeightedMean.toFixed(2)}°C
              </span>
            </>
          )}
        </div>

        {/* Loading Overlay */}
        {(isLoadingMeta || isLoadingSlice) && !errorMsg && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <div className="px-3.5 py-2 rounded-xl bg-black/90 border border-cyan-500/40 flex items-center gap-2 text-xs font-mono text-cyan-300 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {isLoadingMeta
                  ? 'Parsing NASA GISTEMP NetCDF archive...'
                  : `Loading ${MONTH_SHORT_NAMES[selectedMonth - 1]} ${selectedYear} grid...`}
              </span>
            </div>
          </div>
        )}

        {/* Error Overlay (Never fabricates data on failure) */}
        {errorMsg && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs font-mono text-red-300 max-w-md mb-3">{errorMsg}</p>
            <button
              onClick={() => loadDatasetMetadata(dataset, true)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-500 text-black font-bold hover:bg-cyan-400"
            >
              Retry NASA NetCDF Load
            </button>
          </div>
        )}
      </div>

      {/* Geographic Cell Inspector Bar (Hover or Click to Pin) */}
      <div
        className={`px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
          settings.highContrast
            ? 'bg-black border-[#ffe600] text-white'
            : 'bg-slate-950/75 border-cyan-900/40 text-slate-200'
        }`}
        aria-live="polite"
      >
        {inspectedCell ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-cyan-300 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{formatLatLon(inspectedCell.lat, inspectedCell.lon)}</span>
                <span className="text-[10px] text-slate-500">(2°×2° cell)</span>
              </span>
              <span className="text-slate-300">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
              <span>
                Anomaly:{' '}
                {inspectedCell.value === null ? (
                  <span className="text-slate-400 italic">Unavailable (Missing / _FillValue)</span>
                ) : (
                  <strong
                    className={
                      inspectedCell.value > 0
                        ? 'text-orange-400'
                        : inspectedCell.value < 0
                        ? 'text-sky-400'
                        : 'text-slate-200'
                    }
                  >
                    {inspectedCell.value > 0 ? '+' : ''}
                    {inspectedCell.value.toFixed(2)} °C
                  </strong>
                )}
              </span>
            </div>
            {pinnedCell && (
              <button
                onClick={() => setPinnedCell(null)}
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-white"
              >
                <X className="w-3 h-3" />
                <span>Unpin</span>
              </button>
            )}
          </>
        ) : (
          <span className="text-slate-400 text-[11px]">
            Hover, tap, or click any 2°×2° grid cell on the map to inspect its latitude, longitude, month, and NASA anomaly (°C).
          </span>
        )}
      </div>

      {/* Interactive Piano Sonification Control Bar (Hover-Triggered Web Audio) */}
      {(() => {
        const displayFreq = !listenToEarth
          ? null
          : activeFrequencyHz ??
            (inspectedCell
              ? temperatureAnomalyToPianoFrequency(inspectedCell.value, slice?.fillValue)
              : null);

        return (
          <div
            className={`px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-mono ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-slate-950/75 border-cyan-900/40 text-slate-200'
            }`}
            aria-label="Interactive Earth Piano Sonification Controls"
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Listen to Earth toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !listenToEarth;
                  setListenToEarth(next);
                  if (next) {
                    mapPianoEngine.unlock();
                  }
                  announceToScreenReader(
                    next
                      ? 'Listen to Earth piano audio enabled.'
                      : 'Listen to Earth piano audio disabled.'
                  );
                }}
                aria-pressed={listenToEarth}
                className={`px-2.5 py-1 rounded-lg border font-bold inline-flex items-center gap-1.5 transition-colors ${
                  listenToEarth
                    ? settings.highContrast
                      ? 'bg-[#ffe600] text-black border-[#ffe600]'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 hover:bg-cyan-500/30'
                    : settings.highContrast
                    ? 'bg-black text-slate-400 border-slate-600'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {listenToEarth ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>Listen to Earth</span>
              </button>

              {/* Piano Volume slider */}
              <label className="inline-flex items-center gap-2 text-slate-300">
                <span className="text-slate-400">Piano Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={pianoVolume}
                  onChange={(e) => setPianoVolume(parseFloat(e.target.value))}
                  aria-label="Piano Volume"
                  className="w-20 sm:w-24 accent-cyan-400 cursor-pointer"
                />
                <span className="text-cyan-300 w-8 text-right tabular-nums">
                  {Math.round(pianoVolume * 100)}%
                </span>
              </label>
            </div>

            {/* Live Geographic & Acoustic Readout */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span>
                <span className="text-slate-400">Current Location: </span>
                <strong className="text-cyan-300">
                  {inspectedCell ? formatLatLon(inspectedCell.lat, inspectedCell.lon) : '—'}
                </strong>
              </span>
              <span>
                <span className="text-slate-400">Temperature Anomaly: </span>
                {inspectedCell ? (
                  inspectedCell.value === null ? (
                    <span className="text-slate-400 italic">Unavailable</span>
                  ) : (
                    <strong
                      className={
                        inspectedCell.value > 0
                          ? 'text-orange-400'
                          : inspectedCell.value < 0
                          ? 'text-sky-400'
                          : 'text-slate-200'
                      }
                    >
                      {inspectedCell.value > 0 ? '+' : ''}
                      {inspectedCell.value.toFixed(2)} °C
                    </strong>
                  )
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </span>
              <span>
                <span className="text-slate-400">Piano Frequency: </span>
                <strong
                  className={
                    !listenToEarth || displayFreq === null
                      ? 'text-slate-400'
                      : settings.highContrast
                      ? 'text-[#ffe600]'
                      : 'text-cyan-300'
                  }
                >
                  {!listenToEarth
                    ? 'Disabled'
                    : inspectedCell && inspectedCell.value === null
                    ? 'Silent'
                    : displayFreq !== null
                    ? `${displayFreq.toFixed(2)} Hz`
                    : '—'}
                </strong>
              </span>
            </div>
          </div>
        );
      })()}

      {/* Color Scale Legend in °C + Unavailable Swatch */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-1">
        <div className="flex-1 min-w-[180px] space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-sky-400">-4.0°C</span>
            <span className="text-sky-300">-2.0°C</span>
            <span className="text-slate-200">0.0°C</span>
            <span className="text-orange-300">+2.0°C</span>
            <span className="text-red-400">+4.0°C+</span>
          </div>
          <div
            className="h-2.5 w-full rounded-full border border-white/15"
            style={{
              background:
                'linear-gradient(90deg, rgb(5,48,97) 0%, rgb(33,102,172) 18%, rgb(146,197,222) 38%, rgb(241,245,249) 50%, rgb(244,165,130) 65%, rgb(214,96,77) 82%, rgb(178,24,43) 94%, rgb(103,0,31) 100%)',
            }}
            aria-label="Diverging color scale from -4.0 degrees Celsius blue through 0.0 neutral to +4.0 degrees Celsius orange and red"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 shrink-0">
          <span
            className="w-4 h-3 rounded-sm border border-slate-600 inline-block"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, #050811, #050811 3px, #1e293b 3px, #1e293b 4px)',
            }}
          />
          <span>Unavailable / Missing</span>
        </div>
      </div>

      {/* Monthly Navigation & Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Play / Pause Monthly Animation */}
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={!metadata}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
              settings.highContrast
                ? 'bg-[#ffe600] text-black hover:bg-yellow-300'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            } disabled:opacity-40`}
            aria-label={isPlaying ? 'Pause monthly animation' : 'Play monthly animation'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Previous Month */}
          <button
            onClick={() => {
              setIsPlaying(false);
              stepMonth(-1);
            }}
            disabled={!metadata || isAtStart}
            className={`p-1.5 rounded-lg border transition-colors ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-cyan-600 hover:text-white'
            } disabled:opacity-35`}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              setIsPlaying(false);
              setSelectedMonth(parseInt(e.target.value, 10));
            }}
            aria-label="Select month"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500'
            }`}
          >
            {MONTH_NAMES.map((name, idx) => {
              const mNum = idx + 1;
              const disabled =
                metadata !== null && !availableMonthSet.has(`${selectedYear}-${mNum}`);
              return (
                <option key={name} value={mNum} disabled={disabled}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setIsPlaying(false);
              handleYearChange(parseInt(e.target.value, 10));
            }}
            aria-label="Select year"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500'
            }`}
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Next Month */}
          <button
            onClick={() => {
              setIsPlaying(false);
              stepMonth(1);
            }}
            disabled={!metadata || isAtEnd}
            className={`p-1.5 rounded-lg border transition-colors ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-cyan-600 hover:text-white'
            } disabled:opacity-35`}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Animation Speed Toggle */}
          <button
            onClick={() =>
              setPlaySpeedMs((ms) => (ms === 650 ? 300 : ms === 300 ? 1100 : 650))
            }
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-[#ffe600]'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-cyan-700'
            }`}
            title="Cycle monthly playback speed"
          >
            {playSpeedMs === 300 ? '2x' : playSpeedMs === 1100 ? '0.5x' : '1x'}
          </button>
        </div>

        {/* Spatial Grid Coverage Readout */}
        {slice && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
            <span>
              Valid Cells:{' '}
              <strong className="text-slate-200">
                {slice.validCells.toLocaleString()}
              </strong>
              /{(slice.latCount * slice.lonCount).toLocaleString()}
            </span>
            <span>
              Missing: <strong className="text-slate-300">{slice.missingCells.toLocaleString()}</strong>
            </span>
            {slice.minAnomaly !== null && slice.maxAnomaly !== null && (
              <span>
                Range:{' '}
                <strong className="text-sky-400">
                  {slice.minAnomaly > 0 ? '+' : ''}
                  {slice.minAnomaly.toFixed(2)}°C
                </strong>{' '}
                to{' '}
                <strong className="text-orange-400">
                  {slice.maxAnomaly > 0 ? '+' : ''}
                  {slice.maxAnomaly.toFixed(2)}°C
                </strong>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
