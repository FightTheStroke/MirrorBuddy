import Foundation
import os.log
import SwiftData

/// Weekly parent/teacher digest service (Task 132)
/// Aggregates weekly metrics and generates empathetic summaries
@MainActor
final class WeeklyDigestService {
    static let shared = WeeklyDigestService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "WeeklyDigest")

    // MARK: - Dependencies

    private var modelContext: ModelContext?

    // MARK: - Initialization

    private init() {}

    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Weekly digest service configured")
    }

    // MARK: - Subtask 132.1: Aggregate Weekly Metrics

    /// Aggregate weekly metrics for a student
    /// - Parameters:
    ///   - userProgress: The student's progress data
    ///   - startDate: Start of the week (defaults to 7 days ago)
    ///   - endDate: End of the week (defaults to now)
    /// - Returns: Aggregated weekly metrics
    func aggregateWeeklyMetrics(
        for userProgress: UserProgress,
        startDate: Date = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date(),
        endDate: Date = Date()
    ) async throws -> WeeklyMetrics {
        logger.info("Aggregating weekly metrics from \(startDate) to \(endDate)")

        guard let context = modelContext else {
            throw DigestError.contextNotConfigured
        }

        // Fetch flashcards from the week
        let flashcardDescriptor = FetchDescriptor<Flashcard>(
            predicate: #Predicate { flashcard in
                flashcard.createdAt >= startDate && flashcard.createdAt <= endDate
            }
        )
        let weekFlashcards = try context.fetch(flashcardDescriptor)

        // Fetch materials from the week
        let materialDescriptor = FetchDescriptor<Material>(
            predicate: #Predicate { material in
                material.createdAt >= startDate && material.createdAt <= endDate
            }
        )
        let weekMaterials = try context.fetch(materialDescriptor)

        // Calculate XP gains for the week
        _ = userProgress.totalXP
        let weeklyXPGain = calculateWeeklyXPGain(userProgress: userProgress)

        // Calculate streak status
        let streakStatus = calculateStreakStatus(userProgress: userProgress)

        // Analyze subject performance
        let subjectPerformance = try analyzeSubjectPerformance(
            flashcards: weekFlashcards,
            materials: weekMaterials,
            context: context
        )

        // Calculate sentiment from flashcard reviews
        let sentiment = calculateWeeklySentiment(flashcards: weekFlashcards)

        // Study time for the week
        let weeklyStudyMinutes = calculateWeeklyStudyTime(userProgress: userProgress)

        // Achievements unlocked this week
        let weeklyAchievements = getWeeklyAchievements(userProgress: userProgress)

        let metrics = WeeklyMetrics(
            startDate: startDate,
            endDate: endDate,
            xpGained: weeklyXPGain,
            currentLevel: userProgress.level,
            levelUps: calculateLevelUps(weeklyXP: weeklyXPGain, currentLevel: userProgress.level),
            currentStreak: userProgress.currentStreak,
            streakStatus: streakStatus,
            studyMinutes: weeklyStudyMinutes,
            materialsCreated: weekMaterials.count,
            flashcardsReviewed: weekFlashcards.filter { $0.reviewCount > 0 }.count,
            mindMapsGenerated: weekMaterials.filter { $0.mindMap != nil }.count,
            subjectPerformance: subjectPerformance,
            sentiment: sentiment,
            achievementsUnlocked: weeklyAchievements
        )

        logger.info("Weekly metrics aggregated: \(weeklyXPGain) XP, \(weeklyStudyMinutes) min study")
        return metrics
    }

    /// Calculate weekly XP gain based on level progression
    private func calculateWeeklyXPGain(userProgress: UserProgress) -> Int {
        // Retrieve stored previous XP from UserDefaults
        let key = "WeeklyDigest.PreviousXP.\(userProgress.id.uuidString)"
        let previousXP = UserDefaults.standard.integer(forKey: key)

        let weeklyGain = max(0, userProgress.totalXP - previousXP)

        // Store current XP for next week
        UserDefaults.standard.set(userProgress.totalXP, forKey: key)

        return weeklyGain
    }

    /// Calculate streak status
    private func calculateStreakStatus(userProgress: UserProgress) -> StreakStatus {
        let currentStreak = userProgress.currentStreak

        if currentStreak >= 30 {
            return .strong
        } else if currentStreak >= 7 {
            return .building
        } else if currentStreak >= 1 {
            return .starting
        } else {
            return .broken
        }
    }

    /// Analyze performance by subject
    private func analyzeSubjectPerformance(
        flashcards: [Flashcard],
        materials: [Material],
        context: ModelContext
    ) throws -> [SubjectPerformance] {
        var performanceMap: [String: SubjectPerformanceBuilder] = [:]

        // Analyze flashcard performance per subject
        for flashcard in flashcards {
            guard let subjectEntity = flashcard.material?.subject else { continue }
            let subjectKey = subjectEntity.localizationKey

            if performanceMap[subjectKey] == nil {
                performanceMap[subjectKey] = SubjectPerformanceBuilder(subjectName: subjectKey)
            }

            // Infer difficulty from accuracy: high accuracy = easy, low accuracy = hard
            let inferredDifficulty: String
            if flashcard.accuracy >= 0.75 {
                inferredDifficulty = "easy"
            } else if flashcard.accuracy >= 0.50 {
                inferredDifficulty = "medium"
            } else {
                inferredDifficulty = "hard"
            }

            performanceMap[subjectKey]?.addFlashcard(
                difficulty: inferredDifficulty,
                reviewCount: flashcard.reviewCount
            )
        }

        // Add material counts per subject
        for material in materials {
            guard let subjectEntity = material.subject else { continue }
            let subjectKey = subjectEntity.localizationKey

            if performanceMap[subjectKey] == nil {
                performanceMap[subjectKey] = SubjectPerformanceBuilder(subjectName: subjectKey)
            }

            performanceMap[subjectKey]?.addMaterial()
        }

        // Convert to performance objects
        return performanceMap.values.map { $0.build() }.sorted {
            $0.difficultyScore > $1.difficultyScore
        }
    }

    /// Calculate weekly sentiment from flashcard difficulty and review patterns
    private func calculateWeeklySentiment(flashcards: [Flashcard]) -> WeeklySentiment {
        guard !flashcards.isEmpty else {
            return WeeklySentiment(
                overall: .neutral,
                confidence: 0.0,
                positiveSignals: [],
                concernSignals: []
            )
        }

        var positiveSignals: [String] = []
        var concernSignals: [String] = []

        // Count difficulty distribution (inferred from accuracy)
        let easyCount = flashcards.filter { $0.accuracy >= 0.75 }.count
        _ = flashcards.filter { $0.accuracy >= 0.50 && $0.accuracy < 0.75 }.count
        let hardCount = flashcards.filter { $0.accuracy < 0.50 }.count

        let totalReviewed = flashcards.filter { $0.reviewCount > 0 }.count
        let avgReviewCount = flashcards.reduce(0) { $0 + $1.reviewCount } / max(1, flashcards.count)

        // Positive signals
        if Double(easyCount) / Double(flashcards.count) > 0.4 {
            positiveSignals.append("High mastery rate on flashcards")
        }

        if avgReviewCount >= 3 {
            positiveSignals.append("Consistent review practice")
        }

        if totalReviewed >= flashcards.count * 3 / 4 {
            positiveSignals.append("Active engagement with material")
        }

        // Concern signals
        if Double(hardCount) / Double(flashcards.count) > 0.5 {
            concernSignals.append("Struggling with significant portion of material")
        }

        if avgReviewCount < 2 && flashcards.count > 5 {
            concernSignals.append("May benefit from more review sessions")
        }

        // Determine overall sentiment
        let overall: SentimentScore
        if positiveSignals.count > concernSignals.count + 1 {
            overall = .positive
        } else if concernSignals.count > positiveSignals.count + 1 {
            overall = .struggling
        } else {
            overall = .neutral
        }

        let confidence = Double(positiveSignals.count + concernSignals.count) / 5.0

        return WeeklySentiment(
            overall: overall,
            confidence: min(1.0, confidence),
            positiveSignals: positiveSignals,
            concernSignals: concernSignals
        )
    }

    /// Calculate weekly study time (approximation from activity)
    private func calculateWeeklyStudyTime(userProgress: UserProgress) -> Int {
        // Retrieve stored previous study time
        let key = "WeeklyDigest.PreviousStudyTime.\(userProgress.id.uuidString)"
        let previousStudyTime = UserDefaults.standard.integer(forKey: key)

        let weeklyMinutes = max(0, userProgress.totalStudyTimeMinutes - previousStudyTime)

        // Store current study time for next week
        UserDefaults.standard.set(userProgress.totalStudyTimeMinutes, forKey: key)

        return weeklyMinutes
    }

    /// Get achievements unlocked this week
    private func getWeeklyAchievements(userProgress: UserProgress) -> [Achievement] {
        // This is a simplified implementation
        // In production, you'd track when achievements were unlocked
        let allAchievements = userProgress.unlockedAchievements

        // For now, return achievements related to current streak
        var weeklyAchievements: [Achievement] = []

        if userProgress.currentStreak >= 7 && allAchievements.contains(.streak7Days) {
            weeklyAchievements.append(.streak7Days)
        }

        if userProgress.currentStreak >= 30 && allAchievements.contains(.streak30Days) {
            weeklyAchievements.append(.streak30Days)
        }

        return weeklyAchievements
    }

    /// Calculate number of level ups in the week
    private func calculateLevelUps(weeklyXP: Int, currentLevel: Int) -> Int {
        // Simplified: each level requires 100 XP
        weeklyXP / 100
    }
}

// MARK: - Models (Subtask 132.1)

/// Weekly metrics aggregation
struct WeeklyMetrics: Codable {
    let startDate: Date
    let endDate: Date
    let xpGained: Int
    let currentLevel: Int
    let levelUps: Int
    let currentStreak: Int
    let streakStatus: StreakStatus
    let studyMinutes: Int
    let materialsCreated: Int
    let flashcardsReviewed: Int
    let mindMapsGenerated: Int
    let subjectPerformance: [SubjectPerformance]
    let sentiment: WeeklySentiment
    let achievementsUnlocked: [Achievement]
}

/// Streak status classification
enum StreakStatus: String, Codable {
    case strong
    case building
    case starting
    case broken

    var description: String {
        switch self {
        case .strong:
            return "Strong streak going!"
        case .building:
            return "Building momentum"
        case .starting:
            return "Just getting started"
        case .broken:
            return "Ready for a fresh start"
        }
    }
}

/// Performance level classification for weekly digest
enum WeeklyPerformanceLevel: String, Codable {
    case excelling
    case progressing
    case struggling
}

/// Subject performance metrics
struct SubjectPerformance: Codable {
    let subjectName: String
    let flashcardsReviewed: Int
    let materialsStudied: Int
    let difficultyScore: Double // 0.0 (easy) to 1.0 (very hard)
    let averageReviewCount: Double

    var performanceLevel: WeeklyPerformanceLevel {
        if difficultyScore < 0.3 {
            return .excelling
        } else if difficultyScore < 0.6 {
            return .progressing
        } else {
            return .struggling
        }
    }
}

/// Weekly sentiment analysis
struct WeeklySentiment: Codable {
    let overall: SentimentScore
    let confidence: Double // 0.0 to 1.0
    let positiveSignals: [String]
    let concernSignals: [String]
}

/// Overall sentiment score
enum SentimentScore: String, Codable {
    case positive
    case neutral
    case struggling
}

/// Helper for building subject performance
private class SubjectPerformanceBuilder {
    let subjectName: String
    var flashcardsReviewed = 0
    var materialsStudied = 0
    var totalDifficultyScore = 0.0
    var totalReviewCount = 0
    var flashcardCount = 0

    init(subjectName: String) {
        self.subjectName = subjectName
    }

    func addFlashcard(difficulty: String, reviewCount: Int) {
        flashcardsReviewed += 1
        flashcardCount += 1
        totalReviewCount += reviewCount

        // Convert difficulty to score
        switch difficulty.lowercased() {
        case "easy":
            totalDifficultyScore += 0.2
        case "medium":
            totalDifficultyScore += 0.5
        case "hard":
            totalDifficultyScore += 0.9
        default:
            totalDifficultyScore += 0.5
        }
    }

    func addMaterial() {
        materialsStudied += 1
    }

    func build() -> SubjectPerformance {
        let avgDifficulty = flashcardCount > 0 ? totalDifficultyScore / Double(flashcardCount) : 0.5
        let avgReview = flashcardCount > 0 ? Double(totalReviewCount) / Double(flashcardCount) : 0.0

        return SubjectPerformance(
            subjectName: subjectName,
            flashcardsReviewed: flashcardsReviewed,
            materialsStudied: materialsStudied,
            difficultyScore: avgDifficulty,
            averageReviewCount: avgReview
        )
    }
}

// MARK: - Errors

enum DigestError: Error, LocalizedError {
    case contextNotConfigured
    case noMetricsAvailable
    case generationFailed(String)
    case deliveryFailed(String)

    var errorDescription: String? {
        switch self {
        case .contextNotConfigured:
            return "Model context not configured"
        case .noMetricsAvailable:
            return "No metrics available for the period"
        case .generationFailed(let reason):
            return "Digest generation failed: \(reason)"
        case .deliveryFailed(let reason):
            return "Digest delivery failed: \(reason)"
        }
    }
}
