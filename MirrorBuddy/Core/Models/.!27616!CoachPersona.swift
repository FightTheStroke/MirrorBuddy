import Foundation
import SwiftData

/// User preference for coaching style and tone
@Model
final class CoachPersona {
    // MARK: - Persona Types

    enum PersonaType: String, Codable, CaseIterable {
        case playful
        case calm
        case enthusiastic
        case professional

        var displayName: String {
            switch self {
            case .playful:
                return "Playful & Fun"
            case .calm:
                return "Calm & Gentle"
            case .enthusiastic:
                return "Enthusiastic & Energetic"
            case .professional:
                return "Professional & Focused"
            }
        }

        var description: String {
            switch self {
            case .playful:
                return "Uses humor, emojis, and playful language to make learning fun"
            case .calm:
                return "Speaks gently and patiently, creating a relaxed learning environment"
            case .enthusiastic:
                return "Celebrates wins energetically and motivates with passion"
            case .professional:
                return "Maintains a focused, clear, and business-like tone"
            }
        }

        var voiceCharacteristics: VoiceCharacteristics {
            switch self {
            case .playful:
                return VoiceCharacteristics(
                    rate: 1.1,
                    pitch: 1.15,
                    volume: 0.9,
                    useExclamations: true,
                    useEmoticons: true
                )
            case .calm:
                return VoiceCharacteristics(
                    rate: 0.9,
                    pitch: 0.95,
                    volume: 0.75,
                    useExclamations: false,
                    useEmoticons: false
                )
            case .enthusiastic:
                return VoiceCharacteristics(
                    rate: 1.15,
                    pitch: 1.2,
                    volume: 1.0,
                    useExclamations: true,
                    useEmoticons: true
                )
            case .professional:
                return VoiceCharacteristics(
                    rate: 1.0,
                    pitch: 1.0,
                    volume: 0.85,
                    useExclamations: false,
                    useEmoticons: false
                )
            }
        }
    }

    struct VoiceCharacteristics: Codable {
        let rate: Float // 0.5-2.0, 1.0 = normal
        let pitch: Float // 0.5-2.0, 1.0 = normal
        let volume: Float // 0.0-1.0
        let useExclamations: Bool
        let useEmoticons: Bool
    }

    // MARK: - Properties

    @Attribute(.unique) var id: UUID
    var selectedPersona: String // PersonaType rawValue
    var customVoiceRate: Float?
    var customVoicePitch: Float?
    var enableEmotionAdaptation: Bool
    var lastUpdated: Date

    // MARK: - Computed Properties

    var personaType: PersonaType {
        get { PersonaType(rawValue: selectedPersona) ?? .calm }
        set { selectedPersona = newValue.rawValue }
    }

    var voiceCharacteristics: VoiceCharacteristics {
        var characteristics = personaType.voiceCharacteristics

        // Apply custom overrides if set
        if let customRate = customVoiceRate {
            characteristics = VoiceCharacteristics(
                rate: customRate,
                pitch: characteristics.pitch,
                volume: characteristics.volume,
                useExclamations: characteristics.useExclamations,
                useEmoticons: characteristics.useEmoticons
            )
        }

        if let customPitch = customVoicePitch {
            characteristics = VoiceCharacteristics(
                rate: characteristics.rate,
                pitch: customPitch,
                volume: characteristics.volume,
                useExclamations: characteristics.useExclamations,
                useEmoticons: characteristics.useEmoticons
            )
        }

        return characteristics
    }

    // MARK: - Initialization

    init(
        personaType: PersonaType = .calm,
        enableEmotionAdaptation: Bool = true
    ) {
        self.id = UUID()
        self.selectedPersona = personaType.rawValue
        self.enableEmotionAdaptation = enableEmotionAdaptation
        self.lastUpdated = Date()
    }

    // MARK: - Methods

    func updatePersona(_ type: PersonaType) {
        self.selectedPersona = type.rawValue
        self.lastUpdated = Date()
    }

    func setCustomVoiceSettings(rate: Float?, pitch: Float?) {
        self.customVoiceRate = rate
        self.customVoicePitch = pitch
        self.lastUpdated = Date()
    }

    /// Apply persona to text prompt
    func stylePrompt(_ baseText: String, sentiment: SentimentDetectionService.Sentiment) -> String {
        guard enableEmotionAdaptation else { return baseText }

        var styledText = baseText

        switch personaType {
        case .playful:
            styledText = addPlayfulTone(to: styledText, sentiment: sentiment)
        case .calm:
            styledText = addCalmTone(to: styledText, sentiment: sentiment)
        case .enthusiastic:
            styledText = addEnthusiasticTone(to: styledText, sentiment: sentiment)
        case .professional:
            styledText = addProfessionalTone(to: styledText, sentiment: sentiment)
        }

        return styledText
    }

    // MARK: - Private Helpers

    private func addPlayfulTone(to text: String, sentiment: SentimentDetectionService.Sentiment) -> String {
        switch sentiment {
        case .enthusiastic:
