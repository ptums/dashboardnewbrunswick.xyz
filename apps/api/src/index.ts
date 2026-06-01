import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env['SENTRY_DSN_API'],
  environment: process.env['NODE_ENV'] ?? 'development',
});

import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import { Resend } from 'resend';
import type { DashboardResponse, FeedbackPayload } from '@repo/shared';
import { db } from './db/index';
import { feedbackSubmissions } from './db/schema';
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

const ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'https://dashboardnewbrunswick.xyz',
  'https://www.dashboardnewbrunswick.xyz',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, etc.)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

app.post('/api/feedback', async (req, res) => {
  const body = req.body as Partial<FeedbackPayload>;
  const name = typeof body.name === 'string' ? body.name.trim() || null : null;
  const email = typeof body.email === 'string' ? body.email.trim() || null : null;
  const page = typeof body.page === 'string' ? body.page.trim() || null : null;
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (message.length < 10) {
    res.status(400).json({
      ok: false,
      error: 'Message is required and must be at least 10 characters.',
    });
    return;
  }

  const submittedAt = new Date().toISOString();

  try {
    await db.insert(feedbackSubmissions).values({ name, email, message, page });

    const resendKey = process.env['RESEND_API_KEY'];
    const feedbackEmail = process.env['FEEDBACK_EMAIL'];
    if (resendKey && feedbackEmail) {
      new Resend(resendKey).emails
        .send({
          from: 'noreply@dashboardnewbrunswick.xyz',
          to: feedbackEmail,
          subject: 'New Feedback — Dashboard New Brunswick',
          text: [
            'New feedback submission received.',
            '',
            `Name: ${name ?? 'Anonymous'}`,
            `Email: ${email ?? 'Not provided'}`,
            `Page: ${page ?? 'Not specified'}`,
            `Message: ${message}`,
            '',
            `Submitted at: ${submittedAt}`,
          ].join('\n'),
        })
        .then(({ error }) => {
          if (error) Sentry.captureException(error, { tags: { context: 'feedback-email' } });
        })
        .catch((err: unknown) => {
          Sentry.captureException(err, { tags: { context: 'feedback-email' } });
        });
    }

    res.json({ ok: true, message: 'Thank you for your feedback' });
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});

Sentry.setupExpressErrorHandler(app);

app.listen(PORT);

export default app;
