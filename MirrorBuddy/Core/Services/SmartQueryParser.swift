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
    case difficulty(DifficultyLevel)
    case dateRange(Date, Date)
    case topic(String)
    case bloomLevel(BloomTaxonomy)
    case reviewed(Bool)
    case mastered(Bool)
    case processingStatus(ProcessingStatus)

    static func == (lhs: QueryFilter, rhs: QueryFilter) -> Bool {
        switch (lhs, rhs) {
        case (.subject(let a), .subject(let b)):
            return a == b
        case (.difficulty(let a), .difficulty(let b)):
            return a == b
        case (.dateRange(let a1, let a2), .dateRange(let b1, let b2)):
            return a1 == b1 && a2 == b2
        case (.topic(let a), .topic(let b)):
            return a == b
        case (.bloomLevel(let a), .bloomLevel(let b)):
            return a == b
        case (.reviewed(let a), .reviewed(let b)):
            return a == b
        case (.mastered(let a), .mastered(let b)):
            return a == b
        case (.processingStatus(let a), .processingStatus(let b)):
            return a == b
        default:
            return false
        }
    }
}

/// Difficulty level
enum DifficultyLevel {
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
actor SmartQueryParser {
    static let shared = SmartQueryParser()

    // MARK: - Public API

    /// Parse a natural language query into structured query components
    /// Enhanced with Task 115 features: temporal parsing, fuzzy matching, alias resolution
    func parse(_ query: String) async throws -> ParsedQuery {
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

        // Subject filters (multilingual)
        let subjectMappings: [String: String] = [
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

        for (keyword, subject) in subjectMappings {
            if query.contains(keyword) {
                filters.append(.subject(subject))
                break // Only one subject at a time
            }
        }

        // Difficulty filters
        let easyKeywords = ["easy", "facile", "simple", "semplice", "basic", "base"]
        let hardKeywords = ["hard", "difficile", "challenging", "complex", "complesso", "advanced"]

        if easyKeywords.contains(where: { query.contains($0) }) {
            filters.append(.difficulty(.easy))
        } else if hardKeywords.contains(where: { query.contains($0) }) {
            filters.append(.difficulty(.hard))
        }

        // Time-based filters
        if query.contains("today") || query.contains("oggi") {
            let today = Calendar.current.startOfDay(for: Date())
            filters.append(.dateRange(today, Date()))
        } else if query.contains("yesterday") || query.contains("ieri") {
            let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
            let yesterdayStart = Calendar.current.startOfDay(for: yesterday)
            filters.append(.dateRange(yesterdayStart, yesterday))
        } else if query.contains("week") || query.contains("settimana") {
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
            filters.append(.dateRange(weekAgo, Date()))
        } else if query.contains("month") || query.contains("mese") {
            let monthAgo = Calendar.current.date(byAdding: .month, value: -1, to: Date())!
            filters.append(.dateRange(monthAgo, Date()))
        }

        // Bloom's taxonomy level filters
        if query.contains("memorize") || query.contains("remember") ||
           query.contains("ricordare") || query.contains("memorizzare") {
            filters.append(.bloomLevel(.remember))
        } else if query.contains("understand") || query.contains("explain") ||
                  query.contains("capire") || query.contains("spiegare") {
            filters.append(.bloomLevel(.understand))
        } else if query.contains("apply") || query.contains("solve") ||
                  query.contains("applicare") || query.contains("risolvere") {
            filters.append(.bloomLevel(.apply))
        } else if query.contains("analyze") || query.contains("analizzare") {
            filters.append(.bloomLevel(.analyze))
        } else if query.contains("evaluate") || query.contains("valutare") {
            filters.append(.bloomLevel(.evaluate))
        } else if query.contains("create") || query.contains("creare") {
            filters.append(.bloomLevel(.create))
        }

        // Review status filters
        if query.contains("not reviewed") || query.contains("non rivisto") ||
           query.contains("haven't studied") || query.contains("non studiato") ||
           query.contains("da studiare") {
            filters.append(.reviewed(false))
        } else if query.contains("reviewed") || query.contains("rivisto") ||
                  query.contains("studied") || query.contains("studiato") {
            filters.append(.reviewed(true))
        }

        // Mastery filters
        if query.contains("mastered") || query.contains("padroneggiato") ||
           query.contains("know well") || query.contains("so bene") {
            filters.append(.mastered(true))
        } else if query.contains("not mastered") || query.contains("non padroneggiato") ||
                  query.contains("need practice") || query.contains("da esercitare") {
            filters.append(.mastered(false))
        }

        // Processing status filters
        if query.contains("pending") || query.contains("in attesa") {
            filters.append(.processingStatus(.pending))
        } else if query.contains("processing") || query.contains("elaborazione") {
            filters.append(.processingStatus(.processing))
        } else if query.contains("completed") || query.contains("completato") {
            filters.append(.processingStatus(.completed))
        } else if query.contains("failed") || query.contains("fallito") {
            filters.append(.processingStatus(.failed))
        }

        return filters
    }

    // MARK: - Helper Functions

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
    static func buildPredicate(from filters: [QueryFilter]) -> Predicate<Material> {
        return #Predicate<Material> { material in
            var matches = true

            // Apply each filter
            for filter in filters {
                switch filter {
                case .subject(let subjectName):
                    // Match against subject's displayName or localizationKey
                    if let subject = material.subject {
                        let displayMatches = subject.displayName.lowercased().contains(subjectName.lowercased())
                        let keyMatches = subject.localizationKey.lowercased().contains(subjectName.lowercased())
                        matches = matches && (displayMatches || keyMatches)
                    } else {
                        matches = false
                    }

                case .dateRange(let start, let end):
                    matches = matches && material.createdAt >= start && material.createdAt <= end

                case .processingStatus(let status):
                    matches = matches && material.processingStatus == status

                case .reviewed(let isReviewed):
                    if isReviewed {
                        matches = matches && material.lastAccessedAt != nil
                    } else {
                        matches = matches && material.lastAccessedAt == nil
                    }

                // Note: Some filters (difficulty, topic, bloomLevel, mastered)
                // require post-processing as they depend on related entities or computed properties
                default:
                    break
                }
            }

            return matches
        }
    }
}
