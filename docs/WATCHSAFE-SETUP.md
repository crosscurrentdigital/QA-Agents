# WatchSafe QA: one-time setup

The WatchSafe checks run daily at 6am Mountain on GitHub Actions against production (there is no staging). They sign in as a dedicated QA family. This takes about 15 minutes, once.

## 1. Create the QA family on watchsafe.app

1. Sign up with a `+qatest` address, for example `claton+qatest1@cruciblelab.org`, using email and password (not Google sign-in).
   - "test" in the address marks it as a test account, so it stays out of admin analytics and MRR.
   - `+qatest` keeps it out of Encharge, so it never gets drip emails (WatchSafe PR #410).
2. Give it Control+ through a pilot link (Admin → Pilot access), so it never pays.
3. Add one child named "QA Kid" with:
   - two or three approved channels (any kid-safe channels),
   - no daily time limit, no emergency pause, no pinned-favorites or educational requirement,
   - the Shorts filter on.
4. Note the child's ID: open the child view, and the number after `/child/` in the address bar is the ID.
5. Note one approved video ID: play any approved video, and copy the 11-character ID from its YouTube link.

Optional, for the cross-family check: create a second QA family (`claton+qatest2@...`) with one child, and note that child's ID.

## 2. Add the secrets to the QA-Agents repo

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
| --- | --- |
| `QA_WATCHSAFE_PARENT_EMAIL` | the `+qatest1` address |
| `QA_WATCHSAFE_PARENT_PASSWORD` | its password |
| `QA_WATCHSAFE_CHILD_ID` | the QA Kid's ID |
| `QA_WATCHSAFE_APPROVED_VIDEO_ID` | one approved video ID |
| `QA_WATCHSAFE_OTHER_FAMILY_CHILD_ID` | optional, the second family's child ID |
| `QA_ISSUES_TOKEN` | a fine-grained GitHub token with **Issues: read and write** on `crosscurrentdigital/WatchSafe` only |

## 3. Run it

Actions → WatchSafe QA → Run workflow. Leave devices blank for the full run, or type `tablet`.

## What runs

| Check | Devices | Fails the run? |
| --- | --- | --- |
| Server refuses unapproved videos, signed-out calls, other families | once per run | yes (p0) |
| Child search shows only approved videos | once per run | yes (p0) |
| Player embed: single video, `rel=0`, nothing plays next, nocookie host | every device | yes (p0) |
| Pause removes the player before "More videos" can be tapped | every device | yes (p0) |
| YouTube logo, title and player-corner taps never leave the app | every device | yes (p0) |
| End of video: no end screen, nothing plays next | every device | yes (p0) |
| YouTube bot check is caught, not shown raw | every device | yes (p1) |
| No playlist player in the child view | every device | yes (p0) |
| Rotate mid-video keeps the same video | tablets | yes (p1) |
| Child view fits the tablet; tap targets ≥ 44px | tablets | no, files a p2 issue |
| Public pages load, pricing shows $4.99 / $6.99, home-page links resolve | every device | pages p2, pricing p1 |

Devices run tablet-first: iPad portrait and landscape, Android tablet portrait and landscape, then iPhone and Android phone. WebKit stands in for iPadOS and iOS, Chromium for Android.

## Where results go

- **GitHub issues** on WatchSafe with the `qa-agent` label. Each bug is filed once; a repeat sighting adds at most one comment a day. Close the issue when it's fixed.
- **`info` findings** (low confidence) only appear in the run summary, never as issues.
- **Every run** keeps the HTML report, screenshots, video and traces of failures for 14 days as a workflow artifact.

## Cost

- **YouTube quota:** close to none. Playback authorization and child search read WatchSafe's own database, and the embedded player doesn't use the Data API. The checks never run a YouTube search (100 units each).
- **GitHub Actions:** about 10–15 minutes a day.
- **Claude API:** none yet. The AI screenshot review comes next, capped per app.

## Not covered here yet

- Android app pinning and iPad Guided Access need real devices: Firebase Test Lab for Android at each release, and Guided Access by hand.
- Whether phones received the latest over-the-air bundle (Capawesome) needs a version endpoint to compare against.
- Web checkout up to Stripe, and the monthly 100%-off purchase.
