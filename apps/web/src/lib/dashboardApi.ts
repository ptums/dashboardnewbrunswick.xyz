import type { DashboardResponse } from '@repo/shared';

const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? '';

// Module-level cache — both islands share the same promise so only one HTTP request fires.
let inflightRequest: Promise<DashboardResponse> | null = null;

export function fetchDashboard(): Promise<DashboardResponse> {
  if (inflightRequest) return inflightRequest;

  inflightRequest = fetch(`${apiUrl}/api/dashboard`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<DashboardResponse>;
    })
    .catch((err: unknown) => {
      // Allow future callers to retry after a failure.
      inflightRequest = null;
      throw err;
    });

  return inflightRequest;
}
