import Foundation
import SwiftData

/// Types of curiosity content
enum CuriosityContentType: String, Codable {
    case video
    case experiment
    case article
    case interactive
    case podcast
}

/// Curiosity content recommendation
@Model
final class CuriosityContent {
    var id = UUID()
    var title: String
    var description: String
    var contentType: CuriosityContentType
    var url: String?
    var thumbnailURL: String?
    var subject: String // Subject.rawValue
    var topics: [String] = []
    var difficulty: Int = 1 // 1-5
    var estimatedMinutes: Int = 10
    var metadata: [String: String] = [:]
    var createdAt = Date()
    var lastRecommendedAt: Date?
    var viewCount: Int = 0

    init(
        title: String,
        description: String,
        contentType: CuriosityContentType,
        url: String? = nil,
        subject: String,
        topics: [String] = [],
        difficulty: Int = 1,
        estimatedMinutes: Int = 10
    ) {
        self.title = title
        self.description = description
        self.contentType = contentType
        self.url = url
        self.subject = subject
        self.topics = topics
        self.difficulty = difficulty
        self.estimatedMinutes = estimatedMinutes
    }

    /// Mark content as viewed
    func markViewed() {
        viewCount += 1
        lastRecommendedAt = Date()
    }
}

/// User's curiosity interaction history
@Model
final class CuriosityInteraction {
    var id = UUID()
    var contentID: UUID
    var userProgressID: UUID?
    var viewedAt = Date()
    var completed: Bool = false
    var rating: Int? // 1-5
    var notes: String?

    init(contentID: UUID, userProgressID: UUID? = nil) {
        self.contentID = contentID
        self.userProgressID = userProgressID
    }
}
