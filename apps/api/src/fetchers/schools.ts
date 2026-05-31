import type { SchoolData } from '@repo/shared';
import { fetchWithCache } from '../lib/cache';

const URBAN_BASE = 'https://educationdata.urban.org/api/v1';

// New Brunswick City School District (NCES LEA ID)
const NB_LEAID = '3413890';
// Rutgers University – New Brunswick (IPEDS Unit ID)
const RUTGERS_UNITID = '186380';

const DATA_YEAR = 2022;

// --- Urban Institute API response types ---

interface UrbanResponse {
  count: number;
  results: Record<string, unknown>[];
}

function isUrbanResponse(v: unknown): v is UrbanResponse {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r['count'] === 'number' && Array.isArray(r['results']);
}

async function urbanGet(path: string): Promise<Record<string, unknown>[]> {
  const url = `${URBAN_BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Urban Institute API ${res.status} for ${path}`);
  const raw: unknown = await res.json();
  if (!isUrbanResponse(raw)) return [];
  return raw.results;
}

/** Safely extract the first positive number from a record, trying each field in order */
function safeNum(record: Record<string, unknown>, ...fields: string[]): number {
  for (const field of fields) {
    const val = record[field];
    if (val === null || val === undefined) continue;
    const n = Number(val);
    if (!isNaN(n) && n > 0) return n;
  }
  return 0;
}

// ---

async function fetchSchoolsData(): Promise<SchoolData> {
  // Fire all requests in parallel; use allSettled so one failure doesn't kill all data
  const [
    ccdResult,    // school-level CCD (enrollment, teachers, lunch)
    mathResult,   // EDFacts math proficiency by LEA
    rlaResult,    // EDFacts reading/ELA proficiency by LEA
    gradResult,   // EDFacts graduation rates
    ipedsDirResult,   // IPEDS directory – student:faculty ratio
    admissionsResult, // IPEDS admissions
    rutgersGradResult,// IPEDS completion/graduation rates
  ] = await Promise.allSettled([
    urbanGet(`/schools/ccd/directory/?leaid=${NB_LEAID}&year=${DATA_YEAR}`),
    urbanGet(`/schools/edfacts/assessments/?leaid=${NB_LEAID}&year=${DATA_YEAR}&subject=math&grade_edfacts=99`),
    urbanGet(`/schools/edfacts/assessments/?leaid=${NB_LEAID}&year=${DATA_YEAR}&subject=rla&grade_edfacts=99`),
    urbanGet(`/schools/edfacts/grad-rates/?leaid=${NB_LEAID}&year=${DATA_YEAR}`),
    urbanGet(`/colleges/ipeds/directory/?unitid=${RUTGERS_UNITID}&year=${DATA_YEAR}`),
    urbanGet(`/colleges/ipeds/admissions-requirements/?unitid=${RUTGERS_UNITID}&year=${DATA_YEAR}`),
    urbanGet(`/colleges/ipeds/completion-rates/?unitid=${RUTGERS_UNITID}&year=${DATA_YEAR}`),
  ]);

  const resolve = (r: PromiseSettledResult<Record<string, unknown>[]>): Record<string, unknown>[] =>
    r.status === 'fulfilled' ? r.value : [];

  const schools = resolve(ccdResult);
  const math = resolve(mathResult);
  const rla = resolve(rlaResult);
  const grads = resolve(gradResult);
  const ipedsDir = resolve(ipedsDirResult);
  const admissions = resolve(admissionsResult);
  const rutgersGrads = resolve(rutgersGradResult);

  // Throw only if every single endpoint returned nothing — means the entire API is unreachable
  if (
    schools.length === 0 &&
    math.length === 0 &&
    rla.length === 0 &&
    ipedsDir.length === 0
  ) {
    throw new Error('Urban Institute API returned no data from any endpoint');
  }

  // --- Aggregate K-12 public school data ---
  let totalEnrollment = 0;
  let totalTeachers = 0;
  let totalLunch = 0;

  for (const school of schools) {
    totalEnrollment += safeNum(school, 'enrollment');
    totalTeachers += safeNum(school, 'teachers_fte');
    // Field name varies across API versions
    totalLunch += safeNum(school, 'free_or_reduced_price_lunch', 'num_free_or_reduced_lunch');
  }

  const studentTeacherRatio =
    totalTeachers > 0 ? Math.round((totalEnrollment / totalTeachers) * 10) / 10 : 0;

  const povertyRate =
    totalEnrollment > 0 ? Math.round((totalLunch / totalEnrollment) * 100) : 0;

  const mathRecord = math[0] ?? {};
  const mathProficiency = safeNum(mathRecord, 'pct_prof_or_above', 'proficiency_rate');

  const rlaRecord = rla[0] ?? {};
  const readingProficiency = safeNum(rlaRecord, 'pct_prof_or_above', 'proficiency_rate');

  const gradRecord = grads[0] ?? {};
  const k12GradRate = safeNum(gradRecord, 'grad_rate', 'grad_rate_4yr', 'graduation_rate');

  // Derived school rating: average of math + reading proficiency percentages
  const rating = Math.round((mathProficiency + readingProficiency) / 2);

  // --- Rutgers data ---
  const ipedsDirRecord = ipedsDir[0] ?? {};
  const studentFacultyRatio = safeNum(ipedsDirRecord, 'stufacr', 'student_to_faculty_ratio');

  const admRecord = admissions[0] ?? {};
  const totalApplicants = safeNum(admRecord, 'applcn');
  const totalAdmitted = safeNum(admRecord, 'admssn');
  const acceptanceRate =
    totalApplicants > 0
      ? Math.round((totalAdmitted / totalApplicants) * 100 * 10) / 10
      : 0;

  const rutgersGradRecord = rutgersGrads[0] ?? {};
  const rutgersGradRate = safeNum(
    rutgersGradRecord,
    'grad_rate_150',
    'graduation_rate_150pct',
    'graduation_rate',
  );

  return {
    source: 'Urban Institute Education Data Portal (NCES / IPEDS)',
    sourceUrl: 'https://educationdata.urban.org',
    lastUpdated: new Date().toISOString(),
    publicSchools: {
      rating,
      mathProficiency,
      readingProficiency,
      studentTeacherRatio,
      graduationRate: k12GradRate,
      povertyRate,
      enrollment: totalEnrollment,
    },
    rutgers: {
      graduationRate: rutgersGradRate,
      acceptanceRate,
      studentFacultyRatio,
    },
    // NJ school rankings require NJ DOE Report Card data — not in Urban Institute API
    stateRanking: null,
    dataNote: `${DATA_YEAR} NCES CCD + EDFacts + IPEDS`,
  };
}

export function getSchools(): Promise<SchoolData> {
  return fetchWithCache<SchoolData>('schools', 'urban-institute', fetchSchoolsData, 30);
}
