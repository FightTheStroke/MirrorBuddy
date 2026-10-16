import { withRetry } from './circuit-breaker';

export function isTransientNetworkError(error: unknown): error is TypeError {
  return (
    error instanceof TypeError &&
    /^(Load failed|Failed to fetch|Network request failed|NetworkError when attempting to fetch resource\.|Script https?:\/\/\S+ load failed)$/.test(
      error.message,
    )
  );
}

/** Only for repeatable reads or idempotent registration, never application writes. */
export function retryNetworkRead<T>(read: () => Promise<T>): Promise<T> {
  return withRetry(read, {
    maxRetries: 1,
    baseDelayMs: 250,
    maxDelayMs: 250,
    retryableErrors: isTransientNetworkError,
  });
}
