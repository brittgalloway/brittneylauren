import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Run tests in parallel — safe since these are all read-only or
  // isolated interactions against the dev server.
  fullyParallel: true,
  // Fail the build on CI if tests were accidentally left in .only mode.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',

  use: {
    baseURL: 'http://127.0.0.1:5500/src/',
    // Keep traces on first retry so failures are diagnosable.
    trace: 'on-first-retry',
  },

  // Expects `vercel dev` to already be running on port 3000.
  // Start it manually before running tests:
  //   vercel dev &
  //   npx playwright test
  //
  // Or let Playwright start it automatically via webServer below.
  // Uncomment if you want Playwright to manage the server:
  //
  // webServer: {
  //   command: 'vercel dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 30_000,
  // },
});
