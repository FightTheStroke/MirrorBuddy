import AVFoundation
import Foundation

/// Service coordinating all Language mode specialized features
@MainActor
final class LanguageModeService: ObservableObject {
    @Published var activeLanguage: SupportedLanguage = .english
    @Published var vocabularyList: [VocabularyWord] = []
    @Published var recentTranslations: [TranslationResult] = []
    @Published var grammarChecks: [GrammarCheckResult] = []

    private let geminiClient: GeminiClient
    private let translationHelper: TranslationHelper
    private let pronunciationCoach: PronunciationCoach
    private let grammarChecker: GrammarChecker
    private let vocabularyBuilder: VocabularyBuilder

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
        self.translationHelper = TranslationHelper(geminiClient: geminiClient)
        self.pronunciationCoach = PronunciationCoach()
        self.grammarChecker = GrammarChecker(geminiClient: geminiClient)
        self.vocabularyBuilder = VocabularyBuilder(geminiClient: geminiClient)
    }

    // MARK: - Translation

    /// Translate text between languages
    func translate(
        text: String,
        from sourceLanguage: SupportedLanguage,
        to targetLanguage: SupportedLanguage,
        includeContext: Bool = true
    ) async throws -> TranslationResult {
        let result = try await translationHelper.translate(
            text: text,
            from: sourceLanguage,
            to: targetLanguage,
            includeContext: includeContext
        )

        await MainActor.run {
            self.recentTranslations.insert(result, at: 0)
            if self.recentTranslations.count > 50 {
                self.recentTranslations.removeLast()
            }
        }

        return result
    }

    // MARK: - Pronunciation

    /// Get pronunciation help for text
    func getPronunciationHelp(
        text: String,
        language: SupportedLanguage
    ) -> PronunciationGuide {
        pronunciationCoach.getPronunciationGuide(
            text: text,
            language: language
        )
    }

    /// Speak text using text-to-speech
    func speakText(
        _ text: String,
        language: SupportedLanguage,
        rate: Float = 0.5
    ) {
        pronunciationCoach.speak(text: text, language: language, rate: rate)
    }

    /// Stop current speech
    func stopSpeaking() {
        pronunciationCoach.stopSpeaking()
    }

    // MARK: - Grammar

    /// Check grammar and get corrections
    func checkGrammar(text: String, language: SupportedLanguage) async throws -> GrammarCheckResult {
        let result = try await grammarChecker.check(text: text, language: language)

        await MainActor.run {
            self.grammarChecks.insert(result, at: 0)
            if self.grammarChecks.count > 20 {
                self.grammarChecks.removeLast()
            }
        }

        return result
    }

    // MARK: - Vocabulary

    /// Add a word to the vocabulary builder
    func addVocabularyWord(
        word: String,
        language: SupportedLanguage,
        context: String?
    ) async throws -> VocabularyWord {
        let vocabWord = try await vocabularyBuilder.addWord(
            word: word,
            language: language,
            context: context
        )

        await MainActor.run {
            self.vocabularyList.append(vocabWord)
        }

        return vocabWord
    }

    /// Generate vocabulary exercises
    func generateVocabularyExercise(
        words: [VocabularyWord],
        exerciseType: VocabularyExerciseType
    ) async throws -> VocabularyExercise {
        try await vocabularyBuilder.generateExercise(
            words: words,
            type: exerciseType
        )
    }

    /// Get vocabulary statistics
    func getVocabularyStats() -> VocabularyStats {
        vocabularyBuilder.getStats(for: vocabularyList)
    }

    // MARK: - Conversation Practice

    /// Start a conversation practice session
    func startConversationPractice(
        topic: String,
        language: SupportedLanguage,
        level: LanguageProficiencyLevel
    ) async throws -> ConversationSession {
        let prompt = LanguagePrompts.conversationPracticePrompt(
            topic: topic,
            language: language,
            level: level
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a language tutor helping students practice conversation. Be encouraging and provide helpful corrections."
        )

        guard let data = response.data(using: .utf8),
              let sessionData = try? JSONDecoder().decode(ConversationSessionData.self, from: data) else {
            throw LanguageModeError.invalidConversationData
        }

        return ConversationSession(
            topic: topic,
            language: language,
            level: level,
            scenario: sessionData.scenario,
            starterPrompts: sessionData.starterPrompts,
            vocabularyHints: sessionData.vocabularyHints,
            grammarPoints: sessionData.grammarPoints
        )
    }

    /// Generate conversation response
    func generateConversationResponse(
        userMessage: String,
        session: ConversationSession
    ) async throws -> ConversationResponse {
        let prompt = LanguagePrompts.conversationResponsePrompt(
            userMessage: userMessage,
            session: session
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "Respond naturally as a conversation partner. Provide gentle corrections if needed."
        )

        guard let data = response.data(using: .utf8),
              let responseData = try? JSONDecoder().decode(ConversationResponse.self, from: data) else {
            throw LanguageModeError.invalidResponseData
        }

        return responseData
    }

    // MARK: - Listening Exercises

    /// Generate a listening comprehension exercise
    func generateListeningExercise(
        topic: String,
        language: SupportedLanguage,
        level: LanguageProficiencyLevel
    ) async throws -> ListeningExercise {
        let prompt = LanguagePrompts.listeningExercisePrompt(
            topic: topic,
            language: language,
            level: level
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "Create engaging listening comprehension exercises appropriate for the student's level."
        )

        guard let data = response.data(using: .utf8),
              let exercise = try? JSONDecoder().decode(ListeningExercise.self, from: data) else {
            throw LanguageModeError.invalidExerciseData
        }

        return exercise
    }
}

// MARK: - Supporting Types

enum SupportedLanguage: String, Codable, CaseIterable {
    case english = "English"
    case spanish = "Spanish"
    case french = "French"
    case german = "German"
    case italian = "Italian"
    case portuguese = "Portuguese"
    case chinese = "Chinese"
    case japanese = "Japanese"
    case korean = "Korean"
    case arabic = "Arabic"
    case russian = "Russian"

    var code: String {
        switch self {
        case .english: return "en"
        case .spanish: return "es"
        case .french: return "fr"
        case .german: return "de"
        case .italian: return "it"
        case .portuguese: return "pt"
        case .chinese: return "zh"
        case .japanese: return "ja"
        case .korean: return "ko"
        case .arabic: return "ar"
        case .russian: return "ru"
        }
    }

    var nativeFlag: String {
        switch self {
        case .english: return "🇬🇧"
        case .spanish: return "🇪🇸"
        case .french: return "🇫🇷"
        case .german: return "🇩🇪"
        case .italian: return "🇮🇹"
        case .portuguese: return "🇵🇹"
        case .chinese: return "🇨🇳"
        case .japanese: return "🇯🇵"
        case .korean: return "🇰🇷"
        case .arabic: return "🇸🇦"
        case .russian: return "🇷🇺"
        }
    }
}

enum LanguageProficiencyLevel: String, Codable {
    case beginner = "Beginner"
    case elementary = "Elementary"
    case intermediate = "Intermediate"
    case upperIntermediate = "Upper Intermediate"
    case advanced = "Advanced"
    case proficient = "Proficient"

    var cefr: String {
        switch self {
        case .beginner: return "A1"
        case .elementary: return "A2"
        case .intermediate: return "B1"
        case .upperIntermediate: return "B2"
        case .advanced: return "C1"
        case .proficient: return "C2"
        }
    }
}

struct ConversationSession: Identifiable {
    let id = UUID()
    let topic: String
    let language: SupportedLanguage
    let level: LanguageProficiencyLevel
    let scenario: String
    let starterPrompts: [String]
    let vocabularyHints: [String]
    let grammarPoints: [String]
    var messages: [ConversationMessage] = []

    mutating func addMessage(_ message: ConversationMessage) {
        messages.append(message)
    }
}

struct ConversationSessionData: Codable {
    let scenario: String
    let starterPrompts: [String]
    let vocabularyHints: [String]
    let grammarPoints: [String]
}

struct ConversationMessage: Identifiable, Codable {
    let id: UUID
    let sender: MessageSender
    let text: String
    let timestamp: Date
    let corrections: [String]?

    enum MessageSender: String, Codable {
        case user
        case assistant
    }

    init(id: UUID = UUID(), sender: MessageSender, text: String, timestamp: Date = Date(), corrections: [String]? = nil) {
        self.id = id
        self.sender = sender
        self.text = text
        self.timestamp = timestamp
        self.corrections = corrections
    }
}

struct ConversationResponse: Codable {
    let message: String
    let corrections: [String]?
    let suggestions: [String]?
    let vocabularyUsed: [String]?
}

struct ListeningExercise: Codable, Identifiable {
    let id: UUID
    let title: String
    let audioText: String
    let level: LanguageProficiencyLevel
    let questions: [ListeningQuestion]
    let transcript: String
    let vocabularyNotes: [String]

    struct ListeningQuestion: Codable, Identifiable {
        let id: UUID
        let question: String
        let options: [String]?
        let correctAnswer: String
        let explanation: String

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            self.id = UUID()
            self.question = try container.decode(String.self, forKey: .question)
            self.options = try container.decodeIfPresent([String].self, forKey: .options)
            self.correctAnswer = try container.decode(String.self, forKey: .correctAnswer)
            self.explanation = try container.decode(String.self, forKey: .explanation)
        }

        private enum CodingKeys: String, CodingKey {
            case question, options, correctAnswer, explanation
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.title = try container.decode(String.self, forKey: .title)
        self.audioText = try container.decode(String.self, forKey: .audioText)
        self.level = try container.decode(LanguageProficiencyLevel.self, forKey: .level)
        self.questions = try container.decode([ListeningQuestion].self, forKey: .questions)
        self.transcript = try container.decode(String.self, forKey: .transcript)
        self.vocabularyNotes = try container.decode([String].self, forKey: .vocabularyNotes)
    }

    private enum CodingKeys: String, CodingKey {
        case title, audioText, level, questions, transcript, vocabularyNotes
    }
}

enum LanguageModeError: Error, LocalizedError {
    case translationFailed(String)
    case grammarCheckFailed(String)
    case vocabularyError(String)
    case invalidConversationData
    case invalidResponseData
    case invalidExerciseData
    case pronunciationError(String)

    var errorDescription: String? {
        switch self {
        case .translationFailed(let reason):
            return "Translation failed: \(reason)"
        case .grammarCheckFailed(let reason):
            return "Grammar check failed: \(reason)"
        case .vocabularyError(let reason):
            return "Vocabulary error: \(reason)"
        case .invalidConversationData:
            return "Failed to parse conversation data"
        case .invalidResponseData:
            return "Failed to parse response data"
        case .invalidExerciseData:
            return "Failed to parse exercise data"
        case .pronunciationError(let reason):
            return "Pronunciation error: \(reason)"
        }
    }
}
