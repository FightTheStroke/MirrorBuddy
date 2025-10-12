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

    // Callbacks
    var onMessage: ((RealtimeMessage) -> Void)?
    var onError: ((Error) -> Void)?
    var onConnected: (() -> Void)?
    var onDisconnected: (() -> Void)?

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
        onConnected?()
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
                }
            }
        }
    }

    /// Handle received message
    private func handleMessage(text: String) {
        let decoder = JSONDecoder()
        guard let data = text.data(using: .utf8),
              let message = try? decoder.decode(RealtimeMessage.self, from: data) else {
            return
        }

        onMessage?(message)
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
        // Simplified decoding - would need full implementation
        self = .serverEvent(.responseDone)
    }
}

// MARK: - Client Events

enum ClientEvent: Codable {
    case conversationItemCreate(ConversationItemCreate)
    case responseCreate(ResponseCreate)
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

enum ConversationItem: Codable {
    case message(ConversationMessage)
}

struct ConversationMessage: Codable {
    let id: String
    let type: String = "message"
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
    case responseCreated
    case responseOutputItemAdded
    case responseContentPartAdded
    case responseTextDelta(TextDelta)
    case responseOutputItemDone
    case responseDone
}

struct TextDelta: Codable {
    let delta: String
}
