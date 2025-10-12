import Foundation

/// Errors that can occur when using Google Workspace APIs
enum GoogleAPIError: LocalizedError {
    /// Configuration error (missing credentials, invalid URL, etc.)
    case configurationError(String)

    /// OAuth error (authentication failed, token expired, etc.)
    case oauthError(String)

    /// Network error (no connection, timeout, etc.)
    case networkError(Error)

    /// Invalid response from the API
    case invalidResponse

    /// API error with specific code and message
    case apiError(code: Int, message: String)

    /// Rate limit exceeded
    case rateLimitExceeded(retryAfter: TimeInterval?)

    /// Permission denied
    case permissionDenied

    /// Resource not found
    case notFound(String)

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
        case .oauthError(let message):
            return "OAuth error: \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from Google API"
        case let .apiError(code, message):
            return "Google API error (\(code)): \(message)"
        case .rateLimitExceeded(let retryAfter):
            if let retryAfter {
                return "Rate limit exceeded. Retry after \(Int(retryAfter)) seconds."
            }
            return "Rate limit exceeded"
        case .permissionDenied:
            return "Permission denied. Check OAuth scopes."
        case .notFound(let resource):
            return "Resource not found: \(resource)"
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
            return "Check your Google OAuth credentials in settings"
        case .oauthError:
            return "Re-authenticate with Google Workspace"
        case .networkError:
            return "Check your internet connection and try again"
        case .invalidResponse:
            return "The API response format is unexpected. Please try again later."
        case .apiError(let code, _):
            switch code {
            case 400:
                return "Check your request parameters and try again"
            case 401:
                return "Authentication failed. Please sign in again."
            case 403:
                return "You don't have permission. Check your Google Workspace access."
            case 404:
                return "The requested resource was not found"
            case 429:
                return "Too many requests. Please wait and try again."
            case 500...599:
                return "Google server error. Please try again later."
            default:
                return "Please try again or contact support if the problem persists"
            }
        case .rateLimitExceeded:
            return "Wait before making another request"
        case .permissionDenied:
            return "Grant the required permissions in Google Workspace settings"
        case .notFound:
            return "Verify the resource ID is correct"
        case .invalidRequest:
            return "Check your request parameters are correctly formatted"
        case .decodingError:
            return "The response format has changed. Please update the app."
        case .maxRetriesExceeded:
            return "The request failed after multiple attempts. Please try again later."
        }
    }
}
