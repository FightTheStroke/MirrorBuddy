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
    private static let expectedType = "conversation.item.create"

    let eventID: String
    let type: String
    let item: ConversationItem

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
        case item
    }

    init(eventID: String, item: ConversationItem) {
        self.eventID = eventID
        self.type = Self.expectedType
        self.item = item
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        eventID = try container.decode(String.self, forKey: .eventID)
        item = try container.decode(ConversationItem.self, forKey: .item)
        let decodedType = try container.decode(String.self, forKey: .type)

        guard decodedType == Self.expectedType else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Expected type \(Self.expectedType) but found \(decodedType)"
            )
        }

        type = decodedType
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventID, forKey: .eventID)
        try container.encode(type, forKey: .type)
        try container.encode(item, forKey: .item)
    }
}

struct ResponseCreate: Codable {
    private static let expectedType = "response.create"

    let eventID: String
    let type: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
    }

    init(eventID: String) {
        self.eventID = eventID
        self.type = Self.expectedType
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        eventID = try container.decode(String.self, forKey: .eventID)
        let decodedType = try container.decode(String.self, forKey: .type)

        guard decodedType == Self.expectedType else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Expected type \(Self.expectedType) but found \(decodedType)"
            )
        }

        type = decodedType
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventID, forKey: .eventID)
        try container.encode(type, forKey: .type)
    }
}

struct InputAudioBufferAppend: Codable {
    private static let expectedType = "input_audio_buffer.append"

    let eventID: String
    let type: String
    let audio: String  // base64-encoded PCM16 audio

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
        case audio
    }

    init(eventID: String, audio: String) {
        self.eventID = eventID
        self.type = Self.expectedType
        self.audio = audio
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        eventID = try container.decode(String.self, forKey: .eventID)
        audio = try container.decode(String.self, forKey: .audio)
        let decodedType = try container.decode(String.self, forKey: .type)

        guard decodedType == Self.expectedType else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Expected type \(Self.expectedType) but found \(decodedType)"
            )
        }

        type = decodedType
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventID, forKey: .eventID)
        try container.encode(type, forKey: .type)
        try container.encode(audio, forKey: .audio)
    }
}

struct InputAudioBufferCommit: Codable {
    private static let expectedType = "input_audio_buffer.commit"

    let eventID: String
    let type: String

    enum CodingKeys: String, CodingKey {
        case eventID = "event_id"
        case type
    }

    init(eventID: String) {
        self.eventID = eventID
        self.type = Self.expectedType
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        eventID = try container.decode(String.self, forKey: .eventID)
        let decodedType = try container.decode(String.self, forKey: .type)

        guard decodedType == Self.expectedType else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Expected type \(Self.expectedType) but found \(decodedType)"
            )
        }

        type = decodedType
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventID, forKey: .eventID)
        try container.encode(type, forKey: .type)
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
        case .sessionCreated, .sessionUpdated, .conversationCreated, .conversationItemCreated:
            try encodeSessionEvents(to: encoder, container: &container)
        case .inputAudioBufferCommitted, .inputAudioBufferCleared, .inputAudioBufferSpeechStarted, .inputAudioBufferSpeechStopped:
            try encodeAudioBufferEvents(to: encoder, container: &container)
        case .responseCreated, .responseOutputItemAdded, .responseOutputItemDone, .responseContentPartAdded, .responseContentPartDone:
            try encodeResponseStructureEvents(to: encoder, container: &container)
        case .responseTextDelta, .responseTextDone, .responseAudioTranscriptDelta, .responseAudioTranscriptDone, .responseAudioDelta, .responseAudioDone:
            try encodeResponseContentEvents(to: encoder, container: &container)
        case .responseDone, .rateLimitsUpdated, .error:
            try encodeMetaEvents(to: encoder, container: &container)
        }
    }

    private func encodeSessionEvents(to encoder: Encoder, container: inout KeyedEncodingContainer<CodingKeys>) throws {
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
        default: break
        }
    }

    private func encodeAudioBufferEvents(to encoder: Encoder, container: inout KeyedEncodingContainer<CodingKeys>) throws {
        switch self {
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
        default: break
        }
    }

    private func encodeResponseStructureEvents(to encoder: Encoder, container: inout KeyedEncodingContainer<CodingKeys>) throws {
        switch self {
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
        default: break
        }
    }

    private func encodeResponseContentEvents(to encoder: Encoder, container: inout KeyedEncodingContainer<CodingKeys>) throws {
        switch self {
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
        default: break
        }
    }

    private func encodeMetaEvents(to encoder: Encoder, container: inout KeyedEncodingContainer<CodingKeys>) throws {
        switch self {
        case .responseDone(let event):
            try container.encode("response.done", forKey: .type)
            try event.encode(to: encoder)
        case .rateLimitsUpdated(let event):
            try container.encode("rate_limits.updated", forKey: .type)
            try event.encode(to: encoder)
        case .error(let event):
            try container.encode("error", forKey: .type)
            try event.encode(to: encoder)
        default: break
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        if type.hasPrefix("session.") || type.hasPrefix("conversation.") {
            self = try Self.decodeSessionEvent(type: type, decoder: decoder, container: container)
        } else if type.hasPrefix("input_audio_buffer.") {
            self = try Self.decodeAudioBufferEvent(type: type, decoder: decoder)
        } else if type.hasPrefix("response.output") || type.hasPrefix("response.content") || type == "response.created" {
            self = try Self.decodeResponseStructureEvent(type: type, decoder: decoder)
        } else if type.hasPrefix("response.text") || type.hasPrefix("response.audio") {
            self = try Self.decodeResponseContentEvent(type: type, decoder: decoder)
        } else {
            self = try Self.decodeMetaEvent(type: type, decoder: decoder, container: container)
        }
    }

    private static func decodeSessionEvent(type: String, decoder: Decoder, container: KeyedDecodingContainer<CodingKeys>) throws -> ServerEvent {
        switch type {
        case "session.created":
            return .sessionCreated(try SessionCreated(from: decoder))
        case "session.updated":
            return .sessionUpdated(try SessionUpdated(from: decoder))
        case "conversation.created":
            return .conversationCreated(try ConversationCreated(from: decoder))
        case "conversation.item.created":
            return .conversationItemCreated(try ConversationItemCreated(from: decoder))
        default:
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown event type: \(type)")
        }
    }

    private static func decodeAudioBufferEvent(type: String, decoder: Decoder) throws -> ServerEvent {
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
            fatalError("Unknown audio buffer event: \(type)")
        }
    }

    private static func decodeResponseStructureEvent(type: String, decoder: Decoder) throws -> ServerEvent {
        switch type {
        case "response.created":
            return .responseCreated(try ResponseCreated(from: decoder))
        case "response.output_item.added":
            return .responseOutputItemAdded(try ResponseOutputItem(from: decoder))
        case "response.output_item.done":
            return .responseOutputItemDone(try ResponseOutputItem(from: decoder))
        case "response.content_part.added":
            return .responseContentPartAdded(try ResponseContentPart(from: decoder))
        case "response.content_part.done":
            return .responseContentPartDone(try ResponseContentPart(from: decoder))
        default:
            fatalError("Unknown response structure event: \(type)")
        }
    }

    private static func decodeResponseContentEvent(type: String, decoder: Decoder) throws -> ServerEvent {
        switch type {
        case "response.text.delta":
            return .responseTextDelta(try TextDelta(from: decoder))
        case "response.text.done":
            return .responseTextDone(try TextDone(from: decoder))
        case "response.audio_transcript.delta":
            return .responseAudioTranscriptDelta(try AudioTranscriptDelta(from: decoder))
        case "response.audio_transcript.done":
            return .responseAudioTranscriptDone(try AudioTranscriptDone(from: decoder))
        case "response.audio.delta":
            return .responseAudioDelta(try AudioDelta(from: decoder))
        case "response.audio.done":
            return .responseAudioDone
        case "response.done":
            return .responseDone(try ResponseDone(from: decoder))
        default:
            fatalError("Unknown response content event: \(type)")
        }
    }

    private static func decodeMetaEvent(type: String, decoder: Decoder, container: KeyedDecodingContainer<CodingKeys>) throws -> ServerEvent {
        switch type {
        case "rate_limits.updated":
            return .rateLimitsUpdated(try RateLimits(from: decoder))
        case "error":
            return .error(try ServerError(from: decoder))
        default:
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown event type: \(type)")
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
