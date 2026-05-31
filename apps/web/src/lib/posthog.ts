import posthog from 'posthog-js';

export function initPostHog(): void {
  const key = import.meta.env.PUBLIC_POSTHOG_KEY as string | undefined;
  if (!key) return;

  posthog.init(key, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'never',
    autocapture: false,
  });
}

// Typed event tracking — no PII, anonymous session IDs only
export function track(event: 'dashboard_viewed' | 'feedback_opened' | 'feedback_submitted'): void;
export function track(event: 'section_scrolled', properties: { section: string }): void;
export function track(event: 'verdict_clicked', properties: { verdict: string }): void;
export function track(event: 'blog_post_viewed', properties: { slug: string }): void;
export function track(event: string, properties?: Record<string, string>): void {
  posthog.capture(event, properties ?? {});
}
