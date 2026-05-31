import type { DemographicsData } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const CENSUS_BASE = 'https://api.census.gov/data';
const ACS_YEAR = 2022; // most recent complete ACS 5-year dataset
const STATE_FIPS = '34'; // New Jersey
const PLACE_FIPS = '51000'; // New Brunswick city

const VARIABLES = [
  'NAME',
  'B01001_001E', // total population
  'B01002_001E', // median age
  'B19013_001E', // median household income
  'B02001_002E', // white alone
  'B02001_003E', // black alone
  'B02001_005E', // asian alone
  'B03001_003E', // hispanic or latino
  'B15003_001E', // pop 25+ (educational attainment universe)
  'B15003_022E', // bachelor's degree
  'B15003_023E', // master's degree
  'B15003_024E', // professional degree
  'B15003_025E', // doctorate degree
  'B25001_001E', // total housing units
  'B25002_002E', // occupied housing units
].join(',');

// Census returns -666666666 / -888888888 / -999999999 for missing/suppressed values
function parseNum(val: string | null | undefined): number {
  const n = Number(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

async function fetchCensusData(): Promise<DemographicsData> {
  const apiKey = process.env['CENSUS_API_KEY'];
  if (!apiKey) throw new Error('CENSUS_API_KEY is not set');

  const url =
    `${CENSUS_BASE}/${ACS_YEAR}/acs/acs5` +
    `?get=${VARIABLES}` +
    `&for=place:${PLACE_FIPS}` +
    `&in=state:${STATE_FIPS}` +
    `&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Census API error: ${response.status} ${response.statusText}`);
  }

  const raw: unknown = await response.json();

  if (!Array.isArray(raw) || raw.length < 2 || !Array.isArray(raw[0]) || !Array.isArray(raw[1])) {
    throw new Error('Census API returned unexpected response format');
  }

  const headers = raw[0] as string[];
  const row = raw[1] as string[];

  const get = (varName: string): number => {
    const idx = headers.indexOf(varName);
    return idx === -1 ? 0 : parseNum(row[idx]);
  };

  const totalPop = get('B01001_001E');
  const pop25Plus = get('B15003_001E');
  const collegeGrads =
    get('B15003_022E') + get('B15003_023E') + get('B15003_024E') + get('B15003_025E');
  const totalHousing = get('B25001_001E');
  const occupied = get('B25002_002E');

  const white = get('B02001_002E');
  const black = get('B02001_003E');
  const asian = get('B02001_005E');
  const hispanic = get('B03001_003E');

  return {
    source: 'US Census Bureau ACS 5-Year Estimates',
    sourceUrl: 'https://data.census.gov',
    year: ACS_YEAR,
    lastUpdated: new Date().toISOString(),
    population: totalPop,
    medianAge: parseNum(row[headers.indexOf('B01002_001E')]),
    medianHouseholdIncome: get('B19013_001E'),
    raceEthnicity: {
      total: totalPop,
      whiteAlone: white,
      blackAlone: black,
      asianAlone: asian,
      hispanicOrLatino: hispanic,
      otherOrMultiple: Math.max(0, totalPop - white - black - asian),
    },
    pctCollegeEducated: pop25Plus > 0 ? Math.round((collegeGrads / pop25Plus) * 100) : 0,
    totalHousingUnits: totalHousing,
    occupancyRate: totalHousing > 0 ? Math.round((occupied / totalHousing) * 100) : 0,
    dataNote: `${ACS_YEAR} ACS 5-Year Estimates`,
  };
}

export function getDemographics(): Promise<DemographicsData> {
  return fetchWithCache<DemographicsData>('demographics', 'census', fetchCensusData, 30);
}
