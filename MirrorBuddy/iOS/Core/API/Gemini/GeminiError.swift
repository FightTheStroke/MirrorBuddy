import Foundation

/// Errors that can occur when using the Gemini API
enum GeminiError: LocalizedError {
    /// Configuration error (missing API key, invalid URL, etc.)
    case configurationError(String)

    /// Network error (no connection, timeout, etc.)
    case networkError(Error)

    /// Invalid response from the API
    case invalidResponse

    /// API error with specific code and message
    case apiError(code: Int, message: String)

    /// Rate limit exceeded
    case rateLimitExceeded(retryAfter: TimeInterval?)

    /// Content safety blocked
    case contentBlocked(reason: String)

    /// Invalid request parameters
    case invalidRequest(String)

    /// Decoding error when parsing response
    case decodingError(Error)

    /// Maximum retries exceeded
    case maxRetriesExceeded

    var errorDescription: String? {
        switch self {
        case .configurationError(let message):
            return "Configuration error: \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from Gemini API"
        case let .apiError(code, message):
            return "Gemini API error (\(code)): \(message)"
        case .rateLimitExceeded(let retryAfter):
            if let retryAfter {
                return "Rate limit exceeded. Retry after \(Int(retryAfter)) seconds."
            }
            return "Rate limit exceeded"
        case .contentBlocked(let reason):
            return "Content blocked by safety filters: \(reason)"
        case .invalidRequest(let message):
            return "Invalid request: \(message)"
        case .decodingError(let error):
            return "Error decoding response: \(error.localizedDescription)"
        case .maxRetriesExceeded:
            return "Maximum retry attempts exceeded"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .configurationError:
            return "Check your API key and configuration settings"
        case .networkError:
            return "Check your internet connection and try again"
        case .invalidResponse:
            return "The API response format is unexpected. Please try again later."
        case .apiError(let code, _):
            switch code {
            case 400:
                return "Check your request parameters and try again"
            case 401:
                return "Check your API key is valid and has proper permissions"
            case 403:
                return "You don't have permission to access this resource"
            case 404:
                return "The requested resource was not found"
            case 429:
                return "You're making too many requests. Please slow down."
            case 500...599:
                return "The server encountered an error. Please try again later."
            default:
                return "Please try again or contact support if the problem persists"
            }
        case .rateLimitExceeded:
            return "Wait before making another request, or upgrade your API plan"
        case .contentBlocked:
            return "Modify your content to comply with safety guidelines"
        case .invalidRequest:
            return "Check your request parameters are correctly formatted"
        case .decodingError:
            return "The response format has changed. Please update the app."
        case .maxRetriesExceeded:
            return "The request failed after multiple attempts. Please try again later."
        }
    }
}
