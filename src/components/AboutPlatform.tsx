import React, { useMemo, useState } from 'react';
import { ViewMode } from '../types';
import { useAccessibility } from '../context/AccessibilityContext';
import { USER_REFERENCE_DATASET } from '../data/userReferenceData';
import { audioEngine } from '../services/audioEngine';
import {
  ExternalLink,
  Database,
  Accessibility,
  Globe,
  AudioLines,
  ArrowRight,
  ChevronDown,
  Volume2,
  Eye,
  Keyboard,
  Layers,
  SlidersHorizontal,
  ArrowDown,
  MapPin,
} from 'lucide-react';

interface AboutPlatformProps {
  onNavigate: (view: ViewMode) => void;
}

interface TechnicalAccordionProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  highContrast: boolean;
  reducedMotion: boolean;
  children: React.ReactNode;
}

const TechnicalAccordion: React.FC<TechnicalAccordionProps> = ({
  id,
  title,
  isOpen,
  onToggle,
  highContrast,
  reducedMotion,
  children,
}) => {
  const buttonId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        highContrast
          ? 'bg-black border-[#ffe600]'
          : 'bg-[#050a14]/70 border-cyan-500/25'
      }`}
    >
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
          reducedMotion ? '' : 'transition-colors duration-150'
        } ${
          highContrast
            ? 'text-[#ffe600] hover:bg-[#ffe600]/10 focus-visible:outline-[#ffe600]'
            : 'text-cyan-300 hover:bg-cyan-500/[0.06] hover:text-[#00E5FF] focus-visible:outline-[#00E5FF]'
        }`}
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 ${
            reducedMotion ? '' : 'transition-transform duration-200'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className={`px-4 sm:px-5 pb-5 pt-3 border-t text-xs sm:text-sm leading-relaxed space-y-4 ${
            highContrast
              ? 'border-[#ffe600]/50 text-slate-100'
              : 'border-cyan-500/15 text-slate-300'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface SmoothingPoint {
  year: number;
  annual: number;
  lowess5: number;
  movingAvg5: number;
}

const PIANO_PREVIEW_STOPS = [
  { label: 'G3', anomaly: -0.5, freq: '196.0 Hz', tag: 'Cool Era' },
  { label: 'A3', anomaly: -0.3, freq: '220.0 Hz', tag: 'Pre-1940' },
  { label: 'C4', anomaly: 0.0, freq: '261.6 Hz', tag: '1951–1980 Baseline' },
  { label: 'F4', anomaly: 0.5, freq: '349.2 Hz', tag: 'Late 20th C.' },
  { label: 'A4', anomaly: 0.9, freq: '440.0 Hz', tag: '2010s' },
  { label: 'C5', anomaly: 1.2, freq: '523.3 Hz', tag: 'Modern Peak' },
] as const;

export const AboutPlatform: React.FC<AboutPlatformProps> = ({ onNavigate }) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const hc = settings.highContrast;
  const rm = settings.reducedMotion;

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    science: false,
    sonification: false,
    processing: false,
    accessibility: false,
  });

  const [activePreviewNote, setActivePreviewNote] = useState<string | null>(null);
  const [selectedChartIndex, setSelectedChartIndex] = useState<number>(
    USER_REFERENCE_DATASET.length - 1
  );

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute genuine 5-year centered moving average directly from official USER_REFERENCE_DATASET
  const smoothingSeries: SmoothingPoint[] = useMemo(() => {
    const n = USER_REFERENCE_DATASET.length;
    return USER_REFERENCE_DATASET.map((row, i) => {
      const start = Math.max(0, i - 2);
      const end = Math.min(n - 1, i + 2);
      let sum = 0;
      let count = 0;
      for (let k = start; k <= end; k++) {
        sum += USER_REFERENCE_DATASET[k].noSmoothing;
        count++;
      }
      return {
        year: row.year,
        annual: row.noSmoothing,
        lowess5: row.lowess5,
        movingAvg5: Math.round((sum / count) * 100) / 100,
      };
    });
  }, []);

  // Build authentic responsive SVG coordinate paths (width 720, height 230)
  const chartGeometry = useMemo(() => {
    const W = 720;
    const H = 230;
    const padL = 46;
    const padR = 16;
    const padT = 16;
    const padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const minY = -0.6;
    const maxY = 1.6;
    const n = smoothingSeries.length;

    const toX = (idx: number) => padL + (idx / Math.max(1, n - 1)) * plotW;
    const toY = (val: number) =>
      padT + plotH - ((val - minY) / (maxY - minY)) * plotH;

    const annualPath = smoothingSeries
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pt.annual).toFixed(1)}`)
      .join(' ');

    const lowessPath = smoothingSeries
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pt.lowess5).toFixed(1)}`)
      .join(' ');

    const ma5Path = smoothingSeries
      .map(
        (pt, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pt.movingAvg5).toFixed(1)}`
      )
      .join(' ');

    const zeroY = toY(0);
    const yTicks = [-0.5, 0.0, 0.5, 1.0, 1.5];
    const xYears = [1880, 1920, 1951, 1980, 2000, 2025];

    return {
      W,
      H,
      padL,
      padR,
      padT,
      padB,
      zeroY,
      yTicks,
      xYears,
      toX,
      toY,
      annualPath,
      lowessPath,
      ma5Path,
    };
  }, [smoothingSeries]);

  const activePoint = smoothingSeries[selectedChartIndex] ?? smoothingSeries[smoothingSeries.length - 1];

  const handlePlayPreview = (label: string, anomaly: number) => {
    setActivePreviewNote(label);
    audioEngine.playDiscretePulse(anomaly, 0.75, settings.volume);
    announceToScreenReader(
      `Played piano tone ${label} representing ${anomaly > 0 ? '+' : ''}${anomaly.toFixed(1)} degrees Celsius.`
    );
    window.setTimeout(() => {
      setActivePreviewNote((curr) => (curr === label ? null : curr));
    }, 650);
  };

  const sectionCardClass = hc
    ? 'rounded-2xl border-2 border-[#ffe600] bg-black p-5 sm:p-8'
    : 'rounded-2xl border border-cyan-500/20 bg-[#040812]/80 backdrop-blur-sm p-5 sm:p-8';

  const subSurfaceClass = hc
    ? 'rounded-xl border border-[#ffe600]/80 bg-black p-4'
    : 'rounded-xl border border-slate-800/90 bg-[#080e1c]/90 p-4';

  const highlightItems = [
    { icon: Database, label: 'NASA GISTEMP v4' },
    { icon: Layers, label: 'Historical Climate Data' },
    { icon: MapPin, label: '2° × 2° Spatial Grid' },
    { icon: AudioLines, label: 'Interactive Piano Sonification' },
    { icon: Accessibility, label: 'Universal Accessibility' },
  ];

  const workflowSteps = [
    { step: '01', label: 'NASA NetCDF Data', detail: 'GHCNv4 & ERSSTv5 binary grids' },
    { step: '02', label: 'Data Validation', detail: 'Cross-check & _FillValue guard' },
    { step: '03', label: 'Spatial Processing', detail: '2° × 2° slicing & cos(φ) weights' },
    { step: '04', label: 'Statistical Analysis', detail: 'LOESS(5) & 5-yr moving average' },
    { step: '05', label: 'Visualization', detail: '3D Globe, 2D Map & Piano Audio' },
  ];

  return (
    <main
      role="main"
      className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-10 sm:space-y-14 ${
        hc ? 'text-white' : 'text-slate-100'
      }`}
    >
      {/* HERO SECTION – EXECUTIVE SUMMARY */}
      <section aria-labelledby="about-hero-title" className={`${sectionCardClass} space-y-6`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <p
              className={`text-xs font-mono tracking-widest uppercase ${
                hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'
              }`}
            >
              EarthPulse4 · Scientific Architecture & Methodology
            </p>
            <h1
              id="about-hero-title"
              className={`text-3xl sm:text-5xl font-extrabold tracking-tight text-balance ${
                hc ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              About EarthPulse4
            </h1>
            <p
              className={`text-base sm:text-xl font-semibold leading-snug ${
                hc ? 'text-white' : 'text-cyan-300'
              }`}
            >
              Making Earth&apos;s Climate Data Visible, Audible, and Accessible.
            </p>
            <p
              className={`text-sm sm:text-base leading-relaxed max-w-[70ch] pt-1 ${
                hc ? 'text-slate-200' : 'text-slate-300'
              }`}
            >
              EarthPulse4 transforms 145 years of NASA climate observations into an interactive
              scientific experience through geospatial visualization and real-time piano-based data
              sonification. By combining visual exploration with audio interaction and
              accessibility-focused design, EarthPulse4 aims to make complex climate information more
              understandable, including for blind and visually impaired users.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                rm ? '' : 'transition-colors duration-150'
              } ${
                hc
                  ? 'bg-[#ffe600] text-black hover:bg-yellow-300 focus-visible:outline-[#ffe600]'
                  : 'bg-[#00E5FF] text-slate-950 hover:bg-cyan-300 focus-visible:outline-[#00E5FF]'
              }`}
            >
              <span>Open Explore Earth</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <a
              href="https://data.giss.nasa.gov/gistemp/"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-semibold border whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                hc
                  ? 'border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600]/10 focus-visible:outline-[#ffe600]'
                  : 'border-cyan-500/40 text-cyan-300 hover:border-[#00E5FF] hover:text-white focus-visible:outline-[#00E5FF]'
              }`}
            >
              <span>NASA GISS Portal</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Compact Row of Scientific Highlights (Unboxed Typography + Icons) */}
        <div
          className={`pt-5 border-t grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 ${
            hc ? 'border-[#ffe600]/40' : 'border-cyan-500/20'
          }`}
        >
          {highlightItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 min-w-0">
              <Icon
                aria-hidden="true"
                className={`w-4 h-4 shrink-0 ${hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'}`}
              />
              <span className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Section Quick Jump Links */}
        <nav aria-label="About page sections" className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono">
          <a
            href="#section-science"
            className={`hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded ${
              hc ? 'text-[#ffe600] focus-visible:outline-[#ffe600]' : 'text-cyan-400 hover:text-[#00E5FF] focus-visible:outline-[#00E5FF]'
            }`}
          >
            01. The Science &amp; Data
          </a>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <a
            href="#section-sonification"
            className={`hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded ${
              hc ? 'text-[#ffe600] focus-visible:outline-[#ffe600]' : 'text-cyan-400 hover:text-[#00E5FF] focus-visible:outline-[#00E5FF]'
            }`}
          >
            02. The Sonification Engine
          </a>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <a
            href="#section-processing"
            className={`hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded ${
              hc ? 'text-[#ffe600] focus-visible:outline-[#ffe600]' : 'text-cyan-400 hover:text-[#00E5FF] focus-visible:outline-[#00E5FF]'
            }`}
          >
            03. Data Processing &amp; Analysis
          </a>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <a
            href="#section-accessibility"
            className={`hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 rounded ${
              hc ? 'text-[#ffe600] focus-visible:outline-[#ffe600]' : 'text-cyan-400 hover:text-[#00E5FF] focus-visible:outline-[#00E5FF]'
            }`}
          >
            04. Universal Accessibility
          </a>
        </nav>
      </section>

      {/* SECTION 01 – THE SCIENCE & DATA */}
      <section
        id="section-science"
        aria-labelledby="heading-science"
        className={`${sectionCardClass} space-y-6`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                hc
                  ? 'border-[#ffe600] bg-black text-[#ffe600]'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-[#00E5FF]'
              }`}
            >
              <Globe className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span
                className={`text-xs font-mono tracking-wider uppercase block ${
                  hc ? 'text-[#ffe600]' : 'text-cyan-400'
                }`}
              >
                01. Geospatial Foundation
              </span>
              <h2
                id="heading-science"
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  hc ? 'text-[#ffe600]' : 'text-white'
                }`}
              >
                The Science &amp; Data
              </h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3 text-sm leading-relaxed text-slate-300">
            <p>
              EarthPulse4 uses the{' '}
              <strong className="text-white">
                NASA GISS Surface Temperature Analysis (GISTEMP v4)
              </strong>{' '}
              to explore historical surface temperature anomalies across land and ocean regions.
            </p>
            <p>
              Rather than plotting raw air temperatures—which vary heavily by altitude and terrain—climate
              scientists measure <strong className="text-white">temperature anomalies</strong>: how
              much warmer or cooler a given month or year is compared to its{' '}
              <strong className={hc ? 'text-[#ffe600]' : 'text-cyan-300'}>
                1951–1980 reference baseline
              </strong>{' '}
              for the exact same location.
            </p>
          </div>

          {/* 6 Specification Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={subSurfaceClass}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Data Source
              </span>
              <strong className={`text-sm font-bold block mt-1 ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                NASA GISTEMP v4
              </strong>
              <span className="text-xs text-slate-400 mt-1 block">
                NOAA GHCN v4 + ERSST v5
              </span>
            </div>

            <div className={subSurfaceClass}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Data Format
              </span>
              <strong className={`text-sm font-bold block mt-1 ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                NetCDF
              </strong>
              <span className="text-xs text-slate-400 mt-1 block">
                CF-1.6 binary grids &amp; CSV
              </span>
            </div>

            <div className={subSurfaceClass}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Spatial Resolution
              </span>
              <strong className={`text-sm font-bold font-mono tabular-nums block mt-1 ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                2° × 2°
              </strong>
              <span className="text-xs text-slate-400 mt-1 block">
                90 lat × 180 lon cells
              </span>
            </div>

            <div className={subSurfaceClass}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Smoothing
              </span>
              <strong className={`text-sm font-bold block mt-1 ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                250 km land-only product
              </strong>
              <span className="text-xs text-slate-400 mt-1 block">
                Plus 1200 km Land + Ocean stream
              </span>
            </div>

            <div className={subSurfaceClass}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Reference Baseline
              </span>
              <strong className={`text-sm font-bold font-mono tabular-nums block mt-1 ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                1951–1980
              </strong>
              <span className="text-xs text-slate-400 mt-1 block">
                30-year monthly climatology
              </span>
            </div>

            <div className={subSurfaceClass}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Historical Coverage
              </span>
              <strong className={`text-sm font-bold block mt-1 ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                1880 onward
              </strong>
              <span className="text-xs text-slate-400 mt-1 block">
                According to available dataset
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Technical Details: NetCDF, Coordinates & Missing Data */}
        <TechnicalAccordion
          id="accordion-science"
          title="Technical Details: NetCDF Structure, Grid Coordinates & Missing Data Handling"
          isOpen={openAccordions.science}
          onToggle={() => toggleAccordion('science')}
          highContrast={hc}
          reducedMotion={rm}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                NetCDF Data Structure
              </h3>
              <p>
                Official archives (<span className="font-mono text-cyan-300">gistemp1200_GHCNv4_ERSSTv5.nc.gz</span>{' '}
                and <span className="font-mono text-cyan-300">gistemp250_GHCNv4.nc.gz</span>) follow
                NetCDF-3 CF-1.6 conventions with dimensions{' '}
                <span className="font-mono text-slate-200">time × lat(90) × lon(180)</span>. Packed
                temperature anomaly values (<span className="font-mono text-slate-200">tempanomaly</span>)
                are unpacked strictly using header metadata{' '}
                <span className="font-mono text-slate-200">scale_factor (0.01)</span> and{' '}
                <span className="font-mono text-slate-200">add_offset (0)</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Spatial Grid Coordinates
              </h3>
              <p>
                Latitude indices span <span className="font-mono text-slate-200">-89° to +89°</span>{' '}
                (South to North in 2° increments) and longitude indices span{' '}
                <span className="font-mono text-slate-200">-179° to +179°</span> (West to East). Pointer
                inspection and audio lookup read exact cell indices without interpolation.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Missing Values &amp; _FillValue Integrity
              </h3>
              <p>
                Grid cells encoded with <span className="font-mono text-slate-200">_FillValue = 32767</span>{' '}
                or non-finite readings are preserved explicitly as unavailable. They render with
                diagonal hatching on the map and remain completely silent in piano sonification—never
                replaced by <span className="font-mono">0.0°C</span> or synthetic estimates.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Land-Only vs. Ocean Cells
              </h3>
              <p>
                The <span className="font-mono text-slate-200">250 km</span> land-only product omits
                marine measurements intentionally (<span className="font-mono">IOCEAN=none</span>): open
                oceans and terrestrial areas more than 250 km from a GHCN v4 meteorological station
                both retain missing status without cross-ocean interpolation.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs font-mono">
            <a
              href="https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 hover:underline ${
                hc ? 'text-[#ffe600]' : 'text-cyan-400'
              }`}
            >
              <span>Official GISTEMP CSV</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <a
              href="https://data.giss.nasa.gov/pub/gistemp/gistemp1200_GHCNv4_ERSSTv5.nc.gz"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 hover:underline ${
                hc ? 'text-[#ffe600]' : 'text-cyan-400'
              }`}
            >
              <span>Land+Ocean NetCDF (.nc.gz)</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <a
              href="https://data.giss.nasa.gov/pub/gistemp/gistemp250_GHCNv4.nc.gz"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 hover:underline ${
                hc ? 'text-[#ffe600]' : 'text-cyan-400'
              }`}
            >
              <span>Land-Only NetCDF (.nc.gz)</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </TechnicalAccordion>
      </section>

      {/* SECTION 02 – THE SONIFICATION ENGINE */}
      <section
        id="section-sonification"
        aria-labelledby="heading-sonification"
        className={`${sectionCardClass} space-y-6`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              hc
                ? 'border-[#ffe600] bg-black text-[#ffe600]'
                : 'border-cyan-500/30 bg-cyan-500/10 text-[#00E5FF]'
            }`}
          >
            <AudioLines className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span
              className={`text-xs font-mono tracking-wider uppercase block ${
                hc ? 'text-[#ffe600]' : 'text-cyan-400'
              }`}
            >
              02. Auditory Perception
            </span>
            <h2
              id="heading-sonification"
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                hc ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              The Sonification Engine
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4 text-sm leading-relaxed text-slate-300">
            <p>
              EarthPulse4 converts numerical temperature anomalies directly into acoustic grand-piano
              notes via the browser&apos;s <strong className="text-white">Web Audio API</strong>—without
              pre-recorded sound files. Both the historical timeline player and real-time map hover
              synthesis allow users to hear spatial and temporal climate patterns.
            </p>
            <p>
              The engine uses <strong className="text-white">12-Tone Equal Temperament</strong>, the
              standard Western musical tuning system where adjacent semitones maintain a constant
              frequency ratio of <span className="font-mono text-slate-200">2^(1/12) ≈ 1.0595</span>.
              Because human pitch perception is logarithmic, equal temperature increments produce
              consistent, intuitive musical intervals:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className={subSurfaceClass}>
                <span className="text-xs font-mono text-sky-300 block">Cooler Conditions</span>
                <strong className="text-sm text-white block mt-0.5">
                  Lower anomaly → Lower musical pitch
                </strong>
                <span className="text-xs text-slate-400 block mt-1">
                  Deep bass registers (e.g., G3 below Middle C)
                </span>
              </div>
              <div className={subSurfaceClass}>
                <span className="text-xs font-mono text-orange-300 block">Warmer Conditions</span>
                <strong className="text-sm text-white block mt-0.5">
                  Higher anomaly → Higher musical pitch
                </strong>
                <span className="text-xs text-slate-400 block mt-1">
                  Bright upper registers (rising toward C5+)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Piano-Inspired Pitch Scale */}
          <div className="lg:col-span-6 space-y-3">
            <div className={subSurfaceClass}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold text-slate-200">
                  Interactive Piano Pitch Reference (Click to Preview Tone)
                </span>
                <Volume2
                  aria-hidden="true"
                  className={`w-4 h-4 shrink-0 ${hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'}`}
                />
              </div>

              {/* Playable Piano Keys Strip */}
              <div
                className="grid grid-cols-3 sm:grid-cols-6 gap-1.5"
                role="group"
                aria-label="Interactive piano frequency scale preview"
              >
                {PIANO_PREVIEW_STOPS.map((stop) => {
                  const isActive = activePreviewNote === stop.label;
                  const isBaseline = stop.anomaly === 0;
                  return (
                    <button
                      key={stop.label}
                      type="button"
                      onClick={() => handlePlayPreview(stop.label, stop.anomaly)}
                      aria-label={`Play ${stop.label}, ${stop.freq}, anomaly ${stop.anomaly > 0 ? '+' : ''}${stop.anomaly.toFixed(1)} degrees Celsius`}
                      className={`p-2.5 rounded-lg border text-left flex flex-col justify-between min-h-[92px] focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        rm ? '' : 'transition-colors duration-150'
                      } ${
                        isActive
                          ? hc
                            ? 'bg-[#ffe600] text-black border-[#ffe600]'
                            : 'bg-[#00E5FF] text-slate-950 border-[#00E5FF]'
                          : isBaseline
                          ? hc
                            ? 'bg-black text-[#ffe600] border-2 border-[#ffe600] hover:bg-[#ffe600]/15'
                            : 'bg-cyan-950/60 text-white border-cyan-400/70 hover:bg-cyan-900/60'
                          : hc
                          ? 'bg-black text-white border-slate-600 hover:border-[#ffe600]'
                          : 'bg-slate-950/90 text-slate-200 border-slate-700 hover:border-cyan-400/60 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-mono font-bold text-sm">{stop.label}</span>
                        <span
                          className={`text-[10px] font-mono tabular-nums ${
                            isActive ? 'text-slate-900 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {stop.anomaly > 0 ? `+${stop.anomaly.toFixed(1)}` : stop.anomaly.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="pt-3">
                        <span
                          className={`text-[11px] font-mono tabular-nums block ${
                            isActive
                              ? 'text-slate-950 font-semibold'
                              : hc
                              ? 'text-[#ffe600]'
                              : 'text-cyan-300'
                          }`}
                        >
                          {stop.freq}
                        </span>
                        <span
                          className={`text-[10px] block truncate ${
                            isActive ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {stop.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clean Frequency Scale Gradient Indicator */}
              <div className="mt-4 space-y-1.5">
                <div
                  className="h-2 w-full rounded-full border border-white/15"
                  style={{
                    background: hc
                      ? 'linear-gradient(90deg, #64748b 0%, #ffffff 45%, #ffe600 100%)'
                      : 'linear-gradient(90deg, #0284c7 0%, #38bdf8 38%, #00E5FF 55%, #f97316 80%, #dc2626 100%)',
                  }}
                  aria-hidden="true"
                />
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                  <span>196 Hz (-0.5°C)</span>
                  <span className={hc ? 'text-[#ffe600]' : 'text-cyan-300'}>261.63 Hz (0.0°C)</span>
                  <span>523.25 Hz (+1.2°C)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Accordion: Mathematical Model */}
        <TechnicalAccordion
          id="accordion-sonification"
          title="Explore the Mathematical Model"
          isOpen={openAccordions.sonification}
          onToggle={() => toggleAccordion('sonification')}
          highContrast={hc}
          reducedMotion={rm}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2">
                In the timeline Grand Piano sonification engine, global temperature anomalies are mapped
                to equal-tempered semitones anchored at Middle C (<span className="font-mono">C4 = 261.63 Hz</span>):
              </p>
              <div
                className={`p-4 rounded-lg border font-mono text-sm sm:text-base overflow-x-auto ${
                  hc
                    ? 'bg-black border-[#ffe600] text-[#ffe600]'
                    : 'bg-cyan-950/30 border-cyan-500/30 text-[#00E5FF]'
                }`}
              >
                f = 261.63 × 2^(semitones / 12) &nbsp;&nbsp;|&nbsp;&nbsp; 1 semitone = 0.1°C
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                  Monthly Map Real-Time Hover Scale
                </h3>
                <p>
                  When hovering across the 2° × 2° spatial temperature map with{' '}
                  <strong>Listen to Earth</strong> enabled, local cell anomalies use a wider{' '}
                  <span className="font-mono">±4.0°C</span> logarithmic range anchored at{' '}
                  <span className="font-mono">A4 = 440 Hz</span>:{' '}
                  <span className="font-mono text-cyan-300">
                    f = 440 × 2^(clamp(x, -4, 4) / 4)
                  </span>{' '}
                  (<span className="font-mono">220 Hz</span> at <span className="font-mono">-4°C</span> to{' '}
                  <span className="font-mono">880 Hz</span> at <span className="font-mono">+4°C</span>).
                  Audio clipping never alters displayed NASA values.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                  Designed Sonification Convention
                </h3>
                <p>
                  This pitch mapping is a deliberate{' '}
                  <strong>auditory design model built on the equal-tempered musical scale</strong>—not a
                  physical law of climate science. Its purpose is to make subtle warming trends and
                  regional contrasts immediately audible to human ears.
                </p>
              </div>
            </div>
          </div>
        </TechnicalAccordion>
      </section>

      {/* SECTION 03 – DATA PROCESSING & ANALYSIS */}
      <section
        id="section-processing"
        aria-labelledby="heading-processing"
        className={`${sectionCardClass} space-y-6`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              hc
                ? 'border-[#ffe600] bg-black text-[#ffe600]'
                : 'border-cyan-500/30 bg-cyan-500/10 text-[#00E5FF]'
            }`}
          >
            <Database className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span
              className={`text-xs font-mono tracking-wider uppercase block ${
                hc ? 'text-[#ffe600]' : 'text-cyan-400'
              }`}
            >
              03. Scientific Pipeline
            </span>
            <h2
              id="heading-processing"
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                hc ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              Data Processing &amp; Analysis
            </h2>
          </div>
        </div>

        {/* Visual Pipeline Sequence */}
        <ol
          aria-label="EarthPulse4 scientific data processing workflow"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          {workflowSteps.map((item, idx) => (
            <li key={item.step} className={`${subSurfaceClass} relative flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-xs font-mono font-bold ${
                      hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'
                    }`}
                  >
                    {item.step}
                  </span>
                  {idx < workflowSteps.length - 1 && (
                    <>
                      <ArrowRight
                        aria-hidden="true"
                        className="hidden lg:block w-3.5 h-3.5 text-slate-500"
                      />
                      <ArrowDown
                        aria-hidden="true"
                        className="lg:hidden sm:hidden w-3.5 h-3.5 text-slate-500"
                      />
                    </>
                  )}
                </div>
                <strong className="text-sm text-white block">{item.label}</strong>
              </div>
              <span className="text-xs text-slate-400 mt-1.5 block">{item.detail}</span>
            </li>
          ))}
        </ol>

        {/* Balanced Comparison Cards: LOESS vs 5-Year Centered Moving Average */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={subSurfaceClass}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className={`text-base font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                LOESS Smoothing
              </h3>
              <span className="text-[11px] font-mono text-cyan-300">Solid Cyan Curve</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong>Locally Estimated Scatterplot Smoothing (LOESS / LOWESS)</strong> fits weighted
              local regressions across neighboring years. Distant points receive decreasing tri-cube
              weights, revealing multi-decadal climate trajectories while resisting abrupt single-year
              volcanic or El Niño spikes.
            </p>
          </div>

          <div className={subSurfaceClass}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className={`text-base font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                5-Year Centered Moving Average
              </h3>
              <span className="text-[11px] font-mono text-amber-300">Dashed Amber Curve</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              The <strong>5-Year Centered Moving Average</strong> computes an equal-weight arithmetic
              mean over a five-year window centered on the target year (<span className="font-mono">[t-2 … t+2]</span>).
              Every year inside the window carries identical weight, making it transparent to interpret
              while smoothing annual variability.
            </p>
          </div>
        </div>

        {/* Authentic Responsive NASA Time-Series Comparison Chart (1880–2025) */}
        <div className={subSurfaceClass}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                Empirical NASA GISTEMP Comparison (1880–2025)
              </h3>
              <p className="text-xs text-slate-400">
                Inspecting authentic annual records against LOESS(5) and 5-year centered moving average.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-4 h-0.5 border-t border-dotted border-slate-400 inline-block" aria-hidden="true" />
                <span>Annual</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-cyan-300">
                <span className={`w-4 h-0.5 inline-block ${hc ? 'bg-[#ffe600]' : 'bg-[#00E5FF]'}`} aria-hidden="true" />
                <span>LOESS(5)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-400 inline-block" aria-hidden="true" />
                <span>5-Yr Moving Avg</span>
              </span>
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartGeometry.W} ${chartGeometry.H}`}
              className="w-full h-auto block"
              role="img"
              aria-label="Authentic NASA GISTEMP annual global temperature anomalies from 1880 to 2025 comparing LOESS smoothing and 5-year centered moving average"
            >
              {/* Horizontal Gridlines */}
              {chartGeometry.yTicks.map((tick) => {
                const y = chartGeometry.toY(tick);
                const isZero = tick === 0;
                return (
                  <g key={tick}>
                    <line
                      x1={chartGeometry.padL}
                      y1={y}
                      x2={chartGeometry.W - chartGeometry.padR}
                      y2={y}
                      stroke={isZero ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.14)'}
                      strokeWidth={isZero ? 1.2 : 1}
                      strokeDasharray={isZero ? '4 4' : undefined}
                    />
                    <text
                      x={chartGeometry.padL - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {tick > 0 ? `+${tick.toFixed(1)}` : tick.toFixed(1)}°
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Year Labels */}
              {chartGeometry.xYears.map((yr) => {
                const idx = smoothingSeries.findIndex((p) => p.year === yr);
                if (idx < 0) return null;
                const x = chartGeometry.toX(idx);
                return (
                  <text
                    key={yr}
                    x={x}
                    y={chartGeometry.H - 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {yr}
                  </text>
                );
              })}

              {/* Annual No_Smoothing Thin Dotted Line */}
              <path
                d={chartGeometry.annualPath}
                fill="none"
                stroke="rgba(148, 163, 184, 0.55)"
                strokeWidth="1.25"
                strokeDasharray="2 2.5"
              />

              {/* 5-Year Centered Moving Average Dashed Line */}
              <path
                d={chartGeometry.ma5Path}
                fill="none"
                stroke={hc ? '#ffffff' : '#fbbf24'}
                strokeWidth="1.8"
                strokeDasharray="6 3.5"
              />

              {/* LOESS(5) Solid Primary Curve */}
              <path
                d={chartGeometry.lowessPath}
                fill="none"
                stroke={hc ? '#ffe600' : '#00E5FF'}
                strokeWidth="2.4"
              />

              {/* Active Year Vertical Marker */}
              <line
                x1={chartGeometry.toX(selectedChartIndex)}
                y1={chartGeometry.padT}
                x2={chartGeometry.toX(selectedChartIndex)}
                y2={chartGeometry.H - chartGeometry.padB}
                stroke={hc ? '#ffe600' : 'rgba(0, 229, 255, 0.5)'}
                strokeWidth="1"
              />
              <circle
                cx={chartGeometry.toX(selectedChartIndex)}
                cy={chartGeometry.toY(activePoint.lowess5)}
                r="4"
                fill={hc ? '#ffe600' : '#00E5FF'}
              />
            </svg>
          </div>

          {/* Interactive Year Scrubber + Tabular Readout */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <label className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-slate-400 shrink-0">Inspect Year:</span>
              <input
                type="range"
                min={0}
                max={smoothingSeries.length - 1}
                value={selectedChartIndex}
                onChange={(e) => setSelectedChartIndex(parseInt(e.target.value, 10))}
                aria-label="Inspect comparison year from 1880 to 2025"
                className="w-full max-w-xs accent-cyan-400 cursor-pointer"
              />
            </label>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
              <span className="text-white font-bold">{activePoint.year}</span>
              <span className="text-slate-300">
                Annual:{' '}
                <strong>
                  {activePoint.annual > 0 ? `+${activePoint.annual.toFixed(2)}` : activePoint.annual.toFixed(2)}°C
                </strong>
              </span>
              <span className={hc ? 'text-[#ffe600]' : 'text-cyan-300'}>
                LOESS(5):{' '}
                <strong>
                  {activePoint.lowess5 > 0 ? `+${activePoint.lowess5.toFixed(2)}` : activePoint.lowess5.toFixed(2)}°C
                </strong>
              </span>
              <span className={hc ? 'text-white' : 'text-amber-300'}>
                5-Yr Avg:{' '}
                <strong>
                  {activePoint.movingAvg5 > 0 ? `+${activePoint.movingAvg5.toFixed(2)}` : activePoint.movingAvg5.toFixed(2)}°C
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Technical Details */}
        <TechnicalAccordion
          id="accordion-processing"
          title="Technical Details: Statistical Weighting & Area-Mean Equations"
          isOpen={openAccordions.processing}
          onToggle={() => toggleAccordion('processing')}
          highContrast={hc}
          reducedMotion={rm}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                LOESS Tri-Cube Weighting vs. Rectangular Average
              </h3>
              <p>
                LOESS assigns weights proportional to{' '}
                <span className="font-mono text-slate-200">w(u) = (1 - |u|³)³</span> over normalized
                window distance <span className="font-mono">u</span>, preserving local curvature at the
                boundaries of the time series. In contrast, the 5-year centered moving average computes{' '}
                <span className="font-mono text-slate-200">MA₅(t) = (1/5) Σ xₜ₊ₖ</span> for{' '}
                <span className="font-mono">k ∈ [-2, +2]</span> using adaptive boundary windows at the
                dataset endpoints.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Cosine-Latitude Spatial Weighting &amp; Two-Source Check
              </h3>
              <p>
                Global spatial means from 2° × 2° NetCDF slices weight each valid grid cell by{' '}
                <span className="font-mono text-slate-200">cos(φ)</span> so smaller polar grid boxes do
                not bias the global mean. Annual tables are cross-checked between the dynamic{' '}
                <span className="font-mono">GLB.Ts+dSST.csv</span> feed and bundled reference records
                without silent substitution.
              </p>
            </div>
          </div>
        </TechnicalAccordion>
      </section>

      {/* SECTION 04 – UNIVERSAL ACCESSIBILITY */}
      <section
        id="section-accessibility"
        aria-labelledby="heading-accessibility"
        className={`${sectionCardClass} space-y-6`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                hc
                  ? 'border-[#ffe600] bg-black text-[#ffe600]'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-[#00E5FF]'
              }`}
            >
              <Accessibility className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span
                className={`text-xs font-mono tracking-wider uppercase block ${
                  hc ? 'text-[#ffe600]' : 'text-cyan-400'
                }`}
              >
                04. Inclusive Design
              </span>
              <h2
                id="heading-accessibility"
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  hc ? 'text-[#ffe600]' : 'text-white'
                }`}
              >
                Universal Accessibility
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('accessibility')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-bold border whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              hc
                ? 'border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black focus-visible:outline-[#ffe600]'
                : 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15 focus-visible:outline-[#00E5FF]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Universal Access Settings</span>
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-300 max-w-3xl">
          Climate data should not require sight alone to understand. EarthPulse4 is designed so
          blind, low-vision, and sighted users can explore global warming trends simultaneously
          through visual telemetry, acoustic piano synthesis, and structured assistive markup.
        </p>

        {/* Three Prominent Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={subSurfaceClass}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <Volume2
                aria-hidden="true"
                className={`w-5 h-5 shrink-0 ${hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'}`}
              />
              <h3 className={`text-base font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Voice Narration
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Integrated Web Speech Synthesis provides spoken onboarding orientation, interactive
              listening-guide voice tests, and automatic milestone narration during historical
              timeline playback.
            </p>
          </div>

          <div className={subSurfaceClass}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <Eye
                aria-hidden="true"
                className={`w-5 h-5 shrink-0 ${hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'}`}
              />
              <h3 className={`text-base font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Screen Reader Support
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Polite live-region announcements (<span className="font-mono text-slate-200">aria-live</span>)
              announce view navigation, pinned spatial map cells, and audio mode changes, paired
              with an accessible Tabular Data view for full non-visual numeric inspection.
            </p>
          </div>

          <div className={subSurfaceClass}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <Keyboard
                aria-hidden="true"
                className={`w-5 h-5 shrink-0 ${hc ? 'text-[#ffe600]' : 'text-[#00E5FF]'}`}
              />
              <h3 className={`text-base font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                WAI-ARIA Accessibility
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Built with semantic landmark regions, descriptive labels, keyboard-operable controls
              and accordions, visible focus indicators, high-contrast theme support, and reduced-motion
              preferences where implemented.
            </p>
          </div>
        </div>

        {/* Expandable Technical Details: Keyboard & Assistive Controls */}
        <TechnicalAccordion
          id="accordion-accessibility"
          title="Implemented Keyboard Shortcuts & Assistive Controls"
          isOpen={openAccordions.accessibility}
          onToggle={() => toggleAccordion('accessibility')}
          highContrast={hc}
          reducedMotion={rm}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Keyboard &amp; Focus Navigation
              </h3>
              <ul className="space-y-1 text-xs sm:text-sm">
                <li>
                  <span className="font-mono text-cyan-300">C</span>: Toggles pure black &amp; yellow
                  High-Contrast mode globally.
                </li>
                <li>
                  <span className="font-mono text-cyan-300">Tab / Enter / Space</span>: Navigates links,
                  buttons, piano preview keys, and expandable technical accordions.
                </li>
                <li>
                  <span className="font-mono text-cyan-300">Skip Link</span>: Direct keyboard bypass
                  to main content at the top of every view.
                </li>
              </ul>
            </div>

            <div className="space-y-1">
              <h3 className={`font-bold ${hc ? 'text-[#ffe600]' : 'text-white'}`}>
                Non-Color State Signaling &amp; Motion Restraint
              </h3>
              <p>
                Temperature anomalies, piano registers, and chart comparisons pair color with explicit
                text labels, numeric units (<span className="font-mono">°C</span>,{' '}
                <span className="font-mono">Hz</span>), and distinct dashed/solid line geometry.
                Animations automatically respect{' '}
                <span className="font-mono">prefers-reduced-motion</span> and the in-app Reduced
                Motion setting.
              </p>
            </div>
          </div>
        </TechnicalAccordion>
      </section>
    </main>
  );
};
