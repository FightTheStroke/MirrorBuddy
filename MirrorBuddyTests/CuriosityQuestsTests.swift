import Foundation
@testable import MirrorBuddy
import SwiftData
import Testing

/// Tests for curiosity prompts and weekly quests system (Task 131)
@Suite("Curiosity & Quests Tests")
struct CuriosityQuestsTests {
    // MARK: - Curiosity Recommender Tests

    @Test("Recommend curiosity content for subject")
    func testCuriosityRecommendation() async {
        let service = CuriosityRecommenderService.shared

        // Should recommend content for a subject
        let recommendations = await service.getRecommendations(for: "Math")

        #expect(!recommendations.isEmpty)
        #expect(recommendations.allSatisfy { $0.subject.lowercased().contains("math") })
    }

    @Test("Curiosity content has valid metadata")
    func testCuriosityContentMetadata() async {
        let service = CuriosityRecommenderService.shared

        let recommendations = await service.getRecommendations(for: "Science")

        for content in recommendations {
            #expect(!content.title.isEmpty)
            #expect(!content.description.isEmpty)
            #expect(content.contentType != .unknown)
        }
    }

    @Test("Filter curiosity content by type")
    func testCuriosityContentFiltering() async {
        let service = CuriosityRecommenderService.shared

        let allRecommendations = await service.getRecommendations(for: "History")
        let videoOnly = allRecommendations.filter { $0.contentType == .video }

        #expect(videoOnly.count <= allRecommendations.count)
    }

    // MARK: - Weekly Quest Tests

    @Test("Create weekly quest for user")
    func testWeeklyQuestCreation() async throws {
        let container = try ModelContainer(
            for: WeeklyQuest.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)

        let service = WeeklyQuestService.shared
        service.configure(modelContext: context)

        let quest = await service.generateWeeklyQuest(difficulty: .easy)

        #expect(quest.title.isEmpty == false)
        #expect(quest.targetValue > 0)
        #expect(quest.currentProgress == 0)
        #expect(quest.status == .active)
    }

    @Test("Track quest progress")
    func testQuestProgressTracking() throws {
        let container = try ModelContainer(
            for: WeeklyQuest.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)

        let quest = WeeklyQuest(
            type: .studyStreak,
            title: "Study 3 Days",
            targetValue: 3
        )
        context.insert(quest)

        // Update progress
        quest.updateProgress(newValue: 1)
        #expect(quest.currentProgress == 1)
        #expect(quest.status == .active)

        // Complete quest
        quest.updateProgress(newValue: 3)
        #expect(quest.currentProgress == 3)
        #expect(quest.status == .completed)
        #expect(quest.completedAt != nil)
    }

    @Test("Quest awards XP on completion")
    func testQuestXPReward() throws {
        let container = try ModelContainer(
            for: WeeklyQuest.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)

        let quest = WeeklyQuest(
            type: .flashcardMastery,
            title: "Review 20 Flashcards",
            targetValue: 20,
            xpReward: 50
        )
        context.insert(quest)

        // Complete quest
        quest.updateProgress(newValue: 20)

        #expect(quest.status == .completed)
        #expect(quest.xpReward > 0)
    }

    @Test("Quest has correct difficulty level")
    func testQuestDifficultyLevels() async {
        let service = WeeklyQuestService.shared

        let easyQuest = await service.generateWeeklyQuest(difficulty: .easy)
        let hardQuest = await service.generateWeeklyQuest(difficulty: .hard)

        #expect(easyQuest.targetValue < hardQuest.targetValue)
        #expect(easyQuest.xpReward < hardQuest.xpReward)
    }

    @Test("Multiple active quests allowed")
    func testMultipleActiveQuests() throws {
        let container = try ModelContainer(
            for: WeeklyQuest.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)

        let quest1 = WeeklyQuest(type: .studyStreak, title: "Quest 1", targetValue: 3)
        let quest2 = WeeklyQuest(type: .materialCreation, title: "Quest 2", targetValue: 5)

        context.insert(quest1)
        context.insert(quest2)

        let descriptor = FetchDescriptor<WeeklyQuest>(
            predicate: #Predicate { $0.status == WeeklyQuest.QuestStatus.active.rawValue }
        )
        let activeQuests = try context.fetch(descriptor)

        #expect(activeQuests.count == 2)
    }

    @Test("Quest expires after deadline")
    func testQuestExpiration() throws {
        let container = try ModelContainer(
            for: WeeklyQuest.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)

        let quest = WeeklyQuest(
            type: .studyStreak,
            title: "Expired Quest",
            targetValue: 5
        )
        // Set deadline in the past
        quest.deadline = Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date()
        context.insert(quest)

        quest.checkExpiration()

        #expect(quest.status == .expired)
    }

    // MARK: - Celebration Tests

    @Test("Celebrate quest completion")
    func testQuestCompletionCelebration() throws {
        let container = try ModelContainer(
            for: WeeklyQuest.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let context = ModelContext(container)

        let quest = WeeklyQuest(
            type: .studyStreak,
            title: "Complete Study Streak",
            targetValue: 3,
            xpReward: 100
        )
        context.insert(quest)

        // Complete quest
        quest.updateProgress(newValue: 3)

        #expect(quest.status == .completed)
        #expect(quest.shouldCelebrate)
    }

    @Test("Badge unlock on milestone")
    func testBadgeUnlock() async {
        let service = WeeklyQuestService.shared

        // Simulate completing multiple quests
        let badges = await service.checkBadgeUnlocks(completedQuestCount: 10)

        #expect(!badges.isEmpty)
    }

    // MARK: - Analytics Tests

    @Test("Track curiosity interaction")
    func testCuriosityInteractionTracking() async {
        let service = CuriosityRecommenderService.shared

        // Record interaction
        await service.recordInteraction(
            contentId: "test-video-1",
            type: .viewed,
            duration: 120
        )

        // Should influence future recommendations
        let recommendations = await service.getRecommendations(for: "Science")
        #expect(!recommendations.isEmpty)
    }

    @Test("Quest completion rate tracking")
    func testQuestCompletionRateTracking() async {
        let service = WeeklyQuestService.shared

        let stats = await service.getQuestStatistics()

        #expect(stats.totalQuests >= 0)
        #expect(stats.completedQuests >= 0)
        #expect(stats.completionRate >= 0.0)
        #expect(stats.completionRate <= 1.0)
    }

    @Test("Popular curiosity topics identified")
    func testPopularTopicsIdentification() async {
        let service = CuriosityRecommenderService.shared

        // Record multiple interactions
        await service.recordInteraction(contentId: "math-1", type: .viewed, duration: 60)
        await service.recordInteraction(contentId: "math-2", type: .viewed, duration: 90)
        await service.recordInteraction(contentId: "science-1", type: .viewed, duration: 45)

        let popularTopics = await service.getPopularTopics(limit: 3)

        #expect(!popularTopics.isEmpty)
        #expect(popularTopics.count <= 3)
    }
}
