# QA Agents rollout for internal apps

Use the existing QA Agents engine for Waysteward (RouteCaster), ScriptLoop, CraftSuite, KeepsakeVault, and KindredPages. Each app gets its own test journeys and fixtures. Keep one shared runner, evidence format, and deduplication flow.

## Start with Waysteward

The first workflow lives in RouteCaster so its existing private browser and billing workflows can run with repository-local permissions. It uses hosted GitHub runners. See [RouteCaster PR #786](https://github.com/crosscurrentdigital/RouteCaster/pull/786) for the nightly and manual runs. QA Agents remains the shared rollout and reporting project.

Cover road conditions with repeatable simulations and recorded inputs. Run a small smoke suite for every candidate, a larger scenario suite nightly, and real Android and Android Auto journeys against internal builds.

| Scenario | What the agent verifies |
| --- | --- |
| Clear, severe, and missing forecast coverage | Each route stretch shows the expected severity. Missing coverage remains visibly unknown. Planner and Drive use the accepted route and forecast. |
| Same conditions across vehicle types | Passenger car, RV and towing profiles receive the correct assessment for the same wind, ice, or combined conditions. |
| Warning moves or expires | Replaying newer weather updates the right stretch. Stale or delayed responses cannot overwrite the accepted assessment for a new route. |
| Reroute offered | A candidate is evaluated against the remaining route. Compare conditions and travel time. Silence or ambiguous speech preserves the current route. A clear yes applies the intended candidate once. |
| Loss and recovery of connectivity | Test a dropped connection during active guidance, after a waypoint, and after rerouting. Verify cached guidance, stale weather labels, and recovery on reconnection. |
| Routes and local time | Replay a cross-time-zone trip, an overnight stop, a loop, and a route that doubles back. Verify passage timing, the route line, and stop selection. |
| Phone and Android Auto | Install an internal build on a test phone. Verify phone Drive, display connection, turn guidance, alerts, reconnect, and microphone recognition using quiet and cabin-noise recordings. Use actual device results for hardware claims. |

Reuse RouteCaster's existing browser acceptance fixtures, Android workflow, and guidance tests. Build the initial pack around fixed GPS traces, forecast fixtures, and the existing route fixtures. Use read-only live probes for upstream availability. For weather, report fixture replay and live-provider observations separately.

## Add the other apps

The first scheduled checks run in each product repository using its own locked dependencies and test fixtures. GitHub Actions retains browser failure artifacts where available. The initial connections are:

| App | Initial scheduled checks |
| --- | --- |
| ScriptLoop | Signup through script creation, with mocked auth, audio and backend calls. [PR #247](https://github.com/crosscurrentdigital/ScriptLoop/pull/247) |
| CraftSuite | Existing lint, typecheck and unit suite, including signup UI, Stripe and RevenueCat tests. [PR #109](https://github.com/crosscurrentdigital/craftsuite/pull/109) |
| Keepsake Vault | Local public browser, accessibility and account-gate checks. [PR #96](https://github.com/crosscurrentdigital/KeepsakeVault/pull/96) |
| Kindred Pages | First-use library and scan journeys and PWA checks. [PR #59](https://github.com/crosscurrentdigital/KindredPages/pull/59) |

Full sandbox checkout and shared issue reporting are follow-up coverage. The scheduled checks begin when each workflow lands on its default branch.

| App | Initial journeys |
| --- | --- |
| ScriptLoop | Create and edit a script, generate a result using a test provider, resume after an interrupted job, and play or export the completed result. |
| CraftSuite | Create a project, edit and save it, reopen it, and verify its export on supported client sizes. Confirm exact actions against the app before implementing. |
| KeepsakeVault | Upload a synthetic keepsake, organize it, verify private versus shared access using two test accounts, and check restore behavior in a disposable account. |
| KindredPages | Scan or add a book, edit it, verify synchronization across devices, and reopen saved content offline. Reuse the existing report-to-release workflow. |

## Core journeys for every app

- **Onboarding:** Start from a clean session. Exercise sign-up, verification, permissions, first successful action, and resume after interruption. Check whether a first-time user can find the next step and recover from an error without getting stuck.
- **UI and UX:** Check mobile and desktop layouts, readable labels, keyboard navigation, actionable error messages, and loading and empty states. Capture screenshots for visual regressions. Record qualitative findings with the exact journey and evidence.
- **Purchases:** For each paid app, use the supported payment sandbox or store test environment. Verify the displayed plan and price, successful checkout, declined payment, cancellation, and retry. Confirm that a successful purchase unlocks the right features and that failed or cancelled attempts never grant access. For subscriptions, cover renewal or cancellation and restore purchases where supported. Use test accounts and test payment methods. Keep production checks read-only.

## Purchase test lanes

- **RevenueCat on mobile:** Run separate Apple and Google purchase checks where the app supports those stores. Exercise the paywall and offering, checkout success, cancellation, pending purchase, restore, and subscription expiry using store test environments. Verify the RevenueCat entitlement unlocks the correct account and feature. Label simulator results separately from real-store tests on devices.
- **Stripe on the web:** Run checkout in Stripe test mode. Verify the plan and price, successful payment, decline, cancellation and retry, billing portal cancellation, and renewal or expiry. Verify signed webhook processing and entitlement updates. Repeated or delayed events must leave the account in the correct state.
- **Cross-platform:** Where both lanes sell the same subscription, verify that the same account sees the expected access on phone and web. Include an account switch and check that a customer who already has access is guided away from an unnecessary duplicate purchase.

## Agent roles and outputs

- Journey agents run defined suites and explore adjacent flows within app-specific limits. Convert reproduced failures into deterministic tests.
- A replay agent checks reproducibility against the same build and fixtures and records a passing control where appropriate. Keep flaky runs, provider outages, and blocked device runs visible.
- A triage agent groups duplicate failures and drafts a report with the app, exact build, scenario, expected and actual behavior, reproduction steps, and redacted proof. Route confirmed findings to the owning repository through the existing reporter.
- Keep state-changing journeys on staging or disposable test accounts. Use synthetic records and test billing. Release decisions use reproducible checks and explicit device evidence.

## First rollout milestone

Wire Waysteward into the QA Agents runner and prove one unattended Planner-to-Drive replay with a known failure control. Then add the weather and connectivity matrix and an Android Auto testing lane. Begin parallel onboarding of the other app packs once the first pack produces reproducible, deduplicated findings.
