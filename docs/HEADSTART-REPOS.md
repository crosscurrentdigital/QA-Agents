# QA Agents: open-source head start

**Compiled:** 2026-10-28 from four research passes: TV device automation, AI and vision agents, playback and quality checks, and bugs/PRs/support. Licenses and activity were checked on each project's public page; star counts are approximate. "(unverified)" marks what could not be confirmed. Recheck a license before vendoring code.

**Verdicts**
- **ADOPT:** use as-is.
- **ADAPT:** fork or wrap.
- **REFERENCE:** learn from; don't depend on it.
- **AVOID:** see the reason given.

**License policy for the product**
- Allowed in the core: MIT, Apache-2.0, BSD and ISC.
- MPL and LGPL: only unmodified, or as separate processes.
- GPL: internal tools only.
- AGPL, SSPL, FSL, PolyForm, "Sustainable Use", non-commercial and unlicensed code: never in the product.

## 1. Top picks

1. **Claude Agent SDK.** The outer agent loop, subagents and hooks. The license file says MIT, but the README says Anthropic's Commercial Terms govern products sold to customers, so customer instances use API keys.
2. **Maestro + Plex's TV fork.** One YAML replay format across Android TV, Roku, tvOS and Vega.
3. **Arbigent.** The best open design for a D-pad agent: a focused tree in the prompt and focus-aware replay. It is Android TV and Fire TV only.
4. **agent-device.** One CLI and MCP for tvOS, Android TV, Fire OS, phones and web, with replay that needs no AI.
5. **RokuCommunity stack** (roku-test-automation, roku-deploy, roku-debug, Rooibos, BrighterScript). The live, MIT-licensed way into Roku.
6. **Playwright MCP + Test Agents.** Web, and the Forge's `verified` producer.
7. **FFmpeg detectors + BBC audio-offset-finder + whisperX.** The filter oracle: did the mute land, and was the word heard?
8. **claude-code-action + github-mcp-server.** Issues and review-only fix PRs.
9. **Carabiner.** HDMI capture plus control behind an MCP, for black-box checks of store builds.
10. **OrganizeMe's help desk (ours).** The support layer.

## 2. Agent loop and orchestration

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [anthropics/claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python) | Outer orchestrator: tools, hooks, subagents | MIT label; Anthropic Commercial Terms | ADOPT |
| [takahirom/arbigent](https://github.com/takahirom/arbigent) | D-pad actions (`DpadTryAutoFocus`), focused tree in the prompt, focus-aware replay, Claude through `--ai-type anthropic`. JVM, one maintainer. | Apache-2.0 | ADAPT |
| [callstackincubator/agent-device](https://github.com/callstackincubator/agent-device) | CLI and MCP for tvOS, Android TV, Fire OS, Vega (keys only), phones, web; `tv-remote`; `.ad` replay without AI; Maestro export. ~5.2k★, releases near daily. | MIT | ADOPT |
| [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp) | Phone automation, with D-pad keys on Android TV as a fallback. Turn telemetry off. | Apache-2.0 | ADOPT |
| [mobile-next/mobilewright](https://github.com/mobile-next/mobilewright) | Deterministic mobile replay on the accessibility tree (version 0.0.x) | Apache-2.0 | ADOPT later |
| [kaeawc/auto-mobile](https://github.com/kaeawc/auto-mobile) | `focusNavigate`: press the D-pad until the focused element matches | Apache-2.0 | REFERENCE |
| [web-infra-dev/midscene](https://github.com/web-infra-dev/midscene) | Screenshot-only agent with plan caching; Claude not documented; no D-pad | MIT | REFERENCE |
| [droidrun/mobilerun](https://github.com/droidrun/mobilerun) | Android/iOS agent with tracing | MIT | REFERENCE |
| [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts) | Computer-use and browser demos, customer-support agent, Managed Agents webhook bridges | MIT | REFERENCE |
| [hipjim/argus-qa](https://github.com/hipjim/argus-qa) | Explore, record a Playwright script, replay it free, re-heal with AI; a verdict taxonomy; per-run caps. Alpha. | MIT | REFERENCE |

Research worth reading (design ideas only; no code reuse without a license):
- REALM 2026: a D-pad-only agent over 68 streaming apps, using a focus-transition graph and path planning.
- ARIA (arXiv 2609.04913): a stronger-model second look cut false positives.
- [coinse/wandervision](https://github.com/coinse/wandervision): DroidAgent ported to LG TVs. It has no license.

## 3. Devices: Roku

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [rokucommunity/roku-test-automation](https://github.com/rokucommunity/roku-test-automation) | ECP wrapper and on-device node queries: focus, `Video.mute`, position. Needs an instrumented QA build. v3 is in alpha; v2.2.2 is stable. | MIT | ADOPT |
| [rokucommunity/roku-deploy](https://github.com/rokucommunity/roku-deploy) | Sideloading and packaging; Cloud Emulator support in the 4.0 alpha | MIT | ADOPT |
| [rokucommunity/roku-debug](https://github.com/rokucommunity/roku-debug) | Debug console and debugger | MIT | ADOPT |
| [rokucommunity/rooibos](https://github.com/rokucommunity/rooibos) | BrightScript unit tests, on a device or the Cloud Emulator | MIT | ADOPT |
| [rokucommunity/brighterscript](https://github.com/rokucommunity/brighterscript) + [bslint](https://github.com/rokucommunity/bslint) | Lint and compile with no device: the CI gate for agent-written BrightScript | MIT | ADOPT |
| [rokucommunity/roku-report-analyzer](https://github.com/rokucommunity/roku-report-analyzer) | Maps crash-log paths through sourcemaps for grouping | MIT | ADOPT |
| [lvcabral/brs-engine](https://github.com/lvcabral/brs-engine) | BrightScript engine in Node or the browser; SceneGraph mostly complete; an ECP server; PNG snapshots. Not an OS emulator. | MIT | ADAPT |
| [Roku Cloud Emulator](https://forum.developer.roku.com/t/roku-cloud-emulator-faqs/11571) | REST API to create devices, sideload, send ECP, stream logs and take snapshots. Invite-only pilot; $0.20/hour after a 5-hour trial; US only; Widevine L3. | Proprietary service | ADOPT if granted |
| [jack1590/RokuMCP](https://github.com/jack1590/RokuMCP) | Deploy, ECP keys, SceneGraph, console capture, profiler | MIT | ADAPT |
| [danecodes/roku-ecp](https://github.com/danecodes/roku-ecp) and its sibling repos roku-mcp and uncle-jesse | TypeScript ECP client, MCP, and focus assertions (`focusPath().expectFocus`). One maintainer. | MIT | ADAPT |
| [paramount-engineering/roku-dev-studio](https://github.com/paramount-engineering/roku-dev-studio) | `rds` CLI, MCP, and the best public view of the Cloud Emulator API | MIT | REFERENCE |
| [danecodes/roku-log](https://github.com/danecodes/roku-log) | Parses the port-8085 console into typed errors and crashes | Not shown | ADAPT after a license check |
| [headspinio/appium-roku-driver](https://github.com/headspinio/appium-roku-driver) | Appium over ECP. Stale, pinned to Appium 2. | Apache-2.0 | REFERENCE |
| [Roku WebDriver](https://gitlab.com/rokudev/automated-channel-testing) | Changelog ends in 2021; the GitHub copy was archived on 2026-10-15; non-standard WebDriver | Apache-2.0 | AVOID |

Roku facts that shape the adapter:
- ECP on port 8060 handles keys, launch, deep links, `query/media-player` and `query/app-ui`.
- The dev server on port 80 handles sideloading and screenshots.
- Logs come from the console on port 8085.
- Only the single sideloaded dev channel exposes its UI tree and screenshots, and video is omitted from them.
- Store apps can't contain ECP code.
- RSG 2.0 (TypeScript) is in beta.

## 4. Devices: Android TV, Fire TV and phones

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [mobile-dev-inc/maestro](https://github.com/mobile-dev-inc/maestro) | YAML flows, Android TV remote keys, an `mcp` command. Its AI asserts route through Maestro Cloud, so skip those. | Apache-2.0 | ADOPT |
| [plexinc/Maestro](https://github.com/plexinc/Maestro) | Plex's TV fork of Maestro: Roku over ECP, tvOS, Vega, canvas web TV apps. Rebased regularly; no Samsung/LG. | Apache-2.0 | ADAPT |
| [appium/appium](https://github.com/appium/appium) with the UiAutomator2 and XCUITest drivers | The standard drivers for Android TV, Fire OS and tvOS (Appium 3.9) | Apache-2.0 | ADOPT |
| [appium/appium-mcp](https://github.com/appium/appium-mcp) | MCP front end over Appium; no documented TV-key tool | Apache-2.0 | ADOPT |
| [ReactiveCircus/android-emulator-runner](https://github.com/ReactiveCircus/android-emulator-runner) | Android TV and Google TV emulators in GitHub Actions (needs the KVM step) | Apache-2.0 | ADOPT |
| [Amazon Vega test tools](https://developer.amazon.com/docs/vega/0.24/vega-test-tools-overview.html) | `vega`/`vda` CLI, Vega Virtual Device (headless) and the Appium Vega driver, for the newer Fire TV OS | Proprietary SDK | ADOPT as a tool; never redistribute |
| [iksnerd/adb-mcp](https://github.com/iksnerd/adb-mcp), [mosesmrima/adb-tv-mcp](https://github.com/mosesmrima/adb-tv-mcp) | Patterns for adb behind MCP: screenshots, D-pad, install, logcat | MIT | REFERENCE |

There is no Fire OS emulator; the Android TV emulator only approximates it. Real Fire TV sticks are needed, and OS updates have broken USB debugging before, so use adb over the network.

## 5. Devices: Apple

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| Appium XCUITest driver (in [appium/appium](https://github.com/appium/appium)'s driver set) | tvOS automation: `mobile: pressButton` and a focus attribute | Apache-2.0 | ADOPT |
| [postlund/pyatv](https://github.com/postlund/pyatv) | Apple TV remote control and app launch, with no developer setup (no tree or screenshots) | MIT | ADOPT |
| agent-device (above) | tvOS through the same CLI and MCP as Android | MIT | ADOPT |

tvOS simulators run on GitHub's macOS runners. A real Apple TV needs WebDriverAgent signed with a paid developer account, and wireless pairing is flaky.

## 6. Devices: Samsung, LG and HTML5 TVs

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [skdonthi/tv-mcp](https://github.com/skdonthi/tv-mcp) | Tizen and webOS MCP: build, sign, install, launch, logs, screenshot, `eval_js`, remote keys. Early. | MIT | ADAPT |
| [headspinio/appium-tizen-tv-driver](https://github.com/headspinio/appium-tizen-tv-driver) | Appium for Samsung TVs; pinned to Appium 2, dependency-only commits since early 2025 | Apache-2.0 | ADAPT |
| [mozarkai/optics-framework](https://github.com/mozarkai/optics-framework) | Appium plus OCR and image matching plus MCP and YAML suites for Android TV, Tizen and webOS. The closest thing to our product shape; no Roku or tvOS. | Apache-2.0 | REFERENCE |
| [webos-tools/cli](https://github.com/webos-tools/cli) | `ares-*` tools for LG (EMYW has no LG app today) | Apache-2.0 | ADOPT if needed |
| [headspinio/appium-lg-webos-driver](https://github.com/headspinio/appium-lg-webos-driver) | Inactive since 2025 | Apache-2.0 | REFERENCE |
| [rdkcentral/Lightning](https://github.com/rdkcentral/Lightning), [home-assistant-libs/pychromecast](https://github.com/home-assistant-libs/pychromecast), [vishen/go-chromecast](https://github.com/vishen/go-chromecast), [raman325/pyvizio](https://github.com/raman325/pyvizio) | HTML5 TV apps and the sender side of casting | Apache-2.0 / MIT | REFERENCE |

Samsung has no headless emulator. The developer certificate must include each TV's ID, and TVs running Chrome 57 or older can only be controlled with the remote.

## 7. Black-box testing, the lab and peripherals

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [lvcabral/carabiner](https://github.com/lvcabral/carabiner) | HDMI capture plus control (ECP, ADB, pyatv) with an MCP: `send_key`, `take_screenshot`, `record`. Its Electron GUI must be running. | MIT | ADAPT |
| [stb-tester/stb-tester](https://github.com/stb-tester/stb-tester) | HDMI capture, image matching, OCR, IR and CEC. Keep it unmodified and out-of-process. | LGPL-2.1+ | ADOPT as a fallback |
| [mjg59/python-broadlink](https://github.com/mjg59/python-broadlink) | Infrared blaster control | MIT | ADOPT |
| Shelly or Tasmota smart plugs (HTTP API) | Power-cycle stuck devices. Avoid python-kasa, which is GPL. | — | ADOPT |
| [healthchecks/healthchecks](https://github.com/healthchecks/healthchecks) | Dead-man's switch for nightly runs and the box | BSD-3 | ADOPT |
| [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma), [TwiN/gatus](https://github.com/TwiN/gatus) | Uptime monitoring after launch | MIT / Apache-2.0 | ADOPT |
| [DeviceFarmer/stf](https://github.com/DeviceFarmer/stf), [AppiumTestDistribution/appium-device-farm](https://github.com/AppiumTestDistribution/appium-device-farm) | Device-farm patterns: registry, locking | Apache-2.0 | REFERENCE |
| [Pulse-Eight/libcec](https://github.com/Pulse-Eight/libcec) | HDMI-CEC control | GPL-2+ | Separate process only |
| [Jellyfin clients](https://github.com/jellyfin) | Free practice apps for Android TV, tvOS, Roku, Samsung and LG | GPL-2.0 / MPL-2.0 | We only test against them |

## 8. Web

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) and Playwright Test Agents | Planner, generator and healer; traces, video, network and console evidence | Apache-2.0 | ADOPT |
| [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Performance traces, console, network. Turn off usage statistics. | Apache-2.0 | ADOPT |
| [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | CLI and MCP with accessibility refs, video, HAR, axe | Apache-2.0 | ADOPT as an alternative |
| [browserbase/stagehand](https://github.com/browserbase/stagehand) | act/observe/extract, with cached replays that make zero model calls | MIT | ADAPT, optional |
| Forge pieces: crucible-ops harness, WEB-08 `forge-browser-qa`, DAC-01 | Phone viewports, must-fail controls, dead-control clicker, axe | Ours | ADOPT |

## 9. Playback, filters and captions

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [FFmpeg](https://ffmpeg.org) filters: `silencedetect`, `astats`, `ebur128`, `freezedetect`, `blackdetect`, `avsynctest` | Detecting audio and video events. Run it as a subprocess. | LGPL-2.1+ | ADOPT |
| [bbc/audio-offset-finder](https://github.com/bbc/audio-offset-finder) | Aligns captured audio to a reference to about 0.01 s, with a confidence score | Apache-2.0 | ADOPT |
| [m-bain/whisperX](https://github.com/m-bain/whisperX) | Word-level timestamps: was the filtered word heard? A GPU is recommended. | BSD-2 | ADOPT |
| [Eyevinn/player-analytics-specification](https://github.com/Eyevinn/player-analytics-specification) | A vendor-neutral player-event schema for our playback timeline | Apache-2.0 | ADAPT |
| [shaka-project/shaka-packager](https://github.com/shaka-project/shaka-packager) | Builds known-answer test titles, in clear and DRM variants | BSD-3 | ADOPT |
| [pbs/pycaption](https://github.com/pbs/pycaption), [smacke/ffsubsync](https://github.com/smacke/ffsubsync), [bbc/ttml-validator](https://github.com/bbc/ttml-validator) | Caption parsing, sync checks and validation | Apache-2.0 / MIT / BSD-3 | ADOPT |
| [Eyevinn/chaos-stream-proxy](https://github.com/Eyevinn/chaos-stream-proxy), [Eyevinn/hls-monitor](https://github.com/Eyevinn/hls-monitor) | HLS/DASH fault injection and manifest health, for DFE's own streams | Apache-2.0 / MIT | ADOPT for DFE |
| [Netflix/vmaf](https://github.com/Netflix/vmaf), [slhck/ffmpeg-quality-metrics](https://github.com/slhck/ffmpeg-quality-metrics) | Video quality against a reference | BSD-2-Clause-Patent / MIT | Later |
| [benfmiller/audalign](https://github.com/benfmiller/audalign) | Alternative audio alignment | MIT | REFERENCE |
| [Dash-Industry-Forum/DASH-IF-Conformance](https://github.com/Dash-Industry-Forum/DASH-IF-Conformance) | DASH manifest validation | GPL-3.0 | Use the hosted service only |

Mute and skip under HDCP: never read them off the HDMI link. Use the app's filter log, then platform player state (Roku ECP `media-player`, Android `dumpsys`), then an analog, optical or headphone audio tap. Details are in SCOPE §5.3.

## 10. Evidence: visual, performance, crashes, accessibility

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| Playwright `toHaveScreenshot` | Web baselines, pinned to one container | Apache-2.0 | ADOPT |
| [dmtrKovalenko/odiff](https://github.com/dmtrKovalenko/odiff), [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch) | TV and mobile screenshot diffs; mask out video regions | MIT / ISC | ADOPT |
| [Visual-Regression-Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker) | Self-hosted baselines with an approval UI, for any screenshot source | Apache-2.0 | ADOPT/ADAPT |
| [google/perfetto](https://github.com/google/perfetto), Android Macrobenchmark | Android startup and frame metrics | Apache-2.0 | ADOPT |
| [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse) + [lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) | Web and PWA performance | Apache-2.0 | ADOPT |
| Sentry SDKs: [cocoa](https://github.com/getsentry/sentry-cocoa) (tvOS), [java](https://github.com/getsentry/sentry-java), [javascript](https://github.com/getsentry/sentry-javascript) | Crash capture in apps we control | MIT | ADOPT |
| [GlitchTip](https://gitlab.com/glitchtip/glitchtip-backend) | Self-hosted backend that accepts Sentry SDK events | MIT | ADOPT |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | Accessibility for HTML5 TV apps and PWAs | MPL-2.0 | ADOPT |
| [bbc/lrud-spatial](https://github.com/bbc/lrud-spatial), [NoriginMedia/Norigin-Spatial-Navigation](https://github.com/NoriginMedia/Norigin-Spatial-Navigation) | Expected focus-movement rules | Apache-2.0 / MIT | REFERENCE |

Roku has no official Sentry SDK. Use roku-report-analyzer and the console parser in §3, and report into GlitchTip.

## 11. Bugs to PRs

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) | Fix to PR when a person applies a label; triage and dedupe examples. Use an app token, or commits won't trigger CI. Use an API key, not a personal login, for client work. | MIT | ADOPT |
| [github/github-mcp-server](https://github.com/github/github-mcp-server) | Searching, creating and commenting on issues; read-only mode for the support agent | MIT | ADOPT |
| [github/gh-aw](https://github.com/github/gh-aw) + [githubnext/agentics](https://github.com/githubnext/agentics) | "Safe outputs": the agent holds no write token, and a separate step creates issues or PRs with label allowlists and dedupe-by-title; Jira and Linear outputs | MIT | ADAPT |
| [anthropics/claude-code](https://github.com/anthropics/claude-code) `.github/workflows` | Anthropic's own triage and dedupe design: 5 parallel searchers, a filter, up to 3 candidate duplicates, labels only, auto-close after 3 quiet days | Proprietary | REFERENCE; re-implement |
| [stefanbuck/github-issue-parser](https://github.com/stefanbuck/github-issue-parser) | Turns issue-form bodies into JSON | MIT | ADOPT if needed |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands), [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent), [Aider-AI/aider](https://github.com/Aider-AI/aider) | Other fix agents | MIT / Apache-2.0 | REFERENCE |
| [reportportal/reportportal](https://github.com/reportportal/reportportal) | ML failure analysis (heavy) | Apache-2.0 | REFERENCE |
| KindredPages: `crucible-fix.yml`, `auto-release.yml`, `verify-live.mjs` | Our own full loop: report, PR, ship, verify live | Ours | ADOPT |

GitHub has no official API for issue attachments, so evidence goes to R2 behind signed links and the issue body links to it.

## 12. Support and reviews

| Repo | What we use it for | License | Verdict |
|---|---|---|---|
| OrganizeMe help desk (`SPEC_HELP_DESK.md`, `netlify/functions/support-*.mjs`) | The four-step ladder (deflect, diagnose, allowlisted fix, human), agent-operator limits, app-scoped tables | Ours | ADOPT |
| [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) Community Edition | Help desk for a client that has none. Agent Bot webhooks; drafts posted as private notes. Its Captain AI is not in the Community Edition. | MIT core (the `enterprise/` directory is proprietary) | ADOPT if needed |
| Sonar connector (already in this workspace) | Apple and Google reviews for apps we own, plus draft replies | — | ADOPT |
| [facundoolano/google-play-scraper](https://github.com/facundoolano/google-play-scraper) | Public Google Play reviews (mind the store's terms) | MIT | ADOPT |
| [ZhgChgLi/ZReviewTender](https://github.com/ZhgChgLi/ZReviewTender) | App Store and Play reviews through official APIs | MIT | ADAPT |
| Anthropic customer-support quickstart, [openai/openai-cs-agents-demo](https://github.com/openai/openai-cs-agents-demo) | Support-agent patterns | MIT | REFERENCE |

Roku and Amazon have no review API. Google Play's API returns only the last 7 days of reviews.

## 13. Keep out of the product

| Item | Reason |
|---|---|
| Skyvern, testzeus-hercules, FreeScout, Zammad, libredesk, GADS, OpenStatus, k6 | AGPL |
| Dify, n8n | Resale and multi-tenant restrictions |
| Sentry's server, Bugsink | Competing-use or noncompete licenses |
| itu-p1203 | Non-commercial |
| Fastbot | Internal-use-only license |
| Argent | Binaries licensed only for that project |
| OmniParser | Repo license is CC BY 4.0, and older weights are AGPL; audit before any use |
| coinse/droidagent, wandervision, the OwlEyes fork | No license |
| BackstopJS, Lost Pixel, Peppermint, Helpy, Flowise | Unmaintained or archived |
| Shortest, LaVague, Magnitude | Inactive |
| browser-use | Mid-way through a runtime migration |
| claude-code-base-action | Mirror with no trust checks |
| Roku WebDriver | Changelog ends in 2021 |
| Maestro AI asserts, Checkly CLI, OpenHands' duplicate checker | Tied to the vendor's cloud |
| pymobiledevice3, qr-lipsync, DASH-IF Conformance, libcec, LIRC, python-kasa, uhubctl | GPL: internal or separate-process use only |

## 14. What no repo does: the part we build

This is the IP.

1. One Device MCP over every adapter, with a normalized UI tree across Roku XML, UiAutomator XML, tvOS accessibility, DOM and Vega, and focus-path "navigate to" planning.
2. Focus detection without a tree (reading the focus ring from a screenshot), plus a crawler for focus traps and dead ends.
3. A shared journey format, with exporters to Maestro (upstream and Plex's TV fork), Playwright and roku-test-automation.
4. The filter oracle: cue file vs. filter log vs. audio (silence plus speech-to-text), with latency calibration and known-answer titles.
5. A playback-event normalizer that puts Roku ECP, Media3, AVPlayer and Tizen events on one timeline.
6. TV certification checklists as code: Roku criteria, Google TV, Amazon, the tvOS guidelines, Samsung.
7. Evidence bundles with redaction, and cross-platform failure fingerprints for dedupe.
8. The loop from a customer report to a device repro, a verdict, and a re-check after the fix.
9. Lab operations: device registry, locking, health checks, power-cycling, developer-mode renewals, signing secrets.
10. Per-client tenancy, spend caps, audit, and prompt-injection hardening.
