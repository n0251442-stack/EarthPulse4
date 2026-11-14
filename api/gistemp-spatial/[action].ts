import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';

type DatasetId = 'land-ocean' | 'land-only';

interface DatasetConfig {
  id: DatasetId;
  label: string;
  filename: string;
  sourceUrl: string;
}

const DATASETS: Record<DatasetId, DatasetConfig> = {
  'land-ocean': {
    id: 'land-ocean',
    label: 'Land + Ocean (GHCNv4 + ERSSTv5, 1200km)',
    filename: 'gistemp1200_GHCNv4_ERSSTv5.nc.gz',
    sourceUrl: 'https://data.giss.nasa.gov/pub/gistemp/gistemp1200_GHCNv4_ERSSTv5.nc.gz',
  },
  'land-only': {
    id: 'land-only',
    label: 'Land Only (GHCNv4, 250km)',
    filename: 'gistemp250_GHCNv4.nc.gz',
    sourceUrl: 'https://data.giss.nasa.gov/pub/gistemp/gistemp250_GHCNv4.nc.gz',
  },
};

interface NetCdfDimension {
  name: string;
  length: number;
}

type NetCdfAttrValue = string | number | number[];

interface NetCdfVariable {
  name: string;
  dimensions: NetCdfDimension[];
  attributes: Record<string, NetCdfAttrValue>;
  ncType: number;
  vsize: number;
  begin: number;
  isRecordVar: boolean;
}

interface AvailableMonthEntry {
  year: number;
  month: number;
  timeIndex: number;
  timeValue: number;
  dateIso: string;
}

interface ParsedNetCdfDataset {
  config: DatasetConfig;
  buffer: Buffer;
  numrecs: number;
  recordSize: number;
  dimensions: NetCdfDimension[];
  globalAttributes: Record<string, NetCdfAttrValue>;
  variables: Record<string, NetCdfVariable>;
  lat: number[];
  lon: number[];
  timeValues: number[];
  availableMonths: AvailableMonthEntry[];
  monthLookup: Map<string, number>;
  tempVar: NetCdfVariable;
  scaleFactor: number;
  addOffset: number;
  fillValue: number;
  units: string;
  longName: string;
  timeUnits: string;
  baseline: string;
  retrievedAt: string;
  dataOrigin: 'nasa-live' | 'local-cache';
}

interface SpatialSlicePayload {
  dataset: DatasetId;
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

const datasetCache = new Map<DatasetId, ParsedNetCdfDataset>();
const datasetLoadingPromises = new Map<DatasetId, Promise<ParsedNetCdfDataset>>();
const sliceCache = new Map<string, SpatialSlicePayload>();

function ncTypeSize(ncType: number): number {
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

function parseTimeUnitsEpoch(unitsStr: string): { baseMs: number; unitScaleMs: number } {
  const match = /^(\w+)\s+since\s+(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}):(\d{1,2}))?/i.exec(
    unitsStr.trim()
  );
  if (!match) {
    return { baseMs: Date.UTC(1800, 0, 1), unitScaleMs: 86400000 };
  }
  const unit = match[1].toLowerCase();
  const y = parseInt(match[2], 10);
  const m = parseInt(match[3], 10) - 1;
  const d = parseInt(match[4], 10);
  const hh = match[5] ? parseInt(match[5], 10) : 0;
  const mm = match[6] ? parseInt(match[6], 10) : 0;
  const ss = match[7] ? parseInt(match[7], 10) : 0;

  const baseMs = Date.UTC(y, m, d, hh, mm, ss);
  let unitScaleMs = 86400000;
  if (unit.startsWith('hour')) unitScaleMs = 3600000;
  else if (unit.startsWith('minute')) unitScaleMs = 60000;
  else if (unit.startsWith('second')) unitScaleMs = 1000;

  return { baseMs, unitScaleMs };
}

function readNumericAt(buf: Buffer, offset: number, ncType: number): number {
  switch (ncType) {
    case 1:
      return buf.readInt8(offset);
    case 3:
      return buf.readInt16BE(offset);
    case 4:
      return buf.readInt32BE(offset);
    case 5:
      return buf.readFloatBE(offset);
    case 6:
      return buf.readDoubleBE(offset);
    default:
      return NaN;
  }
}

function isGzipBuffer(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function parseNetCdf3(
  buf: Buffer,
  config: DatasetConfig,
  dataOrigin: 'nasa-live' | 'local-cache'
): ParsedNetCdfDataset {
  const magic = buf.subarray(0, 3).toString('latin1');
  const version = buf[3];
  if (magic !== 'CDF' || (version !== 1 && version !== 2)) {
    throw new Error(`Unsupported NetCDF format magic: ${magic} v${version}`);
  }
  const is64Offset = version === 2;

  let off = 4;
  const numrecs = buf.readUInt32BE(off);
  off += 4;

  const readString = (): string => {
    const len = buf.readUInt32BE(off);
    off += 4;
    const str = buf.subarray(off, off + len).toString('utf8');
    off += len + ((4 - (len % 4)) % 4);
    return str;
  };

  const readAttrValues = (ncType: number, count: number): NetCdfAttrValue => {
    const size = ncTypeSize(ncType);
    if (ncType === 2) {
      const str = buf.subarray(off, off + count).toString('utf8').replace(/\0+$/g, '');
      off += count + ((4 - (count % 4)) % 4);
      return str;
    }
    const vals: number[] = [];
    for (let i = 0; i < count; i++) {
      vals.push(readNumericAt(buf, off, ncType));
      off += size;
    }
    const byteLen = count * size;
    off += (4 - (byteLen % 4)) % 4;
    return vals.length === 1 ? vals[0] : vals;
  };

  const readAttrList = (): Record<string, NetCdfAttrValue> => {
    const tag = buf.readUInt32BE(off);
    off += 4;
    const count = buf.readUInt32BE(off);
    off += 4;
    const attrs: Record<string, NetCdfAttrValue> = {};
    if (tag === 0) return attrs;
    for (let i = 0; i < count; i++) {
      const name = readString();
      const ncType = buf.readUInt32BE(off);
      off += 4;
      const nelems = buf.readUInt32BE(off);
      off += 4;
      attrs[name] = readAttrValues(ncType, nelems);
    }
    return attrs;
  };

  const dimTag = buf.readUInt32BE(off);
  off += 4;
  const dimCount = buf.readUInt32BE(off);
  off += 4;
  const dimensions: NetCdfDimension[] = [];
  if (dimTag !== 0) {
    for (let i = 0; i < dimCount; i++) {
      const name = readString();
      const length = buf.readUInt32BE(off);
      off += 4;
      dimensions.push({ name, length });
    }
  }

  const globalAttributes = readAttrList();

  const varTag = buf.readUInt32BE(off);
  off += 4;
  const varCount = buf.readUInt32BE(off);
  off += 4;
  const variables: Record<string, NetCdfVariable> = {};
  let recordSize = 0;

  if (varTag !== 0) {
    for (let i = 0; i < varCount; i++) {
      const name = readString();
      const ndims = buf.readUInt32BE(off);
      off += 4;
      const varDims: NetCdfDimension[] = [];
      for (let d = 0; d < ndims; d++) {
        const dimId = buf.readUInt32BE(off);
        off += 4;
        varDims.push(dimensions[dimId]);
      }
      const attributes = readAttrList();
      const ncType = buf.readUInt32BE(off);
      off += 4;
      const vsize = buf.readUInt32BE(off);
      off += 4;
      let begin = 0;
      if (is64Offset) {
        begin = Number(buf.readBigUInt64BE(off));
        off += 8;
      } else {
        begin = buf.readUInt32BE(off);
        off += 4;
      }
      const isRecordVar = varDims.length > 0 && varDims[0].length === 0;
      if (isRecordVar) {
        recordSize += vsize;
      }
      variables[name] = {
        name,
        dimensions: varDims,
        attributes,
        ncType,
        vsize,
        begin,
        isRecordVar,
      };
    }
  }

  const read1DCoordinate = (varName: string): number[] => {
    const v = variables[varName];
    if (!v) throw new Error(`Missing NetCDF coordinate variable "${varName}"`);
    const count = v.dimensions[0].length === 0 ? numrecs : v.dimensions[0].length;
    const elemSize = ncTypeSize(v.ncType);
    const out: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const ptr = v.isRecordVar ? v.begin + i * recordSize : v.begin + i * elemSize;
      out[i] = readNumericAt(buf, ptr, v.ncType);
    }
    return out;
  };

  const lat = read1DCoordinate('lat');
  const lon = read1DCoordinate('lon');
  const timeValues = read1DCoordinate('time');

  const timeVar = variables['time'];
  const timeUnits =
    typeof timeVar?.attributes?.units === 'string'
      ? timeVar.attributes.units
      : 'days since 1800-01-01 00:00:00';
  const { baseMs, unitScaleMs } = parseTimeUnitsEpoch(timeUnits);

  const availableMonths: AvailableMonthEntry[] = [];
  const monthLookup = new Map<string, number>();

  for (let i = 0; i < timeValues.length; i++) {
    const dt = new Date(baseMs + timeValues[i] * unitScaleMs);
    const year = dt.getUTCFullYear();
    const month = dt.getUTCMonth() + 1;
    const dateIso = dt.toISOString().slice(0, 10);
    availableMonths.push({ year, month, timeIndex: i, timeValue: timeValues[i], dateIso });
    monthLookup.set(`${year}-${month}`, i);
  }

  const tempVar = variables['tempanomaly'];
  if (!tempVar) {
    throw new Error('Missing "tempanomaly" variable in NASA GISTEMP NetCDF file');
  }

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

  const historyStr =
    typeof globalAttributes.history === 'string' ? globalAttributes.history : '';
  const baseMatch = /Base:\s*([0-9]{4}-[0-9]{4})/i.exec(historyStr);
  const baseline = baseMatch ? baseMatch[1].replace('-', '–') : '1951–1980';

  return {
    config,
    buffer: buf,
    numrecs,
    recordSize,
    dimensions,
    globalAttributes,
    variables,
    lat,
    lon,
    timeValues,
    availableMonths,
    monthLookup,
    tempVar,
    scaleFactor,
    addOffset,
    fillValue,
    units,
    longName,
    timeUnits,
    baseline,
    retrievedAt: new Date().toISOString(),
    dataOrigin,
  };
}

async function fetchGzipBuffer(url: string, timeoutMs = 15000): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    return isGzipBuffer(buf) ? buf : null;
  } catch {
    return null;
  }
}

async function resolveAndLoadDataset(
  datasetId: DatasetId,
  forceRefresh = false,
  reqOrigin?: string
): Promise<ParsedNetCdfDataset> {
  if (!forceRefresh && datasetCache.has(datasetId)) {
    return datasetCache.get(datasetId)!;
  }
  if (!forceRefresh && datasetLoadingPromises.has(datasetId)) {
    return datasetLoadingPromises.get(datasetId)!;
  }

  const config = DATASETS[datasetId];
  const promise = (async () => {
    const tmpCachePath = path.join('/tmp', 'gistemp_cache', config.filename);
    const localCandidates = [
      tmpCachePath,
      path.join(process.cwd(), 'public', 'data', config.filename),
      path.join(process.cwd(), 'dist', 'data', config.filename),
    ];

    let gzBuffer: Buffer | null = null;
    let origin: 'nasa-live' | 'local-cache' = 'local-cache';

    if (!forceRefresh) {
      for (const filePath of localCandidates) {
        if (fs.existsSync(filePath)) {
          const buf = await fs.promises.readFile(filePath);
          if (isGzipBuffer(buf)) {
            gzBuffer = buf;
            break;
          }
        }
      }
    }

    // Try deployment's own static CDN (/data/*.nc.gz) when running in Serverless Lambda
    if (!gzBuffer && !forceRefresh && reqOrigin) {
      gzBuffer = await fetchGzipBuffer(`${reqOrigin}/data/${config.filename}`, 5000);
      origin = 'local-cache';
    }

    // Fetch live from NASA GISS (either requested refresh or fallback)
    if (!gzBuffer) {
      gzBuffer = await fetchGzipBuffer(config.sourceUrl, 8000);
      if (gzBuffer) {
        origin = 'nasa-live';
      } else if (forceRefresh && reqOrigin) {
        gzBuffer = await fetchGzipBuffer(`${reqOrigin}/data/${config.filename}`, 5000);
        origin = 'local-cache';
      }
    }

    // Last-resort check of local /tmp or repo files if forceRefresh remote timed out
    if (!gzBuffer) {
      for (const filePath of localCandidates) {
        if (fs.existsSync(filePath)) {
          const buf = await fs.promises.readFile(filePath);
          if (isGzipBuffer(buf)) {
            gzBuffer = buf;
            origin = 'local-cache';
            break;
          }
        }
      }
    }

    if (!gzBuffer) {
      throw new Error(`Unable to retrieve NASA GISTEMP NetCDF archive (${config.filename}).`);
    }

    // Persist in /tmp for subsequent warm invocations
    try {
      await fs.promises.mkdir(path.dirname(tmpCachePath), { recursive: true });
      await fs.promises.writeFile(tmpCachePath, gzBuffer);
    } catch {
      // Non-fatal in read-only environments
    }

    const rawBuffer = zlib.gunzipSync(gzBuffer);
    const parsed = parseNetCdf3(rawBuffer, config, origin);
    datasetCache.set(datasetId, parsed);

    if (forceRefresh) {
      for (const key of sliceCache.keys()) {
        if (key.startsWith(`${datasetId}:`)) {
          sliceCache.delete(key);
        }
      }
    }

    return parsed;
  })().finally(() => {
    datasetLoadingPromises.delete(datasetId);
  });

  datasetLoadingPromises.set(datasetId, promise);
  return promise;
}

function extractMonthlySlice(
  ds: ParsedNetCdfDataset,
  year: number,
  month: number
): SpatialSlicePayload | null {
  const timeIndex = ds.monthLookup.get(`${year}-${month}`);
  if (timeIndex === undefined) {
    return null;
  }

  const cacheKey = `${ds.config.id}:${year}:${month}`;
  const cached = sliceCache.get(cacheKey);
  if (cached) return cached;

  const latCount = ds.lat.length;
  const lonCount = ds.lon.length;
  const cellCount = latCount * lonCount;
  const elemSize = ncTypeSize(ds.tempVar.ncType);
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
      const bytePos = sliceStart + idx * elemSize;
      const rawVal = readNumericAt(ds.buffer, bytePos, ds.tempVar.ncType);

      if (!Number.isFinite(rawVal) || rawVal === ds.fillValue) {
        values[idx] = null;
        missingCells++;
      } else {
        const scaled = rawVal * ds.scaleFactor + ds.addOffset;
        const anomaly = Math.round(scaled * 100) / 100;
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
  const payload: SpatialSlicePayload = {
    dataset: ds.config.id,
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

  if (sliceCache.size >= 250) {
    const oldest = sliceCache.keys().next().value;
    if (oldest) sliceCache.delete(oldest);
  }
  sliceCache.set(cacheKey, payload);
  return payload;
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown, cacheControl?: string): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl);
  }
  res.end(JSON.stringify(data));
}

function parseDatasetId(raw: string | null | undefined): DatasetId {
  return raw === 'land-only' ? 'land-only' : 'land-ocean';
}

interface VercelLikeRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
}

export default async function handler(req: VercelLikeRequest, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const queryAction = typeof req.query?.action === 'string' ? req.query.action : undefined;
  const pathAction = parsedUrl.pathname.split('/').filter(Boolean).pop();
  const action = queryAction || pathAction;

  const getParam = (key: string): string | null => {
    const qVal = req.query?.[key];
    if (typeof qVal === 'string') return qVal;
    if (Array.isArray(qVal) && qVal.length > 0) return qVal[0];
    return parsedUrl.searchParams.get(key);
  };

  const protoHeader = req.headers['x-forwarded-proto'];
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'https';
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const reqOrigin = host ? `${proto}://${host}` : undefined;

  if (action === 'metadata') {
    try {
      const datasetId = parseDatasetId(getParam('dataset'));
      const refresh = getParam('refresh') === 'true';
      const ds = await resolveAndLoadDataset(datasetId, refresh, reqOrigin);

      const first = ds.availableMonths[0];
      const last = ds.availableMonths[ds.availableMonths.length - 1];

      sendJson(
        res,
        200,
        {
          dataset: ds.config.id,
          label: ds.config.label,
          filename: ds.config.filename,
          sourceUrl: ds.config.sourceUrl,
          dataOrigin: ds.dataOrigin,
          retrievedAt: ds.retrievedAt,
          baseline: ds.baseline,
          globalAttributes: ds.globalAttributes,
          dimensions: ds.dimensions,
          lat: ds.lat,
          lon: ds.lon,
          variable: {
            name: ds.tempVar.name,
            longName: ds.longName,
            units: ds.units,
            scaleFactor: ds.scaleFactor,
            addOffset: ds.addOffset,
            fillValue: ds.fillValue,
            cellMethods: ds.tempVar.attributes.cell_methods ?? 'time: mean',
          },
          timeUnits: ds.timeUnits,
          minYear: first.year,
          minMonth: first.month,
          maxYear: last.year,
          maxMonth: last.month,
          totalMonths: ds.availableMonths.length,
          availableMonths: ds.availableMonths,
        },
        refresh ? 'no-store' : 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse NASA NetCDF metadata';
      console.error('[Vercel NetCDF Metadata Error]', err);
      sendJson(res, 500, { error: msg });
    }
    return;
  }

  if (action === 'slice') {
    try {
      const datasetId = parseDatasetId(getParam('dataset'));
      const year = parseInt(getParam('year') ?? '', 10);
      const month = parseInt(getParam('month') ?? '', 10);

      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        sendJson(res, 400, {
          error: 'Valid year and month (1–12) query parameters are required.',
        });
        return;
      }

      const ds = await resolveAndLoadDataset(datasetId, false, reqOrigin);
      const slice = extractMonthlySlice(ds, year, month);
      if (!slice) {
        const last = ds.availableMonths[ds.availableMonths.length - 1];
        sendJson(res, 404, {
          error: `No observation exists for ${year}-${String(month).padStart(2, '0')} in ${ds.config.filename}. Dataset covers ${ds.availableMonths[0].year}-01 through ${last.year}-${String(last.month).padStart(2, '0')}.`,
        });
        return;
      }

      sendJson(
        res,
        200,
        slice,
        'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read NASA NetCDF spatial slice';
      console.error('[Vercel NetCDF Slice Error]', err);
      sendJson(res, 500, { error: msg });
    }
    return;
  }

  sendJson(res, 404, { error: `Unknown spatial API action: ${action ?? 'none'}` });
}
