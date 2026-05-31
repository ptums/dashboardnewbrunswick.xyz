import { useState, useEffect } from 'react';
import type { DashboardResponse } from '@repo/shared';
import { fetchDashboard } from '../lib/dashboardApi';

type Status = 'loading' | 'success' | 'error';
type Indicator = 'green' | 'yellow' | 'red';

// Color thresholds — based on NJ/national education benchmarks

function proficiencyColor(pct: number): Indicator {
  if (pct >= 50) return 'green';
  if (pct >= 25) return 'yellow';
  return 'red';
}

function graduationColor(pct: number): Indicator {
  if (pct >= 80) return 'green';
  if (pct >= 60) return 'yellow';
  return 'red';
}

function studentTeacherColor(ratio: number): Indicator {
  if (ratio <= 15) return 'green';
  if (ratio <= 20) return 'yellow';
  return 'red';
}

function povertyRateColor(pct: number): Indicator {
  if (pct < 50) return 'green';
  if (pct < 75) return 'yellow';
  return 'red';
}

const DOT_CLASSES: Record<Indicator, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

function MetricRow({
  label,
  value,
  indicator,
}: {
  label: string;
  value: string;
  indicator: Indicator;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 flex-shrink-0 rounded-full ${DOT_CLASSES[indicator]}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-1 h-5 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mb-4 h-3 w-48 animate-pulse rounded bg-gray-100" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex justify-between border-b border-gray-100 py-3 last:border-0">
          <div className="h-3 w-36 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

const SECTION_CLS = 'border-b border-gray-100 bg-gray-50 px-4 py-16';
const INNER_CLS = 'mx-auto max-w-4xl';

function SectionTitle() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="h-6 w-1 rounded bg-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">Schools</h2>
    </div>
  );
}

export default function SchoolsSection() {
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
      <section id="schools" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <div className="mb-6 h-4 w-80 animate-pulse rounded bg-gray-300" />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error' || data?.schools == null) {
    return (
      <section id="schools" className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <SectionTitle />
          <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            School data temporarily unavailable.
          </p>
        </div>
      </section>
    );
  }

  const schools = data.schools;
  const ps = schools.publicSchools;
  const ru = schools.rutgers;

  return (
    <section id="schools" className={SECTION_CLS}>
      <div className={INNER_CLS}>
        <SectionTitle />
        <p className="mb-6 text-sm text-gray-500">
          New Brunswick public school performance and Rutgers University at a glance.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Public Schools */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Public Schools</p>
            <p className="mb-2 mt-0.5 text-xs text-gray-400">
              New Brunswick City School District — {ps.enrollment.toLocaleString()} students enrolled
            </p>
            <MetricRow
              label="Math proficiency"
              value={`${ps.mathProficiency.toFixed(0)}%`}
              indicator={proficiencyColor(ps.mathProficiency)}
            />
            <MetricRow
              label="Reading proficiency"
              value={`${ps.readingProficiency.toFixed(0)}%`}
              indicator={proficiencyColor(ps.readingProficiency)}
            />
            <MetricRow
              label="Graduation rate"
              value={`${ps.graduationRate.toFixed(0)}%`}
              indicator={graduationColor(ps.graduationRate)}
            />
            <MetricRow
              label="Students per teacher"
              value={`${ps.studentTeacherRatio.toFixed(0)}:1`}
              indicator={studentTeacherColor(ps.studentTeacherRatio)}
            />
            <MetricRow
              label="Students receiving free/reduced lunch"
              value={`${ps.povertyRate.toFixed(0)}%`}
              indicator={povertyRateColor(ps.povertyRate)}
            />
          </div>

          {/* Rutgers */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Rutgers University</p>
            <p className="mb-2 mt-0.5 text-xs text-gray-400">
              Rutgers University is located in New Brunswick
            </p>
            <InfoRow
              label="6-year graduation rate"
              value={`${ru.graduationRate.toFixed(0)}%`}
            />
            <InfoRow
              label="Acceptance rate"
              value={`${ru.acceptanceRate.toFixed(0)}%`}
            />
            <InfoRow
              label="Students per faculty member"
              value={`${ru.studentFacultyRatio.toFixed(0)}:1`}
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Source:{' '}
          <a
            href={schools.sourceUrl}
            className="underline hover:text-gray-600"
            rel="noopener noreferrer"
          >
            {schools.source}
          </a>
          .{schools.dataNote ? ` ${schools.dataNote}` : ''}
        </p>
      </div>
    </section>
  );
}
