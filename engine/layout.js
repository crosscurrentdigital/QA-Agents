// Layout checks for small hands on tablets and phones.

export const MIN_TAP_TARGET_PX = 44; // Apple HIG minimum; Material uses 48dp

/** Visible buttons smaller than the minimum tap target, as [{ name, width, height }]. */
export async function smallTapTargets(page, { min = MIN_TAP_TARGET_PX, scope = 'body' } = {}) {
  return page.evaluate(({ min, scope }) => {
    const root = document.querySelector(scope) || document.body;
    const els = root.querySelectorAll('button, [role="button"], a[href]');
    const small = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden' || style.display === 'none') continue;
      if (r.width < min || r.height < min) {
        const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 60);
        small.push({ name, width: Math.round(r.width), height: Math.round(r.height) });
      }
    }
    return small;
  }, { min, scope });
}

/** True when the page scrolls sideways, which on a tablet usually means something is cut off. */
export async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.scrollingElement.scrollWidth > window.innerWidth + 1);
}

/** Rotate the viewport (portrait ↔ landscape) the way a tablet does mid-use. */
export async function rotate(page) {
  const { width, height } = page.viewportSize();
  await page.setViewportSize({ width: height, height: width });
  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
}
