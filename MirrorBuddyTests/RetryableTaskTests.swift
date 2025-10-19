import Foundation
@testable import MirrorBuddy
import Testing

@Suite("Retryable Task Tests")
@MainActor
struct RetryableTaskTests {
    // MARK: - RetryPolicy Tests

    @Test("RetryPolicy default values")
    func testDefaultRetryPolicy() {
        let policy = RetryPolicy.default

        #expect(policy.maxRetries == 3)
        #expect(policy.maxRetryDuration == 30.0)
        #expect(policy.useExponentialBackoff == true)
        #expect(policy.baseDelay == 1.0)
        #expect(policy.maxDelay == 60.0)
        #expect(policy.useJitter == true)
    }

    @Test("RetryPolicy aggressive values")
    func testAggressiveRetryPolicy() {
        let policy = RetryPolicy.aggressive

        #expect(policy.maxRetries == 5)
        #expect(policy.maxRetryDuration == 60.0)
        #expect(policy.baseDelay == 0.5)
    }

    @Test("RetryPolicy conservative values")
    func testConservativeRetryPolicy() {
        let policy = RetryPolicy.conservative

        #expect(policy.maxRetries == 2)
        #expect(policy.maxRetryDuration == 15.0)
        #expect(policy.baseDelay == 2.0)
    }

    @Test("RetryPolicy none has zero retries")
    func testNoneRetryPolicy() {
        let policy = RetryPolicy.none

        #expect(policy.maxRetries == 0)
        #expect(policy.maxRetryDuration == 0.0)
        #expect(policy.useExponentialBackoff == false)
    }

    // MARK: - ExponentialBackoffStrategy Tests

    @Test("ExponentialBackoffStrategy calculates exponential delay")
    func testExponentialBackoffCalculation() {
        let policy = RetryPolicy(
            maxRetries: 5,
            maxRetryDuration: 60.0,
            useExponentialBackoff: true,
            baseDelay: 1.0,
            maxDelay: 60.0,
            useJitter: false
        )
        let strategy = ExponentialBackoffStrategy(policy: policy)

        // Attempt 0: 1 * 2^0 = 1 second
        #expect(strategy.delay(for: 0) == 1.0)

        // Attempt 1: 1 * 2^1 = 2 seconds
        #expect(strategy.delay(for: 1) == 2.0)

        // Attempt 2: 1 * 2^2 = 4 seconds
        #expect(strategy.delay(for: 2) == 4.0)

        // Attempt 3: 1 * 2^3 = 8 seconds
        #expect(strategy.delay(for: 3) == 8.0)

        // Attempt 4: 1 * 2^4 = 16 seconds
        #expect(strategy.delay(for: 4) == 16.0)
    }

    @Test("ExponentialBackoffStrategy respects max delay")
    func testExponentialBackoffMaxDelay() {
        let policy = RetryPolicy(
            maxRetries: 10,
            maxRetryDuration: 120.0,
            useExponentialBackoff: true,
            baseDelay: 1.0,
            maxDelay: 10.0,
            useJitter: false
        )
        let strategy = ExponentialBackoffStrategy(policy: policy)

        // Attempt 10: 1 * 2^10 = 1024 seconds, but capped at 10
        let delay = strategy.delay(for: 10)
        #expect(delay == 10.0)
    }

    @Test("ExponentialBackoffStrategy with jitter adds randomness")
    func testExponentialBackoffWithJitter() {
        let policy = RetryPolicy(
            maxRetries: 5,
            maxRetryDuration: 60.0,
            useExponentialBackoff: true,
            baseDelay: 1.0,
            maxDelay: 60.0,
            useJitter: true
        )
        let strategy = ExponentialBackoffStrategy(policy: policy)

        let delays = (0..<100).map { _ in strategy.delay(for: 1) }

        // All delays should be different (with high probability)
        let uniqueDelays = Set(delays)
        #expect(uniqueDelays.count > 90) // At least 90% unique

        // All delays should be within ±25% of 2 seconds
        let minExpected = 2.0 * 0.75
        let maxExpected = 2.0 * 1.25
        #expect(delays.allSatisfy { $0 >= minExpected && $0 <= maxExpected })
    }

    @Test("ExponentialBackoffStrategy respects Retry-After header")
    func testExponentialBackoffRespectsRetryAfter() {
        let policy = RetryPolicy.default
        let strategy = ExponentialBackoffStrategy(policy: policy)

        let error = UnifiedAPIError.rateLimit(retryAfter: 30.0, context: nil)
        let delay = strategy.delay(for: 1, error: error)

        #expect(delay == 30.0)
    }

    // MARK: - RetryableTask Default Implementation Tests

    @Test("Default retry delay calculation")
    func testDefaultRetryDelay() {
        struct TestTask: RetryableTask {
            func execute() async throws -> Int { 42 }
        }

        let task = TestTask()
        let delay1 = task.retryDelay(for: UnifiedAPIError.timeout(context: nil), attempt: 0)
        let delay2 = task.retryDelay(for: UnifiedAPIError.timeout(context: nil), attempt: 1)
        let delay3 = task.retryDelay(for: UnifiedAPIError.timeout(context: nil), attempt: 2)

        // Delays should increase exponentially
        guard let unwrappedDelay1 = delay1,
              let unwrappedDelay2 = delay2,
              let unwrappedDelay3 = delay3 else {
            Issue.record("Expected delay values to be non-nil")
            return
        }

        #expect(unwrappedDelay2 > unwrappedDelay1)
        #expect(unwrappedDelay3 > unwrappedDelay2)
    }

    @Test("Default retryability for API errors")
    func testDefaultRetryabilityForAPIErrors() {
        struct TestTask: RetryableTask {
            func execute() async throws -> Int { 42 }
        }

        let task = TestTask()

        // Retryable errors
        #expect(task.isRetryable(error: UnifiedAPIError.network(URLError(.timedOut), context: nil)))
        #expect(task.isRetryable(error: UnifiedAPIError.rateLimit(retryAfter: 60, context: nil)))
        #expect(task.isRetryable(error: UnifiedAPIError.serverError(code: 503, message: "Unavailable", context: nil)))
        #expect(task.isRetryable(error: UnifiedAPIError.timeout(context: nil)))

        // Non-retryable errors
        #expect(!task.isRetryable(error: UnifiedAPIError.authentication("Invalid", context: nil)))
        #expect(!task.isRetryable(error: UnifiedAPIError.validation("Invalid", context: nil)))
        #expect(!task.isRetryable(error: UnifiedAPIError.clientError(code: 404, message: "Not found", context: nil)))
    }

    @Test("Default retryability for URLError")
    func testDefaultRetryabilityForURLError() {
        struct TestTask: RetryableTask {
            func execute() async throws -> Int { 42 }
        }

        let task = TestTask()

        // Retryable URL errors
        #expect(task.isRetryable(error: URLError(.timedOut)))
        #expect(task.isRetryable(error: URLError(.networkConnectionLost)))
        #expect(task.isRetryable(error: URLError(.notConnectedToInternet)))
        #expect(task.isRetryable(error: URLError(.cannotConnectToHost)))
        #expect(task.isRetryable(error: URLError(.cannotFindHost)))
        #expect(task.isRetryable(error: URLError(.dnsLookupFailed)))

        // Non-retryable URL errors
        #expect(!task.isRetryable(error: URLError(.badURL)))
        #expect(!task.isRetryable(error: URLError(.unsupportedURL)))
        #expect(!task.isRetryable(error: URLError(.userAuthenticationRequired)))
    }

    // MARK: - RetryExecutor Tests

    // FIXME: Concurrency mutation errors in all RetryExecutor tests
    /* @Test("RetryExecutor succeeds on first attempt")
     @MainActor
     func testRetryExecutorSucceedsFirstAttempt() async throws {
     let executor = RetryExecutor(policy: .default)
     var callCount = 0

     let result = try await executor.execute {
     callCount += 1
     return "success"
     }

     #expect(result == "success")
     #expect(callCount == 1)
     }

     @Test("RetryExecutor retries on retryable error")
     @MainActor
     func testRetryExecutorRetriesOnError() async throws {
     let executor = RetryExecutor(policy: .default)
     var callCount = 0

     let result = try await executor.execute {
     callCount += 1
     if callCount < 3 {
     throw UnifiedAPIError.network(URLError(.timedOut), context: nil)
     }
     return "success"
     }

     #expect(result == "success")
     #expect(callCount == 3)
     }

     @Test("RetryExecutor throws after max retries")
     @MainActor
     func testRetryExecutorThrowsAfterMaxRetries() async throws {
     let executor = RetryExecutor(policy: .default)
     var callCount = 0

     await #expect(throws: RetryError.self) {
     try await executor.execute {
     callCount += 1
     throw UnifiedAPIError.network(URLError(.timedOut), context: nil)
     }
     }

     // Should try initial attempt + 3 retries = 4 total
     #expect(callCount == 4)
     }

     @Test("RetryExecutor does not retry non-retryable errors")
     @MainActor
     func testRetryExecutorDoesNotRetryNonRetryableErrors() async throws {
     let executor = RetryExecutor(policy: .default)
     var callCount = 0

     await #expect(throws: UnifiedAPIError.self) {
     try await executor.execute {
     callCount += 1
     throw UnifiedAPIError.authentication("Invalid token", context: nil)
     }
     }

     // Should only try once
     #expect(callCount == 1)
     }

     @Test("RetryExecutor respects custom max retries")
     @MainActor
     func testRetryExecutorCustomMaxRetries() async throws {
     let policy = RetryPolicy(
     maxRetries: 2,
     maxRetryDuration: 30.0,
     useExponentialBackoff: true,
     baseDelay: 0.1,
     maxDelay: 1.0,
     useJitter: false
     )
     let executor = RetryExecutor(policy: policy)
     var callCount = 0

     await #expect(throws: RetryError.self) {
     try await executor.execute {
     callCount += 1
     throw UnifiedAPIError.timeout(context: nil)
     }
     }

     // Should try initial attempt + 2 retries = 3 total
     #expect(callCount == 3)
     }
     */

    // MARK: - Retry Error Tests

    @Test("RetryError max retries exceeded description")
    func testRetryErrorMaxRetriesDescription() {
        let underlyingError = UnifiedAPIError.timeout(context: nil)
        let error = RetryError.maxRetriesExceeded(attempts: 3, underlyingError: underlyingError)

        #expect(error.errorDescription?.contains("3 retry attempts") == true)
        #expect(error.recoverySuggestion?.contains("try again later") == true)
    }

    @Test("RetryError max duration exceeded description")
    func testRetryErrorMaxDurationDescription() {
        let underlyingError = UnifiedAPIError.timeout(context: nil)
        let error = RetryError.maxDurationExceeded(duration: 30.0, underlyingError: underlyingError)

        #expect(error.errorDescription?.contains("30") == true)
        #expect(error.recoverySuggestion?.contains("try again later") == true)
    }

    // MARK: - Integration Tests

    // FIXME: Concurrency mutation errors
    /* @Test("Full retry cycle with exponential backoff")
     @MainActor
     func testFullRetryCycleWithBackoff() async throws {
     let policy = RetryPolicy(
     maxRetries: 3,
     maxRetryDuration: 30.0,
     useExponentialBackoff: true,
     baseDelay: 0.1,
     maxDelay: 1.0,
     useJitter: false
     )
     let executor = RetryExecutor(policy: policy)

     var callTimes: [Date] = []

     let result = try await executor.execute {
     callTimes.append(Date())
     if callTimes.count < 3 {
     throw UnifiedAPIError.timeout(context: nil)
     }
     return "success"
     }

     #expect(result == "success")
     #expect(callTimes.count == 3)

     // Check that delays increase exponentially
     if callTimes.count >= 3 {
     let delay1 = callTimes[1].timeIntervalSince(callTimes[0])
     let delay2 = callTimes[2].timeIntervalSince(callTimes[1])

     // Delays should be approximately 0.1s and 0.2s (with some tolerance for execution time)
     #expect(delay1 >= 0.1 && delay1 < 0.3)
     #expect(delay2 >= 0.2 && delay2 < 0.4)
     #expect(delay2 > delay1)
     }
     }

     @Test("Convenience method for simple retry")
     @MainActor
     func testConvenienceMethodForSimpleRetry() async throws {
     var callCount = 0

     let result = try await RetryExecutor.executeWithRetry {
     callCount += 1
     if callCount < 2 {
     throw UnifiedAPIError.network(URLError(.timedOut), context: nil)
     }
     return "success"
     }

     #expect(result == "success")
     #expect(callCount == 2)
     }

     @Test("Convenience method with custom policy")
     @MainActor
     func testConvenienceMethodWithCustomPolicy() async throws {
     var callCount = 0

     let result = try await RetryExecutor.executeWithRetry(policy: .aggressive) {
     callCount += 1
     if callCount < 4 {
     throw UnifiedAPIError.timeout(context: nil)
     }
     return "success"
     }

     #expect(result == "success")
     #expect(callCount == 4)
     }
     */
}
