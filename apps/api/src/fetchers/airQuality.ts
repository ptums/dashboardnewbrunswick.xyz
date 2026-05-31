import type { AirQualityData, AqiInfo } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const EPA_BASE = 'https://aqs.epa.gov/data/api';

// EPA AQS public test credentials — documented by EPA for unauthenticated access.
// Register a free personal key at aqs.epa.gov/data/api#signup for production use.
const EPA_EMAIL = 'test@aqs.epa.gov';
const EPA_KEY = 'test';

const STATE_CODE = '34'; // New Jersey
const COUNTY_CODE = '023'; // Middlesex County

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
  Header?: Array<{ status?: string; rows?: number }>;
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

async function fetchAirQualityData(): Promise<AirQualityData> {
  const edate = fmtDate(new Date(Date.now() - 86_400_000)); // yesterday
  const bdate = fmtDate(new Date(Date.now() - 60 * 86_400_000)); // 60 days ago

  const countyQs = `email=${EPA_EMAIL}&key=${EPA_KEY}&state=${STATE_CODE}&county=${COUNTY_CODE}&bdate=${bdate}&edate=${edate}`;
  const stateQs = `email=${EPA_EMAIL}&key=${EPA_KEY}&state=${STATE_CODE}&bdate=${bdate}&edate=${edate}`;

  const [pm25Result, pm10Result, ozoneResult, njResult] = await Promise.allSettled([
    epaGet(`/dailySummaryData/byCounty?${countyQs}&param=${PARAM_PM25}`),
    epaGet(`/dailySummaryData/byCounty?${countyQs}&param=${PARAM_PM10}`),
    epaGet(`/dailySummaryData/byCounty?${countyQs}&param=${PARAM_OZONE}`),
    epaGet(`/dailySummaryData/byState?${stateQs}&param=${PARAM_OZONE}`),
  ]);

  const resolve = (r: PromiseSettledResult<EpaRecord[]>): EpaRecord[] =>
    r.status === 'fulfilled' ? r.value : [];

  const pm25Records = resolve(pm25Result);
  const pm10Records = resolve(pm10Result);
  const ozoneRecords = resolve(ozoneResult);
  const njRecords = resolve(njResult);

  // Require at least some data — throw to trigger fetchWithCache fallback if all are empty
  if (pm25Records.length === 0 && pm10Records.length === 0 && ozoneRecords.length === 0) {
    throw new Error('EPA AQS API returned no Middlesex County data');
  }

  const allCountyRecords = [...pm25Records, ...pm10Records, ...ozoneRecords];
  const localAqi = latestAqi(allCountyRecords);
  const njAvgAqi = njAverageAqi(njRecords) || NATIONAL_AVG_AQI; // fallback to national if NJ data empty

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
    dataNote: 'Middlesex County, NJ — daily summary data from EPA AQS monitoring stations',
  };
}

export function getAirQuality(): Promise<AirQualityData> {
  return fetchWithCache<AirQualityData>('airquality', 'epa-aqs', fetchAirQualityData, 1);
}
