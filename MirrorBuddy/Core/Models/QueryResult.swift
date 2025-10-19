//
//  QueryResult.swift
//  MirrorBuddy
//
//  Task 115: Query result with confidence scoring and match metadata
//  Used for ranking and displaying fuzzy match results
//

import Foundation

/// Result from a material search query with confidence and ranking information
struct QueryResult: Identifiable, Comparable {
    let id = UUID()

    /// Matched material
    let material: Material

    /// Confidence score (0.0 - 1.0)
    /// Higher scores indicate better matches
    let confidence: Double

    /// Match type that produced this result
    let matchType: ResultMatchType

    /// Relevance score for ranking
    let relevanceScore: Double

    /// Match metadata (e.g., matched keywords, fuzzy distance)
    let matchMetadata: [String: Any]

    enum ResultMatchType: String, Codable {
        case exact = "Exact Match"
        case alias = "Alias"
        case fuzzy = "Fuzzy Match"
        case phonetic = "Phonetic Match"
        case partial = "Partial Match"
        case semantic = "Semantic Match"
        case temporal = "Temporal Match"
        case filter = "Filter Match"
    }

    // MARK: - Comparable

    static func < (lhs: QueryResult, rhs: QueryResult) -> Bool {
        // Sort by confidence (descending), then relevance (descending)
        if lhs.confidence != rhs.confidence {
            return lhs.confidence > rhs.confidence
        }
        return lhs.relevanceScore > rhs.relevanceScore
    }

    static func == (lhs: QueryResult, rhs: QueryResult) -> Bool {
        lhs.material.id == rhs.material.id
    }

    // MARK: - Computed Properties

    /// User-friendly confidence description
    var confidenceDescription: String {
        switch confidence {
        case 0.9...1.0:
            return "Excellent Match"
        case 0.75..<0.9:
            return "Good Match"
        case 0.6..<0.75:
            return "Fair Match"
        default:
            return "Possible Match"
        }
    }

    /// Color indicator for confidence level
    var confidenceColor: String {
        switch confidence {
        case 0.9...1.0:
            return "green"
        case 0.75..<0.9:
            return "blue"
        case 0.6..<0.75:
            return "orange"
        default:
            return "gray"
        }
    }

    /// Display text for match type
    var matchTypeDescription: String {
        matchType.rawValue
    }
}

// MARK: - Query Result Builder

struct QueryResultBuilder {
    /// Build query results from materials with fuzzy matching
    static func buildResults(
        materials: [Material],
        query: String,
        filters: [QueryFilter] = [],
        intent: QueryIntent? = nil
    ) -> [QueryResult] {
        var results: [QueryResult] = []

        for material in materials {
            // Calculate confidence based on multiple factors
            let confidence = calculateConfidence(
                material: material,
                query: query,
                filters: filters,
                intent: intent
            )

            // Calculate relevance score
            let relevance = calculateRelevance(
                material: material,
                query: query
            )

            // Determine match type
            let matchType = determineMatchType(
                material: material,
                query: query,
                confidence: confidence
            )

            // Build metadata
            let metadata = buildMetadata(
                material: material,
                query: query,
                matchType: matchType
            )

            let result = QueryResult(
                material: material,
                confidence: confidence,
                matchType: matchType,
                relevanceScore: relevance,
                matchMetadata: metadata
            )

            results.append(result)
        }

        // Sort by confidence and relevance
        return results.sorted()
    }

    // MARK: - Private Helpers

    private static func calculateConfidence(
        material: Material,
        query: String,
        filters: [QueryFilter],
        intent: QueryIntent?
    ) -> Double {
        var confidence = 0.0
        let lowercaseQuery = query.lowercased()
        let lowercaseTitle = material.title.lowercased()

        // Exact title match: 1.0
        if lowercaseTitle == lowercaseQuery {
            confidence = 1.0
        }
        // Title contains query: 0.9
        else if lowercaseTitle.contains(lowercaseQuery) {
            confidence = 0.9
        }
        // Fuzzy match using Levenshtein
        else {
            let matcher = FuzzyMatcher()
            let distance = matcher.levenshteinDistance(lowercaseQuery, lowercaseTitle)
            let maxLength = max(lowercaseQuery.count, lowercaseTitle.count)
            confidence = 1.0 - (Double(distance) / Double(maxLength))
        }

        // Boost confidence if filters match
        let filterBoost = filters.isEmpty ? 0.0 : 0.1
        confidence = min(1.0, confidence + filterBoost)

        return max(0.0, min(1.0, confidence))
    }

    private static func calculateRelevance(
        material: Material,
        query: String
    ) -> Double {
        var score = 0.0

        let keywords = query.lowercased().components(separatedBy: .whitespaces)

        // Title matches
        for keyword in keywords where keyword.count > 2 {
            if material.title.lowercased().contains(keyword) {
                score += 10.0
            }
            if material.summary?.lowercased().contains(keyword) ?? false {
                score += 5.0
            }
            if material.textContent?.lowercased().contains(keyword) ?? false {
                score += 2.0
            }
        }

        // Recency bonus
        let daysSinceCreation = Calendar.current.dateComponents([.day], from: material.createdAt, to: Date()).day ?? 0
        if daysSinceCreation < 7 {
            score += 3.0
        }

        // Recently accessed bonus
        if let lastAccessed = material.lastAccessedAt {
            let daysSinceAccess = Calendar.current.dateComponents([.day], from: lastAccessed, to: Date()).day ?? 0
            if daysSinceAccess < 3 {
                score += 5.0
            }
        }

        return score
    }

    private static func determineMatchType(
        material: Material,
        query: String,
        confidence: Double
    ) -> QueryResult.ResultMatchType {
        let lowercaseQuery = query.lowercased()
        let lowercaseTitle = material.title.lowercased()

        if lowercaseTitle == lowercaseQuery {
            return .exact
        } else if lowercaseTitle.contains(lowercaseQuery) {
            return .partial
        } else if confidence >= 0.7 {
            return .fuzzy
        } else {
            return .semantic
        }
    }

    private static func buildMetadata(
        material: Material,
        query: String,
        matchType: QueryResult.ResultMatchType
    ) -> [String: Any] {
        var metadata: [String: Any] = [:]

        metadata["materialID"] = material.id.uuidString
        metadata["queryLength"] = query.count
        metadata["titleLength"] = material.title.count
        metadata["matchType"] = matchType.rawValue

        // Calculate keyword matches
        let keywords = query.lowercased().components(separatedBy: .whitespaces)
        let matchedKeywords = keywords.filter { keyword in
            material.title.lowercased().contains(keyword) ||
                material.summary?.lowercased().contains(keyword) ?? false
        }
        metadata["matchedKeywords"] = matchedKeywords.count

        return metadata
    }
}
