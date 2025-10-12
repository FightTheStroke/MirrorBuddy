import Foundation
import os.log

/// Comprehensive personality and prompting system for the AI study coach
@MainActor
final class StudyCoachPersonality {
    /// Shared singleton instance
    static let shared = StudyCoachPersonality()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "StudyCoach")

    // MARK: - Core Personality Traits (Subtask 33.1)

    /// Core personality traits that define the study coach character
    struct PersonalityTraits {
        /// Coach is patient and never rushes the student
        static let patience = "patient and unhurried"

        /// Coach is encouraging and celebrates progress
        static let encouraging = "encouraging and supportive"

        /// Coach never judges or criticizes
        static let nonJudgmental = "non-judgmental and accepting"

        /// Coach adapts to student's pace
        static let adaptive = "adaptive to learning pace"

        /// Coach uses simple, clear language
        static let clear = "clear and simple in explanations"

        /// Coach provides concrete examples
        static let concrete = "focused on concrete examples"

        /// Coach maintains positive tone
        static let positive = "consistently positive and motivating"

        /// Coach remembers context across conversation
        static let contextAware = "contextually aware throughout conversation"

        /// Combined personality description
        static var fullDescription: String {
            """
            You are \(patience), \(encouraging), and \(nonJudgmental).
            You are \(adaptive), \(clear), and \(concrete).
            You maintain a \(positive) tone and are \(contextAware).
            """
        }
    }

    // MARK: - Language Support (Subtask 33.3)

    enum Language: String {
        case italian = "it"
        case english = "en"

        var name: String {
            switch self {
            case .italian: return "Italian"
            case .english: return "English"
            }
        }

        var systemPromptLanguageInstructions: String {
            switch self {
            case .italian:
                return """
                Comunica SEMPRE in italiano.
                Usa un linguaggio semplice e chiaro.
                Adatta il vocabolario al livello dello studente.
                """
            case .english:
                return """
                Always communicate in English.
                Use simple and clear language.
                Adapt vocabulary to student's level.
                """
            }
        }
    }

    // MARK: - Current Settings

    private(set) var currentLanguage: Language = .italian // Default to Italian (primary)
    private(set) var conversationContext: ConversationContext?

    // MARK: - Initialization

    private init() {
        loadSettings()
    }

    private func loadSettings() {
        // Load language preference from UserDefaults
        if let languageCode = UserDefaults.standard.string(forKey: "coach_language"),
           let language = Language(rawValue: languageCode) {
            currentLanguage = language
        }
    }

    // MARK: - System Prompts (Subtask 33.2)

    /// Generate complete system prompt for OpenAI Realtime API
    func generateSystemPrompt(for subject: String? = nil, material: String? = nil) -> String {
        let basePrompt = generateBasePrompt()
        let languageInstructions = currentLanguage.systemPromptLanguageInstructions
        let contextPrompt = generateContextPrompt(subject: subject, material: material)
        let behavioralGuidelines = generateBehavioralGuidelines()

        return """
        \(basePrompt)

        \(languageInstructions)

        \(contextPrompt)

        \(behavioralGuidelines)

        Remember: Your goal is to help the student understand, not just to provide answers.
        """
    }

    private func generateBasePrompt() -> String {
        """
        You are an AI study coach for students.
        \(PersonalityTraits.fullDescription)

        Your role is to:
        - Help students understand difficult concepts
        - Guide them through problem-solving with questions, not answers
        - Celebrate their progress and encourage effort
        - Never make them feel bad about mistakes
        - Adapt explanations to their understanding level
        """
    }

    private func generateContextPrompt(subject: String?, material: String?) -> String {
        guard let subject else {
            return "You are helping a student with their general studies."
        }

        let materialInfo = material.map { " with \($0)" } ?? ""
        return """
        Current Context:
        - Subject: \(subject)
        - Material: \(material ?? "General topics")

        You are currently helping a student with \(subject)\(materialInfo).
        Stay focused on this topic but be ready to explain prerequisites if needed.
        """
    }

    private func generateBehavioralGuidelines() -> String {
        switch currentLanguage {
        case .italian:
            return """
            Linee Guida Comportamentali:
            1. Usa sempre un tono gentile e incoraggiante
            2. Fai domande guida invece di dare risposte dirette
            3. Celebra ogni piccolo progresso
            4. Se lo studente è bloccato, semplifica il concetto
            5. Usa esempi concreti della vita reale
            6. Mantieni le spiegazioni brevi e chiare
            7. Controlla frequentemente la comprensione
            8. Adatta il ritmo allo studente
            """
        case .english:
            return """
            Behavioral Guidelines:
            1. Always use a kind and encouraging tone
            2. Ask guiding questions instead of giving direct answers
            3. Celebrate every small bit of progress
            4. If student is stuck, simplify the concept
            5. Use concrete real-world examples
            6. Keep explanations brief and clear
            7. Check understanding frequently
            8. Adapt pace to the student
            """
        }
    }

    // MARK: - Adaptive Pacing (Subtask 33.4)

    /// Analyze student response to determine if pacing adjustment needed
    func analyzePacing(studentResponse: String, difficulty: DifficultyLevel) -> PacingAdjustment {
        let responseLength = studentResponse.count
        let hasConfusionIndicators = containsConfusionIndicators(studentResponse)
        let hasConfidenceIndicators = containsConfidenceIndicators(studentResponse)

        // Pacing logic
        if hasConfusionIndicators || responseLength < 20 {
            return .slower(recommendation: "Student seems uncertain. Slow down and simplify.")
        } else if hasConfidenceIndicators && responseLength > 100 {
            return .faster(recommendation: "Student is engaged and confident. Can move faster.")
        } else {
            return .maintain(recommendation: "Current pace is appropriate.")
        }
    }

    private func containsConfusionIndicators(_ text: String) -> Bool {
        let lowercased = text.lowercased()
        let confusionWords = ["non capisco", "confuso", "difficile", "help", "don't understand", "confused", "hard"]
        return confusionWords.contains { lowercased.contains($0) }
    }

    private func containsConfidenceIndicators(_ text: String) -> Bool {
        let lowercased = text.lowercased()
        let confidenceWords = ["capito", "chiaro", "facile", "got it", "understand", "clear", "easy", "yes"]
        return confidenceWords.contains { lowercased.contains($0) }
    }

    // MARK: - Concept Simplification (Subtask 33.5)

    /// Generate simplified explanation prompt based on difficulty level
    func generateSimplificationPrompt(concept: String, level: SimplificationLevel) -> String {
        switch currentLanguage {
        case .italian:
            return generateItalianSimplificationPrompt(concept: concept, level: level)
        case .english:
            return generateEnglishSimplificationPrompt(concept: concept, level: level)
        }
    }

    private func generateItalianSimplificationPrompt(concept: String, level: SimplificationLevel) -> String {
        switch level {
        case .basic:
            return """
            Spiega "\(concept)" in modo molto semplice:
            - Usa solo parole che un bambino capirebbe
            - Usa un'analogia della vita quotidiana
            - Massimo 2-3 frasi
            """
        case .intermediate:
            return """
            Spiega "\(concept)" in modo chiaro:
            - Usa linguaggio semplice ma preciso
            - Includi un esempio pratico
            - Massimo 4-5 frasi
            """
        case .advanced:
            return """
            Spiega "\(concept)" in dettaglio:
            - Usa terminologia tecnica appropriata
            - Includi collegamenti ad altri concetti
            - Fornisci esempi multipli
            """
        }
    }

    private func generateEnglishSimplificationPrompt(concept: String, level: SimplificationLevel) -> String {
        switch level {
        case .basic:
            return """
            Explain "\(concept)" very simply:
            - Use only words a child would understand
            - Use an everyday life analogy
            - Maximum 2-3 sentences
            """
        case .intermediate:
            return """
            Explain "\(concept)" clearly:
            - Use simple but precise language
            - Include a practical example
            - Maximum 4-5 sentences
            """
        case .advanced:
            return """
            Explain "\(concept)" in detail:
            - Use appropriate technical terminology
            - Include connections to other concepts
            - Provide multiple examples
            """
        }
    }

    // MARK: - Examples Generation (Subtask 33.6)

    /// Generate prompt for creating concrete examples
    func generateExamplePrompt(concept: String, context: String?) -> String {
        let contextInfo = context.map { " nel contesto di \($0)" } ?? ""

        switch currentLanguage {
        case .italian:
            return """
            Genera un esempio concreto per "\(concept)"\(contextInfo):
            - Usa una situazione della vita reale
            - Rendi l'esempio relazionabile per uno studente
            - Mostra passo-passo come il concetto si applica
            - Mantieni l'esempio semplice ma efficace
            """
        case .english:
            return """
            Generate a concrete example for "\(concept)"\(contextInfo):
            - Use a real-life situation
            - Make it relatable for a student
            - Show step-by-step how the concept applies
            - Keep the example simple but effective
            """
        }
    }

    // MARK: - Positive Reinforcement (Subtask 33.7)

    /// Generate positive reinforcement message based on achievement
    func generateReinforcementMessage(achievement: CoachAchievement) -> String {
        switch currentLanguage {
        case .italian:
            return generateItalianReinforcement(achievement)
        case .english:
            return generateEnglishReinforcement(achievement)
        }
    }

    private func generateItalianReinforcement(_ achievement: CoachAchievement) -> String {
        switch achievement {
        case .correctAnswer:
            return [
                "Esatto! Ben fatto!",
                "Perfetto! Hai capito!",
                "Giusto! Ottimo lavoro!",
                "Bravo! Continua così!",
                "Eccellente! Stai andando benissimo!"
            ].randomElement()!

        case .goodProgress:
            return [
                "Stai facendo progressi fantastici!",
                "Vedo che stai migliorando molto!",
                "Ottimo lavoro! Continua così!",
                "Stai andando alla grande!"
            ].randomElement()!

        case .persistedThroughDifficulty:
            return [
                "Mi piace molto che non ti arrendi!",
                "La tua determinazione è fantastica!",
                "Continuare a provare è la cosa più importante!",
                "Bravo per non mollare!"
            ].randomElement()!

        case .improvedUnderstanding:
            return [
                "Fantastico! Ora hai capito!",
                "Vedi? Ce l'hai fatta!",
                "Eccellente! Ora è tutto più chiaro!",
                "Grande! Hai fatto un passo importante!"
            ].randomElement()!
        }
    }

    private func generateEnglishReinforcement(_ achievement: CoachAchievement) -> String {
        switch achievement {
        case .correctAnswer:
            return [
                "Exactly! Well done!",
                "Perfect! You got it!",
                "Right! Great work!",
                "Nice! Keep it up!",
                "Excellent! You're doing great!"
            ].randomElement()!

        case .goodProgress:
            return [
                "You're making fantastic progress!",
                "I can see you're improving a lot!",
                "Great work! Keep going!",
                "You're doing amazing!"
            ].randomElement()!

        case .persistedThroughDifficulty:
            return [
                "I really like that you don't give up!",
                "Your determination is fantastic!",
                "Keeping trying is the most important thing!",
                "Great job for not giving up!"
            ].randomElement()!

        case .improvedUnderstanding:
            return [
                "Fantastic! Now you understand!",
                "See? You did it!",
                "Excellent! It's all clear now!",
                "Great! You've made an important step!"
            ].randomElement()!
        }
    }

    // MARK: - Conversation Memory (Subtask 33.8)

    /// Update conversation context with new information
    func updateContext(_ context: ConversationContext) {
        self.conversationContext = context
        logger.info("Context updated: \(context.subject ?? "no subject") - topics covered: \(context.topicsCovered.count)")
    }

    /// Get relevant context for current conversation
    func getContextPrompt() -> String? {
        guard let context = conversationContext else { return nil }

        let topicsList = context.topicsCovered.joined(separator: ", ")
        let strugglesInfo = context.strugglingConcepts.isEmpty ? "" : " Struggling with: \(context.strugglingConcepts.joined(separator: ", "))"

        return """
        Conversation Context:
        - Topics covered: \(topicsList)
        - Current difficulty level: \(context.currentDifficultyLevel.rawValue)
        \(strugglesInfo)

        Use this context to:
        - Build on previously covered material
        - Reference past successes
        - Adjust difficulty appropriately
        - Focus on struggling areas
        """
    }

    /// Clear conversation context (e.g., when starting new session)
    func clearContext() {
        conversationContext = nil
        logger.info("Conversation context cleared")
    }

    // MARK: - Language Switching

    /// Switch coach language
    func setLanguage(_ language: Language) {
        currentLanguage = language
        UserDefaults.standard.set(language.rawValue, forKey: "coach_language")
        logger.info("Coach language changed to: \(language.name)")
    }
}

// MARK: - Supporting Types

enum DifficultyLevel: String, Codable {
    case beginner
    case intermediate
    case advanced
}

enum SimplificationLevel {
    case basic
    case intermediate
    case advanced
}

enum PacingAdjustment {
    case slower(recommendation: String)
    case faster(recommendation: String)
    case maintain(recommendation: String)
}

enum CoachAchievement {
    case correctAnswer
    case goodProgress
    case persistedThroughDifficulty
    case improvedUnderstanding
}

struct ConversationContext: Codable {
    var subject: String?
    var material: String?
    var topicsCovered: [String]
    var strugglingConcepts: [String]
    var currentDifficultyLevel: DifficultyLevel
    var sessionStartTime: Date
    var totalQuestionsAsked: Int
    var correctAnswers: Int

    init(
        subject: String? = nil,
        material: String? = nil,
        topicsCovered: [String] = [],
        strugglingConcepts: [String] = [],
        currentDifficultyLevel: DifficultyLevel = .intermediate,
        sessionStartTime: Date = Date(),
        totalQuestionsAsked: Int = 0,
        correctAnswers: Int = 0
    ) {
        self.subject = subject
        self.material = material
        self.topicsCovered = topicsCovered
        self.strugglingConcepts = strugglingConcepts
        self.currentDifficultyLevel = currentDifficultyLevel
        self.sessionStartTime = sessionStartTime
        self.totalQuestionsAsked = totalQuestionsAsked
        self.correctAnswers = correctAnswers
    }

    var successRate: Double {
        guard totalQuestionsAsked > 0 else { return 0 }
        return Double(correctAnswers) / Double(totalQuestionsAsked)
    }

    var sessionDuration: TimeInterval {
        Date().timeIntervalSince(sessionStartTime)
    }
}
