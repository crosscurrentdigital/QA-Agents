// WatchSafe target. Production only (no staging); runs as dedicated QA accounts.
// QA accounts use +qatest plus-addresses (e.g. claton+qatest1@cruciblelab.org). WatchSafe marks
// any address containing "test" as a test account (excluded from admin analytics) and skips
// +qatest addresses in Encharge, so QA families never get drip emails.
export default {
  app: 'watchsafe',
  baseURL: process.env.QA_WATCHSAFE_BASE_URL || 'https://watchsafe.app',
  apiURL: process.env.QA_WATCHSAFE_API_URL || 'https://watchsafe-api.fly.dev',
  reportRepo: 'crosscurrentdigital/WatchSafe',

  // Hosts a child may legitimately land on. Anything else in the top window is an escape.
  allowedHosts: ['watchsafe.app'],

  qa: {
    parentEmail: process.env.QA_WATCHSAFE_PARENT_EMAIL,
    parentPassword: process.env.QA_WATCHSAFE_PARENT_PASSWORD,
    // Child in the QA family with a few approved channels, no time limit, no pinned/educational gate.
    childId: process.env.QA_WATCHSAFE_CHILD_ID,
    // One video the QA child is approved for (from an approved channel).
    approvedVideoId: process.env.QA_WATCHSAFE_APPROVED_VIDEO_ID,
    // Optional: a child in a different QA family, to prove cross-family access is refused.
    otherFamilyChildId: process.env.QA_WATCHSAFE_OTHER_FAMILY_CHILD_ID,
    // Optional: true when the QA family has YouTube Premium linked (player switches to youtube.com).
    premium: process.env.QA_WATCHSAFE_PREMIUM === 'true',
  },

  // Popular videos no QA child should ever be approved for. Authorization must deny every one.
  unapprovedVideoIds: [
    'dQw4w9WgXcQ', // Rick Astley, Never Gonna Give You Up
    'kJQP7kiw5Fk', // Luis Fonsi, Despacito
    '9bZkp7q19f0', // PSY, Gangnam Style
    'jNQXAC9IVRw', // Me at the zoo
  ],

  // Search terms for the child-search check. Results come from the approved-content database,
  // not the YouTube search API, so these cost no YouTube quota.
  childSearchTerms: ['science', 'music'],

  publicPages: [
    '/', '/features', '/how-it-works', '/pricing', '/about', '/faq', '/tutorials', '/compare',
    '/privacy-policy', '/terms-of-service', '/refund-policy', '/login',
    '/safe-youtube-for-kids', '/block-youtube-shorts', '/control-what-kids-watch-on-youtube',
    '/youtube-parental-controls', '/only-approved-videos-for-kids', '/youtube-whitelist-for-kids',
    '/youtube-kids-vs-watchsafe', '/youtube-time-limits-for-kids', '/youtube-addiction-kids',
    '/youtube-for-homeschool',
  ],

  prices: { control: '$4.99', controlPlus: '$6.99' },
};
