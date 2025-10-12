import Foundation

// MARK: - Namespace

enum ChatCompletionModels {}

// MARK: - Chat Completion Request

struct ChatCompletionRequest: Codable {
    let model: String
    let messages: [ChatMessage]
    let temperature: Double?
    let maxTokens: Int?
    let stream: Bool?
    let responseFormat: ChatResponseFormat?

    enum CodingKeys: String, CodingKey {
        case model
        case messages
        case temperature
        case maxTokens = "max_tokens"
        case stream
        case responseFormat = "response_format"
    }
}

// MARK: - Chat Message

struct ChatMessage: Codable {
    let role: ChatRole
    let content: ChatContent

    enum ChatRole: String, Codable {
        case system
        case user
        case assistant
    }
}

// MARK: - Chat Content

enum ChatContent: Codable {
    case text(String)
    case multipart([ChatContentPart])

    func encode(to encoder: Encoder) throws {
        switch self {
        case .text(let string):
            var container = encoder.singleValueContainer()
            try container.encode(string)
        case .multipart(let parts):
            var container = encoder.singleValueContainer()
            try container.encode(parts)
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let string = try? container.decode(String.self) {
            self = .text(string)
        } else if let parts = try? container.decode([ChatContentPart].self) {
            self = .multipart(parts)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid content format"
            )
        }
    }
}

// MARK: - Chat Content Part

struct ChatContentPart: Codable {
    let type: ChatContentType
    let text: String?
    let imageURL: ChatImageURL?

    enum CodingKeys: String, CodingKey {
        case type
        case text
        case imageURL = "image_url"
    }
}

enum ChatContentType: String, Codable {
    case text
    case imageURL = "image_url"
}

// MARK: - Chat Image URL

struct ChatImageURL: Codable {
    let url: String
    let detail: ImageDetail?
}

enum ImageDetail: String, Codable {
    case low
    case high
    case auto
}

// MARK: - Chat Response Format

struct ChatResponseFormat: Codable {
    let type: ChatResponseType
}

enum ChatResponseType: String, Codable {
    case text
    case jsonObject = "json_object"
}

// MARK: - Chat Completion Response

struct ChatCompletionResponse: Codable {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [ChatChoice]
    let usage: ChatUsage
}

// MARK: - Chat Choice

struct ChatChoice: Codable {
    let index: Int
    let message: ChatResponseMessage
    let finishReason: String?

    enum CodingKeys: String, CodingKey {
        case index
        case message
        case finishReason = "finish_reason"
    }
}

// MARK: - Chat Response Message

struct ChatResponseMessage: Codable {
    let role: String
    let content: String
}

// MARK: - Chat Usage

struct ChatUsage: Codable {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int

    enum CodingKeys: String, CodingKey {
        case promptTokens = "prompt_tokens"
        case completionTokens = "completion_tokens"
        case totalTokens = "total_tokens"
    }
}

// MARK: - Image Generation Request

struct ImageGenerationRequest: Codable {
    let model: String
    let prompt: String
    let count: Int?
    let size: ImageSize?
    let quality: ImageQuality?
    let style: ImageStyle?

    enum CodingKeys: String, CodingKey {
        case model
        case prompt
        case count = "n"
        case size
        case quality
        case style
    }
}

// MARK: - Image Generation Supporting Types

enum ImageSize: String, Codable {
    case square1024 = "1024x1024"
    case square1792 = "1792x1024"
    case portrait1024 = "1024x1792"
}

enum ImageQuality: String, Codable {
    case standard
    case hd
}

enum ImageStyle: String, Codable {
    case vivid
    case natural
}

// MARK: - Image Generation Response

struct ImageGenerationResponse: Codable {
    let created: Int
    let data: [ImageData]
}

struct ImageData: Codable {
    let url: String?
    let b64JSON: String?
    let revisedPrompt: String?

    enum CodingKeys: String, CodingKey {
        case url
        case b64JSON = "b64_json"
        case revisedPrompt = "revised_prompt"
    }
}

// MARK: - Error Response

struct OpenAIErrorResponse: Codable {
    let error: OpenAIErrorDetail
}

struct OpenAIErrorDetail: Codable {
    let message: String
    let type: String
    let param: String?
    let code: String?
}
