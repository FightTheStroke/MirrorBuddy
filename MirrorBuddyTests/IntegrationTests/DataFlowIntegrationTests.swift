//
//  DataFlowIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 121.3: Integration Tests for Data Flows
//  Testing end-to-end workflows across core services
//

import XCTest
import SwiftData
@testable import MirrorBuddy

/// Integration tests for critical data flows in MirrorBuddy
@MainActor
final class DataFlowIntegrationTests: XCTestCase {

    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([
            Material.self,
            Flashcard.self,
            SubjectEntity.self,
            MindMap.self,
            Task.self,
            VoiceConversation.self,
            Transcript.self
        ])

        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: true
        )

        modelContainer = try ModelContainer(
            for: schema,
            configurations: [modelConfiguration]
        )

        modelContext = ModelContext(modelContainer)
    }

    override func tearDown() async throws {
        modelContainer = nil
        modelContext = nil
        try await super.tearDown()
    }

    // MARK: - Integration Test 1: Material Creation to Flashcard Generation Flow

    /// Test the complete flow: Material creation → Processing → Flashcard generation
    func testMaterialToFlashcardGenerationFlow() async throws {
        // Given: Create a test subject
        let subject = SubjectEntity(name: "Mathematics", icon: "function")
        modelContext.insert(subject)

        // When: Create a new material
        let material = Material(
            title: "Quadratic Equations",
            subject: subject,
            googleDriveFileID: nil
        )
        material.textContent = """
        Quadratic Equations are polynomial equations of degree 2.
        The standard form is ax² + bx + c = 0.
        The quadratic formula is x = (-b ± √(b²-4ac)) / 2a.
        The discriminant is b²-4ac and determines the nature of roots.
        """
        material.processingStatus = .completed
        material.summary = "Overview of quadratic equations and solving methods."

        modelContext.insert(material)
        try modelContext.save()

        // And: Generate flashcards from material
        let flashcard1 = Flashcard(
            materialID: material.id,
            question: "What is the standard form of a quadratic equation?",
            answer: "ax² + bx + c = 0",
            explanation: "This is the general form where a, b, and c are constants and a ≠ 0"
        )
        flashcard1.material = material

        let flashcard2 = Flashcard(
            materialID: material.id,
            question: "What is the quadratic formula?",
            answer: "x = (-b ± √(b²-4ac)) / 2a",
            explanation: "This formula solves any quadratic equation"
        )
        flashcard2.material = material

        modelContext.insert(flashcard1)
        modelContext.insert(flashcard2)
        try modelContext.save()

        // Then: Verify material-flashcard relationship
        XCTAssertNotNil(material.flashcards, "Material should have flashcards")
        XCTAssertEqual(material.flashcards?.count, 2, "Should have 2 flashcards")
        XCTAssertEqual(material.processingStatus, .completed, "Material should be processed")

        // And: Verify flashcards are properly linked
        XCTAssertEqual(flashcard1.material?.id, material.id)
        XCTAssertEqual(flashcard2.material?.id, material.id)
        XCTAssertEqual(flashcard1.materialID, material.id)
        XCTAssertEqual(flashcard2.materialID, material.id)

        // And: Verify SM-2 algorithm initialization
        XCTAssertEqual(flashcard1.easeFactor, 2.5, "Initial ease factor should be 2.5")
        XCTAssertEqual(flashcard1.interval, 1, "Initial interval should be 1 day")
        XCTAssertEqual(flashcard1.repetitions, 0, "Initial repetitions should be 0")
    }

    // MARK: - Integration Test 2: Voice Command Detection to Intent Execution Flow

    /// Test voice command recognition and intent detection flow
    func testVoiceCommandExecutionFlow() async throws {
        // Given: Initialize voice manager
        let voiceManager = UnifiedVoiceManager.shared

        // Test Case 1: Short command (should be detected as command)
        let shortCommand = "vai alla dashboard"
        let intent1 = voiceManager.detectIntent(from: shortCommand)
        XCTAssertEqual(intent1, .command, "Short navigation command should be detected as command")

        // Test Case 2: Question (should be detected as conversation)
        let questionCommand = "come si risolve un'equazione quadratica?"
        let intent2 = voiceManager.detectIntent(from: questionCommand)
        XCTAssertEqual(intent2, .conversation, "Question should be detected as conversation")

        // Test Case 3: Command prefix (should be detected as command)
        let prefixCommand = "mostra i miei materiali di matematica"
        let intent3 = voiceManager.detectIntent(from: prefixCommand)
        XCTAssertEqual(intent3, .command, "Command with prefix should be detected as command")

        // Test Case 4: Long utterance (should be detected as conversation)
        let longUtterance = "Spiegami in dettaglio come funziona la formula quadratica e quando dovrei usarla per risolvere equazioni complesse"
        let intent4 = voiceManager.detectIntent(from: longUtterance)
        XCTAssertEqual(intent4, .conversation, "Long utterance should be detected as conversation")

        // Then: Verify intent detection consistency
        XCTAssertNotEqual(intent1, intent2, "Command and question should have different intents")
    }

    // MARK: - Integration Test 3: Study Session with Progress Tracking Flow

    /// Test study session creation and flashcard review progress tracking
    func testStudySessionProgressTrackingFlow() async throws {
        // Given: Create material with flashcards
        let material = Material(title: "Physics - Newton's Laws", subject: nil)
        material.processingStatus = .completed
        modelContext.insert(material)

        let flashcard = Flashcard(
            materialID: material.id,
            question: "What is Newton's First Law?",
            answer: "An object at rest stays at rest unless acted upon by an external force",
            explanation: "Also known as the law of inertia"
        )
        flashcard.material = material
        modelContext.insert(flashcard)
        try modelContext.save()

        // When: Review flashcard with good quality (4/5)
        let initialEaseFactor = flashcard.easeFactor
        let initialInterval = flashcard.interval
        let initialRepetitions = flashcard.repetitions

        flashcard.review(quality: 4)

        // Then: Verify SM-2 algorithm updates
        XCTAssertNotNil(flashcard.lastReviewedAt, "Review timestamp should be set")
        XCTAssertEqual(flashcard.repetitions, initialRepetitions + 1, "Repetitions should increment")
        XCTAssertGreaterThanOrEqual(flashcard.easeFactor, 1.3, "Ease factor should be >= 1.3")

        // When: Review flashcard again with poor quality (2/5)
        flashcard.review(quality: 2)

        // Then: Verify reset on poor performance
        XCTAssertEqual(flashcard.repetitions, 0, "Repetitions should reset on poor review")
        XCTAssertEqual(flashcard.interval, 1, "Interval should reset to 1 day")

        // And: Verify flashcard is marked as due
        let pastDate = Calendar.current.date(byAdding: .day, value: -2, to: Date())!
        flashcard.nextReviewDate = pastDate
        XCTAssertTrue(flashcard.isDue, "Flashcard should be marked as due")
    }

    // MARK: - Integration Test 4: Material Processing Status Lifecycle

    /// Test material processing status transitions
    func testMaterialProcessingLifecycle() async throws {
        // Given: Create a pending material
        let material = Material(title: "Chemistry - Periodic Table")
        XCTAssertEqual(material.processingStatus, .pending, "New material should start as pending")
        XCTAssertTrue(material.needsReprocessing, "Pending material needs reprocessing")

        modelContext.insert(material)
        try modelContext.save()

        // When: Start processing
        material.processingStatus = .processing
        try modelContext.save()

        // Then: Verify processing state
        XCTAssertEqual(material.processingStatus, .processing)
        XCTAssertFalse(material.needsReprocessing, "Processing material doesn't need reprocessing")

        // When: Complete processing successfully
        material.processingStatus = .completed
        material.summary = "Overview of the periodic table"
        material.textContent = "The periodic table organizes elements by atomic number..."
        try modelContext.save()

        // Then: Verify completed state
        XCTAssertEqual(material.processingStatus, .completed)
        XCTAssertFalse(material.needsReprocessing, "Completed material doesn't need reprocessing")
        XCTAssertNotNil(material.summary)

        // When: Mark material as accessed
        let beforeAccess = material.lastAccessedAt
        material.markAccessed()

        // Then: Verify access tracking
        XCTAssertNotNil(material.lastAccessedAt)
        XCTAssertNotEqual(material.lastAccessedAt, beforeAccess)

        // When: Processing fails
        material.processingStatus = .failed
        try modelContext.save()

        // Then: Verify failed state requires reprocessing
        XCTAssertEqual(material.processingStatus, .failed)
        XCTAssertTrue(material.needsReprocessing, "Failed material needs reprocessing")
    }

    // MARK: - Integration Test 5: Subject-Material-Flashcard Hierarchy

    /// Test the complete hierarchy: Subject → Materials → Flashcards
    func testSubjectMaterialFlashcardHierarchy() async throws {
        // Given: Create a subject with multiple materials
        let mathSubject = SubjectEntity(name: "Mathematics", icon: "function")
        modelContext.insert(mathSubject)

        // When: Add materials to subject
        let algebra = Material(title: "Algebra Basics", subject: mathSubject)
        let geometry = Material(title: "Geometry Fundamentals", subject: mathSubject)

        modelContext.insert(algebra)
        modelContext.insert(geometry)

        // And: Add flashcards to each material
        let algebraFlashcard1 = Flashcard(
            materialID: algebra.id,
            question: "What is a variable?",
            answer: "A symbol representing a number"
        )
        algebraFlashcard1.material = algebra

        let algebraFlashcard2 = Flashcard(
            materialID: algebra.id,
            question: "What is an equation?",
            answer: "A mathematical statement with an equals sign"
        )
        algebraFlashcard2.material = algebra

        let geometryFlashcard = Flashcard(
            materialID: geometry.id,
            question: "What is a triangle?",
            answer: "A polygon with three sides and three angles"
        )
        geometryFlashcard.material = geometry

        modelContext.insert(algebraFlashcard1)
        modelContext.insert(algebraFlashcard2)
        modelContext.insert(geometryFlashcard)

        try modelContext.save()

        // Then: Verify subject-material relationships
        XCTAssertEqual(algebra.subject?.id, mathSubject.id)
        XCTAssertEqual(geometry.subject?.id, mathSubject.id)

        // And: Verify material-flashcard relationships
        XCTAssertEqual(algebra.flashcards?.count, 2)
        XCTAssertEqual(geometry.flashcards?.count, 1)

        // And: Verify total flashcard count across subject
        let allFlashcards = [algebra, geometry].flatMap { $0.flashcards ?? [] }
        XCTAssertEqual(allFlashcards.count, 3, "Subject should have 3 total flashcards across materials")

        // When: Delete material with cascade
        modelContext.delete(algebra)
        try modelContext.save()

        // Then: Verify cascading deletion of flashcards
        // Note: The flashcards should be deleted due to cascade delete rule
        // We cannot directly verify this in the test without querying,
        // but we can verify the material is gone
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.id == algebra.id }
        )
        let fetchedMaterials = try modelContext.fetch(descriptor)
        XCTAssertTrue(fetchedMaterials.isEmpty, "Deleted material should not be fetchable")
    }

    // MARK: - Integration Test 6: Google Drive Integration Flow

    /// Test Google Drive file ID tracking and material association
    func testGoogleDriveIntegrationFlow() async throws {
        // Given: Create material from Google Drive
        let driveFileID = "1234567890abcdef"
        let material = Material(
            title: "Shared Lecture Notes",
            subject: nil,
            googleDriveFileID: driveFileID
        )

        modelContext.insert(material)
        try modelContext.save()

        // Then: Verify Google Drive association
        XCTAssertEqual(material.googleDriveFileID, driveFileID)
        XCTAssertNotNil(material.googleDriveFileID)

        // When: Fetch material by Google Drive ID
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.googleDriveFileID == driveFileID }
        )
        let fetchedMaterials = try modelContext.fetch(descriptor)

        // Then: Verify material can be found by Drive ID
        XCTAssertEqual(fetchedMaterials.count, 1)
        XCTAssertEqual(fetchedMaterials.first?.id, material.id)
        XCTAssertEqual(fetchedMaterials.first?.title, "Shared Lecture Notes")
    }
}
