//
//  SpacedRepetitionService.swift
//  MirrorBuddy
//
//  Spaced Repetition Service implementing SuperMemo SM-2 algorithm
//  for optimal flashcard review scheduling based on user performance.
//

import Foundation
import SwiftData

/// Service for managing spaced repetition scheduling using SM-2 algorithm
actor SpacedRepetitionService {
    static let shared = SpacedRepetitionService()

    private init() {}

    // MARK: - SM-2 Algorithm Implementation

    /// Calculate next review date using SuperMemo SM-2 algorithm
    /// Based on SuperMemo 2 algorithm by Piotr Wozniak (1987)
    /// - Parameters:
    ///   - flashcard: The flashcard to update
    ///   - quality: Review quality rating (0-5)
    /// - Returns: Updated review parameters
    func calculateNextReview(
        for flashcard: Flashcard,
        quality: ReviewQuality
    ) -> ReviewResult {
        let q = quality.rawValue

        // Get current values
        var repetitions = flashcard.repetitions
        var interval = flashcard.interval
        var easeFactor = flashcard.easeFactor

        // SM-2 Algorithm Core Logic
        if q >= 3 {
            // Correct response (quality >= 3)
            if repetitions == 0 {
                interval = 1  // First review: 1 day
            } else if repetitions == 1 {
                interval = 6  // Second review: 6 days
            } else {
                interval = Int(Double(interval) * easeFactor)
            }
            repetitions += 1
        } else {
            // Incorrect response (quality < 3) - reset repetitions
            repetitions = 0
            interval = 1
        }

        // Update ease factor based on quality
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        easeFactor += (0.1 - Double(5 - q) * (0.08 + Double(5 - q) * 0.02))
        easeFactor = max(1.3, easeFactor)  // Minimum ease factor of 1.3

        // Calculate next review date
        let nextReviewDate = Calendar.current.date(
            byAdding: .day,
            value: interval,
            to: Date()
        ) ?? Date()

        return ReviewResult(
            repetitions: repetitions,
            interval: interval,
            easeFactor: easeFactor,
            nextReviewDate: nextReviewDate,
            lastReviewDate: Date()
        )
    }

    // MARK: - Due Flashcard Management

    /// Get flashcards that are due for review
    /// - Parameters:
    ///   - flashcards: Array of all flashcards
    ///   - limit: Maximum number of flashcards to return
    /// - Returns: Array of due flashcards, sorted by priority
    func getDueFlashcards(from flashcards: [Flashcard], limit: Int = 20) -> [Flashcard] {
        let now = Date()

        // Filter flashcards that are due
        let due = flashcards.filter { flashcard in
            guard let nextReview = flashcard.nextReviewDate else {
                return true  // Never reviewed = due
            }
            return nextReview <= now || flashcard.isDue
        }

        // Sort by priority:
        // 1. Overdue flashcards first (oldest first)
        // 2. Then by repetitions (less repetitions = higher priority)
        // 3. Then by ease factor (lower ease factor = higher priority)
        let sorted = due.sorted { flashcard1, flashcard2 in
            let date1 = flashcard1.nextReviewDate ?? Date.distantPast
            let date2 = flashcard2.nextReviewDate ?? Date.distantPast

            // Sort by overdue date
            if date1 != date2 {
                return date1 < date2
            }

            // Sort by repetitions (fewer = higher priority)
            if flashcard1.repetitions != flashcard2.repetitions {
                return flashcard1.repetitions < flashcard2.repetitions
            }

            // Sort by ease factor (lower = higher priority)
            return flashcard1.easeFactor < flashcard2.easeFactor
        }

        return Array(sorted.prefix(limit))
    }

    /// Get flashcards due for a specific material
    /// - Parameters:
    ///   - material: The material to filter by
    ///   - flashcards: All flashcards
    ///   - limit: Maximum number of flashcards to return
    /// - Returns: Due flashcards for the material
    func getDueFlashcards(
        for material: Material,
        from flashcards: [Flashcard],
        limit: Int = 20
    ) -> [Flashcard] {
        let materialFlashcards = flashcards.filter { $0.materialID == material.id }
        return getDueFlashcards(from: materialFlashcards, limit: limit)
    }

    // MARK: - Review Schedule

    /// Get upcoming review schedule
    /// - Parameter flashcards: Array of flashcards to analyze
    /// - Returns: Dictionary mapping dates to number of flashcards due
    func getReviewSchedule(for flashcards: [Flashcard]) -> [Date: Int] {
        var schedule: [Date: Int] = [:]

        for flashcard in flashcards {
            guard let nextReview = flashcard.nextReviewDate else { continue }

            // Group by day (start of day)
            let day = Calendar.current.startOfDay(for: nextReview)
            schedule[day, default: 0] += 1
        }

        return schedule
    }

    /// Get review statistics for a time period
    /// - Parameters:
    ///   - flashcards: Array of flashcards to analyze
    ///   - days: Number of days to look ahead
    /// - Returns: Review statistics
    func getReviewStatistics(
        for flashcards: [Flashcard],
        days: Int = 7
    ) -> ReviewStatistics {
        let now = Date()
        let calendar = Calendar.current

        var dueToday = 0
        var dueThisWeek = 0
        var totalReviews = 0
        var averageEaseFactor = 0.0

        for flashcard in flashcards {
            guard let nextReview = flashcard.nextReviewDate else { continue }

            // Count due today
            if calendar.isDateInToday(nextReview) || nextReview <= now {
                dueToday += 1
            }

            // Count due this week
            if let weekFromNow = calendar.date(byAdding: .day, value: days, to: now),
               nextReview <= weekFromNow {
                dueThisWeek += 1
            }

            totalReviews += flashcard.reviewCount
            averageEaseFactor += flashcard.easeFactor
        }

        if !flashcards.isEmpty {
            averageEaseFactor /= Double(flashcards.count)
        }

        return ReviewStatistics(
            totalFlashcards: flashcards.count,
            dueToday: dueToday,
            dueThisWeek: dueThisWeek,
            totalReviews: totalReviews,
            averageEaseFactor: averageEaseFactor
        )
    }
}

// MARK: - Supporting Types

/// Review quality rating based on SM-2 algorithm
enum ReviewQuality: Int, CaseIterable {
    case blackout = 0       // Complete blackout, couldn't remember
    case incorrect = 1      // Incorrect response
    case hard = 2           // Correct with serious difficulty
    case good = 3           // Correct with hesitation
    case easy = 4           // Correct with ease
    case perfect = 5        // Perfect response, instant recall

    var displayName: String {
        switch self {
        case .blackout: return "Blackout"
        case .incorrect: return "Incorrect"
        case .hard: return "Hard"
        case .good: return "Good"
        case .easy: return "Easy"
        case .perfect: return "Perfect"
        }
    }

    var shortName: String {
        switch self {
        case .blackout: return "Again"
        case .incorrect: return "Again"
        case .hard: return "Hard"
        case .good: return "Good"
        case .easy: return "Easy"
        case .perfect: return "Perfect"
        }
    }

    var description: String {
        switch self {
        case .blackout: return "Complete blackout"
        case .incorrect: return "Incorrect answer"
        case .hard: return "Correct with difficulty"
        case .good: return "Correct with hesitation"
        case .easy: return "Correct easily"
        case .perfect: return "Perfect recall"
        }
    }

    var interval: String {
        switch self {
        case .blackout, .incorrect: return "1 day"
        case .hard: return "3 days"
        case .good: return "6 days"
        case .easy: return "10+ days"
        case .perfect: return "15+ days"
        }
    }
}

/// Result of review calculation
struct ReviewResult {
    let repetitions: Int
    let interval: Int
    let easeFactor: Double
    let nextReviewDate: Date?
    let lastReviewDate: Date
}

/// Statistics about review schedule
struct ReviewStatistics {
    let totalFlashcards: Int
    let dueToday: Int
    let dueThisWeek: Int
    let totalReviews: Int
    let averageEaseFactor: Double

    var retentionRate: Double {
        guard totalReviews > 0 else { return 0.0 }
        // Ease factor > 2.5 indicates good retention
        return min(1.0, averageEaseFactor / 2.5)
    }
}
