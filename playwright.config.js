import { defineConfig } from '@playwright/test';
import { deviceProjects } from './engine/devices.js';

const app = process.env.QA_APP || 'watchsafe';
const { default: appConfig } = await import(`./apps/${app}/app.config.js`);

export default defineConfig({
  testDir: `./apps/${app}/tests`,
  globalSetup: `./apps/${app}/global-setup.js`,
  outputDir: 'qa-results/artifacts',
  timeout: 60_000,
  // Stop the run early when something systemic is broken (e.g. the child view never loads),
  // instead of letting every test time out for 40 minutes.
  maxFailures: process.env.CI ? 8 : 0,
  expect: { timeout: 15_000 },
  // Production with real accounts: keep load low and runs predictable.
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'qa-results/html', open: 'never' }],
    ['./engine/reporter.js', { app, outDir: 'qa-results' }],
  ],
  use: {
    baseURL: appConfig.baseURL,
    storageState: `.auth/${app}.json`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: deviceProjects(),
});
