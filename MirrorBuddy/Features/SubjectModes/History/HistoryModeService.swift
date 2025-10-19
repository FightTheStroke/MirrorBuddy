import Foundation
import MapKit

/// Service coordinating all History mode specialized features
@MainActor
final class HistoryModeService: ObservableObject {
    @Published var currentEra: HistoricalEra?
    @Published var activeTimeline: Timeline?
    @Published var characterProfiles: [CharacterProfile] = []
    @Published var mapLocations: [HistoricalLocation] = []

    private let geminiClient: GeminiClient
    private let timelineGenerator: HistoryTimelineGenerator
    private let eventMapper: HistoryEventMapper
    private let eraSummaryGenerator: EraSummaryGenerator
    private let dateMemorizationTool: DateMemorizationTool

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
        self.timelineGenerator = HistoryTimelineGenerator(geminiClient: geminiClient)
        self.eventMapper = HistoryEventMapper(geminiClient: geminiClient)
        self.eraSummaryGenerator = EraSummaryGenerator(geminiClient: geminiClient)
        self.dateMemorizationTool = DateMemorizationTool()
    }

    // MARK: - Timeline Management

    /// Generate a timeline for a specific historical period
    func generateTimeline(
        topic: String,
        startYear: Int,
        endYear: Int
    ) async throws -> Timeline {
        let timeline = try await timelineGenerator.generateTimeline(
            topic: topic,
            startYear: startYear,
            endYear: endYear
        )

        await MainActor.run {
            self.activeTimeline = timeline
        }

        return timeline
    }

    // MARK: - Event Mapping

    /// Create a mind map showing connections between historical events
    func createEventConnectionMap(events: [HistoricalEvent]) async throws -> EventConnectionMap {
        return try await eventMapper.createConnectionMap(events: events)
    }

    // MARK: - Character Profiles

    /// Generate a detailed profile for a historical character
    func generateCharacterProfile(name: String, context: String?) async throws -> CharacterProfile {
        let prompt = HistoryPrompts.characterProfilePrompt(characterName: name, context: context)
        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a history expert. Provide accurate, well-researched information about historical figures."
        )

        guard let data = response.data(using: .utf8),
              let profile = try? JSONDecoder().decode(CharacterProfile.self, from: data) else {
            throw HistoryModeError.invalidProfileData
        }

        await MainActor.run {
            self.characterProfiles.append(profile)
        }

        return profile
    }

    // MARK: - Interactive Maps

    /// Generate historical locations for map display
    func generateHistoricalMap(
        topic: String,
        era: HistoricalEra
    ) async throws -> [HistoricalLocation] {
        let prompt = HistoryPrompts.historicalMapPrompt(topic: topic, era: era)
        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a geography and history expert. Provide accurate location data."
        )

        guard let data = response.data(using: .utf8),
              let locations = try? JSONDecoder().decode([HistoricalLocation].self, from: data) else {
            throw HistoryModeError.invalidLocationData
        }

        await MainActor.run {
            self.mapLocations = locations
        }

        return locations
    }

    // MARK: - Era Summaries

    /// Generate a comprehensive summary of a historical era
    func generateEraSummary(era: HistoricalEra) async throws -> EraSummary {
        let summary = try await eraSummaryGenerator.generateSummary(era: era)

        await MainActor.run {
            self.currentEra = era
        }

        return summary
    }

    // MARK: - Date Memorization

    /// Create a memorization exercise for important dates
    func createDateMemorizationExercise(
        events: [HistoricalEvent],
        difficulty: DateMemorizationDifficulty
    ) -> DateMemorizationExercise {
        return dateMemorizationTool.createExercise(events: events, difficulty: difficulty)
    }

    /// Check answers for a date memorization exercise
    func checkDateMemorizationAnswers(
        exercise: DateMemorizationExercise,
        answers: [String: String]
    ) -> DateMemorizationResult {
        return dateMemorizationTool.checkAnswers(exercise: exercise, answers: answers)
    }
}

// MARK: - Supporting Types

struct HistoricalEvent: Codable, Identifiable {
    let id: UUID
    let title: String
    let date: String
    let year: Int
    let description: String
    let significance: String
    let relatedEvents: [UUID]?
    let category: EventCategory

    enum EventCategory: String, Codable {
        case political
        case military
        case cultural
        case economic
        case social
        case technological
    }

    init(
        id: UUID = UUID(),
        title: String,
        date: String,
        year: Int,
        description: String,
        significance: String,
        relatedEvents: [UUID]? = nil,
        category: EventCategory
    ) {
        self.id = id
        self.title = title
        self.date = date
        self.year = year
        self.description = description
        self.significance = significance
        self.relatedEvents = relatedEvents
        self.category = category
    }
}

struct Timeline: Codable, Identifiable {
    let id: UUID
    let topic: String
    let startYear: Int
    let endYear: Int
    let events: [HistoricalEvent]
    let createdAt: Date

    init(
        id: UUID = UUID(),
        topic: String,
        startYear: Int,
        endYear: Int,
        events: [HistoricalEvent],
        createdAt: Date = Date()
    ) {
        self.id = id
        self.topic = topic
        self.startYear = startYear
        self.endYear = endYear
        self.events = events
        self.createdAt = createdAt
    }
}

struct CharacterProfile: Codable, Identifiable {
    let id: UUID
    let name: String
    let birthDate: String?
    let deathDate: String?
    let nationality: String
    let occupation: String
    let biography: String
    let majorAccomplishments: [String]
    let historicalSignificance: String
    let relatedFigures: [String]
    let interestingFacts: [String]

    init(
        id: UUID = UUID(),
        name: String,
        birthDate: String?,
        deathDate: String?,
        nationality: String,
        occupation: String,
        biography: String,
        majorAccomplishments: [String],
        historicalSignificance: String,
        relatedFigures: [String],
        interestingFacts: [String]
    ) {
        self.id = id
        self.name = name
        self.birthDate = birthDate
        self.deathDate = deathDate
        self.nationality = nationality
        self.occupation = occupation
        self.biography = biography
        self.majorAccomplishments = majorAccomplishments
        self.historicalSignificance = historicalSignificance
        self.relatedFigures = relatedFigures
        self.interestingFacts = interestingFacts
    }
}

struct HistoricalLocation: Codable, Identifiable {
    let id: UUID
    let name: String
    let latitude: Double
    let longitude: Double
    let description: String
    let historicalSignificance: String
    let timeframe: String
    let relatedEvents: [String]

    init(
        id: UUID = UUID(),
        name: String,
        latitude: Double,
        longitude: Double,
        description: String,
        historicalSignificance: String,
        timeframe: String,
        relatedEvents: [String]
    ) {
        self.id = id
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.description = description
        self.historicalSignificance = historicalSignificance
        self.timeframe = timeframe
        self.relatedEvents = relatedEvents
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

struct HistoricalEra: Codable {
    let name: String
    let startYear: Int
    let endYear: Int
    let region: String
    let description: String

    init(name: String, startYear: Int, endYear: Int, region: String, description: String) {
        self.name = name
        self.startYear = startYear
        self.endYear = endYear
        self.region = region
        self.description = description
    }
}

struct EraSummary: Codable {
    let era: HistoricalEra
    let keyEvents: [String]
    let majorFigures: [String]
    let culturalDevelopments: [String]
    let politicalStructure: String
    let economicConditions: String
    let socialStructure: String
    let technologicalAdvances: [String]
    let legacyAndImpact: String
}

enum HistoryModeError: Error, LocalizedError {
    case invalidProfileData
    case invalidLocationData
    case invalidTimelineData
    case generationFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidProfileData:
            return "Failed to parse character profile data"
        case .invalidLocationData:
            return "Failed to parse historical location data"
        case .invalidTimelineData:
            return "Failed to parse timeline data"
        case .generationFailed(let reason):
            return "Generation failed: \(reason)"
        }
    }
}
