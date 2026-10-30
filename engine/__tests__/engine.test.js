import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { fingerprint, mergeFindings } from '../findings.js';
import { parseEmbed, embedProblems, isAllowedHost, watchForEscapes } from '../escape.js';
import { GitHubIssues, fingerprintFromBody, issueBody } from '../github.js';
import { deviceProjects } from '../devices.js';
import { summaryMarkdown } from '../reporter.js';

const SAFE = 'https://www.youtube-nocookie.com/embed/abc123?rel=0&autoplay=1&playlist=abc123&loop=0&enablejsapi=1';

test('fingerprint ignores device and is stable', () => {
  const a = fingerprint({ app: 'watchsafe', check: 'player.rel', subject: '' });
  assert.equal(a, fingerprint({ app: 'watchsafe', check: 'player.rel', subject: '' }));
  assert.notEqual(a, fingerprint({ app: 'watchsafe', check: 'player.rel', subject: 'x' }));
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('mergeFindings collapses devices and keeps the worst severity', () => {
  const base = { app: 'w', check: 'c', fingerprint: 'f', title: 't' };
  const merged = mergeFindings([
    { ...base, severity: 'p2', device: 'ipad-portrait' },
    { ...base, severity: 'p0', device: 'iphone' },
    { ...base, severity: 'p0', device: 'iphone' },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].severity, 'p0');
  assert.deepEqual(merged[0].devices, ['ipad-portrait', 'iphone']);
});

test('a safe single-video embed has no problems', () => {
  assert.deepEqual(embedProblems(parseEmbed(SAFE)), []);
});

test('embed checks catch every way to other videos', () => {
  const checks = (src, opts) => embedProblems(parseEmbed(src), opts).map((p) => p.check).sort();
  assert.deepEqual(checks(SAFE.replace('rel=0', 'rel=1')), ['player.rel']);
  assert.deepEqual(checks(SAFE.replace('&playlist=abc123', '')), ['player.next-video']);
  assert.deepEqual(checks('https://www.youtube-nocookie.com/embed/videoseries?list=PL1&rel=0'), ['player.playlist-embed']);
  assert.deepEqual(checks(SAFE.replace('youtube-nocookie', 'youtube')), ['player.host']);
  assert.deepEqual(checks(SAFE.replace('youtube-nocookie', 'youtube'), { allowAuthenticatedEmbed: true }), []);
});

test('allowed hosts include subdomains only', () => {
  assert.equal(isAllowedHost('watchsafe.app', ['watchsafe.app']), true);
  assert.equal(isAllowedHost('store.watchsafe.app', ['watchsafe.app']), true);
  assert.equal(isAllowedHost('evilwatchsafe.app', ['watchsafe.app']), false);
  assert.equal(isAllowedHost('www.youtube.com', ['watchsafe.app']), false);
});

test('device filter is tablet-first and narrows by group or name', () => {
  assert.equal(deviceProjects('')[0].name, 'ipad-portrait');
  assert.deepEqual(deviceProjects('tablet').map((p) => p.name),
    ['ipad-portrait', 'ipad-landscape', 'android-tablet-portrait', 'android-tablet-landscape']);
  assert.deepEqual(deviceProjects('iphone').map((p) => p.name), ['iphone']);
  const landscape = deviceProjects('android-tablet-landscape')[0].use.viewport;
  assert.ok(landscape.width > landscape.height);
});

test('summary lists findings worst first', () => {
  const md = summaryMarkdown('w', 'failed', [{ severity: 'p0', title: 'a|b', devices: ['ipad-portrait'] }]);
  assert.match(md, /\| p0 \| a\\\|b \| ipad-portrait \|/);
});

function fakeGitHub(openIssues) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ method: opts.method, url, body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (data, status = 200) => ({ ok: true, status, json: async () => data, text: async () => '' });
    if (opts.method === 'GET') return ok(openIssues);
    if (url.endsWith('/issues')) return ok({ html_url: 'https://github.com/o/r/issues/99' }, 201);
    return ok({});
  };
  return { gh: new GitHubIssues({ token: 't', repo: 'o/r', fetchImpl }), calls };
}

test('reporter files new findings, skips fresh repeats, comments on stale ones', async () => {
  const f = (print) => ({ fingerprint: print, severity: 'p0', title: 'T', check: 'c', devices: ['iphone'], at: '2026-10-30T00:00:00Z' });
  const now = new Date('2026-10-30T12:00:00Z');
  const { gh, calls } = fakeGitHub([
    { number: 1, body: issueBody(f('aaaaaaaaaaaaaaaa')), updated_at: '2026-10-30T10:00:00Z', html_url: 'u1' },
    { number: 2, body: issueBody(f('bbbbbbbbbbbbbbbb')), updated_at: '2026-10-28T10:00:00Z', html_url: 'u2' },
  ]);
  const results = await gh.report([f('aaaaaaaaaaaaaaaa'), f('bbbbbbbbbbbbbbbb'), f('cccccccccccccccc')], { now });
  assert.deepEqual(results.map((r) => r.action), ['skipped', 'commented', 'created']);
  const created = calls.find((c) => c.method === 'POST' && c.url.endsWith('/issues'));
  assert.equal(fingerprintFromBody(created.body.body), 'cccccccccccccccc');
  assert.deepEqual(created.body.labels, ['qa-agent', 'qa-p0']);
});

test('escape watcher catches a new window and an off-site navigation', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<a id="tab" href="https://example.com/" target="_blank">yt</a><a id="nav" href="https://www.youtube.com/watch?v=x">yt</a>');
    await page.route('**/*', (route) => route.fulfill({ body: '<html>off-site</html>', contentType: 'text/html' }));
    const watcher = watchForEscapes(page, { allowedHosts: ['watchsafe.app'] });
    await page.click('#tab');
    await page.waitForTimeout(300);
    await page.click('#nav');
    await page.waitForLoadState();
    watcher.stop();
    const kinds = watcher.escapes.map((e) => e.kind).sort();
    assert.deepEqual(kinds, ['new-window', 'top-navigation']);
  } finally {
    await browser.close();
  }
});
