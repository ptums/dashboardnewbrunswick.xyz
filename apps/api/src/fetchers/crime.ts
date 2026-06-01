import type { CrimeData } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const FBI_BASE = 'https://api.usa.gov/crime/fbi/cde';
// New Brunswick Police Department ORI — NJ011 = Middlesex County in FBI coding, 1600 = NB PD
// Fallback chain: NB PD → Middlesex County Sheriff → any Middlesex agency with data
const ORI_CANDIDATES = ['NJ0111600', 'NJ0111400', 'NJ0110100', 'NJ0180000'];
// Try most-recent years first; FBI data typically lags 1-2 years
const YEARS_TO_TRY = [2023, 2022, 2021, 2020];

interface FbiOffenseRecord {
  year: number;
  actual_count: number;
  cleared_count: number;
  population: number;
  ori?: string;
  state_abbr?: string;
}

function isOffenseRecord(v: unknown): v is FbiOffenseRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r['actual_count'] === 'number' &&
    typeof r['population'] === 'number' &&
    typeof r['year'] === 'number'
  );
}

function parseFbiResponse(raw: unknown): FbiOffenseRecord | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const first: unknown = raw[0];
  return isOffenseRecord(first) ? first : null;
}

/** Crimes per 100,000 people, rounded to one decimal place */
function ratePerHundredK(count: number, population: number): number {
  if (population <= 0) return 0;
  return Math.round((count / population) * 100000 * 10) / 10;
}

async function fbiGet(path: string, apiKey: string): Promise<unknown> {
  const url = `${FBI_BASE}${path}?api_key=${apiKey}`;
  const res = await fetch(url);
  // 404/503 = no UCR data for this ORI/year — treat as empty so the candidate loop continues
  if (res.status === 404 || res.status === 503) return [];
  if (!res.ok) throw new Error(`FBI API error ${res.status} for ${path}`);
  return res.json() as Promise<unknown>;
}

async function fetchCrimeData(): Promise<CrimeData> {
  const apiKey = process.env['FBI_API_KEY'];
  if (!apiKey) throw new Error('FBI_API_KEY is not set');

  let year = YEARS_TO_TRY[0]!;
  let localViolent: FbiOffenseRecord | null = null;
  let localProperty: FbiOffenseRecord | null = null;
  let usedOri = ORI_CANDIDATES[0]!;

  // Try each ORI candidate, then each year, until we find data
  outer: for (const ori of ORI_CANDIDATES) {
    for (const tryYear of YEARS_TO_TRY) {
      const [vRaw, pRaw] = await Promise.all([
        fbiGet(`/api/summarized/agencies/${ori}/offenses/violent-crime/${tryYear}/${tryYear}`, apiKey),
        fbiGet(`/api/summarized/agencies/${ori}/offenses/property-crime/${tryYear}/${tryYear}`, apiKey),
      ]);

      const v = parseFbiResponse(vRaw);
      const p = parseFbiResponse(pRaw);

      if (v !== null && p !== null) {
        year = tryYear;
        localViolent = v;
        localProperty = p;
        usedOri = ori;
        if (process.env['NODE_ENV'] !== 'production') {
          process.stderr.write(`[crime] Found data: ORI=${ori} year=${tryYear}\n`);
        }
        break outer;
      }
    }
  }

  if (!localViolent || !localProperty) {
    throw new Error(`No FBI crime data found for any ORI candidate in years ${YEARS_TO_TRY.join(',')}`);
  }

  const localPop = localViolent.population;

  // Fetch state, national, and individual offense types in parallel
  const [
    njViolentRaw,
    njPropertyRaw,
    natViolentRaw,
    natPropertyRaw,
    assaultRaw,
    robberyRaw,
    burglaryRaw,
    mvtRaw,
  ] = await Promise.all([
    fbiGet(`/api/summarized/state/NJ/offenses/violent-crime/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/state/NJ/offenses/property-crime/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/national/offenses/violent-crime/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/national/offenses/property-crime/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${usedOri}/offenses/aggravated-assault/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${usedOri}/offenses/robbery/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${usedOri}/offenses/burglary/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${usedOri}/offenses/motor-vehicle-theft/${year}/${year}`, apiKey),
  ]);

  const njViolent = parseFbiResponse(njViolentRaw);
  const njProperty = parseFbiResponse(njPropertyRaw);
  const natViolent = parseFbiResponse(natViolentRaw);
  const natProperty = parseFbiResponse(natPropertyRaw);

  const assault = parseFbiResponse(assaultRaw);
  const robbery = parseFbiResponse(robberyRaw);
  const burglary = parseFbiResponse(burglaryRaw);
  const mvt = parseFbiResponse(mvtRaw);

  return {
    source: 'FBI Crime Data Explorer',
    sourceUrl: 'https://cde.ucr.cjis.gov',
    year,
    lastUpdated: new Date().toISOString(),
    violentCrimeRate: {
      newBrunswick: ratePerHundredK(localViolent.actual_count, localPop),
      njAverage: njViolent ? ratePerHundredK(njViolent.actual_count, njViolent.population) : 0,
      national: natViolent ? ratePerHundredK(natViolent.actual_count, natViolent.population) : 0,
    },
    propertyCrimeRate: {
      newBrunswick: ratePerHundredK(localProperty.actual_count, localPop),
      njAverage: njProperty ? ratePerHundredK(njProperty.actual_count, njProperty.population) : 0,
      national: natProperty ? ratePerHundredK(natProperty.actual_count, natProperty.population) : 0,
    },
    aggrAssaultCount: assault?.actual_count ?? 0,
    robberyCount: robbery?.actual_count ?? 0,
    burglaryCount: burglary?.actual_count ?? 0,
    motorVehicleTheftCount: mvt?.actual_count ?? 0,
    localPopulation: localPop,
    dataNote: `${year} UCR Crime Data — New Brunswick area (ORI: ${usedOri})`,
  };
}

export function getCrime(): Promise<CrimeData> {
  return fetchWithCache<CrimeData>('crime', 'fbi', fetchCrimeData, 7);
}
