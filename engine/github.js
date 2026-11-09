// Files deduplicated GitHub issues for findings. One open issue per fingerprint; a repeat
// sighting adds at most one comment per day instead of a new issue.

export const QA_LABEL = 'qa-agent';
const MARKER = /<!-- qa-fingerprint: ([0-9a-f]{16}) -->/;

export const fingerprintFromBody = (body = '') => body.match(MARKER)?.[1] ?? null;

export function issueTitle(f) {
  return `[QA ${f.severity.toUpperCase()}] ${f.title}`;
}

export function issueBody(f, runUrl) {
  return [
    `<!-- qa-fingerprint: ${f.fingerprint} -->`,
    `**What happened:** ${f.title}`,
    '',
    f.details || '',
    '',
    `**Check:** \`${f.check}\` · **Devices:** ${f.devices.join(', ')} · **First seen:** ${f.at}`,
    f.steps?.length ? `\n**Steps**\n${f.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '',
    f.suggestedFix ? `\n**Suggested fix:** ${f.suggestedFix}` : '',
    runUrl ? `\n**Run with screenshots and traces:** ${runUrl}` : '',
    '',
    '---',
    '_Filed by QA Agents. Close the issue when fixed; it reopens as a new issue if the check fails again._',
  ].filter((line) => line !== null).join('\n');
}

export function sightingComment(f, runUrl) {
  return `Seen again ${f.at.slice(0, 10)} on ${f.devices.join(', ')}.${runUrl ? ` Run: ${runUrl}` : ''}`;
}

export class GitHubIssues {
  constructor({ token, repo, fetchImpl = fetch, apiBase = 'https://api.github.com' }) {
    if (!token || !repo) throw new Error('GitHubIssues needs a token and owner/repo');
    this.repo = repo;
    this.fetch = fetchImpl;
    this.apiBase = apiBase;
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async request(method, path, body) {
    const res = await this.fetch(`${this.apiBase}/repos/${this.repo}${path}`, {
      method,
      headers: { ...this.headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`GitHub ${method} ${path} → ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  async openQaIssues() {
    const issues = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await this.request('GET', `/issues?state=open&labels=${QA_LABEL}&per_page=100&page=${page}`);
      issues.push(...batch.filter((i) => !i.pull_request));
      if (batch.length < 100) break;
    }
    return issues;
  }

  /** Returns [{ fingerprint, action: 'created'|'commented'|'skipped', url }] */
  async report(findings, { runUrl, now = new Date() } = {}) {
    const open = await this.openQaIssues();
    const byPrint = new Map(open.map((i) => [fingerprintFromBody(i.body), i]));
    const results = [];
    for (const f of findings) {
      const existing = byPrint.get(f.fingerprint);
      if (!existing) {
        const created = await this.request('POST', '/issues', {
          title: issueTitle(f),
          body: issueBody(f, runUrl),
          labels: [QA_LABEL, `qa-${f.severity}`],
        });
        results.push({ fingerprint: f.fingerprint, action: 'created', url: created.html_url });
        continue;
      }
      const lastTouched = new Date(existing.updated_at);
      if (now - lastTouched < 20 * 60 * 60 * 1000) {
        results.push({ fingerprint: f.fingerprint, action: 'skipped', url: existing.html_url });
        continue;
      }
      await this.request('POST', `/issues/${existing.number}/comments`, { body: sightingComment(f, runUrl) });
      results.push({ fingerprint: f.fingerprint, action: 'commented', url: existing.html_url });
    }
    return results;
  }
}
