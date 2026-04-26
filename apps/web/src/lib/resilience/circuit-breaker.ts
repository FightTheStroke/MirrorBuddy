/**
 * Circuit Breaker + Retry with Backoff
 * F-05: External services MUST have circuit breaker + retry/backoff
 */

/**
 * Circuit breaker states
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Number of successes to close circuit from half-open (default: 2) */
  successThreshold?: number;
  /** Milliseconds before transitioning to half-open (default: 30000) */
  timeout?: number;
  /** Callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Retry configuration with exponential backoff
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Predicate to determine if error is retryable (default: all errors retryable) */
  retryableErrors?: (error: Error) => boolean;
}

/**
 * Combined resilience options
 */
export interface ResilienceOptions {
  circuitBreaker?: CircuitBreakerOptions;
  retry?: RetryOptions;
}

/**
 * Circuit breaker implementation
 * Prevents cascading failures by failing fast when service is unhealthy
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly onStateChange?: (
    from: CircuitState,
    to: CircuitState,
  ) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 30000;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateStateIfNeeded();

    if (this.state === "OPEN") {
      throw new Error("Circuit breaker is OPEN");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateStateIfNeeded();
    return this.state;
  }

  /**
   * Reset circuit to CLOSED state
   */
  reset(): void {
    this.transitionTo("CLOSED");
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
  }

  /**
   * Update state based on timeout
   */
  private updateStateIfNeeded(): void {
    if (this.state === "OPEN" && Date.now() >= this.nextAttemptTime) {
      this.transitionTo("HALF_OPEN");
      this.successCount = 0;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo("CLOSED");
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;

    if (this.state === "HALF_OPEN") {
      this.transitionTo("OPEN");
      this.nextAttemptTime = Date.now() + this.timeout;
    } else if (
      this.state === "CLOSED" &&
      this.failureCount >= this.failureThreshold
    ) {
      this.transitionTo("OPEN");
      this.nextAttemptTime = Date.now() + this.timeout;
    }
  }

  /**
   * Transition to new state with callback
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState !== newState) {
      this.state = newState;
      this.onStateChange?.(oldState, newState);
    }
  }
}

/**
 * Calculate exponential backoff delay with jitter
 * Jitter prevents thundering herd problem
 */
function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, attempt),
    maxDelayMs,
  );
  // Add random jitter (0-50% of delay)
  const jitter = exponentialDelay * Math.random() * 0.5;
  return exponentialDelay + jitter;
}

/**
 * Retry function with exponential backoff
 * Retries failed operations with increasing delays
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    retryableErrors = () => true,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if not retryable or on last attempt
      if (!retryableErrors(lastError) || attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Combine circuit breaker and retry for maximum resilience
 * Circuit breaker prevents repeated calls to failing service
 * Retry with backoff handles transient failures
 */
export function withResilience<T>(
  fn: () => Promise<T>,
  options: ResilienceOptions = {},
): () => Promise<T> {
  const breaker = new CircuitBreaker(options.circuitBreaker);
  const retryOptions = options.retry;

  return async () => {
    return withRetry(() => breaker.execute(fn), retryOptions);
  };
}
