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

export function isIgnoredConsoleMessage(text: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isIgnoredRequest(url: string): boolean {
  return IGNORED_REQUEST_PATTERNS.some((pattern) => pattern.test(url));
}
