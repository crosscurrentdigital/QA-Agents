import fs from 'node:fs';
import path from 'node:path';
import { findingsFromAnnotations, mergeFindings, fingerprint, ISSUE_SEVERITIES } from './findings.js';
import { GitHubIssues } from './github.js';

// Playwright reporter. Collects findings from every test, turns hard test failures that
// recorded no finding into p1 findings, merges across devices, writes a run summary, and
// files deduplicated GitHub issues when QA_REPORT_REPO and GITHUB_TOKEN are set.
export default class QaReporter {
  constructor(options = {}) {
    this.app = options.app || process.env.QA_APP || 'unknown';
    this.outDir = options.outDir || 'qa-results';
    this.findings = [];
  }

  onTestEnd(test, result) {
    const project = test.parent?.project?.()?.name || 'unknown';
    const recorded = findingsFromAnnotations(result.annotations?.length ? result.annotations : test.annotations);
    this.findings.push(...recorded);
    const failed = result.status === 'failed' || result.status === 'timedOut';
    if (failed && !recorded.some((f) => f.severity === 'p0' || f.severity === 'p1')) {
      const title = `Check failed: ${test.title}`;
      const check = `test:${test.titlePath().slice(1).join('/')}`;
      this.findings.push({
        app: this.app,
        check,
        subject: '',
        severity: 'p1',
        title,
        details: '```\n' + (result.error?.message || 'No error message').slice(0, 1500) + '\n```',
        device: project,
        test: test.titlePath().join(' › '),
        fingerprint: fingerprint({ app: this.app, check, subject: '' }),
        at: new Date().toISOString(),
      });
    }
  }

  async onEnd(result) {
    const merged = mergeFindings(this.findings);
    fs.mkdirSync(this.outDir, { recursive: true });
    fs.writeFileSync(path.join(this.outDir, 'findings.json'), JSON.stringify(merged, null, 2));
    fs.writeFileSync(path.join(this.outDir, 'summary.md'), summaryMarkdown(this.app, result.status, merged));

    const repo = process.env.QA_REPORT_REPO;
    const token = process.env.GITHUB_TOKEN;
    const toFile = merged.filter((f) => ISSUE_SEVERITIES.has(f.severity));
    if (!repo || !token || toFile.length === 0) return;
    const runUrl = process.env.GITHUB_RUN_URL || null;
    try {
      const results = await new GitHubIssues({ token, repo }).report(toFile, { runUrl });
      fs.writeFileSync(path.join(this.outDir, 'issues.json'), JSON.stringify(results, null, 2));
      for (const r of results) console.log(`[qa] ${r.action} ${r.url}`);
    } catch (err) {
      console.error('[qa] Issue reporting failed:', err.message);
    }
  }
}

export function summaryMarkdown(app, status, findings) {
  const lines = [`# QA run: ${app} (${status})`, ''];
  if (findings.length === 0) {
    lines.push('No findings.');
    return lines.join('\n');
  }
  lines.push('| Severity | Finding | Devices |', '| --- | --- | --- |');
  for (const f of findings) {
    lines.push(`| ${f.severity} | ${f.title.replace(/\|/g, '\\|')} | ${f.devices.join(', ')} |`);
  }
  return lines.join('\n');
}
