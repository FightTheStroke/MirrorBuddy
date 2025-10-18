import Foundation
@testable import MirrorBuddy
import Testing

// MARK: - Concurrency Helpers

private actor BoolFlag {
    private var value = false

    func setTrue() {
        value = true
    }

    func read() -> Bool {
        value
    }
}

private actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func read() -> Int {
        value
    }
}

@Suite("Fallback Strategy Tests")
@MainActor
struct FallbackTests {
    // MARK: - FallbackExecutor Tests

    @Test("Fallback executor returns primary result on success")
    func testPrimarySuccess() async {
        let result = await FallbackExecutor.executeWithFallback(
            primary: {
                "primary-success"
            },
            fallback: { _ in
                "fallback-value"
            }
        )

        switch result {
        case let .primary(value):
            #expect(value == "primary-success")
        case .fallback, .failed:
            Issue.record("Should have returned primary result")
        }
    }

    @Test("Fallback executor uses fallback on primary failure")
    func testFallbackOnPrimaryFailure() async {
        let result = await FallbackExecutor.executeWithFallback(
            primary: {
                throw UnifiedAPIError.timeout(context: nil)
            },
            fallback: { _ in
                "fallback-success"
            }
        )

        switch result {
        case .primary:
            Issue.record("Should have used fallback")
        case let .fallback(value, error):
            #expect(value == "fallback-success")
            #expect(error is UnifiedAPIError)
        case .failed:
            Issue.record("Fallback should have succeeded")
        }
    }

    @Test("Fallback executor returns failed when both fail")
    func testBothFail() async {
        let result = await FallbackExecutor.executeWithFallback(
            primary: {
                throw UnifiedAPIError.timeout(context: nil)
            },
            fallback: { _ in
                throw UnifiedAPIError.serverError(code: 500, message: "Server error", context: nil)
            }
        )

        switch result {
        case .primary, .fallback:
            Issue.record("Should have returned failed")
        case let .failed(error):
            #expect(error is UnifiedAPIError)
        }
    }

    @Test("Fallback executor throwing variant succeeds with primary")
    func testThrowingVariantPrimarySuccess() async throws {
        let result = try await FallbackExecutor.executeWithFallbackThrowing(
            primary: {
                "primary-success"
            },
            fallback: { _ in
                "fallback-value"
            }
        )

        #expect(result == "primary-success")
    }

    @Test("Fallback executor throwing variant succeeds with fallback")
    func testThrowingVariantFallbackSuccess() async throws {
        let result = try await FallbackExecutor.executeWithFallbackThrowing(
            primary: {
                throw UnifiedAPIError.timeout(context: nil)
            },
            fallback: { _ in
                "fallback-success"
            }
        )

        #expect(result == "fallback-success")
    }

    @Test("Fallback executor throwing variant throws when both fail")
    func testThrowingVariantBothFail() async throws {
        await #expect(throws: UnifiedAPIError.self) {
            try await FallbackExecutor.executeWithFallbackThrowing(
                primary: {
                    throw UnifiedAPIError.timeout(context: nil)
                },
                fallback: { _ in
                    throw UnifiedAPIError.serverError(code: 500, message: "Server error", context: nil)
                }
            )
        }
    }

    // MARK: - CachedDataFallback Tests

    @Test("Cached data fallback returns cached value")
    func testCachedDataFallback() async throws {
        let cache = SimpleCache()
        await cache.set(key: "test-key", value: "cached-value")

        let fallback = CachedDataFallback<String>(cacheKey: "test-key", cache: cache)
        let result = try await fallback.execute(
            primaryError: UnifiedAPIError.timeout(context: nil)
        )

        #expect(result == "cached-value")
    }

    @Test("Cached data fallback throws when no cache")
    func testCachedDataFallbackNoCache() async throws {
        let cache = SimpleCache()
        let fallback = CachedDataFallback<String>(cacheKey: "missing-key", cache: cache)

        await #expect(throws: FallbackError.self) {
            try await fallback.execute(
                primaryError: UnifiedAPIError.timeout(context: nil)
            )
        }
    }

    // MARK: - DefaultValueFallback Tests

    @Test("Default value fallback returns default")
    func testDefaultValueFallback() async throws {
        let fallback = DefaultValueFallback(defaultValue: "default-value")
        let result = try await fallback.execute(
            primaryError: UnifiedAPIError.timeout(context: nil)
        )

        #expect(result == "default-value")
    }

    // MARK: - AlternativeEndpointFallback Tests

    @Test("Alternative endpoint fallback calls alternative")
    func testAlternativeEndpointFallback() async throws {
        var alternativeCalled = false
        let fallback = AlternativeEndpointFallback {
            alternativeCalled = true
            return "alternative-result"
        }

        let result = try await fallback.execute(
            primaryError: UnifiedAPIError.timeout(context: nil)
        )

        #expect(alternativeCalled == true)
        #expect(result == "alternative-result")
    }

    @Test("Alternative endpoint fallback propagates errors")
    func testAlternativeEndpointFallbackError() async throws {
        let fallback = AlternativeEndpointFallback<String> {
            throw UnifiedAPIError.serverError(code: 500, message: "Alt failed", context: nil)
        }

        await #expect(throws: UnifiedAPIError.self) {
            try await fallback.execute(
                primaryError: UnifiedAPIError.timeout(context: nil)
            )
        }
    }

    // MARK: - DegradedFallback Tests

    @Test("Degraded fallback receives primary error")
    func testDegradedFallback() async throws {
        var receivedError: Error?
        let fallback = DegradedFallback<String> { error in
            receivedError = error
            return "degraded-result"
        }

        let primaryError = UnifiedAPIError.timeout(context: nil)
        let result = try await fallback.execute(primaryError: primaryError)

        #expect(receivedError != nil)
        #expect(result == "degraded-result")
    }

    // MARK: - SimpleCache Tests

    @Test("Simple cache stores and retrieves values")
    func testSimpleCacheBasics() async {
        let cache = SimpleCache()

        await cache.set(key: "test-key", value: "test-value")
        let retrieved = await cache.get(key: "test-key", type: String.self)

        #expect(retrieved == "test-value")
    }

    @Test("Simple cache returns nil for missing keys")
    func testSimpleCacheMissing() async {
        let cache = SimpleCache()
        let retrieved = await cache.get(key: "missing-key", type: String.self)

        #expect(retrieved == nil)
    }

    @Test("Simple cache removes values")
    func testSimpleCacheRemove() async {
        let cache = SimpleCache()

        await cache.set(key: "test-key", value: "test-value")
        await cache.remove(key: "test-key")
        let retrieved = await cache.get(key: "test-key", type: String.self)

        #expect(retrieved == nil)
    }

    @Test("Simple cache clears all values")
    func testSimpleCacheClear() async {
        let cache = SimpleCache()

        await cache.set(key: "key1", value: "value1")
        await cache.set(key: "key2", value: "value2")
        await cache.clear()

        let retrieved1 = await cache.get(key: "key1", type: String.self)
        let retrieved2 = await cache.get(key: "key2", type: String.self)

        #expect(retrieved1 == nil)
        #expect(retrieved2 == nil)
    }

    @Test("Simple cache respects TTL")
    func testSimpleCacheTTL() async throws {
        let cache = SimpleCache()

        await cache.set(key: "test-key", value: "test-value", ttl: 0.2)

        // Should be available immediately
        var retrieved = await cache.get(key: "test-key", type: String.self)
        #expect(retrieved == "test-value")

        // Wait for expiration
        try await _Concurrency.Task.sleep(nanoseconds: 300_000_000)  // 0.3 seconds

        // Should be expired
        retrieved = await cache.get(key: "test-key", type: String.self)
        #expect(retrieved == nil)
    }

    // MARK: - ResilientAPICall Tests

    @Test("Resilient API call succeeds with primary")
    func testResilientAPICallSuccess() async throws {
        let primaryFlag = BoolFlag()

        let result = try await ResilientAPICall.execute(
            endpoint: "test-endpoint",
            retryPolicy: .none,
            circuitBreakerConfig: .lenient,
            primary: {
                await primaryFlag.setTrue()
                return "success"
            },
            fallback: { _ in
                "fallback"
            }
        )

        let wasPrimaryCalled = await primaryFlag.read()
        #expect(wasPrimaryCalled == true)
        #expect(result == "success")
    }

    @Test("Resilient API call uses fallback on failure")
    func testResilientAPICallFallback() async throws {
        let fallbackFlag = BoolFlag()

        let result = try await ResilientAPICall.execute(
            endpoint: "test-endpoint",
            retryPolicy: .none,
            circuitBreakerConfig: .lenient,
            primary: {
                throw UnifiedAPIError.timeout(context: nil)
            },
            fallback: { _ in
                await fallbackFlag.setTrue()
                return "fallback-success"
            }
        )

        let wasFallbackCalled = await fallbackFlag.read()
        #expect(wasFallbackCalled == true)
        #expect(result == "fallback-success")
    }

    @Test("Resilient API call without fallback succeeds")
    func testResilientAPICallWithoutFallback() async throws {
        let result = try await ResilientAPICall.execute(
            endpoint: "test-endpoint-2",
            retryPolicy: .none,
            circuitBreakerConfig: .lenient
        ) {
            "success"
        }

        #expect(result == "success")
    }

    @Test("Resilient API call without fallback throws on failure")
    func testResilientAPICallWithoutFallbackFailure() async throws {
        await #expect(throws: UnifiedAPIError.self) {
            try await ResilientAPICall.execute(
                endpoint: "test-endpoint-3",
                retryPolicy: .none,
                circuitBreakerConfig: .lenient
            ) {
                throw UnifiedAPIError.timeout(context: nil)
            }
        }
    }

    // MARK: - Integration Tests

    @Test("Full resilience stack: circuit breaker + retry + fallback")
    func testFullResilienceStack() async throws {
        let attemptCounter = Counter()
        let fallbackFlag = BoolFlag()

        let result = try await ResilientAPICall.execute(
            endpoint: "full-test-endpoint",
            retryPolicy: RetryPolicy(
                maxRetries: 2,
                maxRetryDuration: 10.0,
                useExponentialBackoff: false,
                baseDelay: 0.1,
                maxDelay: 1.0,
                useJitter: false
            ),
            circuitBreakerConfig: .lenient,
            primary: {
                await attemptCounter.increment()
                throw UnifiedAPIError.timeout(context: nil)
            },
            fallback: { _ in
                await fallbackFlag.setTrue()
                return "fallback-result"
            }
        )

        let attempts = await attemptCounter.read()
        let wasFallbackCalled = await fallbackFlag.read()
        #expect(attempts > 1)  // Should have retried
        #expect(wasFallbackCalled == true)
        #expect(result == "fallback-result")
    }

    @Test("Fallback with cache integration")
    func testFallbackWithCache() async throws {
        let cache = SimpleCache()
        await cache.set(key: "api-response", value: "cached-response")

        let result = await FallbackExecutor.executeWithFallback(
            primary: {
                throw UnifiedAPIError.timeout(context: nil)
            },
            fallback: { error in
                let fallback = CachedDataFallback<String>(cacheKey: "api-response", cache: cache)
                return try await fallback.execute(primaryError: error)
            }
        )

        switch result {
        case .primary:
            Issue.record("Should have used fallback")
        case let .fallback(value, _):
            #expect(value == "cached-response")
        case .failed:
            Issue.record("Fallback should have succeeded")
        }
    }
}
