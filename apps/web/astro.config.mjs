import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sentry from '@sentry/astro';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://dashboardnewbrunswick.xyz',
  integrations: [
    react(),
    tailwind(),
    sentry({
      sourceMapsUploadOptions: {
        project: 'dashboardnewbrunswick',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@repo/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  },
});
