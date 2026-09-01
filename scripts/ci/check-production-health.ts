/**
 * Post-promotion health check.
 *
 * This decision used to live in five lines of YAML, and it got two things
 * wrong at once.
 *
 * It checked `https://mirrorbuddy.vercel.app` — a Vercel alias — while the
 * domain children and parents actually open is `mirrorbuddy.org`. A promotion
 * that left the canonical domain pointing somewhere else, or broken, passed the
 * check by asking a different address whether it felt well.
 *
 * And when the answer was bad it printed `::warning::` and let the job go
 * green: "the deployment may still be warming up. Check manually." Nobody
 * checks manually a job that reported success. A rollback decision that depends
 * on someone reading a warning in a green run is not a rollback decision.
 *
 * So: every URL that must be live is probed, warm-up is handled by retrying
 * rather than by shrugging, and a URL still unhealthy at the end fails the job.
 * The logic lives here, in a module a test can execute, instead of in a shell
 * fragment that only runs during a real production promotion.
 */

/** The addresses that must answer after a promotion. */
export const PRODUCTION_URLS = [
  // The canonical domain — what a user types. This is the one whose absence
  // from the old check was the defect. Use the www host directly: the apex
  // 308-redirects here, and probing a redirect proves nothing about the app.
  'https://www.mirrorbuddy.org',
  // The Vercel alias, kept because it is what the promotion step manipulates.
  'https://mirrorbuddy.vercel.app',
] as const;

export interface ProbeResult {
  url: string;
  status: number | null;
  /** null status means the request itself failed (DNS, TLS, timeout). */
  error?: string;
  attempts: number;
}

export interface HealthVerdict {
  healthy: boolean;
  results: ProbeResult[];
  /** Human-readable, one line per failing URL. Empty when healthy. */
  failures: string[];
}

export interface CheckOptions {
  urls?: readonly string[];
  attempts?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  path?: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function probe(
  url: string,
  path: string,
  attempts: number,
  delayMs: number,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
): Promise<ProbeResult> {
  let last: ProbeResult = { url, status: null, error: 'never attempted', attempts: 0 };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(`${url}${path}`);
      last = { url, status: response.status, attempts: attempt };
      if (response.status === 200) {
        return last;
      }
    } catch (error) {
      last = {
        url,
        status: null,
        error: error instanceof Error ? error.message : String(error),
        attempts: attempt,
      };
    }

    if (attempt < attempts) {
      // A cold serverless function is slow, not broken. Waiting is the right
      // response to that — passing the job is not.
      await sleep(delayMs);
    }
  }

  return last;
}

export async function checkProductionHealth(options: CheckOptions = {}): Promise<HealthVerdict> {
  const {
    urls = PRODUCTION_URLS,
    attempts = 5,
    delayMs = 15_000,
    fetchImpl = fetch,
    sleep = defaultSleep,
    path = '/api/health',
  } = options;

  const results: ProbeResult[] = [];
  for (const url of urls) {
    results.push(await probe(url, path, attempts, delayMs, fetchImpl, sleep));
  }

  const failures = results
    .filter((r) => r.status !== 200)
    .map((r) =>
      r.status === null
        ? `${r.url}${path} unreachable after ${r.attempts} attempts: ${r.error}`
        : `${r.url}${path} returned HTTP ${r.status} after ${r.attempts} attempts`,
    );

  return { healthy: failures.length === 0, results, failures };
}

export function formatVerdict(verdict: HealthVerdict): string {
  const lines = verdict.results.map((r) =>
    r.status === 200
      ? `✅ ${r.url} healthy (attempt ${r.attempts})`
      : `❌ ${r.url} ${r.status === null ? `unreachable: ${r.error}` : `HTTP ${r.status}`}`,
  );

  if (!verdict.healthy) {
    lines.push('');
    lines.push('::error::Production is not healthy after promotion. Roll back.');
    lines.push(...verdict.failures.map((f) => `::error::${f}`));
  }

  return lines.join('\n');
}

export async function main(): Promise<number> {
  const verdict = await checkProductionHealth();
  console.log(formatVerdict(verdict));
  return verdict.healthy ? 0 : 1;
}

// Guarded: importing this module must not probe production. Only an explicit
// invocation runs the check.
if (process.argv[1] && process.argv[1].endsWith('check-production-health.ts')) {
  main().then((code) => {
    process.exitCode = code;
  });
}
