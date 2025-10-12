import Foundation
@testable import MirrorBuddy
import Testing

@Suite("Keychain Manager Tests")
@MainActor
struct KeychainManagerTests {
    let keychain = KeychainManager.shared

    init() async throws {
        // Clean up before tests
        try? await keychain.deleteAll()
    }

    // MARK: - Basic String Storage Tests

    @Test("Save and retrieve string")
    func testSaveAndRetrieveString() async throws {
        let testKey = KeychainKey.openAIAPIKey
        let testValue = "test-api-key-12345"

        try await keychain.save(testValue, for: testKey)
        let retrieved = try await keychain.getString(for: testKey)

        #expect(retrieved == testValue)

        try await keychain.delete(testKey)
    }

    @Test("Retrieve non-existent key returns nil")
    func testRetrieveNonExistentKey() async throws {
        let testKey = KeychainKey.openAIAPIKey
        try? await keychain.delete(testKey)

        let retrieved = try await keychain.getString(for: testKey)
        #expect(retrieved == nil)
    }

    @Test("Update existing value")
    func testUpdateExistingValue() async throws {
        let testKey = KeychainKey.openAIAPIKey
        let value1 = "first-value"
        let value2 = "second-value"

        try await keychain.save(value1, for: testKey)
        try await keychain.save(value2, for: testKey)

        let retrieved = try await keychain.getString(for: testKey)
        #expect(retrieved == value2)

        try await keychain.delete(testKey)
    }

    @Test("Delete key")
    func testDeleteKey() async throws {
        let testKey = KeychainKey.geminiAPIKey
        let testValue = "test-value"

        try await keychain.save(testValue, for: testKey)
        try await keychain.delete(testKey)

        let retrieved = try await keychain.getString(for: testKey)
        #expect(retrieved == nil)
    }

    @Test("Key exists check")
    func testKeyExists() async throws {
        let testKey = KeychainKey.openAIAPIKey
        try? await keychain.delete(testKey)

        var exists = await keychain.exists(testKey)
        #expect(exists == false)

        try await keychain.save("test", for: testKey)
        exists = await keychain.exists(testKey)
        #expect(exists == true)

        try await keychain.delete(testKey)
    }

    // MARK: - OAuth Tokens Tests

    @Test("Save and retrieve OAuth tokens")
    func testOAuthTokens() async throws {
        let service = OAuthService.google
        let tokens = OAuthTokens(
            accessToken: "access-123",
            refreshToken: "refresh-456",
            expiresAt: Date().addingTimeInterval(3600),
            tokenType: "Bearer",
            scope: "email profile"
        )

        try await keychain.saveOAuthTokens(tokens, for: service)
        let retrieved = try await keychain.getOAuthTokens(for: service)

        #expect(retrieved?.accessToken == tokens.accessToken)
        #expect(retrieved?.refreshToken == tokens.refreshToken)
        #expect(retrieved?.tokenType == tokens.tokenType)
        #expect(retrieved?.scope == tokens.scope)

        try await keychain.deleteOAuthTokens(for: service)
    }

    @Test("OAuth token expiry check")
    func testOAuthTokenExpiry() {
        let expiredTokens = OAuthTokens(
            accessToken: "access",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(-100),
            tokenType: "Bearer",
            scope: nil
        )

        #expect(expiredTokens.isExpired == true)
        #expect(expiredTokens.needsRefresh == true)

        let validTokens = OAuthTokens(
            accessToken: "access",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(3600),
            tokenType: "Bearer",
            scope: nil
        )

        #expect(validTokens.isExpired == false)
        #expect(validTokens.needsRefresh == false)

        let soonToExpireTokens = OAuthTokens(
            accessToken: "access",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(200),
            tokenType: "Bearer",
            scope: nil
        )

        #expect(soonToExpireTokens.isExpired == false)
        #expect(soonToExpireTokens.needsRefresh == true)
    }

    // MARK: - Convenience Methods Tests

    @Test("Save and retrieve OpenAI API key")
    func testOpenAIAPIKey() async throws {
        let apiKey = "sk-test123456789"

        try await keychain.saveOpenAIAPIKey(apiKey)
        let retrieved = try await keychain.getOpenAIAPIKey()

        #expect(retrieved == apiKey)

        try await keychain.delete(.openAIAPIKey)
    }

    @Test("Save and retrieve Gemini API key")
    func testGeminiAPIKey() async throws {
        let apiKey = "gemini-test-key"

        try await keychain.saveGeminiAPIKey(apiKey)
        let retrieved = try await keychain.getGeminiAPIKey()

        #expect(retrieved == apiKey)

        try await keychain.delete(.geminiAPIKey)
    }

    @Test("Save and retrieve Google credentials")
    func testGoogleCredentials() async throws {
        let clientID = "test-client-id"
        let clientSecret = "test-client-secret"

        try await keychain.saveGoogleClientCredentials(
            clientID: clientID,
            clientSecret: clientSecret
        )

        let (retrievedID, retrievedSecret) = try await keychain.getGoogleClientCredentials()

        #expect(retrievedID == clientID)
        #expect(retrievedSecret == clientSecret)

        try await keychain.delete(.googleClientID)
        try await keychain.delete(.googleClientSecret)
    }

    // MARK: - Multiple Keys Tests

    @Test("Store multiple different keys")
    func testMultipleKeys() async throws {
        let openAIKey = "openai-key"
        let geminiKey = "gemini-key"

        try await keychain.saveOpenAIAPIKey(openAIKey)
        try await keychain.saveGeminiAPIKey(geminiKey)

        let retrievedOpenAI = try await keychain.getOpenAIAPIKey()
        let retrievedGemini = try await keychain.getGeminiAPIKey()

        #expect(retrievedOpenAI == openAIKey)
        #expect(retrievedGemini == geminiKey)

        try await keychain.delete(.openAIAPIKey)
        try await keychain.delete(.geminiAPIKey)
    }

    // MARK: - Error Handling Tests

    @Test("Delete non-existent key does not throw")
    func testDeleteNonExistentKey() async throws {
        let testKey = KeychainKey.openAIAPIKey
        try? await keychain.delete(testKey)

        // Should not throw
        try await keychain.delete(testKey)
    }

    // MARK: - Cleanup Tests

    @Test("Delete all clears keychain")
    func testDeleteAll() async throws {
        // Save multiple items
        try await keychain.saveOpenAIAPIKey("test1")
        try await keychain.saveGeminiAPIKey("test2")

        // Delete all
        try await keychain.deleteAll()

        // Verify all are gone
        let openAI = try await keychain.getOpenAIAPIKey()
        let gemini = try await keychain.getGeminiAPIKey()

        #expect(openAI == nil)
        #expect(gemini == nil)
    }
}
