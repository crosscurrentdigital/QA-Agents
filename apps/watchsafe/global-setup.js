import fs from 'node:fs';
import { chromium } from '@playwright/test';
import config from './app.config.js';

export const STORAGE_STATE = '.auth/watchsafe.json';
export const TOKEN_FILE = '.auth/watchsafe-token.json';

// Signs the QA parent in once per run through the real login form and saves the session for
// every device project. Login is rate limited, so never sign in per test.
export default async function globalSetup() {
  fs.mkdirSync('.auth', { recursive: true });
  const { parentEmail, parentPassword } = config.qa;
  if (!parentEmail || !parentPassword) {
    fs.writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }));
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token: null }));
    console.warn('[qa] No QA parent login set; signed-in checks will be skipped.');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: config.baseURL });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const toggle = page.getByRole('button', { name: /already have an account\? sign in/i });
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(parentEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(parentPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/dashboard|\/onboarding|\/child\//, { timeout: 60_000 });

  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  if (!token) throw new Error('[qa] Signed in but no auth_token in localStorage; the login flow changed.');
  await page.context().storageState({ path: STORAGE_STATE });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token }));
  await browser.close();
}
