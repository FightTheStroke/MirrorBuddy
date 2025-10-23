//
//  MaterialAliasService.swift
//  MirrorBuddy
//
//  Task 115.3: Service for managing user-defined material aliases
//  Provides CRUD operations and fast alias resolution
//

import Combine
import Foundation
import SwiftData

/// Error types for alias operations
enum AliasError: LocalizedError {
    case invalidAlias(String)
    case duplicateAlias(String)
    case aliasNotFound(String)
    case materialNotFound(UUID)
    case databaseError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidAlias(let alias):
            return "Invalid alias format: '\(alias)'. Aliases must be 2-50 characters and contain only letters, numbers, spaces, hyphens, or underscores."
        case .duplicateAlias(let alias):
            return "An alias named '\(alias)' already exists. Please choose a different name."
        case .aliasNotFound(let alias):
            return "Alias '\(alias)' not found."
        case .materialNotFound(let id):
            return "Material with ID \(id) not found."
        case .databaseError(let error):
            return "Database error: \(error.localizedDescription)"
        }
    }
}

/// Service for managing material aliases
@MainActor
class MaterialAliasService {
    private let modelContext: ModelContext

    // In-memory cache for fast lookups (alias -> materialID)
    private var aliasCache: [String: UUID] = [:]
    private var cacheLastUpdated: Date?
    private let cacheTimeout: TimeInterval = 300 // 5 minutes

    // MARK: - Initialization

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - CRUD Operations

    /// Create a new alias for a material
    /// - Parameters:
    ///   - alias: Alias name (will be normalized)
    ///   - materialID: Target material ID
    ///   - materialTitle: Material title for denormalized storage
    ///   - userID: Optional user ID
    ///   - notes: Optional notes about the alias
    /// - Returns: Created MaterialAlias
    /// - Throws: AliasError if validation fails or duplicate exists
    func createAlias(
        alias: String,
        materialID: UUID,
        materialTitle: String,
        userID: String? = nil,
        notes: String? = nil
    ) throws -> MaterialAlias {
        // Validate alias format
        guard MaterialAlias.isValidAlias(alias) else {
            throw AliasError.invalidAlias(alias)
        }

        // Normalize alias
        let normalized = MaterialAlias.normalizeAlias(alias)

        // Check for duplicates
        if try aliasExists(normalized) {
            throw AliasError.duplicateAlias(normalized)
        }

        // Create new alias
        let newAlias = MaterialAlias(
            alias: normalized,
            materialID: materialID,
            materialTitle: materialTitle,
            userID: userID,
            notes: notes
        )

        modelContext.insert(newAlias)

        do {
            try modelContext.save()
            // Update cache
            aliasCache[normalized] = materialID
            return newAlias
        } catch {
            throw AliasError.databaseError(error)
        }
    }

    /// Update an existing alias
    /// - Parameters:
    ///   - aliasID: ID of the alias to update
    ///   - newAlias: Optional new alias name
    ///   - newMaterialID: Optional new target material
    ///   - newMaterialTitle: Optional new material title
    ///   - notes: Optional new notes
    /// - Throws: AliasError if alias not found or validation fails
    func updateAlias(
        aliasID: UUID,
        newAlias: String? = nil,
        newMaterialID: UUID? = nil,
        newMaterialTitle: String? = nil,
        notes: String? = nil
    ) throws {
        // Fetch existing alias
        let predicate = #Predicate<MaterialAlias> { $0.id == aliasID }
        let descriptor = FetchDescriptor(predicate: predicate)

        guard let existingAlias = try? modelContext.fetch(descriptor).first else {
            throw AliasError.aliasNotFound(aliasID.uuidString)
        }

        // Update alias name if provided
        if let newAlias = newAlias {
            guard MaterialAlias.isValidAlias(newAlias) else {
                throw AliasError.invalidAlias(newAlias)
            }

            let normalized = MaterialAlias.normalizeAlias(newAlias)

            // Check for duplicates (excluding current alias)
            let exists = try aliasExists(normalized)
            if normalized != existingAlias.alias && exists {
                throw AliasError.duplicateAlias(normalized)
            }

            // Remove old cache entry
            aliasCache.removeValue(forKey: existingAlias.alias)

            existingAlias.alias = normalized

            // Add new cache entry
            aliasCache[normalized] = existingAlias.materialID
        }

        // Update material ID if provided
        if let newMaterialID = newMaterialID {
            existingAlias.materialID = newMaterialID
            aliasCache[existingAlias.alias] = newMaterialID
        }

        // Update material title if provided
        if let newMaterialTitle = newMaterialTitle {
            existingAlias.materialTitle = newMaterialTitle
        }

        // Update notes if provided
        if let notes = notes {
            existingAlias.notes = notes
        }

        do {
            try modelContext.save()
        } catch {
            throw AliasError.databaseError(error)
        }
    }

    /// Delete an alias
    /// - Parameter aliasID: ID of the alias to delete
    /// - Throws: AliasError if alias not found
    func deleteAlias(aliasID: UUID) throws {
        let predicate = #Predicate<MaterialAlias> { $0.id == aliasID }
        let descriptor = FetchDescriptor(predicate: predicate)

        guard let alias = try? modelContext.fetch(descriptor).first else {
            throw AliasError.aliasNotFound(aliasID.uuidString)
        }

        // Remove from cache
        aliasCache.removeValue(forKey: alias.alias)

        modelContext.delete(alias)

        do {
            try modelContext.save()
        } catch {
            throw AliasError.databaseError(error)
        }
    }

    /// Delete all aliases for a specific material
    /// - Parameter materialID: Material ID
    func deleteAliasesForMaterial(materialID: UUID) throws {
        let predicate = #Predicate<MaterialAlias> { $0.materialID == materialID }
        let descriptor = FetchDescriptor(predicate: predicate)

        guard let aliases = try? modelContext.fetch(descriptor) else { return }

        for alias in aliases {
            aliasCache.removeValue(forKey: alias.alias)
            modelContext.delete(alias)
        }

        do {
            try modelContext.save()
        } catch {
            throw AliasError.databaseError(error)
        }
    }

    // MARK: - Query Operations

    /// Resolve an alias to a material ID
    /// - Parameter alias: Alias to resolve
    /// - Returns: Material ID if found, nil otherwise
    func resolveAlias(_ alias: String) throws -> UUID? {
        let normalized = MaterialAlias.normalizeAlias(alias)

        // Check cache first
        if let materialID = getCachedMaterialID(for: normalized) {
            // Mark as used
            try markAliasUsed(normalized)
            return materialID
        }

        // Cache miss - query database
        let predicate = #Predicate<MaterialAlias> { $0.alias == normalized && $0.isActive }
        let descriptor = FetchDescriptor(predicate: predicate)

        guard let aliasObj = try? modelContext.fetch(descriptor).first else {
            return nil
        }

        // Update cache
        aliasCache[normalized] = aliasObj.materialID

        // Mark as used
        aliasObj.markUsed()
        try? modelContext.save()

        return aliasObj.materialID
    }

    /// Find aliases using fuzzy matching
    /// - Parameter query: Search query
    /// - Returns: Array of matching aliases sorted by relevance
    func findAliasesFuzzy(query: String) throws -> [(alias: MaterialAlias, score: Double)] {
        // Fetch all active aliases
        let predicate = #Predicate<MaterialAlias> { $0.isActive }
        let descriptor = FetchDescriptor(predicate: predicate)

        guard let allAliases = try? modelContext.fetch(descriptor) else {
            return []
        }

        // Use FuzzyMatcher to find matches
        let matcher = FuzzyMatcher(config: .relaxed)
        let aliasNames = allAliases.map { $0.alias }
        let matches = matcher.findMatches(query: query, in: aliasNames)

        // Map matches back to MaterialAlias objects
        return matches.compactMap { match in
            guard let aliasObj = allAliases.first(where: { $0.alias == match.matchedString }) else {
                return nil
            }
            return (alias: aliasObj, score: match.score)
        }
    }

    /// Get all aliases for a specific material
    /// - Parameter materialID: Material ID
    /// - Returns: Array of aliases
    func getAliasesForMaterial(materialID: UUID) throws -> [MaterialAlias] {
        let predicate = #Predicate<MaterialAlias> { $0.materialID == materialID && $0.isActive }
        let descriptor = FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.usageCount, order: .reverse)])

        return (try? modelContext.fetch(descriptor)) ?? []
    }

    /// Get all aliases (optionally filtered)
    /// - Parameters:
    ///   - activeOnly: Only return active aliases
    ///   - sortBy: Sort criteria
    /// - Returns: Array of all aliases
    func getAllAliases(activeOnly: Bool = true, sortBy: AliasSortCriteria = .usageCount) throws -> [MaterialAlias] {
        var predicate: Predicate<MaterialAlias>?
        if activeOnly {
            predicate = #Predicate<MaterialAlias> { $0.isActive }
        }

        let sortDescriptor: SortDescriptor<MaterialAlias>
        switch sortBy {
        case .usageCount:
            sortDescriptor = SortDescriptor(\.usageCount, order: .reverse)
        case .createdAt:
            sortDescriptor = SortDescriptor(\.createdAt, order: .reverse)
        case .alphabetical:
            sortDescriptor = SortDescriptor(\.alias, order: .forward)
        case .lastUsed:
            sortDescriptor = SortDescriptor(\.lastUsedAt, order: .reverse)
        }

        let descriptor = FetchDescriptor(predicate: predicate, sortBy: [sortDescriptor])

        return (try? modelContext.fetch(descriptor)) ?? []
    }

    /// Get statistics about alias usage
    func getAliasStatistics() throws -> AliasStatistics {
        let descriptor = FetchDescriptor<MaterialAlias>()
        guard let allAliases = try? modelContext.fetch(descriptor) else {
            return AliasStatistics(totalAliases: 0, activeAliases: 0, totalUsageCount: 0, averageUsageCount: 0, mostUsedAlias: nil)
        }

        let activeAliases = allAliases.filter { $0.isActive }
        let totalUsage = allAliases.reduce(0) { $0 + $1.usageCount }
        let averageUsage = allAliases.isEmpty ? 0.0 : Double(totalUsage) / Double(allAliases.count)
        let mostUsed = allAliases.max { $0.usageCount < $1.usageCount }

        return AliasStatistics(
            totalAliases: allAliases.count,
            activeAliases: activeAliases.count,
            totalUsageCount: totalUsage,
            averageUsageCount: averageUsage,
            mostUsedAlias: mostUsed
        )
    }

    // MARK: - Cache Management

    /// Rebuild the alias cache
    func rebuildCache() throws {
        let descriptor = FetchDescriptor<MaterialAlias>(predicate: #Predicate { $0.isActive })

        guard let aliases = try? modelContext.fetch(descriptor) else {
            throw AliasError.databaseError(NSError(domain: "MaterialAliasService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch aliases"]))
        }

        aliasCache.removeAll()

        for alias in aliases {
            aliasCache[alias.alias] = alias.materialID
        }

        cacheLastUpdated = Date()
    }

    /// Clear the alias cache
    func clearCache() {
        aliasCache.removeAll()
        cacheLastUpdated = nil
    }

    // MARK: - Private Helpers

    /// Check if an alias already exists
    private func aliasExists(_ alias: String) throws -> Bool {
        let predicate = #Predicate<MaterialAlias> { $0.alias == alias }
        var descriptor = FetchDescriptor(predicate: predicate)
        descriptor.fetchLimit = 1

        return (try? modelContext.fetchCount(descriptor)) ?? 0 > 0
    }

    /// Get material ID from cache if valid
    private func getCachedMaterialID(for alias: String) -> UUID? {
        // Check if cache is still valid
        if let lastUpdated = cacheLastUpdated {
            let elapsed = Date().timeIntervalSince(lastUpdated)
            if elapsed > cacheTimeout {
                clearCache()
                return nil
            }
        }

        return aliasCache[alias]
    }

    /// Mark an alias as used
    private func markAliasUsed(_ alias: String) throws {
        let predicate = #Predicate<MaterialAlias> { $0.alias == alias }
        let descriptor = FetchDescriptor(predicate: predicate)

        guard let aliasObj = try? modelContext.fetch(descriptor).first else { return }

        aliasObj.markUsed()
        try? modelContext.save()
    }
}

// MARK: - Supporting Types

enum AliasSortCriteria {
    case usageCount
    case createdAt
    case alphabetical
    case lastUsed
}

struct AliasStatistics {
    let totalAliases: Int
    let activeAliases: Int
    let totalUsageCount: Int
    let averageUsageCount: Double
    let mostUsedAlias: MaterialAlias?
}
