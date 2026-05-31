/// <reference types="astro/client" />
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN_WEB as string | undefined,
  environment: import.meta.env.MODE,
  // Keep traces off to stay within free tier limits
  tracesSampleRate: 0,
});
