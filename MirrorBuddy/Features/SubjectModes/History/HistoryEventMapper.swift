import Foundation

/// Creates mind maps showing connections between historical events
@MainActor
final class HistoryEventMapper {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    /// Create a connection map showing relationships between events
    func createConnectionMap(events: [HistoricalEvent]) async throws -> EventConnectionMap {
        let prompt = createConnectionPrompt(events: events)

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: """
            You are a history expert specializing in analyzing historical connections. \
            Identify causal relationships, influences, and connections between events. \
            Return valid JSON only.
            """
        )

        guard let data = response.data(using: .utf8),
              let connectionData = try? JSONDecoder().decode(ConnectionMapData.self, from: data) else {
            throw HistoryModeError.generationFailed("Failed to parse connection map")
        }

        return EventConnectionMap(
            events: events,
            connections: connectionData.connections,
            clusters: connectionData.clusters
        )
    }

    private func createConnectionPrompt(events: [HistoricalEvent]) -> String {
        let eventsJSON = events.map { event in
            """
            {
              "id": "\(event.id.uuidString)",
              "title": "\(event.title)",
              "year": \(event.year),
              "category": "\(event.category.rawValue)"
            }
            """
        }.joined(separator: ",\n")

        return """
        Analyze these historical events and identify connections between them:

        [\(eventsJSON)]

        For each connection, identify:
        1. Source event ID
        2. Target event ID
        3. Connection type (causal, influential, contemporary, thematic)
        4. Strength (1-5)
        5. Description of the connection

        Also group events into thematic clusters.

        Return JSON in this format:
        {
          "connections": [
            {
              "sourceId": "uuid",
              "targetId": "uuid",
              "type": "causal",
              "strength": 5,
              "description": "Event A directly caused Event B"
            }
          ],
          "clusters": [
            {
              "theme": "Military Conflicts",
              "eventIds": ["uuid1", "uuid2"]
            }
          ]
        }
        """
    }

    private struct ConnectionMapData: Codable {
        let connections: [EventConnection]
        let clusters: [EventCluster]
    }
}

// MARK: - Event Connection Map

struct EventConnectionMap: Identifiable {
    let id = UUID()
    let events: [HistoricalEvent]
    let connections: [EventConnection]
    let clusters: [EventCluster]

    /// Get all connections for a specific event
    func connections(for eventId: UUID) -> [EventConnection] {
        connections.filter { $0.sourceId == eventId || $0.targetId == eventId }
    }

    /// Get events in a specific cluster
    func events(in cluster: EventCluster) -> [HistoricalEvent] {
        events.filter { event in
            cluster.eventIds.contains(event.id.uuidString)
        }
    }

    /// Get strongly connected events (strength >= 4)
    var strongConnections: [EventConnection] {
        connections.filter { $0.strength >= 4 }
    }
}

struct EventConnection: Codable, Identifiable {
    let id: UUID
    let sourceId: UUID
    let targetId: UUID
    let type: ConnectionType
    let strength: Int // 1-5
    let description: String

    enum ConnectionType: String, Codable {
        case causal
        case influential
        case contemporary
        case thematic

        var displayName: String {
            switch self {
            case .causal: return "Caused By"
            case .influential: return "Influenced By"
            case .contemporary: return "Contemporary With"
            case .thematic: return "Related To"
            }
        }

        var color: String {
            switch self {
            case .causal: return "red"
            case .influential: return "blue"
            case .contemporary: return "green"
            case .thematic: return "purple"
            }
        }
    }

    init(id: UUID = UUID(), sourceId: UUID, targetId: UUID, type: ConnectionType, strength: Int, description: String) {
        self.id = id
        self.sourceId = sourceId
        self.targetId = targetId
        self.type = type
        self.strength = strength
        self.description = description
    }

    // Custom decoding to handle string UUIDs from API
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()

        let sourceIdString = try container.decode(String.self, forKey: .sourceId)
        let targetIdString = try container.decode(String.self, forKey: .targetId)

        guard let sourceUUID = UUID(uuidString: sourceIdString),
              let targetUUID = UUID(uuidString: targetIdString) else {
            throw DecodingError.dataCorruptedError(
                forKey: .sourceId,
                in: container,
                debugDescription: "Invalid UUID string"
            )
        }

        self.sourceId = sourceUUID
        self.targetId = targetUUID
        self.type = try container.decode(ConnectionType.self, forKey: .type)
        self.strength = try container.decode(Int.self, forKey: .strength)
        self.description = try container.decode(String.self, forKey: .description)
    }

    private enum CodingKeys: String, CodingKey {
        case sourceId, targetId, type, strength, description
    }
}

struct EventCluster: Codable, Identifiable {
    let id: UUID
    let theme: String
    let eventIds: [String] // String UUIDs from API

    init(id: UUID = UUID(), theme: String, eventIds: [String]) {
        self.id = id
        self.theme = theme
        self.eventIds = eventIds
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.theme = try container.decode(String.self, forKey: .theme)
        self.eventIds = try container.decode([String].self, forKey: .eventIds)
    }

    private enum CodingKeys: String, CodingKey {
        case theme, eventIds
    }
}
