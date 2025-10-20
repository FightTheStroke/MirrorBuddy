import Foundation
import SwiftData
import Combine

/// Quest type for weekly challenges
enum QuestType: String, Codable {
    case studyStreak
    case flashcardMastery
    case mindMapCreation
    case topicExploration
    case curiosityExplorer
    case materialCreation
    case voiceConversation
}

/// Quest status
enum QuestStatus: String, Codable {
    case active
    case completed
    case expired
    case claimed
}

/// Quest difficulty
enum QuestDifficulty: String, Codable {
    case easy
    case medium
    case hard
    case legendary

    nonisolated var xpMultiplier: Double {
        switch self {
        case .easy: return 1.0
        case .medium: return 1.5
        case .hard: return 2.0
        case .legendary: return 3.0
        }
    }
}

/// Weekly quest template
struct QuestTemplate {
    let type: QuestType
    let title: String
    let description: String
    let iconName: String
    let difficulty: QuestDifficulty
    let targetValue: Int
    let baseXP: Int

    var totalXP: Int {
        Int(Double(baseXP) * difficulty.xpMultiplier)
    }
}

/// Weekly quest instance
@Model
final class WeeklyQuest {
    var id = UUID()
    var questType: QuestType
    var title: String
    var questDescription: String
    var iconName: String
    var difficulty: QuestDifficulty
    var targetValue: Int
    var currentValue: Int = 0
    var baseXP: Int
    var status: QuestStatus = QuestStatus.active
    var startDate: Date
    var endDate: Date
    var completedAt: Date?
    var claimedAt: Date?

    init(template: QuestTemplate, startDate: Date, endDate: Date) {
        self.questType = template.type
        self.title = template.title
        self.questDescription = template.description
        self.iconName = template.iconName
        self.difficulty = template.difficulty
        self.targetValue = template.targetValue
        self.baseXP = template.baseXP
        self.startDate = startDate
        self.endDate = endDate
    }

    /// Progress percentage (0.0 - 1.0)
    var progress: Double {
        guard targetValue > 0 else { return 0.0 }
        return min(Double(currentValue) / Double(targetValue), 1.0)
    }

    /// Is quest completed but not yet claimed
    var isReadyToClaim: Bool {
        status == .completed && claimedAt == nil
    }

    /// Total XP reward
    var totalXP: Int {
        Int(Double(baseXP) * difficulty.xpMultiplier)
    }

    /// Update progress
    func updateProgress(_ value: Int) {
        currentValue = min(value, targetValue)
        if currentValue >= targetValue && status == .active {
            status = .completed
            completedAt = Date()
        }
    }

    /// Increment progress
    func incrementProgress(by amount: Int = 1) {
        updateProgress(currentValue + amount)
    }

    /// Claim reward
    func claimReward() {
        guard status == .completed else { return }
        status = .claimed
        claimedAt = Date()
    }

    /// Check if quest is expired
    func checkExpiration() {
        if status == .active && Date() > endDate {
            status = .expired
        }
    }
}

/// Quest badge/achievement
@Model
final class QuestBadge {
    var id = UUID()
    var name: String
    var questDescription: String
    var iconName: String
    var color: String
    var unlockedAt: Date
    var questID: UUID?

    init(name: String, description: String, iconName: String, color: String, questID: UUID? = nil) {
        self.name = name
        self.questDescription = description
        self.iconName = iconName
        self.color = color
        self.unlockedAt = Date()
        self.questID = questID
    }
}
