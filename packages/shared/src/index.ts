// Shared TypeScript types between apps/web and apps/api.
// No runtime code — types only. Add imports with `import type` in consumers.

export type CompositeScoreLetter = 'A' | 'B' | 'C' | 'D' | 'F';
export type VerdictScore = 'good' | 'mixed' | 'poor';

export interface VerdictData {
  score: VerdictScore;
  headline: string;
  explanation: string;
}

// Placeholder data shapes — expanded in Tasks 5-10 as APIs are integrated
export type CrimeData = Record<string, unknown>;
export type SchoolData = Record<string, unknown>;
export type CostData = Record<string, unknown>;
export type JobsData = Record<string, unknown>;
export type NeighborhoodData = Record<string, unknown>;
export type AirQualityData = Record<string, unknown>;
export type DemographicsData = Record<string, unknown>;

export interface DashboardResponse {
  generatedAt: string;
  dataFreshness: Record<string, string>;
  compositeScore: {
    letter: CompositeScoreLetter;
    numeric: number;
  };
  crime: CrimeData;
  schools: SchoolData;
  cost: CostData;
  jobs: JobsData;
  neighborhood: NeighborhoodData;
  airQuality: AirQualityData;
  demographics: DemographicsData;
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
