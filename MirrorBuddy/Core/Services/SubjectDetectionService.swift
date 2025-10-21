//
//  SubjectDetectionService.swift
//  MirrorBuddy
//
//  Task 94: Subject and speaker detection from transcripts
//  Uses keyword matching to auto-assign subjects from transcript content
//  Updated for Task 83: Now uses SubjectEntity instead of Subject enum
//

import Foundation
import os.log
import SwiftData

/// Service for detecting subjects from transcript keywords
@MainActor
final class SubjectDetectionService {
    static let shared = SubjectDetectionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "SubjectDetection")

    private init() {}

    // MARK: - Subject Detection

    /// Detect subject from text using keyword matching with SubjectEntity
    /// - Parameters:
    ///   - text: Text to analyze
    ///   - availableSubjects: List of available SubjectEntity to match against
    /// - Returns: Detected SubjectEntity or nil if no clear match
    func detectSubject(from text: String, availableSubjects: [SubjectEntity]) -> SubjectEntity? {
        let lowercasedText = text.lowercased()

        // Count keywords for each subject
        var subjectScores: [SubjectEntity: Int] = [:]

        for subject in availableSubjects where subject.isActive {
            let keywords = getKeywords(for: subject.localizationKey)
            let score = keywords.reduce(0) { count, keyword in
                count + countOccurrences(of: keyword, in: lowercasedText)
            }
            if score > 0 {
                subjectScores[subject] = score
            }
        }

        // Return subject with highest score
        guard let bestMatch = subjectScores.max(by: { $0.value < $1.value }) else {
            logger.info("No subject detected from text")
            return nil
        }

        // Require at least 2 keyword matches for confidence
        guard bestMatch.value >= 2 else {
            logger.info("Subject detection confidence too low: \(bestMatch.value) keywords")
            return nil
        }

        logger.info("Detected subject: \(bestMatch.key.displayName) (score: \(bestMatch.value))")
        return bestMatch.key
    }

    /// Detect multiple subjects from text (for multidisciplinary content)
    func detectSubjects(from text: String, availableSubjects: [SubjectEntity], threshold: Int = 3) -> [SubjectEntity] {
        let lowercasedText = text.lowercased()
        var subjectScores: [SubjectEntity: Int] = [:]

        for subject in availableSubjects where subject.isActive {
            let keywords = getKeywords(for: subject.localizationKey)
            let score = keywords.reduce(0) { count, keyword in
                count + countOccurrences(of: keyword, in: lowercasedText)
            }
            if score >= threshold {
                subjectScores[subject] = score
            }
        }

        let detectedSubjects = subjectScores.sorted { $0.value > $1.value }.map { $0.key }
        logger.info("Detected \(detectedSubjects.count) subjects from text")

        return detectedSubjects
    }

    // MARK: - Subject Keywords

    /// Get keywords for subject detection based on localization key
    private func getKeywords(for localizationKey: String) -> [String] {
        // Extract the subject identifier from localization key (e.g., "subject.matematica" -> "matematica")
        let subjectKey = localizationKey.components(separatedBy: ".").last ?? localizationKey

        switch subjectKey.lowercased() {
        case "matematica":
            return [
                "matematica", "algebra", "geometria", "calcolo", "equazione", "funzione",
                "derivata", "integrale", "limite", "frazione", "radice", "potenza",
                "teorema", "dimostrazione", "formula", "numero", "somma", "prodotto",
                "trigonometria", "seno", "coseno", "tangente", "logaritmo", "esponenziale"
            ]

        case "fisica":
            return [
                "fisica", "forza", "energia", "velocità", "accelerazione", "massa",
                "lavoro", "potenza", "newton", "joule", "watt", "pressione",
                "temperatura", "calore", "termodinamica", "elettricità", "magnetismo",
                "corrente", "tensione", "resistenza", "circuito", "luce", "onda",
                "meccanica", "cinematica", "dinamica"
            ]

        case "scienzenaturali":
            return [
                "scienza", "scienze", "biologia", "chimica", "cellula", "organismo",
                "ecosistema", "dna", "proteina", "enzima", "molecola", "atomo",
                "elemento", "composto", "reazione", "acido", "base", "fotosintesi",
                "evoluzione", "genetica", "ecologia", "ambiente"
            ]

        case "storiageografia":
            return [
                "storia", "geografia", "secolo", "guerra", "impero", "regno",
                "rivoluzione", "costituzione", "democrazia", "repubblica", "monarchia",
                "continente", "paese", "capitale", "fiume", "montagna", "oceano",
                "clima", "popolazione", "città", "battaglia", "trattato", "re", "regina"
            ]

        case "italiano":
            return [
                "letteratura", "poesia", "romanzo", "racconto", "autore", "scrittore",
                "poeta", "dante", "petrarca", "boccaccio", "manzoni", "leopardi",
                "verga", "pirandello", "montale", "ungaretti", "verso", "strofa",
                "rima", "metafora", "similitudine", "narratore", "personaggio",
                "trama", "tema", "stile", "sintassi", "grammatica"
            ]

        case "inglese":
            return [
                "english", "inglese", "grammar", "verb", "tense", "present", "past",
                "future", "vocabulary", "pronunciation", "listening", "speaking",
                "reading", "writing", "shakespeare", "literature", "phrasal verb",
                "idiom", "preposition", "article", "adjective", "adverb"
            ]

        case "educazionecivica":
            return [
                "costituzione", "diritto", "cittadinanza", "legge", "parlamento",
                "governo", "presidente", "elezioni", "democrazia", "libertà",
                "diritti", "doveri", "giustizia", "tribunale", "codice",
                "stato", "regione", "comune", "europa", "unione europea"
            ]

        case "religione":
            return [
                "religione", "dio", "fede", "chiesa", "bibbia", "vangelo",
                "gesù", "cristo", "santo", "sacramento", "preghiera", "messa",
                "cristianesimo", "cattolico", "protestante", "islam", "buddismo",
                "ebraismo", "spiritualità", "morale", "etica"
            ]

        case "scienzemotorie":
            return [
                "sport", "ginnastica", "educazione fisica", "allenamento", "esercizio",
                "muscolo", "articolazione", "coordinazione", "resistenza", "forza",
                "velocità", "calcio", "pallavolo", "basket", "atletica", "nuoto",
                "corsa", "salto", "lancio", "squadra", "gioco"
            ]

        case "sostegno", "other":
            return []

        default:
            // For custom subjects, use the name itself as keyword
            return [subjectKey]
        }
    }

    // MARK: - Utility Methods

    /// Count occurrences of keyword in text
    private func countOccurrences(of keyword: String, in text: String) -> Int {
        let components = text.components(separatedBy: .whitespacesAndNewlines)
        return components.filter { $0.contains(keyword) }.count
    }

    /// Get confidence score for detected subject
    func getConfidenceScore(for subject: SubjectEntity?, in text: String) -> Double {
        guard let subject = subject else { return 0.0 }

        let keywords = getKeywords(for: subject.localizationKey)
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
    let subject: SubjectEntity?
    let confidence: Double
    let alternativeSubjects: [SubjectEntity]

    var isConfident: Bool {
        confidence >= 30.0 // 30% keyword match is considered confident
    }
}
