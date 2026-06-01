import type { AirQualityData, AqiInfo } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const EPA_BASE = 'https://aqs.epa.gov/data/api';

// EPA AQS public test credentials — documented by EPA for unauthenticated access.
// Register a free personal key at aqs.epa.gov/data/api#signup for production use.
const EPA_EMAIL = 'test@aqs.epa.gov';
const EPA_KEY = 'test';

const STATE_CODE = '34'; // New Jersey
// Middlesex has limited EPA monitoring stations — fall back through nearby counties
const COUNTY_CODES = ['023', '039', '013']; // Middlesex, Union, Essex

// AQS parameter codes
const PARAM_PM25 = '88101'; // PM2.5 (FRM/FEM, Local Conditions)
const PARAM_PM10 = '81102'; // PM10 (Local Conditions)
const PARAM_OZONE = '44201'; // Ozone (O3)

// EPA-published approximate national annual average AQI
const NATIONAL_AVG_AQI = 40;

// --- EPA AQS response types ---

interface EpaRecord {
  date_local?: string;
  parameter_code?: string;
  aqi?: number | null;
  arithmetic_mean?: number | null;
}

interface EpaResponse {
  Header?: Array<{ status?: string; error?: unknown; rows?: number }>;
  Data?: unknown[];
}

function isEpaResponse(v: unknown): v is EpaResponse {
  if (typeof v !== 'object' || v === null) return false;
  return true;
}

function toEpaRecord(v: unknown): EpaRecord | null {
  if (typeof v !== 'object' || v === null) return null;
  return v as EpaRecord;
}

// --- Helpers ---

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function aqiInfo(value: number): AqiInfo {
  if (value <= 50) return { value, category: 'Good', color: 'green' };
  if (value <= 100) return { value, category: 'Moderate', color: 'yellow' };
  if (value <= 150) return { value, category: 'Sensitive Groups', color: 'red' };
  if (value <= 200) return { value, category: 'Unhealthy', color: 'red' };
  return { value, category: 'Very Unhealthy', color: 'red' };
}

async function epaGet(path: string): Promise<EpaRecord[]> {
  const res = await fetch(`${EPA_BASE}${path}`);
  if (!res.ok) throw new Error(`EPA AQS API error: ${res.status} for ${path}`);
  const raw: unknown = await res.json();
  if (!isEpaResponse(raw) || !Array.isArray(raw.Data)) return [];
  // Surface API-level errors (rate limit, bad credentials) hidden in the Header
  const header = Array.isArray(raw.Header) ? (raw.Header[0] as Record<string, unknown> | undefined) : undefined;
  if (header?.['status'] === 'Failed') {
    throw new Error(`EPA AQS rejected request: ${String(header['error'] ?? 'unknown error')}`);
  }
  return raw.Data.map(toEpaRecord).filter((r): r is EpaRecord => r !== null);
}

/** Most recent value for a given param from a list of records, sorted newest-first */
function latestConcentration(records: EpaRecord[], param: string): number {
  const sorted = records
    .filter((r) => r.parameter_code === param && r.date_local)
    .sort((a, b) => (b.date_local ?? '').localeCompare(a.date_local ?? ''));
  const rec = sorted[0];
  if (!rec) return 0;
  return rec.arithmetic_mean ?? 0;
}

/** Highest AQI from the most recent date that has data */
function latestAqi(records: EpaRecord[]): number {
  const withAqi = records.filter((r) => r.date_local && typeof r.aqi === 'number');
  if (withAqi.length === 0) return 0;
  const sorted = [...withAqi].sort((a, b) =>
    (b.date_local ?? '').localeCompare(a.date_local ?? ''),
  );
  const mostRecentDate = sorted[0]!.date_local!;
  const sameDay = sorted.filter((r) => r.date_local === mostRecentDate);
  // AQI for a day = max across all pollutants (EPA standard)
  return Math.max(...sameDay.map((r) => (r.aqi as number) ?? 0));
}

/** Average AQI from the most recent date that has data across all NJ stations */
function njAverageAqi(records: EpaRecord[]): number {
  const withAqi = records.filter((r) => r.date_local && typeof r.aqi === 'number');
  if (withAqi.length === 0) return 0;
  const sorted = [...withAqi].sort((a, b) =>
    (b.date_local ?? '').localeCompare(a.date_local ?? ''),
  );
  const mostRecentDate = sorted[0]!.date_local!;
  const sameDay = sorted.filter((r) => r.date_local === mostRecentDate);
  const total = sameDay.reduce((sum, r) => sum + ((r.aqi as number) ?? 0), 0);
  return Math.round(total / sameDay.length);
}

// ---

async function fetchCountyData(
  county: string,
  bdate: string,
  edate: string,
): Promise<{ pm25: EpaRecord[]; pm10: EpaRecord[]; ozone: EpaRecord[] }> {
  const qs = `email=${EPA_EMAIL}&key=${EPA_KEY}&state=${STATE_CODE}&county=${county}&bdate=${bdate}&edate=${edate}`;
  const [pm25Result, pm10Result, ozoneResult] = await Promise.allSettled([
    epaGet(`/dailySummaryData/byCounty?${qs}&param=${PARAM_PM25}`),
    epaGet(`/dailySummaryData/byCounty?${qs}&param=${PARAM_PM10}`),
    epaGet(`/dailySummaryData/byCounty?${qs}&param=${PARAM_OZONE}`),
  ]);
  const resolve = (r: PromiseSettledResult<EpaRecord[]>): EpaRecord[] =>
    r.status === 'fulfilled' ? r.value : [];
  return { pm25: resolve(pm25Result), pm10: resolve(pm10Result), ozone: resolve(ozoneResult) };
}

async function fetchAirQualityData(): Promise<AirQualityData> {
  // EPA AQS data has a 6–12 month publishing lag; target 2023 data which is fully finalized
  const edate = fmtDate(new Date(Date.now() - 730 * 86_400_000));  // ~2 years ago
  const bdate = fmtDate(new Date(Date.now() - 1095 * 86_400_000)); // ~3 years ago

  const stateQs = `email=${EPA_EMAIL}&key=${EPA_KEY}&state=${STATE_CODE}&bdate=${bdate}&edate=${edate}`;

  // Try counties in order until one has monitoring data
  let pm25Records: EpaRecord[] = [];
  let pm10Records: EpaRecord[] = [];
  let ozoneRecords: EpaRecord[] = [];
  let usedCounty = COUNTY_CODES[0]!;

  for (const county of COUNTY_CODES) {
    const results = await fetchCountyData(county, bdate, edate);
    if (results.pm25.length > 0 || results.pm10.length > 0 || results.ozone.length > 0) {
      pm25Records = results.pm25;
      pm10Records = results.pm10;
      ozoneRecords = results.ozone;
      usedCounty = county;
      break;
    }
  }

  if (pm25Records.length === 0 && pm10Records.length === 0 && ozoneRecords.length === 0) {
    throw new Error('EPA AQS API returned no data for any NJ county');
  }

  const njResult = await epaGet(`/dailySummaryData/byState?${stateQs}&param=${PARAM_OZONE}`).catch(() => [] as EpaRecord[]);

  const allCountyRecords = [...pm25Records, ...pm10Records, ...ozoneRecords];
  const localAqi = latestAqi(allCountyRecords);
  const njAvgAqi = njAverageAqi(njResult) || NATIONAL_AVG_AQI;

  const countyLabel = usedCounty === '023' ? 'Middlesex County' : 'Essex County (nearest NJ station)';

  return {
    source: 'EPA Air Quality System (AQS)',
    sourceUrl: 'https://aqs.epa.gov',
    lastUpdated: new Date().toISOString(),
    aqi: aqiInfo(localAqi),
    pm25: Math.round(latestConcentration(pm25Records, PARAM_PM25) * 10) / 10,
    pm10: Math.round(latestConcentration(pm10Records, PARAM_PM10) * 10) / 10,
    ozone: Math.round(latestConcentration(ozoneRecords, PARAM_OZONE) * 1000) / 1000,
    vsNjAverage: njAvgAqi,
    vsNationalAverage: NATIONAL_AVG_AQI,
    dataNote: `${countyLabel}, NJ — daily summary data from EPA AQS monitoring stations`,
  };
}

export function getAirQuality(): Promise<AirQualityData> {
  return fetchWithCache<AirQualityData>('airquality', 'epa-aqs', fetchAirQualityData, 1);
}
