import Foundation

/// Vocabulary building system with spaced repetition
final class ItalianVocabularyBuilder {
    // MARK: - Vocabulary Management

    /// Get vocabulary words for a specific topic
    func getWords(for topic: ItalianTopic) -> [VocabularyWord] {
        switch topic {
        case .vocabulary:
            return commonWords
        case .grammar:
            return grammarTerms
        case .literature:
            return literaryTerms
        default:
            return commonWords
        }
    }

    /// Get words by difficulty level
    func getWordsByLevel(_ level: VocabularyLevel) -> [VocabularyWord] {
        allWords.filter { $0.level == level }
    }

    /// Get words by category
    func getWordsByCategory(_ category: VocabularyCategory) -> [VocabularyWord] {
        allWords.filter { $0.category == category }
    }

    /// Search words
    func search(query: String) -> [VocabularyWord] {
        allWords.filter { word in
            word.italian.lowercased().contains(query.lowercased()) ||
                word.english.lowercased().contains(query.lowercased())
        }
    }

    // MARK: - Word Lists

    private var commonWords: [VocabularyWord] {
        [
            VocabularyWord(italian: "casa", english: "house", level: .beginner, category: .nouns, exampleSentence: "La mia casa è grande.", notes: "Feminine noun"),
            VocabularyWord(italian: "libro", english: "book", level: .beginner, category: .nouns, exampleSentence: "Il libro è interessante.", notes: "Masculine noun"),
            VocabularyWord(italian: "mangiare", english: "to eat", level: .beginner, category: .verbs, exampleSentence: "Mi piace mangiare la pizza.", notes: "-ARE verb"),
            VocabularyWord(italian: "bello", english: "beautiful", level: .beginner, category: .adjectives, exampleSentence: "Che bel panorama!", notes: "Changes form before nouns"),
            VocabularyWord(italian: "sempre", english: "always", level: .beginner, category: .adverbs, exampleSentence: "Sono sempre felice.", notes: "Adverb of frequency"),
            VocabularyWord(italian: "studiare", english: "to study", level: .beginner, category: .verbs, exampleSentence: "Devo studiare italiano.", notes: "-ARE verb"),
            VocabularyWord(italian: "famiglia", english: "family", level: .beginner, category: .nouns, exampleSentence: "Amo la mia famiglia.", notes: "Feminine noun"),
            VocabularyWord(italian: "amico", english: "friend (male)", level: .beginner, category: .nouns, exampleSentence: "Lui è il mio migliore amico.", notes: "Plural: amici"),
            VocabularyWord(italian: "amica", english: "friend (female)", level: .beginner, category: .nouns, exampleSentence: "Lei è la mia migliore amica.", notes: "Plural: amiche"),
            VocabularyWord(italian: "parlare", english: "to speak", level: .beginner, category: .verbs, exampleSentence: "Parlo italiano e inglese.", notes: "-ARE verb"),
            VocabularyWord(italian: "scrivere", english: "to write", level: .intermediate, category: .verbs, exampleSentence: "Scrivo una lettera.", notes: "-ERE verb"),
            VocabularyWord(italian: "leggere", english: "to read", level: .intermediate, category: .verbs, exampleSentence: "Leggo un libro.", notes: "Irregular past participle: letto"),
            VocabularyWord(italian: "capire", english: "to understand", level: .intermediate, category: .verbs, exampleSentence: "Capisco l'italiano.", notes: "-IRE verb with -isc-"),
            VocabularyWord(italian: "sapere", english: "to know (facts)", level: .intermediate, category: .verbs, exampleSentence: "So parlare italiano.", notes: "Irregular verb"),
            VocabularyWord(italian: "conoscere", english: "to know (people/places)", level: .intermediate, category: .verbs, exampleSentence: "Conosco Roma.", notes: "Different from sapere"),
            VocabularyWord(italian: "tuttavia", english: "however", level: .advanced, category: .conjunctions, exampleSentence: "È difficile, tuttavia possibile.", notes: "Formal conjunction"),
            VocabularyWord(italian: "sebbene", english: "although", level: .advanced, category: .conjunctions, exampleSentence: "Sebbene sia stanco, continuo.", notes: "Requires subjunctive"),
            VocabularyWord(italian: "qualunque", english: "whatever/any", level: .advanced, category: .pronouns, exampleSentence: "Qualunque cosa tu dica.", notes: "Requires subjunctive")
        ]
    }

    private var grammarTerms: [VocabularyWord] {
        [
            VocabularyWord(italian: "sostantivo", english: "noun", level: .intermediate, category: .grammarTerms, exampleSentence: "Il sostantivo è una parte del discorso.", notes: "Grammar term"),
            VocabularyWord(italian: "verbo", english: "verb", level: .intermediate, category: .grammarTerms, exampleSentence: "Il verbo esprime un'azione.", notes: "Grammar term"),
            VocabularyWord(italian: "aggettivo", english: "adjective", level: .intermediate, category: .grammarTerms, exampleSentence: "L'aggettivo descrive il sostantivo.", notes: "Grammar term")
        ]
    }

    private var literaryTerms: [VocabularyWord] {
        [
            VocabularyWord(italian: "metafora", english: "metaphor", level: .advanced, category: .literaryTerms, exampleSentence: "La vita è un viaggio (metafora).", notes: "Literary device"),
            VocabularyWord(italian: "similitudine", english: "simile", level: .advanced, category: .literaryTerms, exampleSentence: "Corre come il vento.", notes: "Literary device"),
            VocabularyWord(italian: "protagonista", english: "protagonist", level: .advanced, category: .literaryTerms, exampleSentence: "Il protagonista del romanzo è coraggioso.", notes: "Literary term")
        ]
    }

    private var allWords: [VocabularyWord] {
        commonWords + grammarTerms + literaryTerms
    }
}

// MARK: - Supporting Types

struct VocabularyWord: Identifiable, Codable {
    let id: UUID
    let italian: String
    let english: String
    let level: VocabularyLevel
    let category: VocabularyCategory
    let exampleSentence: String
    let notes: String

    init(id: UUID = UUID(), italian: String, english: String, level: VocabularyLevel, category: VocabularyCategory, exampleSentence: String, notes: String = "") {
        self.id = id
        self.italian = italian
        self.english = english
        self.level = level
        self.category = category
        self.exampleSentence = exampleSentence
        self.notes = notes
    }
}

enum VocabularyLevel: String, Codable {
    case beginner = "Beginner (A1-A2)"
    case intermediate = "Intermediate (B1-B2)"
    case advanced = "Advanced (C1-C2)"
}

enum VocabularyCategory: String, Codable, CaseIterable {
    case nouns = "Nouns"
    case verbs = "Verbs"
    case adjectives = "Adjectives"
    case adverbs = "Adverbs"
    case pronouns = "Pronouns"
    case prepositions = "Prepositions"
    case conjunctions = "Conjunctions"
    case grammarTerms = "Grammar Terms"
    case literaryTerms = "Literary Terms"
    case idioms = "Idioms"
}
