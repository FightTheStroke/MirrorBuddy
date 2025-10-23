import Foundation

/// Grammar checking and correction service
@MainActor
final class GrammarChecker {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    /// Check grammar and provide corrections
    func check(text: String, language: SupportedLanguage) async throws -> GrammarCheckResult {
        let prompt = createGrammarPrompt(text: text, language: language)

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a grammar expert. Provide clear, educational corrections."
        )

        guard let data = response.data(using: .utf8),
              let checkData = try? JSONDecoder().decode(GrammarCheckData.self, from: data) else {
            throw LanguageModeError.grammarCheckFailed("Failed to parse grammar check")
        }

        return GrammarCheckResult(
            originalText: text,
            correctedText: checkData.correctedText,
            errors: checkData.errors,
            overallScore: checkData.overallScore,
            suggestions: checkData.suggestions,
            timestamp: Date()
        )
    }

    private func createGrammarPrompt(text: String, language: SupportedLanguage) -> String {
        """
        Check the grammar of this \(language.rawValue) text:

        "\(text)"

        Provide detailed analysis in JSON:
        {
          "correctedText": "Text with corrections applied",
          "errors": [
            {
              "type": "grammar|spelling|punctuation|style",
              "originalText": "incorrect text",
              "correctedText": "correct text",
              "position": 0,
              "explanation": "Why this is wrong and how to fix it",
              "severity": "high|medium|low"
            }
          ],
          "overallScore": 85,
          "suggestions": ["General writing improvement suggestions"]
        }

        Identify all errors and provide educational explanations.
        """
    }

    private struct GrammarCheckData: Codable {
        let correctedText: String
        let errors: [GrammarError]
        let overallScore: Int
        let suggestions: [String]
    }
}

// MARK: - Grammar Check Result

struct GrammarCheckResult: Identifiable, Codable {
    let id: UUID
    let originalText: String
    let correctedText: String
    let errors: [GrammarError]
    let overallScore: Int // 0-100
    let suggestions: [String]
    let timestamp: Date

    init(
        id: UUID = UUID(),
        originalText: String,
        correctedText: String,
        errors: [GrammarError],
        overallScore: Int,
        suggestions: [String],
        timestamp: Date
    ) {
        self.id = id
        self.originalText = originalText
        self.correctedText = correctedText
        self.errors = errors
        self.overallScore = overallScore
        self.suggestions = suggestions
        self.timestamp = timestamp
    }

    var hasErrors: Bool {
        !errors.isEmpty
    }

    var errorsByType: [GrammarErrorType: [GrammarError]] {
        Dictionary(grouping: errors) { $0.type }
    }
}

struct GrammarError: Codable, Identifiable {
    let id: UUID
    let type: GrammarErrorType
    let originalText: String
    let correctedText: String
    let position: Int
    let explanation: String
    let severity: ErrorSeverity

    enum ErrorSeverity: String, Codable {
        case high
        case medium
        case low

        var color: String {
            switch self {
            case .high: return "red"
            case .medium: return "orange"
            case .low: return "yellow"
            }
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.type = try container.decode(GrammarErrorType.self, forKey: .type)
        self.originalText = try container.decode(String.self, forKey: .originalText)
        self.correctedText = try container.decode(String.self, forKey: .correctedText)
        self.position = try container.decode(Int.self, forKey: .position)
        self.explanation = try container.decode(String.self, forKey: .explanation)
        self.severity = try container.decode(ErrorSeverity.self, forKey: .severity)
    }

    private enum CodingKeys: String, CodingKey {
        case type, originalText, correctedText, position, explanation, severity
    }
}

enum GrammarErrorType: String, Codable {
    case grammar
    case spelling
    case punctuation
    case style

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .grammar: return "text.book.closed"
        case .spelling: return "abc"
        case .punctuation: return "exclamationmark.triangle"
        case .style: return "paintbrush"
        }
    }
}
