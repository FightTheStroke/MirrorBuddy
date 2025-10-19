//
//  MaterialAliasServiceTests.swift
//  MirrorBuddyTests
//
//  Task 115.3: Tests for material alias management
//  Tests CRUD operations, caching, and fuzzy resolution
//

@testable import MirrorBuddy
import SwiftData
import XCTest

@MainActor
final class MaterialAliasServiceTests: XCTestCase {
    var modelContext: ModelContext!
    var service: MaterialAliasService!
    var testMaterial: Material!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([MaterialAlias.self, Material.self, SubjectEntity.self])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [config])

        modelContext = ModelContext(container)
        service = MaterialAliasService(modelContext: modelContext)

        // Create test material
        let subject = SubjectEntity(
            displayName: "Mathematics",
            localizationKey: "math"
        )
        modelContext.insert(subject)

        testMaterial = Material(
            title: "Quadratic Equations",
            subject: subject
        )
        modelContext.insert(testMaterial)

        try modelContext.save()
    }

    override func tearDown() async throws {
        modelContext = nil
        service = nil
        testMaterial = nil
        try await super.tearDown()
    }

    // MARK: - Create Alias Tests

    func testCreateValidAlias() throws {
        let alias = try service.createAlias(
            alias: "math-eq",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        XCTAssertEqual(alias.alias, "math-eq")
        XCTAssertEqual(alias.materialID, testMaterial.id)
        XCTAssertEqual(alias.materialTitle, testMaterial.title)
        XCTAssertTrue(alias.isActive)
        XCTAssertEqual(alias.usageCount, 0)
    }

    func testCreateAliasWithNotes() throws {
        let alias = try service.createAlias(
            alias: "qe",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title,
            notes: "Quick shortcut for quadratic equations"
        )

        XCTAssertEqual(alias.notes, "Quick shortcut for quadratic equations")
    }

    func testCreateAliasNormalization() throws {
        let alias = try service.createAlias(
            alias: "  Math-EQ  ",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        // Should be normalized: lowercase and trimmed
        XCTAssertEqual(alias.alias, "math-eq")
    }

    func testCreateDuplicateAliasThrows() throws {
        // Create first alias
        try service.createAlias(
            alias: "math-eq",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        // Attempt to create duplicate
        XCTAssertThrowsError(try service.createAlias(
            alias: "math-eq",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )) { error in
            XCTAssertTrue(error is AliasError)
            if case .duplicateAlias(let alias) = error as? AliasError {
                XCTAssertEqual(alias, "math-eq")
            } else {
                XCTFail("Expected duplicateAlias error")
            }
        }
    }

    func testCreateInvalidAliasThrows() {
        // Too short
        XCTAssertThrowsError(try service.createAlias(
            alias: "a",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        ))

        // Too long
        let longAlias = String(repeating: "a", count: 51)
        XCTAssertThrowsError(try service.createAlias(
            alias: longAlias,
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        ))

        // Invalid characters
        XCTAssertThrowsError(try service.createAlias(
            alias: "test@alias",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        ))
    }

    // MARK: - Read Alias Tests

    func testResolveAlias() throws {
        try service.createAlias(
            alias: "qe",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        let resolvedID = try service.resolveAlias("qe")

        XCTAssertEqual(resolvedID, testMaterial.id)
    }

    func testResolveAliasIncrementsUsageCount() throws {
        let alias = try service.createAlias(
            alias: "qe",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        XCTAssertEqual(alias.usageCount, 0)

        // Resolve alias multiple times
        _ = try service.resolveAlias("qe")
        _ = try service.resolveAlias("qe")
        _ = try service.resolveAlias("qe")

        // Fetch updated alias
        let descriptor = FetchDescriptor<MaterialAlias>(
            predicate: #Predicate { $0.id == alias.id }
        )
        let updatedAlias = try modelContext.fetch(descriptor).first

        XCTAssertEqual(updatedAlias?.usageCount, 3)
    }

    func testResolveNonExistentAlias() throws {
        let resolvedID = try service.resolveAlias("nonexistent")
        XCTAssertNil(resolvedID)
    }

    func testResolveInactiveAlias() throws {
        let alias = try service.createAlias(
            alias: "inactive",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        // Deactivate alias
        alias.isActive = false
        try modelContext.save()

        // Should not resolve inactive alias
        let resolvedID = try service.resolveAlias("inactive")
        XCTAssertNil(resolvedID)
    }

    // MARK: - Update Alias Tests

    func testUpdateAliasName() throws {
        let alias = try service.createAlias(
            alias: "old-name",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        try service.updateAlias(
            aliasID: alias.id,
            newAlias: "new-name"
        )

        // Old name should not resolve
        XCTAssertNil(try service.resolveAlias("old-name"))

        // New name should resolve
        XCTAssertEqual(try service.resolveAlias("new-name"), testMaterial.id)
    }

    func testUpdateAliasNotes() throws {
        let alias = try service.createAlias(
            alias: "qe",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title,
            notes: "Old notes"
        )

        try service.updateAlias(
            aliasID: alias.id,
            notes: "New notes"
        )

        let descriptor = FetchDescriptor<MaterialAlias>(
            predicate: #Predicate { $0.id == alias.id }
        )
        let updatedAlias = try modelContext.fetch(descriptor).first

        XCTAssertEqual(updatedAlias?.notes, "New notes")
    }

    func testUpdateAliasToExistingNameThrows() throws {
        try service.createAlias(
            alias: "alias1",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        let alias2 = try service.createAlias(
            alias: "alias2",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        // Try to rename alias2 to alias1 (should fail)
        XCTAssertThrowsError(try service.updateAlias(
            aliasID: alias2.id,
            newAlias: "alias1"
        ))
    }

    // MARK: - Delete Alias Tests

    func testDeleteAlias() throws {
        let alias = try service.createAlias(
            alias: "to-delete",
            materialID: testMaterial.id,
            materialTitle: testMaterial.title
        )

        try service.deleteAlias(aliasID: alias.id)

        // Should no longer resolve
        XCTAssertNil(try service.resolveAlias("to-delete"))

        // Should not exist in database
        let descriptor = FetchDescriptor<MaterialAlias>(
            predicate: #Predicate { $0.id == alias.id }
        )
        let fetched = try modelContext.fetch(descriptor)
        XCTAssertTrue(fetched.isEmpty)
    }

    func testDeleteNonExistentAliasThrows() {
        let randomID = UUID()

        XCTAssertThrowsError(try service.deleteAlias(aliasID: randomID))
    }

    func testDeleteAliasesForMaterial() throws {
        // Create multiple aliases for the same material
        try service.createAlias(alias: "alias1", materialID: testMaterial.id, materialTitle: testMaterial.title)
        try service.createAlias(alias: "alias2", materialID: testMaterial.id, materialTitle: testMaterial.title)
        try service.createAlias(alias: "alias3", materialID: testMaterial.id, materialTitle: testMaterial.title)

        try service.deleteAliasesForMaterial(materialID: testMaterial.id)

        // All aliases should be deleted
        XCTAssertNil(try service.resolveAlias("alias1"))
        XCTAssertNil(try service.resolveAlias("alias2"))
        XCTAssertNil(try service.resolveAlias("alias3"))
    }

    // MARK: - Query Aliases Tests

    func testGetAliasesForMaterial() throws {
        try service.createAlias(alias: "alias1", materialID: testMaterial.id, materialTitle: testMaterial.title)
        try service.createAlias(alias: "alias2", materialID: testMaterial.id, materialTitle: testMaterial.title)

        let aliases = try service.getAliasesForMaterial(materialID: testMaterial.id)

        XCTAssertEqual(aliases.count, 2)
        XCTAssertTrue(aliases.contains { $0.alias == "alias1" })
        XCTAssertTrue(aliases.contains { $0.alias == "alias2" })
    }

    func testGetAllAliases() throws {
        try service.createAlias(alias: "alias1", materialID: testMaterial.id, materialTitle: testMaterial.title)
        try service.createAlias(alias: "alias2", materialID: testMaterial.id, materialTitle: testMaterial.title)

        let aliases = try service.getAllAliases()

        XCTAssertEqual(aliases.count, 2)
    }

    func testGetAllAliasesActiveOnly() throws {
        let alias1 = try service.createAlias(alias: "active", materialID: testMaterial.id, materialTitle: testMaterial.title)
        let alias2 = try service.createAlias(alias: "inactive", materialID: testMaterial.id, materialTitle: testMaterial.title)

        // Deactivate one
        alias2.isActive = false
        try modelContext.save()

        let activeAliases = try service.getAllAliases(activeOnly: true)
        let allAliases = try service.getAllAliases(activeOnly: false)

        XCTAssertEqual(activeAliases.count, 1)
        XCTAssertEqual(allAliases.count, 2)
    }

    // MARK: - Fuzzy Alias Search Tests

    func testFindAliasesFuzzy() throws {
        try service.createAlias(alias: "quadratic-eq", materialID: testMaterial.id, materialTitle: testMaterial.title)
        try service.createAlias(alias: "linear-eq", materialID: testMaterial.id, materialTitle: testMaterial.title)

        let matches = try service.findAliasesFuzzy(query: "quadrtatic-eq") // Typo

        XCTAssertGreaterThan(matches.count, 0)
        XCTAssertEqual(matches.first?.alias.alias, "quadratic-eq")
    }

    func testFindAliasesFuzzyNoMatches() throws {
        try service.createAlias(alias: "math-eq", materialID: testMaterial.id, materialTitle: testMaterial.title)

        let matches = try service.findAliasesFuzzy(query: "biology-notes")

        XCTAssertTrue(matches.isEmpty)
    }

    // MARK: - Statistics Tests

    func testGetAliasStatistics() throws {
        let alias1 = try service.createAlias(alias: "alias1", materialID: testMaterial.id, materialTitle: testMaterial.title)
        let alias2 = try service.createAlias(alias: "alias2", materialID: testMaterial.id, materialTitle: testMaterial.title)

        // Use aliases
        alias1.markUsed()
        alias1.markUsed()
        alias2.markUsed()
        try modelContext.save()

        let stats = try service.getAliasStatistics()

        XCTAssertEqual(stats.totalAliases, 2)
        XCTAssertEqual(stats.activeAliases, 2)
        XCTAssertEqual(stats.totalUsageCount, 3)
        XCTAssertEqual(stats.averageUsageCount, 1.5)
        XCTAssertEqual(stats.mostUsedAlias?.alias, "alias1")
    }

    // MARK: - Cache Tests

    func testCachingBehavior() throws {
        try service.createAlias(alias: "cached", materialID: testMaterial.id, materialTitle: testMaterial.title)

        // First resolve - cache miss
        let start1 = Date()
        _ = try service.resolveAlias("cached")
        let duration1 = Date().timeIntervalSince(start1)

        // Second resolve - cache hit (should be faster)
        let start2 = Date()
        _ = try service.resolveAlias("cached")
        let duration2 = Date().timeIntervalSince(start2)

        // Cache hit should be significantly faster
        XCTAssertLessThan(duration2, duration1)
    }

    func testRebuildCache() throws {
        try service.createAlias(alias: "test", materialID: testMaterial.id, materialTitle: testMaterial.title)

        try service.rebuildCache()

        // Should still resolve after cache rebuild
        XCTAssertEqual(try service.resolveAlias("test"), testMaterial.id)
    }

    func testClearCache() throws {
        try service.createAlias(alias: "test", materialID: testMaterial.id, materialTitle: testMaterial.title)

        // Resolve to populate cache
        _ = try service.resolveAlias("test")

        // Clear cache
        service.clearCache()

        // Should still resolve (from database)
        XCTAssertEqual(try service.resolveAlias("test"), testMaterial.id)
    }

    // MARK: - MaterialAlias Model Tests

    func testAliasValidation() {
        XCTAssertTrue(MaterialAlias.isValidAlias("valid"))
        XCTAssertTrue(MaterialAlias.isValidAlias("valid-alias"))
        XCTAssertTrue(MaterialAlias.isValidAlias("valid_alias_123"))

        XCTAssertFalse(MaterialAlias.isValidAlias("a")) // Too short
        XCTAssertFalse(MaterialAlias.isValidAlias("")) // Empty
        XCTAssertFalse(MaterialAlias.isValidAlias("test@alias")) // Invalid char
        XCTAssertFalse(MaterialAlias.isValidAlias(String(repeating: "a", count: 51))) // Too long
    }

    func testAliasNormalization() {
        XCTAssertEqual(MaterialAlias.normalizeAlias("  Test  "), "test")
        XCTAssertEqual(MaterialAlias.normalizeAlias("Test-Alias"), "test-alias")
        XCTAssertEqual(MaterialAlias.normalizeAlias("test  alias"), "test alias")
    }

    func testAliasMarkUsed() {
        let alias = MaterialAlias(
            alias: "test",
            materialID: UUID(),
            materialTitle: "Test"
        )

        XCTAssertEqual(alias.usageCount, 0)
        XCTAssertNil(alias.lastUsedAt)

        alias.markUsed()

        XCTAssertEqual(alias.usageCount, 1)
        XCTAssertNotNil(alias.lastUsedAt)

        alias.markUsed()

        XCTAssertEqual(alias.usageCount, 2)
    }

    // MARK: - Performance Tests

    func testCreatePerformance() {
        measure {
            for i in 0..<100 {
                try? service.createAlias(
                    alias: "alias\(i)",
                    materialID: testMaterial.id,
                    materialTitle: testMaterial.title
                )
            }
        }
    }

    func testResolvePerformance() throws {
        // Create test aliases
        for i in 0..<100 {
            try service.createAlias(
                alias: "alias\(i)",
                materialID: testMaterial.id,
                materialTitle: testMaterial.title
            )
        }

        measure {
            for i in 0..<100 {
                _ = try? service.resolveAlias("alias\(i)")
            }
        }
    }
}
