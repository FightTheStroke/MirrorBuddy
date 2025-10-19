import Foundation

/// Client for OpenAI Realtime API using WebSocket
@Observable
@MainActor
final class OpenAIRealtimeClient: NSObject {
    // MARK: - Properties

    private let configuration: OpenAIConfiguration
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?

    var isConnected: Bool = false
    var lastError: Error?

    // Connection recovery
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 3

    // Callbacks
    var onMessage: ((RealtimeMessage) -> Void)?
    var onError: ((Error) -> Void)?
    var onConnected: (() -> Void)?
    var onDisconnected: (() -> Void)?
    var onAudioData: ((Data) -> Void)?  // For received audio chunks
    var onTextDelta: ((String) -> Void)?  // For streaming text responses

    // MARK: - Initialization

    init(configuration: OpenAIConfiguration) {
        self.configuration = configuration
        super.init()
    }

    // MARK: - Connection Management

    /// Connect to Realtime API
    func connect() async throws {
        guard !isConnected else { return }

        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 30
        urlSession = URLSession(
            configuration: sessionConfig,
            delegate: self,
            delegateQueue: nil
        )

        guard var urlComponents = URLComponents(
            string: OpenAIConfiguration.Endpoint.realtimeSession.path(
                baseURL: configuration.baseURL
            )
        ) else {
            throw OpenAIError.invalidConfiguration
        }

        urlComponents.queryItems = [
            URLQueryItem(name: "model", value: "gpt-5-realtime-preview")
        ]

        guard let url = urlComponents.url else {
            throw OpenAIError.invalidConfiguration
        }

        var request = URLRequest(url: url)
        request.addValue("Bearer \(configuration.apiKey)", forHTTPHeaderField: "Authorization")
        request.addValue("realtime=v1", forHTTPHeaderField: "OpenAI-Beta")

        if let orgID = configuration.organizationID {
            request.addValue(orgID, forHTTPHeaderField: "OpenAI-Organization")
        }

        webSocketTask = urlSession?.webSocketTask(with: request)
        webSocketTask?.resume()

        // Start receiving messages
        receiveMessage()

        isConnected = true
        reconnectAttempts = 0  // Reset reconnect attempts on successful connection
        onConnected?()
    }

    /// Attempt to reconnect after connection failure
    private func attemptReconnect() async {
        guard reconnectAttempts < maxReconnectAttempts else {
            let error = OpenAIError.serverError(
                statusCode: 0,
                message: "Max reconnection attempts reached"
            )
            lastError = error
            onError?(error)
            return
        }

        reconnectAttempts += 1
        let delay = Double(reconnectAttempts) * 2.0  // Exponential backoff: 2s, 4s, 6s

        do {
            try await _Concurrency.Task.sleep(for: .seconds(delay))
            try await connect()
        } catch {
            lastError = error
            onError?(error)
            // Will retry on next attempt if under max
        }
    }

    /// Disconnect from Realtime API
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession = nil
        isConnected = false
        onDisconnected?()
    }

    // MARK: - Sending Messages

    /// Send a message to the Realtime API
    func send(_ message: RealtimeMessage) async throws {
        guard isConnected, let webSocketTask else {
            throw OpenAIError.invalidConfiguration
        }

        let encoder = JSONEncoder()
        let data = try encoder.encode(message)

        guard let messageString = String(data: data, encoding: .utf8) else {
            throw OpenAIError.invalidRequest("Failed to encode message")
        }

        try await webSocketTask.send(.string(messageString))
    }

    /// Send text input
    func sendText(_ text: String) async throws {
        let message = RealtimeMessage.clientEvent(
            .conversationItemCreate(
                .init(
                    eventID: UUID().uuidString,
                    item: .message(
                        .init(
                            id: UUID().uuidString,
                            role: "user",
                            content: [.text(text)]
                        )
                    )
                )
            )
        )
        try await send(message)

        // Trigger response generation
        let responseMessage = RealtimeMessage.clientEvent(
            .responseCreate(.init(eventID: UUID().uuidString))
        )
        try await send(responseMessage)
    }

    /// Send system prompt with system role
    func sendSystemPrompt(_ text: String) async throws {
        let message = RealtimeMessage.clientEvent(
            .conversationItemCreate(
                .init(
                    eventID: UUID().uuidString,
                    item: .message(
                        .init(
                            id: UUID().uuidString,
                            role: "system",
                            content: [.text(text)]
                        )
                    )
                )
            )
        )
        try await send(message)
        // Note: No response generation for system messages
    }

    /// Send audio input (PCM16 data, base64-encoded)
    func sendAudioData(_ audioData: Data) async throws {
        guard isConnected, webSocketTask != nil else {
            throw OpenAIError.invalidConfiguration
        }

        // Encode audio data to base64
        let base64Audio = audioData.base64EncodedString()

        let message = RealtimeMessage.clientEvent(
            .inputAudioBufferAppend(
                .init(
                    eventID: UUID().uuidString,
                    audio: base64Audio
                )
            )
        )
        try await send(message)
    }

    /// Commit audio buffer and trigger response
    func commitAudioBuffer() async throws {
        let commitMessage = RealtimeMessage.clientEvent(
            .inputAudioBufferCommit(.init(eventID: UUID().uuidString))
        )
        try await send(commitMessage)

        // Trigger response generation
        let responseMessage = RealtimeMessage.clientEvent(
            .responseCreate(.init(eventID: UUID().uuidString))
        )
        try await send(responseMessage)
    }

    // MARK: - Receiving Messages

    /// Receive messages from the WebSocket
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }

            DispatchQueue.main.async {
                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        self.handleMessage(text: text)
                    case .data(let data):
                        if let text = String(data: data, encoding: .utf8) {
                            self.handleMessage(text: text)
                        }
                    @unknown default:
                        break
                    }

                    // Continue receiving
                    self.receiveMessage()

                case .failure(let error):
                    let openAIError = OpenAIError.networkError(error)
                    self.lastError = openAIError
                    self.onError?(openAIError)
                    self.isConnected = false

                    // Attempt reconnection if not intentionally disconnected
                    if self.reconnectAttempts < self.maxReconnectAttempts {
                        _Concurrency.Task { @MainActor in
                            await self.attemptReconnect()
                        }
                    }
                }
            }
        }
    }

    /// Handle received message
    private func handleMessage(text: String) {
        let decoder = JSONDecoder()
        guard let data = text.data(using: .utf8) else {
            return
        }

        // Decode full message for structured handling
        if let message = try? decoder.decode(RealtimeMessage.self, from: data) {
            // Handle specific events directly for callbacks
            if case .serverEvent(let serverEvent) = message {
                switch serverEvent {
                case .responseAudioDelta(let audioDelta):
                    // Decode base64 audio and send to callback
                    if let audioData = Data(base64Encoded: audioDelta.delta) {
                        onAudioData?(audioData)
                    }

                case .responseTextDelta(let textDelta):
                    // Send text delta to callback
                    onTextDelta?(textDelta.delta)

                case .error(let error):
                    // Handle error events
                    let errorObj = OpenAIError.serverError(statusCode: 0, message: error.message)
                    onError?(errorObj)

                default:
                    break
                }
            }

            // Send full message to general callback
            onMessage?(message)
        }
    }
}

// MARK: - URLSessionWebSocketDelegate

extension OpenAIRealtimeClient: URLSessionWebSocketDelegate {
    nonisolated func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.isConnected = true
            self.onConnected?()
        }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.isConnected = false
            self.onDisconnected?()
        }
    }
}

// MARK: - Realtime Message Models

enum RealtimeMessage: Codable {
    case clientEvent(ClientEvent)
    case serverEvent(ServerEvent)

    func encode(to encoder: Encoder) throws {
        switch self {
        case .clientEvent(let event):
            try event.encode(to: encoder)
        case .serverEvent(let event):
            try event.encode(to: encoder)
        }
    }

    init(from decoder: Decoder) throws {
        // Try to decode as server event first, then client event
        if let serverEvent = try? ServerEvent(from: decoder) {
            self = .serverEvent(serverEvent)
        } else if let clientEvent = try? ClientEvent(from: decoder) {
            self = .clientEvent(clientEvent)
        } else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Could not decode RealtimeMessage"
                )
            )
        }
    }
}

// MARK: - Client Events

enum ClientEvent: Codable {
    case conversationItemCreate(ConversationItemCreate)
    case responseCreate(ResponseCreate)
    case inputAudioBufferAppend(InputAudioBufferAppend)
    case inputAudioBufferCommit(InputAudioBufferCommit)
}

struct ConversationItemCreate: Codable {
    let eventID: String
    let type: String = "conversation.item.create"
    let item: ConversationItem

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
        case item
    }
}

struct ResponseCreate: Codable {
    let eventID: String
    let type: String = "response.create"

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
    }
}

struct InputAudioBufferAppend: Codable {
    let eventID: String
    let type: String = "input_audio_buffer.append"
    let audio: String  // base64-encoded PCM16 audio

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
        case audio
    }
}

struct InputAudioBufferCommit: Codable {
    let eventID: String
    let type: String = "input_audio_buffer.commit"

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
    }
}

enum ConversationItem: Codable {
    case message(ConversationMessage)

    func encode(to encoder: Encoder) throws {
        switch self {
        case .message(let conversationMessage):
            try conversationMessage.encode(to: encoder)
        }
    }

    init(from decoder: Decoder) throws {
        let conversationMessage = try ConversationMessage(from: decoder)
        self = .message(conversationMessage)
    }
}

struct ConversationMessage: Codable {
    let id: String
    var type: String = "message"
    let role: String
    let content: [MessageContent]
}

enum MessageContent: Codable {
    case text(String)

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let text):
            try container.encode("text", forKey: .type)
            try container.encode(text, forKey: .text)
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        if type == "text" {
            let text = try container.decode(String.self, forKey: .text)
            self = .text(text)
        } else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown content type"
            )
        }
    }

    enum CodingKeys: String, CodingKey {
        case type
        case text
    }
}

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
        switch self {
        case .sessionCreated(let event):
            try container.encode("session.created", forKey: .type)
            try event.encode(to: encoder)
        case .sessionUpdated(let event):
            try container.encode("session.updated", forKey: .type)
            try event.encode(to: encoder)
        case .conversationCreated(let event):
            try container.encode("conversation.created", forKey: .type)
            try event.encode(to: encoder)
        case .conversationItemCreated(let event):
            try container.encode("conversation.item.created", forKey: .type)
            try event.encode(to: encoder)
        case .inputAudioBufferCommitted(let event):
            try container.encode("input_audio_buffer.committed", forKey: .type)
            try event.encode(to: encoder)
        case .inputAudioBufferCleared:
            try container.encode("input_audio_buffer.cleared", forKey: .type)
        case .inputAudioBufferSpeechStarted(let event):
            try container.encode("input_audio_buffer.speech_started", forKey: .type)
            try event.encode(to: encoder)
        case .inputAudioBufferSpeechStopped(let event):
            try container.encode("input_audio_buffer.speech_stopped", forKey: .type)
            try event.encode(to: encoder)
        case .responseCreated(let event):
            try container.encode("response.created", forKey: .type)
            try event.encode(to: encoder)
        case .responseOutputItemAdded(let event):
            try container.encode("response.output_item.added", forKey: .type)
            try event.encode(to: encoder)
        case .responseOutputItemDone(let event):
            try container.encode("response.output_item.done", forKey: .type)
            try event.encode(to: encoder)
        case .responseContentPartAdded(let event):
            try container.encode("response.content_part.added", forKey: .type)
            try event.encode(to: encoder)
        case .responseContentPartDone(let event):
            try container.encode("response.content_part.done", forKey: .type)
            try event.encode(to: encoder)
        case .responseTextDelta(let event):
            try container.encode("response.text.delta", forKey: .type)
            try event.encode(to: encoder)
        case .responseTextDone(let event):
            try container.encode("response.text.done", forKey: .type)
            try event.encode(to: encoder)
        case .responseAudioTranscriptDelta(let event):
            try container.encode("response.audio_transcript.delta", forKey: .type)
            try event.encode(to: encoder)
        case .responseAudioTranscriptDone(let event):
            try container.encode("response.audio_transcript.done", forKey: .type)
            try event.encode(to: encoder)
        case .responseAudioDelta(let event):
            try container.encode("response.audio.delta", forKey: .type)
            try event.encode(to: encoder)
        case .responseAudioDone:
            try container.encode("response.audio.done", forKey: .type)
        case .responseDone(let event):
            try container.encode("response.done", forKey: .type)
            try event.encode(to: encoder)
        case .rateLimitsUpdated(let event):
            try container.encode("rate_limits.updated", forKey: .type)
            try event.encode(to: encoder)
        case .error(let event):
            try container.encode("error", forKey: .type)
            try event.encode(to: encoder)
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "session.created":
            let event = try SessionCreated(from: decoder)
            self = .sessionCreated(event)
        case "session.updated":
            let event = try SessionUpdated(from: decoder)
            self = .sessionUpdated(event)
        case "conversation.created":
            let event = try ConversationCreated(from: decoder)
            self = .conversationCreated(event)
        case "conversation.item.created":
            let event = try ConversationItemCreated(from: decoder)
            self = .conversationItemCreated(event)
        case "input_audio_buffer.committed":
            let event = try InputAudioBufferCommitted(from: decoder)
            self = .inputAudioBufferCommitted(event)
        case "input_audio_buffer.cleared":
            self = .inputAudioBufferCleared
        case "input_audio_buffer.speech_started":
            let event = try SpeechEvent(from: decoder)
            self = .inputAudioBufferSpeechStarted(event)
        case "input_audio_buffer.speech_stopped":
            let event = try SpeechEvent(from: decoder)
            self = .inputAudioBufferSpeechStopped(event)
        case "response.created":
            let event = try ResponseCreated(from: decoder)
            self = .responseCreated(event)
        case "response.output_item.added":
            let event = try ResponseOutputItem(from: decoder)
            self = .responseOutputItemAdded(event)
        case "response.output_item.done":
            let event = try ResponseOutputItem(from: decoder)
            self = .responseOutputItemDone(event)
        case "response.content_part.added":
            let event = try ResponseContentPart(from: decoder)
            self = .responseContentPartAdded(event)
        case "response.content_part.done":
            let event = try ResponseContentPart(from: decoder)
            self = .responseContentPartDone(event)
        case "response.text.delta":
            let event = try TextDelta(from: decoder)
            self = .responseTextDelta(event)
        case "response.text.done":
            let event = try TextDone(from: decoder)
            self = .responseTextDone(event)
        case "response.audio_transcript.delta":
            let event = try AudioTranscriptDelta(from: decoder)
            self = .responseAudioTranscriptDelta(event)
        case "response.audio_transcript.done":
            let event = try AudioTranscriptDone(from: decoder)
            self = .responseAudioTranscriptDone(event)
        case "response.audio.delta":
            let event = try AudioDelta(from: decoder)
            self = .responseAudioDelta(event)
        case "response.audio.done":
            self = .responseAudioDone
        case "response.done":
            let event = try ResponseDone(from: decoder)
            self = .responseDone(event)
        case "rate_limits.updated":
            let event = try RateLimits(from: decoder)
            self = .rateLimitsUpdated(event)
        case "error":
            let event = try ServerError(from: decoder)
            self = .error(event)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown event type: \(type)"
            )
        }
    }

    enum CodingKeys: String, CodingKey {
        case type
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
    let prefixPaddingMs: Int?
    let silenceDurationMs: Int?

    enum CodingKeys: String, CodingKey {
        case type, threshold
        case prefixPaddingMs = "prefix_padding_ms"
        case silenceDurationMs = "silence_duration_ms"
    }
}

struct ConversationCreated: Codable {
    let eventID: String
    let conversation: Conversation

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case conversation
    }
}

struct Conversation: Codable {
    let id: String
}

struct ConversationItemCreated: Codable {
    let eventID: String
    let item: ConversationItemDetails

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case item
    }
}

struct ConversationItemDetails: Codable {
    let id: String
    let type: String?
    let status: String?
    let role: String?
    let content: [ContentPart]?
}

struct InputAudioBufferCommitted: Codable {
    let eventID: String
    let itemID: String?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case itemID = "item_id"
    }
}

struct SpeechEvent: Codable {
    let eventID: String
    let audioStartMs: Int?
    let itemID: String?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case audioStartMs = "audio_start_ms"
        case itemID = "item_id"
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

struct Response: Codable {
    let id: String
    let status: String?
}

struct ResponseOutputItem: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let item: ConversationItemDetails?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case item
    }
}

struct ResponseContentPart: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let contentIndex: Int?
    let part: ContentPart?

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case contentIndex = "content_index"
        case part
    }
}

struct ContentPart: Codable {
    let type: String?
    let text: String?
    let audio: String?
    let transcript: String?
}

struct TextDelta: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let contentIndex: Int?
    let delta: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case contentIndex = "content_index"
        case delta
    }
}

struct TextDone: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let contentIndex: Int?
    let text: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case contentIndex = "content_index"
        case text
    }
}

struct AudioTranscriptDelta: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let contentIndex: Int?
    let delta: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case contentIndex = "content_index"
        case delta
    }
}

struct AudioTranscriptDone: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let contentIndex: Int?
    let transcript: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case contentIndex = "content_index"
        case transcript
    }
}

struct AudioDelta: Codable {
    let eventID: String
    let responseID: String?
    let itemID: String?
    let outputIndex: Int?
    let contentIndex: Int?
    let delta: String  // base64-encoded PCM16 audio chunk

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case responseID = "response_id"
        case itemID = "item_id"
        case outputIndex = "output_index"
        case contentIndex = "content_index"
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
