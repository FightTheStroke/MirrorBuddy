//
//  SmartQueryParser.swift
//  MirrorBuddy
//
//  Task 115: AI-powered material query parsing with natural language understanding
//  Supports intent detection, filter extraction, and context-aware search
//

import Foundation
import SwiftData

// MARK: - Query Models

/// Parsed query result with intent, filters, and context
struct ParsedQuery {
    var intent: QueryIntent
    var filters: [QueryFilter]
    var sortOrder: SortOrder
    var context: [String: Any]
    var confidence: Double = 1.0
}

/// Query intent type
enum QueryIntent {
    case search(keywords: [String])
    case filter(criteria: FilterCriteria)
    case recommend(based: RecommendationBasis)
    case recent(timeframe: TimeFrame)
    case difficult(threshold: Double)
    case needsReview
    case topicSearch(topic: String)
}

/// Filter criteria for materials
enum QueryFilter: Equatable {
    case subject(String)
    case difficulty(QueryDifficultyLevel)
    case dateRange(Date, Date)
    case topic(String)
    case bloomLevel(BloomTaxonomy)
    case reviewed(Bool)
    case mastered(Bool)
    case processingStatus(ProcessingStatus)

    static func == (lhs: QueryFilter, rhs: QueryFilter) -> Bool {
        switch (lhs, rhs) {
        case let (.subject(a), .subject(b)):
            return a == b
        case let (.difficulty(a), .difficulty(b)):
            return a == b
        case let (.dateRange(a1, a2), .dateRange(b1, b2)):
            return a1 == b1 && a2 == b2
        case let (.topic(a), .topic(b)):
            return a == b
        case let (.bloomLevel(a), .bloomLevel(b)):
            return a == b
        case let (.reviewed(a), .reviewed(b)):
            return a == b
        case let (.mastered(a), .mastered(b)):
            return a == b
        case let (.processingStatus(a), .processingStatus(b)):
            return a == b
        default:
            return false
        }
    }
}

/// Query difficulty level
enum QueryDifficultyLevel {
    case easy
    case medium
    case hard
}

/// Bloom's taxonomy levels
enum BloomTaxonomy {
    case remember
    case understand
    case apply
    case analyze
    case evaluate
    case create
}

/// Filter criteria type
enum FilterCriteria {
    case bySubject
    case byDifficulty
    case byDate
    case byTopic
}

/// Recommendation basis
enum RecommendationBasis {
    case performance
    case interests
    case upcoming
    case weak
}

/// Time frame for queries
enum TimeFrame {
    case today
    case lastWeek
    case lastMonth
    case custom(days: Int)
}

/// Sort order for results
enum SortOrder {
    case dateDescending
    case dateAscending
    case difficultyDescending
    case difficultyAscending
    case relevanceDescending
    case titleAscending
}

// MARK: - Smart Query Parser

/// AI-powered natural language query parser for materials
@MainActor
final class SmartQueryParser {
    static let shared = SmartQueryParser()

    private let subjectKeywordMap: [String: String] = [
        "math": "matematica",
        "matematica": "matematica",
        "physics": "fisica",
        "fisica": "fisica",
        "italian": "italiano",
        "italiano": "italiano",
        "english": "inglese",
        "inglese": "inglese",
        "history": "storia",
        "storia": "storia",
        "geography": "geografia",
        "geografia": "geografia",
        "science": "scienze",
        "scienze": "scienze",
        "naturali": "scienze naturali",
        "civic": "educazione civica",
        "civica": "educazione civica",
        "religion": "religione",
        "religione": "religione",
        "pe": "scienze motorie",
        "motorie": "scienze motorie",
        "support": "sostegno",
        "sostegno": "sostegno"
    ]

    private let easyDifficultyKeywords = ["easy", "facile", "simple", "semplice", "basic", "base"]
    private let hardDifficultyKeywords = ["hard", "difficile", "challenging", "complex", "complesso", "advanced"]

    private let bloomKeywordMap: [(keywords: [String], level: BloomTaxonomy)] = [
        (["memorize", "remember", "ricordare", "memorizzare"], .remember),
        (["understand", "explain", "capire", "spiegare"], .understand),
        (["apply", "solve", "applicare", "risolvere"], .apply),
        (["analyze", "analizzare"], .analyze),
        (["evaluate", "valutare"], .evaluate),
        (["create", "creare"], .create)
    ]

    private let notReviewedKeywords = [
        "not reviewed", "non rivisto", "haven't studied", "non studiato", "da studiare"
    ]
    private let reviewedKeywords = [
        "reviewed", "rivisto", "studied", "studiato"
    ]
    private let highProficiencyKeywords = [
        "mastered", "padroneggiato", "know well", "so bene"
    ]
    private let needsPracticeKeywords = [
        "not mastered", "non padroneggiato", "need practice", "da esercitare"
    ]
    private let processingKeywordMap: [(keywords: [String], status: ProcessingStatus)] = [
        (["pending", "in attesa"], .pending),
        (["processing", "elaborazione"], .processing),
        (["completed", "completato"], .completed),
        (["failed", "fallito"], .failed)
    ]

    // MARK: - Public API

    /// Parse a natural language query into structured query components
    /// Enhanced with Task 115 features: temporal parsing, fuzzy matching, alias resolution
    func parse(_ query: String) throws -> ParsedQuery {
        let startTime = Date()
        let lowercased = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Detect intent
        let intent = detectIntent(from: lowercased)

        // Extract filters (enhanced with temporal parsing)
        var filters = extractFilters(from: lowercased)

        // Enhanced: Add temporal filters if temporal reference detected
        if let temporalRange = TemporalParser.parseTemporal(lowercased) {
            filters.append(.dateRange(temporalRange.start, temporalRange.end))
            // Log temporal parse event
            QueryTelemetry.shared.logEvent(.temporalParsed(expression: temporalRange.parsedExpression, success: true))
        }

        // Determine sort order
        let sortOrder = determineSortOrder(for: intent, query: lowercased)

        // Extract context
        let context = extractContext(from: lowercased)

        // Calculate confidence based on query complexity
        let confidence = calculateConfidence(query: lowercased, intent: intent, filters: filters)

        // Log query parsing event
        let duration = Date().timeIntervalSince(startTime)
        QueryTelemetry.shared.logEvent(.queryParsed(query: query, intent: intent, confidence: confidence, duration: duration))

        // Log ambiguous query if confidence is low
        if confidence < 0.6 {
            QueryTelemetry.shared.logEvent(.ambiguousQuery(query: query, confidence: confidence))
        }

        return ParsedQuery(
            intent: intent,
            filters: filters,
            sortOrder: sortOrder,
            context: context,
            confidence: confidence
        )
    }

    // MARK: - Intent Detection

    /// Detect user intent from natural language query
    private func detectIntent(from query: String) -> QueryIntent {
        // 1. Difficulty-based queries
        if query.contains("struggled") || query.contains("fatica") ||
            query.contains("difficoltà") || query.contains("hard time") {
            return .difficult(threshold: 0.6)
        }

        if query.contains("difficult") || query.contains("difficile") ||
            query.contains("challenging") || query.contains("hard") {
            return .difficult(threshold: 0.7)
        }

        // 2. Recent material queries
        if query.contains("recent") || query.contains("recente") ||
            query.contains("latest") || query.contains("ultimo") ||
            query.contains("new") || query.contains("nuovo") {
            return .recent(timeframe: detectTimeFrame(from: query))
        }

        // 3. Recommendation queries
        if query.contains("recommend") || query.contains("suggest") ||
            query.contains("raccomanda") || query.contains("consiglia") ||
            query.contains("what should") || query.contains("cosa dovrei") {
            return .recommend(based: detectRecommendationBasis(from: query))
        }

        // 4. Review queries
        if (query.contains("review") || query.contains("rivedere") ||
                query.contains("not studied") || query.contains("non studiato") ||
                query.contains("haven't reviewed") || query.contains("da ripassare")) &&
            !query.contains("reviewed") {
            return .needsReview
        }

        // 5. Topic-based search
        if query.contains("about") || query.contains("su") ||
            query.contains("riguardo") || query.contains("topic") ||
            query.contains("argomento") {
            let topic = extractTopic(from: query)
            return .topicSearch(topic: topic)
        }

        // 6. Filter-based query
        let filters = extractFilters(from: query)
        if !filters.isEmpty && !containsKeywords(query) {
            return .filter(criteria: .bySubject)
        }

        // 7. Default: keyword search
        let keywords = extractKeywords(from: query)
        return .search(keywords: keywords)
    }

    // MARK: - Filter Extraction

    /// Extract all applicable filters from query
    private func extractFilters(from query: String) -> [QueryFilter] {
        var filters: [QueryFilter] = []

        if let subjectFilter = extractSubjectFilter(from: query) {
            filters.append(subjectFilter)
        }

        if let difficultyFilter = extractDifficultyFilter(from: query) {
            filters.append(difficultyFilter)
        }

        if let dateRangeFilter = extractDateRangeFilter(from: query) {
            filters.append(dateRangeFilter)
        }

        if let bloomFilter = extractBloomFilter(from: query) {
            filters.append(bloomFilter)
        }

        if let reviewFilter = extractReviewFilter(from: query) {
            filters.append(reviewFilter)
        }

        if let proficiencyFilter = extractProficiencyFilter(from: query) {
            filters.append(proficiencyFilter)
        }

        if let processingFilter = extractProcessingStatusFilter(from: query) {
            filters.append(processingFilter)
        }

        return filters
    }

    // MARK: - Helper Functions

    private func extractSubjectFilter(from query: String) -> QueryFilter? {
        for (keyword, subject) in subjectKeywordMap where query.contains(keyword) {
            return .subject(subject)
        }
        return nil
    }

    private func extractDifficultyFilter(from query: String) -> QueryFilter? {
        if easyDifficultyKeywords.contains(where: { query.contains($0) }) {
            return .difficulty(.easy)
        }

        if hardDifficultyKeywords.contains(where: { query.contains($0) }) {
            return .difficulty(.hard)
        }

        return nil
    }

    private func extractDateRangeFilter(from query: String) -> QueryFilter? {
        let now = Date()
        let calendar = Calendar.current

        if query.contains("today") || query.contains("oggi") {
            let startOfDay = calendar.startOfDay(for: now)
            return .dateRange(startOfDay, now)
        }

        if query.contains("yesterday") || query.contains("ieri"),
           let yesterday = calendar.date(byAdding: .day, value: -1, to: now) {
            let startOfYesterday = calendar.startOfDay(for: yesterday)
            return .dateRange(startOfYesterday, yesterday)
        }

        if query.contains("week") || query.contains("settimana"),
           let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) {
            return .dateRange(weekAgo, now)
        }

        if query.contains("month") || query.contains("mese"),
           let monthAgo = calendar.date(byAdding: .month, value: -1, to: now) {
            return .dateRange(monthAgo, now)
        }

        return nil
    }

    private func extractBloomFilter(from query: String) -> QueryFilter? {
        for mapping in bloomKeywordMap where mapping.keywords.contains(where: { query.contains($0) }) {
            return .bloomLevel(mapping.level)
        }
        return nil
    }

    private func extractReviewFilter(from query: String) -> QueryFilter? {
        if notReviewedKeywords.contains(where: { query.contains($0) }) {
            return .reviewed(false)
        }

        if reviewedKeywords.contains(where: { query.contains($0) }) {
            return .reviewed(true)
        }

        return nil
    }

    private func extractProficiencyFilter(from query: String) -> QueryFilter? {
        if highProficiencyKeywords.contains(where: { query.contains($0) }) {
            return .mastered(true)
        }

        if needsPracticeKeywords.contains(where: { query.contains($0) }) {
            return .mastered(false)
        }

        return nil
    }

    private func extractProcessingStatusFilter(from query: String) -> QueryFilter? {
        for mapping in processingKeywordMap where mapping.keywords.contains(where: { query.contains($0) }) {
            return .processingStatus(mapping.status)
        }
        return nil
    }

    /// Extract keywords for search
    private func extractKeywords(from query: String) -> [String] {
        // Stop words to filter out (multilingual)
        let stopWords = Set([
            "the", "a", "an", "my", "show", "find", "get", "all", "of", "for", "in", "on", "at",
            "il", "la", "i", "le", "lo", "gli", "un", "una", "mio", "miei", "mia", "mie",
            "mostra", "trova", "cerca", "tutti", "di", "per", "da", "in", "su", "con"
        ])

        let words = query.components(separatedBy: .whitespacesAndNewlines)
        return words
            .map { $0.trimmingCharacters(in: .punctuationCharacters) }
            .filter { !stopWords.contains($0) && $0.count > 2 }
    }

    /// Check if query contains meaningful keywords
    private func containsKeywords(_ query: String) -> Bool {
        let keywords = extractKeywords(from: query)
        return !keywords.isEmpty
    }

    /// Extract topic from query
    private func extractTopic(from query: String) -> String {
        // Look for patterns like "about X", "su X", "riguardo X"
        let aboutPatterns = ["about ", "su ", "riguardo ", "topic ", "argomento "]

        for pattern in aboutPatterns {
            if let range = query.range(of: pattern) {
                let afterPattern = query[range.upperBound...]
                let topic = String(afterPattern)
                    .components(separatedBy: .whitespacesAndNewlines)
                    .prefix(3) // Take up to 3 words
                    .joined(separator: " ")
                    .trimmingCharacters(in: .punctuationCharacters)
                return topic
            }
        }

        // Fallback: return all keywords
        return extractKeywords(from: query).joined(separator: " ")
    }

    /// Detect time frame from query
    private func detectTimeFrame(from query: String) -> TimeFrame {
        if query.contains("today") || query.contains("oggi") {
            return .today
        } else if query.contains("week") || query.contains("settimana") {
            return .lastWeek
        } else if query.contains("month") || query.contains("mese") {
            return .lastMonth
        } else {
            // Default to last week for "recent" queries
            return .lastWeek
        }
    }

    /// Detect recommendation basis from query
    private func detectRecommendationBasis(from query: String) -> RecommendationBasis {
        if query.contains("exam") || query.contains("esame") ||
            query.contains("test") || query.contains("verifica") {
            return .upcoming
        } else if query.contains("weak") || query.contains("struggle") ||
                    query.contains("debole") || query.contains("difficoltà") {
            return .weak
        } else if query.contains("interest") || query.contains("like") ||
                    query.contains("interesse") || query.contains("piace") {
            return .interests
        } else {
            return .performance
        }
    }

    /// Determine sort order based on intent
    private func determineSortOrder(for intent: QueryIntent, query: String) -> SortOrder {
        switch intent {
        case .recent:
            return .dateDescending
        case .difficult:
            return .difficultyDescending
        case .recommend:
            return .relevanceDescending
        case .needsReview:
            return .dateAscending // Oldest unreviewed first
        case .topicSearch, .search:
            return .relevanceDescending
        case .filter:
            return .dateDescending
        }
    }

    /// Extract additional context from query
    private func extractContext(from query: String) -> [String: Any] {
        var context: [String: Any] = [:]

        // Extract numerical context (e.g., "last 5 materials")
        if let range = query.range(of: #"\d+"#, options: .regularExpression),
           let number = Int(query[range]) {
            context["limit"] = number
        }

        // Detect language preference
        let italianPatterns = ["[àèéìòù]", "matematica", "fisica", "italiano", "storia"]
        let hasItalian = italianPatterns.contains { pattern in
            query.range(of: pattern, options: .regularExpression) != nil
        }
        context["language"] = hasItalian ? "italian" : "english"

        // Detect urgency
        if query.contains("urgent") || query.contains("urgente") ||
            query.contains("now") || query.contains("adesso") {
            context["urgent"] = true
        }

        // Detect homework context
        if query.contains("homework") || query.contains("compiti") {
            context["isHomework"] = true
        }

        return context
    }

    /// Calculate confidence score for the parsed query
    private func calculateConfidence(query: String, intent: QueryIntent, filters: [QueryFilter]) -> Double {
        var confidence = 1.0

        // Lower confidence for very short queries
        let wordCount = query.split(separator: " ").count
        if wordCount < 2 {
            confidence -= 0.2
        }

        // Lower confidence for ambiguous queries
        if case .search(let keywords) = intent, keywords.isEmpty {
            confidence -= 0.3
        }

        // Higher confidence when filters are present
        if !filters.isEmpty {
            confidence += 0.1
        }

        // Ensure confidence is between 0 and 1
        return max(0.0, min(1.0, confidence))
    }
}

// MARK: - Query Builder Extension

extension SmartQueryParser {
    /// Build a SwiftData predicate from filters
    /// TODO: Rewrite this to properly handle multiple filters with SwiftData Predicate macro
    /// SwiftData Predicates cannot contain var declarations, for loops, or complex logic
    /// Need to build predicates compositionally and combine with .and() operator
    static func buildPredicate(from filters: [QueryFilter]) -> Predicate<Material> {
        // Simplified placeholder - returns all materials
        // Proper implementation requires building predicates compositionally
        #Predicate<Material> { _ in
            true  // Placeholder - actual filtering should be done in-memory after fetch
        }
    }
}
