import AVFoundation
import Foundation

/// Pronunciation assistance using iOS AVSpeechSynthesizer
@MainActor
final class PronunciationCoach: NSObject, ObservableObject {
    private let synthesizer = AVSpeechSynthesizer()
    @Published var isSpeaking = false

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    /// Get pronunciation guide for text
    func getPronunciationGuide(text: String, language: SupportedLanguage) -> PronunciationGuide {
        PronunciationGuide(
            text: text,
            language: language,
            phoneticSpelling: generatePhoneticSpelling(text: text, language: language),
            syllables: breakIntoSyllables(text: text),
            stressPoints: identifyStressPoints(text: text),
            tips: generatePronunciationTips(text: text, language: language)
        )
    }

    /// Speak text using text-to-speech
    func speak(text: String, language: SupportedLanguage, rate: Float = 0.5) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: getLanguageCode(for: language))
        utterance.rate = rate // 0.0 to 1.0
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        synthesizer.speak(utterance)
    }

    /// Stop current speech
    func stopSpeaking() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    /// Pause current speech
    func pauseSpeaking() {
        synthesizer.pauseSpeaking(at: .word)
    }

    /// Resume paused speech
    func resumeSpeaking() {
        synthesizer.continueSpeaking()
    }

    // MARK: - Private Helpers

    private func getLanguageCode(for language: SupportedLanguage) -> String {
        switch language {
        case .english: return "en-US"
        case .spanish: return "es-ES"
        case .french: return "fr-FR"
        case .german: return "de-DE"
        case .italian: return "it-IT"
        case .portuguese: return "pt-PT"
        case .chinese: return "zh-CN"
        case .japanese: return "ja-JP"
        case .korean: return "ko-KR"
        case .arabic: return "ar-SA"
        case .russian: return "ru-RU"
        }
    }

    private func generatePhoneticSpelling(text: String, language: SupportedLanguage) -> String {
        // Simplified phonetic spelling
        // In a real implementation, this would use IPA (International Phonetic Alphabet)
        text.lowercased()
    }

    private func breakIntoSyllables(text: String) -> [String] {
        // Simplified syllable breaking
        // Real implementation would use linguistic rules
        let words = text.components(separatedBy: .whitespaces)
        return words.flatMap { word -> [String] in
            // Simple vowel-based splitting
            var syllables: [String] = []
            var currentSyllable = ""

            for char in word {
                currentSyllable.append(char)
                if "aeiouAEIOU".contains(char) && currentSyllable.count > 1 {
                    syllables.append(currentSyllable)
                    currentSyllable = ""
                }
            }

            if !currentSyllable.isEmpty {
                if let last = syllables.last {
                    syllables[syllables.count - 1] = last + currentSyllable
                } else {
                    syllables.append(currentSyllable)
                }
            }

            return syllables.isEmpty ? [word] : syllables
        }
    }

    private func identifyStressPoints(text: String) -> [Int] {
        // Simplified stress identification
        // Real implementation would use linguistic analysis
        let syllables = breakIntoSyllables(text: text)
        var stressPoints: [Int] = []

        // Typically stress first syllable of multi-syllable words
        var index = 0
        var wordStart = 0
        for (i, _) in syllables.enumerated() {
            if i == wordStart && syllables.count > wordStart + 1 {
                stressPoints.append(i)
            }
            index += 1
        }

        return stressPoints
    }

    private func generatePronunciationTips(text: String, language: SupportedLanguage) -> [String] {
        var tips: [String] = []

        switch language {
        case .english:
            tips.append("Pay attention to stress on multi-syllable words")
            tips.append("English has many silent letters - listen carefully")
        case .spanish:
            tips.append("Spanish vowels are pure - each vowel makes one sound")
            tips.append("Roll your 'r' sounds")
        case .french:
            tips.append("Practice the French 'r' sound at the back of your throat")
            tips.append("Nasal vowels are important in French")
        case .german:
            tips.append("German has distinct sounds like 'ch' and 'sch'")
            tips.append("Compound words are stressed on the first part")
        case .italian:
            tips.append("Italian pronunciation is very regular")
            tips.append("Each vowel is pronounced clearly")
        case .portuguese:
            tips.append("Portuguese has nasal sounds indicated by '~'")
            tips.append("Stress can change word meaning")
        case .chinese:
            tips.append("Mandarin has four tones that change meaning")
            tips.append("Practice each tone separately")
        case .japanese:
            tips.append("Japanese has pitch accent, not stress")
            tips.append("Each syllable gets equal time")
        case .korean:
            tips.append("Korean has unique consonant sounds")
            tips.append("Pay attention to double consonants")
        case .arabic:
            tips.append("Arabic has sounds from deep in the throat")
            tips.append("Vowels can be short or long")
        case .russian:
            tips.append("Russian has soft and hard consonants")
            tips.append("Stress is unpredictable - must be learned")
        }

        return tips
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension PronunciationCoach: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = true
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
        }
    }
}

// MARK: - Pronunciation Guide

struct PronunciationGuide: Identifiable {
    let id = UUID()
    let text: String
    let language: SupportedLanguage
    let phoneticSpelling: String
    let syllables: [String]
    let stressPoints: [Int]
    let tips: [String]

    var syllablesWithStress: [(syllable: String, isStressed: Bool)] {
        syllables.enumerated().map { index, syllable in
            (syllable: syllable, isStressed: stressPoints.contains(index))
        }
    }
}
