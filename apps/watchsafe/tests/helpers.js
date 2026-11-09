import fs from 'node:fs';
import { test } from '@playwright/test';
import config from '../app.config.js';
import { TOKEN_FILE } from '../global-setup.js';

export { config };

export function qaToken() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')).token;
  } catch {
    return null;
  }
}

/** Skip unless the QA parent signed in and the QA child is configured. */
export function requireQaAccount() {
  test.skip(!qaToken() || !config.qa.childId, 'QA parent login and QA_WATCHSAFE_CHILD_ID are not set');
}

/** API checks don't depend on the device; run them once, on the first project in the run. */
export function onlyOnFirstDevice() {
  const info = test.info();
  test.skip(info.project.name !== info.config.projects[0].name, 'API check runs once per run');
}

export async function authorizePlayback(request, childId, videoId, { token = qaToken() } = {}) {
  const res = await request.post(`${config.apiURL}/api/children/${childId}/authorize-playback`, {
    data: { video_id: videoId },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}

/** Open the QA child's view and start the first approved video. Returns the player iframe locator. */
export async function openChildAndPlay(page) {
  await page.goto(`/child/${config.qa.childId}`, { waitUntil: 'domcontentloaded' });
  const firstVideo = page.getByRole('button', { name: /^Play video:/ }).first();
  await firstVideo.waitFor({ timeout: 30_000 });
  await firstVideo.click();
  const iframe = page.locator('iframe[src*="youtube"]').first();
  await iframe.waitFor({ timeout: 30_000 });
  return iframe;
}

/** Send a YouTube IFrame API command (the embed has enablejsapi=1). */
export async function playerCommand(iframe, func, args = []) {
  await iframe.evaluate((el, { func, args }) => {
    el.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  }, { func, args });
}

export async function botCheckShowing(page) {
  return page.getByText(/confirm you.?re not a bot|sign in to confirm/i).first().isVisible().catch(() => false);
}
