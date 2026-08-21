import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the vacancy application flow.
 *
 * These tests run against a DEPLOYED site (Vercel preview or a designated
 * test environment), never against mocked pages. Required env:
 *
 *   E2E_BASE_URL           e.g. https://confair-website-git-xyz.vercel.app
 *   E2E_TEST_VACANCY_SLUG  slug of a designated TEST vacancy
 *   E2E_APPLY_ENABLED=1    opt-in for the full flow — it creates REAL
 *                          applications in Supabase + Carerix
 *
 * Without them the specs self-skip (see tests/e2e/apply-flow.spec.ts).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
});
