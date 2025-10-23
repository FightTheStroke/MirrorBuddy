import Foundation

/// Tool for creating and evaluating date memorization exercises
final class DateMemorizationTool {
    /// Create a memorization exercise from historical events
    func createExercise(
        events: [HistoricalEvent],
        difficulty: DateMemorizationDifficulty
    ) -> DateMemorizationExercise {
        let selectedEvents = selectEventsForDifficulty(events: events, difficulty: difficulty)
        let questions = createQuestions(from: selectedEvents, difficulty: difficulty)

        return DateMemorizationExercise(
            id: UUID(),
            difficulty: difficulty,
            questions: questions,
            createdAt: Date()
        )
    }

    /// Check answers and provide feedback
    func checkAnswers(
        exercise: DateMemorizationExercise,
        answers: [String: String]
    ) -> DateMemorizationResult {
        var results: [QuestionResult] = []
        var correctCount = 0

        for question in exercise.questions {
            let userAnswer = answers[question.id.uuidString, default: ""]
            let isCorrect = checkAnswer(
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                difficulty: exercise.difficulty
            )

            if isCorrect {
                correctCount += 1
            }

            results.append(QuestionResult(
                questionId: question.id,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect,
                feedback: generateFeedback(
                    isCorrect: isCorrect,
                    userAnswer: userAnswer,
                    correctAnswer: question.correctAnswer,
                    event: question.eventTitle
                )
            ))
        }

        let score = Double(correctCount) / Double(exercise.questions.count)
        let performanceLevel = determinePerformanceLevel(score: score)

        return DateMemorizationResult(
            exerciseId: exercise.id,
            questionResults: results,
            score: score,
            performanceLevel: performanceLevel,
            completedAt: Date()
        )
    }

    // MARK: - Private Methods

    private func selectEventsForDifficulty(
        events: [HistoricalEvent],
        difficulty: DateMemorizationDifficulty
    ) -> [HistoricalEvent] {
        let count: Int
        switch difficulty {
        case .easy:
            count = min(5, events.count)
        case .medium:
            count = min(10, events.count)
        case .hard:
            count = min(15, events.count)
        }

        return Array(events.shuffled().prefix(count))
    }

    private func createQuestions(
        from events: [HistoricalEvent],
        difficulty: DateMemorizationDifficulty
    ) -> [DateMemorizationQuestion] {
        events.map { event in
            createQuestion(for: event, difficulty: difficulty)
        }
    }

    private func createQuestion(
        for event: HistoricalEvent,
        difficulty: DateMemorizationDifficulty
    ) -> DateMemorizationQuestion {
        let questionType: DateMemorizationQuestion.QuestionType
        let hint: String?

        switch difficulty {
        case .easy:
            questionType = .multipleChoice
            hint = createHint(for: event)
        case .medium:
            questionType = .fillInBlank
            hint = createHint(for: event)
        case .hard:
            questionType = .fillInBlank
            hint = nil
        }

        let options = questionType == .multipleChoice ? generateOptions(for: event) : nil

        return DateMemorizationQuestion(
            id: UUID(),
            eventTitle: event.title,
            eventDescription: event.description,
            questionType: questionType,
            correctAnswer: event.date,
            options: options,
            hint: hint
        )
    }

    private func createHint(for event: HistoricalEvent) -> String {
        let century = (event.year / 100) + 1
        let decade = (event.year / 10) * 10
        return "This event occurred in the \(century)th century, during the \(decade)s"
    }

    private func generateOptions(for event: HistoricalEvent) -> [String] {
        var options = [event.date]

        // Generate plausible wrong answers
        let yearOffsets = [-5, -3, -1, 1, 3, 5]
        for offset in yearOffsets.shuffled().prefix(3) {
            let wrongYear = event.year + offset
            let wrongDate = event.date.replacingOccurrences(
                of: "\(event.year)",
                with: "\(wrongYear)"
            )
            options.append(wrongDate)
        }

        return options.shuffled()
    }

    private func checkAnswer(
        userAnswer: String,
        correctAnswer: String,
        difficulty: DateMemorizationDifficulty
    ) -> Bool {
        let normalizedUser = userAnswer.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedCorrect = correctAnswer.lowercased()

        // Exact match
        if normalizedUser == normalizedCorrect {
            return true
        }

        // For easy and medium, accept year-only answers
        if difficulty != .hard {
            let userYear = extractYear(from: normalizedUser)
            let correctYear = extractYear(from: normalizedCorrect)

            if let userY = userYear, let correctY = correctYear {
                return userY == correctY
            }
        }

        return false
    }

    private func extractYear(from text: String) -> Int? {
        let pattern = #"\b(\d{4})\b"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(
                in: text,
                range: NSRange(text.startIndex..., in: text)
              ),
              let range = Range(match.range(at: 1), in: text) else {
            return nil
        }

        return Int(text[range])
    }

    private func generateFeedback(
        isCorrect: Bool,
        userAnswer: String,
        correctAnswer: String,
        event: String
    ) -> String {
        if isCorrect {
            return "Correct! \(event) occurred on \(correctAnswer)."
        } else if userAnswer.isEmpty {
            return "No answer provided. The correct date is \(correctAnswer)."
        } else {
            return "Not quite. You answered '\(userAnswer)', but the correct date is \(correctAnswer)."
        }
    }

    private func determinePerformanceLevel(score: Double) -> PerformanceLevel {
        switch score {
        case 0.9...1.0:
            return .excellent
        case 0.75..<0.9:
            return .good
        case 0.6..<0.75:
            return .average
        case 0.4..<0.6:
            return .belowAverage
        default:
            return .needsImprovement
        }
    }
}

// MARK: - Supporting Types

enum DateMemorizationDifficulty: String, Codable {
    case easy
    case medium
    case hard

    var description: String {
        switch self {
        case .easy: return "Easy (Multiple Choice with Hints)"
        case .medium: return "Medium (Fill in the Blank with Hints)"
        case .hard: return "Hard (Fill in the Blank, No Hints)"
        }
    }
}

struct DateMemorizationExercise: Codable, Identifiable {
    let id: UUID
    let difficulty: DateMemorizationDifficulty
    let questions: [DateMemorizationQuestion]
    let createdAt: Date
}

struct DateMemorizationQuestion: Codable, Identifiable {
    let id: UUID
    let eventTitle: String
    let eventDescription: String
    let questionType: QuestionType
    let correctAnswer: String
    let options: [String]?
    let hint: String?

    enum QuestionType: String, Codable {
        case multipleChoice
        case fillInBlank
    }
}

struct DateMemorizationResult: Codable {
    let exerciseId: UUID
    let questionResults: [QuestionResult]
    let score: Double
    let performanceLevel: PerformanceLevel
    let completedAt: Date

    var percentageScore: Int {
        Int(score * 100)
    }

    var correctCount: Int {
        questionResults.filter { $0.isCorrect }.count
    }

    var totalCount: Int {
        questionResults.count
    }
}

struct QuestionResult: Codable, Identifiable {
    let questionId: UUID
    let userAnswer: String
    let correctAnswer: String
    let isCorrect: Bool
    let feedback: String

    var id: UUID { questionId }
}

enum PerformanceLevel: String, Codable {
    case excellent
    case good
    case average
    case belowAverage
    case needsImprovement

    var emoji: String {
        switch self {
        case .excellent: return "🌟"
        case .good: return "👍"
        case .average: return "👌"
        case .belowAverage: return "📚"
        case .needsImprovement: return "💪"
        }
    }

    var message: String {
        switch self {
        case .excellent:
            return "Excellent work! You have a strong grasp of these historical dates."
        case .good:
            return "Good job! You know most of these dates well."
        case .average:
            return "Not bad! With a bit more practice, you'll master these dates."
        case .belowAverage:
            return "Keep practicing! Review the material and try again."
        case .needsImprovement:
            return "Don't give up! Spend more time studying and you'll improve."
        }
    }
}
