import { useState, useEffect } from 'react';
import type { DashboardResponse, WalkScoreDetail } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';
type Indicator = 'green' | 'yellow' | 'red';

function scoreIndicator(score: number): Indicator {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

const SCORE_CLS: Record<Indicator, string> = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
};

const RING_CLS: Record<Indicator, string> = {
  green: 'ring-green-200 bg-green-50',
  yellow: 'ring-yellow-200 bg-yellow-50',
  red: 'ring-red-200 bg-red-50',
};

function ScoreCard({
  label,
  description,
  detail,
}: {
  label: string;
  description: string;
  detail: WalkScoreDetail;
}) {
  const ind = scoreIndicator(detail.score);
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      <div
        className={`mt-5 flex h-28 w-28 items-center justify-center rounded-full ring-4 ${RING_CLS[ind]}`}
      >
        <span className={`text-6xl font-extrabold leading-none ${SCORE_CLS[ind]}`}>
          {detail.score}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-gray-800">{detail.description}</p>
    </div>
  );
}

function buildSummary(walk: number, transit: number, bike: number): string {
  const walkText =
    walk >= 90
      ? 'extremely walkable'
      : walk >= 70
        ? 'very walkable'
        : walk >= 50
          ? 'somewhat walkable'
          : 'car-dependent for most errands';

  const transitText =
    transit >= 70
      ? 'excellent transit options'
      : transit >= 50
        ? 'good transit options'
        : 'limited public transportation';

  const bikeText = bike >= 70 ? 'highly bikeable' : bike >= 50 ? 'bikeable' : null;

  if (bikeText) {
    return `New Brunswick is ${walkText} with ${transitText} and is ${bikeText}.`;
  }
  return `New Brunswick is ${walkText} with ${transitText}.`;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 text-center">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-3 w-40 animate-pulse rounded bg-gray-100" />
      <div className="mt-5 h-28 w-28 animate-pulse rounded-full bg-gray-200" />
      <div className="mt-4 h-4 w-32 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

const SECTION_CLS = 'border-b border-gray-100 bg-white px-4 py-16';
const INNER_CLS = 'mx-auto max-w-4xl';

function SectionTitle() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="h-6 w-1 rounded bg-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">Neighborhood</h2>
    </div>
  );
}

export default function NeighborhoodSection() {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then((d) => {
        setData(d);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') {
    return (
      <section id="neighborhood" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error' || data?.neighborhood == null) {
    return (
      <section id="neighborhood" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Neighborhood data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const n = data.neighborhood;
  const summary = buildSummary(n.walkScore.score, n.transitScore.score, n.bikeScore.score);
  const sourceYear = new Date(n.lastUpdated).getFullYear();

  return (
    <section id="neighborhood" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          How easy is it to get around New Brunswick without a car? Scores run 0–100.{' '}
          <span className="font-medium text-green-700">Higher is better.</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <ScoreCard
            label="Walk Score"
            description="How easy is it to run errands on foot?"
            detail={n.walkScore}
          />
          <ScoreCard
            label="Transit Score"
            description="How good is public transportation?"
            detail={n.transitScore}
          />
          <ScoreCard
            label="Bike Score"
            description="How bikeable is the city?"
            detail={n.bikeScore}
          />
        </div>

        <p className="mt-6 text-sm text-gray-600">{summary}</p>

        <p className="mt-4 text-xs text-gray-400">
          Source:{' '}
          <a href={n.sourceUrl} className="underline hover:text-gray-600" rel="noopener noreferrer">
            {n.source}
          </a>{' '}
          — {sourceYear}.
        </p>
      </div>
    </section>
  );
}
