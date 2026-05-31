import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@repo/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  },
});
