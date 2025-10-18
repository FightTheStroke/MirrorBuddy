//
//  StudyViewTests.swift
//  MirrorBuddyTests
//
//  Task 121.2: Navigation and state management tests for StudyView
//  Tests voice command integration, material filtering, and navigation triggers
//

@testable import MirrorBuddy
import SwiftData
import XCTest

@MainActor
final class StudyViewTests: XCTestCase {
    var mockModelContext: ModelContext!
    var mockVoiceCommandHandler: AppVoiceCommandHandler!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([
            Material.self,
            Flashcard.self,
            MindMap.self,
            MindMapNode.self,
            SubjectEntity.self
        ])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        mockModelContext = ModelContext(container)

        // Initialize voice command handler
        mockVoiceCommandHandler = AppVoiceCommandHandler.shared
        mockVoiceCommandHandler.studyMode = nil
    }

    override func tearDown() async throws {
        mockVoiceCommandHandler.studyMode = nil
        mockModelContext = nil
        mockVoiceCommandHandler = nil
        try await super.tearDown()
    }

    // MARK: - Voice Command Handler Tests

    func testStudyModeInitialState() {
        XCTAssertNil(mockVoiceCommandHandler.studyMode)
    }

    func testStudyModeFlashcards() {
        mockVoiceCommandHandler.studyMode = .flashcards
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .flashcards)
    }

    func testStudyModeMindMap() {
        mockVoiceCommandHandler.studyMode = .mindMap
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .mindMap)
    }

    func testStudyModeGeneral() {
        mockVoiceCommandHandler.studyMode = .general
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .general)
    }

    func testStudyModeReset() {
        mockVoiceCommandHandler.studyMode = .flashcards
        XCTAssertNotNil(mockVoiceCommandHandler.studyMode)

        mockVoiceCommandHandler.studyMode = nil
        XCTAssertNil(mockVoiceCommandHandler.studyMode)
    }

    func testStudyModeTransitions() {
        mockVoiceCommandHandler.studyMode = .flashcards
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .flashcards)

        mockVoiceCommandHandler.studyMode = .mindMap
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .mindMap)

        mockVoiceCommandHandler.studyMode = .general
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .general)
    }

    // MARK: - Material Filtering Tests

    func testMaterialsWithFlashcards() async throws {
        // Create material with flashcards
        let material = Material(title: "Test Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)

        let flashcard = Flashcard(
            materialID: material.id,
            question: "Question",
            answer: "Answer",
            explanation: nil
        )
        flashcard.material = material
        mockModelContext.insert(flashcard)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Filter materials with flashcards
        let materialsWithFlashcards = materials.filter { !($0.flashcards?.isEmpty ?? true) }

        XCTAssertEqual(materialsWithFlashcards.count, 1)
        XCTAssertEqual(materialsWithFlashcards.first?.title, "Test Material")
    }

    func testMaterialsWithoutFlashcards() async throws {
        // Create material without flashcards
        let material = Material(title: "Empty Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Filter materials with flashcards
        let materialsWithFlashcards = materials.filter { !($0.flashcards?.isEmpty ?? true) }

        XCTAssertTrue(materialsWithFlashcards.isEmpty)
    }

    func testMaterialsWithMindMap() async throws {
        // Create material with mind map
        let material = Material(title: "Test Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)

        let mindMap = MindMap(materialID: material.id, prompt: nil)
        mindMap.material = material
        mockModelContext.insert(mindMap)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Filter materials with mind maps
        let materialsWithMindMaps = materials.filter { $0.mindMap != nil }

        XCTAssertEqual(materialsWithMindMaps.count, 1)
        XCTAssertEqual(materialsWithMindMaps.first?.title, "Test Material")
    }

    func testMaterialsWithoutMindMap() async throws {
        // Create material without mind map
        let material = Material(title: "Empty Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Filter materials with mind maps
        let materialsWithMindMaps = materials.filter { $0.mindMap != nil }

        XCTAssertTrue(materialsWithMindMaps.isEmpty)
    }

    func testMultipleMaterialsWithMixedContent() async throws {
        // Material 1: Flashcards only
        let material1 = Material(title: "Flashcard Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material1)
        let flashcard1 = Flashcard(materialID: material1.id, question: "Q1", answer: "A1")
        flashcard1.material = material1
        mockModelContext.insert(flashcard1)

        // Material 2: Mind map only
        let material2 = Material(title: "Mind Map Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material2)
        let mindMap2 = MindMap(materialID: material2.id, prompt: nil)
        mindMap2.material = material2
        mockModelContext.insert(mindMap2)

        // Material 3: Both flashcards and mind map
        let material3 = Material(title: "Complete Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material3)
        let flashcard3 = Flashcard(materialID: material3.id, question: "Q3", answer: "A3")
        flashcard3.material = material3
        mockModelContext.insert(flashcard3)
        let mindMap3 = MindMap(materialID: material3.id, prompt: nil)
        mindMap3.material = material3
        mockModelContext.insert(mindMap3)

        // Material 4: Empty
        let material4 = Material(title: "Empty Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material4)

        try mockModelContext.save()

        // Query all materials
        let descriptor = FetchDescriptor<Material>()
        let allMaterials = try mockModelContext.fetch(descriptor)

        // Filter flashcard materials
        let flashcardMaterials = allMaterials.filter { !($0.flashcards?.isEmpty ?? true) }
        XCTAssertEqual(flashcardMaterials.count, 2) // material1 and material3

        // Filter mind map materials
        let mindMapMaterials = allMaterials.filter { $0.mindMap != nil }
        XCTAssertEqual(mindMapMaterials.count, 2) // material2 and material3
    }

    // MARK: - Voice Command Auto-Selection Tests

    func testFlashcardModeAutoSelection() async throws {
        // Create materials with flashcards
        let material = Material(title: "Flashcard Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)

        let flashcard = Flashcard(materialID: material.id, question: "Question", answer: "Answer")
        flashcard.material = material
        mockModelContext.insert(flashcard)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Simulate voice command triggering flashcard mode
        mockVoiceCommandHandler.studyMode = .flashcards

        // Find first material with flashcards (simulating view logic)
        let firstFlashcardMaterial = materials.first { !($0.flashcards?.isEmpty ?? true) }

        XCTAssertNotNil(firstFlashcardMaterial)
        XCTAssertEqual(firstFlashcardMaterial?.title, "Flashcard Material")
    }

    func testMindMapModeAutoSelection() async throws {
        // Create materials with mind map
        let material = Material(title: "Mind Map Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)

        let mindMap = MindMap(materialID: material.id, prompt: nil)
        mindMap.material = material
        mockModelContext.insert(mindMap)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Simulate voice command triggering mind map mode
        mockVoiceCommandHandler.studyMode = .mindMap

        // Find first material with mind map (simulating view logic)
        let firstMindMapMaterial = materials.first { $0.mindMap != nil }

        XCTAssertNotNil(firstMindMapMaterial)
        XCTAssertEqual(firstMindMapMaterial?.title, "Mind Map Material")
    }

    func testGeneralModeNoAutoSelection() async throws {
        // Create materials
        let material = Material(title: "General Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)
        try mockModelContext.save()

        // Simulate voice command triggering general mode
        mockVoiceCommandHandler.studyMode = .general

        // In general mode, no auto-selection should occur
        // This is just verifying the mode is set correctly
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .general)
    }

    func testNoFlashcardsAvailable() async throws {
        // Create material WITHOUT flashcards
        let material = Material(title: "Empty Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Simulate voice command triggering flashcard mode
        mockVoiceCommandHandler.studyMode = .flashcards

        // Try to find material with flashcards
        let firstFlashcardMaterial = materials.first { !($0.flashcards?.isEmpty ?? true) }

        // Should be nil (no flashcards available)
        XCTAssertNil(firstFlashcardMaterial)
    }

    func testNoMindMapsAvailable() async throws {
        // Create material WITHOUT mind map
        let material = Material(title: "Empty Material", subject: nil, googleDriveFileID: nil)
        mockModelContext.insert(material)
        try mockModelContext.save()

        // Query materials
        let descriptor = FetchDescriptor<Material>()
        let materials = try mockModelContext.fetch(descriptor)

        // Simulate voice command triggering mind map mode
        mockVoiceCommandHandler.studyMode = .mindMap

        // Try to find material with mind map
        let firstMindMapMaterial = materials.first { $0.mindMap != nil }

        // Should be nil (no mind maps available)
        XCTAssertNil(firstMindMapMaterial)
    }

    // MARK: - State Consistency Tests

    func testStudyModeConsumptionPattern() {
        // Initial state
        XCTAssertNil(mockVoiceCommandHandler.studyMode)

        // Set mode
        mockVoiceCommandHandler.studyMode = .flashcards
        XCTAssertNotNil(mockVoiceCommandHandler.studyMode)

        // Consume mode (simulating view's onChange)
        let consumedMode = mockVoiceCommandHandler.studyMode
        XCTAssertEqual(consumedMode, .flashcards)

        // Reset after consumption
        mockVoiceCommandHandler.studyMode = nil
        XCTAssertNil(mockVoiceCommandHandler.studyMode)
    }

    func testMultipleStudyModeChanges() {
        // Cycle through all modes
        mockVoiceCommandHandler.studyMode = .flashcards
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .flashcards)
        mockVoiceCommandHandler.studyMode = nil

        mockVoiceCommandHandler.studyMode = .mindMap
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .mindMap)
        mockVoiceCommandHandler.studyMode = nil

        mockVoiceCommandHandler.studyMode = .general
        XCTAssertEqual(mockVoiceCommandHandler.studyMode, .general)
        mockVoiceCommandHandler.studyMode = nil

        // Final state should be nil
        XCTAssertNil(mockVoiceCommandHandler.studyMode)
    }
}
