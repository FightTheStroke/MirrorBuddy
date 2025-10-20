import Foundation

// MARK: - Server Events

enum ServerEvent: Codable {
    case sessionCreated(SessionCreated)
    case sessionUpdated(SessionUpdated)
    case conversationCreated(ConversationCreated)
    case conversationItemCreated(ConversationItemCreated)
    case inputAudioBufferCommitted(InputAudioBufferCommitted)
    case inputAudioBufferCleared
    case inputAudioBufferSpeechStarted(SpeechEvent)
    case inputAudioBufferSpeechStopped(SpeechEvent)
    case responseCreated(ResponseCreated)
    case responseOutputItemAdded(ResponseOutputItem)
    case responseOutputItemDone(ResponseOutputItem)
    case responseContentPartAdded(ResponseContentPart)
    case responseContentPartDone(ResponseContentPart)
    case responseTextDelta(TextDelta)
    case responseTextDone(TextDone)
    case responseAudioTranscriptDelta(AudioTranscriptDelta)
    case responseAudioTranscriptDone(AudioTranscriptDone)
    case responseAudioDelta(AudioDelta)
    case responseAudioDone
    case responseDone(ResponseDone)
    case rateLimitsUpdated(RateLimits)
    case error(ServerError)

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        let handlers: [(Encoder, inout KeyedEncodingContainer<CodingKeys>) throws -> Bool] = [
            encodeSessionEvents,
            encodeConversationEvents,
            encodeInputAudioEvents,
            encodeResponseCreationEvents,
            encodeResponseOutputItemEvents,
            encodeResponseContentEvents,
            encodeResponseTextEvents,
            encodeResponseAudioTranscriptEvents,
            encodeResponseAudioEvents,
            encodeRateLimitEvents,
            encodeErrorEvents
        ]

        for handler in handlers {
            guard try !handler(encoder, &container) else {
                return
            }
        }

        assertionFailure("Unhandled ServerEvent case during encoding: \(self)")
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        let decoders: [(String, Decoder) throws -> ServerEvent?] = [
            Self.decodeSessionEvents,
            Self.decodeConversationEvents,
            Self.decodeInputAudioEvents,
            Self.decodeResponseCreationEvents,
            Self.decodeResponseOutputItemEvents,
            Self.decodeResponseContentEvents,
            Self.decodeResponseTextEvents,
            Self.decodeResponseAudioTranscriptEvents,
            Self.decodeResponseAudioEvents,
            { type, decoder in
                guard type == "rate_limits.updated" else { return nil }
                return .rateLimitsUpdated(try RateLimits(from: decoder))
            },
            { type, decoder in
                guard type == "error" else { return nil }
                return .error(try ServerError(from: decoder))
            }
        ]

        for decodeHandler in decoders {
            guard let event = try decodeHandler(type, decoder) else {
                continue
            }

            self = event
            return
        }

        throw DecodingError.dataCorruptedError(
            forKey: .type,
            in: container,
            debugDescription: "Unknown event type: \(type)"
        )
    }

    enum CodingKeys: String, CodingKey {
        case type
    }
}

// MARK: - Server Event Encoding Helpers

private extension ServerEvent {
    func encodeSessionEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .sessionCreated(let event):
            try container.encode("session.created", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .sessionUpdated(let event):
            try container.encode("session.updated", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeConversationEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .conversationCreated(let event):
            try container.encode("conversation.created", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .conversationItemCreated(let event):
            try container.encode("conversation.item.created", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeInputAudioEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .inputAudioBufferCommitted(let event):
            try container.encode("input_audio_buffer.committed", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .inputAudioBufferCleared:
            try container.encode("input_audio_buffer.cleared", forKey: .type)
            return true
        case .inputAudioBufferSpeechStarted(let event):
            try container.encode("input_audio_buffer.speech_started", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .inputAudioBufferSpeechStopped(let event):
            try container.encode("input_audio_buffer.speech_stopped", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeResponseCreationEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .responseCreated(let event):
            try container.encode("response.created", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .responseDone(let event):
            try container.encode("response.done", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeResponseOutputItemEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .responseOutputItemAdded(let event):
            try container.encode("response.output_item.added", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .responseOutputItemDone(let event):
            try container.encode("response.output_item.done", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeResponseContentEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .responseContentPartAdded(let event):
            try container.encode("response.content_part.added", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .responseContentPartDone(let event):
            try container.encode("response.content_part.done", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeResponseTextEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .responseTextDelta(let event):
            try container.encode("response.text.delta", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .responseTextDone(let event):
            try container.encode("response.text.done", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeResponseAudioTranscriptEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .responseAudioTranscriptDelta(let event):
            try container.encode("response.audio_transcript.delta", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .responseAudioTranscriptDone(let event):
            try container.encode("response.audio_transcript.done", forKey: .type)
            try event.encode(to: encoder)
            return true
        default:
            return false
        }
    }

    func encodeResponseAudioEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        switch self {
        case .responseAudioDelta(let event):
            try container.encode("response.audio.delta", forKey: .type)
            try event.encode(to: encoder)
            return true
        case .responseAudioDone:
            try container.encode("response.audio.done", forKey: .type)
            return true
        default:
            return false
        }
    }

    func encodeRateLimitEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        if case let .rateLimitsUpdated(event) = self {
            try container.encode("rate_limits.updated", forKey: .type)
            try event.encode(to: encoder)
            return true
        }
        return false
    }

    func encodeErrorEvents(
        into encoder: Encoder,
        container: inout KeyedEncodingContainer<CodingKeys>
    ) throws -> Bool {
        if case let .error(event) = self {
            try container.encode("error", forKey: .type)
            try event.encode(to: encoder)
            return true
        }
        return false
    }

    static func decodeSessionEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "session.created":
            return .sessionCreated(try SessionCreated(from: decoder))
        case "session.updated":
            return .sessionUpdated(try SessionUpdated(from: decoder))
        default:
            return nil
        }
    }

    static func decodeConversationEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "conversation.created":
            return .conversationCreated(try ConversationCreated(from: decoder))
        case "conversation.item.created":
            return .conversationItemCreated(try ConversationItemCreated(from: decoder))
        default:
            return nil
        }
    }

    static func decodeInputAudioEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "input_audio_buffer.committed":
            return .inputAudioBufferCommitted(try InputAudioBufferCommitted(from: decoder))
        case "input_audio_buffer.cleared":
            return .inputAudioBufferCleared
        case "input_audio_buffer.speech_started":
            return .inputAudioBufferSpeechStarted(try SpeechEvent(from: decoder))
        case "input_audio_buffer.speech_stopped":
            return .inputAudioBufferSpeechStopped(try SpeechEvent(from: decoder))
        default:
            return nil
        }
    }

    static func decodeResponseCreationEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "response.created":
            return .responseCreated(try ResponseCreated(from: decoder))
        case "response.done":
            return .responseDone(try ResponseDone(from: decoder))
        default:
            return nil
        }
    }

    static func decodeResponseOutputItemEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "response.output_item.added":
            return .responseOutputItemAdded(try ResponseOutputItem(from: decoder))
        case "response.output_item.done":
            return .responseOutputItemDone(try ResponseOutputItem(from: decoder))
        default:
            return nil
        }
    }

    static func decodeResponseContentEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "response.content_part.added":
            return .responseContentPartAdded(try ResponseContentPart(from: decoder))
        case "response.content_part.done":
            return .responseContentPartDone(try ResponseContentPart(from: decoder))
        default:
            return nil
        }
    }

    static func decodeResponseTextEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "response.text.delta":
            return .responseTextDelta(try TextDelta(from: decoder))
        case "response.text.done":
            return .responseTextDone(try TextDone(from: decoder))
        default:
            return nil
        }
    }

    static func decodeResponseAudioTranscriptEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "response.audio_transcript.delta":
            return .responseAudioTranscriptDelta(try AudioTranscriptDelta(from: decoder))
        case "response.audio_transcript.done":
            return .responseAudioTranscriptDone(try AudioTranscriptDone(from: decoder))
        default:
            return nil
        }
    }

    static func decodeResponseAudioEvents(type: String, decoder: Decoder) throws -> ServerEvent? {
        switch type {
        case "response.audio.delta":
            return .responseAudioDelta(try AudioDelta(from: decoder))
        case "response.audio.done":
            return .responseAudioDone
        default:
            return nil
        }
    }
}

// MARK: - Server Event Data Structures

struct SessionCreated: Codable {
    let eventID: String
    let session: Session

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case session
    }
}

struct SessionUpdated: Codable {
    let eventID: String
    let session: Session

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case session
    }
}

struct Session: Codable {
    let id: String?
    let model: String?
    let modalities: [String]?
    let instructions: String?
    let voice: String?
    let inputAudioFormat: String?
    let outputAudioFormat: String?
    let inputAudioTranscription: InputAudioTranscription?
    let turnDetection: TurnDetection?
    let tools: [String]?
    let toolChoice: String?
    let temperature: Double?
    let maxResponseOutputTokens: Int?

    enum CodingKeys: String, CodingKey {
        case id, model, modalities, instructions, voice
        case inputAudioFormat = "input_audio_format"
        case outputAudioFormat = "output_audio_format"
        case inputAudioTranscription = "input_audio_transcription"
        case turnDetection = "turn_detection"
        case tools
        case toolChoice = "tool_choice"
        case temperature
        case maxResponseOutputTokens = "max_response_output_tokens"
    }
}

struct InputAudioTranscription: Codable {
    let enabled: Bool?
    let model: String?
}

struct TurnDetection: Codable {
    let type: String?
    let threshold: Double?
}

struct ConversationCreated: Codable {
    let eventID: String
    let conversation: Conversation

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case conversation
    }
}

struct ConversationItemCreated: Codable {
    let eventID: String
    let item: ConversationMessage

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case item
    }
}

struct Conversation: Codable {
    let id: String
    let items: [ConversationMessage]
}

struct ConversationMessage: Codable {
    let id: String
    var type: String = "message"
    let role: String
    let content: [MessageContent]
}

struct SpeechEvent: Codable {
    let eventID: String
    let audioStartMs: Int?
    let audioEndMs: Int?
    let durationMs: Int?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case audioStartMs = "audio_start_ms"
        case audioEndMs = "audio_end_ms"
        case durationMs = "duration_ms"
    }
}

struct ResponseCreated: Codable {
    let eventID: String
    let response: Response

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case response
    }
}

struct ResponseOutputItem: Codable {
    let eventID: String
    let outputIndex: Int
    let item: ResponseItem

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case item
    }
}

struct ResponseContentPart: Codable {
    let eventID: String
    let outputIndex: Int
    let itemIndex: Int
    let part: ResponsePart

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case itemIndex = "item_index"
        case part
    }
}

struct TextDelta: Codable {
    let eventID: String
    let outputIndex: Int
    let itemIndex: Int
    let delta: String
    let annotations: [String]?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case itemIndex = "item_index"
        case delta, annotations
    }
}

struct TextDone: Codable {
    let eventID: String
    let outputIndex: Int
    let itemIndex: Int
    let text: String
    let annotations: [String]?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case itemIndex = "item_index"
        case text, annotations
    }
}

struct AudioTranscriptDelta: Codable {
    let eventID: String
    let outputIndex: Int
    let itemIndex: Int
    let delta: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case itemIndex = "item_index"
        case delta
    }
}

struct AudioTranscriptDone: Codable {
    let eventID: String
    let outputIndex: Int
    let itemIndex: Int
    let transcript: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case itemIndex = "item_index"
        case transcript
    }
}

struct AudioDelta: Codable {
    let eventID: String
    let outputIndex: Int
    let itemIndex: Int
    let delta: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case outputIndex = "output_index"
        case itemIndex = "item_index"
        case delta
    }
}

struct ResponseDone: Codable {
    let eventID: String
    let response: Response

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case response
    }
}

struct RateLimits: Codable {
    let eventID: String
    let rateLimits: [RateLimit]

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case rateLimits = "rate_limits"
    }
}

struct RateLimit: Codable {
    let name: String
    let limit: Int
    let remaining: Int
    let resetSeconds: Double

    enum CodingKeys: String, CodingKey {
        case name, limit, remaining
        case resetSeconds = "reset_seconds"
    }
}

struct ServerError: Codable {
    let eventID: String?
    let type: String
    let code: String?
    let message: String
    let param: String?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type, code, message, param
    }
}
