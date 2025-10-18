import Foundation

/// Protocol that all API errors must conform to for unified error handling
protocol APIErrorProtocol: LocalizedError {
    /// Unique error code for tracking and analytics
    var errorCode: String { get }

    /// Error category for grouping similar errors
    var errorCategory: APIErrorCategory { get }

    /// HTTP status code if applicable
    var httpStatusCode: Int? { get }

    /// Contextual information for debugging
    var context: [String: Any]? { get }

    /// Optional documentation link for more information
    var documentationURL: URL? { get }

    /// Whether this error can be retried
    var isRetryable: Bool { get }

    /// Suggested retry delay in seconds if retryable
    var retryAfter: TimeInterval? { get }
}

/// Categories of API errors for unified handling
enum APIErrorCategory: String, Codable {
    case configuration
    case authentication
    case authorization
    case network
    case rateLimit
    case validation
    case serverError
    case clientError
    case parsing
    case timeout
    case unknown

    var displayName: String {
        switch self {
        case .configuration: return "Configuration Error"
        case .authentication: return "Authentication Error"
        case .authorization: return "Authorization Error"
        case .network: return "Network Error"
        case .rateLimit: return "Rate Limit Error"
        case .validation: return "Validation Error"
        case .serverError: return "Server Error"
        case .clientError: return "Client Error"
        case .parsing: return "Data Parsing Error"
        case .timeout: return "Timeout Error"
        case .unknown: return "Unknown Error"
        }
    }
}

/// Unified API error response structure
struct APIErrorResponse: Codable {
    let errorCode: String
    let category: APIErrorCategory
    let message: String
    let details: String?
    let httpStatusCode: Int?
    let timestamp: Date
    let documentationURL: String?

    init(from error: APIErrorProtocol) {
        self.errorCode = error.errorCode
        self.category = error.errorCategory
        self.message = error.errorDescription ?? "An unknown error occurred"
        self.details = error.recoverySuggestion
        self.httpStatusCode = error.httpStatusCode
        self.timestamp = Date()
        self.documentationURL = error.documentationURL?.absoluteString
    }
}

/// Base unified API error enum that can wrap different error types
enum UnifiedAPIError: @preconcurrency APIErrorProtocol {
    case configuration(String, context: [String: Any]? = nil)
    case authentication(String, context: [String: Any]? = nil)
    case authorization(String, context: [String: Any]? = nil)
    case network(Error, context: [String: Any]? = nil)
    case rateLimit(retryAfter: TimeInterval?, context: [String: Any]? = nil)
    case validation(String, context: [String: Any]? = nil)
    case serverError(code: Int, message: String, context: [String: Any]? = nil)
    case clientError(code: Int, message: String, context: [String: Any]? = nil)
    case parsing(Error, context: [String: Any]? = nil)
    case timeout(context: [String: Any]? = nil)
    case unknown(String, context: [String: Any]? = nil)

    var errorCode: String {
        switch self {
        case .configuration: return "API_CONFIG_ERROR"
        case .authentication: return "API_AUTH_ERROR"
        case .authorization: return "API_AUTHZ_ERROR"
        case .network: return "API_NETWORK_ERROR"
        case .rateLimit: return "API_RATE_LIMIT"
        case .validation: return "API_VALIDATION_ERROR"
        case let .serverError(code, _, _): return "API_SERVER_ERROR_\(code)"
        case let .clientError(code, _, _): return "API_CLIENT_ERROR_\(code)"
        case .parsing: return "API_PARSING_ERROR"
        case .timeout: return "API_TIMEOUT"
        case .unknown: return "API_UNKNOWN_ERROR"
        }
    }

    var errorCategory: APIErrorCategory {
        switch self {
        case .configuration: return .configuration
        case .authentication: return .authentication
        case .authorization: return .authorization
        case .network: return .network
        case .rateLimit: return .rateLimit
        case .validation: return .validation
        case .serverError: return .serverError
        case .clientError: return .clientError
        case .parsing: return .parsing
        case .timeout: return .timeout
        case .unknown: return .unknown
        }
    }

    var httpStatusCode: Int? {
        switch self {
        case .configuration: return nil
        case .authentication: return 401
        case .authorization: return 403
        case .network: return nil
        case .rateLimit: return 429
        case .validation: return 400
        case let .serverError(code, _, _): return code
        case let .clientError(code, _, _): return code
        case .parsing: return nil
        case .timeout: return 408
        case .unknown: return nil
        }
    }

    var context: [String: Any]? {
        switch self {
        case let .configuration(_, context): return context
        case let .authentication(_, context): return context
        case let .authorization(_, context): return context
        case let .network(_, context): return context
        case let .rateLimit(_, context): return context
        case let .validation(_, context): return context
        case let .serverError(_, _, context): return context
        case let .clientError(_, _, context): return context
        case let .parsing(_, context): return context
        case let .timeout(context): return context
        case let .unknown(_, context): return context
        }
    }

    var documentationURL: URL? {
        // Could be customized per app or error type
        URL(string: "https://docs.mirrorbuddy.app/errors/\(errorCode.lowercased())")
    }

    var isRetryable: Bool {
        switch self {
        case .configuration, .authentication, .authorization, .validation, .parsing:
            return false
        case .network, .rateLimit, .serverError, .timeout:
            return true
        case .clientError, .unknown:
            return false
        }
    }

    var retryAfter: TimeInterval? {
        switch self {
        case let .rateLimit(retryAfter, _):
            return retryAfter
        case .serverError, .timeout, .network:
            return 2.0 // Default retry delay
        default:
            return nil
        }
    }

    var errorDescription: String? {
        switch self {
        case let .configuration(message, _):
            return "Configuration error: \(message)"
        case let .authentication(message, _):
            return "Authentication failed: \(message)"
        case let .authorization(message, _):
            return "Authorization denied: \(message)"
        case let .network(error, _):
            return "Network error: \(error.localizedDescription)"
        case let .rateLimit(retryAfter, _):
            if let retryAfter {
                return "Rate limit exceeded. Retry after \(Int(retryAfter)) seconds."
            }
            return "Rate limit exceeded. Please try again later."
        case let .validation(message, _):
            return "Validation error: \(message)"
        case let .serverError(code, message, _):
            return "Server error (\(code)): \(message)"
        case let .clientError(code, message, _):
            return "Client error (\(code)): \(message)"
        case let .parsing(error, _):
            return "Failed to parse response: \(error.localizedDescription)"
        case .timeout:
            return "Request timed out. Please check your connection and try again."
        case let .unknown(message, _):
            return "An unexpected error occurred: \(message)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .configuration:
            return "Check your API credentials and configuration in settings."
        case .authentication:
            return "Please sign in again to continue using this feature."
        case .authorization:
            return "You don't have permission to access this resource. Contact support if you believe this is an error."
        case .network:
            return "Check your internet connection and try again."
        case .rateLimit:
            return "You've made too many requests. Please wait a moment and try again."
        case .validation:
            return "Please check your input and try again."
        case .serverError:
            return "The service is experiencing issues. Please try again later."
        case .clientError:
            return "There was a problem with your request. Please review and try again."
        case .parsing:
            return "The response format is unexpected. Please update the app or contact support."
        case .timeout:
            return "The request took too long. Check your connection and try again."
        case .unknown:
            return "Please try again. If the problem persists, contact support."
        }
    }
}

// MARK: - Error Conversion Extensions

extension OpenAIError {
    /// Convert OpenAIError to UnifiedAPIError
    func toUnifiedError() -> UnifiedAPIError {
        switch self {
        case .missingAPIKey:
            return .configuration("Missing API key", context: ["source": "OpenAI"])
        case .invalidConfiguration:
            return .configuration("Invalid configuration", context: ["source": "OpenAI"])
        case let .invalidRequest(message):
            return .validation(message, context: ["source": "OpenAI"])
        case .authenticationFailed:
            return .authentication("Authentication failed", context: ["source": "OpenAI"])
        case let .rateLimitExceeded(retryAfter):
            return .rateLimit(retryAfter: retryAfter, context: ["source": "OpenAI"])
        case let .serverError(statusCode, message):
            return .serverError(code: statusCode, message: message, context: ["source": "OpenAI"])
        case let .networkError(error):
            return .network(error, context: ["source": "OpenAI"])
        case let .decodingError(error):
            return .parsing(error, context: ["source": "OpenAI"])
        case .timeout:
            return .timeout(context: ["source": "OpenAI"])
        case .cancelled:
            return .unknown("Request cancelled", context: ["source": "OpenAI"])
        case let .unknown(message):
            return .unknown(message, context: ["source": "OpenAI"])
        }
    }
}

extension GeminiError {
    /// Convert GeminiError to UnifiedAPIError
    func toUnifiedError() -> UnifiedAPIError {
        switch self {
        case let .configurationError(message):
            return .configuration(message, context: ["source": "Gemini"])
        case let .networkError(error):
            return .network(error, context: ["source": "Gemini"])
        case .invalidResponse:
            return .parsing(
                NSError(
                    domain: "Gemini",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid response format"]
                ),
                context: ["source": "Gemini"]
            )
        case let .apiError(code, message):
            if (500...599).contains(code) {
                return .serverError(code: code, message: message, context: ["source": "Gemini"])
            } else {
                return .clientError(code: code, message: message, context: ["source": "Gemini"])
            }
        case let .rateLimitExceeded(retryAfter):
            return .rateLimit(retryAfter: retryAfter, context: ["source": "Gemini"])
        case let .decodingError(error):
            return .parsing(error, context: ["source": "Gemini"])
        case .maxRetriesExceeded:
            return .unknown("Maximum retry attempts exceeded", context: ["source": "Gemini"])
        case let .invalidRequest(message):
            return .validation(message, context: ["source": "Gemini"])
        case let .contentBlocked(reason):
            return .validation("Content blocked: \(reason)", context: ["source": "Gemini"])
        }
    }
}

extension GoogleAPIError {
    /// Convert GoogleAPIError to UnifiedAPIError
    func toUnifiedError() -> UnifiedAPIError {
        switch self {
        case let .configurationError(message):
            return .configuration(message, context: ["source": "Google"])
        case let .oauthError(message):
            return .authentication(message, context: ["source": "Google"])
        case let .networkError(error):
            return .network(error, context: ["source": "Google"])
        case .invalidResponse:
            return .parsing(
                NSError(
                    domain: "Google",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid response format"]
                ),
                context: ["source": "Google"]
            )
        case let .apiError(code, message):
            if (500...599).contains(code) {
                return .serverError(code: code, message: message, context: ["source": "Google"])
            } else {
                return .clientError(code: code, message: message, context: ["source": "Google"])
            }
        case let .rateLimitExceeded(retryAfter):
            return .rateLimit(retryAfter: retryAfter, context: ["source": "Google"])
        case .permissionDenied:
            return .authorization("Permission denied", context: ["source": "Google"])
        case let .notFound(resource):
            return .clientError(code: 404, message: "Resource not found: \(resource)", context: ["source": "Google"])
        case let .invalidRequest(message):
            return .validation(message, context: ["source": "Google"])
        case let .decodingError(error):
            return .parsing(error, context: ["source": "Google"])
        case .maxRetriesExceeded:
            return .unknown("Maximum retry attempts exceeded", context: ["source": "Google"])
        }
    }
}

// MARK: - Error Logging Utilities

/// Centralized error logger for all API errors with analytics
@MainActor
final class APIErrorLogger {
    static let shared = APIErrorLogger()

    private var errorHistory: [ErrorLogEntry] = []
    private var errorCounts: [String: Int] = [:]
    private var categoryCount: [APIErrorCategory: Int] = [:]
    private let maxHistorySize = 1_000

    private init() {}

    /// Log an API error with context
    func log(_ error: APIErrorProtocol, additionalContext: [String: Any]? = nil) {
        var logContext = error.context ?? [:]

        if let additionalContext {
            logContext.merge(additionalContext) { _, new in new }
        }

        let logMessage = """
        [API Error] \(error.errorCategory.displayName)
        Code: \(error.errorCode)
        Message: \(error.errorDescription ?? "Unknown")
        HTTP Status: \(error.httpStatusCode.map { String($0) } ?? "N/A")
        Retryable: \(error.isRetryable)
        Context: \(logContext)
        Timestamp: \(Date())
        """

        print(logMessage)

        // Track error for analytics
        trackError(error, context: logContext)

        // In production, send to analytics service
        // Analytics.shared.trackError(error)
    }

    /// Log an error with automatic conversion to unified format
    func log<E: Error>(_ error: E, additionalContext: [String: Any]? = nil) {
        if let apiError = error as? APIErrorProtocol {
            log(apiError, additionalContext: additionalContext)
        } else if let openAIError = error as? OpenAIError {
            log(openAIError.toUnifiedError(), additionalContext: additionalContext)
        } else if let geminiError = error as? GeminiError {
            log(geminiError.toUnifiedError(), additionalContext: additionalContext)
        } else if let googleError = error as? GoogleAPIError {
            log(googleError.toUnifiedError(), additionalContext: additionalContext)
        } else {
            let unifiedError = UnifiedAPIError.unknown(
                error.localizedDescription,
                context: additionalContext
            )
            log(unifiedError)
        }
    }

    // MARK: - Analytics Methods

    private func trackError(_ error: APIErrorProtocol, context: [String: Any]) {
        // Create log entry
        let entry = ErrorLogEntry(
            errorCode: error.errorCode,
            category: error.errorCategory,
            message: error.errorDescription ?? "Unknown",
            httpStatusCode: error.httpStatusCode,
            isRetryable: error.isRetryable,
            context: context,
            timestamp: Date()
        )

        // Add to history
        errorHistory.append(entry)

        // Maintain history size limit
        if errorHistory.count > maxHistorySize {
            errorHistory.removeFirst(errorHistory.count - maxHistorySize)
        }

        // Update counters
        errorCounts[error.errorCode, default: 0] += 1
        categoryCount[error.errorCategory, default: 0] += 1
    }

    /// Get error analytics report
    func getAnalytics() -> ErrorAnalytics {
        let now = Date()
        let oneHourAgo = now.addingTimeInterval(-3_600)
        let oneDayAgo = now.addingTimeInterval(-86_400)

        let recentErrors = errorHistory.filter { $0.timestamp > oneHourAgo }
        let dailyErrors = errorHistory.filter { $0.timestamp > oneDayAgo }

        return ErrorAnalytics(
            totalErrors: errorHistory.count,
            errorsLastHour: recentErrors.count,
            errorsLastDay: dailyErrors.count,
            errorsByCode: errorCounts,
            errorsByCategory: categoryCount,
            mostCommonError: errorCounts.max { $0.value < $1.value }?.key,
            mostCommonCategory: categoryCount.max { $0.value < $1.value }?.key,
            recentErrors: Array(errorHistory.suffix(10))
        )
    }

    /// Get errors by category
    func getErrors(forCategory category: APIErrorCategory) -> [ErrorLogEntry] {
        errorHistory.filter { $0.category == category }
    }

    /// Get errors by code
    func getErrors(forCode code: String) -> [ErrorLogEntry] {
        errorHistory.filter { $0.errorCode == code }
    }

    /// Get errors within time range
    func getErrors(from startDate: Date, to endDate: Date) -> [ErrorLogEntry] {
        errorHistory.filter { $0.timestamp >= startDate && $0.timestamp <= endDate }
    }

    /// Clear error history
    func clearHistory() {
        errorHistory.removeAll()
        errorCounts.removeAll()
        categoryCount.removeAll()
    }

    /// Get error rate per minute over the last hour
    func getErrorRate() -> Double {
        let oneHourAgo = Date().addingTimeInterval(-3_600)
        let recentErrors = errorHistory.filter { $0.timestamp > oneHourAgo }
        return Double(recentErrors.count) / 60.0
    }
}

// MARK: - Error Log Entry

struct ErrorLogEntry: Codable {
    let errorCode: String
    let category: APIErrorCategory
    let message: String
    let httpStatusCode: Int?
    let isRetryable: Bool
    let context: [String: String]  // Simplified for Codable
    let timestamp: Date

    init(
        errorCode: String,
        category: APIErrorCategory,
        message: String,
        httpStatusCode: Int?,
        isRetryable: Bool,
        context: [String: Any],
        timestamp: Date
    ) {
        self.errorCode = errorCode
        self.category = category
        self.message = message
        self.httpStatusCode = httpStatusCode
        self.isRetryable = isRetryable
        self.context = context.mapValues { String(describing: $0) }
        self.timestamp = timestamp
    }
}

// MARK: - Error Analytics

struct ErrorAnalytics {
    let totalErrors: Int
    let errorsLastHour: Int
    let errorsLastDay: Int
    let errorsByCode: [String: Int]
    let errorsByCategory: [APIErrorCategory: Int]
    let mostCommonError: String?
    let mostCommonCategory: APIErrorCategory?
    let recentErrors: [ErrorLogEntry]

    /// Get formatted analytics report
    var report: String {
        var lines: [String] = [
            "=== Error Analytics Report ===",
            "Total Errors: \(totalErrors)",
            "Errors (Last Hour): \(errorsLastHour)",
            "Errors (Last 24h): \(errorsLastDay)",
            ""
        ]

        if let mostCommon = mostCommonError, let count = errorsByCode[mostCommon] {
            lines.append("Most Common Error: \(mostCommon) (\(count) occurrences)")
        }

        if let mostCommonCat = mostCommonCategory, let count = errorsByCategory[mostCommonCat] {
            lines.append("Most Common Category: \(mostCommonCat.displayName) (\(count) occurrences)")
        }

        lines.append("")
        lines.append("Errors by Category:")
        for (category, count) in errorsByCategory.sorted(by: { $0.value > $1.value }) {
            lines.append("  \(category.displayName): \(count)")
        }

        lines.append("")
        lines.append("Top Error Codes:")
        for (code, count) in errorsByCode.sorted(by: { $0.value > $1.value }).prefix(5) {
            lines.append("  \(code): \(count)")
        }

        return lines.joined(separator: "\n")
    }
}

// MARK: - Error Presentation Utilities

extension APIErrorProtocol {
    /// Get a user-friendly error message for display
    var userFriendlyMessage: String {
        errorDescription ?? "An unexpected error occurred. Please try again."
    }

    /// Get a detailed error message for debugging
    var detailedMessage: String {
        var message = userFriendlyMessage

        if let recovery = recoverySuggestion {
            message += "\n\n\(recovery)"
        }

        if let httpStatus = httpStatusCode {
            message += "\n\nHTTP Status: \(httpStatus)"
        }

        if let docURL = documentationURL {
            message += "\n\nMore information: \(docURL.absoluteString)"
        }

        return message
    }
}
