import Foundation

/// Configuration for OpenAI API
struct OpenAIConfiguration {
    /// API key for authentication
    let apiKey: String

    /// Base URL for OpenAI API
    let baseURL: String

    /// Organization ID (optional)
    let organizationID: String?

    /// Request timeout in seconds
    let timeout: TimeInterval

    /// Maximum retry attempts
    let maxRetries: Int

    /// Default initializer
    init(
        apiKey: String,
        baseURL: String = "https://api.openai.com/v1",
        organizationID: String? = nil,
        timeout: TimeInterval = 60.0,
        maxRetries: Int = 3
    ) {
        self.apiKey = apiKey
        self.baseURL = baseURL
        self.organizationID = organizationID
        self.timeout = timeout
        self.maxRetries = maxRetries
    }

    /// Load configuration from APIKeys-Info.plist or UserDefaults
    static func loadFromEnvironment() -> OpenAIConfiguration? {
        // Try to load from APIKeys-Info.plist (preferred method)
        if let apiKey = APIKeysConfig.shared.openAIKey, !apiKey.isEmpty {
            return OpenAIConfiguration(apiKey: apiKey)
        }

        // Fallback to UserDefaults (for manual configuration)
        if let apiKey = UserDefaults.standard.string(forKey: "openai_api_key"), !apiKey.isEmpty {
            return OpenAIConfiguration(apiKey: apiKey)
        }

        return nil
    }

    /// Save API key to UserDefaults
    func save() {
        UserDefaults.standard.set(apiKey, forKey: "openai_api_key")
    }
}

// MARK: - OpenAI Models
extension OpenAIConfiguration {
    enum Model: String {
        // Chat models
        case gpt5 = "gpt-5"
        case gpt5Mini = "gpt-5-mini"
        case gpt5Nano = "gpt-5-nano"

        // Legacy models (if needed)
        case gpt4Turbo = "gpt-4-turbo-preview"
        case gpt4 = "gpt-4"
        case gpt35Turbo = "gpt-3.5-turbo"

        // Image models
        case dalle3 = "dall-e-3"

        var supportsVision: Bool {
            switch self {
            case .gpt5Mini, .gpt4Turbo, .gpt4:
                return true
            default:
                return false
            }
        }

        var maxTokens: Int {
            switch self {
            case .gpt5:
                return 128_000
            case .gpt5Mini:
                return 16_000
            case .gpt5Nano:
                return 4_000
            case .gpt4Turbo:
                return 128_000
            case .gpt4:
                return 8_192
            case .gpt35Turbo:
                return 4_096
            case .dalle3:
                return 0 // N/A for image generation
            }
        }
    }
}

// MARK: - Endpoints
extension OpenAIConfiguration {
    enum Endpoint {
        case chatCompletions
        case images
        case realtimeSession

        func path(baseURL: String) -> String {
            switch self {
            case .chatCompletions:
                return "\(baseURL)/chat/completions"
            case .images:
                return "\(baseURL)/images/generations"
            case .realtimeSession:
                return "wss://api.openai.com/v1/realtime"
            }
        }
    }
}
