import Foundation
import os.log

/// Reading comprehension assistant for Italian texts
@MainActor
final class ItalianReadingAssistant {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ItalianReading")

    // MARK: - Text Analysis

    /// Analyze difficulty of an Italian text
    func analyzeTextDifficulty(_ text: String) -> TextDifficulty {
        let wordCount = text.split(separator: " ").count
        let sentenceCount = text.components(separatedBy: CharacterSet(charactersIn: ".!?")).count
        let averageWordLength = text.replacingOccurrences(of: " ", with: "").count / max(wordCount, 1)

        let complexWords = countComplexWords(text)
        let subordinateClauses = countSubordinateClauses(text)

        let score = calculateDifficultyScore(
            wordCount: wordCount,
            sentenceCount: sentenceCount,
            averageWordLength: averageWordLength,
            complexWords: complexWords,
            subordinateClauses: subordinateClauses
        )

        return TextDifficulty(
            level: determineLevelFromScore(score),
            score: score,
            wordCount: wordCount,
            estimatedReadingTime: Double(wordCount) / 200.0, // 200 words per minute
            vocabularyLevel: classifyVocabulary(complexWords, total: wordCount)
        )
    }

    /// Extract key vocabulary from text
    func extractKeyVocabulary(_ text: String) -> [VocabularyWord] {
        // Extract important words (simplified implementation)
        let words = text.split(separator: " ").map { String($0) }
        let uniqueWords = Set(words)

        return Array(uniqueWords.prefix(10)).compactMap { word in
            VocabularyWord(
                italian: word,
                english: "", // Would use dictionary lookup in production
                level: .intermediate,
                category: .nouns,
                exampleSentence: "",
                notes: "From text"
            )
        }
    }

    /// Generate comprehension questions
    func generateComprehensionQuestions(_ text: String, count: Int = 5) -> [ComprehensionQuestion] {
        // Generate questions based on text (simplified)
        [
            ComprehensionQuestion(
                question: "Qual è l'idea principale del testo?",
                type: .mainIdea,
                difficulty: .intermediate
            ),
            ComprehensionQuestion(
                question: "Chi sono i personaggi principali?",
                type: .detail,
                difficulty: .beginner
            ),
            ComprehensionQuestion(
                question: "Dove si svolge la storia?",
                type: .detail,
                difficulty: .beginner
            ),
            ComprehensionQuestion(
                question: "Qual è il tema centrale?",
                type: .inference,
                difficulty: .advanced
            ),
            ComprehensionQuestion(
                question: "Come finisce il testo?",
                type: .sequence,
                difficulty: .intermediate
            )
        ]
        return Array(questions.prefix(count))
    }

    /// Provide reading strategies
    func suggestReadingStrategies(for difficulty: TextDifficulty) -> [ReadingStrategy] {
        switch difficulty.level {
        case .beginner:
            return [
                ReadingStrategy(name: "Pre-lettura", description: "Guarda il titolo e le immagini prima di leggere."),
                ReadingStrategy(name: "Vocabolario chiave", description: "Impara 5-10 parole chiave prima di iniziare."),
                ReadingStrategy(name: "Lettura lenta", description: "Leggi lentamente, parola per parola.")
            ]
        case .intermediate:
            return [
                ReadingStrategy(name: "Skimming", description: "Leggi velocemente per cogliere l'idea generale."),
                ReadingStrategy(name: "Annotazioni", description: "Sottolinea parole nuove e frasi importanti."),
                ReadingStrategy(name: "Riassunto", description: "Riassumi ogni paragrafo con parole tue.")
            ]
        case .advanced:
            return [
                ReadingStrategy(name: "Analisi critica", description: "Analizza lo stile e le tecniche letterarie."),
                ReadingStrategy(name: "Collegamenti", description: "Collega il testo al contesto storico e culturale."),
                ReadingStrategy(name: "Discussione", description: "Discuti le tematiche e le interpretazioni.")
            ]
        }
    }

    // MARK: - Private Methods

    private func countComplexWords(_ text: String) -> Int {
        text.split(separator: " ").filter { $0.count > 8 }.count
    }

    private func countSubordinateClauses(_ text: String) -> Int {
        let subordinatingWords = ["che", "quando", "se", "perché", "mentre", "sebbene"]
        return subordinatingWords.reduce(0) { count, word in
            count + text.lowercased().components(separatedBy: word).count - 1
        }
    }

    private func calculateDifficultyScore(wordCount: Int, sentenceCount: Int, averageWordLength: Int, complexWords: Int, subordinateClauses: Int) -> Double {
        let wordsPerSentence = Double(wordCount) / Double(max(sentenceCount, 1))
        let complexWordRatio = Double(complexWords) / Double(max(wordCount, 1))

        return (wordsPerSentence * 0.3) + (Double(averageWordLength) * 0.2) + (complexWordRatio * 100 * 0.3) + (Double(subordinateClauses) * 0.2)
    }

    private func determineLevelFromScore(_ score: Double) -> VocabularyLevel {
        if score < 15 {
            return .beginner
        } else if score < 30 {
            return .intermediate
        } else {
            return .advanced
        }
    }

    private func classifyVocabulary(_ complexWords: Int, total: Int) -> String {
        let ratio = Double(complexWords) / Double(max(total, 1))
        if ratio < 0.1 {
            return "Simple vocabulary"
        } else if ratio < 0.3 {
            return "Moderate vocabulary"
        } else {
            return "Advanced vocabulary"
        }
    }
}

// MARK: - Supporting Types

struct TextDifficulty {
    let level: VocabularyLevel
    let score: Double
    let wordCount: Int
    let estimatedReadingTime: TimeInterval
    let vocabularyLevel: String
}

struct ComprehensionQuestion {
    let question: String
    let type: QuestionType
    let difficulty: VocabularyLevel

    enum QuestionType {
        case mainIdea
        case detail
        case inference
        case vocabulary
        case sequence
    }
}

struct ReadingStrategy {
    let name: String
    let description: String
}
