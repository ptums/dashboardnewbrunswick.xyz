import { useState, useEffect } from 'react';
import type { DashboardResponse, VerdictData, VerdictScore } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

interface Props {
  data?: DashboardResponse | null;
}

type Status = 'loading' | 'success' | 'error';

function verdictIcon(score: VerdictScore): string {
  switch (score) {
    case 'good':
      return '✓';
    case 'mixed':
      return '~';
    case 'poor':
      return '✗';
  }
}

function iconClasses(score: VerdictScore): string {
  switch (score) {
    case 'good':
      return 'text-green-700 bg-green-100';
    case 'mixed':
      return 'text-yellow-700 bg-yellow-100';
    case 'poor':
      return 'text-red-700 bg-red-100';
  }
}

function headlineClasses(score: VerdictScore): string {
  switch (score) {
    case 'good':
      return 'text-green-800';
    case 'mixed':
      return 'text-yellow-800';
    case 'poor':
      return 'text-red-800';
  }
}

function VerdictCard({ question, verdict }: { question: string; verdict: VerdictData }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{question}</p>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${iconClasses(verdict.score)}`}
        aria-hidden="true"
      >
        {verdictIcon(verdict.score)}
      </div>
      <p className={`text-base font-bold leading-snug ${headlineClasses(verdict.score)}`}>
        {verdict.headline}
      </p>
      <p className="text-sm leading-relaxed text-gray-600">{verdict.explanation}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-md">
      <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
      <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200" />
      <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
      <div className="space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function VerdictSection({ data: initialData = null }: Props) {
  const [status, setStatus] = useState<Status>(initialData !== null ? 'success' : 'loading');
  const [data, setData] = useState<DashboardResponse | null>(initialData ?? null);

  useEffect(() => {
    if (initialData !== null) return;
    fetchDashboard()
      .then((d) => {
        setData(d);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, [initialData]);

  return (
    <section id="verdict" className="border-b border-gray-100 bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-6 w-1 rounded bg-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">The Verdict</h2>
        </div>
        <p className="mb-8 text-sm text-gray-500">Plain-English answers based on the data above.</p>

        {status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {status === 'error' && (
          <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Verdict data unavailable.
          </p>
        )}

        {status === 'success' && data !== null && (
          <div className="grid gap-4 sm:grid-cols-3">
            <VerdictCard question="Good for families?" verdict={data.verdicts.familyFriendly} />
            <VerdictCard question="Safe to go downtown?" verdict={data.verdicts.downtownSafety} />
            <VerdictCard question="Should you go to Rutgers?" verdict={data.verdicts.rutgers} />
          </div>
        )}
      </div>
    </section>
  );
}
