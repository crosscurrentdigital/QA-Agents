// Watches a page for any way out of the app: a new tab or window, the top page navigating to
// another site, or a non-allowed host loading as a page. Call before the risky action, then
// check `escapes` after it.

export function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function isAllowedHost(host, allowedHosts) {
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function watchForEscapes(page, { allowedHosts }) {
  const escapes = [];
  const context = page.context();
  const onPage = (newPage) => escapes.push({ kind: 'new-window', url: newPage.url() || '(opening)' });
  const onNav = (frame) => {
    if (frame !== page.mainFrame()) return;
    const host = hostOf(frame.url());
    if (host && !isAllowedHost(host, allowedHosts)) escapes.push({ kind: 'top-navigation', url: frame.url() });
  };
  context.on('page', onPage);
  page.on('framenavigated', onNav);
  return {
    escapes,
    stop() {
      context.off('page', onPage);
      page.off('framenavigated', onNav);
    },
  };
}

/** Parse a YouTube embed src into the parameters that decide what a child can reach. */
export function parseEmbed(src) {
  const url = new URL(src);
  const videoId = url.pathname.split('/embed/')[1]?.split('/')[0] || '';
  const p = url.searchParams;
  return {
    host: url.hostname,
    videoId,
    isPlaylistEmbed: videoId === 'videoseries' || p.has('list'),
    rel: p.get('rel'),
    playlist: p.get('playlist'),
    loop: p.get('loop'),
    controls: p.get('controls'),
    fs: p.get('fs'),
  };
}

/**
 * Problems with an embed shown to a child. Empty array = safe. Each problem is
 * { check, title, suggestedFix } for recordFinding.
 */
export function embedProblems(embed, { allowAuthenticatedEmbed = false } = {}) {
  const problems = [];
  const allowedHosts = allowAuthenticatedEmbed
    ? ['www.youtube-nocookie.com', 'www.youtube.com']
    : ['www.youtube-nocookie.com'];
  if (!allowedHosts.includes(embed.host)) {
    problems.push({ check: 'player.host', title: `Child player loads from ${embed.host}`, suggestedFix: 'Use youtube-nocookie.com unless the family linked YouTube Premium.' });
  }
  if (embed.isPlaylistEmbed) {
    problems.push({ check: 'player.playlist-embed', title: 'Child player is a full playlist embed, so a child can move to videos that weren\'t approved one by one', suggestedFix: 'Embed a single video with playlist=<same id>.' });
  }
  if (embed.rel !== '0') {
    problems.push({ check: 'player.rel', title: `Child player has rel=${embed.rel ?? '(missing)'}, so YouTube can suggest other channels`, suggestedFix: 'Set rel=0 on every child embed.' });
  }
  if (!embed.isPlaylistEmbed && embed.playlist !== embed.videoId) {
    problems.push({ check: 'player.next-video', title: 'Child player can autoplay a next video', suggestedFix: 'Set playlist=<videoId>&loop=0 so nothing plays next.' });
  }
  return problems;
}
