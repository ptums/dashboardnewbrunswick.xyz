// Shared TypeScript types between apps/web and apps/api.
// No runtime code — types only. Add imports with `import type` in consumers.

export type CompositeScoreLetter = 'A' | 'B' | 'C' | 'D' | 'F';
export type VerdictScore = 'good' | 'mixed' | 'poor';

export interface VerdictData {
  score: VerdictScore;
  headline: string;
  explanation: string;
}

// --- Task 6: Crime (FBI Crime Data Explorer) ---

export interface CrimeComparison {
  newBrunswick: number;
  njAverage: number;
  national: number;
}

export interface CrimeData {
  source: string;
  sourceUrl: string;
  year: number;
  lastUpdated: string;
  /** Rates per 100,000 people */
  violentCrimeRate: CrimeComparison;
  propertyCrimeRate: CrimeComparison;
  /** Raw counts for Middlesex County / New Brunswick area */
  aggrAssaultCount: number;
  robberyCount: number;
  burglaryCount: number;
  motorVehicleTheftCount: number;
  localPopulation: number;
  dataNote: string;
}

// Placeholder data shape — expanded when cost-of-living section is built (Task 15)
export type CostData = Record<string, unknown>;

// --- Task 10: Air Quality (EPA AQS API) ---

export interface AqiInfo {
  value: number;
  category: string;
  /** Mapped to the project color system: green ≤ 50, yellow ≤ 100, red > 100 */
  color: 'green' | 'yellow' | 'red';
}

export interface AirQualityData {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  aqi: AqiInfo;
  /** PM2.5 concentration in μg/m³ */
  pm25: number;
  /** PM10 concentration in μg/m³ */
  pm10: number;
  /** Ozone concentration in ppm */
  ozone: number;
  /** NJ statewide average AQI for the same period */
  vsNjAverage: number;
  /** Approximate national annual average AQI (EPA published figure) */
  vsNationalAverage: number;
  dataNote: string;
}

// --- Task 9: Schools (Urban Institute Education Data Portal / NCES / IPEDS) ---

export interface PublicSchoolStats {
  /** Average of math + reading proficiency (0–100) */
  rating: number;
  /** % of students at or above math proficiency */
  mathProficiency: number;
  /** % of students at or above reading/ELA proficiency */
  readingProficiency: number;
  studentTeacherRatio: number;
  /** Graduation rate % */
  graduationRate: number;
  /** % eligible for free or reduced-price lunch (poverty indicator) */
  povertyRate: number;
  enrollment: number;
}

export interface RutgersStats {
  /** 6-year graduation rate % */
  graduationRate: number;
  /** Acceptance rate % */
  acceptanceRate: number;
  studentFacultyRatio: number;
}

export interface SchoolData {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  publicSchools: PublicSchoolStats;
  rutgers: RutgersStats;
  /** NJ state ranking — null until a ranking data source is added */
  stateRanking: number | null;
  dataNote: string;
}

// --- Task 8: Neighborhood / Walkability (Walk Score API) ---

export interface WalkScoreDetail {
  score: number;
  description: string;
}

export interface NeighborhoodData {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  walkScore: WalkScoreDetail;
  transitScore: WalkScoreDetail;
  bikeScore: WalkScoreDetail;
}

// --- Task 7: Jobs / Cost of Living (BLS) ---

export interface UnemploymentComparison {
  /** Current unemployment rate % for New Brunswick area */
  current: number;
  njAverage: number;
  national: number;
}

export interface UnemploymentDataPoint {
  year: number;
  month: string;
  value: number;
}

export interface JobsData {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  unemploymentRate: UnemploymentComparison;
  /** Chronological monthly unemployment rates — last 12 months */
  unemploymentTrend: UnemploymentDataPoint[];
  /**
   * Northeast CPI relative to national CPI — national baseline = 100.
   * Values above 100 indicate prices in the Northeast are higher than the US average.
   */
  costOfLivingIndex: number;
  dataNote: string;
}

// --- Task 5: Demographics (US Census Bureau ACS) ---

export interface RaceEthnicityBreakdown {
  total: number;
  whiteAlone: number;
  blackAlone: number;
  asianAlone: number;
  hispanicOrLatino: number;
  otherOrMultiple: number;
}

export interface DemographicsData {
  source: string;
  sourceUrl: string;
  year: number;
  lastUpdated: string;
  population: number;
  medianAge: number;
  medianHouseholdIncome: number;
  raceEthnicity: RaceEthnicityBreakdown;
  /** Percentage of adults 25+ with a bachelor's degree or higher */
  pctCollegeEducated: number;
  totalHousingUnits: number;
  /** Percentage of housing units that are occupied */
  occupancyRate: number;
  dataNote: string;
}

export interface DashboardResponse {
  generatedAt: string;
  dataFreshness: Record<string, string>;
  compositeScore: {
    letter: CompositeScoreLetter;
    numeric: number;
  };
  crime: CrimeData | null;
  schools: SchoolData | null;
  cost: CostData;
  jobs: JobsData | null;
  neighborhood: NeighborhoodData | null;
  airQuality: AirQualityData | null;
  demographics: DemographicsData | null;
  verdicts: {
    familyFriendly: VerdictData;
    downtownSafety: VerdictData;
    rutgers: VerdictData;
  };
}

export interface FeedbackPayload {
  name?: string;
  email?: string;
  message: string;
  page?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  ok: true;
}

export interface ApiErrorResponse {
  error: string;
  ok: false;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
