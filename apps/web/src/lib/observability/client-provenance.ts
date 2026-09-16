/**
 * Client provenance for error reporting.
 *
 * Production error triage repeatedly stalled on a question the events could not
 * answer: was this a real student, a scanner, or our own end-to-end run? The
 * provenance had to be re-derived by hand from raw user-agent strings, one
 * event at a time, and several groups stayed unattributable (issue #846
 * follow-up, decided 2026-09-16).
 *
 * These helpers turn that guesswork into two bounded, low-cardinality tags that
 * every reported error carries. They are deliberately pure and side-effect
 * free so both the browser and the server report the same vocabulary.
 *
 * Privacy: the returned values are fixed slugs chosen from the tables below.
 * The raw agent string is never echoed back, so no request-identifying content
 * can leak into a tag.
 */

export type ClientKind = 'browser' | 'automation' | 'bot' | 'http-client' | 'unknown';

export interface ClientProvenance {
  /** What kind of caller produced the event. */
  clientKind: ClientKind;
  /** Short slug naming the agent family, safe to use as a Sentry tag. */
  uaFamily: string;
  /** Which signal proved automation, when one did. */
  automationMarker?: string;
}

interface ClassifyOptions {
  /** `navigator.webdriver` — true whenever the page is driven by a tool. */
  webdriver?: boolean;
}

const UNKNOWN: ClientProvenance = { clientKind: 'unknown', uaFamily: 'unknown' };

/** Ordered: the first match wins, so put the specific markers before the generic ones. */
const AUTOMATION_MARKERS: ReadonlyArray<readonly [RegExp, string, string]> = [
  [/headlesschrome/i, 'headless-chrome', 'headless-chrome'],
  [/playwright/i, 'playwright', 'playwright'],
  [/puppeteer/i, 'puppeteer', 'puppeteer'],
  [/selenium|webdriver/i, 'selenium', 'selenium'],
  [/lighthouse/i, 'lighthouse', 'lighthouse'],
  [/phantomjs/i, 'phantomjs', 'phantomjs'],
  [/electron/i, 'electron', 'electron'],
];

const BOT_MARKERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/googlebot/i, 'googlebot'],
  [/bingbot/i, 'bingbot'],
  [/uptimerobot/i, 'uptimerobot'],
  [/pingdom/i, 'pingdom'],
  [/datadog/i, 'datadog'],
  [/ahrefsbot/i, 'ahrefsbot'],
  [/semrushbot/i, 'semrushbot'],
  [/yandexbot/i, 'yandexbot'],
  [/duckduckbot/i, 'duckduckbot'],
  [/facebookexternalhit/i, 'facebook-crawler'],
  [/slackbot/i, 'slackbot'],
  [/discordbot/i, 'discordbot'],
  [/twitterbot/i, 'twitterbot'],
  [/vercel-screenshot|vercel-favicon/i, 'vercel-crawler'],
  [/\b(bot|crawler|spider)\b/i, 'other-bot'],
];

const HTTP_CLIENT_MARKERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^curl\//i, 'curl'],
  [/^wget\//i, 'wget'],
  [/python-requests|aiohttp|httpx/i, 'python-http'],
  [/go-http-client/i, 'go-http'],
  [/node-fetch|undici|axios/i, 'node-http'],
  [/okhttp/i, 'okhttp'],
  [/postman/i, 'postman'],
  [/insomnia/i, 'insomnia'],
];

/** Ordered: Edge and Opera impersonate Chrome, Chrome impersonates Safari. */
const BROWSER_MARKERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/edg[ea]?\//i, 'edge'],
  [/opr\/|opera/i, 'opera'],
  [/samsungbrowser/i, 'samsung'],
  [/firefox\/|fxios\//i, 'firefox'],
  [/crios\//i, 'chrome-ios'],
  [/chrome\/|chromium\//i, 'chrome'],
  [/safari\//i, 'safari'],
];

function firstMatch<T extends readonly [RegExp, ...string[]]>(
  ua: string,
  table: ReadonlyArray<T>,
): T | undefined {
  return table.find(([pattern]) => pattern.test(ua));
}

/**
 * Classify the caller behind an error event.
 *
 * @param userAgent - Raw agent string; may be missing or malformed.
 * @param options - Extra browser-only signals, when available.
 * @returns Bounded tag values; never throws, never echoes the input.
 */
export function classifyClient(
  userAgent: string | undefined | null,
  options: ClassifyOptions = {},
): ClientProvenance {
  const ua = typeof userAgent === 'string' ? userAgent.trim() : '';

  if (options.webdriver === true) {
    const family = ua ? resolveFamily(ua) : 'unknown';
    return { clientKind: 'automation', uaFamily: family, automationMarker: 'webdriver' };
  }

  if (!ua) return { ...UNKNOWN };

  const automation = firstMatch(ua, AUTOMATION_MARKERS);
  if (automation) {
    const [, family, marker] = automation;
    return { clientKind: 'automation', uaFamily: family, automationMarker: marker };
  }

  const bot = firstMatch(ua, BOT_MARKERS);
  if (bot) return { clientKind: 'bot', uaFamily: bot[1] };

  const httpClient = firstMatch(ua, HTTP_CLIENT_MARKERS);
  if (httpClient) return { clientKind: 'http-client', uaFamily: httpClient[1] };

  const browser = firstMatch(ua, BROWSER_MARKERS);
  if (browser) return { clientKind: 'browser', uaFamily: resolveFamily(ua) };

  return { ...UNKNOWN };
}

function resolveFamily(ua: string): string {
  const browser = firstMatch(ua, BROWSER_MARKERS);
  if (!browser) return 'unknown';

  const family = browser[1];
  const isApplePortable = /iphone|ipad|ipod/i.test(ua);

  if (isApplePortable && (family === 'safari' || family === 'chrome')) {
    return family === 'safari' ? 'safari-ios' : 'chrome-ios';
  }

  return family;
}

/** Path segments that identify one record rather than one route. */
const NUMERIC_SEGMENT = /^\d+$/;
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPAQUE_ID_SEGMENT = /^[0-9a-z]{16,}$/i;

/**
 * Reduce a request URL to a groupable route.
 *
 * Strips the query string and fragment — which may carry tokens or personal
 * data — and collapses identifier-shaped segments, so that a failure on one
 * material groups with the same failure on another instead of producing a new
 * issue per record.
 *
 * @param url - Absolute URL or bare path; may be missing or malformed.
 * @returns The normalized route, or `undefined` when nothing usable is present.
 */
export function normalizeRequestRoute(url: string | undefined | null): string | undefined {
  if (typeof url !== 'string') return undefined;

  const candidate = url.trim();
  // Anything that is neither an absolute URL nor a rooted path is not a route.
  if (candidate === '' || !(candidate.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(candidate))) {
    return undefined;
  }

  let pathname: string;
  try {
    pathname = new URL(candidate, 'https://placeholder.invalid').pathname;
  } catch {
    return undefined;
  }

  if (!pathname.startsWith('/')) return undefined;

  const normalized = pathname
    .split('/')
    .map((segment) =>
      NUMERIC_SEGMENT.test(segment) || UUID_SEGMENT.test(segment) || OPAQUE_ID_SEGMENT.test(segment)
        ? ':id'
        : segment,
    )
    .join('/');

  return normalized.length > 1 ? normalized.replace(/\/$/, '') : '/';
}
