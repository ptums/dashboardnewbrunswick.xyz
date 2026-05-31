import type {
  CrimeData,
  SchoolData,
  JobsData,
  NeighborhoodData,
  AirQualityData,
  DemographicsData,
  VerdictData,
  VerdictScore,
  CompositeScoreLetter,
} from '@repo/shared';

// --- Individual scorers — return 0-100; return 50 (neutral) when data is missing ---

export function scoreCrime(crime: CrimeData | null): number {
  if (!crime) return 50;
  const { newBrunswick, njAverage, national } = crime.violentCrimeRate;
  const baseline = njAverage > 0 ? njAverage : national > 0 ? national : 0;
  if (baseline === 0 || newBrunswick === 0) return 50;
  const ratio = newBrunswick / baseline;
  return Math.max(0, Math.min(100, Math.round(100 - ratio * 50)));
}

export function scoreSchools(schools: SchoolData | null): number {
  if (!schools) return 50;
  const { rating } = schools.publicSchools;
  return rating > 0 ? Math.min(100, Math.round(rating)) : 50;
}

export function scoreCost(jobs: JobsData | null): number {
  if (!jobs || jobs.costOfLivingIndex === 0) return 50;
  return Math.max(0, Math.min(100, Math.round(50 + (100 - jobs.costOfLivingIndex))));
}

export function scoreJobs(jobs: JobsData | null): number {
  if (!jobs) return 50;
  const { current, national } = jobs.unemploymentRate;
  if (current === 0 && national === 0) return 50;
  return Math.max(0, Math.min(100, Math.round(50 + (national - current) * 5)));
}

export function scoreNeighborhood(neighborhood: NeighborhoodData | null): number {
  if (!neighborhood) return 50;
  const { walkScore, transitScore, bikeScore } = neighborhood;
  return Math.round(walkScore.score * 0.5 + transitScore.score * 0.35 + bikeScore.score * 0.15);
}

export function scoreAirQuality(airQuality: AirQualityData | null): number {
  if (!airQuality) return 50;
  return Math.max(0, Math.min(100, Math.round(100 - airQuality.aqi.value / 2)));
}

// Income growth trend proxy: median household income relative to a $120k ceiling
export function scoreIncomeGrowth(demographics: DemographicsData | null): number {
  if (!demographics || demographics.medianHouseholdIncome === 0) return 50;
  return Math.min(100, Math.round(demographics.medianHouseholdIncome / 1200));
}

// --- Composite score — weights from CLAUDE.md ---

function numericToLetter(n: number): CompositeScoreLetter {
  if (n >= 90) return 'A';
  if (n >= 80) return 'B';
  if (n >= 70) return 'C';
  if (n >= 60) return 'D';
  return 'F';
}

export function computeCompositeScore(
  crime: CrimeData | null,
  schools: SchoolData | null,
  jobs: JobsData | null,
  neighborhood: NeighborhoodData | null,
  airQuality: AirQualityData | null,
  demographics: DemographicsData | null,
): { letter: CompositeScoreLetter; numeric: number } {
  const numeric = Math.round(
    scoreCrime(crime) * 0.25 +
      scoreSchools(schools) * 0.2 +
      scoreCost(jobs) * 0.15 +
      scoreJobs(jobs) * 0.15 +
      scoreNeighborhood(neighborhood) * 0.1 +
      scoreAirQuality(airQuality) * 0.1 +
      scoreIncomeGrowth(demographics) * 0.05,
  );

  return { letter: numericToLetter(numeric), numeric };
}

// --- Verdict helpers ---

function toVerdictScore(n: number): VerdictScore {
  if (n >= 65) return 'good';
  if (n >= 40) return 'mixed';
  return 'poor';
}

function buildFamilyVerdict(
  vs: VerdictScore,
  crime: CrimeData | null,
  schools: SchoolData | null,
  jobs: JobsData | null,
): VerdictData {
  const crimeRate = crime?.violentCrimeRate.newBrunswick ?? 0;
  const njRate = crime?.violentCrimeRate.njAverage ?? 0;
  const rating = schools?.publicSchools.rating ?? 0;
  const costIndex = jobs?.costOfLivingIndex ?? 100;

  const headlines: Record<VerdictScore, string> = {
    good: 'Good for Families — Affordable with Improving Schools',
    mixed: 'Mixed — Depends on Your Neighborhood and Budget',
    poor: 'Challenging — High Crime and Below-Average Schools',
  };

  const explanations: Record<VerdictScore, string> = {
    good:
      `Public school proficiency averages ${rating}% and the regional cost-of-living index is ${costIndex} (national = 100). ` +
      `Violent crime at ${crimeRate} per 100k residents is near the NJ average, making select neighborhoods viable for families.`,
    mixed:
      `School proficiency is ${rating}% and the cost index is ${costIndex}, above the national baseline of 100. ` +
      `Violent crime runs ${crimeRate} per 100k versus the NJ average of ${njRate}; families should research specific neighborhoods before committing.`,
    poor:
      `Violent crime is ${crimeRate} per 100k — significantly above the NJ average of ${njRate} — and school proficiency is ${rating}%. ` +
      `Families should weigh these factors carefully against employment access and proximity to Rutgers.`,
  };

  return { score: vs, headline: headlines[vs], explanation: explanations[vs] };
}

function buildDowntownVerdict(
  vs: VerdictScore,
  crime: CrimeData | null,
  neighborhood: NeighborhoodData | null,
): VerdictData {
  const crimeRate = crime?.violentCrimeRate.newBrunswick ?? 0;
  const walkScore = neighborhood?.walkScore.score ?? 0;
  const transitScore = neighborhood?.transitScore.score ?? 0;

  const headlines: Record<VerdictScore, string> = {
    good: 'Safe Downtown — Walkable with Good Transit Access',
    mixed: 'Use Caution — Active Downtown but Crime is Above Average',
    poor: 'Exercise Care — Elevated Crime Makes Downtown Challenging',
  };

  const explanations: Record<VerdictScore, string> = {
    good:
      `Downtown New Brunswick has a walk score of ${walkScore} and transit score of ${transitScore}, making it easy to navigate without a car. ` +
      `Violent crime at ${crimeRate} per 100k is manageable for an urban core of this size.`,
    mixed:
      `The walk score of ${walkScore} and transit score of ${transitScore} make downtown accessible and lively. ` +
      `Violent crime at ${crimeRate} per 100k is above the NJ average; visitors should stay aware in less-trafficked areas after dark.`,
    poor:
      `Violent crime of ${crimeRate} per 100k demands real vigilance in downtown New Brunswick, especially at night. ` +
      `Walk score ${walkScore} and transit score ${transitScore} mean the area is reachable, but personal safety planning is essential.`,
  };

  return { score: vs, headline: headlines[vs], explanation: explanations[vs] };
}

function buildRutgersVerdict(
  vs: VerdictScore,
  schools: SchoolData | null,
  jobs: JobsData | null,
  crime: CrimeData | null,
): VerdictData {
  const gradRate = schools?.rutgers.graduationRate ?? 0;
  const acceptRate = schools?.rutgers.acceptanceRate ?? 0;
  const costIndex = jobs?.costOfLivingIndex ?? 100;
  const crimeRate = crime?.violentCrimeRate.newBrunswick ?? 0;

  const headlines: Record<VerdictScore, string> = {
    good: 'Strong Choice for Rutgers — Good Value, Great Outcomes',
    mixed: 'Reasonable Pick — Strong University, Weigh the Costs',
    poor: 'Consider Carefully — Budget and Safety Add Real Stress',
  };

  const explanations: Record<VerdictScore, string> = {
    good:
      `Rutgers posts a ${gradRate}% graduation rate and ${acceptRate}% acceptance rate — an accessible, high-completion institution. ` +
      `The regional cost index of ${costIndex} (national = 100) and manageable crime levels make for a solid student experience.`,
    mixed:
      `Rutgers' ${gradRate}% graduation rate is solid, with an acceptance rate of ${acceptRate}%. ` +
      `The cost index of ${costIndex} and violent crime rate of ${crimeRate} per 100k mean students should plan housing and safety carefully.`,
    poor:
      `Rutgers' ${gradRate}% graduation rate is a genuine positive, but a cost index of ${costIndex} and violent crime of ${crimeRate} per 100k add real pressure on student life. ` +
      `Prospective students should investigate on-campus housing and campus safety resources before deciding.`,
  };

  return { score: vs, headline: headlines[vs], explanation: explanations[vs] };
}

export function generateVerdicts(
  crime: CrimeData | null,
  schools: SchoolData | null,
  jobs: JobsData | null,
  neighborhood: NeighborhoodData | null,
): { familyFriendly: VerdictData; downtownSafety: VerdictData; rutgers: VerdictData } {
  const crimeScore = scoreCrime(crime);
  const schoolsScore = scoreSchools(schools);
  const costScore = scoreCost(jobs);
  const neighborhoodScore = scoreNeighborhood(neighborhood);
  const jobsScore = scoreJobs(jobs);

  const familyNumeric = Math.round(crimeScore * 0.4 + schoolsScore * 0.35 + costScore * 0.25);
  const downtownNumeric = Math.round(crimeScore * 0.55 + neighborhoodScore * 0.3 + jobsScore * 0.15);
  const rutgersNumeric = Math.round(schoolsScore * 0.4 + costScore * 0.35 + crimeScore * 0.25);

  return {
    familyFriendly: buildFamilyVerdict(toVerdictScore(familyNumeric), crime, schools, jobs),
    downtownSafety: buildDowntownVerdict(toVerdictScore(downtownNumeric), crime, neighborhood),
    rutgers: buildRutgersVerdict(toVerdictScore(rutgersNumeric), schools, jobs, crime),
  };
}
