import Foundation
import SwiftData

/// Flashcard for spaced repetition learning using SuperMemo SM-2 algorithm
@Model
final class Flashcard {
    var id = UUID()
    var materialID = UUID()

    var question: String = ""
    var answer: String = ""
    var explanation: String?

    // SM-2 Algorithm parameters
    var easeFactor: Double = 2.5 // Starts at 2.5
    var interval: Int = 1 // Days until next review
    var repetitions: Int = 0 // Number of consecutive correct answers
    var nextReviewDate = Date()

    var createdAt = Date()
    var lastReviewedAt: Date?

    // Relationship to Material (NO inverse for one-to-many "one" side)
    @Relationship(deleteRule: .nullify)
    var material: Material?

    init(
        materialID: UUID,
        question: String,
        answer: String,
        explanation: String? = nil
    ) {
        self.id = UUID()
        self.materialID = materialID
        self.question = question
        self.answer = answer
        self.explanation = explanation

        // SM-2 defaults
        self.easeFactor = 2.5
        self.interval = 1
        self.repetitions = 0
        self.nextReviewDate = Date()
        self.createdAt = Date()
    }

    /// Update flashcard based on review quality (0-5 scale)
    /// - Parameter quality: 0 = complete blackout, 5 = perfect response
    func review(quality: Int) {
        lastReviewedAt = Date()

        // SM-2 algorithm
        let qualityScore = Double(min(max(quality, 0), 5))

        if qualityScore >= 3 {
            // Correct answer
            if repetitions == 0 {
                interval = 1
            } else if repetitions == 1 {
                interval = 6
            } else {
                interval = Int(Double(interval) * easeFactor)
            }
            repetitions += 1
        } else {
            // Incorrect answer - reset
            repetitions = 0
            interval = 1
        }

        // Update ease factor
        easeFactor += (0.1 - (5 - qualityScore) * (0.08 + (5 - qualityScore) * 0.02))
        easeFactor = max(1.3, easeFactor)

        // Calculate next review date
        nextReviewDate = Calendar.current.date(
            byAdding: .day,
            value: interval,
            to: Date()
        ) ?? Date()
    }

    /// Check if flashcard is due for review
    var isDue: Bool {
        nextReviewDate <= Date()
    }
}
