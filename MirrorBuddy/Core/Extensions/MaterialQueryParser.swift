//
//  MaterialQueryParser.swift
//  MirrorBuddy
//
//  Smart material lookup for voice commands
//  Supports: UUIDs, "last:[subject]", "newest", "title:[text]"
//  Enhanced with AI-powered natural language understanding (Task 115)
//

import Foundation

/// Material query parser for voice command material selection
struct MaterialQueryParser {
    /// Parse a query string and find matching material
    /// - Parameters:
    ///   - query: Query string (UUID, "last:geometry", "newest", "title:Storia", etc.)
    ///   - materials: Array of materials to search
    ///   - subjects: Array of subjects for subject name matching
    /// - Returns: Matching material ID if found
    static func findMaterial(
        query: String,
        in materials: [Material],
        subjects: [SubjectEntity]
    ) -> UUID? {
        let trimmedQuery = query.trimmingCharacters(in: .whitespaces)

        // Try UUID format first
        if let uuid = UUID(uuidString: trimmedQuery) {
            return materials.first { $0.id == uuid }?.id
        }

        // Parse special formats
        if trimmedQuery.lowercased().hasPrefix("last:") {
            let subjectName = String(trimmedQuery.dropFirst(5)).trimmingCharacters(in: .whitespaces)
            return findLastMaterialForSubject(subjectName, in: materials, subjects: subjects)
        }

        if trimmedQuery.lowercased() == "newest" || trimmedQuery.lowercased() == "ultimo" {
            return findNewestMaterial(in: materials)
        }

        if trimmedQuery.lowercased().hasPrefix("title:") {
            let titleQuery = String(trimmedQuery.dropFirst(6)).trimmingCharacters(in: .whitespaces)
            return findMaterialByTitle(titleQuery, in: materials)
        }

        // Fallback: try direct title match (case-insensitive)
        return findMaterialByTitle(trimmedQuery, in: materials)
    }

    /// Find materials using AI-powered natural language query (Task 115)
    /// Enhanced with fuzzy matching, alias resolution, and telemetry
    /// - Parameters:
    ///   - query: Natural language query (e.g., "materials I struggled with in math")
    ///   - materials: Array of materials to search
    ///   - subjects: Array of subjects for context
    ///   - aliasService: Optional alias service for alias resolution
    /// - Returns: Array of matching materials sorted by relevance
    static func findMaterialsWithNaturalLanguage(
        query: String,
        in materials: [Material],
        subjects: [SubjectEntity],
        aliasService: MaterialAliasService? = nil
    ) async -> [Material] {
        let startTime = Date()

        // Enhanced: Try alias resolution first (fastest path)
        if let aliasService = aliasService,
           let materialID = try? aliasService.resolveAlias(query) {
            // Alias resolved - return single material
            if let material = materials.first(where: { $0.id == materialID }) {
                QueryTelemetry.shared.logEvent(.aliasResolved(alias: query, success: true))
                return [material]
            }
            QueryTelemetry.shared.logEvent(.aliasResolved(alias: query, success: false))
        }

        // Parse query with SmartQueryParser
        guard let parsedQuery = try? await SmartQueryParser.shared.parse(query) else {
            // Fallback to fuzzy search
            QueryTelemetry.shared.logEvent(.parseError(query: query, error: NSError(domain: "Parse", code: -1)))
            return fuzzySearchMaterials(query: query, in: materials)
        }

        // Apply filters
        var filtered = applyFilters(parsedQuery.filters, to: materials, subjects: subjects)

        // Enhanced: Apply fuzzy matching if no exact matches found and confidence is low
        if filtered.isEmpty || parsedQuery.confidence < 0.7 {
            filtered = fuzzySearchMaterials(query: query, in: materials)
        }

        // Apply intent-specific processing
        filtered = processIntent(parsedQuery.intent, materials: filtered, subjects: subjects)

        // Sort results
        filtered = sortMaterials(filtered, by: parsedQuery.sortOrder, query: query)

        // Apply limit from context if specified
        if let limit = parsedQuery.context["limit"] as? Int {
            filtered = Array(filtered.prefix(limit))
        }

        // Log performance
        let duration = Date().timeIntervalSince(startTime)
        QueryTelemetry.shared.logEvent(.fuzzyMatchPerformed(
            query: query,
            candidateCount: materials.count,
            matchCount: filtered.count,
            duration: duration
        ))

        return filtered
    }

    /// Perform fuzzy search on material titles
    /// - Parameters:
    ///   - query: Search query
    ///   - materials: Materials to search
    /// - Returns: Matching materials sorted by fuzzy match score
    private static func fuzzySearchMaterials(query: String, in materials: [Material]) -> [Material] {
        let matcher = FuzzyMatcher(config: .default)
        let titles = materials.map { $0.title }
        let matches = matcher.findMatches(query: query, in: titles)

        // Map matches back to materials and sort by score
        return matches.compactMap { match in
            materials.first { $0.title == match.matchedString }
        }
    }

    // MARK: - Private Helpers for Natural Language Queries

    /// Apply filters to materials
    private static func applyFilters(
        _ filters: [QueryFilter],
        to materials: [Material],
        subjects: [SubjectEntity]
    ) -> [Material] {
        var filtered = materials

        for filter in filters {
            switch filter {
            case .subject(let subjectName):
                filtered = filtered.filter { material in
                    guard let subject = material.subject else { return false }
                    let displayMatches = subject.displayName.lowercased().contains(subjectName.lowercased())
                    let keyMatches = subject.localizationKey.lowercased().contains(subjectName.lowercased())
                    return displayMatches || keyMatches
                }

            case let .dateRange(start, end):
                filtered = filtered.filter { material in
                    material.createdAt >= start && material.createdAt <= end
                }

            case .processingStatus(let status):
                filtered = filtered.filter { $0.processingStatus == status }

            case .reviewed(let isReviewed):
                if isReviewed {
                    filtered = filtered.filter { $0.lastAccessedAt != nil }
                } else {
                    filtered = filtered.filter { $0.lastAccessedAt == nil }
                }

            case .topic(let topic):
                // Search in title, summary, and extracted text
                filtered = filtered.filter { material in
                    let titleMatch = material.title.localizedCaseInsensitiveContains(topic)
                    let summaryMatch = material.summary?.localizedCaseInsensitiveContains(topic) ?? false
                    let textMatch = material.textContent?.localizedCaseInsensitiveContains(topic) ?? false
                    return titleMatch || summaryMatch || textMatch
                }

            default:
                // Other filters require additional data not available in Material directly
                break
            }
        }

        return filtered
    }

    /// Process materials based on query intent
    private static func processIntent(
        _ intent: QueryIntent,
        materials: [Material],
        subjects: [SubjectEntity]
    ) -> [Material] {
        switch intent {
        case .difficult(let threshold):
            // For now, return materials without filtering by accuracy
            // In the future, integrate with performance tracking
            return materials

        case .recent(let timeframe):
            let cutoffDate: Date
            switch timeframe {
            case .today:
                cutoffDate = Calendar.current.startOfDay(for: Date())
            case .lastWeek:
                cutoffDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            case .lastMonth:
                cutoffDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
            case .custom(let days):
                cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
            }
            return materials.filter { $0.createdAt >= cutoffDate }

        case .needsReview:
            // Materials that haven't been accessed or accessed long ago
            guard let oneWeekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) else {
                return materials // Return all if date calculation fails
            }
            return materials.filter { material in
                if let lastAccessed = material.lastAccessedAt {
                    return lastAccessed < oneWeekAgo
                }
                return true // Never accessed
            }

        case .recommend(let basis):
            // Simple recommendation: prioritize unprocessed or unreviewed materials
            return materials.filter { material in
                material.processingStatus != .completed || material.lastAccessedAt == nil
            }

        case .topicSearch(let topic):
            // Already handled in filters, but ensure we filter here too
            return materials.filter { material in
                let titleMatch = material.title.localizedCaseInsensitiveContains(topic)
                let summaryMatch = material.summary?.localizedCaseInsensitiveContains(topic) ?? false
                return titleMatch || summaryMatch
            }

        case .search(let keywords):
            // Filter by keyword relevance
            return materials.filter { material in
                keywords.contains { keyword in
                    material.title.localizedCaseInsensitiveContains(keyword) ||
                        material.summary?.localizedCaseInsensitiveContains(keyword) ?? false
                }
            }

        case .filter:
            // Already filtered, return as-is
            return materials
        }
    }

    /// Sort materials by specified order
    private static func sortMaterials(_ materials: [Material], by sortOrder: SortOrder, query: String) -> [Material] {
        switch sortOrder {
        case .dateDescending:
            return materials.sorted { $0.createdAt > $1.createdAt }

        case .dateAscending:
            return materials.sorted { $0.createdAt < $1.createdAt }

        case .titleAscending:
            return materials.sorted { $0.title < $1.title }

        case .relevanceDescending:
            // Calculate relevance score based on query keywords
            return materials.sorted { mat1, mat2 in
                let score1 = calculateRelevanceScore(mat1, query: query)
                let score2 = calculateRelevanceScore(mat2, query: query)
                return score1 > score2
            }

        case .difficultyDescending, .difficultyAscending:
            // Difficulty sorting requires additional data
            // For now, fall back to date sorting
            return materials.sorted { $0.createdAt > $1.createdAt }
        }
    }

    /// Calculate relevance score for a material based on query
    private static func calculateRelevanceScore(_ material: Material, query: String) -> Int {
        var score = 0
        let searchText = "\(material.title) \(material.summary ?? "") \(material.textContent ?? "")".lowercased()
        let keywords = query.lowercased().components(separatedBy: .whitespaces)

        for keyword in keywords where keyword.count > 2 {
            // Exact title match: +10 points
            if material.title.lowercased().contains(keyword) {
                score += 10
            }
            // Summary match: +5 points
            if material.summary?.lowercased().contains(keyword) ?? false {
                score += 5
            }
            // Content match: +2 points
            if material.textContent?.lowercased().contains(keyword) ?? false {
                score += 2
            }
        }

        // Boost recently created materials slightly
        let daysSinceCreation = Calendar.current.dateComponents([.day], from: material.createdAt, to: Date()).day ?? 0
        if daysSinceCreation < 7 {
            score += 3
        }

        return score
    }

    // MARK: - Private Helpers

    /// Find most recent material for a subject
    private static func findLastMaterialForSubject(
        _ subjectName: String,
        in materials: [Material],
        subjects: [SubjectEntity]
    ) -> UUID? {
        // Find subject by name (case-insensitive)
        // Match against both displayName and localizationKey
        guard let subject = subjects.first(where: {
            $0.displayName.lowercased() == subjectName.lowercased() ||
                $0.localizationKey.lowercased() == subjectName.lowercased()
        }) else {
            return nil
        }

        // Find most recent material for this subject
        return materials
            .filter { $0.subject?.id == subject.id }
            .sorted { $0.createdAt > $1.createdAt }
            .first?.id
    }

    /// Find most recently created material overall
    private static func findNewestMaterial(in materials: [Material]) -> UUID? {
        materials
            .sorted { $0.createdAt > $1.createdAt }
            .first?.id
    }

    /// Find material by title with fuzzy matching
    private static func findMaterialByTitle(_ titleQuery: String, in materials: [Material]) -> UUID? {
        let lowercaseQuery = titleQuery.lowercased()

        // Try exact match first
        if let exact = materials.first(where: { $0.title.lowercased() == lowercaseQuery }) {
            return exact.id
        }

        // Try contains match
        if let contains = materials.first(where: { $0.title.lowercased().contains(lowercaseQuery) }) {
            return contains.id
        }

        // Try partial word match
        let queryWords = lowercaseQuery.split(separator: " ")
        if let partial = materials.first(where: { material in
            let materialWords = material.title.lowercased().split(separator: " ")
            return queryWords.allSatisfy { queryWord in
                materialWords.contains { $0.hasPrefix(String(queryWord)) }
            }
        }) {
            return partial.id
        }

        return nil
    }
}
