import type { SchoolData } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

// College Scorecard API — same api.data.gov key as FBI_API_KEY
const SCORECARD_BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';
// Rutgers University – New Brunswick IPEDS unit ID
const RUTGERS_UNITID = '186380';

// NB public school district stats — NJ DOE Report Card 2022-23
// Source: https://rc.doe.state.nj.us (New Brunswick City School District, NCES LEAID 3413890)
// Update these values each year from the NJ DOE Report Card.
const NB_PUBLIC_SCHOOLS = {
  mathProficiency: 24,      // % students at/above proficiency (2022-23 NJSLA)
  readingProficiency: 33,   // % students at/above proficiency (2022-23 NJSLA)
  studentTeacherRatio: 13,  // students per teacher (2022-23 CCD)
  graduationRate: 78,       // 4-year graduation rate % (2021-22 adjusted cohort)
  povertyRate: 83,          // % eligible for free/reduced lunch (2022-23)
  enrollment: 5100,         // total district enrollment (2022-23)
  dataYear: 2023,
};

// --- College Scorecard response types ---

interface ScorecardResult {
  'school.name'?: string;
  'latest.completion.rate_suppressed.overall'?: number | null;
  'latest.admissions.admission_rate.overall'?: number | null;
  'latest.student.faculty_ratio'?: number | null;
}

interface ScorecardResponse {
  results?: ScorecardResult[];
}

function isScorecardResponse(v: unknown): v is ScorecardResponse {
  if (typeof v !== 'object' || v === null) return false;
  return true;
}

// ---

async function fetchRutgersData(): Promise<{ graduationRate: number; acceptanceRate: number; studentFacultyRatio: number }> {
  const apiKey = process.env['FBI_API_KEY']; // api.data.gov key — shared with FBI endpoint
  if (!apiKey) throw new Error('FBI_API_KEY (api.data.gov) is not set');

  const fields = [
    'school.name',
    'latest.completion.rate_suppressed.overall',
    'latest.admissions.admission_rate.overall',
    'latest.student.faculty_ratio',
  ].join(',');

  const url = `${SCORECARD_BASE}?id=${RUTGERS_UNITID}&fields=${fields}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`College Scorecard API error ${res.status}`);

  const raw: unknown = await res.json();
  if (!isScorecardResponse(raw) || !Array.isArray(raw.results) || raw.results.length === 0) {
    throw new Error('College Scorecard returned no results for Rutgers');
  }

  const r = raw.results[0]!;
  const gradRate = r['latest.completion.rate_suppressed.overall'];
  const admRate = r['latest.admissions.admission_rate.overall'];
  const ratio = r['latest.student.faculty_ratio'];

  return {
    graduationRate: gradRate != null ? Math.round(gradRate * 100) : 0,
    acceptanceRate: admRate != null ? Math.round(admRate * 100 * 10) / 10 : 0,
    studentFacultyRatio: ratio != null ? Math.round(ratio) : 0,
  };
}

async function fetchSchoolsData(): Promise<SchoolData> {
  // Rutgers data via College Scorecard (api.data.gov)
  const rutgers = await fetchRutgersData();

  const nb = NB_PUBLIC_SCHOOLS;
  const rating = Math.round((nb.mathProficiency + nb.readingProficiency) / 2);

  return {
    source: 'NJ DOE Report Card + College Scorecard (api.data.gov)',
    sourceUrl: 'https://rc.doe.state.nj.us',
    lastUpdated: new Date().toISOString(),
    publicSchools: {
      rating,
      mathProficiency: nb.mathProficiency,
      readingProficiency: nb.readingProficiency,
      studentTeacherRatio: nb.studentTeacherRatio,
      graduationRate: nb.graduationRate,
      povertyRate: nb.povertyRate,
      enrollment: nb.enrollment,
    },
    rutgers: {
      graduationRate: rutgers.graduationRate,
      acceptanceRate: rutgers.acceptanceRate,
      studentFacultyRatio: rutgers.studentFacultyRatio,
    },
    stateRanking: null,
    dataNote: `Public school stats: NJ DOE Report Card ${nb.dataYear}. Rutgers: College Scorecard latest.`,
  };
}

export function getSchools(): Promise<SchoolData> {
  return fetchWithCache<SchoolData>('schools', 'scorecard', fetchSchoolsData, 30);
}
