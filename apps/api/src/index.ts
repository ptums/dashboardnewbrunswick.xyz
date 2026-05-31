import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env['SENTRY_DSN_API'],
  environment: process.env['NODE_ENV'] ?? 'development',
});

import express from 'express';
import NodeCache from 'node-cache';
import type { DashboardResponse } from '@repo/shared';
import { getDemographics } from './fetchers/demographics';
import { getCrime } from './fetchers/crime';
import { getJobs } from './fetchers/jobs';
import { getNeighborhood } from './fetchers/neighborhood';
import { getSchools } from './fetchers/schools';
import { getAirQuality } from './fetchers/airQuality';
import { computeCompositeScore, generateVerdicts } from './lib/scoring';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3001);
const dashboardCache = new NodeCache({ stdTTL: 3600 });

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/category/demographics', async (_req, res) => {
  try {
    const data = await getDemographics();
    res.json({ data, ok: true });
  } catch {
    res.status(503).json({ error: 'Demographics data temporarily unavailable', ok: false });
  }
});

app.get('/api/category/crime', async (_req, res) => {
  try {
    const data = await getCrime();
    res.json({ data, ok: true });
  } catch {
    res.status(503).json({ error: 'Crime data temporarily unavailable', ok: false });
  }
});

app.get('/api/category/jobs', async (_req, res) => {
  try {
    const data = await getJobs();
    res.json({ data, ok: true });
  } catch {
    res.status(503).json({ error: 'Jobs data temporarily unavailable', ok: false });
  }
});

app.get('/api/category/neighborhood', async (_req, res) => {
  try {
    const data = await getNeighborhood();
    res.json({ data, ok: true });
  } catch {
    res.status(503).json({ error: 'Neighborhood data temporarily unavailable', ok: false });
  }
});

app.get('/api/category/schools', async (_req, res) => {
  try {
    const data = await getSchools();
    res.json({ data, ok: true });
  } catch {
    res.status(503).json({ error: 'Schools data temporarily unavailable', ok: false });
  }
});

app.get('/api/category/airquality', async (_req, res) => {
  try {
    const data = await getAirQuality();
    res.json({ data, ok: true });
  } catch {
    res.status(503).json({ error: 'Air quality data temporarily unavailable', ok: false });
  }
});

app.get('/api/dashboard', async (_req, res) => {
  try {
    const cached = dashboardCache.get<DashboardResponse>('dashboard');
    if (cached) {
      res.json({ data: cached, ok: true });
      return;
    }

    const [
      demographicsResult,
      crimeResult,
      jobsResult,
      neighborhoodResult,
      schoolsResult,
      airQualityResult,
    ] = await Promise.allSettled([
      getDemographics(),
      getCrime(),
      getJobs(),
      getNeighborhood(),
      getSchools(),
      getAirQuality(),
    ]);

    const settle = <T>(r: PromiseSettledResult<T>, label: string): T | null => {
      if (r.status === 'rejected') {
        Sentry.captureException(r.reason, { tags: { category: label } });
        return null;
      }
      return r.value;
    };

    const demographics = settle(demographicsResult, 'demographics');
    const crime = settle(crimeResult, 'crime');
    const jobs = settle(jobsResult, 'jobs');
    const neighborhood = settle(neighborhoodResult, 'neighborhood');
    const schools = settle(schoolsResult, 'schools');
    const airQuality = settle(airQualityResult, 'airQuality');

    const compositeScore = computeCompositeScore(crime, schools, jobs, neighborhood, airQuality, demographics);
    const verdicts = generateVerdicts(crime, schools, jobs, neighborhood);

    const dataFreshness: Record<string, string> = {
      ...(demographics && { demographics: demographics.lastUpdated }),
      ...(crime && { crime: crime.lastUpdated }),
      ...(jobs && { jobs: jobs.lastUpdated }),
      ...(neighborhood && { neighborhood: neighborhood.lastUpdated }),
      ...(schools && { schools: schools.lastUpdated }),
      ...(airQuality && { airQuality: airQuality.lastUpdated }),
    };

    const response: DashboardResponse = {
      generatedAt: new Date().toISOString(),
      dataFreshness,
      compositeScore,
      crime,
      schools,
      cost: {},
      jobs,
      neighborhood,
      airQuality,
      demographics,
      verdicts,
    };

    dashboardCache.set('dashboard', response);
    res.json({ data: response, ok: true });
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: 'Dashboard temporarily unavailable', ok: false });
  }
});

Sentry.setupExpressErrorHandler(app);

app.listen(PORT);

export default app;
