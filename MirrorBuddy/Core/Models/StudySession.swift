import Foundation
import SwiftData

/// Represents a single study session for tracking study time
@Model
final class StudySession {
    // CloudKit requires all non-optional properties to have default values
    var id: UUID
    var date: Date
    var durationMinutes: Int
    var subject: String?

    // CloudKit requires all relationships to have an inverse
    // For many-to-many, use @Relationship on both sides but ONLY specify inverse on one side
    @Relationship
    var materialsStudied: [Material]?

    var startTime: Date?
    var endTime: Date?
    var isPaused: Bool
    var pauseStartTime: Date?
    var totalPausedMinutes: Int

    // XP earned from this session
    var xpEarned: Int

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        durationMinutes: Int = 0,
        subject: String? = nil
    ) {
        // CloudKit-compliant initialization with default values
        self.id = id
        self.date = date
        self.durationMinutes = durationMinutes
        self.subject = subject
        // Note: materialsStudied relationship managed by SwiftData @Relationship macro
        self.startTime = date
        self.isPaused = false
        self.totalPausedMinutes = 0
        self.xpEarned = 0
    }

    /// Calculate XP based on study duration (1 XP per minute)
    func calculateXP() -> Int {
        durationMinutes
    }
}
