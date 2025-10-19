import Foundation
import os.log

/// Main orchestrator for Italian Mode specialized features
/// Coordinates all Italian language and literature learning functionality
@MainActor
final class ItalianModeService {
    /// Shared singleton instance
    static let shared = ItalianModeService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ItalianMode")

    // Sub-services
    let grammarHelper: ItalianGrammarHelper
    let conjugationTables: ItalianConjugationTables
    let literatureSummarizer: ItalianLiteratureSummarizer
    let vocabularyBuilder: ItalianVocabularyBuilder
    let readingAssistant: ItalianReadingAssistant
    let audioReader: ItalianAudioReader
    let prompts: ItalianPrompts
    let mindMapTemplate: ItalianMindMapTemplate

    // Current session state
    private(set) var currentTopic: ItalianTopic?
    private(set) var vocabularyProgress: VocabularyProgress
    private(set) var grammarLevel: GrammarLevel = .intermediate

    // MARK: - Initialization

    private init() {
        self.grammarHelper = ItalianGrammarHelper()
        self.conjugationTables = ItalianConjugationTables()
        self.literatureSummarizer = ItalianLiteratureSummarizer()
        self.vocabularyBuilder = ItalianVocabularyBuilder()
        self.readingAssistant = ItalianReadingAssistant()
        self.audioReader = ItalianAudioReader()
        self.prompts = ItalianPrompts()
        self.mindMapTemplate = ItalianMindMapTemplate()
        self.vocabularyProgress = VocabularyProgress()

        logger.info("ItalianModeService initialized")
    }

    // MARK: - Session Management

    /// Start a new Italian learning session
    func startSession(topic: ItalianTopic, level: GrammarLevel = .intermediate) {
        self.currentTopic = topic
        self.grammarLevel = level
        logger.info("Started Italian session: \(topic.name) at \(level.rawValue) level")
    }

    /// Record vocabulary learning progress
    func recordVocabularyPractice(_ word: VocabularyWord, correct: Bool) {
        vocabularyProgress.recordAttempt(word: word, correct: correct)
    }

    /// Get session statistics
    func getSessionStats() -> ItalianSessionStats {
        ItalianSessionStats(
            topic: currentTopic,
            wordsLearned: vocabularyProgress.masteredWords.count,
            wordsReviewing: vocabularyProgress.reviewingWords.count,
            grammarLevel: grammarLevel
        )
    }

    /// End the current session
    func endSession() {
        logger.info("Ended Italian session")
        currentTopic = nil
    }

    // MARK: - Quick Access Methods

    /// Get AI prompt for current topic
    func getCurrentTopicPrompt() -> String? {
        guard let topic = currentTopic else { return nil }
        return prompts.getTopicPrompt(for: topic, level: grammarLevel)
    }

    /// Get grammar rules for current level
    func getCurrentLevelGrammar() -> [GrammarRule] {
        grammarHelper.getRules(for: grammarLevel)
    }

    /// Get vocabulary words for current topic
    func getCurrentTopicVocabulary() -> [VocabularyWord] {
        guard let topic = currentTopic else { return [] }
        return vocabularyBuilder.getWords(for: topic)
    }
}

// MARK: - Supporting Types

enum ItalianTopic: String, CaseIterable, Codable {
    case grammar = "Grammar"
    case vocabulary = "Vocabulary"
    case literature = "Literature"
    case conversation = "Conversation"
    case writing = "Writing"
    case readingComprehension = "Reading Comprehension"

    var name: String { rawValue }

    var subtopics: [String] {
        switch self {
        case .grammar:
            return ["Verb Conjugation", "Articles", "Pronouns", "Adjectives", "Prepositions", "Sentence Structure"]
        case .vocabulary:
            return ["Everyday Words", "Academic Words", "Idioms", "Expressions", "False Friends"]
        case .literature:
            return ["Poetry", "Novels", "Short Stories", "Essays", "Drama"]
        case .conversation:
            return ["Greetings", "Small Talk", "Formal Speech", "Slang", "Debates"]
        case .writing:
            return ["Essays", "Letters", "Creative Writing", "Academic Writing", "Business Writing"]
        case .readingComprehension:
            return ["Fiction", "Non-fiction", "News Articles", "Literary Analysis"]
        }
    }
}

enum GrammarLevel: String, Codable {
    case beginner = "beginner"
    case intermediate = "intermediate"
    case advanced = "advanced"

    var description: String {
        switch self {
        case .beginner: return "A1-A2: Basic grammar and simple sentences"
        case .intermediate: return "B1-B2: Complex grammar and longer texts"
        case .advanced: return "C1-C2: Advanced grammar and literary texts"
        }
    }
}

struct VocabularyProgress: Codable {
    private(set) var attempts: [String: [VocabularyAttempt]] = [:]

    var masteredWords: [String] {
        attempts.filter { _, attempts in
            let recent = attempts.suffix(5)
            return recent.count >= 3 && recent.allSatisfy { $0.correct }
        }.map { $0.key }
    }

    var reviewingWords: [String] {
        attempts.filter { word, _ in
            !masteredWords.contains(word)
        }.map { $0.key }
    }

    mutating func recordAttempt(word: VocabularyWord, correct: Bool) {
        let attempt = VocabularyAttempt(
            word: word.italian,
            correct: correct,
            timestamp: Date()
        )

        if attempts[word.italian] != nil {
            attempts[word.italian]?.append(attempt)
        } else {
            attempts[word.italian] = [attempt]
        }
    }
}

struct VocabularyAttempt: Codable {
    let word: String
    let correct: Bool
    let timestamp: Date
}

struct ItalianSessionStats {
    let topic: ItalianTopic?
    let wordsLearned: Int
    let wordsReviewing: Int
    let grammarLevel: GrammarLevel
}

enum ItalianModeError: LocalizedError {
    case noActiveSession
    case conjugationNotFound
    case audioGenerationFailed
    case textAnalysisFailed(String)

    var errorDescription: String? {
        switch self {
        case .noActiveSession:
            return "No active Italian session. Start a session first."
        case .conjugationNotFound:
            return "Conjugation not found for this verb."
        case .audioGenerationFailed:
            return "Failed to generate audio reading."
        case .textAnalysisFailed(let message):
            return "Text analysis failed: \(message)"
        }
    }
}
