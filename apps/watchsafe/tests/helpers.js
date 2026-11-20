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

/**
 * Enter Kids Mode the way a parent does: dashboard -> "Watch Now" on the QA child's card.
 * A typed /child/<id> URL is (correctly) bounced to /login unless the child is active in Kids Mode,
 * so tests must go through the dashboard.
 */
export async function enterKidsMode(page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const watchNow = page.getByRole('button', { name: /watch now/i }).first();
  const skip = page.getByRole('button', { name: /skip this step|not now/i }).first();
  const next = page.getByRole('button', { name: /^continue|go to dashboard|finish/i }).first();
  // The dashboard can bounce to a leftover onboarding step (e.g. Curated Lists); finish it like a parent.
  for (let i = 0; i < 6; i++) {
    await watchNow.or(skip).or(next).first().waitFor({ timeout: 20_000 });
    if (await watchNow.isVisible().catch(() => false)) break;
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await next.click();
    await page.waitForTimeout(1000);
  }
  // A family still on the default PIN gets a "Create a PIN" dialog over the dashboard. Set the QA PIN once.
  const pinDialog = page.locator('[aria-labelledby="pin-setup-title"]');
  if (await pinDialog.isVisible().catch(() => false)) {
    const pin = process.env.QA_WATCHSAFE_PARENT_PIN || '13579';
    for (const label of ['Continue', 'Set PIN']) {
      for (let i = 0; i < 5; i++) await pinDialog.getByLabel(`PIN digit ${i + 1}`).fill(pin[i]);
      await pinDialog.getByRole('button', { name: label, exact: true }).click();
      await page.waitForTimeout(800);
    }
    await pinDialog.waitFor({ state: 'hidden', timeout: 15_000 });
  }
  await watchNow.click({ timeout: 20_000 });
  await page.waitForURL(new RegExp(`/child/${config.qa.childId}`), { timeout: 20_000 });
}

/** Kids Mode opens on the Channels tab; the video grid is on the Videos tab. */
export async function openVideosTab(page) {
  const videosTab = page.getByRole('tab', { name: /^videos$/i }).or(page.getByRole('button', { name: /^videos$/i })).first();
  await videosTab.waitFor({ timeout: 15_000 }).catch(() => {});
  if (await videosTab.isVisible().catch(() => false)) await videosTab.click();
}

/** Open the QA child's view and start the first approved video. Returns the player iframe locator. */
export async function openChildAndPlay(page) {
  await enterKidsMode(page);
  const firstVideo = page.getByRole('button', { name: /^Play video:/ }).first();
  await openVideosTab(page);
  try {
    await firstVideo.waitFor({ timeout: 20_000 });
  } catch (err) {
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
    throw new Error(`Child view showed no videos. URL: ${page.url()} | Page text: ${text}`, { cause: err });
  }
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
  // The prompt lives inside YouTube's cross-origin iframe, so page text alone can't see it.
  // Check the app's own bot-detection banner and every frame's text.
  const re = /confirm you.?re not a bot|sign in to confirm|YouTube Bot Detection/i;
  if (await page.getByText(re).first().isVisible().catch(() => false)) return true;
  for (const frame of page.frames()) {
    const text = await frame.locator('body').innerText({ timeout: 2000 }).catch(() => '');
    if (re.test(text)) return true;
  }
  return false;
}

// ---- Player health -------------------------------------------------------------------------
// YouTube's IFrame API reports state and errors to the parent page with postMessage. Collecting
// those lets a test tell "playing" from "stuck", and name the error YouTube gave (150/153 etc.).

export const YT_ERRORS = {
  2: 'invalid video id',
  5: 'HTML5 player error',
  100: 'video not found or private',
  101: 'embedding disabled by the owner',
  150: 'embedding disabled by the owner',
  153: 'player configuration error (no Referer sent), the Nov 8 iOS failure',
};

/** Call before the page loads the player. Collects YouTube/relay postMessages into window.__qaYT. */
export async function monitorPlayer(page) {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    window.__qaYT = [];
    window.addEventListener('message', (e) => {
      if (!/^https:\/\/(www\.youtube(-nocookie)?\.com|watchsafe\.app)$/.test(e.origin)) return;
      let d = e.data;
      try { if (typeof d === 'string') d = JSON.parse(d); } catch { return; }
      if (d && d.event) window.__qaYT.push({ t: Date.now(), event: d.event, info: d.info ?? null });
    });
  });
}

/** Summarise what the player has reported so far. */
export async function playerReport(page) {
  const events = await page.evaluate(() => window.__qaYT || []).catch(() => []);
  let state = null;
  let maxTime = 0;
  let errorCode = null;
  for (const e of events) {
    if (e.event === 'onError') errorCode = typeof e.info === 'number' ? e.info : Number(e.info?.code ?? e.info);
    if (e.event === 'onStateChange' && typeof e.info === 'number') state = e.info;
    if (e.event === 'infoDelivery' && e.info) {
      if (typeof e.info.playerState === 'number') state = e.info.playerState;
      if (typeof e.info.currentTime === 'number') maxTime = Math.max(maxTime, e.info.currentTime);
    }
  }
  return { events: events.length, state, maxTime, errorCode };
}

/** Ask the player to start reporting (the IFrame API handshake), whichever frame is the player. */
export async function startListening(page) {
  for (const frame of page.frames()) {
    if (frame === page.mainFrame() || !/youtube|yt-embed/.test(frame.url())) continue;
    const el = await frame.frameElement().catch(() => null);
    if (el) await el.evaluate((f) => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*')).catch(() => {});
  }
}

/**
 * Wait until the video is playing (state 1 or the clock moving), YouTube reports an error, or the
 * time runs out. Returns { outcome: 'playing'|'error'|'bot-check'|'stalled', ...report }.
 */
export async function waitForPlayback(page, { timeout = 30_000 } = {}) {
  const deadline = Date.now() + timeout;
  let report = await playerReport(page);
  while (Date.now() < deadline) {
    await startListening(page);
    await page.waitForTimeout(1000);
    report = await playerReport(page);
    if (report.errorCode) return { outcome: 'error', ...report };
    if (report.state === 1 || report.maxTime > 1) return { outcome: 'playing', ...report };
    if (await botCheckShowing(page)) return { outcome: 'bot-check', ...report };
  }
  return { outcome: 'stalled', ...report };
}
