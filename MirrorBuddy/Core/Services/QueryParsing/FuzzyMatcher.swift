//
//  FuzzyMatcher.swift
//  MirrorBuddy
//
//  Task 115.2: Fuzzy matching algorithm with Levenshtein distance and Soundex
//  Handles typos, phonetic variations, and approximate string matching
//

import Foundation

/// Result of a fuzzy match operation
struct FuzzyMatchResult: Comparable {
    let matchedString: String
    let score: Double // 0.0 (no match) to 1.0 (perfect match)
    let matchType: MatchType
    let associatedData: Any?

    enum MatchType {
        case exact
        case levenshtein
        case phonetic
        case partial
        case none
    }

    static func < (lhs: FuzzyMatchResult, rhs: FuzzyMatchResult) -> Bool {
        return lhs.score < rhs.score
    }

    static func == (lhs: FuzzyMatchResult, rhs: FuzzyMatchResult) -> Bool {
        return lhs.score == rhs.score
    }
}

/// Fuzzy matching configuration
struct FuzzyMatchConfig {
    /// Levenshtein distance threshold (lower is stricter)
    /// Values: 0-10. Default: 3 means up to 3 character differences allowed
    var levenshteinThreshold: Int = 3

    /// Minimum similarity score (0.0 - 1.0)
    /// Default: 0.6 means 60% similarity required
    var minimumSimilarity: Double = 0.6

    /// Enable phonetic matching (Soundex)
    var enablePhonetic: Bool = true

    /// Enable partial substring matching
    var enablePartialMatch: Bool = true

    /// Case sensitivity
    var caseSensitive: Bool = false

    static let `default` = FuzzyMatchConfig()
    static let strict = FuzzyMatchConfig(
        levenshteinThreshold: 2,
        minimumSimilarity: 0.8,
        enablePhonetic: false,
        enablePartialMatch: false
    )
    static let relaxed = FuzzyMatchConfig(
        levenshteinThreshold: 5,
        minimumSimilarity: 0.5,
        enablePhonetic: true,
        enablePartialMatch: true
    )
}

/// Fuzzy string matching engine
struct FuzzyMatcher {

    let config: FuzzyMatchConfig

    init(config: FuzzyMatchConfig = .default) {
        self.config = config
    }

    // MARK: - Public API

    /// Find the best fuzzy match from a list of candidates
    /// - Parameters:
    ///   - query: Search query string
    ///   - candidates: Array of candidate strings to match against
    /// - Returns: Best matching result or nil if no match meets threshold
    func findBestMatch(query: String, in candidates: [String]) -> FuzzyMatchResult? {
        let matches = findMatches(query: query, in: candidates)
        return matches.max() // Returns match with highest score
    }

    /// Find all fuzzy matches above the similarity threshold
    /// - Parameters:
    ///   - query: Search query string
    ///   - candidates: Array of candidate strings to match against
    /// - Returns: Array of matches sorted by score (descending)
    func findMatches(query: String, in candidates: [String]) -> [FuzzyMatchResult] {
        let normalizedQuery = config.caseSensitive ? query : query.lowercased()

        var results: [FuzzyMatchResult] = []

        for candidate in candidates {
            let normalizedCandidate = config.caseSensitive ? candidate : candidate.lowercased()

            // Try exact match first
            if normalizedQuery == normalizedCandidate {
                results.append(FuzzyMatchResult(
                    matchedString: candidate,
                    score: 1.0,
                    matchType: .exact,
                    associatedData: nil
                ))
                continue
            }

            // Try Levenshtein distance matching
            let distance = levenshteinDistance(normalizedQuery, normalizedCandidate)
            let maxLength = max(normalizedQuery.count, normalizedCandidate.count)
            let levenshteinScore = 1.0 - (Double(distance) / Double(maxLength))

            if distance <= config.levenshteinThreshold && levenshteinScore >= config.minimumSimilarity {
                results.append(FuzzyMatchResult(
                    matchedString: candidate,
                    score: levenshteinScore,
                    matchType: .levenshtein,
                    associatedData: distance
                ))
                continue
            }

            // Try phonetic matching (Soundex)
            if config.enablePhonetic {
                let queryCode = soundex(normalizedQuery)
                let candidateCode = soundex(normalizedCandidate)

                if queryCode == candidateCode {
                    // Phonetic match - use Levenshtein score or 0.7 minimum
                    let phoneticScore = max(levenshteinScore, 0.7)
                    if phoneticScore >= config.minimumSimilarity {
                        results.append(FuzzyMatchResult(
                            matchedString: candidate,
                            score: phoneticScore,
                            matchType: .phonetic,
                            associatedData: (queryCode, candidateCode)
                        ))
                        continue
                    }
                }
            }

            // Try partial matching
            if config.enablePartialMatch {
                if normalizedCandidate.contains(normalizedQuery) {
                    // Query is a substring of candidate
                    let partialScore = Double(normalizedQuery.count) / Double(normalizedCandidate.count)
                    if partialScore >= config.minimumSimilarity {
                        results.append(FuzzyMatchResult(
                            matchedString: candidate,
                            score: partialScore,
                            matchType: .partial,
                            associatedData: nil
                        ))
                        continue
                    }
                }

                // Try word-level partial matching
                let queryWords = normalizedQuery.split(separator: " ")
                let candidateWords = normalizedCandidate.split(separator: " ")

                if !queryWords.isEmpty && !candidateWords.isEmpty {
                    let matchingWords = queryWords.filter { qWord in
                        candidateWords.contains { cWord in
                            String(cWord).contains(String(qWord)) ||
                            levenshteinDistance(String(qWord), String(cWord)) <= 1
                        }
                    }

                    let wordScore = Double(matchingWords.count) / Double(queryWords.count)
                    if wordScore >= config.minimumSimilarity {
                        results.append(FuzzyMatchResult(
                            matchedString: candidate,
                            score: wordScore * 0.8, // Slightly penalize word-level matches
                            matchType: .partial,
                            associatedData: matchingWords.count
                        ))
                    }
                }
            }
        }

        // Sort by score descending
        return results.sorted { $0.score > $1.score }
    }

    // MARK: - Levenshtein Distance Algorithm

    /// Calculate Levenshtein distance between two strings
    /// Uses dynamic programming approach with O(m*n) time complexity
    /// - Parameters:
    ///   - s1: First string
    ///   - s2: Second string
    /// - Returns: Minimum number of single-character edits (insertions, deletions, substitutions)
    func levenshteinDistance(_ s1: String, _ s2: String) -> Int {
        let s1Array = Array(s1)
        let s2Array = Array(s2)
        let m = s1Array.count
        let n = s2Array.count

        // Edge cases
        if m == 0 { return n }
        if n == 0 { return m }

        // Create DP matrix
        var matrix = Array(repeating: Array(repeating: 0, count: n + 1), count: m + 1)

        // Initialize first row and column
        for i in 0...m {
            matrix[i][0] = i
        }
        for j in 0...n {
            matrix[0][j] = j
        }

        // Fill matrix using dynamic programming
        for i in 1...m {
            for j in 1...n {
                let cost = s1Array[i - 1] == s2Array[j - 1] ? 0 : 1

                matrix[i][j] = min(
                    matrix[i - 1][j] + 1,      // Deletion
                    matrix[i][j - 1] + 1,      // Insertion
                    matrix[i - 1][j - 1] + cost // Substitution
                )
            }
        }

        return matrix[m][n]
    }

    // MARK: - Soundex Algorithm

    /// Encode a string using the Soundex phonetic algorithm
    /// Returns a 4-character code representing the phonetic sound
    /// - Parameter word: Input word to encode
    /// - Returns: 4-character Soundex code (e.g., "R163" for "Robert")
    func soundex(_ word: String) -> String {
        guard !word.isEmpty else { return "0000" }

        // Soundex mapping
        let soundexMap: [Character: Character] = [
            "b": "1", "f": "1", "p": "1", "v": "1",
            "c": "2", "g": "2", "j": "2", "k": "2", "q": "2", "s": "2", "x": "2", "z": "2",
            "d": "3", "t": "3",
            "l": "4",
            "m": "5", "n": "5",
            "r": "6"
        ]

        let normalized = word.lowercased().filter { $0.isLetter }
        guard !normalized.isEmpty else { return "0000" }

        var result = ""
        var previousCode: Character = "0"

        for (index, char) in normalized.enumerated() {
            if index == 0 {
                // First letter is kept as-is
                result.append(char.uppercased())
                if let code = soundexMap[char] {
                    previousCode = code
                }
            } else {
                // Map letter to code
                if let code = soundexMap[char] {
                    // Only add if different from previous code
                    if code != previousCode {
                        result.append(code)
                        previousCode = code

                        // Stop when we have 4 characters
                        if result.count == 4 {
                            break
                        }
                    }
                } else {
                    // Vowels and other letters reset the previous code
                    previousCode = "0"
                }
            }
        }

        // Pad with zeros to make exactly 4 characters
        while result.count < 4 {
            result.append("0")
        }

        return String(result.prefix(4))
    }

    // MARK: - Similarity Metrics

    /// Calculate Jaro-Winkler similarity between two strings
    /// Returns a value between 0.0 (completely different) and 1.0 (identical)
    func jaroWinklerSimilarity(_ s1: String, _ s2: String) -> Double {
        let jaro = jaroSimilarity(s1, s2)

        // Calculate common prefix length (up to 4 characters)
        let s1Array = Array(s1.lowercased())
        let s2Array = Array(s2.lowercased())
        var prefixLength = 0

        for i in 0..<min(min(s1Array.count, s2Array.count), 4) {
            if s1Array[i] == s2Array[i] {
                prefixLength += 1
            } else {
                break
            }
        }

        // Jaro-Winkler uses a prefix scale of 0.1
        let jaroWinkler = jaro + (Double(prefixLength) * 0.1 * (1.0 - jaro))

        return min(jaroWinkler, 1.0)
    }

    /// Calculate Jaro similarity between two strings
    private func jaroSimilarity(_ s1: String, _ s2: String) -> Double {
        let s1Array = Array(s1.lowercased())
        let s2Array = Array(s2.lowercased())

        if s1Array.isEmpty && s2Array.isEmpty { return 1.0 }
        if s1Array.isEmpty || s2Array.isEmpty { return 0.0 }

        let matchDistance = max(s1Array.count, s2Array.count) / 2 - 1
        var s1Matches = Array(repeating: false, count: s1Array.count)
        var s2Matches = Array(repeating: false, count: s2Array.count)

        var matches = 0
        var transpositions = 0

        // Find matches
        for i in 0..<s1Array.count {
            let start = max(0, i - matchDistance)
            let end = min(i + matchDistance + 1, s2Array.count)

            for j in start..<end {
                if s2Matches[j] || s1Array[i] != s2Array[j] { continue }
                s1Matches[i] = true
                s2Matches[j] = true
                matches += 1
                break
            }
        }

        if matches == 0 { return 0.0 }

        // Count transpositions
        var k = 0
        for i in 0..<s1Array.count {
            if !s1Matches[i] { continue }
            while !s2Matches[k] { k += 1 }
            if s1Array[i] != s2Array[k] { transpositions += 1 }
            k += 1
        }

        let jaro = (Double(matches) / Double(s1Array.count) +
                    Double(matches) / Double(s2Array.count) +
                    (Double(matches) - Double(transpositions / 2)) / Double(matches)) / 3.0

        return jaro
    }
}

// MARK: - Convenience Extensions

extension FuzzyMatcher {

    /// Find fuzzy matches for material titles
    static func matchMaterialTitles(query: String, materials: [Material]) -> [(material: Material, score: Double)] {
        let matcher = FuzzyMatcher(config: .default)
        let titles = materials.map { $0.title }
        let matches = matcher.findMatches(query: query, in: titles)

        return matches.compactMap { match in
            guard let material = materials.first(where: { $0.title == match.matchedString }) else { return nil }
            return (material: material, score: match.score)
        }
    }

    /// Find fuzzy matches with custom configuration
    static func matchWithConfig(
        query: String,
        candidates: [String],
        threshold: Double = 0.6,
        maxDistance: Int = 3,
        phonetic: Bool = true
    ) -> [FuzzyMatchResult] {
        let config = FuzzyMatchConfig(
            levenshteinThreshold: maxDistance,
            minimumSimilarity: threshold,
            enablePhonetic: phonetic
        )
        let matcher = FuzzyMatcher(config: config)
        return matcher.findMatches(query: query, in: candidates)
    }
}
