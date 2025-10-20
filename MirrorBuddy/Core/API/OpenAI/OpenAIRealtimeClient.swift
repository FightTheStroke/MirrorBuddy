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
