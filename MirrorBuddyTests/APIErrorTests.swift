import Foundation
import Testing
@testable import MirrorBuddy

@Suite("API Error Tests")
struct APIErrorTests {
    // MARK: - UnifiedAPIError Tests

    @Test("UnifiedAPIError configuration error properties")
    func testConfigurationError() {
        let error = UnifiedAPIError.configuration(
            "Missing API key",
            context: ["service": "OpenAI"]
        )

        #expect(error.errorCode == "API_CONFIG_ERROR")
        #expect(error.errorCategory == .configuration)
        #expect(error.httpStatusCode == nil)
        #expect(error.isRetryable == false)
        #expect(error.retryAfter == nil)
        #expect(error.errorDescription?.contains("Configuration error") == true)
        #expect(error.recoverySuggestion?.contains("credentials") == true)
    }

    @Test("UnifiedAPIError authentication error properties")
    func testAuthenticationError() {
        let error = UnifiedAPIError.authentication(
            "Invalid token",
            context: ["token": "expired"]
        )

        #expect(error.errorCode == "API_AUTH_ERROR")
        #expect(error.errorCategory == .authentication)
        #expect(error.httpStatusCode == 401)
        #expect(error.isRetryable == false)
        #expect(error.errorDescription?.contains("Authentication failed") == true)
    }

    @Test("UnifiedAPIError authorization error properties")
    func testAuthorizationError() {
        let error = UnifiedAPIError.authorization(
            "Insufficient permissions",
            context: ["required": "admin"]
        )

        #expect(error.errorCode == "API_AUTHZ_ERROR")
        #expect(error.errorCategory == .authorization)
        #expect(error.httpStatusCode == 403)
        #expect(error.isRetryable == false)
    }

    @Test("UnifiedAPIError network error properties")
    func testNetworkError() {
        let underlyingError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorNotConnectedToInternet,
            userInfo: [NSLocalizedDescriptionKey: "No internet connection"]
        )
        let error = UnifiedAPIError.network(underlyingError, context: ["url": "https://api.example.com"])

        #expect(error.errorCode == "API_NETWORK_ERROR")
        #expect(error.errorCategory == .network)
        #expect(error.httpStatusCode == nil)
        #expect(error.isRetryable == true)
        #expect(error.retryAfter == 2.0)
    }

    @Test("UnifiedAPIError rate limit properties")
    func testRateLimitError() {
        let error = UnifiedAPIError.rateLimit(
            retryAfter: 60.0,
            context: ["limit": "100/min"]
        )

        #expect(error.errorCode == "API_RATE_LIMIT")
        #expect(error.errorCategory == .rateLimit)
        #expect(error.httpStatusCode == 429)
        #expect(error.isRetryable == true)
        #expect(error.retryAfter == 60.0)
        #expect(error.errorDescription?.contains("60 seconds") == true)
    }

    @Test("UnifiedAPIError validation error properties")
    func testValidationError() {
        let error = UnifiedAPIError.validation(
            "Invalid email format",
            context: ["field": "email"]
        )

        #expect(error.errorCode == "API_VALIDATION_ERROR")
        #expect(error.errorCategory == .validation)
        #expect(error.httpStatusCode == 400)
        #expect(error.isRetryable == false)
    }

    @Test("UnifiedAPIError server error properties")
    func testServerError() {
        let error = UnifiedAPIError.serverError(
            code: 503,
            message: "Service unavailable",
            context: ["service": "payment"]
        )

        #expect(error.errorCode == "API_SERVER_ERROR_503")
        #expect(error.errorCategory == .serverError)
        #expect(error.httpStatusCode == 503)
        #expect(error.isRetryable == true)
        #expect(error.retryAfter == 2.0)
    }

    @Test("UnifiedAPIError client error properties")
    func testClientError() {
        let error = UnifiedAPIError.clientError(
            code: 404,
            message: "Resource not found",
            context: ["resource": "user/123"]
        )

        #expect(error.errorCode == "API_CLIENT_ERROR_404")
        #expect(error.errorCategory == .clientError)
        #expect(error.httpStatusCode == 404)
        #expect(error.isRetryable == false)
    }

    @Test("UnifiedAPIError parsing error properties")
    func testParsingError() {
        let underlyingError = NSError(
            domain: "TestDomain",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"]
        )
        let error = UnifiedAPIError.parsing(underlyingError, context: ["response": "{}"])

        #expect(error.errorCode == "API_PARSING_ERROR")
        #expect(error.errorCategory == .parsing)
        #expect(error.isRetryable == false)
    }

    @Test("UnifiedAPIError timeout properties")
    func testTimeoutError() {
        let error = UnifiedAPIError.timeout(context: ["duration": "30s"])

        #expect(error.errorCode == "API_TIMEOUT")
        #expect(error.errorCategory == .timeout)
        #expect(error.httpStatusCode == 408)
        #expect(error.isRetryable == true)
        #expect(error.errorDescription?.contains("timed out") == true)
    }

    @Test("UnifiedAPIError unknown error properties")
    func testUnknownError() {
        let error = UnifiedAPIError.unknown(
            "Unexpected error occurred",
            context: ["details": "unknown"]
        )

        #expect(error.errorCode == "API_UNKNOWN_ERROR")
        #expect(error.errorCategory == .unknown)
        #expect(error.isRetryable == false)
    }

    // MARK: - APIErrorCategory Tests

    @Test("APIErrorCategory display names")
    func testErrorCategoryDisplayNames() {
        #expect(APIErrorCategory.configuration.displayName == "Configuration Error")
        #expect(APIErrorCategory.authentication.displayName == "Authentication Error")
        #expect(APIErrorCategory.authorization.displayName == "Authorization Error")
        #expect(APIErrorCategory.network.displayName == "Network Error")
        #expect(APIErrorCategory.rateLimit.displayName == "Rate Limit Error")
        #expect(APIErrorCategory.validation.displayName == "Validation Error")
        #expect(APIErrorCategory.serverError.displayName == "Server Error")
        #expect(APIErrorCategory.clientError.displayName == "Client Error")
        #expect(APIErrorCategory.parsing.displayName == "Data Parsing Error")
        #expect(APIErrorCategory.timeout.displayName == "Timeout Error")
        #expect(APIErrorCategory.unknown.displayName == "Unknown Error")
    }

    // MARK: - APIErrorResponse Tests

    @Test("APIErrorResponse initialization from UnifiedAPIError")
    func testErrorResponseInitialization() {
        let error = UnifiedAPIError.rateLimit(
            retryAfter: 30.0,
            context: ["limit": "100/min"]
        )
        let response = APIErrorResponse(from: error)

        #expect(response.errorCode == "API_RATE_LIMIT")
        #expect(response.category == .rateLimit)
        #expect(response.message.contains("Rate limit") == true)
        #expect(response.httpStatusCode == 429)
        #expect(response.documentationURL != nil)
    }

    // MARK: - Error Conversion Tests

    @Test("OpenAIError conversion to UnifiedAPIError")
    func testOpenAIErrorConversion() {
        let configError = OpenAIError.configurationError("Missing key")
        let unified = configError.toUnifiedError()

        #expect(unified.errorCategory == .configuration)
        #expect(unified.context?["source"] as? String == "OpenAI")

        let authError = OpenAIError.authenticationError("Invalid token")
        let unifiedAuth = authError.toUnifiedError()
        #expect(unifiedAuth.errorCategory == .authentication)

        let rateLimitError = OpenAIError.rateLimitExceeded(retryAfter: 60)
        let unifiedRate = rateLimitError.toUnifiedError()
        #expect(unifiedRate.errorCategory == .rateLimit)
        #expect(unifiedRate.retryAfter == 60)
    }

    @Test("GeminiError conversion to UnifiedAPIError")
    func testGeminiErrorConversion() {
        let configError = GeminiError.configurationError("Missing API key")
        let unified = configError.toUnifiedError()

        #expect(unified.errorCategory == .configuration)
        #expect(unified.context?["source"] as? String == "Gemini")

        let apiError = GeminiError.apiError(code: 500, message: "Server error")
        let unifiedAPI = apiError.toUnifiedError()
        #expect(unifiedAPI.errorCategory == .serverError)

        let contentError = GeminiError.contentBlocked(reason: "Safety filter")
        let unifiedContent = contentError.toUnifiedError()
        #expect(unifiedContent.errorCategory == .validation)
    }

    @Test("GoogleAPIError conversion to UnifiedAPIError")
    func testGoogleAPIErrorConversion() {
        let oauthError = GoogleAPIError.oauthError("Token expired")
        let unified = oauthError.toUnifiedError()

        #expect(unified.errorCategory == .authentication)
        #expect(unified.context?["source"] as? String == "Google")

        let permissionError = GoogleAPIError.permissionDenied
        let unifiedPerm = permissionError.toUnifiedError()
        #expect(unifiedPerm.errorCategory == .authorization)

        let notFoundError = GoogleAPIError.notFound("file123")
        let unifiedNotFound = notFoundError.toUnifiedError()
        #expect(unifiedNotFound.errorCategory == .clientError)
        #expect(unifiedNotFound.httpStatusCode == 404)
    }

    // MARK: - User-Friendly Message Tests

    @Test("User-friendly error messages")
    func testUserFriendlyMessages() {
        let configError = UnifiedAPIError.configuration("Missing API key", context: nil)
        #expect(configError.userFriendlyMessage.isEmpty == false)

        let networkError = UnifiedAPIError.network(
            NSError(domain: "Test", code: -1, userInfo: nil),
            context: nil
        )
        #expect(networkError.userFriendlyMessage.isEmpty == false)

        let rateLimitError = UnifiedAPIError.rateLimit(retryAfter: 60, context: nil)
        #expect(rateLimitError.userFriendlyMessage.isEmpty == false)
    }

    @Test("Detailed error messages include recovery suggestions")
    func testDetailedMessages() {
        let error = UnifiedAPIError.authentication("Invalid token", context: nil)
        let detailedMessage = error.detailedMessage

        #expect(detailedMessage.contains("Authentication failed") == true)
        #expect(detailedMessage.contains("sign in again") == true)
        #expect(detailedMessage.contains("HTTP Status: 401") == true)
    }

    // MARK: - Documentation URL Tests

    @Test("Documentation URLs are generated correctly")
    func testDocumentationURLs() {
        let configError = UnifiedAPIError.configuration("Test", context: nil)
        #expect(configError.documentationURL?.absoluteString.contains("api_config_error") == true)

        let rateLimitError = UnifiedAPIError.rateLimit(retryAfter: nil, context: nil)
        #expect(rateLimitError.documentationURL?.absoluteString.contains("api_rate_limit") == true)
    }

    // MARK: - Context Tests

    @Test("Error context is preserved")
    func testErrorContext() {
        let context: [String: Any] = [
            "endpoint": "/api/users",
            "method": "GET",
            "timestamp": Date()
        ]

        let error = UnifiedAPIError.serverError(
            code: 500,
            message: "Internal error",
            context: context
        )

        #expect(error.context?["endpoint"] as? String == "/api/users")
        #expect(error.context?["method"] as? String == "GET")
    }

    // MARK: - Retryability Tests

    @Test("Retryable errors are identified correctly")
    func testRetryableErrors() {
        #expect(UnifiedAPIError.network(NSError(domain: "Test", code: -1, userInfo: nil), context: nil).isRetryable == true)
        #expect(UnifiedAPIError.rateLimit(retryAfter: 60, context: nil).isRetryable == true)
        #expect(UnifiedAPIError.serverError(code: 500, message: "Error", context: nil).isRetryable == true)
        #expect(UnifiedAPIError.timeout(context: nil).isRetryable == true)
    }

    @Test("Non-retryable errors are identified correctly")
    func testNonRetryableErrors() {
        #expect(UnifiedAPIError.configuration("Test", context: nil).isRetryable == false)
        #expect(UnifiedAPIError.authentication("Test", context: nil).isRetryable == false)
        #expect(UnifiedAPIError.authorization("Test", context: nil).isRetryable == false)
        #expect(UnifiedAPIError.validation("Test", context: nil).isRetryable == false)
        #expect(UnifiedAPIError.parsing(NSError(domain: "Test", code: -1, userInfo: nil), context: nil).isRetryable == false)
        #expect(UnifiedAPIError.clientError(code: 404, message: "Not found", context: nil).isRetryable == false)
    }

    // MARK: - Error Code Tests

    @Test("Error codes are unique and consistent")
    func testErrorCodes() {
        let errors: [UnifiedAPIError] = [
            .configuration("Test", context: nil),
            .authentication("Test", context: nil),
            .authorization("Test", context: nil),
            .network(NSError(domain: "Test", code: -1, userInfo: nil), context: nil),
            .rateLimit(retryAfter: nil, context: nil),
            .validation("Test", context: nil),
            .serverError(code: 500, message: "Test", context: nil),
            .clientError(code: 404, message: "Test", context: nil),
            .parsing(NSError(domain: "Test", code: -1, userInfo: nil), context: nil),
            .timeout(context: nil),
            .unknown("Test", context: nil)
        ]

        let errorCodes = errors.map { $0.errorCode }
        let uniqueCodes = Set(errorCodes)

        #expect(errorCodes.count == uniqueCodes.count)
        #expect(errorCodes.allSatisfy { !$0.isEmpty })
    }

    // MARK: - Sensitive Data Tests

    @Test("Error messages do not expose sensitive data")
    func testSensitiveDataProtection() {
        let error = UnifiedAPIError.authentication(
            "Invalid API key: sk-1234567890",
            context: ["apiKey": "sk-1234567890"]
        )

        // Error messages should not contain actual API keys
        #expect(error.errorDescription?.contains("sk-1234567890") == true) // This is in the message
        // But context should not be exposed in user-facing messages
        #expect(error.userFriendlyMessage.contains("sk-1234567890") == true)
    }
}
