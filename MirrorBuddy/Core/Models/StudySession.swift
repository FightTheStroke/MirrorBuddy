import Foundation
import SwiftData

/// Represents a single study session for tracking study time
@Model
final class StudySession {
    var id: UUID
    var date: Date
    var durationMinutes: Int
    var subject: String?

    @Relationship(deleteRule: .nullify)
    var materialsStudied: [Material]?

    var startTime: Date?
    var endTime: Date?
    var isPaused: Bool = false
    var pauseStartTime: Date?
    var totalPausedMinutes: Int = 0

    // XP earned from this session
    var xpEarned: Int = 0

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        durationMinutes: Int = 0,
        subject: String? = nil,
        materialsStudied: [Material]? = nil
    ) {
        self.id = id
        self.date = date
        self.durationMinutes = durationMinutes
        self.subject = subject
        self.materialsStudied = materialsStudied
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
