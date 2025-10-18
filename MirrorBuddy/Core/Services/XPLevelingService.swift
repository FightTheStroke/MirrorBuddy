import Foundation
import os.log
import SwiftData

/// XP and Leveling service for gamification (Task 46)
@MainActor
final class XPLevelingService {
    static let shared = XPLevelingService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "XPLeveling")

    private var modelContext: ModelContext?

    private init() {}

    // MARK: - Configuration

    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("XP leveling service configured")
    }

    // MARK: - XP Awards (Subtask 46.1)

    enum XPActivity {
        case taskCompleted(priority: Int, onTime: Bool)
        case flashcardReviewed(difficulty: FlashcardDifficulty)
        case studySessionCompleted(minutes: Int)
        case materialCreated
        case mindMapCreated
        case dailyStreakBonus(days: Int)
        case achievementUnlocked
        case challengeCompleted

        var baseXP: Int {
            switch self {
            case .taskCompleted(let priority, let onTime):
                let base = 10 + (priority - 1) * 5
                return onTime ? base + 10 : max(base / 2, 5)
            case .flashcardReviewed(let difficulty):
                switch difficulty {
                case .easy: return 2
                case .medium: return 5
                case .hard: return 10
                }
            case .studySessionCompleted(let minutes):
                return min(minutes, 120) // Max 120 XP per session
            case .materialCreated:
                return 30
            case .mindMapCreated:
                return 50
            case .dailyStreakBonus(let days):
                return min(days * 10, 100) // Max 100 XP bonus
            case .achievementUnlocked:
                return 100
            case .challengeCompleted:
                return 150
            }
        }
    }

    /// Award XP for an activity
    func awardXP(
        for activity: XPActivity,
        to userProgress: UserProgress
    ) -> XPAward {
        let xp = activity.baseXP
        let previousLevel = userProgress.level

        // Use existing addXP method
        userProgress.addXP(xp)
        let newLevel = userProgress.level
        let leveledUp = newLevel > previousLevel

        if leveledUp {
            logger.info("User leveled up to level \(newLevel)!")
        }

        // Save context
        if let context = modelContext {
            try? context.save()
        }

        logger.info("Awarded \(xp) XP for activity")

        return XPAward(
            xpEarned: xp,
            previousLevel: previousLevel,
            newLevel: newLevel,
            leveledUp: leveledUp,
            activity: activity,
            timestamp: Date()
        )
    }

    // MARK: - Level Progression (Subtask 46.2)

    /// Calculate XP required for a specific level (exponential curve)
    func xpRequiredForLevel(_ level: Int) -> Int {
        guard level > 1 && level <= 100 else { return 0 }

        // Exponential formula: XP = baseXP * (level ^ 1.5)
        let baseXP = 100.0
        let exponent = 1.5
        return Int(baseXP * pow(Double(level), exponent))
    }

    /// Get total XP required to reach a level from level 1
    func totalXPForLevel(_ level: Int) -> Int {
        var total = 0
        for lvl in 2...level {
            total += xpRequiredForLevel(lvl)
        }
        return total
    }

    /// Calculate progress to next level (0.0 - 1.0)
    func progressToNextLevel(for userProgress: UserProgress) -> Double {
        let required = xpRequiredForLevel(userProgress.level + 1)
        guard required > 0 else { return 1.0 }

        // Calculate XP within current level
        let totalXPForPreviousLevel = totalXPForLevel(userProgress.level)
        let currentLevelXP = userProgress.totalXP - totalXPForPreviousLevel

        return Double(currentLevelXP) / Double(required)
    }

    /// Get level from total XP
    func levelFromTotalXP(_ totalXP: Int) -> Int {
        var level = 1
        var accumulatedXP = 0

        while level < 100 {
            let nextLevelXP = xpRequiredForLevel(level + 1)
            if accumulatedXP + nextLevelXP > totalXP {
                break
            }
            accumulatedXP += nextLevelXP
            level += 1
        }

        return level
    }

    // MARK: - Daily Streaks (Subtask 46.1)

    /// Update daily streak and award bonus XP if applicable
    func updateDailyStreak(for userProgress: UserProgress) -> XPAward? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        // Check last activity date
        guard let lastActivity = userProgress.lastStudyDate else {
            // First activity ever
            userProgress.lastStudyDate = today
            userProgress.currentStreak = 1
            try? modelContext?.save()
            return nil
        }

        let lastActivityDay = calendar.startOfDay(for: lastActivity)

        // Same day - no change
        if lastActivityDay == today {
            return nil
        }

        // Check if yesterday
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: today),
           lastActivityDay == yesterday {
            // Continue streak
            userProgress.currentStreak += 1
            userProgress.lastStudyDate = today

            if userProgress.currentStreak > userProgress.longestStreak {
                userProgress.longestStreak = userProgress.currentStreak
            }

            try? modelContext?.save()

            // Award streak bonus every 7 days
            if userProgress.currentStreak % 7 == 0 {
                return awardXP(
                    for: .dailyStreakBonus(days: userProgress.currentStreak),
                    to: userProgress
                )
            }
        } else {
            // Streak broken
            logger.warning("Streak broken at \(userProgress.currentStreak) days")
            userProgress.currentStreak = 1
            userProgress.lastStudyDate = today
            try? modelContext?.save()
        }

        return nil
    }

    // MARK: - Statistics (Subtask 46.3)

    /// Get XP statistics for user
    func getXPStatistics(for userProgress: UserProgress) -> XPStatistics {
        let nextLevelXP = xpRequiredForLevel(userProgress.level + 1)
        let progress = progressToNextLevel(for: userProgress)
        let totalXPForPreviousLevel = totalXPForLevel(userProgress.level)
        let currentLevelXP = userProgress.totalXP - totalXPForPreviousLevel

        return XPStatistics(
            totalXP: userProgress.totalXP,
            currentLevel: userProgress.level,
            currentLevelXP: currentLevelXP,
            xpForNextLevel: nextLevelXP,
            progressToNextLevel: progress,
            percentToNextLevel: Int(progress * 100),
            currentStreak: userProgress.currentStreak,
            longestStreak: userProgress.longestStreak,
            rank: getRank(for: userProgress.level)
        )
    }

    /// Get rank title based on level (nonisolated for extension use)
    nonisolated func getRank(for level: Int) -> String {
        switch level {
        case 1...9:
            return "Beginner Scholar"
        case 10...19:
            return "Novice Student"
        case 20...29:
            return "Apprentice Learner"
        case 30...39:
            return "Skilled Scholar"
        case 40...49:
            return "Expert Student"
        case 50...59:
            return "Master Learner"
        case 60...69:
            return "Grand Scholar"
        case 70...79:
            return "Elite Student"
        case 80...89:
            return "Legendary Learner"
        case 90...99:
            return "Supreme Scholar"
        case 100:
            return "Ultimate Master"
        default:
            return "Scholar"
        }
    }

    /// Get milestone rewards for reaching certain levels
    func getMilestoneReward(for level: Int) -> MilestoneReward? {
        guard level % 10 == 0 else { return nil }

        let title: String
        let description: String
        let iconName: String

        switch level {
        case 10:
            title = "First Milestone"
            description = "You've reached level 10!"
            iconName = "star.fill"
        case 25:
            title = "Quarter Century"
            description = "25 levels of dedication!"
            iconName = "trophy.fill"
        case 50:
            title = "Halfway There"
            description = "You're at the halfway point!"
            iconName = "figure.walk"
        case 75:
            title = "Almost There"
            description = "Only 25 more levels to go!"
            iconName = "flag.fill"
        case 100:
            title = "Maximum Level"
            description = "You've reached the peak!"
            iconName = "crown.fill"
        default:
            title = "Level \(level) Reached"
            description = "Keep up the great work!"
            iconName = "star.circle.fill"
        }

        return MilestoneReward(
            level: level,
            title: title,
            description: description,
            iconName: iconName,
            bonusXP: level * 10
        )
    }
}

// MARK: - Models

/// XP award result
struct XPAward {
    let xpEarned: Int
    let previousLevel: Int
    let newLevel: Int
    let leveledUp: Bool
    let activity: XPLevelingService.XPActivity
    let timestamp: Date
}

/// XP statistics
struct XPStatistics {
    let totalXP: Int
    let currentLevel: Int
    let currentLevelXP: Int
    let xpForNextLevel: Int
    let progressToNextLevel: Double
    let percentToNextLevel: Int
    let currentStreak: Int
    let longestStreak: Int
    let rank: String
}

/// Milestone reward
struct MilestoneReward {
    let level: Int
    let title: String
    let description: String
    let iconName: String
    let bonusXP: Int
}

/// Flashcard difficulty for XP calculation
enum FlashcardDifficulty {
    case easy
    case medium
    case hard
}

// MARK: - UserProgress Extensions

extension UserProgress {
    /// Current rank title based on level
    var rankTitle: String {
        switch level {
        case 1...9:
            return "Beginner Scholar"
        case 10...19:
            return "Novice Student"
        case 20...29:
            return "Apprentice Learner"
        case 30...39:
            return "Skilled Scholar"
        case 40...49:
            return "Expert Student"
        case 50...59:
            return "Master Learner"
        case 60...69:
            return "Grand Scholar"
        case 70...79:
            return "Elite Student"
        case 80...89:
            return "Legendary Learner"
        case 90...99:
            return "Supreme Scholar"
        case 100:
            return "Ultimate Master"
        default:
            return "Scholar"
        }
    }
}
