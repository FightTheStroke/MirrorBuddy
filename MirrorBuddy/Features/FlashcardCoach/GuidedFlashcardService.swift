import Foundation
import AVFoundation
import Combine

/// Service for guided flashcard coaching sessions
@MainActor
final class GuidedFlashcardService: ObservableObject {

    // MARK: - Published Properties

    @Published var currentPhase: FlashcardCoachScript.SessionPhase = .warmUp
    @Published var currentCardIndex: Int = 0
    @Published var correctAnswers: Int = 0
    @Published var incorrectAnswers: Int = 0
    @Published var currentStreak: Int = 0
    @Published var totalXP: Int = 0
    @Published var sessionActive: Bool = false
    @Published var performanceLevel: PerformanceLevel = .medium

    // MARK: - Properties

    private let cards: [FlashcardItem]
    private let subject: String?
    private var sessionStartTime: Date?
    private let speechSynthesizer = AVSpeechSynthesizer()

    private var incorrectCardIndices: [Int] = []

    enum PerformanceLevel {
        case struggling
        case medium
        case excelling

        var difficultyAdjustment: FlashcardCoachScript.DifficultyLevel {
            switch self {
            case .struggling: return .easy
            case .medium: return .medium
            case .excelling: return .hard
            }
        }
    }

    // MARK: - Initialization

    init(cards: [FlashcardItem], subject: String? = nil) {
        self.cards = cards
        self.subject = subject
    }

    // MARK: - Session Control

    func startSession() {
        sessionActive = true
        sessionStartTime = Date()
        currentPhase = .warmUp

        let warmUpMessage = FlashcardCoachScript.warmUpPrompt(subject: subject, cardCount: cards.count)
        speak(warmUpMessage)

        // Auto-transition to practice after warm-up
        DispatchQueue.main.asyncAfter(deadline: .now() + FlashcardCoachScript.SessionPhase.warmUp.duration) { [weak self] in
            self?.startPractice()
        }
    }

    private func startPractice() {
        currentPhase = .practice
        speak(FlashcardCoachScript.readyPrompt)
    }

    func endSession() {
        currentPhase = .wrapUp

        let xpEarned = calculateXP()
        totalXP += xpEarned

        let summary = FlashcardCoachScript.wrapUpSummary(
            correct: correctAnswers,
            total: cards.count,
            xpEarned: xpEarned
        )

        speak(summary)

        // Ask for next steps
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.speak(FlashcardCoachScript.nextStepPrompt)
        }
    }

    // MARK: - Card Navigation

    func nextCard() {
        guard currentCardIndex < cards.count - 1 else {
            endSession()
            return
        }

        currentCardIndex += 1
        speak(FlashcardCoachScript.nextCardPrompt)

        // Mid-session encouragement
        if currentCardIndex == cards.count / 2 {
            speak(FlashcardCoachScript.midSessionEncouragement)
        }
    }

    func recordAnswer(correct: Bool) {
        if correct {
            correctAnswers += 1
            currentStreak += 1

            speak(FlashcardCoachScript.correctAnswerPrompts(streak: currentStreak))

            // Check for performance improvement
            if currentStreak >= 5 {
                performanceLevel = .excelling
            }
        } else {
            incorrectAnswers += 1
            currentStreak = 0
            incorrectCardIndices.append(currentCardIndex)

            let difficulty = performanceLevel.difficultyAdjustment
            speak(FlashcardCoachScript.incorrectAnswerPrompts(difficulty: difficulty))

            // Adjust performance level
            updatePerformanceLevel()
        }

        // Auto-advance to next card
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.nextCard()
        }
    }

    // MARK: - Performance Tracking

    private func updatePerformanceLevel() {
        let totalAnswers = correctAnswers + incorrectAnswers
        guard totalAnswers > 0 else { return }

        let accuracy = Double(correctAnswers) / Double(totalAnswers)

        if accuracy >= 0.8 {
            performanceLevel = .excelling
        } else if accuracy >= 0.5 {
            performanceLevel = .medium
        } else {
            performanceLevel = .struggling
        }
    }

    private func calculateXP() -> Int {
        let baseXP = correctAnswers * 10
        let streakBonus = currentStreak >= 5 ? 50 : 0
        let perfectionBonus = incorrectAnswers == 0 ? 100 : 0

        return baseXP + streakBonus + perfectionBonus
    }

    // MARK: - Retry Incorrect

    func retryIncorrectCards() -> [FlashcardItem] {
        incorrectCardIndices.map { cards[$0] }
    }

    // MARK: - Voice Output

    private func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5
        utterance.volume = 0.7

        speechSynthesizer.speak(utterance)
    }

    // MARK: - Current Card

    var currentCard: FlashcardItem? {
        guard currentCardIndex < cards.count else { return nil }
        return cards[currentCardIndex]
    }

    var progress: Double {
        guard cards.count > 0 else { return 0 }
        return Double(currentCardIndex) / Double(cards.count)
    }
}

// MARK: - Flashcard Model

struct FlashcardItem: Identifiable, Codable {
    let id: String
    let question: String
    let answer: String
    let hint: String?
    let difficulty: String

    init(id: String = UUID().uuidString, question: String, answer: String, hint: String? = nil, difficulty: String = "Medium") {
        self.id = id
        self.question = question
        self.answer = answer
        self.hint = hint
        self.difficulty = difficulty
    }
}
