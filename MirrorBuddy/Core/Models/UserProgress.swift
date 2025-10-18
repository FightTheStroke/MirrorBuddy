import Foundation
import SwiftData

/// Achievement types for gamification
enum Achievement: String, Codable, CaseIterable {
    case firstMaterial
    case firstFlashcard
    case firstMindMap
    case streak7Days
    case streak30Days
    case complete100Flashcards
    case completeAllSubjects

    var iconName: String {
        switch self {
        case .firstMaterial: return "doc.fill"
        case .firstFlashcard: return "rectangle.portrait.on.rectangle.portrait.fill"
        case .firstMindMap: return "brain.head.profile"
        case .streak7Days: return "flame.fill"
        case .streak30Days: return "flame.circle.fill"
        case .complete100Flashcards: return "star.fill"
        case .completeAllSubjects: return "rosette"
        }
    }

    /// Localized achievement title
    var localizedTitle: String {
        String(localized: "achievement.\(rawValue)")
    }

    /// Localized achievement description
    var localizedDescription: String {
        String(localized: "achievement.\(rawValue).desc")
    }
}

/// User progress tracking and gamification
@Model
final class UserProgress {
    var id = UUID()

    // Study statistics
    var totalStudyTimeMinutes: Int = 0
    var materialsCreated: Int = 0
    var flashcardsReviewed: Int = 0
    var tasksCompleted: Int = 0
    var mindMapsGenerated: Int = 0

    // Streak tracking
    var currentStreak: Int = 0
    var longestStreak: Int = 0
    var lastStudyDate: Date?

    // Achievements
    var unlockedAchievements: [Achievement] = []

    // XP and levels (gamification)
    var totalXP: Int = 0
    var level: Int = 1

    var createdAt = Date()

    init() {
        self.id = UUID()
        self.totalStudyTimeMinutes = 0
        self.materialsCreated = 0
        self.flashcardsReviewed = 0
        self.tasksCompleted = 0
        self.mindMapsGenerated = 0
        self.currentStreak = 0
        self.longestStreak = 0
        self.totalXP = 0
        self.level = 1
        self.createdAt = Date()
    }

    /// Add XP and check for level up
    func addXP(_ amount: Int) {
        totalXP += amount

        // Level up every 100 XP
        let newLevel = (totalXP / 100) + 1
        if newLevel > level {
            level = newLevel
        }
    }

    /// Update streak based on study activity
    func updateStreak() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        guard let lastStudy = lastStudyDate else {
            // First study session
            currentStreak = 1
            lastStudyDate = today
            return
        }

        let lastStudyDay = calendar.startOfDay(for: lastStudy)
        let daysBetween = calendar.dateComponents([.day], from: lastStudyDay, to: today).day ?? 0

        switch daysBetween {
        case 0:
            // Same day - no change
            break
        case 1:
            // Consecutive day
            currentStreak += 1
            lastStudyDate = today
            if currentStreak > longestStreak {
                longestStreak = currentStreak
            }
        default:
            // Streak broken
            currentStreak = 1
            lastStudyDate = today
        }

        // Check for streak achievements
        checkStreakAchievements()
    }

    /// Check and unlock streak-based achievements
    private func checkStreakAchievements() {
        if currentStreak >= 7 && !unlockedAchievements.contains(.streak7Days) {
            unlockAchievement(.streak7Days)
        }
        if currentStreak >= 30 && !unlockedAchievements.contains(.streak30Days) {
            unlockAchievement(.streak30Days)
        }
    }

    /// Unlock an achievement
    func unlockAchievement(_ achievement: Achievement) {
        guard !unlockedAchievements.contains(achievement) else { return }
        unlockedAchievements.append(achievement)
        addXP(50) // Bonus XP for achievements
    }

    /// XP required for next level
    var xpForNextLevel: Int {
        level * 100
    }

    /// Progress to next level (0.0 - 1.0)
    var levelProgress: Double {
        let currentLevelXP = (level - 1) * 100
        let xpInCurrentLevel = totalXP - currentLevelXP
        return Double(xpInCurrentLevel) / Double(100)
    }
}
