import { useState, useEffect } from 'react';
import type { DashboardResponse, CompositeScoreLetter } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';

function gradeColor(letter: CompositeScoreLetter): string {
  switch (letter) {
    case 'A':
      return 'text-green-600';
    case 'B':
      return 'text-blue-600';
    case 'C':
      return 'text-yellow-500';
    case 'D':
      return 'text-orange-500';
    case 'F':
      return 'text-red-600';
  }
}

function gradeExplanation(letter: CompositeScoreLetter): string {
  switch (letter) {
    case 'A':
      return 'New Brunswick scores exceptionally well across safety, schools, cost of living, and quality of life.';
    case 'B':
      return 'New Brunswick performs above average in most livability categories.';
    case 'C':
      return 'New Brunswick has a mixed profile — some notable strengths and some areas of concern.';
    case 'D':
      return 'New Brunswick faces challenges in several key quality-of-life categories.';
    case 'F':
      return 'New Brunswick scores below average in most measured quality-of-life categories.';
  }
}

function ScoreSkeleton() {
  return (
    <div className="mt-8 inline-block rounded-2xl bg-white px-10 py-8 text-left">
      <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-28 w-24 animate-pulse rounded-xl bg-gray-200" />
      <div className="mt-3 h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-4 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-3 w-32 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export default function HeroScore() {
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

  const lastUpdated = data
    ? new Date(data.generatedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <section id="hero" className="bg-blue-600 px-4 py-20 text-center text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-200">
          New Brunswick, NJ
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Is New Brunswick a good place to live?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
          We analyzed public government data so you don't have to. Scroll down for the full picture.
        </p>

        {status === 'loading' && <ScoreSkeleton />}

        {status === 'error' && (
          <div className="mt-8 inline-block rounded-2xl bg-white/10 px-10 py-8">
            <p className="text-blue-100">Data temporarily unavailable. Check back soon.</p>
          </div>
        )}

        {status === 'success' && data !== null && (
          <div className="mt-8 inline-block rounded-2xl bg-white px-10 py-8 text-left">
            <p className="text-sm font-medium text-gray-500">Overall Livability Score</p>
            <p
              className={`mt-1 text-9xl font-bold leading-none ${gradeColor(data.compositeScore.letter)}`}
            >
              {data.compositeScore.letter}
            </p>
            <p className="mt-3 text-xl font-semibold text-gray-800">
              {data.compositeScore.numeric} out of 100
            </p>
            <p className="mt-1 max-w-xs text-sm text-gray-600">
              {gradeExplanation(data.compositeScore.letter)}
            </p>
            {lastUpdated !== null && (
              <p className="mt-4 text-xs text-gray-400">Last updated: {lastUpdated}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
