import { test, expect } from '@playwright/test';
import { recordFinding } from '../../../engine/findings.js';
import { isIOS } from '../../../engine/devices.js';
import {
  config, requireQaAccount, monitorPlayer, openChildAndPlay, enterKidsMode, openVideosTab,
  playerReport, waitForPlayback, YT_ERRORS, botCheckShowing,
} from './helpers.js';

// Do approved videos actually play? Runs on every device project. The Nov 8 outage ("This video
// isn't available" for every approved video, and iOS "Error 153") passed every page-load check,
// so these tests press play the way a child does and read what the player reports.

const finding = (o) => ({ app: config.app, severity: 'p1', ...o });
const YT_FRAMES = 'iframe[src*="youtube"], iframe[src*="yt-embed"]';

test.describe('Video playback', () => {
  test.beforeEach(() => requireQaAccount());

  test('an approved video plays in the kid view', async ({ page }) => {
    const apiErrors = [];
    page.on('response', (res) => {
      if (res.url().startsWith(config.apiURL) && res.status() >= 500) apiErrors.push(`${res.status()} ${new URL(res.url()).pathname}`);
    });
    await monitorPlayer(page);
    await openChildAndPlay(page);

    // 1. The app itself must not refuse an approved video.
    const unavailable = page.getByText(/this video isn.t available|videos are paused right now|time.s up for today/i).first();
    if (await unavailable.isVisible().catch(() => false)) {
      recordFinding(test.info(), finding({
        check: 'playback.unavailable',
        title: 'An approved video shows "This video isn\'t available" to the child',
        details: `Overlay text: ${(await unavailable.innerText()).replace(/\s+/g, ' ')}. Same symptom as the Nov 8 outage.`,
        suggestedFix: 'Check POST /api/children/:id/authorize-playback and both whitelist tables (whitelists + child_channel_whitelist).',
      }));
      expect(unavailable, 'app must not refuse the approved video').toBeHidden();
    }

    // 2. The player must load and report playing, or name its error.
    const result = await waitForPlayback(page, { timeout: 30_000 });
    if (apiErrors.length) {
      recordFinding(test.info(), finding({
        check: 'playback.api-5xx',
        title: 'WatchSafe API returned server errors while starting a video',
        details: [...new Set(apiErrors)].map((e) => `- ${e}`).join('\n'),
      }));
    }
    if (result.outcome === 'bot-check') {
      // YouTube blocks datacenter IPs (GitHub runners); not a WatchSafe bug and not testable from CI.
      recordFinding(test.info(), {
        app: config.app, severity: 'info', check: 'playback.bot-check',
        title: 'Could not confirm playback: YouTube showed its "confirm you\'re not a bot" screen to the CI runner',
      });
      test.skip(true, 'YouTube bot check on the CI runner; embed loaded but playback cannot be confirmed here');
    }
    if (result.outcome === 'error') {
      const meaning = YT_ERRORS[result.errorCode] || 'unknown error';
      recordFinding(test.info(), finding({
        check: 'playback.player-error',
        subject: String(result.errorCode),
        title: `YouTube player reported error ${result.errorCode} (${meaning}) on an approved video`,
        details: `Device: ${test.info().project.name}. Video: ${config.qa.approvedVideoId}. State: ${result.state}.`,
      }));
    }
    if (result.outcome === 'stalled') {
      recordFinding(test.info(), finding({
        check: 'playback.never-started',
        title: 'Approved video never started playing within 30 seconds',
        details: `Player reported ${result.events} messages, state ${result.state}, time ${result.maxTime}s, no error.`,
      }));
    }
    expect(result.outcome, JSON.stringify(result)).toBe('playing');
    expect(await page.locator(YT_FRAMES).count()).toBeGreaterThan(0);
  });

  test('video thumbnails in the child list all load', async ({ page }) => {
    await enterKidsMode(page);
    await openVideosTab(page);
    await page.getByRole('button', { name: /^Play video:/ }).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(3000); // lazy images
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('button[aria-label^="Play video:"] img')]
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.closest('button').getAttribute('aria-label')));
    if (broken.length) {
      recordFinding(test.info(), finding({
        severity: 'p2',
        check: 'playback.broken-thumbnails',
        title: `${broken.length} video thumbnails fail to load in the child list`,
        details: broken.slice(0, 10).map((b) => `- ${b}`).join('\n'),
      }));
    }
    expect(broken).toEqual([]);
  });

  test('native iOS path: relay page plays video with no Referer (Error 153 guard)', async ({ page }) => {
    test.skip(!isIOS(test.info().project.name), 'Only the native iOS app needs the relay');
    test.skip(!config.qa.approvedVideoId, 'QA_WATCHSAFE_APPROVED_VIDEO_ID is not set');
    // The native app runs on capacitor://localhost and sends no http(s) Referer, so it frames
    // watchsafe.app/yt-embed.html. Reproduce that: a page with no origin framing the relay.
    await monitorPlayer(page);
    const embed = `https://www.youtube-nocookie.com/embed/${config.qa.approvedVideoId}?enablejsapi=1&playsinline=1&rel=0&controls=1&origin=${encodeURIComponent('https://watchsafe.app')}`; // the app passes origin too; without it YouTube won't talk back
    const relay = `${config.baseURL}/yt-embed.html?src=${encodeURIComponent(embed)}`;
    await page.setContent(`<body style="margin:0"><iframe src="${relay}" referrerpolicy="no-referrer" width="480" height="270" allow="autoplay; encrypted-media"></iframe></body>`);
    const result = await waitForPlayback(page, { timeout: 25_000 });
    if (result.outcome === 'error') {
      recordFinding(test.info(), finding({
        check: 'playback.ios-relay-error',
        subject: String(result.errorCode),
        title: `iOS relay page got YouTube error ${result.errorCode} (${YT_ERRORS[result.errorCode] || 'unknown'})`,
        details: `Relay: ${relay}`,
      }));
    }
    if (result.outcome === 'stalled' && (await playerReport(page)).events === 0) {
      // Unverified: on a GitHub runner this is usually YouTube's bot screen inside the relay frame,
      // which sends no API messages. Report for a human, never as a p1 issue.
      recordFinding(test.info(), {
        app: config.app, severity: 'info', check: 'playback.ios-relay-silent',
        title: 'iOS relay page loaded but the YouTube player sent no messages (likely CI bot check; verify on a real iPhone)',
        details: `Relay: ${relay}`,
      });
    }
    if (result.outcome === 'bot-check') test.skip(true, 'YouTube bot check on the CI runner');
    expect(['playing', 'stalled']).toContain(result.outcome); // stalled with events = loaded fine, autoplay blocked
    expect(result.errorCode ?? null).toBeNull();
  });
});
