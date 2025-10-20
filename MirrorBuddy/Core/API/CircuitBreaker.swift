import Foundation

/// Circuit breaker pattern for handling failing API endpoints
/// Prevents cascading failures by temporarily blocking requests to failing services
actor CircuitBreaker {
    /// Circuit breaker state
    enum State {
        case closed      // Normal operation, requests pass through
        case open        // Failures detected, requests blocked
        case halfOpen    // Testing if service recovered
    }

    /// Configuration for circuit breaker behavior
    struct Configuration {
        /// Number of failures before opening circuit
        let failureThreshold: Int

        /// Time window for counting failures (in seconds)
        let failureWindow: TimeInterval

        /// How long to wait before testing if service recovered (in seconds)
        let openDuration: TimeInterval

        /// Number of successful requests needed in half-open state to close circuit
        let successThreshold: Int

        /// Default configuration for API calls
        static let `default` = Configuration(
            failureThreshold: 5,
            failureWindow: 60.0,
            openDuration: 30.0,
            successThreshold: 2
        )

        /// Aggressive configuration for critical endpoints
        static let aggressive = Configuration(
            failureThreshold: 3,
            failureWindow: 30.0,
            openDuration: 60.0,
            successThreshold: 3
        )

        /// Lenient configuration for non-critical endpoints
        static let lenient = Configuration(
            failureThreshold: 10,
            failureWindow: 120.0,
            openDuration: 15.0,
            successThreshold: 1
        )
    }

    // MARK: - Properties

    private let configuration: Configuration
    private let endpoint: String
    private var state: State = .closed
    private var failureCount: Int = 0
    private var successCount: Int = 0
    private var lastFailureTime: Date?
    private var stateChangeTime = Date()
    private var failureTimes: [Date] = []

    // MARK: - Initialization

    init(endpoint: String, configuration: Configuration = .default) {
        self.endpoint = endpoint
        self.configuration = configuration
    }

    // MARK: - Public Interface

    /// Execute an operation through the circuit breaker
    func execute<T: Sendable>(_ operation: @escaping @Sendable () async throws -> T) async throws -> T {
        // Check current state and transition if needed
        updateState()

        switch state {
        case .open:
            throw CircuitBreakerError.circuitOpen(
                endpoint: endpoint,
                retryAfter: remainingOpenDuration()
            )

        case .closed, .halfOpen:
            do {
                let result = try await operation()
                recordSuccess()
                return result
            } catch {
                recordFailure()
                throw error
            }
        }
    }

    /// Get current state of the circuit breaker
    func currentState() -> State {
        state
    }

    /// Get statistics about the circuit breaker
    func statistics() -> CircuitBreakerStatistics {
        CircuitBreakerStatistics(
            endpoint: endpoint,
            state: state,
            failureCount: failureCount,
            successCount: successCount,
            lastFailureTime: lastFailureTime,
            stateChangeTime: stateChangeTime
        )
    }

    /// Manually reset the circuit breaker
    func reset() {
        state = .closed
        failureCount = 0
        successCount = 0
        lastFailureTime = nil
        stateChangeTime = Date()
        failureTimes.removeAll()
    }

    // MARK: - Private Methods

    private func updateState() {
        let now = Date()

        switch state {
        case .closed:
            // Remove old failures outside the window
            failureTimes.removeAll { now.timeIntervalSince($0) > configuration.failureWindow }

            // Check if we should open the circuit
            if failureTimes.count >= configuration.failureThreshold {
                transitionTo(.open)
            }

        case .open:
            // Check if we should transition to half-open
            let timeSinceOpen = now.timeIntervalSince(stateChangeTime)
            if timeSinceOpen >= configuration.openDuration {
                transitionTo(.halfOpen)
            }

        case .halfOpen:
            // In half-open state, transitions happen via recordSuccess/recordFailure
            break
        }
    }

    private func recordSuccess() {
        switch state {
        case .closed:
            // Reset failure count on success in closed state
            failureCount = 0
            failureTimes.removeAll()

        case .halfOpen:
            successCount += 1
            if successCount >= configuration.successThreshold {
                transitionTo(.closed)
            }

        case .open:
            // Shouldn't happen, but handle gracefully
            break
        }
    }

    private func recordFailure() {
        let now = Date()
        lastFailureTime = now

        switch state {
        case .closed:
            failureCount += 1
            failureTimes.append(now)

            // Remove old failures outside the window
            failureTimes.removeAll { now.timeIntervalSince($0) > configuration.failureWindow }

            // Check if we should open
            if failureTimes.count >= configuration.failureThreshold {
                transitionTo(.open)
            }

        case .halfOpen:
            // Any failure in half-open state reopens the circuit
            transitionTo(.open)

        case .open:
            // Already open, just update failure time
            break
        }
    }

    private func transitionTo(_ newState: State) {
        let oldState = state
        state = newState
        stateChangeTime = Date()

        // Capture values before entering Task
        let capturedFailureCount = failureCount
        let capturedSuccessCount = successCount
        let capturedEndpoint = endpoint

        // Reset counters based on new state
        switch newState {
        case .closed:
            failureCount = 0
            successCount = 0
            failureTimes.removeAll()

        case .open:
            successCount = 0

        case .halfOpen:
            successCount = 0
            failureCount = 0
        }

        // Log state transition
        _Concurrency.Task { @MainActor in
            APIErrorLogger.shared.log(
                UnifiedAPIError.unknown(
                    "Circuit breaker state changed",
                    context: [
                        "endpoint": capturedEndpoint,
                        "oldState": String(describing: oldState),
                        "newState": String(describing: newState),
                        "failureCount": capturedFailureCount,
                        "successCount": capturedSuccessCount
                    ]
                )
            )
        }
    }

    private func remainingOpenDuration() -> TimeInterval {
        let elapsed = Date().timeIntervalSince(stateChangeTime)
        return max(0, configuration.openDuration - elapsed)
    }
}

// MARK: - Circuit Breaker Error

/// Errors specific to circuit breaker operation
enum CircuitBreakerError: LocalizedError {
    case circuitOpen(endpoint: String, retryAfter: TimeInterval)

    var errorDescription: String? {
        switch self {
        case let .circuitOpen(endpoint, retryAfter):
            return "Circuit breaker is open for endpoint '\(endpoint)'. Service appears to be down. Retry after \(Int(retryAfter)) seconds."
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .circuitOpen:
            return "The service is temporarily unavailable. Please wait a moment and try again."
        }
    }
}

// MARK: - Circuit Breaker Statistics

/// Statistics about circuit breaker state
struct CircuitBreakerStatistics {
    let endpoint: String
    let state: CircuitBreaker.State
    let failureCount: Int
    let successCount: Int
    let lastFailureTime: Date?
    let stateChangeTime: Date
}

// MARK: - Circuit Breaker Registry

/// Global registry for managing circuit breakers per endpoint
actor CircuitBreakerRegistry {
    static let shared = CircuitBreakerRegistry()

    private var breakers: [String: CircuitBreaker] = [:]

    private init() {}

    /// Get or create a circuit breaker for an endpoint
    func breaker(
        for endpoint: String,
        configuration: CircuitBreaker.Configuration = .default
    ) -> CircuitBreaker {
        if let existing = breakers[endpoint] {
            return existing
        }

        let newBreaker = CircuitBreaker(endpoint: endpoint, configuration: configuration)
        breakers[endpoint] = newBreaker
        return newBreaker
    }

    /// Get statistics for all circuit breakers
    func allStatistics() async -> [CircuitBreakerStatistics] {
        var stats: [CircuitBreakerStatistics] = []
        for breaker in breakers.values {
            stats.append(await breaker.statistics())
        }
        return stats
    }

    /// Reset all circuit breakers
    func resetAll() async {
        for breaker in breakers.values {
            await breaker.reset()
        }
    }
}

// MARK: - Convenience Extensions

extension RetryExecutor {
    /// Execute an operation with both retry logic and circuit breaker protection
    static func executeWithCircuitBreaker<Result: Sendable>(
        endpoint: String,
        policy: RetryPolicy = .default,
        circuitBreakerConfig: CircuitBreaker.Configuration = .default,
        _ operation: @escaping @Sendable () async throws -> Result
    ) async throws -> Result {
        let breaker = await CircuitBreakerRegistry.shared.breaker(
            for: endpoint,
            configuration: circuitBreakerConfig
        )

        return try await breaker.execute {
            try await RetryExecutor.executeWithRetry(policy: policy, operation)
        }
    }
}
