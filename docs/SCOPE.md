# QA Agents: scope v0.1

**Date:** 2026-10-28 · **Owner:** Claton Butcher, Crucible Lab LLC · **Status:** scoping, nothing built yet
**Labels:** `serves:client-work` (Enjoy Movies Your Way, DFE) and `serves:infrastructure`, which unblocks `serves:watchsafe` (real `verified` stamps on the Forge board)

> This serves a family or the Church. 102:18 INC: "Let this be written for a future generation, that a people not yet created may praise the Lord" (Psalm 102:18). 90% of profit supports ministries locally and around the world.

Companion doc: [HEADSTART-REPOS.md](HEADSTART-REPOS.md), the open-source head start with licenses and verdicts. Sources are in §14.

## 1. The short version

- **What it is.** An always-on AI QA team. A small box sits next to real TVs and phones. Claude agents on the box drive each app with the remote, judge what they see, record proof (video, screenshots, logs) and file deduplicated bug reports. Fix PRs and support-reply drafts are later, opt-in add-ons.
- **First customer: Enjoy Movies Your Way (EMYW).** Enjoy mutes, skips or blurs scenes on top of the user's own Netflix, Prime, Disney+, Hulu, Max, Peacock and YouTube accounts.
  - It ships on Roku, Fire TV, Android/Google TV, iOS, Android, web and a Chrome extension. Apple TV just launched and Samsung is next.
  - A small in-house team shipped seven iOS builds in 14 weeks.
  - Ratings sit at 3.0–3.4 stars on every store, and the top complaint is filters firing late.
- **It also serves us.** The Forge's `verified` stamp means "a real browser or device run", and nothing automated produces it today: all 46 audited Forge jobs carrying the field had no visual evidence. QA Agents becomes that producer, starting with WatchSafe. DFE's planned Apple TV, Fire TV and Roku apps reuse the TV work.
- **Why us, why now.**
  - AI QA services (QA Wolf, Rainforest, Momentic and others) don't list TV platforms.
  - TV-test vendors sell device minutes, scripting tools or enterprise contracts; a few are adding AI (Witbe, Suitest, Ensemble QAi, VibeView's beta).
  - Nobody sells a small team triaged, evidence-backed bugs from real TVs every night at a small-company price.
  - The open-source parts now exist (§6).
- **Deal shape.**
  - EMYW pays a fixed pilot fee, then a monthly fee.
  - EMYW hosts the box and uses its own Anthropic API key.
  - Crucible Lab owns the platform. EMYW owns its test packs, findings and code.
- **Which top-5 priority it serves.**
  - #3, custom builds and AI consulting: new revenue now, plus a recurring "QA agent" add-on for every app you build later.
  - #1, WatchSafe: nightly real-device checks through the Forge.
- **The trap.** Becoming a QA service operator. This is designed so EMYW's team runs their box and Carmen runs ours; you build and upgrade (§9).

## 2. What EMYW needs

From the meeting: agents that test constantly across their OTT platforms, judge UI and UX, produce logs, bug reports and PRs, and maybe handle support and help-desk work.

What the research adds (sources in §14):

| Finding | What it means for QA |
|---|---|
| Enjoy is a third-party player over the user's own streaming accounts | Tests need a test account per service. A change at Netflix or Disney+ can break Enjoy overnight. |
| Live on Roku, Fire TV, Android/Google TV, iOS, Android, web and Chrome; Apple TV is new; Samsung Tizen is "coming" | Three device families (Roku, Android, Apple), plus web |
| Built in-house by the founder, a lead dev and a Roku dev; repos are private | PRs are possible once they grant access. Bug reports come first. |
| The v2.0 "New Experience" is shipping fast: 7 iOS builds in 14 weeks, Android/Fire TV 2.0.15 on 16 Oct | Regression risk is high right now |
| 3.0–3.4 stars on every store | Quality is visibly costing them |
| Top review complaints: filters late or missing, casting and AirPlay, spinners and crashes, sign-up and service linking | These become the first test suites |
| A child-profile search surfaced an adult film (July 2026 review) | Severity 1 for a family brand |
| Third-party revenue estimate under $10K/mo (Android only, unverified) | The price has to fit a small company |

### 2.1 The five suites that sell it

1. **Filter accuracy: "did the word leak?"**
   - Play short windows around known tags in a fixed set of titles, per service and per platform.
   - The app's filter log gives exactly when each mute, skip or blur fired.
   - An audio tap from the TV, run through FFmpeg and word-level speech-to-text, shows whether the word was actually heard.
   - This tests EMYW's core promise against its #1 complaint, and it works around DRM (§5.3).
2. **Kid safety.** In a child profile, search a fixed list of adult titles and terms on every platform. Anything that appears is a severity-1 bug.
3. **Service health.** Link, browse, play and resume, per service and per platform, every day. This catches upstream breakage within hours instead of in reviews.
4. **Stuck states.** Endless spinners, black screens, the wrong episode playing, and crashes at launch, found from screenshots plus device logs.
5. **New-build gate.** Every new build gets the smoke and regression run before users see it: Roku beta or sideload, Fire TV Live App Testing, TestFlight, Play internal track.

Casting and AirPlay matter too, but they need a phone-plus-receiver rig, so they wait for Phase 2.

## 3. What the Forge needs (internal)

From reading Crucible-MCP and the app repos (paths in §14):

- **`verified` has no automatic producer.** On the pipeline board, `verified` requires a real browser or device run and expires after 14 days. A smoke pass can extend it but never create it (`src/integrations/pipeline.ts`). The code says agent exploration is "far too expensive to run nightly"; compiled replays (§5.2) remove that cost.
- **Forge evidence rules apply as they are.** An artifact a verifier can re-parse counts as evidence (E3). A model verdict can only block (E4) (`docs/forge-v2/contracts/web.md`). Every check ships with a control that must fail (`build-lessons/quality-gate.md`: "a gate that cannot fail is not a gate").
- **Reuse, don't rebuild:**
  - the crucible-ops Playwright harness (four phone viewports, must-fail controls)
  - WEB-08 `forge-browser-qa` (a zero-LLM dead-control clicker; PR #48, not yet tagged)
  - DAC-01 visual QA (axe)
  - deployed smoke (HTTP)
  - KindredPages' report-to-ship loop: `crucible-fix.yml`, then `auto-release.yml`, then `verify-live.mjs`
- **Carmen can already run test agents** within caps (`docs/forge-v2/CARMEN_AUTHORIZATION.md` §6.3):
  - 4 at once, 20 sessions a rolling day, 120 browser minutes a day (30 per run)
  - staging or preview targets only; production read-only
  - test accounts supplied as environment variables
- **Where results go.**
  - Findings: `forge_issue_open(kind: fix)`, after dedupe.
  - Lessons: `forge_learn_signal`.
  - Judgment calls: `forge_decision_open`.
  - A flag-gated tick module, like `forge-canary.ts`, wakes the runner.

First internal targets:

| App | First journeys |
|---|---|
| WatchSafe (live) | Sign in; parent approves a channel; the child can play only approved videos; billing in test mode |
| OrganizeMe (live) | Sign-in and onboarding (connect Gmail, triage, briefing); two-account isolation, an open board blocker |
| RouteCaster (review) | Sign up and plan a route; reroute; Stripe upgrade in test mode |
| KindredPages | Scan and add a book; multi-device sync; reopen offline |
| DFE (stopped) | Subscribe, get entitlement, play signed video (a copied URL must return 403); TV code sign-in. The device matrix in `dfe-mvp/docs/BUNNY_STREAM_SCOPE.md` §7 is its first suite. |
| KeepsakeVault, ScriptLoop, CraftSuite | Once they reach `review` |

**One rule conflict to settle.**
- Forge agents run on subscriptions, never API keys (`AGENTS.md`).
- A customer's agents need metered API spend (`AGENTS.md`, enterprise rule 2).
- The Claude Agent SDK's README says products sold to customers fall under Anthropic's Commercial Terms.

So QA Agents is its own product in this repo. Each customer instance runs on the customer's API key, and the Forge uses it as an internal consumer within Carmen's caps.

## 4. Agent roles

| Role | Job | Model tier | Phase |
|---|---|---|---|
| Runner | Replays compiled journeys; calls a model only when a step fails | none, then Haiku | 1 |
| Watcher | Playback and filter checks from logs, player state and the audio tap | rules, then Haiku | 1 |
| Triage | Fingerprints and dedupes findings, scores severity, files a new issue or comments on an existing one with evidence | Sonnet | 1 |
| Explorer | Walks the app with the remote, maps screens, finds dead ends, focus traps and crashes, writes new journeys | Sonnet, with Haiku for "what's on screen" | 2 |
| Critic | 10-foot UX review and cross-platform consistency; advisory only | Opus, weekly | 2 |
| Fixer | Opens a review-only PR when a person labels an issue `agent:fix` | Claude Code GitHub Action | 2, opt-in |
| Support drafter | Drafts replies grounded in known issues; never sends, promises dates or touches billing | Sonnet | 3, separate SOW |

## 5. How it works

### 5.1 Shape

```
Cloud (Crucible)    control plane: schedules, run history, findings (Neon),
                    evidence (R2 signed links), weekly report, GitHub App
      ^  outbound HTTPS only
QA Node (box)       agent loop (Claude Agent SDK, customer's API key)
                    Device MCP: press, screenshot, ui_tree, logs, install,
                                deep_link, record, audio, power
                    adapters: Roku | Android (Fire TV, Google TV, phones) |
                              Apple (via a Mac) | Web (Playwright) | Samsung
      |  LAN, USB, HDMI audio tap
Devices             Roku, Fire TV, Google TV, Apple TV, phones, TV audio out
```

### 5.2 Six design rules

1. **One device interface.** Every platform speaks the same Device MCP, so agents, journeys and evidence don't care which TV they run on. This interface and its adapters are the core IP.
2. **Explore with AI, replay without it.**
   - An agent explores once, then compiles the journey to a plain script:
     - Maestro YAML for Android TV and phones (upstream Maestro), and for Roku, tvOS and Vega (Plex's TV fork of Maestro)
     - Playwright specs for web
     - roku-test-automation scripts where Roku needs node-level checks
   - Nightly replays make no model calls. The agent wakes only when a step fails or a screen has changed.
   - Maestro YAML is already close to one shared format. The exporters and the missing pieces (Samsung, focus planning) are ours to build.
3. **Evidence beats opinion.** Every bug carries video or screenshots, logs, the device, OS and app build, and repro steps. An AI verdict can block a release or advise on it; it never passes one by itself.
4. **Everything on screen is untrusted.**
   - Movie blurbs, ads, app text, support tickets and target repos are data, not instructions. RouteCaster's latest commit removed a planted credential collector.
   - Agents hold no write tokens; a separate step files issues and PRs from an allowlist.
   - Production is read-only, accounts are test accounts, and artifacts are redacted.
5. **Humans at the right seams.** Issues file automatically after dedupe. PRs open only when a person labels `agent:fix`, and merge only after review. Support replies stay drafts.
6. **Customer spend on the customer's key.** Each instance has a hard monthly cap and a per-run budget.

### 5.3 Filter accuracy under DRM

Netflix, Disney+ and the other services are DRM-protected. HDCP blanks or blocks HDMI video capture, and one Roku developer reported HDCP errors through a USB capture card even with clear video. So the suite never reads the HDMI picture. It uses three layers instead.

1. **Filter log, on every platform.**
   - EMYW's debug builds log one line per filter action: cue id, planned time, action, player position when it fired, mute state afterward, and landing position after a skip.
   - Where the box reads it:
     - Roku: the debug console, `Video.mute` via roku-test-automation, and ECP `media-player` polling from the box
     - Android and Fire TV: logcat
     - Apple TV: the device console, through the Mac
   - Skip landing precision (keyframes, seek tolerance) is the most likely class of bug.
2. **Audio tap.**
   - The TV's headphone, analog or optical output feeds a USB audio interface on the box.
   - FFmpeg `silencedetect` shows when the sound actually stopped.
   - Word-level speech-to-text (whisperX) around each cue shows whether the word was heard. This answers "profanity heard before the filter kicked in" directly.
   - Calibrate output latency once per device. Dolby passthrough may ignore a software mute, so test it.
3. **Known-answer titles, for the filter engine itself.**
   - This needs EMYW to add a debug-only test source.
   - We generate a clear title with tones, tick marks and burned-in timecode, plus a cue file.
   - That proves the engine to the millisecond on each platform, with no streaming service and no DRM involved.

Blur is visual only, so on DRM titles it is checked from the filter log alone.

### 5.4 Platforms

No repo spans all of these, so the box gets one thin adapter per platform over that platform's own control channel, all exposed as one MCP server. The device research estimates 3–5 engineer-weeks for the adapter layer.

| Platform | How the agent drives it | CI without hardware? | Hardware |
|---|---|---|---|
| Roku | ECP (port 8060) for keys, launch, deep links, player state and the UI tree; dev server for sideloading and screenshots; debug console (port 8085) for logs; roku-test-automation for node queries | Partly: brs-engine runs BrightScript with most of SceneGraph; Roku Cloud Emulator is an invite-only pilot at $0.20/hour | A Roku in developer mode. One sideloaded dev channel at a time, and only that channel exposes the UI tree and screenshots. |
| Fire TV (Fire OS), Android/Google TV, Android phones | adb over the network for keys, screenshots, logcat and installs; UiAutomator2 tree with focus; Arbigent or agent-device for D-pad | Android/Google TV: yes, emulator with KVM on GitHub Actions. Fire OS: no emulator, so the Android TV emulator approximates it. | A Fire TV Stick and a Google TV device |
| Fire TV (Vega OS, newer sticks) | Amazon's Vega CLI and Appium Vega driver (tree, screenshots, keys) | Vega Virtual Device runs headless; CI use unproven | A Vega stick, if EMYW has a Vega build |
| Apple TV, iPhone | Appium XCUITest from a Mac (button presses, focus attribute); agent-device also covers tvOS; pyatv for the remote | Yes: tvOS simulators on GitHub macOS runners | An Apple TV and a Mac that stays awake (not your laptop); a paid Apple developer account to sign WebDriverAgent |
| Web app, Chrome extension | Playwright (MCP and Test Agents) | Yes | None |
| Samsung Tizen (coming) | sdb, Chrome DevTools/Chromedriver and the websocket remote; HeadSpin's Appium Tizen driver is stale | No headless emulator | A Samsung TV in developer mode; the developer certificate must include the TV's ID |
| Store builds on any HDMI device | HDMI capture plus IR, CEC or ECP keys (Carabiner, stb-tester) | No | A USB capture dongle; HDCP can blank protected video |

While EMYW's builds are on their way, the open-source Jellyfin apps for Android TV, tvOS, Roku and Samsung make free practice targets.

## 6. Head start

The full list with licenses and verdicts is in [HEADSTART-REPOS.md](HEADSTART-REPOS.md). Short version:

| Layer | Start from | We build |
|---|---|---|
| Agent loop | Claude Agent SDK; Arbigent's D-pad and focus-aware replay | Our loop and journey format |
| Devices | Maestro (upstream plus Plex's TV fork), Appium 3 with appium-mcp, agent-device, roku-test-automation, RokuMCP, Carabiner, Playwright Test Agents | One MCP over all adapters, a normalized UI tree, focus-path planning, trap crawler, Samsung adapter, lab ops |
| Filters and playback | FFmpeg detectors, BBC audio-offset-finder, whisperX, Eyevinn's player-event schema | Cue oracle: cue file vs. filter log vs. audio |
| Evidence | Playwright traces, odiff, Visual-Regression-Tracker, Sentry SDKs with self-hosted GlitchTip | Evidence bundle and redaction |
| Bugs and fixes | github-mcp-server, claude-code-action, gh-aw safe outputs, BrighterScript `bsc` and `bslint` | Cross-platform fingerprint dedupe |
| Support | OrganizeMe's help desk (ours); Chatwoot Community Edition as a fallback | Customer report → device repro → reply loop |

Keep these out of the product:
- AGPL tools: Skyvern, Hercules, FreeScout, Zammad, k6
- n8n and Dify, which restrict resale
- Sentry's server, which bans competing use
- Maestro's cloud-only AI commands
- anything without a license

## 7. Phases

### Phase 0: discovery (week 1, inside the pilot fee)
- One call with Chad and the lead dev, using the questions in §12.
- Choose two TV platforms. Default: Roku and Fire TV, because the Android adapter also covers Google TV and phones.
- Order hardware. Collect one test account per streaming service, debug builds, and the filter log line.
- Have EMYW's Roku developer account apply for the Roku Cloud Emulator pilot, which gives Roku runs without hardware.

### Phase 1: pilot (weeks 2–6)
- A QA Node with the Roku and Android adapters, built first against Jellyfin's open-source TV apps; the web app through Playwright.
- 10 compiled journeys: sign in, link two services, browse, play, resume, filter settings, kid profile, sign out.
- Filter accuracy: 5 golden titles × 2 services × 2 platforms, using the filter log and the audio tap.
- The kid-safety search suite.
- Nightly runs, plus a run on every new build.
- Deduped bugs filed in EMYW's tracker, with video and logs.
- A one-page weekly report by email.

Pilot exit criteria, agreed in writing up front:
- At least 10 accepted bugs EMYW didn't already know about. You set the final number with Chad.
- Under 20% of filed issues rejected as false positives.
- 90% of nightly runs finish with nobody touching the box.
- A report within 2 hours of every new build.

### Phase 2: expand (weeks 7–14)
- Apple TV and iPhone, through a Mac node.
- Samsung, once it ships.
- The Explorer and a weekly Critic review, including cross-platform consistency.
- A casting rig.
- Fix PRs (opt-in).
- The Chrome extension.

### Phase 3: support (separate SOW)
- **Reuse OrganizeMe's help-desk design.** It escalates in four steps: deflect, auto-diagnose, apply an allowlisted fix, then hand to a person.
- **Keep the agent-operator limits** from `organizeme/SPEC_HELP_DESK.md` §18: no promised dates, no billing, and it can't close its own ticket.
- **Deployment:** a separate instance per client, or a plug-in to EMYW's existing desk.
- **New loop:** a customer reports a bug, an agent reproduces it on a device, links the issue and drafts the reply.
- **Review mining:** Apple and Google reviews through the Sonar connector. Roku and Amazon have no review API.

### Forge track (internal, small, in parallel)
1. Build the web adapter from Playwright Test Agents on the existing harness. Produce real `verified` for WatchSafe first, then OrganizeMe and RouteCaster.
2. Add a flag-gated tick that wakes the runner; Carmen operates it within the AG caps.
3. DFE's TV apps reuse the EMYW adapters once those apps exist.

## 8. Commercials (recommended defaults)

Price anchors (§14):
- Offshore manual QA, 80 h/mo: about $1.2–2.8K
- US contract QA, 160 h/mo: about $5.6–6.9K
- Bug0 (web only): $2,500/mo
- QA Wolf: median contract about $6.9K/mo
- Suitest (device minutes and scripting for your own tests): from €494/mo
- stb-tester: $4,260 a year per device node

| Item | Recommend | Range |
|---|---|---|
| Pilot, Phases 0–1, about 6 weeks | $3,500 fixed: half at signing, half at exit | $2,500–5,000 |
| Core: 2–3 TV platforms plus web, nightly and per-build runs, triaged bugs, weekly report | $1,500/mo, 3-month minimum | $1,250–2,000 |
| Plus: adds Apple, Samsung, Explorer, Critic, fix PRs | $2,500/mo | $2,000–3,000 |
| Support desk | Separate quote | — |
| Hardware | At cost; EMYW owns it | About $350–650 for Phase 1, plus displays if EMYW has none |
| Claude API | EMYW's own key, capped | Est. $75–300/mo |
| Streaming test accounts | EMYW's | Their existing plans |

- **Founding-customer terms.** Core at $1,250/mo for the first six months, in exchange for a public case study, a reference call, and three warm intros to family or faith streaming founders.
- **Referral.** Chad earns 15% of first-year fees on any client he refers. That gives you a sales channel with no cold outreach.
- **IP.**
  - Crucible Lab owns the platform and every improvement to it.
  - EMYW owns its journeys, test data, findings and any code written in its repos, and gets a license to the platform while subscribed.
  - Crucible may reuse general lessons, never EMYW data.
- **Entity.** The repo sits in the `crosscurrentdigital` GitHub org, but the IP should belong to Crucible Lab LLC. A one-page assignment between your own entities keeps it clean if CrossCurrent is ever sold.

## 9. Who runs it (protecting your time)

| Who | Owns |
|---|---|
| Claton, plus Claude Code lanes | Building and upgrading. Target: 6–10 h/week during the pilot, 1–2 h/week after. |
| EMYW's team | The box (power, Wi-Fi, keeping test accounts paid), thumbs up or down on each filed bug, and the fixes |
| The box | A heartbeat with a dead-man's switch; smart plugs to power-cycle devices; self-updates; alerts go to EMYW, not to you |
| Carmen | Forge-side QA ticks within the AG caps; you see only the digest |

Never on you: cold outreach for this, babysitting devices, manual test runs, support tickets.

## 10. Running costs

Anthropic list prices as of October 2026, per million tokens in / out: Haiku $0.10 / $0.50, Sonnet $2 / $10, Opus $4 / $20. Cached input costs $0.20 on Sonnet and Opus.

- **One agent step:** about 9K input tokens plus 500 output. A 720p screenshot is about 1.2K tokens; instructions and history are mostly cached. That's about $0.012–0.015 on Sonnet, or about $0.0012 on Haiku.
- **Nightly replays:** about $0.
- **Explorer:** 200 steps × 3 platforms is about $3–8 a run, with Haiku reading routine screens and Sonnet making decisions. Run weekly and on each new build, that's about $35–100/mo. Running it nightly on Sonnet alone would be about $250/mo.
- **Critic:** about 150 screens a week on Opus is about $3–5 a week.
- **Triage:** a few cents per finding. **Fix PRs:** an estimated $1–5 each.

Expect **$75–300/mo per client**, billed to the client's key.

Phase 1 hardware (approximate; check prices before buying):

| Item | Approx. cost |
|---|---|
| Mini PC, Intel N100 class, 16 GB (the QA Node) | $150–250 |
| Roku stick, in developer mode | $30–50 |
| Fire TV Stick 4K | $30–50 |
| Google TV device | $50–100 |
| HDMI audio extractor + USB audio interface | $25–50 |
| 4 smart plugs | $30–40 |
| A TV or HDCP-capable monitor per device (EMYW likely has spares) | $0–100 each |
| Optional: a USB HDMI capture dongle for black-box checks of store builds | $15–30 |
| Phase 2: Apple TV 4K and a used Mac mini | $129 + $400–600 |
| Phase 2: a small Samsung TV for Tizen | $200–300 |

Hosting runs on the existing Fly, Neon and R2 accounts; the added cost per client is small.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Ops work drifts onto you | The box lives at EMYW; the SOW spells out who does what; alerts go to them |
| DRM/HDCP hides protected video | Filter log plus audio tap; the screen is used only for UI |
| Streaming accounts flagged for automated playback | Short windows, low daily volume, EMYW-owned accounts, EMYW signs off |
| False positives erode trust | A person gives thumbs up or down on every filed issue in the pilot; dedupe; the false-positive rate is an exit criterion |
| Flaky TV automation | Focus-aware waits, retries, quarantine; the agent takes over only on failure |
| Prompt injection from on-screen text or tickets | Agents hold no write tokens; outputs are allowlisted; no secrets in agent context |
| Token costs run away | Customer key with a monthly cap; a budget per run; replays make no model calls |
| Scope creep: support, casting, every platform at once | Two platforms in the pilot; support is a separate SOW |
| Licenses | Only permissive licenses (MIT, Apache, BSD) in the core; the keep-out list in §6; the Agent SDK under Anthropic's Commercial Terms with API keys |
| Newer Fire TV sticks run Vega OS, which needs a separate app and tools | Ask in discovery; Amazon's Vega CLI and Appium driver exist (proprietary: use, never redistribute) |
| Roku developer-mode limits: only the sideloaded dev channel shows its UI tree and screenshots, and store builds can't carry ECP code | Test EMYW's instrumented dev builds; check store builds black-box through HDMI capture |
| Roku's new SceneGraph runtime (RSG 2.0, TypeScript) is in beta | Keep the Roku adapter on ECP and the dev server, which both runtimes share |
| Tizen and webOS developer mode expires or needs per-TV certificates | Lab ops track renewals; Samsung waits for Phase 2 |

## 12. Questions for Chad

1. Which platforms have the most active users, and where do most complaints come from?
2. How does Enjoy play each service on each platform: its own player, a web player, or by controlling the service's app? That decides what the agent can observe.
3. Can debug builds log one line per filter action (cue id, planned time, action, player position, mute state, landing position)?
4. Do you have test accounts for each service, and are you comfortable with short automated playback on them?
5. How do test builds ship today (Roku sideload or beta channel, Fire TV Live App Testing, TestFlight, Play internal)? Can we get debug or sideload builds?
6. Where do bugs live (GitHub, Jira, Linear, email)? Would you install a GitHub App with issue access, and allow PRs later?
7. Which help-desk tool do you use, how many tickets come in a week, and what are the top five types?
8. Where would the box live, and who can plug things in?
9. Is there a Vega OS build for the new Fire TV sticks, and when does Samsung ship?
10. What's your budget range and start date, and who signs?

## 13. Decisions for Claton

1. **Offer the pilot at the recommended price?** Default: yes. Pilot $3,500, then Core at $1,500/mo. Walk away below a $2,500 pilot.
2. **Product boundary.** Default: QA Agents is its own product in this repo, with customer instances on customer API keys, and the Forge consumes it. It is not a Forge module.
3. **IP owner.** Default: Crucible Lab LLC. Sign a one-page assignment now and move the repo to a Crucible org later.

## 14. Sources

**Internal** (read 2026-10-28 from local clones):
- Crucible-MCP
  - `src/integrations/pipeline.ts`: `VERIFIED_TTL_DAYS = 14`, and the "far too expensive to run nightly" comment
  - `docs/forge/FORGE_AUDIT_2026-10_EVIDENCE.md`: `visualEvidence` false on all 46 jobs
  - `docs/forge-v2/CARMEN_AUTHORIZATION.md` §6.3: AG caps
  - `docs/forge-v2/CLATON_PROTECTION.md`: labels and the never-ask list
  - `docs/forge-v2/contracts/web.md`: E1–E4 evidence
  - `AGENTS.md`: subscriptions vs. API keys, enterprise rules
  - `build-lessons/quality-gate.md`
  - `src/integrations/deployed-smoke.ts`, `forge-adopt-audit.ts`, `forge-canary.ts`
- OrganizeMe: `SPEC_HELP_DESK.md` §4, §17–19.
- DFE: `docs/BUNNY_STREAM_SCOPE.md` §7 and `docs/SCOPE_2026-09-21_INTERNAL.md` (TV layer).
- KindredPages: `.github/workflows/crucible-fix.yml`, `auto-release.yml`, `.github/scripts/verify-live.mjs`.
- RouteCaster: commit `dda01f7` (2026-10-26), "Contain repository malware and prevent private-data leaks".

**EMYW** (accessed 2026-10-28; store figures are third-party or point-in-time):
- FAQ and platforms: https://www.enjoymoviesyourway.com/helpcenter/faq/
- Team: https://www.enjoymoviesyourway.com/about/
- Comparison with VidAngel and ClearPlay: https://www.enjoymoviesyourway.com/general-news/which-streaming-filter-app-wins/
- App Store (iOS and tvOS): https://apps.apple.com/us/app/enjoy-movies-your-way/id1608941451
- iTunes API: https://itunes.apple.com/lookup?id=1608941451&country=us
- Review feed: https://itunes.apple.com/us/rss/customerreviews/id=1608941451/sortby=mostrecent/json
- Roku store API: https://channelstore.roku.com/api/v6/channels/detailsunion/ad52dfb4a4c3a6deea985400ab45b35a:255345f0009e454b5c415f6e7a25cda1
- Android estimates: https://appgoblin.info/apps/com.myenjoytv.enjoytvandroid
- Known playback limits: https://www.enjoymoviesyourway.com/helpcenter/shownotplaying/ and https://www.enjoymoviesyourway.com/?p=3507

**Market** (accessed 2026-10-28):
- Suitest https://suite.st/pricing.html
- stb-tester https://stb-tester.com/pricing
- HeadSpin https://www.headspin.io/solutions/smart-tv-testing
- VibeView https://vibeview.io/pricing
- BrowserStack TV https://www.browserstack.com/docs/app-automate/smart-tv/getting-started
- QA Wolf https://www.qawolf.com/pricing and https://www.vendr.com/marketplace/qa-wolf
- Rainforest https://www.vendr.com/marketplace/rainforest-qa
- Bug0 https://bug0.com/pricing
- Momentic https://momentic.ai/pricing
- Autify https://autify.com/pricing
- Applause https://www.vendr.com/marketplace/applause
- US contract QA rates: https://www1.salary.com/job/contract-qa-tester-salary
- Roku HDCP and capture: https://forum.developer.roku.com/t/hdcp-error-when-testing-video-via-usb-capture-card/9980

**Parked idea, not in scope:** Enjoy and WatchSafe protect the same families. A partnership may fit later. It's captured here, not chased.
