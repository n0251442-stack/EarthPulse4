/**
 * NASA GISTEMP v4 Spatial NetCDF Map Service
 *
 * Fetches and caches real NetCDF-3 gridded monthly temperature anomalies
 * parsed on the backend from official NASA GISS NetCDF archives:
 * - Land + Ocean: https://data.giss.nasa.gov/pub/gistemp/gistemp1200_GHCNv4_ERSSTv5.nc.gz
 * - Land Only:    https://data.giss.nasa.gov/pub/gistemp/gistemp250_GHCNv4.nc.gz
 *
 * Completely independent from annual CSV sonification logic.
 */

export type SpatialDatasetId = 'land-ocean' | 'land-only';

export interface SpatialAvailableMonth {
  year: number;
  month: number;
  timeIndex: number;
  timeValue: number;
  dateIso: string;
}

export interface SpatialDatasetMetadata {
  dataset: SpatialDatasetId;
  label: string;
  filename: string;
  sourceUrl: string;
  dataOrigin: 'nasa-live' | 'local-cache';
  retrievedAt: string;
  baseline: string;
  globalAttributes: Record<string, string | number | number[]>;
  dimensions: { name: string; length: number }[];
  lat: number[];
  lon: number[];
  variable: {
    name: string;
    longName: string;
    units: string;
    scaleFactor: number;
    addOffset: number;
    fillValue: number;
    cellMethods: string;
  };
  timeUnits: string;
  minYear: number;
  minMonth: number;
  maxYear: number;
  maxMonth: number;
  totalMonths: number;
  availableMonths: SpatialAvailableMonth[];
}

export interface SpatialMonthSlice {
  dataset: SpatialDatasetId;
  year: number;
  month: number;
  timeIndex: number;
  dateIso: string;
  latCount: number;
  lonCount: number;
  units: string;
  fillValue: number;
  validCells: number;
  missingCells: number;
  minAnomaly: number | null;
  maxAnomaly: number | null;
  areaWeightedMean: number | null;
  values: (number | null)[];
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface ColorStop {
  val: number;
  rgb: [number, number, number];
}

// Diverging RdBu scientific temperature anomaly scale (°C relative to 1951-1980)
const ANOMALY_COLOR_STOPS: ColorStop[] = [
  { val: -4.0, rgb: [5, 48, 97] },
  { val: -2.5, rgb: [33, 102, 172] },
  { val: -1.2, rgb: [67, 147, 195] },
  { val: -0.4, rgb: [146, 197, 222] },
  { val: 0.0, rgb: [241, 245, 249] },
  { val: 0.4, rgb: [253, 219, 199] },
  { val: 1.2, rgb: [244, 165, 130] },
  { val: 2.5, rgb: [214, 96, 77] },
  { val: 4.0, rgb: [178, 24, 43] },
  { val: 6.0, rgb: [103, 0, 31] },
];

export function anomalyToRgb(value: number | null): [number, number, number] | null {
  if (value === null || !Number.isFinite(value)) return null;

  if (value <= ANOMALY_COLOR_STOPS[0].val) {
    return ANOMALY_COLOR_STOPS[0].rgb;
  }
  const last = ANOMALY_COLOR_STOPS[ANOMALY_COLOR_STOPS.length - 1];
  if (value >= last.val) {
    return last.rgb;
  }

  for (let i = 0; i < ANOMALY_COLOR_STOPS.length - 1; i++) {
    const a = ANOMALY_COLOR_STOPS[i];
    const b = ANOMALY_COLOR_STOPS[i + 1];
    if (value >= a.val && value <= b.val) {
      const t = (value - a.val) / (b.val - a.val);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t),
      ];
    }
  }
  return last.rgb;
}

export function anomalyToCssColor(value: number | null): string {
  const rgb = anomalyToRgb(value);
  if (!rgb) return 'transparent';
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function formatLatLon(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

interface BrowserNetCdfDim {
  name: string;
  length: number;
}

interface BrowserNetCdfVar {
  name: string;
  dimensions: BrowserNetCdfDim[];
  attributes: Record<string, string | number | number[]>;
  ncType: number;
  vsize: number;
  begin: number;
  isRecordVar: boolean;
}

interface BrowserParsedDataset {
  view: DataView;
  bytes: Uint8Array;
  numrecs: number;
  recordSize: number;
  lat: number[];
  lon: number[];
  availableMonths: SpatialAvailableMonth[];
  monthLookup: Map<string, number>;
  tempVar: BrowserNetCdfVar;
  scaleFactor: number;
  addOffset: number;
  fillValue: number;
  units: string;
  metadata: SpatialDatasetMetadata;
}

const DATASET_META: Record<
  SpatialDatasetId,
  { label: string; filename: string; staticPath: string; sourceUrl: string }
> = {
  'land-ocean': {
    label: 'Land + Ocean (GHCNv4 + ERSSTv5, 1200km)',
    filename: 'gistemp1200_GHCNv4_ERSSTv5.nc.gz',
    staticPath: '/data/gistemp1200_GHCNv4_ERSSTv5.nc.gz',
    sourceUrl: 'https://data.giss.nasa.gov/pub/gistemp/gistemp1200_GHCNv4_ERSSTv5.nc.gz',
  },
  'land-only': {
    label: 'Land Only (GHCNv4, 250km)',
    filename: 'gistemp250_GHCNv4.nc.gz',
    staticPath: '/data/gistemp250_GHCNv4.nc.gz',
    sourceUrl: 'https://data.giss.nasa.gov/pub/gistemp/gistemp250_GHCNv4.nc.gz',
  },
};

function ncTypeSizeClient(ncType: number): number {
  switch (ncType) {
    case 1:
    case 2:
      return 1;
    case 3:
      return 2;
    case 4:
    case 5:
      return 4;
    case 6:
      return 8;
    default:
      return 0;
  }
}

function readNumericClient(view: DataView, offset: number, ncType: number): number {
  switch (ncType) {
    case 1:
      return view.getInt8(offset);
    case 3:
      return view.getInt16(offset, false);
    case 4:
      return view.getInt32(offset, false);
    case 5:
      return view.getFloat32(offset, false);
    case 6:
      return view.getFloat64(offset, false);
    default:
      return NaN;
  }
}

function parseTimeUnitsClient(unitsStr: string): { baseMs: number; unitScaleMs: number } {
  const match =
    /^(\w+)\s+since\s+(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}):(\d{1,2}))?/i.exec(
      unitsStr.trim()
    );
  if (!match) return { baseMs: Date.UTC(1800, 0, 1), unitScaleMs: 86400000 };
  const unit = match[1].toLowerCase();
  const baseMs = Date.UTC(
    parseInt(match[2], 10),
    parseInt(match[3], 10) - 1,
    parseInt(match[4], 10),
    match[5] ? parseInt(match[5], 10) : 0,
    match[6] ? parseInt(match[6], 10) : 0,
    match[7] ? parseInt(match[7], 10) : 0
  );
  let unitScaleMs = 86400000;
  if (unit.startsWith('hour')) unitScaleMs = 3600000;
  else if (unit.startsWith('minute')) unitScaleMs = 60000;
  else if (unit.startsWith('second')) unitScaleMs = 1000;
  return { baseMs, unitScaleMs };
}

function parseNetCdf3Browser(
  buffer: ArrayBuffer,
  datasetId: SpatialDatasetId
): BrowserParsedDataset {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');

  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  const version = bytes[3];
  if (magic !== 'CDF' || (version !== 1 && version !== 2)) {
    throw new Error(`Unsupported NetCDF format: ${magic} v${version}`);
  }
  const is64Offset = version === 2;

  let off = 4;
  const numrecs = view.getUint32(off, false);
  off += 4;

  const readString = (): string => {
    const len = view.getUint32(off, false);
    off += 4;
    const str = decoder.decode(bytes.subarray(off, off + len));
    off += len + ((4 - (len % 4)) % 4);
    return str;
  };

  const readAttrValues = (ncType: number, count: number): string | number | number[] => {
    const size = ncTypeSizeClient(ncType);
    if (ncType === 2) {
      const str = decoder.decode(bytes.subarray(off, off + count)).replace(/\0+$/g, '');
      off += count + ((4 - (count % 4)) % 4);
      return str;
    }
    const vals: number[] = [];
    for (let i = 0; i < count; i++) {
      vals.push(readNumericClient(view, off, ncType));
      off += size;
    }
    const byteLen = count * size;
    off += (4 - (byteLen % 4)) % 4;
    return vals.length === 1 ? vals[0] : vals;
  };

  const readAttrList = (): Record<string, string | number | number[]> => {
    const tag = view.getUint32(off, false);
    off += 4;
    const count = view.getUint32(off, false);
    off += 4;
    const attrs: Record<string, string | number | number[]> = {};
    if (tag === 0) return attrs;
    for (let i = 0; i < count; i++) {
      const name = readString();
      const ncType = view.getUint32(off, false);
      off += 4;
      const nelems = view.getUint32(off, false);
      off += 4;
      attrs[name] = readAttrValues(ncType, nelems);
    }
    return attrs;
  };

  const dimTag = view.getUint32(off, false);
  off += 4;
  const dimCount = view.getUint32(off, false);
  off += 4;
  const dimensions: BrowserNetCdfDim[] = [];
  if (dimTag !== 0) {
    for (let i = 0; i < dimCount; i++) {
      const name = readString();
      const length = view.getUint32(off, false);
      off += 4;
      dimensions.push({ name, length });
    }
  }

  const globalAttributes = readAttrList();

  const varTag = view.getUint32(off, false);
  off += 4;
  const varCount = view.getUint32(off, false);
  off += 4;
  const variables: Record<string, BrowserNetCdfVar> = {};
  let recordSize = 0;

  if (varTag !== 0) {
    for (let i = 0; i < varCount; i++) {
      const name = readString();
      const ndims = view.getUint32(off, false);
      off += 4;
      const varDims: BrowserNetCdfDim[] = [];
      for (let d = 0; d < ndims; d++) {
        const dimId = view.getUint32(off, false);
        off += 4;
        varDims.push(dimensions[dimId]);
      }
      const attributes = readAttrList();
      const ncType = view.getUint32(off, false);
      off += 4;
      const vsize = view.getUint32(off, false);
      off += 4;
      let begin = 0;
      if (is64Offset) {
        begin = Number(view.getBigUint64(off, false));
        off += 8;
      } else {
        begin = view.getUint32(off, false);
        off += 4;
      }
      const isRecordVar = varDims.length > 0 && varDims[0].length === 0;
      if (isRecordVar) recordSize += vsize;
      variables[name] = { name, dimensions: varDims, attributes, ncType, vsize, begin, isRecordVar };
    }
  }

  const read1D = (varName: string): number[] => {
    const v = variables[varName];
    if (!v) throw new Error(`Missing NetCDF coordinate "${varName}"`);
    const count = v.dimensions[0].length === 0 ? numrecs : v.dimensions[0].length;
    const elemSize = ncTypeSizeClient(v.ncType);
    const out: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const ptr = v.isRecordVar ? v.begin + i * recordSize : v.begin + i * elemSize;
      out[i] = readNumericClient(view, ptr, v.ncType);
    }
    return out;
  };

  const lat = read1D('lat');
  const lon = read1D('lon');
  const timeValues = read1D('time');

  const timeVar = variables['time'];
  const timeUnits =
    typeof timeVar?.attributes?.units === 'string'
      ? timeVar.attributes.units
      : 'days since 1800-01-01 00:00:00';
  const { baseMs, unitScaleMs } = parseTimeUnitsClient(timeUnits);

  const availableMonths: SpatialAvailableMonth[] = [];
  const monthLookup = new Map<string, number>();
  for (let i = 0; i < timeValues.length; i++) {
    const dt = new Date(baseMs + timeValues[i] * unitScaleMs);
    const year = dt.getUTCFullYear();
    const month = dt.getUTCMonth() + 1;
    availableMonths.push({
      year,
      month,
      timeIndex: i,
      timeValue: timeValues[i],
      dateIso: dt.toISOString().slice(0, 10),
    });
    monthLookup.set(`${year}-${month}`, i);
  }

  const tempVar = variables['tempanomaly'];
  if (!tempVar) throw new Error('Missing "tempanomaly" variable in NetCDF file');

  const rawScale = tempVar.attributes.scale_factor;
  const scaleFactor =
    typeof rawScale === 'number' && Number.isFinite(rawScale)
      ? Math.round(rawScale * 1e6) / 1e6
      : 1;
  const rawOffset = tempVar.attributes.add_offset;
  const addOffset = typeof rawOffset === 'number' && Number.isFinite(rawOffset) ? rawOffset : 0;
  const rawFill = tempVar.attributes._FillValue ?? tempVar.attributes.missing_value;
  const fillValue = typeof rawFill === 'number' && Number.isFinite(rawFill) ? rawFill : 32767;
  const units = typeof tempVar.attributes.units === 'string' ? tempVar.attributes.units : 'K';
  const longName =
    typeof tempVar.attributes.long_name === 'string'
      ? tempVar.attributes.long_name
      : 'Surface temperature anomaly';

  const historyStr = typeof globalAttributes.history === 'string' ? globalAttributes.history : '';
  const baseMatch = /Base:\s*([0-9]{4}-[0-9]{4})/i.exec(historyStr);
  const baseline = baseMatch ? baseMatch[1].replace('-', '–') : '1951–1980';

  const cfg = DATASET_META[datasetId];
  const first = availableMonths[0];
  const last = availableMonths[availableMonths.length - 1];

  const metadata: SpatialDatasetMetadata = {
    dataset: datasetId,
    label: cfg.label,
    filename: cfg.filename,
    sourceUrl: cfg.sourceUrl,
    dataOrigin: 'local-cache',
    retrievedAt: new Date().toISOString(),
    baseline,
    globalAttributes,
    dimensions,
    lat,
    lon,
    variable: {
      name: tempVar.name,
      longName,
      units,
      scaleFactor,
      addOffset,
      fillValue,
      cellMethods: String(tempVar.attributes.cell_methods ?? 'time: mean'),
    },
    timeUnits,
    minYear: first.year,
    minMonth: first.month,
    maxYear: last.year,
    maxMonth: last.month,
    totalMonths: availableMonths.length,
    availableMonths,
  };

  return {
    view,
    bytes,
    numrecs,
    recordSize,
    lat,
    lon,
    availableMonths,
    monthLookup,
    tempVar,
    scaleFactor,
    addOffset,
    fillValue,
    units,
    metadata,
  };
}

class NasaSpatialMapService {
  private metadataCache = new Map<SpatialDatasetId, SpatialDatasetMetadata>();
  private metadataInFlight = new Map<SpatialDatasetId, Promise<SpatialDatasetMetadata>>();
  private sliceCache = new Map<string, SpatialMonthSlice>();
  private sliceInFlight = new Map<string, Promise<SpatialMonthSlice>>();
  private browserDatasets = new Map<SpatialDatasetId, BrowserParsedDataset>();
  private browserLoading = new Map<SpatialDatasetId, Promise<BrowserParsedDataset>>();

  private async ensureBrowserDataset(
    dataset: SpatialDatasetId,
    forceRefresh = false
  ): Promise<BrowserParsedDataset> {
    if (!forceRefresh && this.browserDatasets.has(dataset)) {
      return this.browserDatasets.get(dataset)!;
    }
    if (!forceRefresh && this.browserLoading.has(dataset)) {
      return this.browserLoading.get(dataset)!;
    }

    const req = (async () => {
      const cfg = DATASET_META[dataset];
      const res = await fetch(cfg.staticPath);
      if (!res.ok || !res.body) {
        throw new Error(`Unable to fetch NASA NetCDF archive (${cfg.staticPath})`);
      }

      let rawBuffer: ArrayBuffer;
      if (typeof DecompressionStream !== 'undefined') {
        const decompressedStream = res.body.pipeThrough(new DecompressionStream('gzip'));
        rawBuffer = await new Response(decompressedStream).arrayBuffer();
      } else {
        throw new Error('Browser DecompressionStream is unavailable.');
      }

      const parsed = parseNetCdf3Browser(rawBuffer, dataset);
      this.browserDatasets.set(dataset, parsed);
      return parsed;
    })().finally(() => {
      this.browserLoading.delete(dataset);
    });

    this.browserLoading.set(dataset, req);
    return req;
  }

  private extractSliceFromBrowser(
    ds: BrowserParsedDataset,
    dataset: SpatialDatasetId,
    year: number,
    month: number
  ): SpatialMonthSlice {
    const timeIndex = ds.monthLookup.get(`${year}-${month}`);
    if (timeIndex === undefined) {
      throw new Error(`No observation exists for ${year}-${String(month).padStart(2, '0')}`);
    }

    const latCount = ds.lat.length;
    const lonCount = ds.lon.length;
    const cellCount = latCount * lonCount;
    const elemSize = ncTypeSizeClient(ds.tempVar.ncType);
    const sliceBytes = cellCount * elemSize;
    const sliceStart = ds.tempVar.isRecordVar
      ? ds.tempVar.begin + timeIndex * ds.recordSize
      : ds.tempVar.begin + timeIndex * sliceBytes;

    const values: (number | null)[] = new Array(cellCount);
    let validCells = 0;
    let missingCells = 0;
    let minAnomaly: number | null = null;
    let maxAnomaly: number | null = null;
    let weightedSum = 0;
    let weightTotal = 0;

    for (let latIdx = 0; latIdx < latCount; latIdx++) {
      const latWeight = Math.max(0, Math.cos((ds.lat[latIdx] * Math.PI) / 180));
      const rowOffset = latIdx * lonCount;

      for (let lonIdx = 0; lonIdx < lonCount; lonIdx++) {
        const idx = rowOffset + lonIdx;
        const rawVal = readNumericClient(ds.view, sliceStart + idx * elemSize, ds.tempVar.ncType);

        if (!Number.isFinite(rawVal) || rawVal === ds.fillValue) {
          values[idx] = null;
          missingCells++;
        } else {
          const anomaly = Math.round((rawVal * ds.scaleFactor + ds.addOffset) * 100) / 100;
          values[idx] = anomaly;
          validCells++;
          if (minAnomaly === null || anomaly < minAnomaly) minAnomaly = anomaly;
          if (maxAnomaly === null || anomaly > maxAnomaly) maxAnomaly = anomaly;
          weightedSum += anomaly * latWeight;
          weightTotal += latWeight;
        }
      }
    }

    const monthMeta = ds.availableMonths[timeIndex];
    return {
      dataset,
      year,
      month,
      timeIndex,
      dateIso: monthMeta.dateIso,
      latCount,
      lonCount,
      units: ds.units,
      fillValue: ds.fillValue,
      validCells,
      missingCells,
      minAnomaly,
      maxAnomaly,
      areaWeightedMean:
        weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : null,
      values,
    };
  }

  public async getMetadata(
    dataset: SpatialDatasetId,
    forceRefresh = false
  ): Promise<SpatialDatasetMetadata> {
    if (!forceRefresh && this.metadataCache.has(dataset)) {
      return this.metadataCache.get(dataset)!;
    }
    if (!forceRefresh && this.metadataInFlight.has(dataset)) {
      return this.metadataInFlight.get(dataset)!;
    }

    const req = (async () => {
      try {
        const url = `/api/gistemp-spatial/metadata?dataset=${encodeURIComponent(dataset)}${
          forceRefresh ? '&refresh=true' : ''
        }`;
        const res = await fetch(url);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const meta: SpatialDatasetMetadata = await res.json();
          this.metadataCache.set(dataset, meta);
          return meta;
        }
      } catch {
        // Fall back to direct CDN NetCDF parsing below
      }

      const browserDs = await this.ensureBrowserDataset(dataset, forceRefresh);
      this.metadataCache.set(dataset, browserDs.metadata);
      return browserDs.metadata;
    })().finally(() => {
      this.metadataInFlight.delete(dataset);
    });

    this.metadataInFlight.set(dataset, req);
    return req;
  }

  public async getMonthlySlice(
    dataset: SpatialDatasetId,
    year: number,
    month: number
  ): Promise<SpatialMonthSlice> {
    const key = `${dataset}:${year}:${month}`;
    if (this.sliceCache.has(key)) {
      return this.sliceCache.get(key)!;
    }
    if (this.sliceInFlight.has(key)) {
      return this.sliceInFlight.get(key)!;
    }

    const req = (async () => {
      let slice: SpatialMonthSlice | null = null;

      if (!this.browserDatasets.has(dataset)) {
        try {
          const url = `/api/gistemp-spatial/slice?dataset=${encodeURIComponent(
            dataset
          )}&year=${year}&month=${month}`;
          const res = await fetch(url);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            slice = await res.json();
          }
        } catch {
          // Fall back to client-side NetCDF slice extraction
        }
      }

      if (!slice) {
        const browserDs = await this.ensureBrowserDataset(dataset);
        slice = this.extractSliceFromBrowser(browserDs, dataset, year, month);
      }

      // Bound client slice cache to 120 months (~6 MB max)
      if (this.sliceCache.size >= 120) {
        const oldestKey = this.sliceCache.keys().next().value;
        if (oldestKey) this.sliceCache.delete(oldestKey);
      }
      this.sliceCache.set(key, slice);
      return slice;
    })().finally(() => {
      this.sliceInFlight.delete(key);
    });

    this.sliceInFlight.set(key, req);
    return req;
  }

  public prefetchSlice(dataset: SpatialDatasetId, year: number, month: number): void {
    const key = `${dataset}:${year}:${month}`;
    if (this.sliceCache.has(key) || this.sliceInFlight.has(key)) return;
    this.getMonthlySlice(dataset, year, month).catch(() => {});
  }

  public clearSlicesForDataset(dataset: SpatialDatasetId): void {
    for (const key of this.sliceCache.keys()) {
      if (key.startsWith(`${dataset}:`)) {
        this.sliceCache.delete(key);
      }
    }
  }
}

export const nasaSpatialMapService = new NasaSpatialMapService();
