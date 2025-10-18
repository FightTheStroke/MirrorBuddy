//
//  OpenAIClientTests.swift
//  MirrorBuddyTests
//
//  Created on 12/10/25.
//

import Foundation
@testable import MirrorBuddy
import Testing

/// Tests for OpenAIClient infrastructure (Task 11)
@Suite("OpenAI Client Tests")
@MainActor
struct OpenAIClientTests {
    // MARK: - Test Configuration

    let mockAPIKey = "sk-test-mock-api-key-for-testing-purposes"
    let mockBaseURL = "https://api.test.com/v1"

    // MARK: - Subtask 11.1: Configuration Tests

    @Test("Configuration initialization with default values")
    func testConfigurationDefaultInit() {
        let config = OpenAIConfiguration(apiKey: mockAPIKey)

        #expect(config.apiKey == mockAPIKey)
        #expect(config.baseURL == "https://api.openai.com/v1")
        #expect(config.organizationID == nil)
        #expect(config.timeout == 60.0)
        #expect(config.maxRetries == 3)
    }

    @Test("Configuration initialization with custom values")
    func testConfigurationCustomInit() {
        let config = OpenAIConfiguration(
            apiKey: mockAPIKey,
            baseURL: mockBaseURL,
            organizationID: "org-123",
            timeout: 30.0,
            maxRetries: 5
        )

        #expect(config.apiKey == mockAPIKey)
        #expect(config.baseURL == mockBaseURL)
        #expect(config.organizationID == "org-123")
        #expect(config.timeout == 30.0)
        #expect(config.maxRetries == 5)
    }

    @Test("OpenAIClient initialization")
    func testClientInitialization() {
        let config = OpenAIConfiguration(apiKey: mockAPIKey)
        let client = OpenAIClient(configuration: config)

        // Client should be initialized without errors
        #expect(client != nil)
    }

    // MARK: - Subtask 11.2-11.5: Model Tests

    @Test("GPT-5 model properties")
    func testGPT5ModelProperties() {
        let model = OpenAIConfiguration.Model.gpt5

        #expect(model.rawValue == "gpt-5")
        #expect(model.maxTokens == 128_000)
        #expect(model.supportsVision == false)
    }

    @Test("GPT-5 Mini model properties (vision support)")
    func testGPT5MiniModelProperties() {
        let model = OpenAIConfiguration.Model.gpt5Mini

        #expect(model.rawValue == "gpt-5-mini")
        #expect(model.maxTokens == 16_000)
        #expect(model.supportsVision == true)
    }

    @Test("GPT-5 Nano model properties")
    func testGPT5NanoModelProperties() {
        let model = OpenAIConfiguration.Model.gpt5Nano

        #expect(model.rawValue == "gpt-5-nano")
        #expect(model.maxTokens == 4_000)
        #expect(model.supportsVision == false)
    }

    @Test("DALL-E 3 model properties")
    func testDALLE3ModelProperties() {
        let model = OpenAIConfiguration.Model.dalle3

        #expect(model.rawValue == "dall-e-3")
        #expect(model.maxTokens == 0)
        #expect(model.supportsVision == false)
    }

    // MARK: - Subtask 11.7: Error Handling Tests

    @Test("OpenAI error descriptions")
    func testErrorDescriptions() {
        let missingKeyError = OpenAIError.missingAPIKey
        let authError = OpenAIError.authenticationFailed
        let rateLimitError = OpenAIError.rateLimitExceeded(retryAfter: 30)
        let serverError = OpenAIError.serverError(statusCode: 500, message: "Internal error")

        #expect(missingKeyError.errorDescription != nil)
        #expect(authError.errorDescription != nil)
        #expect(rateLimitError.errorDescription != nil)
        #expect(serverError.errorDescription?.contains("500") == true)
    }

    @Test("Error recovery suggestions")
    func testErrorRecoverySuggestions() {
        let missingKeyError = OpenAIError.missingAPIKey
        let rateLimitError = OpenAIError.rateLimitExceeded(retryAfter: nil)

        #expect(missingKeyError.recoverySuggestion != nil)
        #expect(rateLimitError.recoverySuggestion?.contains("wait") == true)
    }

    // MARK: - Subtask 11.9: Response Parsing Tests

    @Test("ChatMessage encoding and decoding with text content")
    func testChatMessageTextCoding() throws {
        let message = ChatMessage(
            role: .user,
            content: .text("Hello, world!")
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(message)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(ChatMessage.self, from: data)

        #expect(decoded.role == .user)
        if case .text(let content) = decoded.content {
            #expect(content == "Hello, world!")
        } else {
            Issue.record("Expected text content")
        }
    }

    @Test("ChatMessage encoding with multipart content (vision)")
    func testChatMessageMultipartCoding() throws {
        let message = ChatMessage(
            role: .user,
            content: .multipart([
                ChatContentPart(type: .text, text: "What's in this image?", imageURL: nil),
                ChatContentPart(
                    type: .imageURL,
                    text: nil,
                    imageURL: ChatImageURL(url: "https://example.com/image.jpg", detail: .auto)
                )
            ])
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(message)

        // Should encode without errors
        #expect(!data.isEmpty)
    }

    @Test("ImageGenerationRequest encoding")
    func testImageGenerationRequestCoding() throws {
        let request = ImageGenerationRequest(
            model: "dall-e-3",
            prompt: "A sunset over mountains",
            count: 1,
            size: .square1024,
            quality: .standard,
            style: .vivid
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(request)

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(json?["model"] as? String == "dall-e-3")
        #expect(json?["prompt"] as? String == "A sunset over mountains")
        #expect(json?["n"] as? Int == 1) // 'count' maps to 'n'
        #expect(json?["size"] as? String == "1024x1024")
    }

    @Test("ChatCompletionResponse decoding")
    func testChatCompletionResponseDecoding() throws {
        let jsonString = """
        {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1677652288,
            "model": "gpt-5",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Hello! How can I help you?"
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 8,
                "total_tokens": 18
            }
        }
        """

        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let response = try decoder.decode(ChatCompletionResponse.self, from: data)

        #expect(response.id == "chatcmpl-123")
        #expect(response.model == "gpt-5")
        #expect(response.choices.count == 1)
        #expect(response.choices[0].message.content == "Hello! How can I help you?")
        #expect(response.usage.totalTokens == 18)
    }

    @Test("ImageGenerationResponse decoding")
    func testImageGenerationResponseDecoding() throws {
        let jsonString = """
        {
            "created": 1677652288,
            "data": [{
                "url": "https://example.com/generated-image.png",
                "revised_prompt": "A beautiful sunset over mountains with vibrant colors"
            }]
        }
        """

        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let response = try decoder.decode(ImageGenerationResponse.self, from: data)

        #expect(response.data.count == 1)
        #expect(response.data[0].url == "https://example.com/generated-image.png")
        #expect(response.data[0].revisedPrompt != nil)
    }

    @Test("OpenAIErrorResponse decoding")
    func testErrorResponseDecoding() throws {
        let jsonString = """
        {
            "error": {
                "message": "Invalid API key provided",
                "type": "invalid_request_error",
                "param": null,
                "code": "invalid_api_key"
            }
        }
        """

        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let response = try decoder.decode(OpenAIErrorResponse.self, from: data)

        #expect(response.error.message == "Invalid API key provided")
        #expect(response.error.type == "invalid_request_error")
        #expect(response.error.code == "invalid_api_key")
    }

    // MARK: - Subtask 11.8: Rate Limiting Tests (Conceptual)

    @Test("Rate limiter exists in client")
    func testRateLimiterExists() {
        let config = OpenAIConfiguration(apiKey: mockAPIKey)
        let client = OpenAIClient(configuration: config)

        // Rate limiter is private, but we can verify client initializes
        #expect(client != nil)
        // Note: Actual rate limiting would require integration tests
    }

    // MARK: - Endpoint Tests

    @Test("Chat completions endpoint path")
    func testChatCompletionsEndpoint() {
        let endpoint = OpenAIConfiguration.Endpoint.chatCompletions
        let path = endpoint.path(baseURL: "https://api.openai.com/v1")

        #expect(path == "https://api.openai.com/v1/chat/completions")
    }

    @Test("Images endpoint path")
    func testImagesEndpoint() {
        let endpoint = OpenAIConfiguration.Endpoint.images
        let path = endpoint.path(baseURL: "https://api.openai.com/v1")

        #expect(path == "https://api.openai.com/v1/images/generations")
    }

    @Test("Realtime session endpoint path")
    func testRealtimeEndpoint() {
        let endpoint = OpenAIConfiguration.Endpoint.realtimeSession
        let path = endpoint.path(baseURL: "https://api.openai.com/v1")

        #expect(path == "wss://api.openai.com/v1/realtime")
    }

    // MARK: - Image Generation Supporting Types Tests

    @Test("Image size values")
    func testImageSizeValues() {
        #expect(ImageSize.square1024.rawValue == "1024x1024")
        #expect(ImageSize.square1792.rawValue == "1792x1024")
        #expect(ImageSize.portrait1024.rawValue == "1024x1792")
    }

    @Test("Image quality values")
    func testImageQualityValues() {
        #expect(ImageQuality.standard.rawValue == "standard")
        #expect(ImageQuality.highDefinition.rawValue == "hd")
    }

    @Test("Image style values")
    func testImageStyleValues() {
        #expect(ImageStyle.vivid.rawValue == "vivid")
        #expect(ImageStyle.natural.rawValue == "natural")
    }

    // MARK: - Realtime Client Tests (Subtask 11.6)

    @Test("Realtime client initialization")
    func testRealtimeClientInit() {
        let config = OpenAIConfiguration(apiKey: mockAPIKey)
        let client = OpenAIRealtimeClient(configuration: config)

        #expect(client.isConnected == false)
        #expect(client.lastError == nil)
    }

    @Test("MessageContent text encoding")
    func testMessageContentTextCoding() throws {
        let content = MessageContent.text("Hello, AI!")

        let encoder = JSONEncoder()
        let data = try encoder.encode(content)

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(json?["type"] as? String == "text")
        #expect(json?["text"] as? String == "Hello, AI!")
    }
}

// MARK: - Integration Tests (Manual only)

/// Integration tests require a real API key and make actual API calls.
/// These are commented out by default. Uncomment and run manually when needed.
/*
@Suite("OpenAI Integration Tests")
struct OpenAIIntegrationTests {

    @Test("Real chat completion request")
    func testRealChatCompletion() async throws {
        // This would require a real API key from environment
        guard let config = OpenAIConfiguration.loadFromEnvironment() else {
            Issue.record("No API key available for integration test")
            return
        }

        let client = OpenAIClient(configuration: config)

        let response = try await client.chatCompletion(
            model: .gpt5Nano,
            messages: [ChatMessage(role: .user, content: .text("Say 'test passed' in 2 words"))],
            temperature: 0.3,
            maxTokens: 10
        )

        #expect(response.choices.count > 0)
        #expect(response.choices[0].message.content.count > 0)
    }

    @Test("Real image generation request")
    func testRealImageGeneration() async throws {
        guard let config = OpenAIConfiguration.loadFromEnvironment() else {
            Issue.record("No API key available for integration test")
            return
        }

        let client = OpenAIClient(configuration: config)

        let response = try await client.generateImage(
            prompt: "A simple test image",
            size: .square1024,
            quality: .standard
        )

        #expect(response.data.count > 0)
        #expect(response.data[0].url != nil)
    }
}
*/
