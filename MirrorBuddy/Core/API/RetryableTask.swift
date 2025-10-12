import Foundation

/// Protocol for operations that can be retried
protocol RetryableTask {
    /// The operation to retry
    associatedtype Result

    /// Execute the operation
    func execute() async throws -> Result

    /// Determine if an error is retryable
    func isRetryable(error: Error) -> Bool

    /// Get retry delay for a specific error
    func retryDelay(for error: Error, attempt: Int) -> TimeInterval?
}

/// Default implementations for RetryableTask
extension RetryableTask {
    /// Default retry delay using exponential backoff
    func retryDelay(for error: Error, attempt: Int) -> TimeInterval? {
        // Check if error provides a specific retry delay
        if let apiError = error as? APIErrorProtocol, let retryAfter = apiError.retryAfter {
            return retryAfter
        }

        // Use exponential backoff: 2^attempt seconds
        let baseDelay: TimeInterval = 1.0
        let exponentialDelay = baseDelay * pow(2.0, Double(attempt))

        // Add jitter (randomize ±25% to prevent thundering herd)
        let jitterRange = exponentialDelay * 0.25
        let jitter = TimeInterval.random(in: -jitterRange...jitterRange)

        // Cap at 60 seconds
        return min(exponentialDelay + jitter, 60.0)
    }

    /// Default retryability check based on error type
    func isRetryable(error: Error) -> Bool {
        if let apiError = error as? APIErrorProtocol {
            return apiError.isRetryable
        }

        // Check for common retryable error patterns
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .networkConnectionLost, .notConnectedToInternet,
                 .cannotConnectToHost, .cannotFindHost, .dnsLookupFailed:
                return true
            default:
                return false
            }
        }

        return false
    }
}

/// Retry policy configuration
struct RetryPolicy {
    /// Maximum number of retry attempts
    let maxRetries: Int

    /// Maximum total time to spend retrying (in seconds)
    let maxRetryDuration: TimeInterval

    /// Whether to use exponential backoff
    let useExponentialBackoff: Bool

    /// Base delay for exponential backoff (in seconds)
    let baseDelay: TimeInterval

    /// Maximum delay between retries (in seconds)
    let maxDelay: TimeInterval

    /// Whether to add jitter to delays
    let useJitter: Bool

    /// Default retry policy for API calls
    static let `default` = RetryPolicy(
        maxRetries: 3,
        maxRetryDuration: 30.0,
        useExponentialBackoff: true,
        baseDelay: 1.0,
        maxDelay: 60.0,
        useJitter: true
    )

    /// Aggressive retry policy for critical operations
    static let aggressive = RetryPolicy(
        maxRetries: 5,
        maxRetryDuration: 60.0,
        useExponentialBackoff: true,
        baseDelay: 0.5,
        maxDelay: 30.0,
        useJitter: true
    )

    /// Conservative retry policy for non-critical operations
    static let conservative = RetryPolicy(
        maxRetries: 2,
        maxRetryDuration: 15.0,
        useExponentialBackoff: true,
        baseDelay: 2.0,
        maxDelay: 10.0,
        useJitter: false
    )

    /// No retry policy
    static let none = RetryPolicy(
        maxRetries: 0,
        maxRetryDuration: 0.0,
        useExponentialBackoff: false,
        baseDelay: 0.0,
        maxDelay: 0.0,
        useJitter: false
    )
}

/// Exponential backoff strategy for retry delays
struct ExponentialBackoffStrategy {
    let policy: RetryPolicy

    /// Calculate delay for a given attempt number
    func delay(for attempt: Int, error: Error? = nil) -> TimeInterval {
        // If error provides a retry-after value, use it
        if let error, let apiError = error as? APIErrorProtocol, let retryAfter = apiError.retryAfter {
            return min(retryAfter, policy.maxDelay)
        }

        guard policy.useExponentialBackoff else {
            return policy.baseDelay
        }

        // Calculate exponential delay: baseDelay * (2 ^ attempt)
        var delay = policy.baseDelay * pow(2.0, Double(attempt))

        // Add jitter if enabled
        if policy.useJitter {
            let jitterRange = delay * 0.25
            let jitter = TimeInterval.random(in: -jitterRange...jitterRange)
            delay += jitter
        }

        // Cap at maximum delay
        return min(delay, policy.maxDelay)
    }
}

/// Executor for retrying operations with exponential backoff
struct RetryExecutor {
    private let policy: RetryPolicy
    private let backoffStrategy: ExponentialBackoffStrategy

    init(policy: RetryPolicy = .default) {
        self.policy = policy
        self.backoffStrategy = ExponentialBackoffStrategy(policy: policy)
    }

    /// Execute a retryable task with exponential backoff
    func execute<T: RetryableTask>(_ task: T) async throws -> T.Result {
        let startTime = Date()
        var lastError: Error?
        var attempt = 0

        while attempt < policy.maxRetries {
            do {
                return try await task.execute()
            } catch {
                lastError = error
                attempt += 1

                // Check if error is retryable
                guard task.isRetryable(error: error) else {
                    throw error
                }

                // Check if we've exceeded max retry duration
                let elapsed = Date().timeIntervalSince(startTime)
                guard elapsed < policy.maxRetryDuration else {
                    throw RetryError.maxDurationExceeded(
                        duration: policy.maxRetryDuration,
                        underlyingError: error
                    )
                }

                // Check if we have more retries left
                guard attempt < policy.maxRetries else {
                    throw RetryError.maxRetriesExceeded(
                        attempts: policy.maxRetries,
                        underlyingError: error
                    )
                }

                // Calculate and apply delay
                let delay = task.retryDelay(for: error, attempt: attempt) ??
                           backoffStrategy.delay(for: attempt, error: error)

                // Log retry attempt (fire and forget on main actor)
                _Concurrency.Task { @MainActor in
                    APIErrorLogger.shared.log(
                        UnifiedAPIError.network(error, context: [
                            "retryAttempt": attempt,
                            "retryDelay": delay,
                            "elapsedTime": elapsed
                        ])
                    )
                }

                try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }

        // If we get here, we've exhausted retries
        throw RetryError.maxRetriesExceeded(
            attempts: policy.maxRetries,
            underlyingError: lastError ?? RetryError.unknownError
        )
    }

    /// Execute a simple async operation with retry logic
    func execute<Result: Sendable>(
        maxRetries: Int? = nil,
        operation: @escaping @Sendable () async throws -> Result
    ) async throws -> Result {
        let effectivePolicy = maxRetries.map {
            RetryPolicy(
                maxRetries: $0,
                maxRetryDuration: policy.maxRetryDuration,
                useExponentialBackoff: policy.useExponentialBackoff,
                baseDelay: policy.baseDelay,
                maxDelay: policy.maxDelay,
                useJitter: policy.useJitter
            )
        } ?? policy

        let executor = RetryExecutor(policy: effectivePolicy)
        let task = SimpleRetryableTask(operation: operation)
        return try await executor.execute(task)
    }
}

/// Error types specific to retry logic
enum RetryError: LocalizedError {
    case maxRetriesExceeded(attempts: Int, underlyingError: Error)
    case maxDurationExceeded(duration: TimeInterval, underlyingError: Error)
    case unknownError

    var errorDescription: String? {
        switch self {
        case let .maxRetriesExceeded(attempts, underlyingError):
            return "Operation failed after \(attempts) retry attempts: \(underlyingError.localizedDescription)"
        case let .maxDurationExceeded(duration, underlyingError):
            return "Operation exceeded maximum retry duration of \(duration)s: \(underlyingError.localizedDescription)"
        case .unknownError:
            return "An unknown error occurred during retry operation"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .maxRetriesExceeded, .maxDurationExceeded:
            return "The service may be experiencing issues. Please try again later."
        case .unknownError:
            return "Please try again or contact support if the problem persists."
        }
    }
}

// MARK: - Simple Retryable Task

/// A simple implementation of RetryableTask for closures
private struct SimpleRetryableTask<Result: Sendable>: RetryableTask {
    let operation: @Sendable () async throws -> Result

    func execute() async throws -> Result {
        try await operation()
    }

    func isRetryable(error: Error) -> Bool {
        if let apiError = error as? APIErrorProtocol {
            return apiError.isRetryable
        }
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .networkConnectionLost, .notConnectedToInternet:
                return true
            default:
                return false
            }
        }
        return false
    }
}

// MARK: - Convenience Extensions

extension RetryExecutor {
    /// Convenience method for executing with default policy
    static func executeWithRetry<Result: Sendable>(
        _ operation: @escaping @Sendable () async throws -> Result
    ) async throws -> Result {
        let executor = RetryExecutor()
        return try await executor.execute(operation: operation)
    }

    /// Convenience method for executing with custom policy
    static func executeWithRetry<Result: Sendable>(
        policy: RetryPolicy,
        _ operation: @escaping @Sendable () async throws -> Result
    ) async throws -> Result {
        let executor = RetryExecutor(policy: policy)
        return try await executor.execute(operation: operation)
    }
}

// MARK: - Example Usage
/*
 // Using RetryableTask protocol:
 struct APIRequest: RetryableTask {
     typealias Result = Data

     func execute() async throws -> Data {
         // Make API request
     }

     func isRetryable(error: Error) -> Bool {
         // Custom retry logic
     }
 }

 let executor = RetryExecutor(policy: .default)
 let result = try await executor.execute(APIRequest())

 // Using convenience method:
 let data = try await RetryExecutor.executeWithRetry {
     try await makeAPIRequest()
 }

 // Using custom policy:
 let data = try await RetryExecutor.executeWithRetry(policy: .aggressive) {
     try await makeCriticalAPIRequest()
 }
 */
