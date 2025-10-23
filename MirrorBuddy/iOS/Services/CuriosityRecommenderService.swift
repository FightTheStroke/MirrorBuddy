import Foundation
import os.log
import SwiftData

/// Service for recommending curiosity content based on subjects and topics
@MainActor
final class CuriosityRecommenderService {
    static let shared = CuriosityRecommenderService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "CuriosityRecommender")
    private var modelContext: ModelContext?

    private init() {}

    // MARK: - Configuration

    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Curiosity recommender service configured")
    }

    // MARK: - Content Recommendations

    /// Get recommended content for a subject and optional topics
    func getRecommendations(
        for subject: String,
        topics: [String] = [],
        limit: Int = 5
    ) throws -> [CuriosityContent] {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        // Fetch content matching subject
        let predicate = #Predicate<CuriosityContent> { content in
            content.subject == subject
        }

        var descriptor = FetchDescriptor<CuriosityContent>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.viewCount, order: .forward)]
        )
        descriptor.fetchLimit = limit * 2 // Fetch more for filtering

        var allContent = try context.fetch(descriptor)

        // Filter by topics if provided
        if !topics.isEmpty {
            allContent = allContent.filter { content in
                !Set(content.topics).isDisjoint(with: Set(topics))
            }
        }

        // Sort by relevance (least viewed first, then by last recommended date)
        allContent.sort { lhs, rhs in
            if lhs.viewCount != rhs.viewCount {
                return lhs.viewCount < rhs.viewCount
            }
            if let lhsDate = lhs.lastRecommendedAt, let rhsDate = rhs.lastRecommendedAt {
                return lhsDate < rhsDate
            }
            return lhs.lastRecommendedAt == nil
        }

        return Array(allContent.prefix(limit))
    }

    /// Get personalized recommendations based on user progress
    func getPersonalizedRecommendations(
        for userProgress: UserProgress,
        limit: Int = 5
    ) throws -> [CuriosityContent] {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        // Fetch user's recent interactions
        let userID = userProgress.id
        let interactionPredicate = #Predicate<CuriosityInteraction> { interaction in
            interaction.userProgressID == userID
        }
        let interactionDescriptor = FetchDescriptor<CuriosityInteraction>(
            predicate: interactionPredicate,
            sortBy: [SortDescriptor(\.viewedAt, order: .reverse)]
        )

        let interactions = try context.fetch(interactionDescriptor)
        let viewedContentIDs = Set(interactions.map { $0.contentID })

        // Fetch all content
        let allDescriptor = FetchDescriptor<CuriosityContent>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        var allContent = try context.fetch(allDescriptor)

        // Filter out already viewed content
        allContent = allContent.filter { !viewedContentIDs.contains($0.id) }

        // Sort by difficulty matching user level
        let userLevel = userProgress.level
        allContent.sort { lhs, rhs in
            let lhsDiff = abs(lhs.difficulty - (userLevel / 10))
            let rhsDiff = abs(rhs.difficulty - (userLevel / 10))
            return lhsDiff < rhsDiff
        }

        return Array(allContent.prefix(limit))
    }

    /// Record content interaction
    func recordInteraction(
        contentID: UUID,
        userProgressID: UUID?,
        completed: Bool = false,
        rating: Int? = nil
    ) throws {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        // Create interaction
        let interaction = CuriosityInteraction(
            contentID: contentID,
            userProgressID: userProgressID
        )
        interaction.completed = completed
        interaction.rating = rating

        context.insert(interaction)

        // Update content view count
        if let content = try fetchContent(id: contentID) {
            content.markViewed()
        }

        try context.save()
        logger.info("Recorded curiosity interaction for content \(contentID)")
    }

    // MARK: - Content Management

    /// Add new curiosity content
    func addContent(_ content: CuriosityContent) throws {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        context.insert(content)
        try context.save()

        logger.info("Added curiosity content: \(content.title)")
    }

    /// Fetch specific content by ID
    func fetchContent(id: UUID) throws -> CuriosityContent? {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let predicate = #Predicate<CuriosityContent> { content in
            content.id == id
        }
        let descriptor = FetchDescriptor<CuriosityContent>(predicate: predicate)
        return try context.fetch(descriptor).first
    }

    /// Seed initial content (call once on first launch)
    func seedInitialContent() throws {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let mathContent = [
            CuriosityContent(
                title: "Fractals in Nature",
                contentDescription: "Explore the mathematical patterns found in snowflakes, trees, and coastlines",
                contentType: .video,
                subject: Subject.matematica.rawValue,
                topics: ["geometry", "patterns", "nature"],
                difficulty: 2,
                estimatedMinutes: 15
            ),
            CuriosityContent(
                title: "Build a Fibonacci Spiral",
                contentDescription: "Create your own golden spiral using paper and compass",
                contentType: .experiment,
                subject: Subject.matematica.rawValue,
                topics: ["fibonacci", "geometry", "art"],
                difficulty: 2,
                estimatedMinutes: 30
            )
        ]

        let scienceContent = [
            CuriosityContent(
                title: "Water Cycle Experiment",
                contentDescription: "Create a mini water cycle in a jar",
                contentType: .experiment,
                subject: Subject.scienzeNaturali.rawValue,
                topics: ["water", "climate", "environment"],
                difficulty: 1,
                estimatedMinutes: 45
            ),
            CuriosityContent(
                title: "How Plants Breathe",
                contentDescription: "Learn about photosynthesis through interactive demonstrations",
                contentType: .interactive,
                subject: Subject.scienzeNaturali.rawValue,
                topics: ["plants", "photosynthesis", "biology"],
                difficulty: 2,
                estimatedMinutes: 20
            )
        ]

        let physicsContent = [
            CuriosityContent(
                title: "Build a Simple Circuit",
                contentDescription: "Learn about electricity by building your first circuit",
                contentType: .experiment,
                subject: Subject.fisica.rawValue,
                topics: ["electricity", "circuits", "energy"],
                difficulty: 2,
                estimatedMinutes: 40
            ),
            CuriosityContent(
                title: "Newton's Laws in Action",
                contentDescription: "See how forces work in everyday life",
                contentType: .video,
                subject: Subject.fisica.rawValue,
                topics: ["forces", "motion", "mechanics"],
                difficulty: 2,
                estimatedMinutes: 15
            )
        ]

        let historyContent = [
            CuriosityContent(
                title: "Ancient Rome Virtual Tour",
                contentDescription: "Explore the Colosseum and Roman Forum in 3D",
                contentType: .interactive,
                subject: Subject.storiaGeografia.rawValue,
                topics: ["rome", "ancient", "architecture"],
                difficulty: 1,
                estimatedMinutes: 25
            )
        ]

        let allContent = mathContent + scienceContent + physicsContent + historyContent

        for content in allContent {
            context.insert(content)
        }

        try context.save()
        logger.info("Seeded \(allContent.count) curiosity content items")
    }
}

// MARK: - Error Types

enum ServiceError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Service not configured with ModelContext"
        }
    }
}
