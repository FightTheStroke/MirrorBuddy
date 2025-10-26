import Foundation

/// Fallback strategy for handling API failures
protocol FallbackStrategy {
    associatedtype Result

    /// Execute the fallback when primary operation fails
    func execute(primaryError: Error) async throws -> Result
}

/// Fallback execution result
enum FallbackResult<T> {
    case primary(T)          // Primary operation succeeded
    case fallback(T, Error)  // Fallback succeeded after primary failed
    case failed(Error)       // Both primary and fallback failed
}

/// Executor for operations with fallback strategies
struct FallbackExecutor {
    /// Execute a primary operation with a fallback
    static func executeWithFallback<T: Sendable>(
        primary: @escaping @Sendable () async throws -> T,
        fallback: @escaping @Sendable (Error) async throws -> T
    ) async -> FallbackResult<T> {
        do {
            let result = try await primary()
            return .primary(result)
        } catch {
            let primaryError = error
            // Log primary failure
            await MainActor.run {
                #if os(iOS)
                let unifiedError = primaryError as? UnifiedAPIError ?? .unknown(primaryError.localizedDescription, context: ["originalError": String(describing: primaryError)])
                APIErrorLogger.shared.log(unifiedError, additionalContext: [
                    "fallback": "attempting",
                    "primaryFailure": true
                ])
                #elseif os(macOS)
                print("⚠️ Primary API failed, attempting fallback: \(primaryError.localizedDescription)")
                #endif
            }

            do {
                let fallbackResult = try await fallback(primaryError)
                return .fallback(fallbackResult, primaryError)
            } catch {
                let fallbackError = error
                // Log fallback failure
                await MainActor.run {
                    #if os(iOS)
                    let unifiedFallbackError = fallbackError as? UnifiedAPIError ?? .unknown(fallbackError.localizedDescription, context: ["originalError": String(describing: fallbackError)])
                    APIErrorLogger.shared.log(unifiedFallbackError, additionalContext: [
                        "fallback": "failed",
                        "primaryError": primaryError.localizedDescription
                    ])
                    #elseif os(macOS)
                    print("❌ Fallback also failed: \(fallbackError.localizedDescription)")
                    #endif
                }

                return .failed(fallbackError)
            }
        }
    }

    /// Execute with fallback and throw on failure
    static func executeWithFallbackThrowing<T: Sendable>(
        primary: @escaping @Sendable () async throws -> T,
        fallback: @escaping @Sendable (Error) async throws -> T
    ) async throws -> T {
        let result = await executeWithFallback(primary: primary, fallback: fallback)

        switch result {
        case let .primary(value):
            return value
        case let .fallback(value, _):
            return value
        case let .failed(error):
            throw error
        }
    }
}

// MARK: - Common Fallback Strategies

/// Fallback to cached data
struct CachedDataFallback<T: Codable & Sendable>: FallbackStrategy {
    typealias Result = T

    let cacheKey: String
    let cache: CacheProtocol

    func execute(primaryError: Error) async throws -> T {
        guard let cached = await cache.get(key: cacheKey, type: T.self) else {
            throw FallbackError.noCachedData(key: cacheKey, primaryError: primaryError)
        }
        return cached
    }
}

/// Fallback to default value
struct DefaultValueFallback<T>: FallbackStrategy {
    typealias Result = T

    let defaultValue: T

    func execute(primaryError: Error) async throws -> T {
        defaultValue
    }
}

/// Fallback to alternative API endpoint
struct AlternativeEndpointFallback<T>: FallbackStrategy {
    typealias Result = T

    let alternativeOperation: () async throws -> T

    func execute(primaryError: Error) async throws -> T {
        try await alternativeOperation()
    }
}

/// Fallback to degraded functionality
struct DegradedFallback<T>: FallbackStrategy {
    typealias Result = T

    let degradedOperation: (Error) async throws -> T

    func execute(primaryError: Error) async throws -> T {
        try await degradedOperation(primaryError)
    }
}

// MARK: - Fallback Errors

enum FallbackError: LocalizedError {
    case noCachedData(key: String, primaryError: Error)
    case allStrategiesFailed([Error])

    var errorDescription: String? {
        switch self {
        case let .noCachedData(key, primaryError):
            return "No cached data available for key '\(key)' after primary failure: \(primaryError.localizedDescription)"
        case let .allStrategiesFailed(errors):
            return "All fallback strategies failed. Errors: \(errors.map { $0.localizedDescription }.joined(separator: ", "))"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .noCachedData:
            return "Please check your internet connection and try again when online."
        case .allStrategiesFailed:
            return "The service is experiencing issues. Please try again later."
        }
    }
}

// MARK: - Cache Protocol

protocol CacheProtocol {
    func get<T: Codable & Sendable>(key: String, type: T.Type) async -> T?
    func set<T: Codable & Sendable>(key: String, value: T) async
    func remove(key: String) async
}

// MARK: - Simple In-Memory Cache Implementation

actor SimpleCache: CacheProtocol {
    private var storage: [String: Any] = [:]
    private var expirations: [String: Date] = [:]
    private let defaultTTL: TimeInterval = 3_600 // 1 hour

    func get<T: Codable & Sendable>(key: String, type: T.Type) async -> T? {
        // Check if expired
        if let expiration = expirations[key], Date() > expiration {
            storage.removeValue(forKey: key)
            expirations.removeValue(forKey: key)
            return nil
        }

        return storage[key] as? T
    }

    func set<T: Codable & Sendable>(key: String, value: T) async {
        storage[key] = value
        expirations[key] = Date().addingTimeInterval(defaultTTL)
    }

    func set<T: Codable & Sendable>(key: String, value: T, ttl: TimeInterval) async {
        storage[key] = value
        expirations[key] = Date().addingTimeInterval(ttl)
    }

    func remove(key: String) async {
        storage.removeValue(forKey: key)
        expirations.removeValue(forKey: key)
    }

    func clear() {
        storage.removeAll()
        expirations.removeAll()
    }
}

// MARK: - Resilient API Call Wrapper

/// Combines circuit breaker, retry logic, and fallback strategies
struct ResilientAPICall {
    /// Execute an API call with full resilience (circuit breaker + retry + fallback)
    static func execute<T: Sendable>(
        endpoint: String,
        retryPolicy: RetryPolicy,
        circuitBreakerConfig: CircuitBreaker.Configuration,
        primary: @escaping @Sendable () async throws -> T,
        fallback: @escaping @Sendable (Error) async throws -> T
    ) async throws -> T {
        let breaker = await CircuitBreakerRegistry.shared.breaker(
            for: endpoint,
            configuration: circuitBreakerConfig
        )

        return try await breaker.execute {
            try await FallbackExecutor.executeWithFallbackThrowing(
                primary: {
                    try await RetryExecutor.executeWithRetry(policy: retryPolicy, primary)
                },
                fallback: fallback
            )
        }
    }

    /// Convenience method with default parameters (MainActor)
    @MainActor
    static func execute<T: Sendable>(
        endpoint: String,
        primary: @escaping @Sendable () async throws -> T,
        fallback: @escaping @Sendable (Error) async throws -> T
    ) async throws -> T {
        try await execute(
            endpoint: endpoint,
            retryPolicy: .default,
            circuitBreakerConfig: .default,
            primary: primary,
            fallback: fallback
        )
    }

    /// Execute with circuit breaker and retry, but no fallback
    static func execute<T: Sendable>(
        endpoint: String,
        retryPolicy: RetryPolicy,
        circuitBreakerConfig: CircuitBreaker.Configuration,
        operation: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        try await RetryExecutor.executeWithCircuitBreaker(
            endpoint: endpoint,
            policy: retryPolicy,
            circuitBreakerConfig: circuitBreakerConfig,
            operation
        )
    }

    /// Convenience method with default parameters (MainActor)
    @MainActor
    static func execute<T: Sendable>(
        endpoint: String,
        operation: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        try await execute(
            endpoint: endpoint,
            retryPolicy: .default,
            circuitBreakerConfig: .default,
            operation: operation
        )
    }
}

// MARK: - Example Usage

/*
 // Example 1: Using circuit breaker with retry
 let result = try await ResilientAPICall.execute(
 endpoint: "https://api.openai.com/v1/chat/completions",
 retryPolicy: .default,
 circuitBreakerConfig: .aggressive
 ) {
 try await openAIClient.chat(messages: messages)
 }

 // Example 2: Using full resilience with fallback to cache
 let cache = SimpleCache()
 let result = try await ResilientAPICall.execute(
 endpoint: "https://api.openai.com/v1/chat/completions",
 retryPolicy: .default,
 circuitBreakerConfig: .default,
 primary: {
 let response = try await openAIClient.chat(messages: messages)
 await cache.set(key: "last_chat_response", value: response)
 return response
 },
 fallback: { error in
 guard let cached = await cache.get(key: "last_chat_response", type: ChatResponse.self) else {
 throw FallbackError.noCachedData(key: "last_chat_response", primaryError: error)
 }
 return cached
 }
 )

 // Example 3: Using FallbackExecutor directly
 let result = await FallbackExecutor.executeWithFallback(
 primary: {
 try await primaryAPICall()
 },
 fallback: { error in
 try await fallbackAPICall()
 }
 )

 switch result {
 case .primary(let value):
 print("Primary succeeded: \(value)")
 case .fallback(let value, let primaryError):
 print("Fallback used: \(value), primary error: \(primaryError)")
 case .failed(let error):
 print("Both failed: \(error)")
 }
 */
