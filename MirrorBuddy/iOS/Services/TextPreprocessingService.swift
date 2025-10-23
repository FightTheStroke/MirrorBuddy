//
//  TextPreprocessingService.swift
//  MirrorBuddy
//
//  Task 87.2: Preprocess and clean extracted text for GPT-4 input
//  Removes OCR artifacts, normalizes formatting, fixes common errors
//

import Foundation
import os.log

/// Service for preprocessing and cleaning extracted text before AI processing
@MainActor
final class TextPreprocessingService {
    static let shared = TextPreprocessingService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TextPreprocessing")

    private init() {}

    // MARK: - Main Preprocessing

    /// Preprocess text for GPT-4 mind map generation
    /// - Parameters:
    ///   - text: Raw extracted text
    ///   - options: Preprocessing options
    /// - Returns: Cleaned and normalized text
    func preprocessForMindMap(_ text: String, options: PreprocessingOptions = .default) -> String {
        logger.info("Preprocessing text (\(text.count) characters)")

        var processed = text

        // Step 1: Remove page markers and artifacts
        if options.contains(.removePageMarkers) {
            processed = removePageMarkers(processed)
        }

        // Step 2: Fix common OCR errors
        if options.contains(.fixOCRErrors) {
            processed = fixCommonOCRErrors(processed)
        }

        // Step 3: Normalize whitespace
        if options.contains(.normalizeWhitespace) {
            processed = normalizeWhitespace(processed)
        }

        // Step 4: Remove duplicate lines
        if options.contains(.removeDuplicates) {
            processed = removeDuplicateLines(processed)
        }

        // Step 5: Preserve structure (bullets, numbering)
        if options.contains(.preserveStructure) {
            processed = enhanceStructuralMarkers(processed)
        }

        // Step 6: Clean mathematical notation
        if options.contains(.cleanMathNotation) {
            processed = normalizeMathNotation(processed)
        }

        // Step 7: Remove footers/headers
        if options.contains(.removeHeadersFooters) {
            processed = removeCommonHeadersFooters(processed)
        }

        // Step 8: Final cleanup
        processed = finalCleanup(processed)

        logger.info("Preprocessing complete (\(processed.count) characters after cleaning)")

        return processed
    }

    /// Preprocess for general AI consumption (less aggressive)
    func preprocessForAI(_ text: String) -> String {
        let options: PreprocessingOptions = [
            .normalizeWhitespace,
            .fixOCRErrors,
            .removeDuplicates
        ]
        return preprocessForMindMap(text, options: options)
    }

    // MARK: - Page Markers

    /// Remove page markers and artifacts from multi-page extraction
    private func removePageMarkers(_ text: String) -> String {
        var cleaned = text

        // Remove "--- Page N ---" markers
        cleaned = cleaned.replacingOccurrences(
            of: #"--- Page \d+ ---"#,
            with: "",
            options: .regularExpression
        )

        // Remove "[OCR failed]" markers
        cleaned = cleaned.replacingOccurrences(of: "[OCR failed]", with: "")
        cleaned = cleaned.replacingOccurrences(of: "[Extraction failed]", with: "")

        // Remove common page number patterns
        cleaned = cleaned.replacingOccurrences(
            of: #"^\s*\d+\s*$"#,
            with: "",
            options: .regularExpression
        )

        return cleaned
    }

    // MARK: - OCR Error Correction

    /// Fix common OCR recognition errors
    private func fixCommonOCRErrors(_ text: String) -> String {
        var fixed = text

        // Common character confusions in Italian text context
        let corrections: [(pattern: String, replacement: String)] = [
            // Fix common l/I/1 confusions in context
            (#"\bl\b"#, "1"),  // Standalone l often means 1
            (#"l'([aeiouàèìòù])"#, "l'$1"),  // Keep l' (Italian articles)

            // Fix common O/0 confusions
            (#"\bO(\d)"#, "0$1"),  // O followed by digit should be 0
            (#"(\d)O\b"#, "$10"),  // Digit followed by O should be 0

            // Fix spacing issues around punctuation
            (#"([a-zàèìòù])\s+([,;:.])"#, "$1$2"),  // Remove space before punctuation
            (#"([.!?])\s+([A-ZÀÈÌÒÙ])"#, "$1 $2"),  // Ensure space after sentence

            // Fix em dash and en dash issues
            (#"—"#, " - "),
            (#"–"#, " - "),

            // Fix multiple consecutive special characters
            (#"[•●◦‣⁃]+\s*"#, "• "),  // Normalize bullets
            (#"\*{2,}"#, ""),  // Remove excessive asterisks

            // Fix mathematical operators spacing
            (#"(\d)\s*[x×]\s*(\d)"#, "$1 × $2"),
            (#"(\d)\s*=\s*(\d)"#, "$1 = $2"),

            // Remove zero-width characters
            (#"[\u200B-\u200D\uFEFF]"#, "")
        ]

        for (pattern, replacement) in corrections {
            fixed = fixed.replacingOccurrences(
                of: pattern,
                with: replacement,
                options: .regularExpression
            )
        }

        return fixed
    }

    // MARK: - Whitespace Normalization

    /// Normalize whitespace and line breaks
    private func normalizeWhitespace(_ text: String) -> String {
        var normalized = text

        // Convert all line break variations to \n
        normalized = normalized.replacingOccurrences(of: "\r\n", with: "\n")
        normalized = normalized.replacingOccurrences(of: "\r", with: "\n")

        // Remove trailing whitespace from lines
        normalized = normalized.replacingOccurrences(
            of: #"[ \t]+\n"#,
            with: "\n",
            options: .regularExpression
        )

        // Normalize multiple spaces to single space
        normalized = normalized.replacingOccurrences(
            of: #"[ \t]{2,}"#,
            with: " ",
            options: .regularExpression
        )

        // Reduce excessive line breaks (keep max 2)
        normalized = normalized.replacingOccurrences(
            of: #"\n{3,}"#,
            with: "\n\n",
            options: .regularExpression
        )

        // Trim leading/trailing whitespace
        normalized = normalized.trimmingCharacters(in: .whitespacesAndNewlines)

        return normalized
    }

    // MARK: - Duplicate Removal

    /// Remove duplicate consecutive lines
    private func removeDuplicateLines(_ text: String) -> String {
        let lines = text.components(separatedBy: .newlines)
        var uniqueLines: [String] = []
        var previousLine = ""

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            // Skip if identical to previous line
            if trimmed != previousLine || trimmed.isEmpty {
                uniqueLines.append(line)
            }

            previousLine = trimmed
        }

        return uniqueLines.joined(separator: "\n")
    }

    // MARK: - Structure Enhancement

    /// Enhance structural markers for better parsing
    private func enhanceStructuralMarkers(_ text: String) -> String {
        var enhanced = text

        // Ensure bullets have consistent spacing
        let lines = enhanced.components(separatedBy: .newlines)
        let processedLines = lines.map { line in
            var processed = line
            // Process bullets at start of line
            if let regex = try? NSRegularExpression(pattern: #"^[•●◦‣⁃]\s*"#) {
                processed = regex.stringByReplacingMatches(
                    in: processed,
                    range: NSRange(processed.startIndex..., in: processed),
                    withTemplate: "• "
                )
            }
            // Process numbered lists at start of line
            if let regex = try? NSRegularExpression(pattern: #"^(\d+)\.\s*"#) {
                processed = regex.stringByReplacingMatches(
                    in: processed,
                    range: NSRange(processed.startIndex..., in: processed),
                    withTemplate: "$1. "
                )
            }
            return processed
        }
        enhanced = processedLines.joined(separator: "\n")

        // Ensure headers have line breaks
        enhanced = enhanced.replacingOccurrences(
            of: #"([a-z])([A-Z][A-Z\s]+[A-Z])"#,
            with: "$1\n\n$2",
            options: .regularExpression
        )

        return enhanced
    }

    // MARK: - Mathematical Notation

    /// Normalize mathematical notation
    private func normalizeMathNotation(_ text: String) -> String {
        var normalized = text

        // Common mathematical symbols to preserve/normalize
        let mathSymbols: [(pattern: String, replacement: String)] = [
            // Fractions
            (#"(\d+)/(\d+)"#, "$1/$2"),  // Keep simple fractions

            // Exponents
            (#"(\d+)\^(\d+)"#, "$1^$2"),

            // Greek letters (if OCR recognized them)
            (#"α"#, "alpha"),
            (#"β"#, "beta"),
            (#"γ"#, "gamma"),
            (#"δ"#, "delta"),
            (#"π"#, "pi"),

            // Square root
            (#"√"#, "sqrt"),

            // Infinity
            (#"∞"#, "infinity"),

            // Integral
            (#"∫"#, "integral")
        ]

        for (pattern, replacement) in mathSymbols {
            normalized = normalized.replacingOccurrences(
                of: pattern,
                with: replacement,
                options: .regularExpression
            )
        }

        return normalized
    }

    // MARK: - Headers and Footers

    /// Remove common headers and footers from pages
    private func removeCommonHeadersFooters(_ text: String) -> String {
        var cleaned = text

        // Common footer patterns to remove
        let footerPatterns = [
            #"Pagina \d+ di \d+"#,
            #"Page \d+ of \d+"#,
            #"\d+ di \d+"#,
            #"Copyright ©.*"#,
            #"Tutti i diritti riservati"#,
            #"All rights reserved"#
        ]

        for pattern in footerPatterns {
            cleaned = cleaned.replacingOccurrences(
                of: pattern,
                with: "",
                options: [.regularExpression, .caseInsensitive]
            )
        }

        return cleaned
    }

    // MARK: - Final Cleanup

    /// Final cleanup pass
    private func finalCleanup(_ text: String) -> String {
        var cleaned = text

        // Remove lines with only whitespace or special characters
        let lines = cleaned.components(separatedBy: .newlines)
        let nonEmptyLines = lines.filter { line in
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            return !trimmed.isEmpty && !trimmed.allSatisfy { "-_=.".contains($0) }
        }
        cleaned = nonEmptyLines.joined(separator: "\n")

        // Final whitespace normalization
        cleaned = normalizeWhitespace(cleaned)

        // Ensure text doesn't start/end with excessive breaks
        cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)

        return cleaned
    }

    // MARK: - Text Analysis

    /// Analyze text quality and provide metrics
    func analyzeTextQuality(_ text: String) -> TextQualityMetrics {
        let lines = text.components(separatedBy: .newlines)
        let words = text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }

        // Calculate metrics
        let totalLines = lines.count
        let totalWords = words.count
        let totalCharacters = text.count

        // Detect potential issues
        let hasExcessiveBreaks = text.contains(#"\n{5,}"#, options: .regularExpression)
        let hasManySpecialChars = text.filter { "!@#$%^&*()_+=[]{}|\\:;<>,.?/~`".contains($0) }.count > totalCharacters / 10
        let avgWordLength = totalWords > 0 ? Double(totalCharacters) / Double(totalWords) : 0

        // Estimate quality score (0-1)
        var qualityScore = 1.0

        if hasExcessiveBreaks { qualityScore -= 0.1 }
        if hasManySpecialChars { qualityScore -= 0.15 }
        if avgWordLength < 3 || avgWordLength > 12 { qualityScore -= 0.1 }
        if totalWords < 10 { qualityScore -= 0.2 }

        qualityScore = max(0, min(1, qualityScore))

        return TextQualityMetrics(
            totalLines: totalLines,
            totalWords: totalWords,
            totalCharacters: totalCharacters,
            averageWordLength: avgWordLength,
            qualityScore: qualityScore,
            hasExcessiveBreaks: hasExcessiveBreaks,
            hasManySpecialCharacters: hasManySpecialChars
        )
    }

    // MARK: - Utility Methods

    /// Split long text into manageable chunks for AI processing
    func chunkText(
        _ text: String,
        maxChunkSize: Int = 4_000,
        overlap: Int = 200
    ) -> [String] {
        guard text.count > maxChunkSize else {
            return [text]
        }

        var chunks: [String] = []
        var currentIndex = text.startIndex

        while currentIndex < text.endIndex {
            let remainingLength = text.distance(from: currentIndex, to: text.endIndex)
            let chunkLength = min(maxChunkSize, remainingLength)

            let endIndex = text.index(currentIndex, offsetBy: chunkLength, limitedBy: text.endIndex) ?? text.endIndex

            let chunk = String(text[currentIndex..<endIndex])
            chunks.append(chunk)

            // Move to next chunk with overlap
            if endIndex < text.endIndex {
                let overlapOffset = max(0, chunkLength - overlap)
                currentIndex = text.index(currentIndex, offsetBy: overlapOffset, limitedBy: text.endIndex) ?? text.endIndex
            } else {
                break
            }
        }

        logger.info("Split text into \(chunks.count) chunks")

        return chunks
    }

    /// Extract keywords from text
    func extractKeywords(_ text: String, limit: Int = 20) -> [String] {
        // Simple keyword extraction based on word frequency
        let words = text.lowercased()
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { $0.count > 3 }  // Ignore short words

        // Common Italian stop words to exclude
        let stopWords = Set([
            "alla", "allo", "sono", "stato", "stata", "stati", "state",
            "essere", "avere", "fare", "dire", "andare", "venire",
            "questa", "questo", "queste", "questi", "quella", "quello",
            "delle", "degli", "della", "dello", "dell", "dalle", "dagli",
            "dalle", "nelle", "nella", "nello", "nell", "sulle", "sulla",
            "sullo", "sull", "dalle", "dagli", "dalla", "dallo", "dall",
            "and", "the", "this", "that", "with", "from", "have", "has"
        ])

        let filteredWords = words.filter { !stopWords.contains($0) }

        // Count word frequency
        var wordCount: [String: Int] = [:]
        for word in filteredWords {
            wordCount[word, default: 0] += 1
        }

        // Sort by frequency and return top keywords
        let sortedWords = wordCount.sorted { $0.value > $1.value }
        return Array(sortedWords.prefix(limit).map { $0.key })
    }
}

// MARK: - Supporting Types

/// Preprocessing options
struct PreprocessingOptions: OptionSet {
    let rawValue: Int

    static let removePageMarkers = PreprocessingOptions(rawValue: 1 << 0)
    static let fixOCRErrors = PreprocessingOptions(rawValue: 1 << 1)
    static let normalizeWhitespace = PreprocessingOptions(rawValue: 1 << 2)
    static let removeDuplicates = PreprocessingOptions(rawValue: 1 << 3)
    static let preserveStructure = PreprocessingOptions(rawValue: 1 << 4)
    static let cleanMathNotation = PreprocessingOptions(rawValue: 1 << 5)
    static let removeHeadersFooters = PreprocessingOptions(rawValue: 1 << 6)

    static let `default`: PreprocessingOptions = [
        .removePageMarkers,
        .fixOCRErrors,
        .normalizeWhitespace,
        .removeDuplicates,
        .preserveStructure,
        .cleanMathNotation,
        .removeHeadersFooters
    ]

    static let minimal: PreprocessingOptions = [
        .normalizeWhitespace,
        .fixOCRErrors
    ]

    static let aggressive: PreprocessingOptions = [
        .removePageMarkers,
        .fixOCRErrors,
        .normalizeWhitespace,
        .removeDuplicates,
        .preserveStructure,
        .cleanMathNotation,
        .removeHeadersFooters
    ]
}

/// Text quality metrics
struct TextQualityMetrics {
    let totalLines: Int
    let totalWords: Int
    let totalCharacters: Int
    let averageWordLength: Double
    let qualityScore: Double  // 0-1, where 1 is highest quality
    let hasExcessiveBreaks: Bool
    let hasManySpecialCharacters: Bool

    var description: String {
        """
        Text Quality Analysis:
        - Lines: \(totalLines)
        - Words: \(totalWords)
        - Characters: \(totalCharacters)
        - Average word length: \(String(format: "%.1f", averageWordLength))
        - Quality score: \(String(format: "%.1f", qualityScore * 100))%
        - Issues: \(hasExcessiveBreaks ? "excessive breaks" : "")\(hasManySpecialCharacters ? ", many special characters" : "")
        """
    }
}

// MARK: - String Extensions

extension String {
    func contains(_ pattern: String, options: NSString.CompareOptions) -> Bool {
        self.range(of: pattern, options: options) != nil
    }
}
