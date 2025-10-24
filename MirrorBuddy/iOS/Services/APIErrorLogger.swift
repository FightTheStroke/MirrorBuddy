#if os(iOS)
import Foundation
import os.log

// MARK: - Error Logging Utilities

/// Centralized error logger for all API errors with analytics
@MainActor
final class APIErrorLogger {
    static let shared = APIErrorLogger()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "APIError")
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
        """

        logger.error("\(logMessage)")

        // Store in history
        let entry = ErrorLogEntry(
            errorCode: error.errorCode,
            category: error.errorCategory,
            message: error.errorDescription ?? "Unknown",
            httpStatusCode: error.httpStatusCode,
            isRetryable: error.isRetryable,
            context: logContext,
            timestamp: Date()
        )

        errorHistory.append(entry)
        errorCounts[error.errorCode, default: 0] += 1
        categoryCount[error.errorCategory, default: 0] += 1

        // Trim history if needed
        if errorHistory.count > maxHistorySize {
            errorHistory.removeFirst(errorHistory.count - maxHistorySize)
        }
    }

    /// Log a unified API error
    func log(_ error: UnifiedAPIError, additionalContext: [String: Any]? = nil) {
        log(error as APIErrorProtocol, additionalContext: additionalContext)
    }

    /// Get error statistics
    func getStatistics() -> ErrorStatistics {
        ErrorStatistics(
            totalErrors: errorHistory.count,
            errorsByCategory: categoryCount,
            errorsByCode: errorCounts,
            recentErrors: Array(errorHistory.suffix(10))
        )
    }

    /// Get analytics data
    func getAnalytics() -> ErrorAnalytics {
        ErrorAnalytics(
            totalErrors: errorHistory.count,
            errorsByCategory: categoryCount,
            errorsByCode: errorCounts,
            errorHistory: errorHistory
        )
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
    let errorsByCategory: [APIErrorCategory: Int]
    let errorsByCode: [String: Int]
    let errorHistory: [ErrorLogEntry]

    var mostCommonCategory: APIErrorCategory? {
        errorsByCategory.max(by: { $0.value < $1.value })?.key
    }

    var mostCommonError: String? {
        errorsByCode.max(by: { $0.value < $1.value })?.key
    }

    var errorRate: Double {
        let oneHourAgo = Date().addingTimeInterval(-3_600)
        let recentErrors = errorHistory.filter { $0.timestamp > oneHourAgo }
        return Double(recentErrors.count) / 60.0 // Errors per minute
    }

    func summary() -> String {
        var lines: [String] = []
        lines.append("Error Analytics Summary")
        lines.append("======================")
        lines.append("Total Errors: \(totalErrors)")
        lines.append("Error Rate: \(String(format: "%.2f", errorRate)) errors/min")

        if let category = mostCommonCategory {
            lines.append("\nMost Common Category: \(category.displayName)")
        }

        lines.append("\nErrors by Category:")
        for (category, count) in errorsByCategory.sorted(by: { $0.value > $1.value }) {
            lines.append("  \(category.displayName): \(count)")
        }

        lines.append("\nTop 5 Errors:")
        for (code, count) in errorsByCode.sorted(by: { $0.value > $1.value }).prefix(5) {
            lines.append("  \(code): \(count)")
        }

        return lines.joined(separator: "\n")
    }
}

// MARK: - Error Statistics

struct ErrorStatistics {
    let totalErrors: Int
    let errorsByCategory: [APIErrorCategory: Int]
    let errorsByCode: [String: Int]
    let recentErrors: [ErrorLogEntry]
}

#endif
