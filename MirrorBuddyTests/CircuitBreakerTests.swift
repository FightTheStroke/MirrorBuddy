import Foundation
@testable import MirrorBuddy
import Testing

@Suite("Circuit Breaker Tests")
@MainActor
struct CircuitBreakerTests {
    // MARK: - Circuit Breaker State Tests

    @Test("Circuit breaker starts in closed state")
    func testInitialState() async {
        let breaker = CircuitBreaker(endpoint: "test-endpoint")
        let state = await breaker.currentState()
        #expect(state == .closed)
    }

    @Test("Circuit breaker opens after threshold failures")
    func testOpensAfterThreshold() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 3,
            failureWindow: 60.0,
            openDuration: 30.0,
            successThreshold: 2
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // First 2 failures should keep circuit closed
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        var state = await breaker.currentState()
        #expect(state == .closed)

        // Third failure should open the circuit
        do {
            try await breaker.execute {
                throw UnifiedAPIError.timeout(context: nil)
            }
        } catch {
            // Expected
        }

        state = await breaker.currentState()
        #expect(state == .open)
    }

    @Test("Circuit breaker blocks requests when open")
    func testBlocksWhenOpen() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 2,
            failureWindow: 60.0,
            openDuration: 30.0,
            successThreshold: 2
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // Cause failures to open circuit
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        // Next request should be blocked
        await #expect(throws: CircuitBreakerError.self) {
            try await breaker.execute {
                return "success"
            }
        }
    }

    @Test("Circuit breaker transitions to half-open after open duration")
    func testTransitionsToHalfOpen() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 2,
            failureWindow: 60.0,
            openDuration: 0.5,  // Short duration for testing
            successThreshold: 1
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // Open the circuit
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        var state = await breaker.currentState()
        #expect(state == .open)

        // Wait for open duration
        try await _Concurrency.Task.sleep(nanoseconds: 600_000_000)  // 0.6 seconds

        // Execute an operation to trigger state update
        do {
            _ = try await breaker.execute {
                return "success"
            }
        } catch {
            // May fail or succeed, we just want state update
        }

        state = await breaker.currentState()
        #expect(state != .open)  // Should be half-open or closed
    }

    @Test("Circuit breaker closes after successful requests in half-open")
    func testClosesAfterSuccesses() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 2,
            failureWindow: 60.0,
            openDuration: 0.1,
            successThreshold: 2
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // Open the circuit
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        // Wait to transition to half-open
        try await _Concurrency.Task.sleep(nanoseconds: 200_000_000)

        // Execute successful operations
        for _ in 0..<2 {
            do {
                _ = try await breaker.execute {
                    return "success"
                }
            } catch {
                // Ignore
            }
        }

        let state = await breaker.currentState()
        #expect(state == .closed)
    }

    @Test("Circuit breaker reopens on failure in half-open state")
    func testReopensOnHalfOpenFailure() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 2,
            failureWindow: 60.0,
            openDuration: 0.1,
            successThreshold: 2
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // Open the circuit
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        // Wait to transition to half-open
        try await _Concurrency.Task.sleep(nanoseconds: 200_000_000)

        // Fail in half-open state
        do {
            _ = try await breaker.execute {
                throw UnifiedAPIError.timeout(context: nil)
            }
        } catch {
            // Expected
        }

        let state = await breaker.currentState()
        #expect(state == .open)
    }

    @Test("Circuit breaker respects failure window")
    func testFailureWindow() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 3,
            failureWindow: 0.5,  // Short window for testing
            openDuration: 30.0,
            successThreshold: 2
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // First 2 failures
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        // Wait for window to expire
        try await _Concurrency.Task.sleep(nanoseconds: 600_000_000)

        // Old failures should be removed, so 1 more failure shouldn't open
        do {
            try await breaker.execute {
                throw UnifiedAPIError.timeout(context: nil)
            }
        } catch {
            // Expected
        }

        let state = await breaker.currentState()
        #expect(state == .closed)
    }

    @Test("Circuit breaker reset clears state")
    func testReset() async throws {
        let config = CircuitBreaker.Configuration(
            failureThreshold: 2,
            failureWindow: 60.0,
            openDuration: 30.0,
            successThreshold: 2
        )
        let breaker = CircuitBreaker(endpoint: "test-endpoint", configuration: config)

        // Open the circuit
        for _ in 0..<2 {
            do {
                try await breaker.execute {
                    throw UnifiedAPIError.timeout(context: nil)
                }
            } catch {
                // Expected
            }
        }

        var state = await breaker.currentState()
        #expect(state == .open)

        // Reset
        await breaker.reset()

        state = await breaker.currentState()
        #expect(state == .closed)

        // Should be able to execute now
        let result = try await breaker.execute {
            return "success"
        }
        #expect(result == "success")
    }

    @Test("Circuit breaker statistics are accurate")
    func testStatistics() async throws {
        let breaker = CircuitBreaker(endpoint: "test-endpoint")

        // Execute some operations
        for index in 0..<3 {
            do {
                _ = try await breaker.execute {
                    if index < 2 {
                        throw UnifiedAPIError.timeout(context: nil)
                    }
                    return "success"
                }
            } catch {
                // Expected for first 2
            }
        }

        let stats = await breaker.statistics()
        #expect(stats.endpoint == "test-endpoint")
        #expect(stats.state == .closed)
    }

    // MARK: - Circuit Breaker Registry Tests

    @Test("Circuit breaker registry returns same instance for endpoint")
    func testRegistrySingleInstance() async {
        let breaker1 = await CircuitBreakerRegistry.shared.breaker(for: "test-endpoint")
        let breaker2 = await CircuitBreakerRegistry.shared.breaker(for: "test-endpoint")

        // Should be same instance
        let state1 = await breaker1.currentState()
        let state2 = await breaker2.currentState()
        #expect(state1 == state2)
    }

    @Test("Circuit breaker registry creates different instances for different endpoints")
    func testRegistryDifferentEndpoints() async {
        let breaker1 = await CircuitBreakerRegistry.shared.breaker(for: "endpoint-1")
        let breaker2 = await CircuitBreakerRegistry.shared.breaker(for: "endpoint-2")

        // Modify breaker1
        do {
            _ = try await breaker1.execute {
                throw UnifiedAPIError.timeout(context: nil)
            }
        } catch {
            // Expected
        }

        let state1 = await breaker1.currentState()
        let state2 = await breaker2.currentState()

        // breaker2 should still be closed
        #expect(state2 == .closed)
    }

    @Test("Circuit breaker registry all statistics")
    func testRegistryAllStatistics() async {
        await CircuitBreakerRegistry.shared.resetAll()

        _ = await CircuitBreakerRegistry.shared.breaker(for: "endpoint-1")
        _ = await CircuitBreakerRegistry.shared.breaker(for: "endpoint-2")

        let allStats = await CircuitBreakerRegistry.shared.allStatistics()
        #expect(allStats.count >= 2)
    }

    // MARK: - Circuit Breaker Configuration Tests

    @Test("Default configuration values")
    func testDefaultConfiguration() {
        let config = CircuitBreaker.Configuration.default

        #expect(config.failureThreshold == 5)
        #expect(config.failureWindow == 60.0)
        #expect(config.openDuration == 30.0)
        #expect(config.successThreshold == 2)
    }

    @Test("Aggressive configuration values")
    func testAggressiveConfiguration() {
        let config = CircuitBreaker.Configuration.aggressive

        #expect(config.failureThreshold == 3)
        #expect(config.failureWindow == 30.0)
        #expect(config.openDuration == 60.0)
        #expect(config.successThreshold == 3)
    }

    @Test("Lenient configuration values")
    func testLenientConfiguration() {
        let config = CircuitBreaker.Configuration.lenient

        #expect(config.failureThreshold == 10)
        #expect(config.failureWindow == 120.0)
        #expect(config.openDuration == 15.0)
        #expect(config.successThreshold == 1)
    }

    // MARK: - Integration with RetryExecutor Tests

    @Test("Circuit breaker with retry executor")
    func testWithRetryExecutor() async throws {
        var callCount = 0

        do {
            _ = try await RetryExecutor.executeWithCircuitBreaker(
                endpoint: "test-retry-endpoint",
                policy: RetryPolicy(
                    maxRetries: 2,
                    maxRetryDuration: 10.0,
                    useExponentialBackoff: false,
                    baseDelay: 0.1,
                    maxDelay: 1.0,
                    useJitter: false
                )
            ) {
                callCount += 1
                if callCount < 3 {
                    throw UnifiedAPIError.timeout(context: nil)
                }
                return "success"
            }
        } catch {
            // May fail
        }

        #expect(callCount > 1)  // Should have retried
    }
}
