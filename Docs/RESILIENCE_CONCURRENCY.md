# Resilience Stack Concurrency Notes

Last updated: 17 October 2025

The resilience layer (retry, circuit breaker, fallback) has been hardened for
Swift 6 strict concurrency. The following rules summarize the design:

1. **Actor-owned shared state**
   - `CircuitBreaker` and `CircuitBreakerRegistry` remain `actor`s to
     serialize state about failures.
   - `SimpleCache` is an `actor` to guarantee thread-safety for cached
     responses.

2. **Sendable value types**
   - `RetryPolicy`, `ExponentialBackoffStrategy`, and `RetryExecutor`
     are annotated `Sendable`, confirming they carry no shared mutable state.

3. **Structured logging**
   - All diagnostic logging for retries/fallbacks now runs through
     `await MainActor.run { ... }`, replacing detached tasks and avoiding
     unstructured concurrency.

4. **Testing guidelines**
   - Tests that need to mutate state inside `@Sendable` closures must do so
     through helper actors (`BoolFlag`, `Counter`, etc.).
   - When authoring new tests, wrap mutable state in actors or use `ManagedAtomic`
     equivalents to satisfy strict concurrency checks.

5. **Extending the stack**
   - Additional resilience helpers should expose `@Sendable` closures for
     primary/fallback work and avoid capturing non-sendable references.
   - When adding new shared state, default to actor ownership unless
     there is a compelling reason otherwise.

For more context, see: `MirrorBuddy/Core/API/Fallback.swift`,
`MirrorBuddy/Core/API/RetryableTask.swift`, and `MirrorBuddyTests/FallbackTests.swift`.
