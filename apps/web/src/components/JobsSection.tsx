import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardResponse } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';
type Indicator = 'green' | 'yellow' | 'red';

function unemploymentIndicator(nb: number, njAvg: number): Indicator {
  if (nb <= njAvg * 0.9) return 'green';
  if (nb >= njAvg * 1.1) return 'red';
  return 'yellow';
}

function coliIndicator(index: number): Indicator {
  if (index < 100) return 'green';
  if (index <= 115) return 'yellow';
  return 'red';
}

const BADGE_CLS: Record<Indicator, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
};

const NB_VALUE_CLS: Record<Indicator, string> = {
  green: 'text-green-700',
  yellow: 'text-yellow-700',
  red: 'text-red-700',
};

function Badge({ indicator, label }: { indicator: Indicator; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLS[indicator]}`}>
      {label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-3 w-48 animate-pulse rounded bg-gray-100" />
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center">
            <div className="mx-auto h-3 w-14 animate-pulse rounded bg-gray-200" />
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTION_CLS = 'border-b border-gray-100 bg-gray-50 px-4 py-16';
const INNER_CLS = 'mx-auto max-w-4xl';

function SectionTitle() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="h-6 w-1 rounded bg-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">Jobs &amp; Income</h2>
    </div>
  );
}

export default function JobsSection() {
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
      <section id="jobs" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-300" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </section>
    );
  }

  if (status === 'error' || data?.jobs == null) {
    return (
      <section id="jobs" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Jobs data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const jobs = data.jobs;
  const ur = jobs.unemploymentRate;
  const urInd = unemploymentIndicator(ur.current, ur.njAverage);
  const urBadge =
    urInd === 'green' ? 'Below NJ avg' : urInd === 'red' ? 'Above NJ avg' : 'Near NJ avg';

  const coli = jobs.costOfLivingIndex;
  const coliInd = coliIndicator(coli);
  const diff = Math.abs(Math.round(coli - 100));
  const coliDirection =
    coli < 100 ? `${diff}% below average — dollar goes further` : coli > 100 ? `${diff}% above average — higher cost of living` : 'Equal to the national average';
  const coliBadge =
    coliInd === 'green' ? 'Favorable' : coliInd === 'red' ? 'Elevated' : 'Average';

  const trendPoints = [...jobs.unemploymentTrend].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December',
    ];
    return months.indexOf(a.month) - months.indexOf(b.month);
  });

  const chartData = trendPoints.map((pt) => ({
    label: `${pt.month.slice(0, 3)} '${String(pt.year).slice(2)}`,
    'Unemployment %': pt.value,
  }));

  const sourceYear = new Date(jobs.lastUpdated).getFullYear();

  return (
    <section id="jobs" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          Unemployment rate and cost of living compared to NJ and national averages.{' '}
          <span className="font-medium text-green-700">Lower unemployment is better.</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Unemployment Rate */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">Unemployment Rate</p>
                <p className="mt-0.5 text-xs text-gray-400">People currently looking for work</p>
              </div>
              <Badge indicator={urInd} label={urBadge} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">New Brunswick</p>
                <p className={`mt-1 text-2xl font-bold ${NB_VALUE_CLS[urInd]}`}>
                  {ur.current.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">NJ Average</p>
                <p className="mt-1 text-2xl font-bold text-gray-600">{ur.njAverage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">National</p>
                <p className="mt-1 text-2xl font-bold text-gray-600">{ur.national.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Cost of Living Index */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">Cost of Living Index</p>
                <p className="mt-0.5 text-xs text-gray-400">How far does a dollar go?</p>
              </div>
              <Badge indicator={coliInd} label={coliBadge} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">Northeast (NB area)</p>
                <p className={`mt-1 text-2xl font-bold ${NB_VALUE_CLS[coliInd]}`}>{coli}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">National baseline</p>
                <p className="mt-1 text-2xl font-bold text-gray-600">100</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">{coliDirection}</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="mt-8 rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-4 text-sm font-medium text-gray-700">
              Unemployment Rate — Last 12 Months
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                  width={40}
                  domain={['auto', 'auto']}
                />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Unemployment']} />
                <Line
                  type="monotone"
                  dataKey="Unemployment %"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Source:{' '}
          <a href={jobs.sourceUrl} className="underline hover:text-gray-600" rel="noopener noreferrer">
            {jobs.source}
          </a>{' '}
          — {sourceYear}.{jobs.dataNote ? ` ${jobs.dataNote}` : ''}
        </p>
      </div>
    </section>
  );
}
