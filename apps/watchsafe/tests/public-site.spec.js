import { test, expect } from '@playwright/test';
import { recordFinding } from '../../../engine/findings.js';
import { config } from './helpers.js';

// Public marketing site: every page loads, nothing errors, pricing copy matches the plans.
// Signed out, so it runs even before QA accounts exist.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public site', () => {
  for (const path of config.publicPages) {
    test(`${path} loads without errors`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `${path} status`).toBeLessThan(400);
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForTimeout(1500);
      if (errors.length) {
        recordFinding(test.info(), {
          app: config.app,
          check: 'site.page-error',
          subject: path,
          severity: 'p2',
          title: `JavaScript error on ${path}`,
          details: errors.slice(0, 5).join('\n'),
        });
      }
    });
  }

  test('pricing page shows the real plan prices', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    const text = await page.locator('body').innerText();
    for (const [plan, price] of Object.entries(config.prices)) {
      if (!text.includes(price)) {
        recordFinding(test.info(), {
          app: config.app,
          check: 'site.pricing-copy',
          subject: plan,
          severity: 'p1',
          title: `Pricing page doesn't show ${price} for ${plan}`,
        });
      }
      expect(text).toContain(price);
    }
  });

  test('internal links on the home page resolve', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
    const broken = [];
    for (const href of hrefs.filter((h) => !h.startsWith('//')).slice(0, 60)) {
      const res = await request.get(new URL(href, config.baseURL).toString());
      if (res.status() >= 400) broken.push(`${href} → ${res.status()}`);
    }
    if (broken.length) {
      recordFinding(test.info(), {
        app: config.app,
        check: 'site.broken-links',
        severity: 'p2',
        title: `${broken.length} broken links on the home page`,
        details: broken.join('\n'),
      });
    }
    expect(broken).toEqual([]);
  });
});
