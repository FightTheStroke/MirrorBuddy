//
//  QueryTelemetry.swift
//  MirrorBuddy
//
//  Task 115.5: Privacy-compliant telemetry for query parsing features
//  Tracks usage statistics, performance metrics, and error handling
//

import Foundation
import os.log
import Combine

/// Query parsing event types
enum QueryEvent {
    case queryParsed(query: String, intent: QueryIntent, confidence: Double, duration: TimeInterval)
    case temporalParsed(expression: String, success: Bool)
    case fuzzyMatchPerformed(query: String, candidateCount: Int, matchCount: Int, duration: TimeInterval)
    case aliasResolved(alias: String, success: Bool)
    case aliasCreated(alias: String)
    case aliasDeleted(alias: String)
    case parseError(query: String, error: Error)
    case ambiguousQuery(query: String, confidence: Double)
}

/// Telemetry statistics snapshot
struct TelemetryStats {
    let totalQueries: Int
    let successfulQueries: Int
    let failedQueries: Int
    let averageConfidence: Double
    let averageParseTime: TimeInterval
    let intentDistribution: [String: Int]
    let temporalParseCount: Int
    let fuzzyMatchCount: Int
    let aliasResolveCount: Int
    let aliasCreateCount: Int
    let errorCount: Int
    let period: DateInterval
}

/// Privacy-safe query metadata (no PII)
struct QueryMetadata: Codable {
    let timestamp: Date
    let intent: String
    let confidence: Double
    let parseTimeMs: Double
    let success: Bool
    let queryLength: Int // Store length, not content
    let wordCount: Int
}

/// Privacy-safe telemetry event
struct TelemetryEvent: Codable {
    let eventType: String
    let timestamp: Date
    let metadata: [String: String]
}

/// Query parsing telemetry service
@MainActor
class QueryTelemetry {
    static let shared = QueryTelemetry()

    // Logger for debugging
    private let logger = Logger(subsystem: "com.mirrorbuddy.querytelemetry", category: "QueryParsing")

    // Privacy-compliant: store aggregated statistics, not raw queries
    private var queryMetrics: [QueryMetadata] = []
    private var eventLog: [TelemetryEvent] = []

    // Configuration
    private let maxStoredMetrics = 1_000 // Limit in-memory storage
    private let metricsRetentionDays = 30
    private var isEnabled = true

    // Statistics counters
    private var totalQueriesCount = 0
    private var successfulQueriesCount = 0
    private var failedQueriesCount = 0
    private var temporalParseCount = 0
    private var fuzzyMatchCount = 0
    private var aliasResolveCount = 0
    private var aliasCreateCount = 0
    private var errorCount = 0
    private var intentCounts: [String: Int] = [:]

    // Performance tracking
    private var parseTimes: [TimeInterval] = []

    private init() {
        // Load persisted statistics on init
        loadPersistedStats()
        cleanupOldMetrics()
    }

    // MARK: - Event Logging

    /// Log a query parsing event
    func logEvent(_ event: QueryEvent) {
        guard isEnabled else { return }

        switch event {
        case let .queryParsed(query, intent, confidence, duration):
            logQueryParsed(query: query, intent: intent, confidence: confidence, duration: duration)

        case let .temporalParsed(expression, success):
            logTemporalParse(expression: expression, success: success)

        case let .fuzzyMatchPerformed(query, candidateCount, matchCount, duration):
            logFuzzyMatch(query: query, candidateCount: candidateCount, matchCount: matchCount, duration: duration)

        case let .aliasResolved(alias, success):
            logAliasResolve(alias: alias, success: success)

        case .aliasCreated(let alias):
            logAliasCreate(alias: alias)

        case .aliasDeleted(let alias):
            logAliasDelete(alias: alias)

        case let .parseError(query, error):
            logParseError(query: query, error: error)

        case let .ambiguousQuery(query, confidence):
            logAmbiguousQuery(query: query, confidence: confidence)
        }

        // Cleanup if needed
        if queryMetrics.count > maxStoredMetrics {
            trimOldMetrics()
        }
    }

    // MARK: - Specific Event Handlers

    private func logQueryParsed(query: String, intent: QueryIntent, confidence: Double, duration: TimeInterval) {
        totalQueriesCount += 1

        if confidence >= 0.6 {
            successfulQueriesCount += 1
        } else {
            failedQueriesCount += 1
        }

        // Track intent distribution
        let intentKey = String(describing: intent).components(separatedBy: "(").first ?? "unknown"
        intentCounts[intentKey, default: 0] += 1

        // Track parse time
        parseTimes.append(duration)

        // Store privacy-safe metadata
        let metadata = QueryMetadata(
            timestamp: Date(),
            intent: intentKey,
            confidence: confidence,
            parseTimeMs: duration * 1_000,
            success: confidence >= 0.6,
            queryLength: query.count,
            wordCount: query.split(separator: " ").count
        )
        queryMetrics.append(metadata)

        // Log event
        let event = TelemetryEvent(
            eventType: "query_parsed",
            timestamp: Date(),
            metadata: [
                "intent": intentKey,
                "confidence": String(format: "%.2f", confidence),
                "duration_ms": String(format: "%.2f", duration * 1_000)
            ]
        )
        eventLog.append(event)

        logger.info("Query parsed - Intent: \(intentKey), Confidence: \(String(format: "%.2f", confidence)), Duration: \(String(format: "%.2f ms", duration * 1_000))")
    }

    private func logTemporalParse(expression: String, success: Bool) {
        temporalParseCount += 1

        let event = TelemetryEvent(
            eventType: "temporal_parsed",
            timestamp: Date(),
            metadata: [
                "success": String(success),
                "expression_length": String(expression.count)
            ]
        )
        eventLog.append(event)

        logger.debug("Temporal parse - Success: \(success)")
    }

    private func logFuzzyMatch(query: String, candidateCount: Int, matchCount: Int, duration: TimeInterval) {
        fuzzyMatchCount += 1

        let event = TelemetryEvent(
            eventType: "fuzzy_match",
            timestamp: Date(),
            metadata: [
                "candidate_count": String(candidateCount),
                "match_count": String(matchCount),
                "duration_ms": String(format: "%.2f", duration * 1_000)
            ]
        )
        eventLog.append(event)

        logger.debug("Fuzzy match - Candidates: \(candidateCount), Matches: \(matchCount), Duration: \(String(format: "%.2f ms", duration * 1_000))")
    }

    private func logAliasResolve(alias: String, success: Bool) {
        aliasResolveCount += 1

        let event = TelemetryEvent(
            eventType: "alias_resolved",
            timestamp: Date(),
            metadata: [
                "success": String(success),
                "alias_length": String(alias.count)
            ]
        )
        eventLog.append(event)

        logger.debug("Alias resolve - Success: \(success)")
    }

    private func logAliasCreate(alias: String) {
        aliasCreateCount += 1

        let event = TelemetryEvent(
            eventType: "alias_created",
            timestamp: Date(),
            metadata: [
                "alias_length": String(alias.count)
            ]
        )
        eventLog.append(event)

        logger.info("Alias created")
    }

    private func logAliasDelete(alias: String) {
        let event = TelemetryEvent(
            eventType: "alias_deleted",
            timestamp: Date(),
            metadata: [:]
        )
        eventLog.append(event)

        logger.info("Alias deleted")
    }

    private func logParseError(query: String, error: Error) {
        errorCount += 1
        failedQueriesCount += 1

        let event = TelemetryEvent(
            eventType: "parse_error",
            timestamp: Date(),
            metadata: [
                "error_type": String(describing: type(of: error)),
                "query_length": String(query.count)
            ]
        )
        eventLog.append(event)

        logger.error("Parse error - \(error.localizedDescription)")
    }

    private func logAmbiguousQuery(query: String, confidence: Double) {
        let event = TelemetryEvent(
            eventType: "ambiguous_query",
            timestamp: Date(),
            metadata: [
                "confidence": String(format: "%.2f", confidence),
                "query_length": String(query.count)
            ]
        )
        eventLog.append(event)

        logger.warning("Ambiguous query - Confidence: \(String(format: "%.2f", confidence))")
    }

    // MARK: - Statistics Retrieval

    /// Get current telemetry statistics
    func getStatistics(for period: DateInterval? = nil) -> TelemetryStats {
        let filteredMetrics: [QueryMetadata]
        if let period = period {
            filteredMetrics = queryMetrics.filter { period.contains($0.timestamp) }
        } else {
            filteredMetrics = queryMetrics
        }

        let successCount = filteredMetrics.filter { $0.success }.count
        let avgConfidence = filteredMetrics.isEmpty ? 0 : filteredMetrics.reduce(0.0) { $0 + $1.confidence } / Double(filteredMetrics.count)
        let avgParseTime = parseTimes.isEmpty ? 0 : parseTimes.reduce(0.0, +) / Double(parseTimes.count)

        let actualPeriod = period ?? DateInterval(start: queryMetrics.first?.timestamp ?? Date(), end: Date())

        return TelemetryStats(
            totalQueries: totalQueriesCount,
            successfulQueries: successfulQueriesCount,
            failedQueries: failedQueriesCount,
            averageConfidence: avgConfidence,
            averageParseTime: avgParseTime,
            intentDistribution: intentCounts,
            temporalParseCount: temporalParseCount,
            fuzzyMatchCount: fuzzyMatchCount,
            aliasResolveCount: aliasResolveCount,
            aliasCreateCount: aliasCreateCount,
            errorCount: errorCount,
            period: actualPeriod
        )
    }

    /// Get recent events for debugging
    func getRecentEvents(limit: Int = 50) -> [TelemetryEvent] {
        Array(eventLog.suffix(limit))
    }

    /// Get performance metrics
    func getPerformanceMetrics() -> PerformanceMetrics {
        let sortedParseTimes = parseTimes.sorted()
        let p50 = percentile(sortedParseTimes, 0.5)
        let p95 = percentile(sortedParseTimes, 0.95)
        let p99 = percentile(sortedParseTimes, 0.99)

        return PerformanceMetrics(
            averageParseTime: parseTimes.isEmpty ? 0 : parseTimes.reduce(0, +) / Double(parseTimes.count),
            medianParseTime: p50,
            p95ParseTime: p95,
            p99ParseTime: p99,
            sampleCount: parseTimes.count
        )
    }

    // MARK: - Configuration

    /// Enable or disable telemetry
    func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        logger.info("Telemetry \(enabled ? "enabled" : "disabled")")
    }

    /// Clear all telemetry data
    func clearAll() {
        queryMetrics.removeAll()
        eventLog.removeAll()
        totalQueriesCount = 0
        successfulQueriesCount = 0
        failedQueriesCount = 0
        temporalParseCount = 0
        fuzzyMatchCount = 0
        aliasResolveCount = 0
        aliasCreateCount = 0
        errorCount = 0
        intentCounts.removeAll()
        parseTimes.removeAll()

        logger.info("Telemetry data cleared")
    }

    /// Export telemetry data for analysis (privacy-safe)
    func exportData() -> Data? {
        let exportData = ExportData(
            statistics: getStatistics(),
            events: eventLog,
            metrics: queryMetrics
        )

        return try? JSONEncoder().encode(exportData)
    }

    // MARK: - Privacy & Cleanup

    /// Remove metrics older than retention period
    private func cleanupOldMetrics() {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -metricsRetentionDays, to: Date()) ?? Date()

        queryMetrics.removeAll { $0.timestamp < cutoffDate }
        eventLog.removeAll { $0.timestamp < cutoffDate }

        logger.debug("Cleaned up old metrics")
    }

    /// Trim oldest metrics to stay under max limit
    private func trimOldMetrics() {
        let excessCount = queryMetrics.count - maxStoredMetrics
        guard excessCount > 0 else { return }

        queryMetrics.removeFirst(excessCount)
        eventLog.removeFirst(min(excessCount, eventLog.count))

        logger.debug("Trimmed \(excessCount) old metrics")
    }

    /// Save statistics to disk
    private func persistStats() {
        // Implement UserDefaults or file-based persistence
        // For now, just log
        logger.debug("Persisting statistics")
    }

    /// Load statistics from disk
    private func loadPersistedStats() {
        // Implement UserDefaults or file-based persistence
        // For now, just log
        logger.debug("Loading persisted statistics")
    }

    // MARK: - Helper Functions

    private func percentile(_ sortedArray: [TimeInterval], _ percentile: Double) -> TimeInterval {
        guard !sortedArray.isEmpty else { return 0 }

        let index = Int(Double(sortedArray.count - 1) * percentile)
        return sortedArray[index]
    }
}

// MARK: - Supporting Types

struct PerformanceMetrics {
    let averageParseTime: TimeInterval
    let medianParseTime: TimeInterval
    let p95ParseTime: TimeInterval
    let p99ParseTime: TimeInterval
    let sampleCount: Int
}

struct ExportData: Codable {
    let statistics: TelemetryStats
    let events: [TelemetryEvent]
    let metrics: [QueryMetadata]
}

// Make TelemetryStats Codable
extension TelemetryStats: Codable {
    enum CodingKeys: String, CodingKey {
        case totalQueries, successfulQueries, failedQueries
        case averageConfidence, averageParseTime
        case intentDistribution
        case temporalParseCount, fuzzyMatchCount, aliasResolveCount, aliasCreateCount
        case errorCount
        case periodStart, periodEnd
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        totalQueries = try container.decode(Int.self, forKey: .totalQueries)
        successfulQueries = try container.decode(Int.self, forKey: .successfulQueries)
        failedQueries = try container.decode(Int.self, forKey: .failedQueries)
        averageConfidence = try container.decode(Double.self, forKey: .averageConfidence)
        averageParseTime = try container.decode(TimeInterval.self, forKey: .averageParseTime)
        intentDistribution = try container.decode([String: Int].self, forKey: .intentDistribution)
        temporalParseCount = try container.decode(Int.self, forKey: .temporalParseCount)
        fuzzyMatchCount = try container.decode(Int.self, forKey: .fuzzyMatchCount)
        aliasResolveCount = try container.decode(Int.self, forKey: .aliasResolveCount)
        aliasCreateCount = try container.decode(Int.self, forKey: .aliasCreateCount)
        errorCount = try container.decode(Int.self, forKey: .errorCount)

        let start = try container.decode(Date.self, forKey: .periodStart)
        let end = try container.decode(Date.self, forKey: .periodEnd)
        period = DateInterval(start: start, end: end)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(totalQueries, forKey: .totalQueries)
        try container.encode(successfulQueries, forKey: .successfulQueries)
        try container.encode(failedQueries, forKey: .failedQueries)
        try container.encode(averageConfidence, forKey: .averageConfidence)
        try container.encode(averageParseTime, forKey: .averageParseTime)
        try container.encode(intentDistribution, forKey: .intentDistribution)
        try container.encode(temporalParseCount, forKey: .temporalParseCount)
        try container.encode(fuzzyMatchCount, forKey: .fuzzyMatchCount)
        try container.encode(aliasResolveCount, forKey: .aliasResolveCount)
        try container.encode(aliasCreateCount, forKey: .aliasCreateCount)
        try container.encode(errorCount, forKey: .errorCount)
        try container.encode(period.start, forKey: .periodStart)
        try container.encode(period.end, forKey: .periodEnd)
    }
}
