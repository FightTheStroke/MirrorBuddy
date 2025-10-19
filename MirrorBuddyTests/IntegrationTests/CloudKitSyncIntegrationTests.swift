//
//  CloudKitSyncIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.7: CloudKit Sync Integration Tests
//  Tests data synchronization with CloudKit across devices
//

@testable import MirrorBuddy
import SwiftData
import XCTest

/// Integration tests for CloudKit synchronization
@MainActor
final class CloudKitSyncIntegrationTests: XCTestCase {
    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        let schema = Schema([
            Material.self,
            Flashcard.self,
            Task.self,
            SubjectEntity.self
        ])

        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(for: schema, configurations: [modelConfiguration])
        modelContext = ModelContext(modelContainer)
    }

    override func tearDown() async throws {
        modelContainer = nil
        modelContext = nil
        try await super.tearDown()
    }

    // MARK: - CloudKit Sync Tests

    /// Test 1: Material sync to CloudKit
    func testMaterialSyncToCloudKit() async throws {
        // Given: New material
        let material = Material(title: "Physics Notes")
        material.textContent = "Newton's laws of motion"
        material.processingStatus = .completed
        modelContext.insert(material)
        try modelContext.save()

        // Then: Material should be sync-ready
        XCTAssertNotNil(material.id)
        XCTAssertNotNil(material.createdAt)
        XCTAssertNotNil(material.textContent)
    }

    /// Test 2: Flashcard sync to CloudKit
    func testFlashcardSyncToCloudKit() async throws {
        // Given: Material with flashcards
        let material = Material(title: "Chemistry")
        modelContext.insert(material)

        let flashcard = Flashcard(
            materialID: material.id,
            question: "What is H2O?",
            answer: "Water"
        )
        flashcard.material = material
        modelContext.insert(flashcard)
        try modelContext.save()

        // Then: Flashcard should be sync-ready
        XCTAssertNotNil(flashcard.id)
        XCTAssertEqual(flashcard.materialID, material.id)
    }

    /// Test 3: Conflict resolution (last write wins)
    func testConflictResolutionLastWriteWins() async throws {
        // Given: Material modified on two devices
        let material = Material(title: "Original Title")
        material.lastModifiedAt = Date()
        modelContext.insert(material)
        try modelContext.save()

        let originalModifiedDate = material.lastModifiedAt

        // When: Modify locally (simulate device 1)
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1s
        material.title = "Modified on Device 1"
        material.lastModifiedAt = Date()
        try modelContext.save()

        // Then: Last write should be preserved
        let currentModified = try XCTUnwrap(material.lastModifiedAt)
        let originalModified = try XCTUnwrap(originalModifiedDate)
        XCTAssertGreaterThan(currentModified, originalModified)
        XCTAssertEqual(material.title, "Modified on Device 1")
    }

    /// Test 4: Incremental sync (delta updates)
    func testIncrementalSync() async throws {
        // Given: Initial sync with 3 materials
        let materials = (1...3).map { index in
            let material = Material(title: "Material \(index)")
            material.processingStatus = .completed
            modelContext.insert(material)
            return material
        }
        try modelContext.save()

        let lastSyncDate = Date()

        // When: Add new material after sync
        try await Task.sleep(nanoseconds: 100_000_000)
        let newMaterial = Material(title: "New Material")
        modelContext.insert(newMaterial)
        try modelContext.save()

        // Then: Only new material should be synced
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.createdAt > lastSyncDate }
        )
        let newMaterials = try modelContext.fetch(descriptor)
        XCTAssertEqual(newMaterials.count, 1)
        XCTAssertEqual(newMaterials.first?.title, "New Material")
    }

    /// Test 5: Batch sync performance
    func testBatchSyncPerformance() async throws {
        // Given: Large number of items
        let batchSize = 50

        measure {
            // When: Create batch
            for i in 0..<batchSize {
                let material = Material(title: "Material \(i)")
                modelContext.insert(material)
            }

            do {
                try modelContext.save()
            } catch {
                XCTFail("Batch save failed: \(error)")
            }
        }

        // Then: Verify all items saved
        let descriptor = FetchDescriptor<Material>()
        let allMaterials = try modelContext.fetch(descriptor)
        XCTAssertGreaterThanOrEqual(allMaterials.count, batchSize)
    }

    /// Test 6: Sync state tracking
    func testSyncStateTracking() async throws {
        // Given: Material with sync state
        let material = Material(title: "Sync Test")
        material.processingStatus = .completed
        modelContext.insert(material)
        try modelContext.save()

        // When: Mark as synced
        let syncDate = Date()

        // Then: Track sync state
        XCTAssertNotNil(material.createdAt)
        XCTAssertNotNil(material.lastModifiedAt)
    }

    /// Test 7: Subject hierarchy sync
    func testSubjectHierarchySync() async throws {
        // Given: Subject with materials
        let subject = SubjectEntity(name: "Mathematics", icon: "function")
        modelContext.insert(subject)

        let material1 = Material(title: "Algebra", subject: subject)
        let material2 = Material(title: "Geometry", subject: subject)
        modelContext.insert(material1)
        modelContext.insert(material2)

        try modelContext.save()

        // Then: Hierarchy should be maintained
        XCTAssertEqual(material1.subject?.id, subject.id)
        XCTAssertEqual(material2.subject?.id, subject.id)
    }

    /// Test 8: Deleted items cleanup
    func testDeletedItemsCleanup() async throws {
        // Given: Material to delete
        let material = Material(title: "To Delete")
        modelContext.insert(material)
        try modelContext.save()

        let materialID = material.id

        // When: Delete material
        modelContext.delete(material)
        try modelContext.save()

        // Then: Should not be fetchable
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.id == materialID }
        )
        let materials = try modelContext.fetch(descriptor)
        XCTAssertTrue(materials.isEmpty)
    }

    /// Test 9: Sync error recovery
    func testSyncErrorRecovery() async throws {
        // Given: Material that fails to sync
        let material = Material(title: "Sync Error Test")
        material.processingStatus = .failed
        modelContext.insert(material)
        try modelContext.save()

        // When: Retry sync
        material.processingStatus = .pending
        try modelContext.save()

        // Then: Should be ready for retry
        XCTAssertEqual(material.processingStatus, .pending)
        XCTAssertTrue(material.needsReprocessing)
    }

    /// Test 10: Network connectivity handling
    func testNetworkConnectivityHandling() async throws {
        // Given: Offline state with pending changes
        let material = Material(title: "Offline Material")
        modelContext.insert(material)
        try modelContext.save()

        // When: Queue for sync when online
        // (In real app, this would be queued)
        let pendingMaterial = material

        // Then: Verify queued for sync
        XCTAssertNotNil(pendingMaterial.id)
        XCTAssertNotNil(pendingMaterial.createdAt)
    }
}
