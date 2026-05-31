import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardResponse, CostComparison } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';
type Indicator = 'green' | 'yellow' | 'red';

function vsNjIndicator(nb: number, njAvg: number): Indicator {
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

const badgeLabel = (i: Indicator, vsWhat: 'nj' | 'national') => {
  const avg = vsWhat === 'nj' ? 'NJ avg' : 'national avg';
  if (i === 'green') return `Below ${avg}`;
  if (i === 'red') return `Above ${avg}`;
  return `Near ${avg}`;
};

const dollars = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function ComparisonCard({
  label,
  description,
  data,
}: {
  label: string;
  description: string;
  data: CostComparison;
}) {
  const ind = vsNjIndicator(data.newBrunswick, data.njAverage);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
        <Badge indicator={ind} label={badgeLabel(ind, 'nj')} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400">New Brunswick</p>
          <p className={`mt-1 text-xl font-bold ${NB_VALUE_CLS[ind]}`}>
            {dollars(data.newBrunswick)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">NJ Average</p>
          <p className="mt-1 text-xl font-bold text-gray-600">{dollars(data.njAverage)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">National</p>
          <p className="mt-1 text-xl font-bold text-gray-600">{dollars(data.national)}</p>
        </div>
      </div>
    </div>
  );
}

function ColiCard({ index }: { index: number }) {
  const ind = coliIndicator(index);
  const diff = Math.abs(Math.round(index - 100));
  const direction = index < 100 ? `${diff}% below` : index > 100 ? `${diff}% above` : 'equal to';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">Cost of Living Index</p>
          <p className="mt-0.5 text-xs text-gray-400">How expensive is daily life?</p>
        </div>
        <Badge indicator={ind} label={badgeLabel(ind, 'national')} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400">Northeast (NB area)</p>
          <p className={`mt-1 text-2xl font-bold ${NB_VALUE_CLS[ind]}`}>{index}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">National average</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">100</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Daily life here costs {direction} the US average.
      </p>
    </div>
  );
}

function UnavailableCard({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      <p className="mt-6 text-sm text-gray-400">Data being connected — check back soon.</p>
    </div>
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

const SECTION_CLS = 'border-b border-gray-100 bg-white px-4 py-16';
const INNER_CLS = 'mx-auto max-w-4xl';

function SectionTitle() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="h-6 w-1 rounded bg-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">Cost of Living</h2>
    </div>
  );
}

export default function CostSection() {
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
      <section id="cost" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section id="cost" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Cost of living data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const cost = data!.cost;
  const jobs = data!.jobs;

  const coliIndex = cost.costOfLivingIndex ?? jobs?.costOfLivingIndex ?? null;
  const hasRent = cost.medianRent != null;
  const hasHomePrice = cost.medianHomePrice != null;
  const hasChart = hasRent && hasHomePrice;

  const chartData = hasChart
    ? [
        {
          name: 'Median Rent',
          'New Brunswick': Math.round(cost.medianRent!.newBrunswick),
          'NJ Average': Math.round(cost.medianRent!.njAverage),
          National: Math.round(cost.medianRent!.national),
        },
        {
          name: 'Home Price',
          'New Brunswick': Math.round(cost.medianHomePrice!.newBrunswick),
          'NJ Average': Math.round(cost.medianHomePrice!.njAverage),
          National: Math.round(cost.medianHomePrice!.national),
        },
      ]
    : [];

  const sourceYear = cost.lastUpdated
    ? new Date(cost.lastUpdated).getFullYear()
    : jobs?.lastUpdated
      ? new Date(jobs.lastUpdated).getFullYear()
      : new Date().getFullYear();

  return (
    <section id="cost" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          Median rent, home prices, and cost of living compared to NJ and national averages.{' '}
          <span className="font-medium text-green-700">Lower numbers are better.</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasRent ? (
            <ComparisonCard
              label="Average monthly rent"
              description="Median rent across all unit types"
              data={cost.medianRent!}
            />
          ) : (
            <UnavailableCard
              label="Average monthly rent"
              description="Median rent across all unit types"
            />
          )}

          {hasHomePrice ? (
            <ComparisonCard
              label="Average home sale price"
              description="Median sale price for homes"
              data={cost.medianHomePrice!}
            />
          ) : (
            <UnavailableCard
              label="Average home sale price"
              description="Median sale price for homes"
            />
          )}

          {coliIndex != null ? (
            <ColiCard index={coliIndex} />
          ) : (
            <UnavailableCard
              label="Cost of Living Index"
              description="How expensive is daily life?"
            />
          )}
        </div>

        {hasChart && (
          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-4 text-sm font-medium text-gray-700">Housing Cost Comparison</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  width={55}
                />
                <Tooltip formatter={(value) => dollars(Number(value))} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="New Brunswick" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="NJ Average" fill="#9ca3af" radius={[3, 3, 0, 0]} />
                <Bar dataKey="National" fill="#d1d5db" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Source: HUD, Bureau of Labor Statistics — {sourceYear}.
          {cost.dataNote ? ` ${cost.dataNote}` : ''}
        </p>
      </div>
    </section>
  );
}
