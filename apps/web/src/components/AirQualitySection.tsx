import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardResponse } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';

// EPA standard AQI category colors (exact hex values per epa.gov/aqi)
const AQI_CONFIGS: Record<string, { bg: string; textClass: string; label: string }> = {
  Good: { bg: '#00e400', textClass: 'text-gray-900', label: 'Good' },
  Moderate: { bg: '#ffff00', textClass: 'text-gray-900', label: 'Moderate' },
  'Unhealthy for Sensitive Groups': {
    bg: '#ff7e00',
    textClass: 'text-white',
    label: 'Sensitive Groups',
  },
  Unhealthy: { bg: '#ff0000', textClass: 'text-white', label: 'Unhealthy' },
  'Very Unhealthy': { bg: '#8f3f97', textClass: 'text-white', label: 'Very Unhealthy' },
  Hazardous: { bg: '#7e0023', textClass: 'text-white', label: 'Hazardous' },
};

function getAqiConfig(category: string) {
  return AQI_CONFIGS[category] ?? { bg: '#9ca3af', textClass: 'text-white', label: category };
}

const BAR_COLORS: Record<string, string> = {
  'New Brunswick': '#2563eb',
  'NJ Average': '#9ca3af',
  National: '#d1d5db',
};

const SECTION_CLS = 'border-b border-gray-100 bg-gray-50 px-4 py-16';
const INNER_CLS = 'mx-auto max-w-4xl';

function SectionTitle() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="h-6 w-1 rounded bg-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">Air Quality</h2>
    </div>
  );
}

function PollutantCard({
  label,
  plainLabel,
  value,
  unit,
  description,
}: {
  label: string;
  plainLabel: string;
  value: number;
  unit: string;
  description: string;
}) {
  const decimals = unit === 'ppm' ? 3 : 1;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-0.5 text-xs text-gray-400">{plainLabel}</p>
      <p className="mt-4 text-3xl font-bold text-gray-800">
        {value.toFixed(decimals)}
        <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}

export default function AirQualitySection() {
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
      <section id="air-quality" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-200" />
          <div className="mb-6 h-28 animate-pulse rounded-2xl bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-100" />
                <div className="mt-4 h-8 w-20 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="mt-8 h-48 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </section>
    );
  }

  if (status === 'error' || data?.airQuality == null) {
    return (
      <section id="air-quality" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Air quality data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const aq = data.airQuality;
  const cfg = getAqiConfig(aq.aqi.category);
  const sourceYear = new Date(aq.lastUpdated).getFullYear();

  const chartData = [
    { name: 'New Brunswick', aqi: Math.round(aq.aqi.value) },
    { name: 'NJ Average', aqi: Math.round(aq.vsNjAverage) },
    { name: 'National', aqi: Math.round(aq.vsNationalAverage) },
  ];

  return (
    <section id="air-quality" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          How clean is the air in New Brunswick?{' '}
          <span className="font-medium text-green-700">Lower AQI numbers are better.</span>
        </p>

        {/* Hero AQI — EPA standard background color */}
        <div
          className={`mb-6 flex flex-col gap-4 rounded-2xl px-8 py-6 sm:flex-row sm:items-center sm:justify-between ${cfg.textClass}`}
          style={{ backgroundColor: cfg.bg }}
        >
          <div>
            <p className="text-4xl font-extrabold">{cfg.label}</p>
            <p className={`mt-1 text-sm ${cfg.textClass === 'text-white' ? 'opacity-80' : 'text-gray-600'}`}>
              Current EPA air quality category
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-5xl font-extrabold">{aq.aqi.value}</p>
            <p
              className={`mt-1 text-xs ${cfg.textClass === 'text-white' ? 'opacity-75' : 'text-gray-500'}`}
            >
              Air Quality Index out of 500 — lower is better
            </p>
          </div>
        </div>

        {/* Sub-metric cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PollutantCard
            label="PM2.5"
            plainLabel="Tiny particles in the air"
            value={aq.pm25}
            unit="μg/m³"
            description="Fine particles smaller than 2.5 micrometers that can enter the lungs and bloodstream."
          />
          <PollutantCard
            label="PM10"
            plainLabel="Larger particles in the air"
            value={aq.pm10}
            unit="μg/m³"
            description="Coarser particles smaller than 10 micrometers that can irritate the nose and airways."
          />
          <PollutantCard
            label="Ozone"
            plainLabel="Ground-level ozone"
            value={aq.ozone}
            unit="ppm"
            description="Ground-level ozone formed when sunlight reacts with car exhaust and industrial emissions."
          />
        </div>

        {/* Comparison horizontal bar chart */}
        <div className="mt-8 rounded-xl border border-gray-100 bg-white p-4">
          <p className="mb-4 text-sm font-medium text-gray-700">AQI Comparison — lower is better</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={112}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === 'number' ? [`${value} AQI`, ''] : [String(value ?? ''), '']
                }
              />
              <Bar dataKey="aqi" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={BAR_COLORS[entry.name] ?? '#9ca3af'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Source:{' '}
          <a href={aq.sourceUrl} className="underline hover:text-gray-600" rel="noopener noreferrer">
            {aq.source}
          </a>{' '}
          — {sourceYear}.{aq.dataNote ? ` ${aq.dataNote}` : ''}
        </p>
      </div>
    </section>
  );
}
