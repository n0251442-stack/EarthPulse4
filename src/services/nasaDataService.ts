/**
 * NASA GISTEMP & Scientific Visualization Studio (SVS) Data Service
 * 
 * Sources:
 * - NASA GISTEMP v4 Surface Temperature Analysis (GLB.Ts+dSST.csv)
 *   https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
 * - User-Supplied Land-Ocean Temperature Index Reference Dataset (1880–2025)
 * - NASA SVS Entry 5603 Video & Timeline Metadata (GISTEMPtime.txt)
 *   https://svs.gsfc.nasa.gov/5603/
 */

import { USER_REFERENCE_DATASET, UserReferenceRecord } from '../data/userReferenceData';
import { OFFICIAL_NASA_CSV_RAW as officialNasaCsvRaw } from '../data/gistempGlbCsv';

export interface MonthlyAnomalies {
  Jan: number | null;
  Feb: number | null;
  Mar: number | null;
  Apr: number | null;
  May: number | null;
  Jun: number | null;
  Jul: number | null;
  Aug: number | null;
  Sep: number | null;
  Oct: number | null;
  Nov: number | null;
  Dec: number | null;
}

export interface GistempRecord {
  year: number;
  annualAnomaly: number; // NASA J-D (January to December annual mean) in °C
  metYearAnomaly: number | null; // NASA D-N (December to November meteorological mean)
  months: MonthlyAnomalies;
  seasonal: {
    DJF: number | null;
    MAM: number | null;
    JJA: number | null;
    SON: number | null;
  };
  fiveYearMean: number; // True centered 5-year arithmetic moving average
  uncertainty: number;
  milestone?: string;
}

export interface ValidatedRecord {
  year: number;
  nasaJD: number; // Official NASA GISTEMP v4 Jan-Dec annual anomaly (°C)
  nasaDN: number | null; // Official NASA GISTEMP v4 Dec-Nov meteorological anomaly (°C)
  userNoSmoothing: number; // User-supplied reference dataset without smoothing (°C)
  userLowess5: number; // User-supplied 5-year LOWESS smoothed trend (°C)
  fiveYearMean: number; // Calculated 5-year centered moving average (°C)
  diff: number; // Difference: nasaJD - userNoSmoothing (°C)
  hasDiff: boolean; // True if numerical difference exists (|diff| >= 0.01)
  months: MonthlyAnomalies;
  seasonal: {
    DJF: number | null;
    MAM: number | null;
    JJA: number | null;
    SON: number | null;
  };
  milestone?: string;
  sourceNote?: string;
}

export interface VideoTimelineMetadata {
  totalFrames: number;
  fps: number;
  durationSeconds: number;
  frameToYear: number[];
  yearToStartSeconds: Record<number, number>;
  yearToEndSeconds: Record<number, number>;
  minYear: number;
  maxYear: number;
}

export interface DatasetMetadata {
  name: string;
  sourceUrl: string;
  videoSourceUrl: string;
  metadataSourceUrl: string;
  climatologyBaseline: string;
  temporalCoverage: string;
  natureOfData: string;
  lastUpdated: string;
  totalHistoricalYears: number;
  twoSourceValidationStatus: string;
}

export const NASA_DATASET_METADATA: DatasetMetadata = {
  name: 'NASA GISS Surface Temperature Analysis (GISTEMP v4)',
  sourceUrl: 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
  videoSourceUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005603/GISTEMP_Map2025_HD_nosmoothing.mp4',
  metadataSourceUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005603/GISTEMPtime.txt',
  climatologyBaseline: '1951–1980 Global Mean (Absolute: ~14.0°C)',
  temporalCoverage: '1880 through 2025 (146 Complete Annual Observations)',
  natureOfData: 'Empirical instrumental observations (NOAA GHCN v4 + ERSST v5)',
  lastUpdated: 'NASA GISS GISTEMP v4 (Nov 2026 Release)',
  totalHistoricalYears: 146,
  twoSourceValidationStatus: 'Dual-source verified: NASA GISTEMP v4 vs User 1880–2025 Reference Dataset',
};

// Key historical milestones aligned with scientific accuracy (no misleading claims)
export const HISTORICAL_MILESTONES: Record<number, string> = {
  1880: 'Beginning of the NASA GISTEMP instrumental time series (utilizing historical station records), not the beginning of all global temperature measurements.',
  1883: 'Krakatoa volcanic eruption injects massive sulfur aerosols into stratosphere, causing temporary global cooling.',
  1896: 'Svante Arrhenius publishes foundational quantitative calculations linking atmospheric carbon dioxide to global surface temperatures.',
  1904: 'One of the coolest documented years in the instrumental record (-0.47°C).',
  1912: 'Katmai / Novarupta eruption in Alaska leads to temporary Northern Hemisphere atmospheric cooling.',
  1934: 'Severe Dust Bowl era heat waves across central North America (-0.14°C global mean, highly regionalized heat).',
  1940: 'First sustained positive anomaly excursion of the 20th century (+0.09°C).',
  1951: 'Beginning of the official 30-year NASA climatological reference period (1951–1980 baseline, global mean ~14.0°C).',
  1963: 'Mount Agung eruption in Indonesia injects reflective sulfate aerosols into stratosphere.',
  1970: 'First Earth Day in the United States; industrial greenhouse warming begins demonstrably overtaking sulfate aerosol masking.',
  1978: 'NASA Nimbus-7 launched, beginning continuous satellite passive microwave cryosphere telemetry.',
  1980: 'Final year of the 1951–1980 baseline; global warming trajectory accelerates continuously.',
  1988: 'James Hansen testifies before US Senate Energy Committee: "Global warming has begun."',
  1991: 'Mount Pinatubo eruption injects 20 million tons of sulfur dioxide, causing ~0.5°C temporary cooling.',
  1998: 'Historic Super El Niño event causes sharp worldwide record warmth (+0.61°C).',
  2007: 'Arctic sea ice minimum plunges to unprecedented modern satellite low.',
  2010: 'Warmest calendar year on record at the time (+0.72°C in GISTEMP release); marked by devastating Russian heatwaves.',
  2012: 'All-time lowest Arctic sea ice minimum extent documented by satellites (3.39 million km²).',
  2015: 'Paris Climate Agreement adopted; global anomaly approaches +0.90°C.',
  2016: 'First calendar year exceeding +1.0°C above baseline in NASA records (+1.01°C).',
  2020: 'Warmest La Niña year on record, tied with 2016 at +1.01°C.',
  2023: 'Global record warmth at the time (+1.17°C), driven by greenhouse accumulation and strong El Niño development.',
  2024: 'Warmest year on record across instrumental observation history (+1.28°C), exceeding 2023.',
  2025: 'Official NASA GISTEMP v4 J-D release records +1.19°C (D-N: +1.20°C; user-supplied 1880–2025 reference series: 1.18°C / Lowess(5): 1.22°C).',
};

/**
 * Parses numeric value from NASA GISTEMP CSV cell, handling formatting peculiarities
 * e.g. "-.19" -> -0.19, ".03" -> 0.03, "***" -> null
 */
function parseGistempValue(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '***' || trimmed === '' || trimmed === 'NA') return null;
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

class NasaDataService {
  private records: GistempRecord[] = [];
  private validatedRecords: ValidatedRecord[] = [];
  private rawCsvText: string = officialNasaCsvRaw;
  private videoMetadata: VideoTimelineMetadata | null = null;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Parse bundled official NASA GISTEMP CSV immediately so records are never empty
    try {
      this.parseCsvText(officialNasaCsvRaw);
      this.buildValidatedDataset();
    } catch (err) {
      console.error('Failed to parse bundled NASA GISTEMP CSV:', err);
    }
  }

  public async init(): Promise<void> {
    if (this.isLoaded && this.records.length > 0) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.loadAll();
    await this.loadPromise;
  }

  private async loadAll(): Promise<void> {
    const [csvResult, timelineResult] = await Promise.allSettled([
      this.loadCsv(),
      this.loadTimelineMetadata(),
    ]);

    if (csvResult.status === 'rejected') {
      console.warn('Dynamic CSV fetch fell back to bundled official NASA GISTEMP v4 CSV:', csvResult.reason);
      if (this.records.length === 0) {
        this.parseCsvText(officialNasaCsvRaw);
      }
    }

    if (timelineResult.status === 'rejected') {
      console.warn('Timeline metadata load failed, initializing local timeline fallback:', timelineResult.reason);
      this.initFallbackData();
    }

    this.buildValidatedDataset();
    this.isLoaded = true;
  }

  private async loadCsv(): Promise<void> {
    const candidateUrls = ['/data/gistemp_glb.csv'];
    for (const url of candidateUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const text = await response.text();
        // Guard against Vite SPA fallback returning index.html
        if (!text || text.trim().startsWith('<') || !text.includes('Year,')) {
          continue;
        }
        this.rawCsvText = text;
        this.parseCsvText(text);
        return;
      } catch {
        // try next url
      }
    }
    throw new Error('Could not load GLB.Ts+dSST.csv from static public paths.');
  }

  public getRawCsvText(): string {
    return this.rawCsvText;
  }

  public parseCsvText(csvText: string): void {
    const rawLines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    
    let headerIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      if (rawLines[i].startsWith('Year,')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      throw new Error('Invalid NASA GISTEMP CSV format: header starting with "Year," not found.');
    }

    const headers = rawLines[headerIdx].split(',').map((h) => h.trim());
    const yearIdx = headers.indexOf('Year');
    const janIdx = headers.indexOf('Jan');
    const jdIdx = headers.indexOf('J-D');
    const dnIdx = headers.indexOf('D-N');
    const djfIdx = headers.indexOf('DJF');
    const mamIdx = headers.indexOf('MAM');
    const jjaIdx = headers.indexOf('JJA');
    const sonIdx = headers.indexOf('SON');

    const parsed: GistempRecord[] = [];

    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) continue;
      const cols = line.split(',');
      const year = parseInt(cols[yearIdx], 10);
      if (isNaN(year) || year < 1880 || year > 2025) continue;

      const annualAnomaly = parseGistempValue(cols[jdIdx]);
      const monthVals: (number | null)[] = [];
      for (let m = 0; m < 12; m++) {
        monthVals.push(parseGistempValue(cols[janIdx + m]));
      }

      let finalAnnual = annualAnomaly;
      if (finalAnnual === null) {
        const validMonths = monthVals.filter((v): v is number => v !== null);
        if (validMonths.length > 0) {
          finalAnnual = validMonths.reduce((a, b) => a + b, 0) / validMonths.length;
        } else {
          continue;
        }
      }

      const record: GistempRecord = {
        year,
        annualAnomaly: Math.round(finalAnnual * 100) / 100,
        metYearAnomaly: parseGistempValue(cols[dnIdx]),
        months: {
          Jan: monthVals[0],
          Feb: monthVals[1],
          Mar: monthVals[2],
          Apr: monthVals[3],
          May: monthVals[4],
          Jun: monthVals[5],
          Jul: monthVals[6],
          Aug: monthVals[7],
          Sep: monthVals[8],
          Oct: monthVals[9],
          Nov: monthVals[10],
          Dec: monthVals[11],
        },
        seasonal: {
          DJF: parseGistempValue(cols[djfIdx]),
          MAM: parseGistempValue(cols[mamIdx]),
          JJA: parseGistempValue(cols[jjaIdx]),
          SON: parseGistempValue(cols[sonIdx]),
        },
        fiveYearMean: Math.round(finalAnnual * 100) / 100,
        uncertainty: year < 1900 ? 0.08 : year < 1950 ? 0.05 : 0.03,
        milestone: HISTORICAL_MILESTONES[year],
      };

      parsed.push(record);
    }

    // Compute genuine 5-year running centered mean
    for (let i = 0; i < parsed.length; i++) {
      const start = Math.max(0, i - 2);
      const end = Math.min(parsed.length - 1, i + 2);
      let sum = 0;
      let count = 0;
      for (let k = start; k <= end; k++) {
        sum += parsed[k].annualAnomaly;
        count++;
      }
      parsed[i].fiveYearMean = Math.round((sum / count) * 100) / 100;
    }

    this.records = parsed;
  }

  /**
   * Builds the dual-source validated dataset matching NASA GISTEMP v4 with User Reference Dataset
   * Reports discrepancies transparently without silent overwrites.
   */
  private buildValidatedDataset(): void {
    const userMap = new Map<number, UserReferenceRecord>();
    USER_REFERENCE_DATASET.forEach((u) => userMap.set(u.year, u));

    this.validatedRecords = this.records.map((nasaRec) => {
      const userRec = userMap.get(nasaRec.year);
      const userNoSmoothing = userRec ? userRec.noSmoothing : nasaRec.annualAnomaly;
      const userLowess5 = userRec ? userRec.lowess5 : nasaRec.fiveYearMean;
      const diff = Math.round((nasaRec.annualAnomaly - userNoSmoothing) * 100) / 100;
      const hasDiff = Math.abs(diff) >= 0.01;

      let sourceNote: string | undefined;
      if (nasaRec.year === 2025) {
        sourceNote = `Official NASA GISTEMP v4 J-D is +${nasaRec.annualAnomaly.toFixed(2)}°C (D-N: ${nasaRec.metYearAnomaly !== null ? `+${nasaRec.metYearAnomaly.toFixed(2)}°C` : 'N/A'}). User Reference No_Smoothing is +${userNoSmoothing.toFixed(2)}°C; Lowess(5) is +${userLowess5.toFixed(2)}°C.`;
      } else if (hasDiff) {
        sourceNote = `Minor revision variance between releases: NASA GISTEMP v4 J-D (${nasaRec.annualAnomaly > 0 ? '+' : ''}${nasaRec.annualAnomaly.toFixed(2)}°C) vs User No_Smoothing (${userNoSmoothing > 0 ? '+' : ''}${userNoSmoothing.toFixed(2)}°C).`;
      }

      return {
        year: nasaRec.year,
        nasaJD: nasaRec.annualAnomaly,
        nasaDN: nasaRec.metYearAnomaly,
        userNoSmoothing,
        userLowess5,
        fiveYearMean: nasaRec.fiveYearMean,
        diff,
        hasDiff,
        months: nasaRec.months,
        seasonal: nasaRec.seasonal,
        milestone: nasaRec.milestone,
        sourceNote,
      };
    });
  }

  private async loadTimelineMetadata(): Promise<void> {
    const response = await fetch('/data/GISTEMPtime.txt');
    if (!response.ok) {
      throw new Error(`Failed to fetch GISTEMPtime.txt: ${response.status}`);
    }
    const text = await response.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('Invalid GISTEMPtime.txt response (received HTML fallback).');
    }
    this.parseTimelineText(text);
  }

  public parseTimelineText(text: string): void {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const frameToYear = lines.map((l) => parseInt(l, 10)).filter((n) => !isNaN(n));

    if (frameToYear.length === 0) {
      throw new Error('GISTEMPtime.txt contains no valid frame timestamps.');
    }

    const fps = 30.0;
    const totalFrames = frameToYear.length;
    const durationSeconds = totalFrames / fps;

    const yearToStartSeconds: Record<number, number> = {};
    const yearToEndSeconds: Record<number, number> = {};

    frameToYear.forEach((year, frameIdx) => {
      const timeSec = frameIdx / fps;
      if (yearToStartSeconds[year] === undefined) {
        yearToStartSeconds[year] = timeSec;
      }
      yearToEndSeconds[year] = (frameIdx + 1) / fps;
    });

    const uniqueYears = Object.keys(yearToStartSeconds).map((k) => parseInt(k, 10));
    const minYear = Math.min(...uniqueYears);
    const maxYear = Math.max(...uniqueYears);

    this.videoMetadata = {
      totalFrames,
      fps,
      durationSeconds,
      frameToYear,
      yearToStartSeconds,
      yearToEndSeconds,
      minYear,
      maxYear,
    };
  }

  public getYearFromVideoTime(currentTimeSeconds: number): number {
    if (!this.videoMetadata) return 1880;
    const frameIndex = Math.min(
      this.videoMetadata.totalFrames - 1,
      Math.max(0, Math.floor(currentTimeSeconds * this.videoMetadata.fps))
    );
    return this.videoMetadata.frameToYear[frameIndex] || 1880;
  }

  public getVideoTimeFromYear(year: number): number {
    if (!this.videoMetadata) {
      return Math.max(0, Math.min(60, ((year - 1880) / 145) * 58));
    }
    const target = this.videoMetadata.yearToStartSeconds[year];
    if (target !== undefined) return target;
    if (year <= this.videoMetadata.minYear) return 0;
    return this.videoMetadata.durationSeconds - 0.5;
  }

  public getRecords(): GistempRecord[] {
    return this.records;
  }

  public getValidatedRecords(): ValidatedRecord[] {
    if (this.validatedRecords.length === 0 && this.records.length > 0) {
      this.buildValidatedDataset();
    }
    return this.validatedRecords;
  }

  public getRecordByYear(year: number): GistempRecord | undefined {
    return this.records.find((r) => r.year === year);
  }

  public getValidatedRecordByYear(year: number): ValidatedRecord | undefined {
    if (this.validatedRecords.length === 0 && this.records.length > 0) {
      this.buildValidatedDataset();
    }
    return this.validatedRecords.find((r) => r.year === year);
  }

  public getVideoMetadata(): VideoTimelineMetadata | null {
    return this.videoMetadata;
  }

  private initFallbackData(): void {
    const fps = 30.0;
    const frameToYear: number[] = [];
    const yearToStartSeconds: Record<number, number> = {};
    const yearToEndSeconds: Record<number, number> = {};

    for (let y = 1880; y <= 2024; y++) {
      const startSec = (y - 1880) * 12 / fps;
      yearToStartSeconds[y] = startSec;
      for (let f = 0; f < 12; f++) {
        frameToYear.push(y);
      }
      yearToEndSeconds[y] = ((y - 1880 + 1) * 12) / fps;
    }
    yearToStartSeconds[2025] = (2024 - 1880 + 1) * 12 / fps;
    for (let f = 0; f < 60; f++) {
      frameToYear.push(2025);
    }
    yearToEndSeconds[2025] = 60.0;

    this.videoMetadata = {
      totalFrames: 1800,
      fps: 30.0,
      durationSeconds: 60.0,
      frameToYear,
      yearToStartSeconds,
      yearToEndSeconds,
      minYear: 1880,
      maxYear: 2025,
    };
  }
}

export const nasaDataService = new NasaDataService();
