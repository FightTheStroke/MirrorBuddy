import Foundation

/// Configuration for Google Gemini API
struct GeminiConfiguration {
    /// API key for authentication
    let apiKey: String

    /// Base URL for Gemini API
    let baseURL: String

    /// Request timeout in seconds
    let timeout: TimeInterval

    /// Maximum retry attempts
    let maxRetries: Int

    /// Default initializer
    init(
        apiKey: String,
        baseURL: String = "https://generativelanguage.googleapis.com/v1beta",
        timeout: TimeInterval = 60.0,
        maxRetries: Int = 3
    ) {
        self.apiKey = apiKey
        self.baseURL = baseURL
        self.timeout = timeout
        self.maxRetries = maxRetries
    }

    /// Load configuration from secure keychain storage
    @MainActor
    static func loadFromEnvironment() -> GeminiConfiguration? {
        // Try to load from keychain first (production)
        do {
            if let apiKey = try KeychainManager.shared.getGeminiAPIKey(), !apiKey.isEmpty {
                return GeminiConfiguration(apiKey: apiKey)
            }
        } catch {
            print("Failed to load Gemini API key from keychain: \(error.localizedDescription)")
        }

        // Fallback: Try environment variable (development/testing only)
        if let apiKey = ProcessInfo.processInfo.environment["GEMINI_API_KEY"], !apiKey.isEmpty {
            return GeminiConfiguration(apiKey: apiKey)
        }

        return nil
    }

    /// Save API key to secure keychain storage
    @MainActor
    func save() throws {
        try KeychainManager.shared.saveGeminiAPIKey(apiKey)
    }
}

// MARK: - Gemini Models
extension GeminiConfiguration {
    enum Model: String {
        /// Gemini 2.5 Pro - Latest and most capable model
        case gemini25Pro = "gemini-2.5-pro-exp-0512"

        /// Gemini 2.5 Flash - Fast and efficient
        case gemini25Flash = "gemini-2.5-flash"

        /// Gemini 2.0 Flash Experimental
        case gemini20Flash = "gemini-2.0-flash-exp"

        /// Legacy Gemini Pro
        case geminiPro = "gemini-pro"

        /// Legacy Gemini Pro Vision
        case geminiProVision = "gemini-pro-vision"

        var supportsVision: Bool {
            switch self {
            case .gemini25Pro, .gemini25Flash, .gemini20Flash, .geminiProVision:
                return true
            case .geminiPro:
                return false
            }
        }

        var maxTokens: Int {
            switch self {
            case .gemini25Pro:
                return 8_192
            case .gemini25Flash:
                return 8_192
            case .gemini20Flash:
                return 8_192
            case .geminiPro, .geminiProVision:
                return 2_048
            }
        }

        var supportsSystemInstructions: Bool {
            switch self {
            case .gemini25Pro, .gemini25Flash, .gemini20Flash:
                return true
            case .geminiPro, .geminiProVision:
                return false
            }
        }
    }
}

// MARK: - Endpoints
extension GeminiConfiguration {
    enum Endpoint {
        case generateContent(model: Model)
        case streamGenerateContent(model: Model)

        func path(baseURL: String, apiKey: String) -> String {
            switch self {
            case .generateContent(let model):
                return "\(baseURL)/models/\(model.rawValue):generateContent?key=\(apiKey)"
            case .streamGenerateContent(let model):
                return "\(baseURL)/models/\(model.rawValue):streamGenerateContent?key=\(apiKey)"
            }
        }
    }
}
