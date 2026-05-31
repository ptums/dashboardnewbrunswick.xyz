import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
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

// NJ and national benchmarks — US Census ACS 5-year estimates (public data)
const NJ_MEDIAN_AGE = 40.0;
const NJ_MEDIAN_INCOME = 89296;
const NATIONAL_MEDIAN_INCOME = 74755;
const NJ_PCT_COLLEGE = 43;
const NATIONAL_PCT_COLLEGE = 35;

function incomeIndicator(nb: number, njAvg: number): Indicator {
  if (nb >= njAvg * 1.05) return 'green';
  if (nb >= njAvg * 0.95) return 'yellow';
  return 'red';
}

function educationIndicator(nb: number, njAvg: number): Indicator {
  if (nb >= njAvg * 1.05) return 'green';
  if (nb >= njAvg * 0.95) return 'yellow';
  return 'red';
}

const VALUE_CLS: Record<Indicator, string> = {
  green: 'text-green-700',
  yellow: 'text-yellow-700',
  red: 'text-red-700',
};

const SECTION_CLS = 'border-b border-gray-100 bg-white px-4 py-16';
const INNER_CLS = 'mx-auto max-w-4xl';

function SectionTitle() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="h-6 w-1 rounded bg-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">Demographics</h2>
    </div>
  );
}

export default function DemographicsSection() {
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
      <section id="demographics" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-1 h-3 w-40 animate-pulse rounded bg-gray-100" />
                <div className="mt-4 h-10 w-24 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-3 w-48 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="mt-8 h-56 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </section>
    );
  }

  if (status === 'error' || data?.demographics == null) {
    return (
      <section id="demographics" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Demographics data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const d = data.demographics;
  const incomeInd = incomeIndicator(d.medianHouseholdIncome, NJ_MEDIAN_INCOME);
  const collegeInd = educationIndicator(d.pctCollegeEducated, NJ_PCT_COLLEGE);

  const re = d.raceEthnicity;
  const total = re.total > 0 ? re.total : 1;
  const ethnicityData = [
    { name: 'Hispanic or Latino', pct: Math.round((re.hispanicOrLatino / total) * 100) },
    { name: 'White', pct: Math.round((re.whiteAlone / total) * 100) },
    { name: 'Black or African American', pct: Math.round((re.blackAlone / total) * 100) },
    { name: 'Asian', pct: Math.round((re.asianAlone / total) * 100) },
    { name: 'Other or Multiracial', pct: Math.round((re.otherOrMultiple / total) * 100) },
  ].filter((e) => e.pct > 0);

  const chartHeight = ethnicityData.length * 44 + 16;

  return (
    <section id="demographics" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          Population, age, income, and education statistics. Factual reporting — no editorializing.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Population — no color indicator */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">Population</p>
            <p className="mt-0.5 text-xs text-gray-400">People living in New Brunswick</p>
            <p className="mt-4 text-4xl font-bold text-gray-800">
              {d.population.toLocaleString()}
            </p>
          </div>

          {/* Median Age — vs NJ only */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">Median Age</p>
            <p className="mt-0.5 text-xs text-gray-400">Average age of residents</p>
            <p className="mt-4 text-4xl font-bold text-gray-800">{d.medianAge}</p>
            <div className="mt-3 text-xs text-gray-500">
              NJ average: {NJ_MEDIAN_AGE} years
            </div>
          </div>

          {/* Median Household Income — green/yellow/red vs NJ + national */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">Median Household Income</p>
            <p className="mt-0.5 text-xs text-gray-400">Typical household yearly income</p>
            <p className={`mt-4 text-4xl font-bold ${VALUE_CLS[incomeInd]}`}>
              ${d.medianHouseholdIncome.toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>NJ avg: ${NJ_MEDIAN_INCOME.toLocaleString()}</span>
              <span>National: ${NATIONAL_MEDIAN_INCOME.toLocaleString()}</span>
            </div>
          </div>

          {/* Educational Attainment — green/yellow/red vs NJ + national */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">Educational Attainment</p>
            <p className="mt-0.5 text-xs text-gray-400">Residents with a college degree</p>
            <p className={`mt-4 text-4xl font-bold ${VALUE_CLS[collegeInd]}`}>
              {d.pctCollegeEducated.toFixed(1)}%
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>NJ avg: {NJ_PCT_COLLEGE}%</span>
              <span>National: {NATIONAL_PCT_COLLEGE}%</span>
            </div>
          </div>
        </div>

        {/* Race / Ethnicity breakdown — no color-coding, factual only */}
        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-6">
          <p className="mb-1 text-base font-semibold text-gray-900">
            Who lives in New Brunswick?
          </p>
          <p className="mb-5 text-xs text-gray-400">
            Source: US Census Bureau self-reported data
          </p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              layout="vertical"
              data={ethnicityData}
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#4b5563' }}
                axisLine={false}
                tickLine={false}
                width={190}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === 'number'
                    ? [`${value}%`, 'Share of population']
                    : [String(value ?? ''), '']
                }
              />
              <Bar dataKey="pct" fill="#6b7280" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Source:{' '}
          <a href={d.sourceUrl} className="underline hover:text-gray-600" rel="noopener noreferrer">
            {d.source}
          </a>{' '}
          — {d.year}.{d.dataNote ? ` ${d.dataNote}` : ''}
        </p>
      </div>
    </section>
  );
}
