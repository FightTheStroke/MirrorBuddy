import Foundation
import os.log
import SwiftData

/// Service for managing weekly quests and badges
@MainActor
final class WeeklyQuestService {
    static let shared = WeeklyQuestService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "WeeklyQuest")
    private var modelContext: ModelContext?

    private init() {}

    // MARK: - Configuration

    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Weekly quest service configured")
    }

    // MARK: - Quest Templates

    private let questTemplates: [QuestTemplate] = [
        // Easy quests
        QuestTemplate(
            type: .studyStreak,
            title: "Study Streak",
            description: "Study for 3 consecutive days",
            iconName: "flame.fill",
            difficulty: .easy,
            targetValue: 3,
            baseXP: 50
        ),
        QuestTemplate(
            type: .flashcardMastery,
            title: "Flashcard Master",
            description: "Review 20 flashcards",
            iconName: "rectangle.portrait.on.rectangle.portrait.fill",
            difficulty: .easy,
            targetValue: 20,
            baseXP: 40
        ),
        QuestTemplate(
            type: .materialCreation,
            title: "Knowledge Builder",
            description: "Create 3 new study materials",
            iconName: "doc.fill",
            difficulty: .easy,
            targetValue: 3,
            baseXP: 60
        ),

        // Medium quests
        QuestTemplate(
            type: .mindMapCreation,
            title: "Mind Map Explorer",
            description: "Generate 5 mind maps",
            iconName: "brain.head.profile",
            difficulty: .medium,
            targetValue: 5,
            baseXP: 80
        ),
        QuestTemplate(
            type: .topicExploration,
            title: "Topic Explorer",
            description: "Study 3 different subjects",
            iconName: "book.fill",
            difficulty: .medium,
            targetValue: 3,
            baseXP: 70
        ),
        QuestTemplate(
            type: .voiceConversation,
            title: "Voice Learner",
            description: "Complete 5 voice conversations",
            iconName: "waveform",
            difficulty: .medium,
            targetValue: 5,
            baseXP: 90
        ),

        // Hard quests
        QuestTemplate(
            type: .curiosityExplorer,
            title: "Curiosity Champion",
            description: "Explore 10 curiosity contents",
            iconName: "sparkles",
            difficulty: .hard,
            targetValue: 10,
            baseXP: 100
        ),
        QuestTemplate(
            type: .flashcardMastery,
            title: "Flashcard Legend",
            description: "Review 100 flashcards",
            iconName: "star.fill",
            difficulty: .hard,
            targetValue: 100,
            baseXP: 120
        ),

        // Legendary quests
        QuestTemplate(
            type: .studyStreak,
            title: "Legendary Scholar",
            description: "Maintain a 7-day study streak",
            iconName: "crown.fill",
            difficulty: .legendary,
            targetValue: 7,
            baseXP: 200
        )
    ]

    // MARK: - Quest Management

    /// Generate new weekly quests
    func generateWeeklyQuests(count: Int = 3) throws -> [WeeklyQuest] {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let calendar = Calendar.current
        let now = Date()
        guard let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)),
              let endOfWeek = calendar.date(byAdding: .day, value: 7, to: startOfWeek) else {
            throw ServiceError.invalidConfiguration("Failed to calculate week boundaries")
        }

        // Remove old expired quests
        try removeExpiredQuests()

        // Select random templates with varied difficulty
        var selectedTemplates: [QuestTemplate] = []

        // Ensure at least one easy quest
        if let easyQuest = questTemplates.filter({ $0.difficulty == .easy }).randomElement() {
            selectedTemplates.append(easyQuest)
        }

        // Fill remaining slots with random quests
        let remaining = questTemplates.filter { template in
            !selectedTemplates.contains { $0.type == template.type }
        }
        selectedTemplates.append(contentsOf: remaining.shuffled().prefix(count - 1))

        // Create quest instances
        var quests: [WeeklyQuest] = []
        for template in selectedTemplates.prefix(count) {
            let quest = WeeklyQuest(template: template, startDate: startOfWeek, endDate: endOfWeek)
            context.insert(quest)
            quests.append(quest)
        }

        try context.save()
        logger.info("Generated \(quests.count) weekly quests")

        return quests
    }

    /// Get active quests
    func getActiveQuests() throws -> [WeeklyQuest] {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let predicate = #Predicate<WeeklyQuest> { quest in
            quest.status == .active || quest.status == .completed
        }

        let descriptor = FetchDescriptor<WeeklyQuest>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.startDate, order: .reverse)]
        )

        var quests = try context.fetch(descriptor)

        // Check for expirations
        for quest in quests {
            quest.checkExpiration()
        }

        try context.save()

        return quests.filter { $0.status == .active || $0.status == .completed }
    }

    /// Get quests ready to claim
    func getClaimableQuests() throws -> [WeeklyQuest] {
        let activeQuests = try getActiveQuests()
        return activeQuests.filter { $0.isReadyToClaim }
    }

    /// Update quest progress
    func updateQuestProgress(
        type: QuestType,
        increment: Int = 1
    ) throws {
        let activeQuests = try getActiveQuests()

        for quest in activeQuests where quest.questType == type && quest.status == .active {
            quest.incrementProgress(by: increment)
            logger.info("Updated quest \(quest.title): \(quest.currentValue)/\(quest.targetValue)")
        }

        try modelContext?.save()
    }

    /// Claim quest reward
    func claimQuestReward(
        quest: WeeklyQuest,
        userProgress: UserProgress
    ) throws -> QuestReward {
        guard quest.isReadyToClaim else {
            throw QuestError.notReadyToClaim
        }

        // Mark quest as claimed
        quest.claimReward()

        // Award XP
        let xpService = XPLevelingService.shared
        let xpAward = xpService.awardXP(
            for: .challengeCompleted,
            to: userProgress
        )

        // Create badge for hard/legendary quests
        var badge: QuestBadge?
        if quest.difficulty == .hard || quest.difficulty == .legendary {
            badge = QuestBadge(
                name: quest.title,
                description: quest.description,
                iconName: quest.iconName,
                color: quest.difficulty == .legendary ? "gold" : "silver",
                questID: quest.id
            )
            if let badge = badge {
                modelContext?.insert(badge)
            }
        }

        try modelContext?.save()
        logger.info("Claimed quest reward: \(quest.title) - \(quest.totalXP) XP")

        return QuestReward(
            quest: quest,
            xpEarned: quest.totalXP,
            badge: badge,
            xpAward: xpAward
        )
    }

    /// Remove expired quests
    private func removeExpiredQuests() throws {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let predicate = #Predicate<WeeklyQuest> { quest in
            quest.status == .expired
        }

        let descriptor = FetchDescriptor<WeeklyQuest>(predicate: predicate)
        let expiredQuests = try context.fetch(descriptor)

        for quest in expiredQuests {
            context.delete(quest)
        }

        if !expiredQuests.isEmpty {
            try context.save()
            logger.info("Removed \(expiredQuests.count) expired quests")
        }
    }

    /// Get user's badges
    func getUserBadges() throws -> [QuestBadge] {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let descriptor = FetchDescriptor<QuestBadge>(
            sortBy: [SortDescriptor(\.unlockedAt, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Get quest statistics
    func getQuestStatistics() throws -> QuestStatistics {
        guard let context = modelContext else {
            throw ServiceError.notConfigured
        }

        let allDescriptor = FetchDescriptor<WeeklyQuest>()
        let allQuests = try context.fetch(allDescriptor)

        let completedQuests = allQuests.filter { $0.status == .claimed || $0.status == .completed }
        let activeQuests = allQuests.filter { $0.status == .active }
        let totalXPEarned = completedQuests.reduce(0) { $0 + $1.totalXP }

        let badges = try getUserBadges()

        return QuestStatistics(
            totalQuestsCompleted: completedQuests.count,
            activeQuests: activeQuests.count,
            totalXPFromQuests: totalXPEarned,
            badgesEarned: badges.count,
            currentWeekProgress: calculateWeekProgress(activeQuests)
        )
    }

    private func calculateWeekProgress(_ quests: [WeeklyQuest]) -> Double {
        guard !quests.isEmpty else { return 0.0 }
        let totalProgress = quests.reduce(0.0) { $0 + $1.progress }
        return totalProgress / Double(quests.count)
    }
}

// MARK: - Supporting Types

struct QuestReward {
    let quest: WeeklyQuest
    let xpEarned: Int
    let badge: QuestBadge?
    let xpAward: XPAward
}

struct QuestStatistics {
    let totalQuestsCompleted: Int
    let activeQuests: Int
    let totalXPFromQuests: Int
    let badgesEarned: Int
    let currentWeekProgress: Double
}

enum QuestError: LocalizedError {
    case notReadyToClaim

    var errorDescription: String? {
        switch self {
        case .notReadyToClaim:
            return "Quest is not ready to claim"
        }
    }
}
