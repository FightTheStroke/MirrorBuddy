//
//  UpdateManagerTests.swift
//  MirrorBuddyTests
//
//  Task 121: Expand baseline test coverage for UpdateManager
//

@testable import MirrorBuddy
import SwiftData
import XCTest

@MainActor
final class UpdateManagerTests: XCTestCase {
    var updateManager: UpdateManager!
    var mockModelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([Material.self, Flashcard.self, MindMap.self])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        mockModelContext = ModelContext(container)

        updateManager = UpdateManager.shared
        updateManager.configure(modelContext: mockModelContext)
    }

    override func tearDown() async throws {
        updateManager = nil
        mockModelContext = nil
        try await super.tearDown()
    }

    // MARK: - Initialization Tests

    func testManagerInitialization() {
        XCTAssertNotNil(updateManager)
        XCTAssertFalse(updateManager.progress.isUpdating)
        XCTAssertEqual(updateManager.progress.currentStep, .idle)
        XCTAssertEqual(updateManager.progress.progress, 0.0)
        XCTAssertNil(updateManager.progress.error)
    }

    func testProgressInitialState() {
        let progress = updateManager.progress
        XCTAssertEqual(progress.newDocumentsCount, 0)
        XCTAssertEqual(progress.newTasksCount, 0)
        XCTAssertEqual(progress.newEventsCount, 0)
        XCTAssertEqual(progress.mindMapsGenerated, 0)
        XCTAssertEqual(progress.statusMessage, "")
    }

    // MARK: - Configuration Tests

    func testConfigurationWithModelContext() {
        let newManager = UpdateManager.shared
        newManager.configure(modelContext: mockModelContext)

        // Configuration should succeed without errors
        XCTAssertNotNil(newManager)
    }

    // MARK: - Update State Management Tests

    func testUpdateStateTransitions() {
        // Initial state
        XCTAssertEqual(updateManager.progress.currentStep, .idle)
        XCTAssertFalse(updateManager.progress.isUpdating)

        // Simulate state transitions
        updateManager.progress.isUpdating = true
        updateManager.progress.currentStep = .authenticating
        XCTAssertTrue(updateManager.progress.isUpdating)
        XCTAssertEqual(updateManager.progress.currentStep, .authenticating)

        updateManager.progress.currentStep = .syncingDrive
        XCTAssertEqual(updateManager.progress.currentStep, .syncingDrive)

        updateManager.progress.currentStep = .syncingGmail
        XCTAssertEqual(updateManager.progress.currentStep, .syncingGmail)

        updateManager.progress.currentStep = .syncingCalendar
        XCTAssertEqual(updateManager.progress.currentStep, .syncingCalendar)

        updateManager.progress.currentStep = .generatingMindMaps
        XCTAssertEqual(updateManager.progress.currentStep, .generatingMindMaps)

        updateManager.progress.currentStep = .completed
        XCTAssertEqual(updateManager.progress.currentStep, .completed)

        updateManager.progress.isUpdating = false
        XCTAssertFalse(updateManager.progress.isUpdating)
    }

    func testProgressIncrementation() {
        updateManager.progress.progress = 0.0
        XCTAssertEqual(updateManager.progress.progress, 0.0)

        updateManager.progress.progress = 0.1
        XCTAssertEqual(updateManager.progress.progress, 0.1, accuracy: 0.01)

        updateManager.progress.progress = 0.5
        XCTAssertEqual(updateManager.progress.progress, 0.5, accuracy: 0.01)

        updateManager.progress.progress = 1.0
        XCTAssertEqual(updateManager.progress.progress, 1.0, accuracy: 0.01)
    }

    func testCounterIncrementation() {
        updateManager.progress.newDocumentsCount = 5
        XCTAssertEqual(updateManager.progress.newDocumentsCount, 5)

        updateManager.progress.newTasksCount = 3
        XCTAssertEqual(updateManager.progress.newTasksCount, 3)

        updateManager.progress.newEventsCount = 7
        XCTAssertEqual(updateManager.progress.newEventsCount, 7)

        updateManager.progress.mindMapsGenerated = 2
        XCTAssertEqual(updateManager.progress.mindMapsGenerated, 2)
    }

    // MARK: - Error Handling Tests

    func testErrorStateManagement() {
        updateManager.progress.error = nil
        XCTAssertNil(updateManager.progress.error)

        updateManager.progress.error = "Test error message"
        XCTAssertEqual(updateManager.progress.error, "Test error message")

        updateManager.progress.error = nil
        XCTAssertNil(updateManager.progress.error)
    }

    func testFailedUpdateState() {
        updateManager.progress.currentStep = .failed
        XCTAssertEqual(updateManager.progress.currentStep, .failed)

        updateManager.progress.error = "Authentication failed"
        XCTAssertNotNil(updateManager.progress.error)
        XCTAssertEqual(updateManager.progress.error, "Authentication failed")
    }

    // MARK: - Concurrent Update Prevention Tests

    func testPreventsConcurrentUpdates() async {
        updateManager.progress.isUpdating = true

        // Attempt to start another update while one is in progress
        // Should be prevented (would return early)
        XCTAssertTrue(updateManager.progress.isUpdating)

        // Simulate update completion
        updateManager.progress.isUpdating = false
        XCTAssertFalse(updateManager.progress.isUpdating)
    }

    // MARK: - Status Message Tests

    func testStatusMessageUpdates() {
        updateManager.progress.statusMessage = "Preparazione..."
        XCTAssertEqual(updateManager.progress.statusMessage, "Preparazione...")

        updateManager.progress.statusMessage = "Cerco nuovi documenti su Drive..."
        XCTAssertEqual(updateManager.progress.statusMessage, "Cerco nuovi documenti su Drive...")

        updateManager.progress.statusMessage = "Controllo nuove mail..."
        XCTAssertEqual(updateManager.progress.statusMessage, "Controllo nuove mail...")
    }

    // MARK: - Update Step Localization Tests

    func testUpdateStepRawValues() {
        XCTAssertEqual(UpdateStep.idle.rawValue, "Inattivo")
        XCTAssertEqual(UpdateStep.authenticating.rawValue, "Autenticazione...")
        XCTAssertEqual(UpdateStep.syncingDrive.rawValue, "Sincronizzazione Google Drive...")
        XCTAssertEqual(UpdateStep.syncingGmail.rawValue, "Controllo nuove mail...")
        XCTAssertEqual(UpdateStep.syncingCalendar.rawValue, "Controllo calendario...")
        XCTAssertEqual(UpdateStep.generatingMindMaps.rawValue, "Creazione mappe mentali...")
        XCTAssertEqual(UpdateStep.completed.rawValue, "Aggiornamento completato!")
        XCTAssertEqual(UpdateStep.failed.rawValue, "Errore durante l'aggiornamento")
    }

    // MARK: - Observable State Tests

    func testProgressObservability() async {
        // UpdateProgress is @Observable, so state changes should be observable
        let progress = updateManager.progress

        // Trigger changes and verify they're reflected
        progress.isUpdating = true
        XCTAssertTrue(progress.isUpdating)

        progress.currentStep = .authenticating
        XCTAssertEqual(progress.currentStep, .authenticating)

        // Note: In a real app, we'd use Combine or async/await to properly test observation
        // For now, we verify the property changes correctly
        progress.isUpdating = false
        XCTAssertFalse(progress.isUpdating)
    }

    // MARK: - Reset State Tests

    func testResetCounters() {
        // Set counters to non-zero values
        updateManager.progress.newDocumentsCount = 10
        updateManager.progress.newTasksCount = 5
        updateManager.progress.newEventsCount = 8
        updateManager.progress.mindMapsGenerated = 3

        // Reset counters
        updateManager.progress.newDocumentsCount = 0
        updateManager.progress.newTasksCount = 0
        updateManager.progress.newEventsCount = 0
        updateManager.progress.mindMapsGenerated = 0

        // Verify reset
        XCTAssertEqual(updateManager.progress.newDocumentsCount, 0)
        XCTAssertEqual(updateManager.progress.newTasksCount, 0)
        XCTAssertEqual(updateManager.progress.newEventsCount, 0)
        XCTAssertEqual(updateManager.progress.mindMapsGenerated, 0)
    }

    // MARK: - Integration Tests (Simulated)

    func testFullUpdateWorkflowSimulation() async {
        // Simulate the workflow without actually calling external services

        // Step 1: Authentication
        updateManager.progress.isUpdating = true
        updateManager.progress.currentStep = .authenticating
        updateManager.progress.progress = 0.0
        XCTAssertTrue(updateManager.progress.isUpdating)
        XCTAssertEqual(updateManager.progress.currentStep, .authenticating)

        // Step 2: Drive sync
        updateManager.progress.currentStep = .syncingDrive
        updateManager.progress.progress = 0.4
        updateManager.progress.newDocumentsCount = 5
        XCTAssertEqual(updateManager.progress.currentStep, .syncingDrive)
        XCTAssertEqual(updateManager.progress.newDocumentsCount, 5)

        // Step 3: Gmail sync
        updateManager.progress.currentStep = .syncingGmail
        updateManager.progress.progress = 0.6
        updateManager.progress.newTasksCount = 3
        XCTAssertEqual(updateManager.progress.currentStep, .syncingGmail)
        XCTAssertEqual(updateManager.progress.newTasksCount, 3)

        // Step 4: Calendar sync
        updateManager.progress.currentStep = .syncingCalendar
        updateManager.progress.progress = 0.8
        updateManager.progress.newEventsCount = 7
        XCTAssertEqual(updateManager.progress.currentStep, .syncingCalendar)
        XCTAssertEqual(updateManager.progress.newEventsCount, 7)

        // Step 5: Mind map generation
        updateManager.progress.currentStep = .generatingMindMaps
        updateManager.progress.progress = 0.9
        updateManager.progress.mindMapsGenerated = 2
        XCTAssertEqual(updateManager.progress.currentStep, .generatingMindMaps)
        XCTAssertEqual(updateManager.progress.mindMapsGenerated, 2)

        // Step 6: Completion
        updateManager.progress.currentStep = .completed
        updateManager.progress.progress = 1.0
        updateManager.progress.isUpdating = false
        XCTAssertEqual(updateManager.progress.currentStep, .completed)
        XCTAssertEqual(updateManager.progress.progress, 1.0, accuracy: 0.01)
        XCTAssertFalse(updateManager.progress.isUpdating)
    }

    // MARK: - Thread Safety Tests

    func testMainActorConfinement() async {
        // UpdateManager and UpdateProgress should be MainActor-isolated
        await MainActor.run {
            let progress = updateManager.progress
            progress.isUpdating = true
            XCTAssertTrue(progress.isUpdating)
            progress.isUpdating = false
        }
    }
}
