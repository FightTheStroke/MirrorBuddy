import Foundation
import Security
import Combine

/// Secure storage manager for API keys and OAuth tokens using iOS Keychain
@MainActor
final class KeychainManager {
    /// Shared singleton instance
    static let shared = KeychainManager()

    /// Service identifier for keychain items
    private let serviceName: String

    /// Access group for keychain sharing (optional)
    private let accessGroup: String?

    private init(serviceName: String = Bundle.main.bundleIdentifier ?? "com.mirrorbuddy.app",
                 accessGroup: String? = nil) {
        self.serviceName = serviceName
        self.accessGroup = accessGroup
    }

    // MARK: - Public API

    /// Save a string value to the keychain
    func save(_ value: String, for key: KeychainKey) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed(key: key.rawValue)
        }
        try save(data, for: key)
    }

    /// Save data to the keychain
    func save(_ data: Data, for key: KeychainKey) throws {
        // Delete existing item if present
        try? delete(key)

        var query = buildBaseQuery(for: key)
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(key: key.rawValue, status: status)
        }
    }

    /// Retrieve a string value from the keychain
    func getString(for key: KeychainKey) throws -> String? {
        guard let data = try getData(for: key) else {
            return nil
        }

        guard let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.decodingFailed(key: key.rawValue)
        }

        return string
    }

    /// Retrieve data from the keychain
    func getData(for key: KeychainKey) throws -> Data? {
        var query = buildBaseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess else {
            throw KeychainError.retrievalFailed(key: key.rawValue, status: status)
        }

        guard let data = result as? Data else {
            throw KeychainError.unexpectedData(key: key.rawValue)
        }

        return data
    }

    /// Delete a keychain item
    func delete(_ key: KeychainKey) throws {
        let query = buildBaseQuery(for: key)
        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deletionFailed(key: key.rawValue, status: status)
        }
    }

    /// Delete all keychain items for this service
    func deleteAll() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteAllFailed(status: status)
        }
    }

    /// Check if a key exists in the keychain
    func exists(_ key: KeychainKey) -> Bool {
        var query = buildBaseQuery(for: key)
        query[kSecReturnData as String] = false

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    // MARK: - OAuth Token Storage

    /// Save OAuth tokens securely
    func saveOAuthTokens(_ tokens: OAuthTokens, for service: OAuthService) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        let data = try encoder.encode(tokens)
        try save(data, for: .oauthToken(service))
    }

    /// Retrieve OAuth tokens
    func getOAuthTokens(for service: OAuthService) throws -> OAuthTokens? {
        guard let data = try getData(for: .oauthToken(service)) else {
            return nil
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(OAuthTokens.self, from: data)
    }

    /// Delete OAuth tokens
    func deleteOAuthTokens(for service: OAuthService) throws {
        try delete(.oauthToken(service))
    }

    // MARK: - Private Helpers

    private func buildBaseQuery(for key: KeychainKey) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue
        ]

        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }

        return query
    }
}

// MARK: - Keychain Keys

/// Enumeration of all keychain keys used in the app
enum KeychainKey {
    case openAIAPIKey
    case geminiAPIKey
    case googleClientID
    case googleClientSecret
    case oauthToken(OAuthService)

    var rawValue: String {
        switch self {
        case .openAIAPIKey:
            return "com.mirrorbuddy.openai.apikey"
        case .geminiAPIKey:
            return "com.mirrorbuddy.gemini.apikey"
        case .googleClientID:
            return "com.mirrorbuddy.google.clientid"
        case .googleClientSecret:
            return "com.mirrorbuddy.google.clientsecret"
        case let .oauthToken(service):
            return "com.mirrorbuddy.oauth.token.\(service.rawValue)"
        }
    }
}

// MARK: - OAuth Service

/// Enumeration of OAuth services
enum OAuthService: String, Codable {
    case google
    case googleDrive = "google.drive"
    case googleCalendar = "google.calendar"
    case googleGmail = "google.gmail"
}

// MARK: - OAuth Tokens

/// OAuth token storage structure
struct OAuthTokens: Codable, Sendable {
    let accessToken: String
    let refreshToken: String?
    let expiresAt: Date?
    let tokenType: String
    let scope: String?

    /// Check if the access token is expired
    var isExpired: Bool {
        guard let expiresAt = expiresAt else {
            return false // No expiry means it doesn't expire
        }
        return Date() >= expiresAt
    }

    /// Check if the token needs refresh (expires within 5 minutes)
    var needsRefresh: Bool {
        guard let expiresAt = expiresAt else {
            return false
        }
        let fiveMinutesFromNow = Date().addingTimeInterval(300)
        return fiveMinutesFromNow >= expiresAt
    }
}

// MARK: - Keychain Errors

/// Errors that can occur during keychain operations
enum KeychainError: LocalizedError {
    case saveFailed(key: String, status: OSStatus)
    case retrievalFailed(key: String, status: OSStatus)
    case deletionFailed(key: String, status: OSStatus)
    case deleteAllFailed(status: OSStatus)
    case encodingFailed(key: String)
    case decodingFailed(key: String)
    case unexpectedData(key: String)

    var errorDescription: String? {
        switch self {
        case let .saveFailed(key, status):
            return "Failed to save keychain item '\(key)'. Status: \(status)"
        case let .retrievalFailed(key, status):
            return "Failed to retrieve keychain item '\(key)'. Status: \(status)"
        case let .deletionFailed(key, status):
            return "Failed to delete keychain item '\(key)'. Status: \(status)"
        case let .deleteAllFailed(status):
            return "Failed to delete all keychain items. Status: \(status)"
        case let .encodingFailed(key):
            return "Failed to encode data for keychain item '\(key)'"
        case let .decodingFailed(key):
            return "Failed to decode data from keychain item '\(key)'"
        case let .unexpectedData(key):
            return "Unexpected data format for keychain item '\(key)'"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .saveFailed, .deletionFailed, .deleteAllFailed:
            return "Check that the app has proper keychain access permissions."
        case .retrievalFailed:
            return "The item may not exist in the keychain. Try saving it first."
        case .encodingFailed, .decodingFailed:
            return "Ensure the data format is correct."
        case .unexpectedData:
            return "The stored data may be corrupted. Try deleting and re-saving."
        }
    }

    /// Get the OSStatus code for debugging
    var statusCode: OSStatus? {
        switch self {
        case let .saveFailed(_, status),
             let .retrievalFailed(_, status),
             let .deletionFailed(_, status),
             let .deleteAllFailed(status):
            return status
        case .encodingFailed, .decodingFailed, .unexpectedData:
            return nil
        }
    }
}

// MARK: - Convenience Extensions

extension KeychainManager {
    /// Save OpenAI API key
    func saveOpenAIAPIKey(_ key: String) throws {
        try save(key, for: .openAIAPIKey)
    }

    /// Get OpenAI API key
    func getOpenAIAPIKey() throws -> String? {
        try getString(for: .openAIAPIKey)
    }

    /// Save Gemini API key
    func saveGeminiAPIKey(_ key: String) throws {
        try save(key, for: .geminiAPIKey)
    }

    /// Get Gemini API key
    func getGeminiAPIKey() throws -> String? {
        try getString(for: .geminiAPIKey)
    }

    /// Save Google OAuth client credentials
    func saveGoogleClientCredentials(clientID: String, clientSecret: String) throws {
        try save(clientID, for: .googleClientID)
        try save(clientSecret, for: .googleClientSecret)
    }

    /// Get Google OAuth client credentials
    func getGoogleClientCredentials() throws -> (clientID: String?, clientSecret: String?) {
        let clientID = try getString(for: .googleClientID)
        let clientSecret = try getString(for: .googleClientSecret)
        return (clientID, clientSecret)
    }
}
