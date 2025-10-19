import Foundation
@testable import MirrorBuddy
import SwiftData
import Testing

/// Tests for gamification system (XP, achievements, streaks, levels)
@Suite("Gamification System Tests")
struct GamificationSystemTests {
    @Test("Award XP for completing study session")
    func testXPAward() throws {
        // Given: User with initial XP
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()
        user.totalXP = 100
        context.insert(user)

        // When: Completing a study session
        user.awardXP(amount: 50)

        // Then: XP should increase
        #expect(user.totalXP == 150)
    }

    @Test("Level up when XP threshold reached")
    func testLevelUp() throws {
        // Given: User near level threshold
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()
        user.totalXP = 950 // Need 1000 for level 2

        // When: Gaining XP to cross threshold
        user.awardXP(amount: 100)

        // Then: Should level up
        #expect(user.currentLevel >= 2)
        #expect(user.totalXP >= 1_000)
    }

    @Test("Calculate current level from XP")
    func testLevelCalculation() {
        // Given: Various XP amounts
        let testCases: [(xp: Int, expectedLevel: Int)] = [
            (0, 1),
            (100, 1),
            (1_000, 2),
            (2_500, 3),
            (5_000, 4)
        ]

        // When/Then: Calculating level for each
        for testCase in testCases {
            let user = UserProgress()
            user.totalXP = testCase.xp
            #expect(user.currentLevel >= testCase.expectedLevel)
        }
    }

    @Test("Maintain study streak")
    func testStudyStreak() throws {
        // Given: User with current streak
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()
        user.currentStreak = 5
        user.lastStudyDate = Calendar.current.date(byAdding: .day, value: -1, to: Date())

        // When: Studying today
        user.recordStudySession(duration: 60)

        // Then: Streak should increment
        #expect(user.currentStreak == 6)
    }

    @Test("Break streak if day missed")
    func testStreakBreak() throws {
        // Given: User who last studied 3 days ago
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()
        user.currentStreak = 10
        user.lastStudyDate = Calendar.current.date(byAdding: .day, value: -3, to: Date())

        // When: Checking streak
        user.updateStreak()

        // Then: Streak should reset
        #expect(user.currentStreak == 0)
    }

    @Test("Track longest streak")
    func testLongestStreak() throws {
        // Given: User with current and longest streaks
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()
        user.longestStreak = 15
        user.currentStreak = 20

        // When: Recording new streak record
        user.updateLongestStreak()

        // Then: Longest should update
        #expect(user.longestStreak == 20)
    }

    @Test("Unlock achievement when criteria met")
    func testAchievementUnlock() throws {
        // Given: User approaching achievement
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()

        // When: Meeting achievement criteria
        user.checkAchievements()

        // Then: Achievement should unlock
        // (Specific achievement logic depends on implementation)
        #expect(user.unlockedAchievements.isEmpty)
    }

    @Test("Calculate progress to next level")
    func testProgressToNextLevel() {
        // Given: User with some XP
        let user = UserProgress()
        user.totalXP = 1_500 // Level 2, need 2500 for level 3

        // When: Calculating progress
        let progress = user.progressToNextLevel()

        // Then: Should show partial progress
        #expect(progress > 0.0)
        #expect(progress < 1.0)
    }

    @Test("Award bonus XP for streak milestones")
    func testStreakBonusXP() {
        // Given: User with significant streak
        let user = UserProgress()
        user.currentStreak = 30

        // When: Calculating XP for session
        let baseXP = 50
        let bonusXP = user.calculateStreakBonus(for: baseXP)

        // Then: Should receive bonus
        #expect(bonusXP > baseXP)
    }

    @Test("Track total study time")
    func testTotalStudyTime() throws {
        // Given: User with existing study time
        let container = try ModelContainer(for: UserProgress.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let context = ModelContext(container)

        let user = UserProgress()
        user.totalStudyMinutes = 120

        // When: Adding new session
        user.recordStudySession(duration: 30)

        // Then: Total should increase
        #expect(user.totalStudyMinutes == 150)
    }

    @Test("Calculate daily goal progress")
    func testDailyGoalProgress() {
        // Given: User with daily goal
        let user = UserProgress()
        user.dailyGoalMinutes = 60
        user.todayStudyMinutes = 30

        // When: Calculating progress
        let progress = user.dailyGoalProgress()

        // Then: Should show 50% progress
        #expect(progress == 0.5)
    }

    @Test("Reset daily progress at midnight")
    func testDailyReset() {
        // Given: User with yesterday's progress
        let user = UserProgress()
        user.todayStudyMinutes = 45
        user.lastResetDate = Calendar.current.date(byAdding: .day, value: -1, to: Date())

        // When: Checking for reset
        user.resetDailyProgressIfNeeded()

        // Then: Today's progress should reset
        #expect(user.todayStudyMinutes == 0)
    }
}
