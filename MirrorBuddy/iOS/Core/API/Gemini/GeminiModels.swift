import Foundation

// MARK: - Namespace
enum GeminiModels {}

// MARK: - Generate Content Request
struct GeminiGenerateContentRequest: Codable {
    let contents: [GeminiContent]
    let systemInstruction: GeminiContent?
    let generationConfig: GeminiGenerationConfig?
    let safetySettings: [GeminiSafetySetting]?

    init(
        contents: [GeminiContent],
        systemInstruction: GeminiContent? = nil,
        generationConfig: GeminiGenerationConfig? = nil,
        safetySettings: [GeminiSafetySetting]? = nil
    ) {
        self.contents = contents
        self.systemInstruction = systemInstruction
        self.generationConfig = generationConfig
        self.safetySettings = safetySettings
    }
}

// MARK: - Content
struct GeminiContent: Codable {
    let role: String?
    let parts: [GeminiPart]

    init(role: String? = nil, parts: [GeminiPart]) {
        self.role = role
        self.parts = parts
    }

    static func text(_ text: String, role: String = "user") -> GeminiContent {
        GeminiContent(role: role, parts: [.text(text)])
    }
}

// MARK: - Part
enum GeminiPart: Codable {
    case text(String)
    case inlineData(GeminiInlineData)
    case fileData(GeminiFileData)

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .text(let string):
            try container.encode(["text": string])
        case .inlineData(let data):
            try container.encode(["inlineData": data])
        case .fileData(let data):
            try container.encode(["fileData": data])
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let dict = try container.decode([String: AnyCodable].self)

        if let text = dict["text"]?.value as? String {
            self = .text(text)
        } else if let inlineData = dict["inlineData"] {
            let data = try JSONDecoder().decode(
                GeminiInlineData.self,
                from: JSONEncoder().encode(inlineData)
            )
            self = .inlineData(data)
        } else if let fileData = dict["fileData"] {
            let data = try JSONDecoder().decode(
                GeminiFileData.self,
                from: JSONEncoder().encode(fileData)
            )
            self = .fileData(data)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid part format"
            )
        }
    }
}

// MARK: - Inline Data
struct GeminiInlineData: Codable {
    let mimeType: String
    let data: String

    enum CodingKeys: String, CodingKey {
        case mimeType = "mime_type"
        case data
    }
}

// MARK: - File Data
struct GeminiFileData: Codable {
    let mimeType: String
    let fileURI: String

    enum CodingKeys: String, CodingKey {
        case mimeType = "mime_type"
        case fileURI = "file_uri"
    }
}

// MARK: - Generation Config
struct GeminiGenerationConfig: Codable {
    let temperature: Double?
    let topP: Double?
    let topK: Int?
    let maxOutputTokens: Int?
    let stopSequences: [String]?

    enum CodingKeys: String, CodingKey {
        case temperature
        case topP
        case topK
        case maxOutputTokens
        case stopSequences
    }

    init(
        temperature: Double? = 0.7,
        topP: Double? = nil,
        topK: Int? = nil,
        maxOutputTokens: Int? = nil,
        stopSequences: [String]? = nil
    ) {
        self.temperature = temperature
        self.topP = topP
        self.topK = topK
        self.maxOutputTokens = maxOutputTokens
        self.stopSequences = stopSequences
    }
}

// MARK: - Safety Setting
struct GeminiSafetySetting: Codable {
    let category: GeminiHarmCategory
    let threshold: GeminiHarmBlockThreshold

    enum CodingKeys: String, CodingKey {
        case category
        case threshold
    }
}

enum GeminiHarmCategory: String, Codable {
    case harassment = "HARM_CATEGORY_HARASSMENT"
    case hateSpeech = "HARM_CATEGORY_HATE_SPEECH"
    case sexuallyExplicit = "HARM_CATEGORY_SEXUALLY_EXPLICIT"
    case dangerousContent = "HARM_CATEGORY_DANGEROUS_CONTENT"
}

enum GeminiHarmBlockThreshold: String, Codable {
    case blockNone = "BLOCK_NONE"
    case blockLowAndAbove = "BLOCK_LOW_AND_ABOVE"
    case blockMediumAndAbove = "BLOCK_MEDIUM_AND_ABOVE"
    case blockOnlyHigh = "BLOCK_ONLY_HIGH"
}

// MARK: - Response
struct GeminiGenerateContentResponse: Codable {
    let candidates: [GeminiCandidate]
    let promptFeedback: GeminiPromptFeedback?
    let usageMetadata: GeminiUsageMetadata?
}

// MARK: - Candidate
struct GeminiCandidate: Codable {
    let content: GeminiContent
    let finishReason: String?
    let safetyRatings: [GeminiSafetyRating]?
    let citationMetadata: GeminiCitationMetadata?

    enum CodingKeys: String, CodingKey {
        case content
        case finishReason
        case safetyRatings
        case citationMetadata
    }
}

// MARK: - Safety Rating
struct GeminiSafetyRating: Codable {
    let category: GeminiHarmCategory
    let probability: String
}

// MARK: - Citation Metadata
struct GeminiCitationMetadata: Codable {
    let citationSources: [GeminiCitationSource]
}

struct GeminiCitationSource: Codable {
    let startIndex: Int?
    let endIndex: Int?
    let uri: String?
    let license: String?
}

// MARK: - Prompt Feedback
struct GeminiPromptFeedback: Codable {
    let safetyRatings: [GeminiSafetyRating]
}

// MARK: - Usage Metadata
struct GeminiUsageMetadata: Codable {
    let promptTokenCount: Int
    let candidatesTokenCount: Int?
    let totalTokenCount: Int

    enum CodingKeys: String, CodingKey {
        case promptTokenCount
        case candidatesTokenCount
        case totalTokenCount
    }
}

// MARK: - Error Response
struct GeminiErrorResponse: Codable {
    let error: GeminiErrorDetail
}

struct GeminiErrorDetail: Codable {
    let code: Int
    let message: String
    let status: String
}

// MARK: - Helper Type for Dynamic Decoding
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported type"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map { AnyCodable($0) })
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: encoder.codingPath,
                    debugDescription: "Unsupported type"
                )
            )
        }
    }
}
