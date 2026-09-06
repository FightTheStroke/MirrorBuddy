import {
  hasAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from '@/lib/consent/unified-consent-storage';
import { csrfFetch } from '@/lib/auth';

let generation = 0;
const pendingRequests = new Set<AbortController>();
const revokeListeners = new Set<() => void>();

subscribeToAnalyticsConsent((allowed) => {
  if (allowed && hasAnalyticsConsent()) return;
  generation++;
  for (const request of pendingRequests) request.abort();
  for (const listener of revokeListeners) listener();
});

export { hasAnalyticsConsent };
export const getAnalyticsGeneration = () => generation;

export function onAnalyticsRevoked(listener: () => void): () => void {
  revokeListeners.add(listener);
  return () => {
    revokeListeners.delete(listener);
  };
}

/** Keeps the signal live through both the request and consumption of its response body. */
export async function withOptionalAnalyticsRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T | null> {
  if (!hasAnalyticsConsent()) return null;
  const started = generation;
  const controller = new AbortController();
  pendingRequests.add(controller);
  try {
    const result = await operation(controller.signal);
    if (generation !== started || !hasAnalyticsConsent()) return null;
    return result;
  } catch (error) {
    if (controller.signal.aborted) return null;
    throw error;
  } finally {
    pendingRequests.delete(controller);
  }
}

/** The abort signal also covers csrfFetch's token lookup and token-refresh retry. */
export async function sendOptionalAnalytics(url: string, payload: unknown): Promise<boolean> {
  return (
    (await withOptionalAnalyticsRequest(async (signal) => {
      const response = await csrfFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true,
        signal,
      });
      if (response.status === 401 || response.status === 403) return false;
      if (!response.ok) throw new Error(`Optional analytics request failed: ${response.status}`);
      return true;
    })) === true
  );
}
