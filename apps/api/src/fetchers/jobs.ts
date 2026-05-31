import type { JobsData, UnemploymentDataPoint } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const BLS_BASE = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

// BLS series identifiers
const SERIES_NB_UNEMPLOYMENT = 'LAUMT343672000000003'; // New Brunswick–Lakewood MSA unemployment rate
const SERIES_NJ_UNEMPLOYMENT = 'LASST340000000000003'; // NJ statewide unemployment rate
const SERIES_NATIONAL_UNEMPLOYMENT = 'LNS14000000'; // US national unemployment rate (seasonally adjusted)
const SERIES_NORTHEAST_CPI = 'CUURA101SA0'; // Northeast urban CPI, all items
const SERIES_NATIONAL_CPI = 'CUUR0000SA0'; // US city average CPI, all items

// --- BLS response types ---

interface BlsDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: unknown[];
}

interface BlsSeries {
  seriesID: string;
  data: BlsDataPoint[];
}

interface BlsApiResponse {
  status: string;
  Results?: {
    series: BlsSeries[];
  };
}

function isBlsDataPoint(v: unknown): v is BlsDataPoint {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r['year'] === 'string' &&
    typeof r['period'] === 'string' &&
    typeof r['periodName'] === 'string' &&
    typeof r['value'] === 'string'
  );
}

function isBlsSeries(v: unknown): v is BlsSeries {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r['seriesID'] === 'string' && Array.isArray(r['data']);
}

function isBlsApiResponse(v: unknown): v is BlsApiResponse {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r['status'] === 'string';
}

async function blsPost(seriesIds: string[], apiKey: string): Promise<BlsSeries[]> {
  const currentYear = new Date().getFullYear();

  const response = await fetch(BLS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(currentYear - 2),
      endyear: String(currentYear),
      registrationkey: apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`BLS API error: ${response.status} ${response.statusText}`);
  }

  const raw: unknown = await response.json();

  if (!isBlsApiResponse(raw)) {
    throw new Error('BLS API returned unexpected response format');
  }

  if (raw.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS API request failed with status: ${raw.status}`);
  }

  if (!raw.Results?.series) return [];

  return raw.Results.series.filter(isBlsSeries);
}

/** Monthly data points only (excludes M13 annual), BLS data arrives newest-first */
function monthlyPoints(series: BlsSeries): BlsDataPoint[] {
  return series.data.filter(
    (d): d is BlsDataPoint => isBlsDataPoint(d) && d.period !== 'M13',
  );
}

function latestValue(series: BlsSeries): number {
  const pts = monthlyPoints(series);
  if (pts.length === 0) return 0;
  return parseFloat(pts[0]!.value) || 0;
}

// --- Internal cached shapes (never exported to shared) ---

type CachedUnemployment = {
  currentRate: number;
  njRate: number;
  nationalRate: number;
  trend: UnemploymentDataPoint[];
};

type CachedCpi = {
  northeastIndex: number;
  nationalIndex: number;
};

// --- Fetchers ---

async function fetchUnemploymentData(): Promise<CachedUnemployment> {
  const apiKey = process.env['BLS_API_KEY'];
  if (!apiKey) throw new Error('BLS_API_KEY is not set');

  const seriesList = await blsPost(
    [SERIES_NB_UNEMPLOYMENT, SERIES_NJ_UNEMPLOYMENT, SERIES_NATIONAL_UNEMPLOYMENT],
    apiKey,
  );

  const nbSeries = seriesList.find((s) => s.seriesID === SERIES_NB_UNEMPLOYMENT);
  const njSeries = seriesList.find((s) => s.seriesID === SERIES_NJ_UNEMPLOYMENT);
  const natSeries = seriesList.find((s) => s.seriesID === SERIES_NATIONAL_UNEMPLOYMENT);

  if (!nbSeries) throw new Error('BLS did not return New Brunswick unemployment series');

  // Build trend: most-recent 12 months in chronological order
  const pts = monthlyPoints(nbSeries).slice(0, 12);
  const trend: UnemploymentDataPoint[] = pts
    .map((p) => ({
      year: parseInt(p.year, 10),
      month: p.periodName,
      value: parseFloat(p.value) || 0,
    }))
    .reverse();

  return {
    currentRate: latestValue(nbSeries),
    njRate: njSeries ? latestValue(njSeries) : 0,
    nationalRate: natSeries ? latestValue(natSeries) : 0,
    trend,
  };
}

async function fetchCpiData(): Promise<CachedCpi> {
  const apiKey = process.env['BLS_API_KEY'];
  if (!apiKey) throw new Error('BLS_API_KEY is not set');

  const seriesList = await blsPost([SERIES_NORTHEAST_CPI, SERIES_NATIONAL_CPI], apiKey);

  const neSeries = seriesList.find((s) => s.seriesID === SERIES_NORTHEAST_CPI);
  const natSeries = seriesList.find((s) => s.seriesID === SERIES_NATIONAL_CPI);

  if (!neSeries || !natSeries) {
    throw new Error('BLS did not return CPI series data');
  }

  return {
    northeastIndex: latestValue(neSeries),
    nationalIndex: latestValue(natSeries),
  };
}

// --- Public export ---

export async function getJobs(): Promise<JobsData> {
  const [unemployment, cpi] = await Promise.all([
    fetchWithCache<CachedUnemployment>('jobs', 'bls-unemployment', fetchUnemploymentData, 7),
    fetchWithCache<CachedCpi>('jobs', 'bls-cpi', fetchCpiData, 30),
  ]);

  const costOfLivingIndex =
    cpi.nationalIndex > 0
      ? Math.round((cpi.northeastIndex / cpi.nationalIndex) * 100 * 10) / 10
      : 100;

  return {
    source: 'U.S. Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov',
    lastUpdated: new Date().toISOString(),
    unemploymentRate: {
      current: unemployment.currentRate,
      njAverage: unemployment.njRate,
      national: unemployment.nationalRate,
    },
    unemploymentTrend: unemployment.trend,
    costOfLivingIndex,
    dataNote: 'Local Area Unemployment Statistics + Consumer Price Index (Northeast region)',
  };
}
