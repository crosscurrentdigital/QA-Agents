import { test, expect } from '@playwright/test';
import { recordFinding } from '../../../engine/findings.js';
import { isTablet } from '../../../engine/devices.js';
import { parseEmbed } from '../../../engine/escape.js';
import { smallTapTargets, hasHorizontalOverflow, rotate, MIN_TAP_TARGET_PX } from '../../../engine/layout.js';
import { config, requireQaAccount, openChildAndPlay } from './helpers.js';

// Tablet checks. Younger kids mostly watch on tablets, tap more and tap by accident.

test.describe('Tablet checks', () => {
  test.beforeEach(() => {
    requireQaAccount();
    test.skip(!isTablet(test.info().project.name), 'Tablet-only check');
  });

  test('turning the tablet mid-video keeps the child on the same approved video', async ({ page }) => {
    const iframe = await openChildAndPlay(page);
    const before = parseEmbed(await iframe.getAttribute('src')).videoId;
    await page.waitForTimeout(3000);
    await rotate(page);
    await page.waitForTimeout(2500);
    await rotate(page);
    await page.waitForTimeout(2500);
    expect(new URL(page.url()).pathname).toContain(`/child/${config.qa.childId}`);
    const player = page.locator('iframe[src*="youtube"]').first();
    const resume = page.getByRole('button', { name: 'Resume video' }).first();
    const hasPlayer = (await player.count()) > 0;
    const after = hasPlayer ? parseEmbed(await player.getAttribute('src')).videoId : null;
    const ok = (hasPlayer && after === before) || (await resume.isVisible().catch(() => false));
    if (!ok) {
      recordFinding(test.info(), {
        app: config.app,
        check: 'tablet.rotate',
        severity: 'p1',
        title: 'Turning the tablet mid-video loses the video or switches to a different one',
        details: `Before: ${before}. After: ${after ?? 'no player, no Resume button'}.`,
      });
    }
    expect(ok).toBe(true);
  });

  test('child view fits the tablet and buttons are big enough for small fingers', async ({ page }) => {
    await page.goto(`/child/${config.qa.childId}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Play video:/ }).first().waitFor({ timeout: 30_000 });
    if (await hasHorizontalOverflow(page)) {
      recordFinding(test.info(), {
        app: config.app,
        check: 'tablet.horizontal-overflow',
        severity: 'p2',
        title: 'Child view scrolls sideways on tablets, so part of the screen is cut off',
      });
    }
    const small = await smallTapTargets(page);
    if (small.length) {
      recordFinding(test.info(), {
        app: config.app,
        check: 'tablet.tap-targets',
        severity: 'p2',
        title: `${small.length} child-view buttons are smaller than ${MIN_TAP_TARGET_PX}px`,
        details: small.slice(0, 15).map((s) => `- ${s.name} (${s.width}×${s.height})`).join('\n'),
        suggestedFix: `Give child-facing buttons at least a ${MIN_TAP_TARGET_PX}×${MIN_TAP_TARGET_PX}px hit area.`,
      });
    }
    // Layout findings are soft: they file an issue but don't fail the run.
    expect(true).toBe(true);
  });
});
