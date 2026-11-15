import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  // GitHub Pages отдаёт сайт из /<repo>/ — путь передаётся из workflow.
  base: process.env.BASE_PATH ?? '/',
  plugins: [preact()],
  server: { host: true, port: 5173 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
