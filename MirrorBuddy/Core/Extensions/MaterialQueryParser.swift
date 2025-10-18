//
//  MaterialQueryParser.swift
//  MirrorBuddy
//
//  Smart material lookup for voice commands
//  Supports: UUIDs, "last:[subject]", "newest", "title:[text]"
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
