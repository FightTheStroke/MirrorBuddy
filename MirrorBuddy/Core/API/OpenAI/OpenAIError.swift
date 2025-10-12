import Foundation

/// Errors specific to OpenAI API
enum OpenAIError: LocalizedError {
    case missingAPIKey
    case invalidConfiguration
    case invalidRequest(String)
    case authenticationFailed
    case rateLimitExceeded(retryAfter: TimeInterval?)
    case serverError(statusCode: Int, message: String)
    case networkError(Error)
    case decodingError(Error)
    case timeout
    case cancelled
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return String(localized: "error.openai.missingAPIKey")
        case .invalidConfiguration:
            return String(localized: "error.openai.invalidConfiguration")
        case .invalidRequest(let message):
            return String(localized: "error.openai.invalidRequest") + ": \(message)"
        case .authenticationFailed:
            return String(localized: "error.openai.authenticationFailed")
        case .rateLimitExceeded(let retryAfter):
            if let retry = retryAfter {
                return String(localized: "error.openai.rateLimitExceeded") + " (\(Int(retry))s)"
            }
            return String(localized: "error.openai.rateLimitExceeded")
        case let .serverError(statusCode, message):
            return "Server Error (\(statusCode)): \(message)"
        case .networkError(let error):
            return String(localized: "error.openai.networkError") + ": \(error.localizedDescription)"
        case .decodingError(let error):
            return String(localized: "error.openai.decodingError") + ": \(error.localizedDescription)"
        case .timeout:
            return String(localized: "error.openai.timeout")
        case .cancelled:
            return String(localized: "error.openai.cancelled")
        case .unknown(let message):
            return String(localized: "error.openai.unknown") + ": \(message)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .missingAPIKey:
            return "Please configure your OpenAI API key in Settings."
        case .invalidConfiguration:
            return "Check your OpenAI configuration settings."
        case .authenticationFailed:
            return "Verify your API key is valid and has not expired."
        case .rateLimitExceeded:
            return "Please wait a moment and try again."
        case .networkError:
            return "Check your internet connection and try again."
        case .timeout:
            return "The request took too long. Try again."
        default:
            return nil
        }
    }
}
