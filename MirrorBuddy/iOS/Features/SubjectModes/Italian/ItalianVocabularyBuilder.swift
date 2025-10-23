import Foundation

/// Vocabulary building system with spaced repetition
final class ItalianVocabularyBuilder {
    // MARK: - Vocabulary Management

    /// Get vocabulary words for a specific topic
    func getWords(for topic: ItalianTopic) -> [ItalianVocabularyWord] {
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
    func getWordsByLevel(_ level: VocabularyLevel) -> [ItalianVocabularyWord] {
        allWords.filter { $0.level == level }
    }

    /// Get words by category
    func getWordsByCategory(_ category: VocabularyCategory) -> [ItalianVocabularyWord] {
        allWords.filter { $0.category == category }
    }

    /// Search words
    func search(query: String) -> [ItalianVocabularyWord] {
        allWords.filter { word in
            word.italian.lowercased().contains(query.lowercased()) ||
                word.english.lowercased().contains(query.lowercased())
        }
    }

    // MARK: - Word Lists

    private var commonWords: [ItalianVocabularyWord] {
        [
            ItalianVocabularyWord(italian: "casa", english: "house", level: .beginner, category: .nouns, exampleSentence: "La mia casa è grande.", notes: "Feminine noun"),
            ItalianVocabularyWord(italian: "libro", english: "book", level: .beginner, category: .nouns, exampleSentence: "Il libro è interessante.", notes: "Masculine noun"),
            ItalianVocabularyWord(italian: "mangiare", english: "to eat", level: .beginner, category: .verbs, exampleSentence: "Mi piace mangiare la pizza.", notes: "-ARE verb"),
            ItalianVocabularyWord(italian: "bello", english: "beautiful", level: .beginner, category: .adjectives, exampleSentence: "Che bel panorama!", notes: "Changes form before nouns"),
            ItalianVocabularyWord(italian: "sempre", english: "always", level: .beginner, category: .adverbs, exampleSentence: "Sono sempre felice.", notes: "Adverb of frequency"),
            ItalianVocabularyWord(italian: "studiare", english: "to study", level: .beginner, category: .verbs, exampleSentence: "Devo studiare italiano.", notes: "-ARE verb"),
            ItalianVocabularyWord(italian: "famiglia", english: "family", level: .beginner, category: .nouns, exampleSentence: "Amo la mia famiglia.", notes: "Feminine noun"),
            ItalianVocabularyWord(italian: "amico", english: "friend (male)", level: .beginner, category: .nouns, exampleSentence: "Lui è il mio migliore amico.", notes: "Plural: amici"),
            ItalianVocabularyWord(italian: "amica", english: "friend (female)", level: .beginner, category: .nouns, exampleSentence: "Lei è la mia migliore amica.", notes: "Plural: amiche"),
            ItalianVocabularyWord(italian: "parlare", english: "to speak", level: .beginner, category: .verbs, exampleSentence: "Parlo italiano e inglese.", notes: "-ARE verb"),
            ItalianVocabularyWord(italian: "scrivere", english: "to write", level: .intermediate, category: .verbs, exampleSentence: "Scrivo una lettera.", notes: "-ERE verb"),
            ItalianVocabularyWord(italian: "leggere", english: "to read", level: .intermediate, category: .verbs, exampleSentence: "Leggo un libro.", notes: "Irregular past participle: letto"),
            ItalianVocabularyWord(italian: "capire", english: "to understand", level: .intermediate, category: .verbs, exampleSentence: "Capisco l'italiano.", notes: "-IRE verb with -isc-"),
            ItalianVocabularyWord(italian: "sapere", english: "to know (facts)", level: .intermediate, category: .verbs, exampleSentence: "So parlare italiano.", notes: "Irregular verb"),
            ItalianVocabularyWord(italian: "conoscere", english: "to know (people/places)", level: .intermediate, category: .verbs, exampleSentence: "Conosco Roma.", notes: "Different from sapere"),
            ItalianVocabularyWord(italian: "tuttavia", english: "however", level: .advanced, category: .conjunctions, exampleSentence: "È difficile, tuttavia possibile.", notes: "Formal conjunction"),
            ItalianVocabularyWord(italian: "sebbene", english: "although", level: .advanced, category: .conjunctions, exampleSentence: "Sebbene sia stanco, continuo.", notes: "Requires subjunctive"),
            ItalianVocabularyWord(italian: "qualunque", english: "whatever/any", level: .advanced, category: .pronouns, exampleSentence: "Qualunque cosa tu dica.", notes: "Requires subjunctive")
        ]
    }

    private var grammarTerms: [ItalianVocabularyWord] {
        [
            ItalianVocabularyWord(italian: "sostantivo", english: "noun", level: .intermediate, category: .grammarTerms, exampleSentence: "Il sostantivo è una parte del discorso.", notes: "Grammar term"),
            ItalianVocabularyWord(italian: "verbo", english: "verb", level: .intermediate, category: .grammarTerms, exampleSentence: "Il verbo esprime un'azione.", notes: "Grammar term"),
            ItalianVocabularyWord(italian: "aggettivo", english: "adjective", level: .intermediate, category: .grammarTerms, exampleSentence: "L'aggettivo descrive il sostantivo.", notes: "Grammar term")
        ]
    }

    private var literaryTerms: [ItalianVocabularyWord] {
        [
            ItalianVocabularyWord(italian: "metafora", english: "metaphor", level: .advanced, category: .literaryTerms, exampleSentence: "La vita è un viaggio (metafora).", notes: "Literary device"),
            ItalianVocabularyWord(italian: "similitudine", english: "simile", level: .advanced, category: .literaryTerms, exampleSentence: "Corre come il vento.", notes: "Literary device"),
            ItalianVocabularyWord(italian: "protagonista", english: "protagonist", level: .advanced, category: .literaryTerms, exampleSentence: "Il protagonista del romanzo è coraggioso.", notes: "Literary term")
        ]
    }

    private var allWords: [ItalianVocabularyWord] {
        commonWords + grammarTerms + literaryTerms
    }
}

// MARK: - Supporting Types

struct ItalianVocabularyWord: Identifiable, Codable {
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
