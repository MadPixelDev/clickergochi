import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/artifacts',
  timeout: 30_000,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: `http://localhost:${port}`,
    // Без GPU headless-Chromium рендерит WebGL программно (~5 fps) — скриншоты не отражают реальный отклик.
    launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
