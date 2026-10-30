import { devices } from '@playwright/test';

// Tablet-first device matrix. Younger kids mostly watch on tablets, so tablets run first and
// in both orientations; phones follow. WebKit stands in for iPadOS/iOS (WKWebView in the
// Capacitor wrapper), Chromium for Android (Android System WebView).
const landscape = (d) => ({ ...d, viewport: { width: d.viewport.height, height: d.viewport.width } });

export const DEVICE_MATRIX = [
  { name: 'ipad-portrait', group: 'tablet', use: { ...devices['iPad (gen 7)'] } },
  { name: 'ipad-landscape', group: 'tablet', use: { ...devices['iPad (gen 7) landscape'] } },
  { name: 'android-tablet-portrait', group: 'tablet', use: { ...devices['Galaxy Tab S4'] } },
  { name: 'android-tablet-landscape', group: 'tablet', use: { ...landscape(devices['Galaxy Tab S4']) } },
  { name: 'iphone', group: 'phone', use: { ...devices['iPhone 13'] } },
  { name: 'android-phone', group: 'phone', use: { ...devices['Pixel 7'] } },
];

/** Projects for playwright.config.js. QA_DEVICES=tablet|phone|<name>,<name> narrows the run. */
export function deviceProjects(filter = process.env.QA_DEVICES) {
  const wanted = (filter || '').split(',').map((s) => s.trim()).filter(Boolean);
  return DEVICE_MATRIX.filter(
    (d) => wanted.length === 0 || wanted.includes(d.group) || wanted.includes(d.name)
  ).map(({ name, use }) => ({ name, use }));
}

export const isTablet = (projectName) => DEVICE_MATRIX.find((d) => d.name === projectName)?.group === 'tablet';
