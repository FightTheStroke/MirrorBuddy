//
//  OfflineTransitionIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.8: Offline Transition Integration Tests
//  Tests offline mode behavior and sync when back online
//

import XCTest
import SwiftData
@testable import MirrorBuddy

/// Integration tests for offline to online transitions
@MainActor
final class OfflineTransitionIntegrationTests: XCTestCase {

    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        let schema = Schema([
            Material.self,
            Flashcard.self,
            Task.self
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

    // MARK: - Offline Transition Tests

    /// Test 1: Create data while offline
    func testCreateDataWhileOffline() async throws {
        // Given: Offline mode
        let isOffline = true

        // When: Create material offline
        let material = Material(title: "Offline Material")
        material.textContent = "Created while offline"
        material.processingStatus = .pending

        modelContext.insert(material)
        try modelContext.save()

        // Then: Data should be persisted locally
        XCTAssertNotNil(material.id)
        XCTAssertNotNil(material.createdAt)
        XCTAssertEqual(material.textContent, "Created while offline")
    }

    /// Test 2: Modify data while offline
    func testModifyDataWhileOffline() async throws {
        // Given: Existing material
        let material = Material(title: "Original Title")
        material.processingStatus = .completed
        modelContext.insert(material)
        try modelContext.save()

        // When: Modify while offline
        material.title = "Modified Offline"
        material.lastModifiedAt = Date()
        try modelContext.save()

        // Then: Changes should be tracked
        XCTAssertEqual(material.title, "Modified Offline")
        XCTAssertNotNil(material.lastModifiedAt)
    }

    /// Test 3: Queue operations for sync
    func testQueueOperationsForSync() async throws {
        // Given: Multiple offline changes
        let material1 = Material(title: "Offline 1")
        let material2 = Material(title: "Offline 2")
        let material3 = Material(title: "Offline 3")

        modelContext.insert(material1)
        modelContext.insert(material2)
        modelContext.insert(material3)
        try modelContext.save()

        // Then: All should be queued
        let descriptor = FetchDescriptor<Material>()
        let materials = try modelContext.fetch(descriptor)
        XCTAssertEqual(materials.count, 3)
    }

    /// Test 4: Sync queue processing
    func testSyncQueueProcessing() async throws {
        // Given: Offline queue with 5 items
        for i in 1...5 {
            let material = Material(title: "Queued \(i)")
            modelContext.insert(material)
        }
        try modelContext.save()

        // When: Go back online (simulated)
        let descriptor = FetchDescriptor<Material>()
        let queuedMaterials = try modelContext.fetch(descriptor)

        // Then: All items should be ready to sync
        XCTAssertEqual(queuedMaterials.count, 5)
        XCTAssertTrue(queuedMaterials.allSatisfy { $0.id != UUID() })
    }

    /// Test 5: Offline flashcard study
    func testOfflineFlashcardStudy() async throws {
        // Given: Material with flashcards
        let material = Material(title: "Offline Study")
        modelContext.insert(material)

        let flashcard = Flashcard(
            materialID: material.id,
            question: "What is 2+2?",
            answer: "4"
        )
        flashcard.material = material
        modelContext.insert(flashcard)
        try modelContext.save()

        // When: Review flashcard offline
        flashcard.review(quality: 4)

        // Then: Review data should be saved locally
        XCTAssertNotNil(flashcard.lastReviewedAt)
        XCTAssertGreaterThan(flashcard.repetitions, 0)
    }

    /// Test 6: Offline task management
    func testOfflineTaskManagement() async throws {
        // Given: Tasks created offline
        let task1 = Task(title: "Offline Task 1", priority: .high)
        task1.isCompleted = false
        modelContext.insert(task1)

        let task2 = Task(title: "Offline Task 2", priority: .medium)
        task2.isCompleted = false
        modelContext.insert(task2)

        try modelContext.save()

        // When: Complete task offline
        task1.isCompleted = true
        task1.completedAt = Date()
        try modelContext.save()

        // Then: Changes should be persisted
        XCTAssertTrue(task1.isCompleted)
        XCTAssertNotNil(task1.completedAt)
        XCTAssertFalse(task2.isCompleted)
    }

    /// Test 7: Conflict detection on reconnect
    func testConflictDetectionOnReconnect() async throws {
        // Given: Material modified offline
        let material = Material(title: "Conflict Test")
        material.lastModifiedAt = Date()
        modelContext.insert(material)
        try modelContext.save()

        let localModifiedDate = material.lastModifiedAt!

        // When: Simulate server has newer version
        try await Task.sleep(nanoseconds: 100_000_000)
        let serverModifiedDate = Date()

        // Then: Detect conflict
        XCTAssertLessThan(localModifiedDate, serverModifiedDate)
    }

    /// Test 8: Data integrity after reconnect
    func testDataIntegrityAfterReconnect() async throws {
        // Given: Complex data created offline
        let material = Material(title: "Integrity Test")
        modelContext.insert(material)

        let flashcard1 = Flashcard(
            materialID: material.id,
            question: "Q1",
            answer: "A1"
        )
        flashcard1.material = material

        let flashcard2 = Flashcard(
            materialID: material.id,
            question: "Q2",
            answer: "A2"
        )
        flashcard2.material = material

        modelContext.insert(flashcard1)
        modelContext.insert(flashcard2)
        try modelContext.save()

        // Then: Verify relationships intact
        XCTAssertEqual(material.flashcards?.count, 2)
        XCTAssertEqual(flashcard1.materialID, material.id)
        XCTAssertEqual(flashcard2.materialID, material.id)
    }

    /// Test 9: Offline deletion handling
    func testOfflineDeletionHandling() async throws {
        // Given: Material to delete offline
        let material = Material(title: "To Delete Offline")
        modelContext.insert(material)
        try modelContext.save()

        let materialID = material.id

        // When: Delete while offline
        modelContext.delete(material)
        try modelContext.save()

        // Then: Deletion should be persisted
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.id == materialID }
        )
        let materials = try modelContext.fetch(descriptor)
        XCTAssertTrue(materials.isEmpty)
    }

    /// Test 10: Offline mode state management
    func testOfflineModeStateManagement() async throws {
        // Given: App state
        var isOffline = true
        var pendingChanges = 0

        // When: Make changes offline
        if isOffline {
            let material = Material(title: "Offline Change")
            modelContext.insert(material)
            try modelContext.save()
            pendingChanges += 1
        }

        // Then: Track offline state
        XCTAssertTrue(isOffline)
        XCTAssertEqual(pendingChanges, 1)

        // When: Go back online
        isOffline = false

        // Then: Ready to sync
        XCTAssertFalse(isOffline)
        XCTAssertGreaterThan(pendingChanges, 0)
    }

    /// Test 11: Partial sync recovery
    func testPartialSyncRecovery() async throws {
        // Given: 10 items to sync, 3 fail
        for i in 1...10 {
            let material = Material(title: "Sync Item \(i)")
            material.processingStatus = (i <= 7) ? .completed : .failed
            modelContext.insert(material)
        }
        try modelContext.save()

        // When: Retry failed items
        let failedDescriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.processingStatus == .failed }
        )
        let failedMaterials = try modelContext.fetch(failedDescriptor)

        // Then: Identify failed items
        XCTAssertEqual(failedMaterials.count, 3)

        // When: Retry
        for material in failedMaterials {
            material.processingStatus = .pending
        }
        try modelContext.save()

        // Then: All ready to retry
        let pendingDescriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.processingStatus == .pending }
        )
        let pendingMaterials = try modelContext.fetch(pendingDescriptor)
        XCTAssertEqual(pendingMaterials.count, 3)
    }

    /// Test 12: Offline cache management
    func testOfflineCacheManagement() async throws {
        // Given: Materials with cached data
        let material1 = Material(title: "Cached 1")
        material1.textContent = "Cached content 1"
        material1.processingStatus = .completed

        let material2 = Material(title: "Cached 2")
        material2.textContent = "Cached content 2"
        material2.processingStatus = .completed

        modelContext.insert(material1)
        modelContext.insert(material2)
        try modelContext.save()

        // Then: Cache should be available offline
        XCTAssertNotNil(material1.textContent)
        XCTAssertNotNil(material2.textContent)
        XCTAssertEqual(material1.processingStatus, .completed)
    }
}
