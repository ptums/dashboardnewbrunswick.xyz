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
import type { DashboardResponse, CrimeComparison } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';
type Indicator = 'green' | 'yellow' | 'red';

function crimeIndicator(nb: number, njAvg: number): Indicator {
  if (nb <= njAvg * 0.9) return 'green';
  if (nb >= njAvg * 1.1) return 'red';
  return 'yellow';
}

const BADGE_CLASSES: Record<Indicator, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
};

const BADGE_LABELS: Record<Indicator, string> = {
  green: 'Below NJ avg',
  yellow: 'Near NJ avg',
  red: 'Above NJ avg',
};

const NB_VALUE_CLASSES: Record<Indicator, string> = {
  green: 'text-green-700',
  yellow: 'text-yellow-700',
  red: 'text-red-700',
};

function Badge({ indicator }: { indicator: Indicator }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[indicator]}`}>
      {BADGE_LABELS[indicator]}
    </span>
  );
}

function CrimeCard({
  label,
  description,
  data,
}: {
  label: string;
  description: string;
  data: CrimeComparison;
}) {
  const indicator = crimeIndicator(data.newBrunswick, data.njAverage);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
        <Badge indicator={indicator} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400">New Brunswick</p>
          <p className={`mt-1 text-2xl font-bold ${NB_VALUE_CLASSES[indicator]}`}>
            {data.newBrunswick.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">NJ Average</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">
            {data.njAverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">National</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">
            {data.national.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
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
      <h2 className="text-2xl font-bold text-gray-900">Safety</h2>
    </div>
  );
}

export default function SafetySection() {
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
      <section id="safety" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="text-center">
                      <div className="mx-auto h-3 w-14 animate-pulse rounded bg-gray-200" />
                      <div className="mx-auto mt-2 h-8 w-12 animate-pulse rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </section>
    );
  }

  if (status === 'error' || data?.crime == null) {
    return (
      <section id="safety" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Safety data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const crime = data.crime;

  const chartData = [
    {
      name: 'Violent',
      'New Brunswick': Math.round(crime.violentCrimeRate.newBrunswick),
      'NJ Average': Math.round(crime.violentCrimeRate.njAverage),
      National: Math.round(crime.violentCrimeRate.national),
    },
    {
      name: 'Property',
      'New Brunswick': Math.round(crime.propertyCrimeRate.newBrunswick),
      'NJ Average': Math.round(crime.propertyCrimeRate.njAverage),
      National: Math.round(crime.propertyCrimeRate.national),
    },
  ];

  return (
    <section id="safety" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          Crime rates per 100,000 residents compared to NJ state and national averages.{' '}
          <span className="font-medium text-green-700">Lower numbers are better.</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <CrimeCard
            label="Violent Crime"
            description="How often violent crimes happen per 100,000 residents"
            data={crime.violentCrimeRate}
          />
          <CrimeCard
            label="Property Crime"
            description="How often property crimes happen per 100,000 residents"
            data={crime.propertyCrimeRate}
          />
        </div>

        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-4 text-sm font-medium text-gray-700">
            Crime Rate Comparison (per 100,000 residents)
          </p>
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
                tickFormatter={(value: number) => value.toLocaleString()}
                width={60}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === 'number' ? value.toLocaleString() : String(value ?? '')
                }
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="New Brunswick" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="NJ Average" fill="#9ca3af" radius={[3, 3, 0, 0]} />
              <Bar dataKey="National" fill="#d1d5db" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Source:{' '}
          <a
            href={crime.sourceUrl}
            className="underline hover:text-gray-600"
            rel="noopener noreferrer"
          >
            {crime.source}
          </a>{' '}
          — {crime.year}.{crime.dataNote ? ` ${crime.dataNote}` : ''}
        </p>
      </div>
    </section>
  );
}
