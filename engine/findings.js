import crypto from 'node:crypto';

// A finding is what the agent reports. Severity drives where it goes:
//   p0     — the app's core promise broke (e.g. a child reached unapproved content). Fails the test, files an issue.
//   p1     — a money path or core flow is broken. Fails the test, files an issue.
//   p2     — real but not urgent (layout, small tap targets). Soft: test passes, files an issue.
//   info   — worth a human look but low confidence. Goes to the run summary only, never an issue.
export const SEVERITIES = ['p0', 'p1', 'p2', 'info'];
export const ISSUE_SEVERITIES = new Set(['p0', 'p1', 'p2']);

const ANNOTATION = 'qa-finding';

/**
 * Stable identity for deduplication: same check + same subject = same bug, whatever the device
 * or run. Devices are listed on the issue instead of creating one issue per device.
 */
export function fingerprint({ app, check, subject = '' }) {
  return crypto.createHash('sha256').update(`${app}|${check}|${subject}`).digest('hex').slice(0, 16);
}

/**
 * Record a finding on the current test. Use from specs:
 *   recordFinding(test.info(), { app: 'watchsafe', check: 'player.rel', severity: 'p0', title, details, subject })
 */
export function recordFinding(testInfo, finding) {
  if (!SEVERITIES.includes(finding.severity)) throw new Error(`Unknown severity: ${finding.severity}`);
  const full = {
    ...finding,
    device: testInfo.project.name,
    test: testInfo.titlePath.join(' › '),
    fingerprint: fingerprint(finding),
    at: new Date().toISOString(),
  };
  testInfo.annotations.push({ type: ANNOTATION, description: JSON.stringify(full) });
  return full;
}

export function findingsFromAnnotations(annotations = []) {
  return annotations
    .filter((a) => a.type === ANNOTATION && a.description)
    .map((a) => JSON.parse(a.description));
}

/** Merge per-device findings into one entry per fingerprint, keeping the worst severity. */
export function mergeFindings(findings) {
  const byPrint = new Map();
  for (const f of findings) {
    const existing = byPrint.get(f.fingerprint);
    if (!existing) {
      byPrint.set(f.fingerprint, { ...f, devices: [f.device] });
      continue;
    }
    if (!existing.devices.includes(f.device)) existing.devices.push(f.device);
    if (SEVERITIES.indexOf(f.severity) < SEVERITIES.indexOf(existing.severity)) existing.severity = f.severity;
  }
  return [...byPrint.values()].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
}
