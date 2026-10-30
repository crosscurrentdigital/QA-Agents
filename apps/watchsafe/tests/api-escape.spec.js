import { test, expect } from '@playwright/test';
import { recordFinding } from '../../../engine/findings.js';
import { config, qaToken, requireQaAccount, onlyOnFirstDevice, authorizePlayback } from './helpers.js';

// The server decides every play (POST /api/children/:id/authorize-playback). If it ever says
// yes to a video the parent didn't approve, nothing on the device can save the child.
// These checks cost no YouTube quota: authorization reads WatchSafe's own database.

test.describe('Playback authorization (server)', () => {
  test.beforeEach(() => onlyOnFirstDevice());

  test('denies videos the parent never approved', async ({ request }) => {
    requireQaAccount();
    for (const videoId of config.unapprovedVideoIds) {
      const { status, body } = await authorizePlayback(request, config.qa.childId, videoId);
      if (body?.allow) {
        recordFinding(test.info(), {
          app: config.app,
          check: 'auth.unapproved-allowed',
          subject: videoId,
          severity: 'p0',
          title: `Server allowed an unapproved video (${videoId}) for the QA child`,
          details: `authorize-playback returned ${status} ${JSON.stringify(body)}`,
          steps: [`POST /api/children/<qa child>/authorize-playback {"video_id":"${videoId}"}`],
          suggestedFix: 'Check isVideoInApprovedSet in playbackAuthorizationService.js for the source it reported.',
        });
      }
      expect(body?.allow, `unapproved ${videoId} must be denied`).toBe(false);
      expect(body?.reason).toBe('not_in_approved_set');
    }
  });

  test('allows the approved test video', async ({ request }) => {
    requireQaAccount();
    test.skip(!config.qa.approvedVideoId, 'QA_WATCHSAFE_APPROVED_VIDEO_ID is not set');
    const { status, body } = await authorizePlayback(request, config.qa.childId, config.qa.approvedVideoId);
    expect(status).toBe(200);
    // time_limit_reached / emergency_paused mean the QA child is misconfigured, not a bug.
    expect(body?.reason ?? null, 'QA child should have no time limit or pause').toBeNull();
    expect(body?.allow).toBe(true);
    expect(body?.playback_token).toBeTruthy();
  });

  test('refuses requests with no sign-in', async ({ request }) => {
    requireQaAccount();
    const { status, body } = await authorizePlayback(request, config.qa.childId, config.qa.approvedVideoId || 'dQw4w9WgXcQ', { token: null });
    expect([401, 403]).toContain(status);
    expect(body?.allow).not.toBe(true);
  });

  test('refuses a child in another family', async ({ request }) => {
    requireQaAccount();
    test.skip(!config.qa.otherFamilyChildId, 'QA_WATCHSAFE_OTHER_FAMILY_CHILD_ID is not set');
    const { status, body } = await authorizePlayback(request, config.qa.otherFamilyChildId, 'dQw4w9WgXcQ');
    if (body?.allow) {
      recordFinding(test.info(), {
        app: config.app,
        check: 'auth.cross-family',
        severity: 'p0',
        title: 'A parent could authorize playback for a child in another family',
        details: `authorize-playback returned ${status} ${JSON.stringify(body)}`,
        suggestedFix: 'ensureChildAccess must reject a family mismatch.',
      });
    }
    expect(status).toBe(403);
  });

  test('does not reveal which child IDs exist to signed-out callers', async ({ request }) => {
    test.skip(!qaToken(), 'QA parent login is not set');
    const missing = await authorizePlayback(request, 2147483000, 'dQw4w9WgXcQ', { token: null });
    const existing = await authorizePlayback(request, config.qa.childId, 'dQw4w9WgXcQ', { token: null });
    if (missing.status !== existing.status) {
      // Soft finding: an attacker can't play anything, but can learn which child IDs are real.
      recordFinding(test.info(), {
        app: config.app,
        check: 'auth.child-id-enumeration',
        severity: 'p2',
        title: 'Signed-out requests can tell real child IDs from fake ones',
        details: `Unknown child → ${missing.status}; real child → ${existing.status}. ensureChildAccess looks up the child before checking sign-in.`,
        suggestedFix: 'In access/guards.js ensureChildAccess, return 401 for signed-out callers before the child lookup.',
      });
    }
  });
});

test.describe('Child search (server)', () => {
  test.beforeEach(() => onlyOnFirstDevice());

  test('every search result is a video the child may play', async ({ request }) => {
    requireQaAccount();
    const token = qaToken();
    for (const q of config.childSearchTerms) {
      const res = await request.get(`${config.apiURL}/api/children/${config.qa.childId}/search`, {
        params: { q, maxResults: 20 },
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const results = (await res.json()).results || [];
      for (const r of results.slice(0, 10)) {
        const videoId = r.video_id || r.youtube_video_id || r.videoId || r.id;
        if (!videoId) continue;
        const { body } = await authorizePlayback(request, config.qa.childId, String(videoId));
        if (body?.reason === 'not_in_approved_set') {
          recordFinding(test.info(), {
            app: config.app,
            check: 'search.unapproved-result',
            subject: String(videoId),
            severity: 'p0',
            title: `Child search for "${q}" showed a video the child isn't approved for (${videoId})`,
            details: 'Playback is still blocked by the server, but the child can see the title and thumbnail.',
            suggestedFix: 'Restrict /api/children/:id/search to the same approved set as playbackAuthorizationService.',
          });
        }
        expect(body?.reason, `search result ${videoId} must be in the approved set`).not.toBe('not_in_approved_set');
      }
    }
  });
});
