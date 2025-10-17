//
//  SubjectDetectionService.swift
//  MirrorBuddy
//
//  Task 94: Subject and speaker detection from transcripts
//  Uses keyword matching to auto-assign subjects from transcript content
//

import Foundation
import os.log

/// Service for detecting subjects from transcript keywords
@MainActor
final class SubjectDetectionService {
    static let shared = SubjectDetectionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "SubjectDetection")

    private init() {}

    // MARK: - Subject Detection

    /// Detect subject from transcript text using keyword matching
    /// - Parameter text: Transcript text to analyze
    /// - Returns: Detected subject or nil if no clear match
    func detectSubject(from text: String) -> Subject? {
        let lowercasedText = text.lowercased()

        // Count keywords for each subject
        var subjectScores: [Subject: Int] = [:]

        for subject in Subject.allCases where subject != .other && subject != .sostegno {
            let keywords = getKeywords(for: subject)
            let score = keywords.reduce(0) { count, keyword in
                count + countOccurrences(of: keyword, in: lowercasedText)
            }
            if score > 0 {
                subjectScores[subject] = score
            }
        }

        // Return subject with highest score
        guard let bestMatch = subjectScores.max(by: { $0.value < $1.value }) else {
            logger.info("No subject detected from transcript")
            return nil
        }

        // Require at least 2 keyword matches for confidence
        guard bestMatch.value >= 2 else {
            logger.info("Subject detection confidence too low: \(bestMatch.value) keywords")
            return nil
        }

        logger.info("Detected subject: \(bestMatch.key.rawValue) (score: \(bestMatch.value))")
        return bestMatch.key
    }

    /// Detect multiple subjects from transcript (for multidisciplinary content)
    func detectSubjects(from text: String, threshold: Int = 3) -> [Subject] {
        let lowercasedText = text.lowercased()
        var subjectScores: [Subject: Int] = [:]

        for subject in Subject.allCases where subject != .other && subject != .sostegno {
            let keywords = getKeywords(for: subject)
            let score = keywords.reduce(0) { count, keyword in
                count + countOccurrences(of: keyword, in: lowercasedText)
            }
            if score >= threshold {
                subjectScores[subject] = score
            }
        }

        let detectedSubjects = subjectScores.sorted { $0.value > $1.value }.map { $0.key }
        logger.info("Detected \(detectedSubjects.count) subjects from transcript")

        return detectedSubjects
    }

    // MARK: - Subject Keywords

    /// Get keywords for subject detection
    private func getKeywords(for subject: Subject) -> [String] {
        switch subject {
        case .matematica:
            return [
                "matematica", "algebra", "geometria", "calcolo", "equazione", "funzione",
                "derivata", "integrale", "limite", "frazione", "radice", "potenza",
                "teorema", "dimostrazione", "formula", "numero", "somma", "prodotto",
                "trigonometria", "seno", "coseno", "tangente", "logaritmo", "esponenziale"
            ]

        case .fisica:
            return [
                "fisica", "forza", "energia", "velocità", "accelerazione", "massa",
                "lavoro", "potenza", "newton", "joule", "watt", "pressione",
                "temperatura", "calore", "termodinamica", "elettricità", "magnetismo",
                "corrente", "tensione", "resistenza", "circuito", "luce", "onda",
                "meccanica", "cinematica", "dinamica"
            ]

        case .scienzeNaturali:
            return [
                "scienza", "scienze", "biologia", "chimica", "cellula", "organismo",
                "ecosistema", "dna", "proteina", "enzima", "molecola", "atomo",
                "elemento", "composto", "reazione", "acido", "base", "fotosintesi",
                "evoluzione", "genetica", "ecologia", "ambiente"
            ]

        case .storiaGeografia:
            return [
                "storia", "geografia", "secolo", "guerra", "impero", "regno",
                "rivoluzione", "costituzione", "democrazia", "repubblica", "monarchia",
                "continente", "paese", "capitale", "fiume", "montagna", "oceano",
                "clima", "popolazione", "città", "battaglia", "trattato", "re", "regina"
            ]

        case .italiano:
            return [
                "letteratura", "poesia", "romanzo", "racconto", "autore", "scrittore",
                "poeta", "dante", "petrarca", "boccaccio", "manzoni", "leopardi",
                "verga", "pirandello", "montale", "ungaretti", "verso", "strofa",
                "rima", "metafora", "similitudine", "narratore", "personaggio",
                "trama", "tema", "stile", "sintassi", "grammatica"
            ]

        case .inglese:
            return [
                "english", "inglese", "grammar", "verb", "tense", "present", "past",
                "future", "vocabulary", "pronunciation", "listening", "speaking",
                "reading", "writing", "shakespeare", "literature", "phrasal verb",
                "idiom", "preposition", "article", "adjective", "adverb"
            ]

        case .educazioneCivica:
            return [
                "costituzione", "diritto", "cittadinanza", "legge", "parlamento",
                "governo", "presidente", "elezioni", "democrazia", "libertà",
                "diritti", "doveri", "giustizia", "tribunale", "codice",
                "stato", "regione", "comune", "europa", "unione europea"
            ]

        case .religione:
            return [
                "religione", "dio", "fede", "chiesa", "bibbia", "vangelo",
                "gesù", "cristo", "santo", "sacramento", "preghiera", "messa",
                "cristianesimo", "cattolico", "protestante", "islam", "buddismo",
                "ebraismo", "spiritualità", "morale", "etica"
            ]

        case .scienzeMotorie:
            return [
                "sport", "ginnastica", "educazione fisica", "allenamento", "esercizio",
                "muscolo", "articolazione", "coordinazione", "resistenza", "forza",
                "velocità", "calcio", "pallavolo", "basket", "atletica", "nuoto",
                "corsa", "salto", "lancio", "squadra", "gioco"
            ]

        case .sostegno, .other:
            return []
        }
    }

    // MARK: - Utility Methods

    /// Count occurrences of keyword in text
    private func countOccurrences(of keyword: String, in text: String) -> Int {
        let components = text.components(separatedBy: .whitespacesAndNewlines)
        return components.filter { $0.contains(keyword) }.count
    }

    /// Get confidence score for detected subject
    func getConfidenceScore(for subject: Subject?, in text: String) -> Double {
        guard let subject = subject else { return 0.0 }

        let keywords = getKeywords(for: subject)
        let lowercasedText = text.lowercased()

        let matchCount = keywords.reduce(0) { count, keyword in
            count + countOccurrences(of: keyword, in: lowercasedText)
        }

        let wordCount = text.components(separatedBy: .whitespacesAndNewlines).count

        // Confidence = (matched keywords / total words) * 100
        guard wordCount > 0 else { return 0.0 }

        let confidence = min(Double(matchCount) / Double(wordCount) * 100, 100.0)
        return confidence
    }
}

// MARK: - Detection Result

/// Result of subject detection with confidence
struct SubjectDetectionResult {
    let subject: Subject?
    let confidence: Double
    let alternativeSubjects: [Subject]

    var isConfident: Bool {
        confidence >= 30.0 // 30% keyword match is considered confident
    }
}
