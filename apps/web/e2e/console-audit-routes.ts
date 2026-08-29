/**
 * Routes covered by the browser console audit.
 *
 * Every page a student, parent or visitor can reach without admin rights.
 * Adding a page to the app means adding it here — the audit is the only
 * automated gate that reads what the browser itself complains about.
 */

export const CONSOLE_AUDIT_ROUTES = [
  '/',
  '/accessibility',
  '/achievements',
  '/ai-policy',
  '/ai-transparency',
  '/analytics',
  '/archivio',
  '/astuccio',
  '/chart',
  '/compliance',
  '/cookies',
  '/demo',
  '/diagram',
  '/flashcard',
  '/flashcards',
  '/formula',
  '/homework',
  '/landing',
  '/login',
  '/maestri/loto',
  '/maestri/leonardo',
  '/mindmap',
  '/pdf',
  '/pricing',
  '/privacy',
  '/pro',
  '/quiz',
  '/search',
  '/study-kit',
  '/summary',
  '/supporti',
  '/terms',
  '/timeline',
  '/typing',
] as const;

/**
 * Console noise that is expected and carries no user impact.
 *
 * Keep this list short and justified: every entry is a warning we chose to
 * live with, and an entry that hides a real defect defeats the whole audit.
 */
export const IGNORED_CONSOLE_PATTERNS: readonly RegExp[] = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /Extra attributes from the server/i,
  /webkit-text-size-adjust/i,
  /favicon\.ico/i,
];

/**
 * Network failures that do not indicate a broken page.
 */
export const IGNORED_REQUEST_PATTERNS: readonly RegExp[] = [
  /favicon\.ico/i,
  /\/_next\/static\/.*\.map$/i,
  /sentry\.io/i,
  /vitals\.vercel-insights/i,
];

/**
 * Realtime voice endpoints answer 503 when the server holds no Azure voice
 * credentials. That is the designed answer, not a defect — and CI holds no
 * credentials on purpose, so that every run stays free and no production key
 * travels into a test job.
 *
 * The exception is therefore gated on an environment that says so out loud.
 * The production smoke run does not set it, so a 503 against the live site
 * still fails the audit, which is the case that would actually hurt a child.
 */
const VOICE_ENDPOINT_PATTERN = /\/api\/realtime\//i;

export function isVoiceDeliberatelyUnconfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.E2E_VOICE_UNCONFIGURED === 'true';
}

export function isIgnoredConsoleMessage(text: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isIgnoredRequest(url: string, status?: number): boolean {
  if (IGNORED_REQUEST_PATTERNS.some((pattern) => pattern.test(url))) return true;
  return status === 503 && VOICE_ENDPOINT_PATTERN.test(url) && isVoiceDeliberatelyUnconfigured();
}
