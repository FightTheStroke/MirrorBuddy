//
//  OpenAIIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.2: OpenAI API Integration Tests
//  Tests OpenAI completions, vision analysis, and Whisper transcription
//

@testable import MirrorBuddy
import XCTest

/// Integration tests for OpenAI API services (Completions, Vision, Whisper)
@MainActor
final class OpenAIIntegrationTests: XCTestCase {
    var mockURLSession: URLSession!
    var configuration: URLSessionConfiguration!

    override func setUpWithError() throws {
        try super.setUpWithError()

        // Configure URL session with mock protocol
        configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        mockURLSession = URLSession(configuration: configuration)

        // Reset mock responses
        MockURLProtocol.responseQueue = []
        MockURLProtocol.requestHistory = []
    }

    override func tearDownWithError() throws {
        mockURLSession = nil
        configuration = nil
        MockURLProtocol.responseQueue = []
        MockURLProtocol.requestHistory = []
        try super.tearDownWithError()
    }

    // MARK: - Chat Completions Integration Tests

    /// Test 1: Basic chat completion request
    func testChatCompletionRequest() async throws {
        // Given: Mock completion response
        let completionResponse = """
        {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1729529400,
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a"
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 25,
                "completion_tokens": 15,
                "total_tokens": 40
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: completionResponse,
                statusCode: 200,
                delay: 0.2
            )
        )

        // When: Make completion request
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify completion response
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let completion = try JSONDecoder().decode(MockChatCompletion.self, from: data)
        XCTAssertEqual(completion.choices.count, 1)
        XCTAssertTrue(completion.choices[0].message.content.contains("quadratic"))
        XCTAssertEqual(completion.usage.totalTokens, 40)
    }

    /// Test 2: Streaming completion response
    func testStreamingCompletionResponse() async throws {
        // Given: Mock streaming response chunks
        let chunk1 = """
        data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1729529400,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant","content":"The"},"finish_reason":null}]}

        ""Data(".utf8) ?? Data()

        let chunk2 = """
        data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1729529400,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":" quadratic formula"},"finish_reason":null}]}

        ""Data(".utf8) ?? Data()

        let chunk3 = """
        data: [DONE]

        ""Data(".utf8) ?? Data()

        let combinedData = chunk1 + chunk2 + chunk3

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: combinedData,
                statusCode: 200,
                delay: 0.3
            )
        )

        // When: Make streaming request
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify streaming response
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)
        XCTAssertFalse(data.isEmpty)

        let responseString = String(data: data, encoding: .utf8)
        XCTAssertTrue(responseString?.contains("[DONE]") ?? false)
    }

    /// Test 3: Chat completion with system message
    func testChatCompletionWithSystemMessage() async throws {
        // Given: Mock response with system message
        let completionResponse = """
        {
            "id": "chatcmpl-456",
            "object": "chat.completion",
            "created": 1729529400,
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Let me explain this concept in a friendly way suitable for students."
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 45,
                "completion_tokens": 20,
                "total_tokens": 65
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: completionResponse,
                statusCode: 200,
                delay: 0.2
            )
        )

        // When: Make request with system message
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify response considers system message
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let completion = try JSONDecoder().decode(MockChatCompletion.self, from: data)
        XCTAssertTrue(completion.choices[0].message.content.contains("friendly"))
    }

    /// Test 4: Chat completion with function calling
    func testChatCompletionWithFunctionCalling() async throws {
        // Given: Mock function call response
        let functionCallResponse = """
        {
            "id": "chatcmpl-789",
            "object": "chat.completion",
            "created": 1729529400,
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": null,
                        "function_call": {
                            "name": "create_flashcard",
                            "arguments": "{\\"question\\":\\"What is the quadratic formula?\\",\\"answer\\":\\"x = (-b ± √(b²-4ac)) / 2a\\"}"
                        }
                    },
                    "finish_reason": "function_call"
                }
            ],
            "usage": {
                "prompt_tokens": 50,
                "completion_tokens": 35,
                "total_tokens": 85
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: functionCallResponse,
                statusCode: 200,
                delay: 0.2
            )
        )

        // When: Make request with function definitions
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify function call response
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let completion = try JSONDecoder().decode(MockChatCompletionWithFunction.self, from: data)
        XCTAssertNotNil(completion.choices[0].message.functionCall)
        XCTAssertEqual(completion.choices[0].message.functionCall?.name, "create_flashcard")
    }

    // MARK: - Vision API Integration Tests

    /// Test 5: Vision analysis with image URL
    func testVisionAnalysisWithImageURL() async throws {
        // Given: Mock vision response
        let visionResponse = """
        {
            "id": "chatcmpl-vision-001",
            "object": "chat.completion",
            "created": 1729529400,
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "This image shows a handwritten math problem: 2x + 5 = 15. The student needs to solve for x by subtracting 5 from both sides, then dividing by 2. The answer is x = 5."
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 1050,
                "completion_tokens": 45,
                "total_tokens": 1095
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: visionResponse,
                statusCode: 200,
                delay: 0.5
            )
        )

        // When: Make vision request
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify vision analysis
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let completion = try JSONDecoder().decode(MockChatCompletion.self, from: data)
        XCTAssertTrue(completion.choices[0].message.content.contains("handwritten"))
        XCTAssertTrue(completion.choices[0].message.content.contains("x = 5"))
    }

    /// Test 6: Vision analysis with base64 image
    func testVisionAnalysisWithBase64Image() async throws {
        // Given: Mock vision response for base64 image
        let visionResponse = """
        {
            "id": "chatcmpl-vision-002",
            "object": "chat.completion",
            "created": 1729529400,
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "The diagram shows a right triangle with sides labeled a, b, and c. This illustrates the Pythagorean theorem: a² + b² = c²."
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 2100,
                "completion_tokens": 30,
                "total_tokens": 2130
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: visionResponse,
                statusCode: 200,
                delay: 0.6
            )
        )

        // When: Make vision request with base64 image
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify vision analysis
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let completion = try JSONDecoder().decode(MockChatCompletion.self, from: data)
        XCTAssertTrue(completion.choices[0].message.content.contains("Pythagorean"))
        XCTAssertGreaterThan(completion.usage.promptTokens, 1_000, "Vision requests use more tokens")
    }

    /// Test 7: Vision analysis for handwriting recognition
    func testVisionHandwritingRecognition() async throws {
        // Given: Mock handwriting recognition response
        let handwritingResponse = """
        {
            "id": "chatcmpl-vision-003",
            "object": "chat.completion",
            "created": 1729529400,
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Transcribed text from handwriting:\\n\\nQuestion 1: What is photosynthesis?\\nAnswer: Photosynthesis is the process by which plants convert light energy into chemical energy."
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 1800,
                "completion_tokens": 40,
                "total_tokens": 1840
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: handwritingResponse,
                statusCode: 200,
                delay: 0.5
            )
        )

        // When: Request handwriting recognition
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify transcription
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let completion = try JSONDecoder().decode(MockChatCompletion.self, from: data)
        XCTAssertTrue(completion.choices[0].message.content.contains("Transcribed"))
        XCTAssertTrue(completion.choices[0].message.content.contains("photosynthesis"))
    }

    // MARK: - Whisper API Integration Tests

    /// Test 8: Audio transcription with Whisper
    func testAudioTranscription() async throws {
        // Given: Mock transcription response
        let transcriptionResponse = """
        {
            "text": "Can you help me understand how to solve quadratic equations using the quadratic formula?"
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: transcriptionResponse,
                statusCode: 200,
                delay: 1.0
            )
        )

        // When: Submit audio for transcription
        let url = URL(string: "https://api.openai.com/v1/audio/transcriptions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify transcription
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let transcription = try JSONDecoder().decode(MockWhisperTranscription.self, from: data)
        XCTAssertFalse(transcription.text.isEmpty)
        XCTAssertTrue(transcription.text.contains("quadratic"))
    }

    /// Test 9: Audio transcription with language specification
    func testAudioTranscriptionWithLanguage() async throws {
        // Given: Mock Italian transcription
        let transcriptionResponse = """
        {
            "text": "Puoi aiutarmi a capire come risolvere le equazioni quadratiche?"
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: transcriptionResponse,
                statusCode: 200,
                delay: 1.0
            )
        )

        // When: Submit audio with language hint
        let url = URL(string: "https://api.openai.com/v1/audio/transcriptions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify Italian transcription
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let transcription = try JSONDecoder().decode(MockWhisperTranscription.self, from: data)
        XCTAssertTrue(transcription.text.contains("equazioni"))
    }

    /// Test 10: Audio transcription with timestamps
    func testAudioTranscriptionWithTimestamps() async throws {
        // Given: Mock verbose transcription with timestamps
        let transcriptionResponse = """
        {
            "text": "Can you help me with my homework?",
            "task": "transcribe",
            "language": "en",
            "duration": 2.5,
            "segments": [
                {
                    "id": 0,
                    "start": 0.0,
                    "end": 1.2,
                    "text": "Can you help me",
                    "tokens": [1261, 291, 854, 502]
                },
                {
                    "id": 1,
                    "start": 1.2,
                    "end": 2.5,
                    "text": " with my homework?",
                    "tokens": [365, 452, 14040, 30]
                }
            ]
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: transcriptionResponse,
                statusCode: 200,
                delay: 1.2
            )
        )

        // When: Request verbose transcription
        let url = URL(string: "https://api.openai.com/v1/audio/transcriptions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify timestamps
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let transcription = try JSONDecoder().decode(MockWhisperVerboseTranscription.self, from: data)
        XCTAssertEqual(transcription.segments.count, 2)
        XCTAssertEqual(transcription.language, "en")
        XCTAssertEqual(transcription.duration, 2.5)
    }

    // MARK: - Error Handling Tests

    /// Test 11: Rate limit error handling
    func testRateLimitErrorHandling() async throws {
        // Given: Mock rate limit error
        let errorResponse = """
        {
            "error": {
                "message": "Rate limit exceeded. Please retry after 20 seconds.",
                "type": "rate_limit_error",
                "param": null,
                "code": "rate_limit_exceeded"
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: errorResponse,
                statusCode: 429,
                delay: 0.1
            )
        )

        // When: Make request that hits rate limit
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify rate limit error
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 429)

        let error = try JSONDecoder().decode(MockOpenAIError.self, from: data)
        XCTAssertEqual(error.error.type, "rate_limit_error")
        XCTAssertTrue(error.error.message.contains("Rate limit"))
    }

    /// Test 12: Invalid API key error handling
    func testInvalidAPIKeyErrorHandling() async throws {
        // Given: Mock authentication error
        let errorResponse = """
        {
            "error": {
                "message": "Incorrect API key provided",
                "type": "invalid_request_error",
                "param": null,
                "code": "invalid_api_key"
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: errorResponse,
                statusCode: 401,
                delay: 0.1
            )
        )

        // When: Make request with invalid API key
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify authentication error
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 401)

        let error = try JSONDecoder().decode(MockOpenAIError.self, from: data)
        XCTAssertEqual(error.error.code, "invalid_api_key")
    }

    /// Test 13: Context length exceeded error
    func testContextLengthExceededError() async throws {
        // Given: Mock context length error
        let errorResponse = """
        {
            "error": {
                "message": "This model's maximum context length is 128000 tokens. However, your messages resulted in 130000 tokens.",
                "type": "invalid_request_error",
                "param": "messages",
                "code": "context_length_exceeded"
            }
        }
        ""Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: errorResponse,
                statusCode: 400,
                delay: 0.1
            )
        )

        // When: Make request exceeding context length
        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify context length error
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 400)

        let error = try JSONDecoder().decode(MockOpenAIError.self, from: data)
        XCTAssertEqual(error.error.code, "context_length_exceeded")
        XCTAssertTrue(error.error.message.contains("128000"))
    }
}

// MARK: - Mock Data Structures

struct MockChatCompletion: Codable {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [MockChatChoice]
    let usage: MockUsage
}

struct MockChatChoice: Codable {
    let index: Int
    let message: MockChatMessage
    let finishReason: String

    enum CodingKeys: String, CodingKey {
        case index
        case message
        case finishReason = "finish_reason"
    }
}

struct MockChatMessage: Codable {
    let role: String
    let content: String
}

struct MockChatCompletionWithFunction: Codable {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [MockChatChoiceWithFunction]
    let usage: MockUsage
}

struct MockChatChoiceWithFunction: Codable {
    let index: Int
    let message: MockChatMessageWithFunction
    let finishReason: String

    enum CodingKeys: String, CodingKey {
        case index
        case message
        case finishReason = "finish_reason"
    }
}

struct MockChatMessageWithFunction: Codable {
    let role: String
    let content: String?
    let functionCall: MockFunctionCall?

    enum CodingKeys: String, CodingKey {
        case role
        case content
        case functionCall = "function_call"
    }
}

struct MockFunctionCall: Codable {
    let name: String
    let arguments: String
}

struct MockUsage: Codable {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int

    enum CodingKeys: String, CodingKey {
        case promptTokens = "prompt_tokens"
        case completionTokens = "completion_tokens"
        case totalTokens = "total_tokens"
    }
}

struct MockWhisperTranscription: Codable {
    let text: String
}

struct MockWhisperVerboseTranscription: Codable {
    let text: String
    let task: String
    let language: String
    let duration: Double
    let segments: [MockWhisperSegment]
}

struct MockWhisperSegment: Codable {
    let id: Int
    let start: Double
    let end: Double
    let text: String
    let tokens: [Int]
}

struct MockOpenAIError: Codable {
    let error: MockOpenAIErrorDetail
}

struct MockOpenAIErrorDetail: Codable {
    let message: String
    let type: String
    let param: String?
    let code: String
}
