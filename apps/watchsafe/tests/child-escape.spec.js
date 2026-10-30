import { test, expect } from '@playwright/test';
import { recordFinding } from '../../../engine/findings.js';
import { watchForEscapes, parseEmbed, embedProblems } from '../../../engine/escape.js';
import { config, requireQaAccount, openChildAndPlay, playerCommand, botCheckShowing } from './helpers.js';

// The escape test: from the child view, try every door YouTube's player leaves open and
// prove none of them leads out of WatchSafe. Runs on every device project, tablets first.

const finding = (overrides) => ({ app: config.app, severity: 'p0', ...overrides });

test.describe('Child view escape test', () => {
  test.beforeEach(() => requireQaAccount());

  test('player embed leaves no way to other videos', async ({ page }) => {
    const iframe = await openChildAndPlay(page);
    const embed = parseEmbed(await iframe.getAttribute('src'));
    const problems = embedProblems(embed, { allowAuthenticatedEmbed: config.qa.premium });
    for (const p of problems) recordFinding(test.info(), finding({ ...p, details: `Embed src: ${await iframe.getAttribute('src')}` }));
    expect(problems.map((p) => p.check)).toEqual([]);
  });

  test('pausing removes the player before "More videos" can be tapped', async ({ page }) => {
    const iframe = await openChildAndPlay(page);
    await page.waitForTimeout(4000); // let playback start
    test.skip(await botCheckShowing(page), 'YouTube bot check is showing; covered by its own check');
    await playerCommand(iframe, 'pauseVideo');
    const resume = page.getByRole('button', { name: 'Resume video' }).first();
    const unmounted = await resume.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const iframeCount = await page.locator('iframe[src*="youtube"]').count();
    if (!unmounted || iframeCount > 0) {
      recordFinding(test.info(), finding({
        check: 'player.pause-unmount',
        title: 'Paused player stays on screen, so YouTube\'s "More videos" row is tappable',
        details: `Resume button shown: ${unmounted}. YouTube iframes left on page: ${iframeCount}.`,
        suggestedFix: 'VideoPlayerWrapper.handlePlayerPaused should unmount the iframe on state 2.',
      }));
    }
    expect(unmounted && iframeCount === 0).toBe(true);
  });

  test('tapping the YouTube logo, title and player edges never leaves the app', async ({ page }) => {
    const iframe = await openChildAndPlay(page);
    await page.waitForTimeout(3000);
    const watcher = watchForEscapes(page, { allowedHosts: config.allowedHosts });
    const frame = page.frameLocator('iframe[src*="youtube"]').first();
    // In normal mode these exist and link to YouTube; in strict mode they are hidden.
    for (const selector of ['.ytp-youtube-button', '.ytp-title-link', '.ytp-title-channel-logo', '.ytp-watermark']) {
      const el = frame.locator(selector).first();
      if (await el.isVisible().catch(() => false)) await el.click({ force: true, timeout: 3000 }).catch(() => {});
    }
    // Small fingers miss: tap just inside each corner of the player too.
    const box = await iframe.boundingBox();
    if (box) {
      for (const [x, y] of [[8, 8], [box.width - 8, 8], [8, box.height - 8], [box.width - 8, box.height - 8]]) {
        await page.mouse.click(box.x + x, box.y + y).catch(() => {});
      }
    }
    await page.waitForTimeout(2500);
    watcher.stop();
    for (const e of watcher.escapes) {
      recordFinding(test.info(), finding({
        check: `escape.${e.kind}`,
        subject: new URL(e.url, config.baseURL).hostname,
        title: `A tap in the child player opened ${e.url}`,
        details: `Escape kind: ${e.kind}.`,
        suggestedFix: 'Intercept navigation from the player (VideoPlayer onExternalLinkAttempt) and, in Capacitor, block window.open to non-WatchSafe hosts.',
      }));
    }
    expect(watcher.escapes).toEqual([]);
    expect(new URL(page.url()).pathname).toContain('/child/');
  });

  test('the end of a video shows no suggestions and plays nothing next', async ({ page }) => {
    const iframe = await openChildAndPlay(page);
    await page.waitForTimeout(4000);
    test.skip(await botCheckShowing(page), 'YouTube bot check is showing; covered by its own check');
    const videoSrc = await iframe.getAttribute('src');
    // Jump to the last seconds, then let it end.
    await playerCommand(iframe, 'seekTo', [1e6, true]);
    await page.waitForTimeout(8000);
    const endScreen = await page.frameLocator('iframe[src*="youtube"]').first()
      .locator('.ytp-endscreen-content .ytp-videowall-still, .ytp-ce-element').first()
      .isVisible().catch(() => false);
    const stillPlayer = page.locator('iframe[src*="youtube"]').first();
    const nextSrc = (await stillPlayer.count()) ? await stillPlayer.getAttribute('src') : null;
    if (endScreen) {
      recordFinding(test.info(), finding({
        check: 'player.end-screen',
        title: 'YouTube\'s end screen with other videos shows when a video finishes',
        suggestedFix: 'Return to the video list on state 0 (VideoPlayerWrapper.handleVideoEnded) before YouTube draws the end screen.',
      }));
    }
    if (nextSrc && parseEmbed(nextSrc).videoId !== parseEmbed(videoSrc).videoId) {
      recordFinding(test.info(), finding({
        check: 'player.autoplay-next',
        title: 'Another video started on its own after the first one ended',
        details: `First: ${parseEmbed(videoSrc).videoId}. Then: ${parseEmbed(nextSrc).videoId}.`,
      }));
    }
    expect(endScreen).toBe(false);
  });

  test('YouTube\'s bot check is caught, not shown with its Google sign-in link', async ({ page }) => {
    await openChildAndPlay(page);
    await page.waitForTimeout(5000);
    const frame = page.frameLocator('iframe[src*="youtube"]').first();
    const rawBotPrompt = await frame.getByText(/sign in to confirm you.?re not a bot/i).first().isVisible().catch(() => false);
    const appHelp = await botCheckShowing(page);
    if (rawBotPrompt && !appHelp) {
      recordFinding(test.info(), finding({
        check: 'player.bot-check-uncaught',
        severity: 'p1',
        title: 'YouTube\'s "confirm you\'re not a bot" prompt shows inside the child player with a Google sign-in link',
        suggestedFix: 'VideoPlayer onBotDetection should fire for this state and the wrapper should cover the iframe.',
      }));
    } else if (rawBotPrompt) {
      recordFinding(test.info(), finding({
        check: 'player.bot-check-seen',
        severity: 'info',
        title: 'YouTube showed its bot check on this device; WatchSafe caught it',
      }));
    }
    expect(rawBotPrompt && !appHelp).toBe(false);
  });

  test('no playlist player appears anywhere in the child view', async ({ page }) => {
    await page.goto(`/child/${config.qa.childId}`, { waitUntil: 'networkidle' });
    const srcs = await page.locator('iframe').evaluateAll((els) => els.map((e) => e.src));
    const playlistEmbeds = srcs.filter((s) => /videoseries|[?&]list=/.test(s));
    if (playlistEmbeds.length) {
      recordFinding(test.info(), finding({
        check: 'child.playlist-embed',
        title: 'The child view shows a full YouTube playlist player',
        details: playlistEmbeds.join('\n'),
        suggestedFix: 'PlaylistView and ItemPreviewModal are parent-only; keep them out of ChildView.',
      }));
    }
    expect(playlistEmbeds).toEqual([]);
  });
});
