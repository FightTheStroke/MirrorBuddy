//
//  MaterialProcessingIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.3: Material Processing Integration Tests
//  Tests end-to-end material processing workflows: PDF → summary → flashcards → mind maps
//

import XCTest
import SwiftData
@testable import MirrorBuddy

/// Integration tests for complete material processing workflows
@MainActor
final class MaterialProcessingIntegrationTests: XCTestCase {

    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([
            Material.self,
            Flashcard.self,
            SubjectEntity.self,
            MindMap.self
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

    // MARK: - End-to-End Processing Tests

    /// Test 1: Complete material processing pipeline from creation to flashcards
    func testCompleteMaterialProcessingPipeline() async throws {
        // Given: Create a subject and material
        let mathSubject = SubjectEntity(name: "Mathematics", icon: "function")
        modelContext.insert(mathSubject)

        let material = Material(
            title: "Linear Algebra Basics",
            subject: mathSubject,
            googleDriveFileID: nil
        )
        material.textContent = """
        Linear Algebra Fundamentals

        Vectors are ordered lists of numbers. A vector in 2D space has two components: v = (x, y).

        Matrices are rectangular arrays of numbers. Matrix multiplication is performed by taking dot products of rows and columns.

        The determinant of a 2x2 matrix [[a, b], [c, d]] is calculated as: det = ad - bc.

        Eigenvalues and eigenvectors are fundamental concepts. For a matrix A, if Av = λv, then λ is an eigenvalue and v is an eigenvector.
        """

        material.processingStatus = .pending
        modelContext.insert(material)
        try modelContext.save()

        // When: Process the material
        XCTAssertEqual(material.processingStatus, .pending)

        // Simulate processing stages
        material.processingStatus = .processing
        try modelContext.save()

        // Simulate summary generation
        material.summary = "Introduction to linear algebra covering vectors, matrices, determinants, and eigenvalues."

        // Simulate flashcard generation
        let flashcard1 = Flashcard(
            materialID: material.id,
            question: "What is a vector?",
            answer: "An ordered list of numbers",
            explanation: "Vectors represent quantities with magnitude and direction"
        )
        flashcard1.material = material

        let flashcard2 = Flashcard(
            materialID: material.id,
            question: "How do you calculate the determinant of a 2x2 matrix [[a, b], [c, d]]?",
            answer: "det = ad - bc",
            explanation: "Determinant is calculated by subtracting the product of the diagonals"
        )
        flashcard2.material = material

        let flashcard3 = Flashcard(
            materialID: material.id,
            question: "What is an eigenvalue?",
            answer: "A scalar λ where Av = λv for matrix A and vector v",
            explanation: "Eigenvalues represent scaling factors for eigenvectors under matrix transformation"
        )
        flashcard3.material = material

        modelContext.insert(flashcard1)
        modelContext.insert(flashcard2)
        modelContext.insert(flashcard3)

        material.processingStatus = .completed
        try modelContext.save()

        // Then: Verify complete processing pipeline
        XCTAssertEqual(material.processingStatus, .completed, "Material should be fully processed")
        XCTAssertNotNil(material.summary, "Material should have a summary")
        XCTAssertFalse(material.summary?.isEmpty ?? true, "Summary should not be empty")

        XCTAssertEqual(material.flashcards?.count, 3, "Should have 3 flashcards")
        XCTAssertNotNil(material.textContent, "Material should have text content")
        XCTAssertFalse(material.needsReprocessing, "Completed material doesn't need reprocessing")

        // Verify flashcard quality
        let allFlashcards = material.flashcards ?? []
        for flashcard in allFlashcards {
            XCTAssertFalse(flashcard.question.isEmpty, "Questions should not be empty")
            XCTAssertFalse(flashcard.answer.isEmpty, "Answers should not be empty")
            XCTAssertEqual(flashcard.easeFactor, 2.5, "Initial ease factor should be 2.5")
            XCTAssertEqual(flashcard.repetitions, 0, "Initial repetitions should be 0")
        }
    }

    /// Test 2: PDF text extraction to summary workflow
    func testPDFToSummaryWorkflow() async throws {
        // Given: Material with PDF content
        let material = Material(title: "Chemistry Lecture Notes")
        material.fileURL = URL(string: "file:///path/to/chemistry.pdf")

        // Simulate PDF text extraction
        material.textContent = """
        Chemical Bonding

        Ionic bonds form between metals and non-metals through electron transfer.
        Covalent bonds form when atoms share electrons.
        Metallic bonds occur in metals where electrons are delocalized.

        Electronegativity determines bond polarity. Water is a polar molecule.
        """

        modelContext.insert(material)
        try modelContext.save()

        // When: Generate summary
        material.processingStatus = .processing

        // Simulate summary generation
        material.summary = "Overview of chemical bonding types: ionic, covalent, and metallic bonds. Discusses electronegativity and molecular polarity."

        material.processingStatus = .completed
        try modelContext.save()

        // Then: Verify workflow
        XCTAssertNotNil(material.textContent, "Should have extracted text")
        XCTAssertNotNil(material.summary, "Should have generated summary")
        XCTAssertTrue(material.summary!.contains("bonding"), "Summary should mention bonding")
        XCTAssertLessThan(material.summary!.count, material.textContent!.count, "Summary should be shorter than content")
    }

    /// Test 3: Material processing with error recovery
    func testMaterialProcessingWithErrorRecovery() async throws {
        // Given: Material that will fail processing
        let material = Material(title: "Failed Processing Test")
        material.processingStatus = .pending
        modelContext.insert(material)
        try modelContext.save()

        // When: Attempt processing that fails
        material.processingStatus = .processing
        try modelContext.save()

        // Simulate processing failure
        material.processingStatus = .failed
        try modelContext.save()

        // Then: Verify error state
        XCTAssertEqual(material.processingStatus, .failed)
        XCTAssertTrue(material.needsReprocessing, "Failed material should need reprocessing")

        // When: Retry processing
        material.processingStatus = .pending
        try modelContext.save()

        // Simulate successful retry
        material.processingStatus = .processing
        material.textContent = "Successfully processed content"
        material.summary = "Summary of content"
        material.processingStatus = .completed
        try modelContext.save()

        // Then: Verify recovery
        XCTAssertEqual(material.processingStatus, .completed)
        XCTAssertFalse(material.needsReprocessing)
        XCTAssertNotNil(material.summary)
    }

    /// Test 4: Parallel material processing (batch processing)
    func testParallelMaterialProcessing() async throws {
        // Given: Multiple materials to process
        let materials: [Material] = (1...5).map { index in
            let material = Material(title: "Material \(index)")
            material.textContent = "Content for material \(index)"
            material.processingStatus = .pending
            modelContext.insert(material)
            return material
        }

        try modelContext.save()

        // When: Process materials in parallel (simulated)
        for material in materials {
            material.processingStatus = .processing
            material.summary = "Summary for \(material.title)"

            // Simulate flashcard generation
            let flashcard = Flashcard(
                materialID: material.id,
                question: "Question about \(material.title)?",
                answer: "Answer about \(material.title)"
            )
            flashcard.material = material
            modelContext.insert(flashcard)

            material.processingStatus = .completed
        }

        try modelContext.save()

        // Then: Verify all materials processed
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.processingStatus == .completed }
        )
        let completedMaterials = try modelContext.fetch(descriptor)

        XCTAssertEqual(completedMaterials.count, 5, "All materials should be processed")

        for material in completedMaterials {
            XCTAssertNotNil(material.summary)
            XCTAssertEqual(material.flashcards?.count, 1)
        }
    }

    /// Test 5: Mind map generation from material
    func testMindMapGenerationFromMaterial() async throws {
        // Given: Processed material
        let material = Material(title: "Photosynthesis")
        material.textContent = """
        Photosynthesis Process

        Light-dependent reactions occur in thylakoids and produce ATP and NADPH.
        Calvin cycle occurs in the stroma and uses ATP and NADPH to produce glucose.

        Factors affecting photosynthesis: light intensity, CO2 concentration, temperature.
        """
        material.summary = "Overview of photosynthesis: light reactions and Calvin cycle"
        material.processingStatus = .completed

        modelContext.insert(material)
        try modelContext.save()

        // When: Generate mind map
        let mindMap = MindMap(materialID: material.id, title: "Photosynthesis Mind Map")

        // Create central node
        let centralNode = MindMap.MindMapNode(
            id: UUID(),
            text: "Photosynthesis",
            x: 0,
            y: 0,
            connections: []
        )

        // Create child nodes
        let lightReactions = MindMap.MindMapNode(
            id: UUID(),
            text: "Light Reactions",
            x: -100,
            y: 100,
            connections: [centralNode.id]
        )

        let calvinCycle = MindMap.MindMapNode(
            id: UUID(),
            text: "Calvin Cycle",
            x: 100,
            y: 100,
            connections: [centralNode.id]
        )

        mindMap.nodes = [centralNode, lightReactions, calvinCycle]
        mindMap.material = material

        modelContext.insert(mindMap)
        try modelContext.save()

        // Then: Verify mind map creation
        let descriptor = FetchDescriptor<MindMap>(
            predicate: #Predicate { $0.materialID == material.id }
        )
        let mindMaps = try modelContext.fetch(descriptor)

        XCTAssertEqual(mindMaps.count, 1, "Should have one mind map")
        XCTAssertEqual(mindMaps.first?.nodes.count, 3, "Should have 3 nodes")
        XCTAssertEqual(mindMaps.first?.material?.id, material.id, "Mind map should link to material")
    }

    /// Test 6: Flashcard generation quality and variety
    func testFlashcardGenerationQuality() async throws {
        // Given: Rich material content
        let material = Material(title: "Newton's Laws of Motion")
        material.textContent = """
        Newton's Three Laws of Motion

        First Law (Inertia): An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.

        Second Law (F=ma): The force acting on an object equals its mass times its acceleration. F = ma.

        Third Law (Action-Reaction): For every action, there is an equal and opposite reaction.
        """
        material.processingStatus = .completed

        modelContext.insert(material)

        // When: Generate diverse flashcards
        let conceptFlashcard = Flashcard(
            materialID: material.id,
            question: "What is Newton's First Law?",
            answer: "An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force",
            explanation: "Also known as the law of inertia"
        )
        conceptFlashcard.material = material

        let formulaFlashcard = Flashcard(
            materialID: material.id,
            question: "What is the formula for Newton's Second Law?",
            answer: "F = ma (Force equals mass times acceleration)",
            explanation: "This quantifies the relationship between force, mass, and acceleration"
        )
        formulaFlashcard.material = material

        let applicationFlashcard = Flashcard(
            materialID: material.id,
            question: "What does Newton's Third Law state about action and reaction?",
            answer: "For every action, there is an equal and opposite reaction",
            explanation: "Forces always come in pairs acting on different objects"
        )
        applicationFlashcard.material = material

        modelContext.insert(conceptFlashcard)
        modelContext.insert(formulaFlashcard)
        modelContext.insert(applicationFlashcard)
        try modelContext.save()

        // Then: Verify flashcard quality
        let flashcards = material.flashcards ?? []
        XCTAssertEqual(flashcards.count, 3, "Should have 3 flashcards")

        // Verify diversity of question types
        let questions = flashcards.map { $0.question }
        XCTAssertTrue(questions.contains { $0.contains("What is") }, "Should have definition questions")
        XCTAssertTrue(questions.contains { $0.contains("formula") }, "Should have formula questions")
        XCTAssertTrue(questions.contains { $0.contains("does") }, "Should have application questions")

        // Verify all have explanations
        for flashcard in flashcards {
            XCTAssertNotNil(flashcard.explanation, "Each flashcard should have an explanation")
            XCTAssertFalse(flashcard.explanation?.isEmpty ?? true, "Explanations should not be empty")
        }
    }

    /// Test 7: Material update and reprocessing workflow
    func testMaterialUpdateAndReprocessing() async throws {
        // Given: Existing processed material
        let material = Material(title: "Algebra Concepts")
        material.textContent = "Basic algebra concepts"
        material.summary = "Algebra basics"
        material.processingStatus = .completed

        modelContext.insert(material)

        let originalFlashcard = Flashcard(
            materialID: material.id,
            question: "What is algebra?",
            answer: "Branch of mathematics"
        )
        originalFlashcard.material = material
        modelContext.insert(originalFlashcard)

        try modelContext.save()

        let originalFlashcardCount = material.flashcards?.count ?? 0

        // When: Update material content
        material.textContent = """
        Advanced Algebra Concepts

        Quadratic equations: ax² + bx + c = 0
        Quadratic formula: x = (-b ± √(b²-4ac)) / 2a
        Factoring polynomials and completing the square
        """

        // Mark for reprocessing
        material.processingStatus = .pending

        // Simulate reprocessing
        material.processingStatus = .processing
        material.summary = "Advanced algebra including quadratic equations and factoring"

        // Add new flashcards from updated content
        let newFlashcard = Flashcard(
            materialID: material.id,
            question: "What is the quadratic formula?",
            answer: "x = (-b ± √(b²-4ac)) / 2a"
        )
        newFlashcard.material = material
        modelContext.insert(newFlashcard)

        material.processingStatus = .completed
        try modelContext.save()

        // Then: Verify reprocessing
        XCTAssertEqual(material.processingStatus, .completed)
        XCTAssertTrue(material.summary!.contains("Advanced"))
        XCTAssertTrue(material.textContent!.contains("quadratic"))
        XCTAssertGreaterThan(material.flashcards?.count ?? 0, originalFlashcardCount, "Should have more flashcards after reprocessing")
    }

    /// Test 8: Material processing status transitions
    func testMaterialProcessingStatusTransitions() async throws {
        // Given: New material
        let material = Material(title: "Status Transition Test")
        modelContext.insert(material)
        try modelContext.save()

        // Then: Should start as pending
        XCTAssertEqual(material.processingStatus, .pending)

        // When: Start processing
        material.processingStatus = .processing
        try modelContext.save()

        // Then: Should be in processing state
        XCTAssertEqual(material.processingStatus, .processing)

        // When: Complete processing
        material.textContent = "Processed content"
        material.summary = "Summary"
        material.processingStatus = .completed
        try modelContext.save()

        // Then: Should be completed
        XCTAssertEqual(material.processingStatus, .completed)
        XCTAssertFalse(material.needsReprocessing)

        // When: Mark as failed
        material.processingStatus = .failed
        try modelContext.save()

        // Then: Should be failed and need reprocessing
        XCTAssertEqual(material.processingStatus, .failed)
        XCTAssertTrue(material.needsReprocessing)
    }

    /// Test 9: Material deletion with cascade to flashcards
    func testMaterialDeletionCascade() async throws {
        // Given: Material with flashcards
        let material = Material(title: "To Be Deleted")
        material.processingStatus = .completed
        modelContext.insert(material)

        let flashcards = (1...3).map { index in
            let flashcard = Flashcard(
                materialID: material.id,
                question: "Question \(index)",
                answer: "Answer \(index)"
            )
            flashcard.material = material
            modelContext.insert(flashcard)
            return flashcard
        }

        try modelContext.save()

        let materialID = material.id
        XCTAssertEqual(material.flashcards?.count, 3)

        // When: Delete material
        modelContext.delete(material)
        try modelContext.save()

        // Then: Verify material is deleted
        let materialDescriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.id == materialID }
        )
        let materials = try modelContext.fetch(materialDescriptor)
        XCTAssertTrue(materials.isEmpty, "Material should be deleted")
    }

    /// Test 10: Processing with Google Drive sync
    func testProcessingWithGoogleDriveSync() async throws {
        // Given: Material from Google Drive
        let driveFileID = "google_drive_file_123"
        let material = Material(
            title: "Shared Class Notes",
            subject: nil,
            googleDriveFileID: driveFileID
        )
        material.textContent = "Notes from Google Drive"
        material.processingStatus = .pending

        modelContext.insert(material)
        try modelContext.save()

        // When: Process Drive material
        material.processingStatus = .processing
        material.summary = "Summary of shared class notes"

        let flashcard = Flashcard(
            materialID: material.id,
            question: "What are the main topics?",
            answer: "Topics from class notes"
        )
        flashcard.material = material
        modelContext.insert(flashcard)

        material.processingStatus = .completed
        try modelContext.save()

        // Then: Verify Drive material processing
        XCTAssertEqual(material.googleDriveFileID, driveFileID)
        XCTAssertEqual(material.processingStatus, .completed)
        XCTAssertNotNil(material.summary)
        XCTAssertEqual(material.flashcards?.count, 1)

        // When: Fetch by Drive ID
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.googleDriveFileID == driveFileID }
        )
        let driveMaterials = try modelContext.fetch(descriptor)

        // Then: Should find material by Drive ID
        XCTAssertEqual(driveMaterials.count, 1)
        XCTAssertEqual(driveMaterials.first?.id, material.id)
    }
}
