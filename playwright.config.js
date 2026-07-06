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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // IMPORTANT: tests must run against `vercel dev` on port 3000
  webServer: {
    command: 'vercel dev --listen 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
