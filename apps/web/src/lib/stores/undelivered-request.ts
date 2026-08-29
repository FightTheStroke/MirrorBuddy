/**
 * Tells a request that never reached the server from a real failure.
 *
 * A store load can throw for two very different reasons. Either the browser
 * dropped the request — the page was still settling, React re-rendered, or the
 * student navigated on — or the network is genuinely down. Chrome reports both
 * as the same `TypeError: Failed to fetch`, so they cannot be told apart from
 * the message alone.
 *
 * Neither case is actionable inside a store: the screen keeps whatever it had
 * and the next render asks again, which is why the very same page then loads
 * correctly. Logging them as errors filled the console with red messages that
 * looked like a broken app and buried the failures that mattered. Anything the
 * server actually answers — a 4xx or 5xx — does not come through here.
 */

export function isUndeliveredRequest(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (!(error instanceof TypeError)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('aborted')
  );
}
