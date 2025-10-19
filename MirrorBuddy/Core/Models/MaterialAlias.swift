//
//  MaterialAlias.swift
//  MirrorBuddy
//
//  Task 115.3: User-defined material aliases for quick voice command access
//  Allows users to create custom shortcuts like "bio" -> "Biology Chapter 5"
//

import Foundation
import SwiftData

/// User-defined alias for quick material access
@Model
final class MaterialAlias {
    /// Unique identifier
    var id = UUID()

    /// Alias name (short form) - e.g., "bio", "math notes", "history ch3"
    var alias: String

    /// Target material ID that this alias points to
    var materialID: UUID

    /// Material title (denormalized for display and search)
    var materialTitle: String

    /// User who created the alias (for multi-user support)
    var userID: String?

    /// Creation timestamp
    var createdAt = Date()

    /// Last used timestamp
    var lastUsedAt: Date?

    /// Usage count for analytics
    var usageCount: Int = 0

    /// Notes about the alias (optional)
    var notes: String?

    /// Whether this alias is active
    var isActive: Bool = true

    // MARK: - Initialization

    init(
        alias: String,
        materialID: UUID,
        materialTitle: String,
        userID: String? = nil,
        notes: String? = nil
    ) {
        self.id = UUID()
        self.alias = alias.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        self.materialID = materialID
        self.materialTitle = materialTitle
        self.userID = userID
        self.notes = notes
        self.createdAt = Date()
        self.isActive = true
        self.usageCount = 0
    }

    // MARK: - Methods

    /// Mark alias as used (increments usage count and updates timestamp)
    func markUsed() {
        usageCount += 1
        lastUsedAt = Date()
    }

    /// Validate alias format
    static func isValidAlias(_ alias: String) -> Bool {
        let trimmed = alias.trimmingCharacters(in: .whitespacesAndNewlines)

        // Must be at least 2 characters
        guard trimmed.count >= 2 else { return false }

        // Must be at most 50 characters
        guard trimmed.count <= 50 else { return false }

        // Must contain only alphanumeric characters, spaces, and basic punctuation
        let allowedCharacters = CharacterSet.alphanumerics
            .union(.whitespaces)
            .union(CharacterSet(charactersIn: "-_"))

        return trimmed.unicodeScalars.allSatisfy { allowedCharacters.contains($0) }
    }

    /// Normalize alias for storage
    static func normalizeAlias(_ alias: String) -> String {
        alias
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "  ", with: " ") // Collapse multiple spaces
    }
}

// MARK: - Comparable

extension MaterialAlias: Comparable {
    static func < (lhs: MaterialAlias, rhs: MaterialAlias) -> Bool {
        // Sort by usage count (descending), then by creation date (descending)
        if lhs.usageCount != rhs.usageCount {
            return lhs.usageCount > rhs.usageCount
        }
        return lhs.createdAt > rhs.createdAt
    }
}
