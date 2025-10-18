import Foundation
@testable import MirrorBuddy
import Testing

@Suite("Error Analytics Tests")
@MainActor
struct ErrorAnalyticsTests {
    // MARK: - Error Logging Tests

    @Test("Error logger tracks errors")
    func testErrorTracking() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        let error1 = UnifiedAPIError.timeout(context: nil)
        let error2 = UnifiedAPIError.rateLimit(retryAfter: 60, context: nil)

        logger.log(error1)
        logger.log(error2)

        let analytics = logger.getAnalytics()
        #expect(analytics.totalErrors >= 2)
    }

    @Test("Error logger counts by error code")
    func testErrorCountsByCode() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        let error = UnifiedAPIError.timeout(context: nil)

        // Log same error multiple times
        for _ in 0..<3 {
            logger.log(error)
        }

        let analytics = logger.getAnalytics()
        let timeoutCount = analytics.errorsByCode["API_TIMEOUT"]
        #expect(timeoutCount == 3)
    }

    @Test("Error logger counts by category")
    func testErrorCountsByCategory() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.network(URLError(.timedOut), context: nil))
        logger.log(UnifiedAPIError.rateLimit(retryAfter: nil, context: nil))

        let analytics = logger.getAnalytics()
        let timeoutCount = analytics.errorsByCategory[.timeout]
        let networkCount = analytics.errorsByCategory[.network]
        let rateLimitCount = analytics.errorsByCategory[.rateLimit]

        #expect(timeoutCount == 1)
        #expect(networkCount == 1)
        #expect(rateLimitCount == 1)
    }

    @Test("Error logger identifies most common error")
    func testMostCommonError() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log timeout errors more frequently
        for _ in 0..<5 {
            logger.log(UnifiedAPIError.timeout(context: nil))
        }
        for _ in 0..<2 {
            logger.log(UnifiedAPIError.rateLimit(retryAfter: nil, context: nil))
        }

        let analytics = logger.getAnalytics()
        #expect(analytics.mostCommonError == "API_TIMEOUT")
    }

    @Test("Error logger identifies most common category")
    func testMostCommonCategory() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        for _ in 0..<5 {
            logger.log(UnifiedAPIError.timeout(context: nil))
        }
        for _ in 0..<2 {
            logger.log(UnifiedAPIError.network(URLError(.timedOut), context: nil))
        }

        let analytics = logger.getAnalytics()
        #expect(analytics.mostCommonCategory == .timeout)
    }

    @Test("Error logger tracks recent errors")
    func testRecentErrors() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log multiple errors
        for index in 0..<15 {
            logger.log(UnifiedAPIError.unknown("Error \(index)", context: nil))
        }

        let analytics = logger.getAnalytics()
        #expect(analytics.recentErrors.count == 10)  // Should keep last 10
    }

    @Test("Error logger filters by category")
    func testFilterByCategory() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.rateLimit(retryAfter: nil, context: nil))

        let timeoutErrors = logger.getErrors(forCategory: .timeout)
        #expect(timeoutErrors.count == 2)

        let rateLimitErrors = logger.getErrors(forCategory: .rateLimit)
        #expect(rateLimitErrors.count == 1)
    }

    @Test("Error logger filters by code")
    func testFilterByCode() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.rateLimit(retryAfter: nil, context: nil))

        let timeoutErrors = logger.getErrors(forCode: "API_TIMEOUT")
        #expect(timeoutErrors.count == 2)

        let rateLimitErrors = logger.getErrors(forCode: "API_RATE_LIMIT")
        #expect(rateLimitErrors.count == 1)
    }

    @Test("Error logger filters by time range")
    func testFilterByTimeRange() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        let now = Date()
        let oneMinuteAgo = now.addingTimeInterval(-60)
        let twoMinutesAgo = now.addingTimeInterval(-120)

        logger.log(UnifiedAPIError.timeout(context: nil))

        let recentErrors = logger.getErrors(from: oneMinuteAgo, to: now)
        #expect(recentErrors.count >= 1)

        let oldErrors = logger.getErrors(from: twoMinutesAgo, to: oneMinuteAgo)
        #expect(oldErrors.isEmpty)
    }

    @Test("Error logger calculates error rate")
    func testErrorRate() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log some errors
        for _ in 0..<10 {
            logger.log(UnifiedAPIError.timeout(context: nil))
        }

        let errorRate = logger.getErrorRate()
        #expect(errorRate > 0)
    }

    @Test("Error logger clear history works")
    func testClearHistory() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log some errors
        for _ in 0..<5 {
            logger.log(UnifiedAPIError.timeout(context: nil))
        }

        var analytics = logger.getAnalytics()
        #expect(analytics.totalErrors >= 5)

        // Clear
        logger.clearHistory()

        analytics = logger.getAnalytics()
        #expect(analytics.totalErrors == 0)
    }

    @Test("Error logger tracks errors last hour")
    func testErrorsLastHour() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log errors
        for _ in 0..<3 {
            logger.log(UnifiedAPIError.timeout(context: nil))
        }

        let analytics = logger.getAnalytics()
        #expect(analytics.errorsLastHour >= 3)
    }

    @Test("Error logger tracks errors last day")
    func testErrorsLastDay() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log errors
        for _ in 0..<3 {
            logger.log(UnifiedAPIError.timeout(context: nil))
        }

        let analytics = logger.getAnalytics()
        #expect(analytics.errorsLastDay >= 3)
    }

    // MARK: - ErrorAnalytics Report Tests

    @Test("Error analytics report formatting")
    func testAnalyticsReportFormatting() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        // Log some variety of errors
        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.timeout(context: nil))
        logger.log(UnifiedAPIError.rateLimit(retryAfter: nil, context: nil))
        logger.log(UnifiedAPIError.serverError(code: 500, message: "Server error", context: nil))

        let analytics = logger.getAnalytics()
        let report = analytics.report

        #expect(report.contains("Error Analytics Report"))
        #expect(report.contains("Total Errors"))
        #expect(report.contains("Errors (Last Hour)"))
        #expect(report.contains("Most Common Error"))
        #expect(report.contains("Errors by Category"))
    }

    // MARK: - Error Conversion Tests

    @Test("Error logger handles OpenAIError conversion")
    func testOpenAIErrorConversion() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        let openAIError = OpenAIError.rateLimitExceeded(retryAfter: 60)
        logger.log(openAIError)

        let analytics = logger.getAnalytics()
        #expect(analytics.totalErrors >= 1)

        let rateLimitErrors = logger.getErrors(forCategory: .rateLimit)
        #expect(rateLimitErrors.count >= 1)
    }

    @Test("Error logger handles GeminiError conversion")
    func testGeminiErrorConversion() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        let geminiError = GeminiError.rateLimitExceeded(retryAfter: 30)
        logger.log(geminiError)

        let analytics = logger.getAnalytics()
        #expect(analytics.totalErrors >= 1)

        let rateLimitErrors = logger.getErrors(forCategory: .rateLimit)
        #expect(rateLimitErrors.count >= 1)
    }

    @Test("Error logger handles GoogleAPIError conversion")
    func testGoogleAPIErrorConversion() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        let googleError = GoogleAPIError.rateLimitExceeded(retryAfter: 45)
        logger.log(googleError)

        let analytics = logger.getAnalytics()
        #expect(analytics.totalErrors >= 1)

        let rateLimitErrors = logger.getErrors(forCategory: .rateLimit)
        #expect(rateLimitErrors.count >= 1)
    }

    @Test("Error logger handles generic errors")
    func testGenericErrorHandling() {
        let logger = APIErrorLogger.shared
        logger.clearHistory()

        struct CustomError: Error {}
        let customError = CustomError()

        logger.log(customError)

        let analytics = logger.getAnalytics()
        #expect(analytics.totalErrors >= 1)

        let unknownErrors = logger.getErrors(forCategory: .unknown)
        #expect(unknownErrors.count >= 1)
    }

    // MARK: - ErrorLogEntry Tests

    @Test("Error log entry stores context")
    func testErrorLogEntryContext() {
        let context: [String: Any] = [
            "endpoint": "/api/test",
            "method": "GET",
            "user": "test-user"
        ]

        let entry = ErrorLogEntry(
            errorCode: "TEST_ERROR",
            category: .network,
            message: "Test error message",
            httpStatusCode: 500,
            isRetryable: true,
            context: context,
            timestamp: Date()
        )

        #expect(entry.errorCode == "TEST_ERROR")
        #expect(entry.category == .network)
        #expect(entry.message == "Test error message")
        #expect(entry.httpStatusCode == 500)
        #expect(entry.isRetryable == true)
        #expect(entry.context["endpoint"] == "/api/test")
        #expect(entry.context["method"] == "GET")
        #expect(entry.context["user"] == "test-user")
    }

    @Test("Error log entry is codable")
    func testErrorLogEntryCodable() throws {
        let context: [String: Any] = ["key": "value"]

        let entry = ErrorLogEntry(
            errorCode: "TEST_ERROR",
            category: .network,
            message: "Test message",
            httpStatusCode: 404,
            isRetryable: false,
            context: context,
            timestamp: Date()
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(entry)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(ErrorLogEntry.self, from: data)

        #expect(decoded.errorCode == entry.errorCode)
        #expect(decoded.category == entry.category)
        #expect(decoded.message == entry.message)
        #expect(decoded.httpStatusCode == entry.httpStatusCode)
        #expect(decoded.isRetryable == entry.isRetryable)
    }
}
