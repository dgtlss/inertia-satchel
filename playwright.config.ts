import { defineConfig } from '@playwright/test';

const target = process.env.SATCHEL_SSR === 'true' ? 'vue-ssr' : process.env.SATCHEL_FRAMEWORK ?? 'vue';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  testMatch: process.env.SATCHEL_SSR === 'true' ? 'ssr.test.ts' : 'frontend.test.ts',
  outputDir: `test-results/playwright/${target}/artifacts`,
  reporter: [['list'], ['json', { outputFile: `test-results/playwright/${target}/results.json` }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:8000',
    browserName: 'chromium',
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-example.mjs',
    url: 'http://127.0.0.1:8000/up',
    timeout: 120_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    stdout: 'pipe',
  },
});
