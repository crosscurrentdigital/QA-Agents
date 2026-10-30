# QA Agents

Always-on AI QA agents for apps on real TVs, phones and browsers. They drive each app the way a person would (with a remote on TV), judge the UI and UX, record proof (video, screenshots, logs), and file deduplicated bug reports. Review-only fix PRs and support-reply drafts come later, as opt-in additions.

**Status:** first app live in code (2026-10-30). WatchSafe escape test, tablet checks and public-site checks run daily on GitHub Actions. Setup: [WATCHSAFE-SETUP.md](docs/WATCHSAFE-SETUP.md).

## How it's laid out

- `engine/`: shared pieces every app uses. Tablet-first device matrix, findings and fingerprints, escape watcher and embed checks, layout checks, and a Playwright reporter that files deduplicated GitHub issues.
- `apps/<app>/`: one folder per app. `app.config.js` (URLs, QA accounts, budgets), `global-setup.js` (signs in once per run) and `tests/`.
- Run one app: `QA_APP=watchsafe npx playwright test`. Narrow devices with `QA_DEVICES=tablet`. Engine unit tests: `npm run test:engine`.

- [Scope](docs/SCOPE.md): who it's for (Enjoy Movies Your Way, the Forge, DFE), how it works, phases, pricing, risks, and open questions.
- [Head start](docs/HEADSTART-REPOS.md): open-source projects to build on, with licenses and verdicts.

**Ownership:** Crucible Lab LLC owns this platform. Each client owns its own journeys, test data, findings, and any code written in its repositories.
