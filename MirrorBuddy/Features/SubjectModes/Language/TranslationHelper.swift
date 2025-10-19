import Foundation

/// Translation service with context and cultural notes
@MainActor
final class TranslationHelper {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    /// Translate text with optional context
    func translate(
        text: String,
        from sourceLanguage: SupportedLanguage,
        to targetLanguage: SupportedLanguage,
        includeContext: Bool = true
    ) async throws -> TranslationResult {
        let prompt = createTranslationPrompt(
            text: text,
            from: sourceLanguage,
            to: targetLanguage,
            includeContext: includeContext
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a professional translator. Provide accurate translations with cultural context."
        )

        guard let data = response.data(using: .utf8),
              let translationData = try? JSONDecoder().decode(TranslationData.self, from: data) else {
            throw LanguageModeError.translationFailed("Failed to parse translation")
        }

        return TranslationResult(
            originalText: text,
            translatedText: translationData.translation,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage,
            literalTranslation: translationData.literalTranslation,
            alternativeTranslations: translationData.alternatives,
            culturalNotes: translationData.culturalNotes,
            grammarNotes: translationData.grammarNotes,
            timestamp: Date()
        )
    }

    private func createTranslationPrompt(
        text: String,
        from sourceLanguage: SupportedLanguage,
        to targetLanguage: SupportedLanguage,
        includeContext: Bool
    ) -> String {
        if includeContext {
            return """
            Translate the following text from \(sourceLanguage.rawValue) to \(targetLanguage.rawValue):

            "\(text)"

            Provide a comprehensive translation response in JSON format:
            {
              "translation": "Natural, fluent translation",
              "literalTranslation": "Word-for-word translation if different",
              "alternatives": ["Alternative translation 1", "Alternative translation 2"],
              "culturalNotes": ["Any cultural context or usage notes"],
              "grammarNotes": ["Grammar points or language structure explanations"]
            }

            Focus on natural, idiomatic translation while preserving meaning.
            """
        } else {
            return """
            Translate the following text from \(sourceLanguage.rawValue) to \(targetLanguage.rawValue):

            "\(text)"

            Provide only the best translation in JSON format:
            {
              "translation": "Natural translation here",
              "literalTranslation": null,
              "alternatives": [],
              "culturalNotes": [],
              "grammarNotes": []
            }
            """
        }
    }

    private struct TranslationData: Codable {
        let translation: String
        let literalTranslation: String?
        let alternatives: [String]
        let culturalNotes: [String]
        let grammarNotes: [String]
    }
}

// MARK: - Translation Result

struct TranslationResult: Identifiable, Codable {
    let id: UUID
    let originalText: String
    let translatedText: String
    let sourceLanguage: SupportedLanguage
    let targetLanguage: SupportedLanguage
    let literalTranslation: String?
    let alternativeTranslations: [String]
    let culturalNotes: [String]
    let grammarNotes: [String]
    let timestamp: Date

    init(
        id: UUID = UUID(),
        originalText: String,
        translatedText: String,
        sourceLanguage: SupportedLanguage,
        targetLanguage: SupportedLanguage,
        literalTranslation: String?,
        alternativeTranslations: [String],
        culturalNotes: [String],
        grammarNotes: [String],
        timestamp: Date
    ) {
        self.id = id
        self.originalText = originalText
        self.translatedText = translatedText
        self.sourceLanguage = sourceLanguage
        self.targetLanguage = targetLanguage
        self.literalTranslation = literalTranslation
        self.alternativeTranslations = alternativeTranslations
        self.culturalNotes = culturalNotes
        self.grammarNotes = grammarNotes
        self.timestamp = timestamp
    }
}
