import { isTransientNetworkError } from '@/lib/resilience/network-read';

interface HydrateOptions {
  /** False once the page no longer needs this data (unmount, account change). */
  isActive: () => boolean;
  attempts?: number;
  retryDelayMs?: number;
}

function waitForNetwork(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('online', done);
      resolve();
    };
    const timer = setTimeout(done, delayMs);
    window.addEventListener('online', done);
  });
}

/**
 * Loads the student's data and, when the connection is down, tries again as
 * soon as it returns (or after a pause) instead of leaving the app empty until
 * a manual reload. Only network loss is retried: real failures surface at once.
 */
export async function hydrateWhenOnline(
  load: () => Promise<void>,
  { isActive, attempts = 3, retryDelayMs = 5000 }: HydrateOptions,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      if (!isTransientNetworkError(error) || attempt >= attempts) throw error;
      await waitForNetwork(retryDelayMs);
      if (!isActive()) throw error;
    }
  }
}
