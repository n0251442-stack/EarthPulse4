import React, { useState, useEffect } from 'react';
import { StoryId, ViewMode, GlobeProjection } from '../types';
import { GISTEMP_DATA, STORIES } from '../data/earthData';
import { nasaDataService, GistempRecord, NASA_DATASET_METADATA } from '../services/nasaDataService';
import { useAccessibility } from '../context/AccessibilityContext';
import { GlobeVisualization } from './GlobeVisualization';
import {
  NasaMonthlyMapVisualization,
  SpatialMapTelemetry,
} from './NasaMonthlyMapVisualization';
import { MONTH_NAMES, formatLatLon } from '../services/nasaSpatialMapService';
import { SonificationPlayer } from './SonificationPlayer';
import {
  Headphones,
  ExternalLink,
  Table,
  HelpCircle,
  Map as MapIcon,
  Globe,
  Database,
  Thermometer,
  Grid3X3,
} from 'lucide-react';

interface ScientificDashboardProps {
  currentStoryId: StoryId;
  onNavigate: (view: ViewMode) => void;
  onOpenAudioGuide: () => void;
  onOpenDataTable: () => void;
}

export const ScientificDashboard: React.FC<ScientificDashboardProps> = ({
  currentStoryId,
  onNavigate,
  onOpenAudioGuide,
  onOpenDataTable,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [projection, setProjection] = useState<GlobeProjection>('3d-orthographic');
  const [visualMode, setVisualMode] = useState<'map' | 'globe'>('globe');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [records, setRecords] = useState<GistempRecord[]>(() => nasaDataService.getRecords());
  const [spatialTelemetry, setSpatialTelemetry] = useState<SpatialMapTelemetry | null>(null);

  // Initialize NASA dataset on mount
  useEffect(() => {
    nasaDataService.init().then(() => {
      const parsedRecords = nasaDataService.getRecords();
      if (parsedRecords.length > 0) {
        setRecords(parsedRecords);
      }
    });
  }, []);

  const currentStory =
    STORIES.find((s) => s.id === currentStoryId) || STORIES[0];

  // Look up authentic parsed GISTEMP record, falling back to static dataset if still initializing
  const dynamicRecord = records.find((r) => r.year === selectedYear);
  const staticData =
    GISTEMP_DATA.find((d) => d.year === selectedYear) ||
    GISTEMP_DATA[GISTEMP_DATA.length - 1];

  const currentRecord: GistempRecord = dynamicRecord || {
    year: staticData.year,
    annualAnomaly: staticData.anomaly,
    metYearAnomaly: null,
    months: {
      Jan: null,
      Feb: null,
      Mar: null,
      Apr: null,
      May: null,
      Jun: null,
      Jul: null,
      Aug: null,
      Sep: null,
      Oct: null,
      Nov: null,
      Dec: null,
    },
    seasonal: { DJF: null, MAM: null, JJA: null, SON: null },
    fiveYearMean: staticData.fiveYearMean,
    uncertainty: staticData.uncertainty,
    milestone: staticData.milestone,
  };

  const isWarming = currentRecord.annualAnomaly > 0;
  const anomaly = currentRecord.annualAnomaly;

  // Temperature Anomaly Bar Top Position (percentage from 0% at +2.0C to 100% at -2.0C)
  const anomalyIndicatorPercent = Math.max(
    5,
    Math.min(95, 100 - ((anomaly + 2.0) / 4.0) * 100)
  );

  return (
    <div className="w-full">
      {/* Main Scientific Console */}
      <main
        role="main"
        className={`w-full px-3 sm:px-6 md:px-8 xl:px-12 py-4 sm:py-7 transition-colors ${
          settings.highContrast
            ? 'bg-black text-white'
            : 'bg-transparent text-slate-100'
        }`}
      >
        <div className="w-full space-y-5 sm:space-y-6">
          {/* Top Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1
                className={`text-xl sm:text-3xl font-extrabold tracking-tight ${
                  settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                }`}
              >
                {currentStory.title}
              </h1>
            </div>

            {/* Quick Actions (Data Table + View Toggle) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className={`p-1 rounded-xl border flex items-center gap-1 ${
                  settings.highContrast
                    ? 'bg-black border-[#ffe600]'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                <button
                  onClick={() => {
                    setVisualMode('globe');
                    announceToScreenReader('Switched to 3D Earth Globe.');
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    visualMode === 'globe'
                      ? settings.highContrast
                        ? 'bg-[#ffe600] text-black font-bold'
                        : 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  aria-pressed={visualMode === 'globe'}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>3D Globe</span>
                </button>

                <button
                  onClick={() => {
                    setVisualMode('map');
                    announceToScreenReader('Switched to Interactive NASA Monthly Temperature Anomaly Map.');
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    visualMode === 'map'
                      ? settings.highContrast
                        ? 'bg-[#ffe600] text-black font-bold'
                        : 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  aria-pressed={visualMode === 'map'}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Monthly Map</span>
                </button>
              </div>

              <button
                onClick={onOpenDataTable}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                  settings.highContrast
                    ? 'bg-black text-[#ffe600] border-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                    : 'bg-slate-900/80 text-cyan-300 border-cyan-800/60 hover:bg-slate-800 hover:border-cyan-500'
                }`}
                aria-label="Open accessible raw NASA GISTEMP data table"
              >
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">Data Table</span>
              </button>
            </div>
          </div>

          {/* Master Scientific Console Card */}
          <div
            className={`rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 lg:p-7 shadow-2xl transition-colors ${
              settings.highContrast
                ? 'bg-black border-2 border-[#ffe600]'
                : 'bg-transparent border-cyan-500/25 backdrop-blur-sm shadow-[0_0_40px_rgba(6,182,212,0.12)]'
            }`}
          >
            {/* Top Section: [Globe/Map] on Left (lg:col-span-7) | Scientific Info Panels on Right (lg:col-span-5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 xl:gap-10 items-center">
              {/* Left Column: 3D Earth Globe (+ Scale Bar) OR Interactive Monthly Spatial Map */}
              <div className="lg:col-span-7 flex flex-row items-center justify-center gap-2.5 sm:gap-8 lg:gap-10 w-full min-w-0">
                {visualMode === 'map' ? (
                  <div className="w-full min-w-0">
                    <NasaMonthlyMapVisualization
                      initialYear={selectedYear}
                      onTelemetryChange={setSpatialTelemetry}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 flex items-center justify-center w-full max-w-[260px] sm:max-w-[420px] lg:max-w-[540px]">
                      <GlobeVisualization
                        currentData={{
                          year: currentRecord.year,
                          anomaly: currentRecord.annualAnomaly,
                          fiveYearMean: currentRecord.fiveYearMean,
                          uncertainty: currentRecord.uncertainty,
                          arcticAnomaly: staticData.arcticAnomaly,
                          nhAnomaly: staticData.nhAnomaly,
                          shAnomaly: staticData.shAnomaly,
                          oceanAnomaly: staticData.oceanAnomaly,
                          milestone: currentRecord.milestone,
                        }}
                        projection={projection}
                        onToggleProjection={() =>
                          setProjection((p) =>
                            p === '3d-orthographic' ? '2d-flat' : '3d-orthographic'
                          )
                        }
                        isPlaying={isPlaying}
                      />
                    </div>

                    {/* Vertical Anomaly Scale Bar (Matching Globe View) */}
                    <div
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl border text-[10px] sm:text-[11px] font-mono shrink-0 select-none ${
                        settings.highContrast
                          ? 'bg-black border-[#ffe600] text-white'
                          : 'bg-slate-950/70 border-cyan-900/60 text-slate-300'
                      }`}
                      aria-label={`Temperature Anomaly scale. Current anomaly: ${anomaly > 0 ? '+' : ''}${anomaly.toFixed(2)}°C`}
                    >
                      <span className="text-red-400 font-bold">+2.0</span>
                      <span className="text-orange-400 font-medium">+1.0</span>

                      {/* Gradient Bar with Current Year Anomaly Indicator */}
                      <div className="w-3 sm:w-3.5 h-32 sm:h-48 lg:h-52 rounded-full border border-white/20 relative overflow-hidden bg-gradient-to-b from-[#67000d] via-[#d7301f] via-[#fc8d59] via-[#fed976] via-[#f7f7f7] via-[#92c5de] to-[#053061]">
                        <div
                          className={`absolute left-0 right-0 h-1.5 -translate-y-1/2 transition-all duration-200 shadow-md ${
                            settings.highContrast
                              ? 'bg-[#ffe600] h-2 border border-black'
                              : 'bg-white'
                          }`}
                          style={{
                            top: `${anomalyIndicatorPercent}%`,
                          }}
                        />
                      </div>

                      <span className="text-cyan-300 font-semibold">0.00</span>
                      <span className="text-sky-400 font-medium">-1.0</span>
                      <span className="text-blue-500 font-bold">-2.0</span>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Live Spatial Telemetry (Monthly Map) OR Acoustic/Annual Info Panels (3D Globe) */}
              <div className="lg:col-span-5 space-y-3 min-w-0">
                {visualMode === 'map' ? (
                  <>
                    {/* 1. Selected Month & Year + Global Spatial Mean Anomaly */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-colors ${
                          settings.highContrast
                            ? 'bg-black border-[#ffe600] text-white'
                            : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Selected Month
                        </span>
                        <div className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums mt-0.5 text-white">
                          {spatialTelemetry
                            ? `${MONTH_NAMES[spatialTelemetry.month - 1].slice(0, 3)} ${spatialTelemetry.year}`
                            : `${selectedYear}`}
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                          {spatialTelemetry?.dataset === 'land-only'
                            ? 'Land Only (GHCNv4 250km)'
                            : 'Land + Ocean (ERSSTv5)'}
                        </span>
                      </div>

                      <div
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-colors ${
                          settings.highContrast
                            ? 'bg-black border-2 border-[#ffe600] text-white'
                            : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Global Spatial Mean
                        </span>
                        {(() => {
                          const mean = spatialTelemetry?.slice?.areaWeightedMean ?? null;
                          const warming = mean !== null && mean > 0;
                          return (
                            <>
                              <div
                                className={`text-xl sm:text-3xl font-extrabold font-mono tabular-nums mt-0.5 ${
                                  settings.highContrast
                                    ? 'text-[#ffe600]'
                                    : mean === null
                                    ? 'text-slate-400'
                                    : warming
                                    ? 'text-red-400'
                                    : 'text-cyan-300'
                                }`}
                              >
                                {mean === null ? (
                                  '—'
                                ) : (
                                  <>
                                    {mean > 0 ? `+${mean.toFixed(2)}` : mean.toFixed(2)}
                                    <span className="text-xs font-normal ml-0.5 text-slate-400">°C</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                                Area-Weighted · 1951–1980 Base
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 2. Spatial Grid Telemetry (2° × 2° NetCDF Observations & Extremes) */}
                    <div
                      className={`p-3.5 rounded-2xl border transition-colors ${
                        settings.highContrast
                          ? 'bg-black border-[#ffe600] text-white'
                          : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Grid3X3
                            className={`w-3.5 h-3.5 ${
                              settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-400'
                            }`}
                          />
                          <h2
                            className={`text-xs font-bold tracking-tight uppercase ${
                              settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                            }`}
                          >
                            Spatial Grid Telemetry (2° × 2°)
                          </h2>
                        </div>
                        {spatialTelemetry?.slice && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Slice #{spatialTelemetry.slice.timeIndex + 1}
                          </span>
                        )}
                      </div>

                      {spatialTelemetry?.slice ? (
                        <div className="space-y-2.5 text-xs">
                          {/* Coverage Bar */}
                          {(() => {
                            const s = spatialTelemetry.slice!;
                            const total = s.latCount * s.lonCount;
                            const pct = ((s.validCells / total) * 100).toFixed(1);
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-slate-300">Observed Grid Coverage</span>
                                  <span className="text-cyan-300 font-semibold">
                                    {s.validCells.toLocaleString()} / {total.toLocaleString()} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      settings.highContrast ? 'bg-[#ffe600]' : 'bg-cyan-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  Unavailable / Missing (_FillValue={s.fillValue}): {s.missingCells.toLocaleString()} cells
                                </div>
                              </div>
                            );
                          })()}

                          {/* Warmest & Coldest Grid Cells */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-orange-300">
                                <Thermometer className="w-3 h-3" />
                                <span>Warmest Cell</span>
                              </div>
                              {spatialTelemetry.maxCell ? (
                                <>
                                  <div className="text-sm font-bold font-mono text-orange-400 mt-0.5">
                                    {spatialTelemetry.maxCell.value > 0 ? '+' : ''}
                                    {spatialTelemetry.maxCell.value.toFixed(2)} °C
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {formatLatLon(
                                      spatialTelemetry.maxCell.lat,
                                      spatialTelemetry.maxCell.lon
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-sky-300">
                                <Thermometer className="w-3 h-3" />
                                <span>Coldest Cell</span>
                              </div>
                              {spatialTelemetry.minCell ? (
                                <>
                                  <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                                    {spatialTelemetry.minCell.value > 0 ? '+' : ''}
                                    {spatialTelemetry.minCell.value.toFixed(2)} °C
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {formatLatLon(
                                      spatialTelemetry.minCell.lat,
                                      spatialTelemetry.minCell.lon
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-slate-400 py-4">
                          Loading NASA NetCDF spatial slice...
                        </div>
                      )}
                    </div>

                    {/* 3. Spatial Observation Summary & Provenance */}
                    <div
                      className={`p-3.5 rounded-2xl border transition-colors ${
                        settings.highContrast
                          ? 'bg-black border-[#ffe600] text-white'
                          : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                      }`}
                    >
                      <h2
                        className={`text-xs font-bold tracking-tight uppercase mb-1.5 ${
                          settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                        }`}
                      >
                        Spatial Observation Notes
                      </h2>
                      <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                        {spatialTelemetry?.dataset === 'land-only'
                          ? 'Displays land-station temperature anomalies (NOAA GHCN v4, 250 km smoothing radius). Ocean cells remain intentionally uncolored (_FillValue) without synthetic interpolation.'
                          : (spatialTelemetry?.year ?? selectedYear) < 1950
                          ? 'Early instrumental era with sparser polar and interior continental stations; unmeasured grid cells remain transparent rather than approximated.'
                          : 'Displays empirical Land + Ocean monthly anomalies (NOAA GHCN v4 + ERSST v5, 1200 km radius) relative to the 1951–1980 monthly climatology.'}
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-slate-400">
                          Source: NASA GISS NetCDF v4
                        </span>
                        <a
                          href="https://data.giss.nasa.gov/gistemp/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                        >
                          <span>GISS Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 1. Selected Year & Temperature Anomaly Cards (3D Globe / Sonification Mode) */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Selected Year Box */}
                      <div
                        className={`p-3 sm:p-4 rounded-2xl border transition-colors ${
                          settings.highContrast
                            ? 'bg-black border-[#ffe600] text-white'
                            : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Selected Year
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-0.5 text-white">
                          {currentRecord.year}
                        </div>
                      </div>

                      {/* Temperature Anomaly Box */}
                      <div
                        className={`p-3 sm:p-4 rounded-2xl border transition-colors ${
                          settings.highContrast
                            ? 'bg-black border-2 border-[#ffe600] text-white'
                            : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Temperature Anomaly
                        </span>
                        <div
                          className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-0.5 ${
                            settings.highContrast
                              ? 'text-[#ffe600]'
                              : isWarming
                              ? 'text-red-400'
                              : 'text-cyan-300'
                          }`}
                        >
                          {currentRecord.annualAnomaly > 0
                            ? `+${currentRecord.annualAnomaly.toFixed(2)}`
                            : currentRecord.annualAnomaly.toFixed(2)}
                          <span className="text-xs font-normal ml-0.5 text-slate-400">°C</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                          {currentRecord.year === 2025 ? 'NASA GISTEMP v4 Official' : 'NASA GISTEMP v4'}
                        </span>
                      </div>
                    </div>

                    {/* 2. What Do These Sounds Mean? Card */}
                    <div
                      className={`p-4 rounded-2xl border transition-colors ${
                        settings.highContrast
                          ? 'bg-black border-[#ffe600] text-white'
                          : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <HelpCircle
                          className={`w-3.5 h-3.5 ${
                            settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-400'
                          }`}
                        />
                        <h2
                          className={`text-xs font-bold tracking-tight uppercase ${
                            settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                          }`}
                        >
                          What Do These Sounds Mean?
                        </h2>
                      </div>

                      <div className="space-y-1.5 text-xs leading-relaxed text-slate-300">
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`font-mono font-bold ${
                              settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-400'
                            }`}
                          >
                            🎹
                          </span>
                          <span>
                            <strong className={settings.highContrast ? 'text-[#ffe600]' : 'text-white'}>
                              Acoustic Piano Mapping:
                            </strong>{' '}
                            Every <strong>+0.1°C</strong> of warming rises by exactly <strong>1 Piano Key</strong> (semitone).
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`font-mono font-bold ${
                              settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-400'
                            }`}
                          >
                            ▲
                          </span>
                          <span>
                            <strong className={settings.highContrast ? 'text-[#ffe600]' : 'text-white'}>
                              Middle C (C4 / 0.0°C)
                            </strong>{' '}
                            → <strong>High C (C5 / +1.2°C)</strong>: 1 full octave rise across human warming.
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`font-mono font-bold ${
                              settings.highContrast ? 'text-[#ffe600]' : 'text-blue-400'
                            }`}
                          >
                            ▼
                          </span>
                          <span>
                            <strong className={settings.highContrast ? 'text-[#ffe600]' : 'text-white'}>
                              Deep Piano Keys (G3 / -0.5°C)
                            </strong>{' '}
                            = Historical cooling years.
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic pt-0.5">
                          Gentle, authentic acoustic grand piano synthesis with warm wooden decay—peaceful for children and adults.
                        </p>
                      </div>

                      <button
                        onClick={onOpenAudioGuide}
                        className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          settings.highContrast
                            ? 'bg-transparent border border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black font-bold'
                            : 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400'
                        }`}
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Listen to Audio Guide</span>
                      </button>
                    </div>

                    {/* 3. Story Summary Card */}
                    <div
                      className={`p-4 rounded-2xl border transition-colors ${
                        settings.highContrast
                          ? 'bg-black border-[#ffe600] text-white'
                          : 'bg-transparent border-cyan-500/20 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40'
                      }`}
                    >
                      <h2
                        className={`text-xs font-bold tracking-tight uppercase mb-1.5 ${
                          settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                        }`}
                      >
                        Story Summary
                      </h2>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {currentRecord.year < 1940
                          ? 'Instrumental observations reveal a relatively stable pre-industrial baseline with natural solar and volcanic variations.'
                          : currentRecord.year < 1980
                          ? 'Post-WWII industrial expansion introduced balancing aerosol cooling and greenhouse gas accumulation, keeping anomalies near zero.'
                          : 'Data indicates a sustained rise in Earth’s temperature since the late 19th century, with accelerating warming in recent decades.'}
                      </p>

                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Source: NASA GISTEMP</span>
                        <a
                          href="https://data.giss.nasa.gov/gistemp/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                        >
                          <span>GISS Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Section: Full-Width Scientific Timeline & Playback Transport (3D Globe mode only) */}
            {visualMode === 'globe' && (
              <div className="mt-6 pt-5 border-t border-cyan-950/80">
                <SonificationPlayer
                  currentData={{
                    year: currentRecord.year,
                    anomaly: currentRecord.annualAnomaly,
                    fiveYearMean: currentRecord.fiveYearMean,
                    uncertainty: currentRecord.uncertainty,
                    arcticAnomaly: staticData.arcticAnomaly,
                    nhAnomaly: staticData.nhAnomaly,
                    shAnomaly: staticData.shAnomaly,
                    oceanAnomaly: staticData.oceanAnomaly,
                    milestone: currentRecord.milestone,
                  }}
                  onSelectYear={(year) => setSelectedYear(year)}
                  onOpenAudioGuide={onOpenAudioGuide}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
