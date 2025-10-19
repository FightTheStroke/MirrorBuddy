import Foundation
import os.log

/// Coach persona configuration for tone and personality
@MainActor
final class CoachPersonaService: ObservableObject {
    static let shared = CoachPersonaService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "CoachPersonaService")

    // MARK: - Persona Types

    enum PersonaType: String, Codable, CaseIterable, Identifiable {
        case playful
        case calm
        case professional
        case enthusiastic

        var id: String { rawValue }

        var name: String {
            switch self {
            case .playful: return "Playful"
            case .calm: return "Calm"
            case .professional: return "Professional"
            case .enthusiastic: return "Enthusiastic"
            }
        }

        var description: String {
            switch self {
            case .playful:
                return "Fun, engaging, uses metaphors and humor"
            case .calm:
                return "Soothing, patient, methodical approach"
            case .professional:
                return "Formal, structured, focused on accuracy"
            case .enthusiastic:
                return "Energetic, motivating, celebrates progress"
            }
        }

        var icon: String {
            switch self {
            case .playful: return "face.smiling"
            case .calm: return "wind"
            case .professional: return "briefcase"
            case .enthusiastic: return "star.fill"
            }
        }

        var basePromptModifier: String {
            switch self {
            case .playful:
                return """
                Use a playful and engaging tone. Include creative metaphors, light humor, and make learning fun.
                Use analogies and relatable examples. Keep energy upbeat but not overwhelming.
                """
            case .calm:
                return """
                Use a calm and soothing tone. Speak slowly and clearly. Be extra patient and reassuring.
                Focus on creating a stress-free learning environment. Use gentle encouragement.
                """
            case .professional:
                return """
                Use a professional and structured tone. Be precise and formal. Focus on accuracy and methodology.
                Provide systematic explanations. Maintain clear boundaries between concepts.
                """
            case .enthusiastic:
                return """
                Use an enthusiastic and energetic tone. Celebrate every success. Be highly motivating.
                Express genuine excitement about learning. Use positive reinforcement frequently.
                """
            }
        }

        var speechRate: Float {
            switch self {
            case .playful: return 0.55
            case .calm: return 0.45
            case .professional: return 0.50
            case .enthusiastic: return 0.60
            }
        }

        var pitchMultiplier: Float {
            switch self {
            case .playful: return 1.1
            case .calm: return 0.95
            case .professional: return 1.0
            case .enthusiastic: return 1.15
            }
        }

        var volume: Float {
            switch self {
            case .playful: return 0.75
            case .calm: return 0.65
            case .professional: return 0.70
            case .enthusiastic: return 0.80
            }
        }
    }

    // MARK: - Current State

    @Published private(set) var currentPersona: PersonaType {
        didSet {
            savePersona()
            logger.info("Persona changed to: \(currentPersona.name)")
        }
    }

    // MARK: - Initialization

    private init() {
        self.currentPersona = Self.loadPersona()
    }

    // MARK: - Persistence

    private static let personaKey = "coach_persona_type"

    private static func loadPersona() -> PersonaType {
        guard let rawValue = UserDefaults.standard.string(forKey: personaKey),
              let persona = PersonaType(rawValue: rawValue) else {
            return .calm // Default to calm persona
        }
        return persona
    }

    private func savePersona() {
        UserDefaults.standard.set(currentPersona.rawValue, forKey: Self.personaKey)
    }

    // MARK: - Public Interface

    func setPersona(_ persona: PersonaType) {
        currentPersona = persona
    }

    // MARK: - Prompt Generation

    func generateSystemPromptModifier() -> String {
        currentPersona.basePromptModifier
    }

    func generateResponseStyle(for sentiment: SentimentAnalyzer.Sentiment) -> String {
        let base = currentPersona.basePromptModifier

        // Adapt style based on detected sentiment
        let sentimentAdaptation: String
        switch sentiment {
        case .frustrated, .confused:
            sentimentAdaptation = """

            IMPORTANT: Student is showing signs of \(sentiment.rawValue).
            - Be extra patient and supportive
            - Break concepts into smaller pieces
            - Use simpler language
            - Provide more encouragement
            - Slow down explanations
            """

        case .uncertain:
            sentimentAdaptation = """

            IMPORTANT: Student seems uncertain.
            - Provide gentle reassurance
            - Ask guiding questions
            - Check understanding frequently
            - Offer concrete examples
            """

        case .confident, .excited:
            sentimentAdaptation = """

            IMPORTANT: Student is engaged and \(sentiment.rawValue).
            - Match their energy level
            - You can move at a slightly faster pace
            - Introduce more advanced concepts if appropriate
            - Celebrate their progress
            """

        case .neutral:
            sentimentAdaptation = ""
        }

        return base + sentimentAdaptation
    }

    // MARK: - Voice Configuration

    struct VoiceConfiguration {
        let rate: Float
        let pitch: Float
        let volume: Float
        let language: String

        init(
            rate: Float,
            pitch: Float,
            volume: Float,
            language: String = "it-IT"
        ) {
            self.rate = rate
            self.pitch = pitch
            self.volume = volume
            self.language = language
        }
    }

    func getVoiceConfiguration(adaptedFor sentiment: SentimentAnalyzer.Sentiment? = nil) -> VoiceConfiguration {
        var rate = currentPersona.speechRate
        var pitch = currentPersona.pitchMultiplier
        let volume = currentPersona.volume

        // Adapt voice based on sentiment
        if let sentiment = sentiment {
            switch sentiment {
            case .frustrated, .confused:
                // Slow down and lower pitch for calming effect
                rate *= 0.9
                pitch *= 0.95

            case .uncertain:
                // Slightly slower, reassuring tone
                rate *= 0.95
                pitch *= 0.98

            case .excited:
                // Match enthusiasm
                rate *= 1.05
                pitch *= 1.03

            case .confident, .neutral:
                // Use baseline
                break
            }
        }

        return VoiceConfiguration(
            rate: rate,
            pitch: pitch,
            volume: volume
        )
    }

    // MARK: - Persona-Specific Responses

    func getEncouragementMessage(for achievement: CoachAchievement) -> String {
        switch currentPersona {
        case .playful:
            return getPlayfulEncouragement(for: achievement)
        case .calm:
            return getCalmEncouragement(for: achievement)
        case .professional:
            return getProfessionalEncouragement(for: achievement)
        case .enthusiastic:
            return getEnthusiasticEncouragement(for: achievement)
        }
    }

    private func getPlayfulEncouragement(for achievement: CoachAchievement) -> String {
        switch achievement {
        case .correctAnswer:
            return ["Bingo! 🎯", "Nailed it!", "You're on fire!", "That's the way!"].randomElement() ?? "Great!"
        case .goodProgress:
            return ["You're crushing it!", "Look at you go!", "Progress parade!", "Rising star alert!"].randomElement() ?? "Nice!"
        case .persistedThroughDifficulty:
            return ["Now that's determination!", "You don't quit, I love it!", "Persistence power!", "Like a boss!"].randomElement() ?? "Good work!"
        case .improvedUnderstanding:
            return ["Aha moment! 💡", "The lightbulb is on!", "Now you've got it!", "Understanding unlocked!"].randomElement() ?? "Excellent!"
        }
    }

    private func getCalmEncouragement(for achievement: CoachAchievement) -> String {
        switch achievement {
        case .correctAnswer:
            return ["That's right, well done", "Correct, you understand", "Yes, exactly", "Good job"].randomElement() ?? "Correct"
        case .goodProgress:
            return ["You're making steady progress", "I can see your growth", "You're improving nicely", "Well done so far"].randomElement() ?? "Good"
        case .persistedThroughDifficulty:
            return ["I appreciate your patience", "Your persistence is admirable", "You're handling this well", "Keep going steadily"].randomElement() ?? "Good"
        case .improvedUnderstanding:
            return ["Now it's becoming clear", "You're understanding better", "That makes sense now", "Good comprehension"].randomElement() ?? "Good"
        }
    }

    private func getProfessionalEncouragement(for achievement: CoachAchievement) -> String {
        switch achievement {
        case .correctAnswer:
            return ["Correct answer", "Accurate response", "Precisely right", "That is correct"].randomElement() ?? "Correct"
        case .goodProgress:
            return ["Progress noted", "Improvement documented", "Advancement confirmed", "Development observed"].randomElement() ?? "Progress made"
        case .persistedThroughDifficulty:
            return ["Commendable persistence", "Excellent work ethic", "Professional approach", "Consistent effort"].randomElement() ?? "Good effort"
        case .improvedUnderstanding:
            return ["Comprehension achieved", "Concept mastered", "Understanding confirmed", "Knowledge acquired"].randomElement() ?? "Well done"
        }
    }

    private func getEnthusiasticEncouragement(for achievement: CoachAchievement) -> String {
        switch achievement {
        case .correctAnswer:
            return ["YES! Perfect!", "Amazing work!", "Absolutely brilliant!", "Fantastic answer!"].randomElement() ?? "Great!"
        case .goodProgress:
            return ["Incredible progress!", "You're soaring!", "Phenomenal growth!", "Outstanding improvement!"].randomElement() ?? "Excellent!"
        case .persistedThroughDifficulty:
            return ["Your dedication is inspiring!", "What amazing perseverance!", "I'm so impressed!", "Brilliant determination!"].randomElement() ?? "Wonderful!"
        case .improvedUnderstanding:
            return ["Breakthrough moment!", "You totally got this!", "Magnificent understanding!", "Spectacular insight!"].randomElement() ?? "Excellent!"
        }
    }

    func getFrustrationResponse() -> String {
        switch currentPersona {
        case .playful:
            return "Hey, it's okay! Every expert was once a beginner. Let's break this down into bite-sized pieces."
        case .calm:
            return "Take a breath. It's perfectly fine to find this challenging. We'll work through it together, one step at a time."
        case .professional:
            return "Encountering difficulty is a normal part of the learning process. Let's approach this systematically."
        case .enthusiastic:
            return "Don't worry! This just means you're pushing your boundaries. That's where the real learning happens!"
        }
    }

    func getConfusionResponse() -> String {
        switch currentPersona {
        case .playful:
            return "No worries! Let me explain this in a different way. Think of it like..."
        case .calm:
            return "That's alright. Let's slow down and look at this more carefully."
        case .professional:
            return "I'll clarify. Let me provide a more detailed explanation."
        case .enthusiastic:
            return "Great question! I love that you're asking. Let me show you!"
        }
    }
}
