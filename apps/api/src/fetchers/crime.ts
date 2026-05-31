import type { CrimeData } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const FBI_BASE = 'https://api.usa.gov/crime/fbi/cde';
// Middlesex County, NJ — used as the New Brunswick area proxy
const ORI = 'NJ0180000';
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
  if (!res.ok) throw new Error(`FBI API error ${res.status} for ${path}`);
  return res.json() as Promise<unknown>;
}

async function fetchCrimeData(): Promise<CrimeData> {
  const apiKey = process.env['FBI_API_KEY'];
  if (!apiKey) throw new Error('FBI_API_KEY is not set');

  // Find the most recent year the local agency has data for
  let year = YEARS_TO_TRY[0]!;
  let localViolent: FbiOffenseRecord | null = null;
  let localProperty: FbiOffenseRecord | null = null;

  for (const tryYear of YEARS_TO_TRY) {
    const [vRaw, pRaw] = await Promise.all([
      fbiGet(`/api/summarized/agencies/${ORI}/offenses/violent-crime/${tryYear}/${tryYear}`, apiKey),
      fbiGet(`/api/summarized/agencies/${ORI}/offenses/property-crime/${tryYear}/${tryYear}`, apiKey),
    ]);

    const v = parseFbiResponse(vRaw);
    const p = parseFbiResponse(pRaw);

    if (v !== null && p !== null) {
      year = tryYear;
      localViolent = v;
      localProperty = p;
      break;
    }
  }

  if (!localViolent || !localProperty) {
    throw new Error('No FBI crime data found for ORI NJ0180000 in years 2020-2023');
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
    fbiGet(`/api/summarized/agencies/${ORI}/offenses/aggravated-assault/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${ORI}/offenses/robbery/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${ORI}/offenses/burglary/${year}/${year}`, apiKey),
    fbiGet(`/api/summarized/agencies/${ORI}/offenses/motor-vehicle-theft/${year}/${year}`, apiKey),
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
    dataNote: `${year} UCR Crime Data — Middlesex County (ORI: ${ORI})`,
  };
}

export function getCrime(): Promise<CrimeData> {
  return fetchWithCache<CrimeData>('crime', 'fbi', fetchCrimeData, 7);
}
