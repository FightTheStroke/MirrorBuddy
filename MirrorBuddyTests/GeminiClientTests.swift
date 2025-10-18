import Foundation
@testable import MirrorBuddy
import Testing

@Suite("Gemini Client Tests")
@MainActor
struct GeminiClientTests {
    // MARK: - Configuration Tests

    @Test("Configuration initialization with default values")
    func testConfigurationDefaultInit() {
        let config = GeminiConfiguration(apiKey: "test-key")

        #expect(config.apiKey == "test-key")
        #expect(config.baseURL == "https://generativelanguage.googleapis.com/v1beta")
        #expect(config.timeout == 60.0)
        #expect(config.maxRetries == 3)
    }

    @Test("Configuration initialization with custom values")
    func testConfigurationCustomInit() {
        let config = GeminiConfiguration(
            apiKey: "custom-key",
            baseURL: "https://custom.api.com",
            timeout: 30.0,
            maxRetries: 5
        )

        #expect(config.apiKey == "custom-key")
        #expect(config.baseURL == "https://custom.api.com")
        #expect(config.timeout == 30.0)
        #expect(config.maxRetries == 5)
    }

    @Test("Configuration save and load from UserDefaults")
    func testConfigurationPersistence() {
        let config = GeminiConfiguration(apiKey: "persistent-key")
        config.save()

        let loaded = GeminiConfiguration.loadFromEnvironment()
        #expect(loaded?.apiKey == "persistent-key")

        // Cleanup
        UserDefaults.standard.removeObject(forKey: "gemini_api_key")
    }

    // MARK: - Model Tests

    @Test("Gemini 2.5 Pro model properties")
    func testGemini25ProModelProperties() {
        let model = GeminiConfiguration.Model.gemini25Pro

        #expect(model.rawValue == "gemini-2.5-pro-exp-0512")
        #expect(model.supportsVision == true)
        #expect(model.maxTokens == 8_192)
        #expect(model.supportsSystemInstructions == true)
    }

    @Test("Gemini 2.5 Flash model properties")
    func testGemini25FlashModelProperties() {
        let model = GeminiConfiguration.Model.gemini25Flash

        #expect(model.rawValue == "gemini-2.5-flash")
        #expect(model.supportsVision == true)
        #expect(model.maxTokens == 8_192)
        #expect(model.supportsSystemInstructions == true)
    }

    @Test("Gemini Pro model properties")
    func testGeminiProModelProperties() {
        let model = GeminiConfiguration.Model.geminiPro

        #expect(model.rawValue == "gemini-pro")
        #expect(model.supportsVision == false)
        #expect(model.maxTokens == 2_048)
        #expect(model.supportsSystemInstructions == false)
    }

    // MARK: - Content and Parts Tests

    @Test("GeminiContent text initialization")
    func testGeminiContentTextInit() {
        let content = GeminiContent.text("Hello, Gemini!", role: "user")

        #expect(content.role == "user")
        #expect(content.parts.count == 1)

        if case .text(let text) = content.parts[0] {
            #expect(text == "Hello, Gemini!")
        } else {
            Issue.record("Expected text part")
        }
    }

    @Test("GeminiPart text encoding and decoding")
    func testGeminiPartTextEncodingDecoding() throws {
        let part = GeminiPart.text("Test message")

        let encoder = JSONEncoder()
        let data = try encoder.encode(part)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(GeminiPart.self, from: data)

        if case .text(let text) = decoded {
            #expect(text == "Test message")
        } else {
            Issue.record("Expected text part after decoding")
        }
    }

    @Test("GeminiPart inline data encoding and decoding")
    func testGeminiPartInlineDataEncodingDecoding() throws {
        let imageData = Data([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG header
        let base64 = imageData.base64EncodedString()
        let inlineData = GeminiInlineData(mimeType: "image/jpeg", data: base64)
        let part = GeminiPart.inlineData(inlineData)

        let encoder = JSONEncoder()
        let data = try encoder.encode(part)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(GeminiPart.self, from: data)

        if case .inlineData(let decodedData) = decoded {
            #expect(decodedData.mimeType == "image/jpeg")
            #expect(decodedData.data == base64)
        } else {
            Issue.record("Expected inline data part after decoding")
        }
    }

    // MARK: - Generation Config Tests

    @Test("GeminiGenerationConfig default initialization")
    func testGenerationConfigDefaults() {
        let config = GeminiGenerationConfig()

        #expect(config.temperature == 0.7)
        #expect(config.topP == nil)
        #expect(config.topK == nil)
        #expect(config.maxOutputTokens == nil)
        #expect(config.stopSequences == nil)
    }

    @Test("GeminiGenerationConfig custom initialization")
    func testGenerationConfigCustom() {
        let config = GeminiGenerationConfig(
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2_048,
            stopSequences: ["END", "STOP"]
        )

        #expect(config.temperature == 0.9)
        #expect(config.topP == 0.95)
        #expect(config.topK == 40)
        #expect(config.maxOutputTokens == 2_048)
        #expect(config.stopSequences?.count == 2)
    }

    // MARK: - Safety Settings Tests

    @Test("GeminiSafetySetting initialization")
    func testSafetySettingInit() {
        let setting = GeminiSafetySetting(
            category: .harassment,
            threshold: .blockMediumAndAbove
        )

        #expect(setting.category == .harassment)
        #expect(setting.threshold == .blockMediumAndAbove)
    }

    @Test("GeminiHarmCategory raw values")
    func testHarmCategoryRawValues() {
        #expect(GeminiHarmCategory.harassment.rawValue == "HARM_CATEGORY_HARASSMENT")
        #expect(GeminiHarmCategory.hateSpeech.rawValue == "HARM_CATEGORY_HATE_SPEECH")
        #expect(GeminiHarmCategory.sexuallyExplicit.rawValue == "HARM_CATEGORY_SEXUALLY_EXPLICIT")
        #expect(GeminiHarmCategory.dangerousContent.rawValue == "HARM_CATEGORY_DANGEROUS_CONTENT")
    }

    @Test("GeminiHarmBlockThreshold raw values")
    func testHarmBlockThresholdRawValues() {
        #expect(GeminiHarmBlockThreshold.blockNone.rawValue == "BLOCK_NONE")
        #expect(GeminiHarmBlockThreshold.blockLowAndAbove.rawValue == "BLOCK_LOW_AND_ABOVE")
        #expect(GeminiHarmBlockThreshold.blockMediumAndAbove.rawValue == "BLOCK_MEDIUM_AND_ABOVE")
        #expect(GeminiHarmBlockThreshold.blockOnlyHigh.rawValue == "BLOCK_ONLY_HIGH")
    }

    // MARK: - Request Tests

    @Test("GeminiGenerateContentRequest initialization")
    func testGenerateContentRequestInit() {
        let content = GeminiContent.text("Hello")
        let config = GeminiGenerationConfig(temperature: 0.8)
        let safety = GeminiSafetySetting(category: .harassment, threshold: .blockMediumAndAbove)

        let request = GeminiGenerateContentRequest(
            contents: [content],
            systemInstruction: nil,
            generationConfig: config,
            safetySettings: [safety]
        )

        #expect(request.contents.count == 1)
        #expect(request.systemInstruction == nil)
        #expect(request.generationConfig?.temperature == 0.8)
        #expect(request.safetySettings?.count == 1)
    }

    @Test("GeminiGenerateContentRequest encoding")
    func testGeminiGenerateContentRequestEncoding() throws {
        let content = GeminiContent.text("Test")
        let request = GeminiGenerateContentRequest(contents: [content])

        let encoder = JSONEncoder()
        let data = try encoder.encode(request)

        #expect(!data.isEmpty)
    }

    // MARK: - Response Tests

    @Test("GeminiCandidate decoding from valid JSON")
    func testGeminiCandidateDecoding() throws {
        let json = """
        {
            "content": {
                "role": "model",
                "parts": [{"text": "Hello, world!"}]
            },
            "finishReason": "STOP",
            "safetyRatings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "probability": "NEGLIGIBLE"
                }
            ]
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let candidate = try decoder.decode(GeminiCandidate.self, from: data)

        #expect(candidate.content.role == "model")
        #expect(candidate.finishReason == "STOP")
        #expect(candidate.safetyRatings?.count == 1)
    }

    @Test("GeminiUsageMetadata decoding")
    func testGeminiUsageMetadataDecoding() throws {
        let json = """
        {
            "promptTokenCount": 10,
            "candidatesTokenCount": 20,
            "totalTokenCount": 30
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let usage = try decoder.decode(GeminiUsageMetadata.self, from: data)

        #expect(usage.promptTokenCount == 10)
        #expect(usage.candidatesTokenCount == 20)
        #expect(usage.totalTokenCount == 30)
    }

    // MARK: - Error Tests

    @Test("GeminiError descriptions")
    func testErrorDescriptions() {
        let configError = GeminiError.configurationError("Missing API key")
        #expect(configError.errorDescription?.contains("Missing API key") == true)

        let networkError = GeminiError.networkError(
            NSError(domain: "test", code: -1, userInfo: nil)
        )
        #expect(networkError.errorDescription?.contains("Network error") == true)

        let apiError = GeminiError.apiError(code: 401, message: "Unauthorized")
        #expect(apiError.errorDescription?.contains("401") == true)

        let rateLimitError = GeminiError.rateLimitExceeded(retryAfter: 60)
        #expect(rateLimitError.errorDescription?.contains("Rate limit") == true)

        let contentBlockedError = GeminiError.contentBlocked(reason: "Harassment")
        #expect(contentBlockedError.errorDescription?.contains("blocked") == true)
    }

    @Test("GeminiError recovery suggestions")
    func testErrorRecoverySuggestions() {
        let configError = GeminiError.configurationError("Test")
        #expect(configError.recoverySuggestion?.contains("API key") == true)

        let apiError401 = GeminiError.apiError(code: 401, message: "Unauthorized")
        #expect(apiError401.recoverySuggestion?.contains("API key") == true)

        let apiError429 = GeminiError.apiError(code: 429, message: "Too many requests")
        #expect(apiError429.recoverySuggestion?.contains("too many") == true)

        let contentError = GeminiError.contentBlocked(reason: "Test")
        #expect(contentError.recoverySuggestion?.contains("safety") == true)
    }

    // MARK: - Error Response Tests

    @Test("GeminiErrorResponse decoding")
    func testGeminiErrorResponseDecoding() throws {
        let json = """
        {
            "error": {
                "code": 400,
                "message": "Invalid request",
                "status": "INVALID_ARGUMENT"
            }
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let errorResponse = try decoder.decode(GeminiErrorResponse.self, from: data)

        #expect(errorResponse.error.code == 400)
        #expect(errorResponse.error.message == "Invalid request")
        #expect(errorResponse.error.status == "INVALID_ARGUMENT")
    }

    // MARK: - Endpoint Tests

    @Test("Endpoint path generation for generateContent")
    func testEndpointPathGenerateContent() {
        let endpoint = GeminiConfiguration.Endpoint.generateContent(
            model: .gemini25Pro
        )
        let path = endpoint.path(
            baseURL: "https://generativelanguage.googleapis.com/v1beta",
            apiKey: "test-key"
        )

        #expect(path.contains("models/gemini-2.5-pro-exp-0512:generateContent"))
        #expect(path.contains("key=test-key"))
    }

    @Test("Endpoint path generation for streamGenerateContent")
    func testEndpointPathStreamGenerateContent() {
        let endpoint = GeminiConfiguration.Endpoint.streamGenerateContent(
            model: .gemini25Flash
        )
        let path = endpoint.path(
            baseURL: "https://generativelanguage.googleapis.com/v1beta",
            apiKey: "test-key"
        )

        #expect(path.contains("models/gemini-2.5-flash:streamGenerateContent"))
        #expect(path.contains("key=test-key"))
    }

    // MARK: - Supporting Data Models Tests

    @Test("DriveAnalysisResult decoding")
    func testDriveAnalysisResultDecoding() throws {
        let json = """
        {
            "files": [
                {
                    "name": "test.pdf",
                    "purpose": "Study material",
                    "type": "pdf"
                }
            ],
            "insights": ["File contains math formulas"],
            "recommendations": ["Review before test"]
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let result = try decoder.decode(DriveAnalysisResult.self, from: data)

        #expect(result.files.count == 1)
        #expect(result.files[0].name == "test.pdf")
        #expect(result.insights.count == 1)
        #expect(result.recommendations.count == 1)
    }

    @Test("CalendarEventData decoding")
    func testCalendarEventDataDecoding() throws {
        let json = """
        {
            "title": "Math Class",
            "startTime": "2025-01-15T09:00:00Z",
            "endTime": "2025-01-15T10:00:00Z",
            "location": "Room 101",
            "description": "Algebra lesson",
            "attendees": ["mario@school.com"]
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let event = try decoder.decode(CalendarEventData.self, from: data)

        #expect(event.title == "Math Class")
        #expect(event.startTime == "2025-01-15T09:00:00Z")
        #expect(event.location == "Room 101")
        #expect(event.attendees?.count == 1)
    }

    @Test("AssignmentData decoding")
    func testAssignmentDataDecoding() throws {
        let json = """
        {
            "title": "Math Homework",
            "subject": "Mathematics",
            "dueDate": "2025-01-20T23:59:59Z",
            "description": "Complete exercises 1-10",
            "priority": "high",
            "type": "homework"
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let assignment = try decoder.decode(AssignmentData.self, from: data)

        #expect(assignment.title == "Math Homework")
        #expect(assignment.subject == "Mathematics")
        #expect(assignment.priority == "high")
        #expect(assignment.type == "homework")
    }
}
