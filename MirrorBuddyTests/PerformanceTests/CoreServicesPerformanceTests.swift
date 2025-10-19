//
//  CoreServicesPerformanceTests.swift
//  MirrorBuddyTests
//
//  Task 121.4: Performance Benchmarks for Core Services
//  Measuring performance of critical operations
//

import XCTest
import SwiftData
@testable import MirrorBuddy

/// Performance benchmarks for core MirrorBuddy services
@MainActor
final class CoreServicesPerformanceTests: XCTestCase {

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

    // MARK: - Test Data Generators

    /// Generate large test document for processing benchmarks
    private func generateLargeTestDocument(wordCount: Int) -> String {
        let words = [
            "mathematics", "equation", "variable", "function", "algebra",
            "geometry", "calculus", "theorem", "proof", "formula",
            "polynomial", "quadratic", "linear", "derivative", "integral"
        ]

        var document = ""
        for i in 0..<wordCount {
            document += words[i % words.count]
            if i % 20 == 19 {
                document += ".\n"
            } else {
                document += " "
            }
        }
        return document
    }

    /// Create test material with specified word count
    private func createTestMaterial(wordCount: Int) -> Material {
        let material = Material(title: "Test Material")
        material.textContent = generateLargeTestDocument(wordCount: wordCount)
        material.processingStatus = .completed
        return material
    }

    /// Generate test voice commands
    private func generateTestCommands(count: Int) -> [String] {
        let templates = [
            "vai alla dashboard",
            "mostra i miei materiali",
            "apri il calendario",
            "cerca equazioni quadratiche",
            "crea una nuova flashcard",
            "torna indietro",
            "chiudi questa schermata",
            "aggiungi un nuovo compito"
        ]

        return (0..<count).map { i in
            templates[i % templates.count]
        }
    }

    // MARK: - Performance Test 1: Material Text Extraction

    /// Benchmark text extraction and keyword processing from large materials
    /// Target: < 500ms for 10,000 words
    func testMaterialTextExtractionPerformance() {
        let largeDocument = generateLargeTestDocument(wordCount: 10_000)

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            // Simulate keyword extraction (simple word frequency)
            let words = largeDocument.lowercased()
                .components(separatedBy: .whitespacesAndNewlines)
                .filter { $0.count > 3 }

            var wordFrequency: [String: Int] = [:]
            for word in words {
                wordFrequency[word, default: 0] += 1
            }

            let keywords = wordFrequency.sorted { $0.value > $1.value }
                .prefix(20)
                .map { $0.key }

            XCTAssertFalse(keywords.isEmpty, "Should extract keywords")
            XCTAssertLessThanOrEqual(keywords.count, 20, "Should limit to 20 keywords")
        }
    }

    // MARK: - Performance Test 2: Flashcard Generation

    /// Benchmark flashcard generation from material
    /// Target: < 1 second for 1000 words, generating 10 flashcards
    func testFlashcardGenerationPerformance() throws {
        let material = createTestMaterial(wordCount: 1000)
        modelContext.insert(material)

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            // Simulate flashcard generation
            let flashcards = (0..<10).map { i in
                Flashcard(
                    materialID: material.id,
                    question: "Question \(i) from material?",
                    answer: "Answer \(i) based on content",
                    explanation: "Explanation for flashcard \(i)"
                )
            }

            flashcards.forEach { flashcard in
                flashcard.material = material
                modelContext.insert(flashcard)
            }

            // Save to context
            do {
                try modelContext.save()
            } catch {
                XCTFail("Failed to save flashcards: \(error)")
            }

            XCTAssertEqual(flashcards.count, 10, "Should generate 10 flashcards")

            // Cleanup for next iteration
            flashcards.forEach { modelContext.delete($0) }
        }
    }

    // MARK: - Performance Test 3: Voice Command Intent Detection

    /// Benchmark voice command parsing and intent detection
    /// Target: < 10ms per command
    func testVoiceCommandIntentDetectionPerformance() {
        let commands = generateTestCommands(count: 100)
        let voiceManager = UnifiedVoiceManager.shared

        measure(metrics: [XCTClockMetric()]) {
            var commandCount = 0
            var conversationCount = 0

            for command in commands {
                let intent = voiceManager.detectIntent(from: command)
                switch intent {
                case .command:
                    commandCount += 1
                case .conversation:
                    conversationCount += 1
                }
            }

            XCTAssertGreaterThan(commandCount + conversationCount, 0, "Should detect some intents")
        }
    }

    // MARK: - Performance Test 4: Database Query Performance

    /// Benchmark common database queries
    /// Target: < 50ms for fetching 100 materials
    func testDatabaseQueryPerformance() throws {
        // Setup: Insert 100 test materials
        let materials = (0..<100).map { i in
            let material = Material(title: "Material \(i)")
            material.textContent = "Content for material \(i)"
            material.processingStatus = .completed
            return material
        }

        materials.forEach { modelContext.insert($0) }
        try modelContext.save()

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            // Fetch all materials
            let descriptor = FetchDescriptor<Material>(
                sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )

            do {
                let fetchedMaterials = try modelContext.fetch(descriptor)
                XCTAssertEqual(fetchedMaterials.count, 100, "Should fetch 100 materials")
            } catch {
                XCTFail("Failed to fetch materials: \(error)")
            }
        }

        // Cleanup
        materials.forEach { modelContext.delete($0) }
        try modelContext.save()
    }

    // MARK: - Performance Test 5: Flashcard Review Algorithm (SM-2)

    /// Benchmark SM-2 algorithm performance for flashcard reviews
    /// Target: < 1ms per review calculation
    func testFlashcardReviewAlgorithmPerformance() throws {
        let material = Material(title: "Test Material")
        modelContext.insert(material)

        let flashcard = Flashcard(
            materialID: material.id,
            question: "Test Question",
            answer: "Test Answer"
        )
        flashcard.material = material
        modelContext.insert(flashcard)
        try modelContext.save()

        measure(metrics: [XCTClockMetric()]) {
            // Simulate 1000 review cycles
            for i in 0..<1000 {
                let quality = (i % 6) // Cycle through 0-5 quality scores
                flashcard.review(quality: quality)
            }

            XCTAssertNotNil(flashcard.lastReviewedAt, "Should have review timestamp")
        }

        // Cleanup
        modelContext.delete(flashcard)
        modelContext.delete(material)
        try modelContext.save()
    }

    // MARK: - Performance Test 6: Bulk Material Creation

    /// Benchmark bulk material creation and insertion
    /// Target: < 2 seconds for 1000 materials
    func testBulkMaterialCreationPerformance() {
        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            let materials = (0..<1000).map { i in
                Material(title: "Bulk Material \(i)")
            }

            materials.forEach { modelContext.insert($0) }

            do {
                try modelContext.save()
            } catch {
                XCTFail("Failed to save materials: \(error)")
            }

            XCTAssertEqual(materials.count, 1000, "Should create 1000 materials")

            // Cleanup
            materials.forEach { modelContext.delete($0) }
            do {
                try modelContext.save()
            } catch {
                XCTFail("Failed to cleanup: \(error)")
            }
        }
    }

    // MARK: - Performance Test 7: Complex Query with Relationships

    /// Benchmark complex queries involving relationships
    /// Target: < 100ms for querying materials with flashcards
    func testComplexRelationshipQueryPerformance() throws {
        // Setup: Create materials with flashcards
        let materials = (0..<20).map { i in
            let material = Material(title: "Material \(i)")
            material.processingStatus = .completed

            let flashcards = (0..<10).map { j in
                let flashcard = Flashcard(
                    materialID: material.id,
                    question: "Question \(j)",
                    answer: "Answer \(j)"
                )
                flashcard.material = material
                return flashcard
            }

            modelContext.insert(material)
            flashcards.forEach { modelContext.insert($0) }

            return material
        }

        try modelContext.save()

        measure(metrics: [XCTClockMetric()]) {
            // Fetch materials with flashcard count
            let descriptor = FetchDescriptor<Material>()

            do {
                let fetchedMaterials = try modelContext.fetch(descriptor)

                var totalFlashcards = 0
                for material in fetchedMaterials {
                    totalFlashcards += material.flashcards?.count ?? 0
                }

                XCTAssertGreaterThan(totalFlashcards, 0, "Should have flashcards")
            } catch {
                XCTFail("Failed to fetch: \(error)")
            }
        }

        // Cleanup
        let allFlashcards = try modelContext.fetch(FetchDescriptor<Flashcard>())
        allFlashcards.forEach { modelContext.delete($0) }
        materials.forEach { modelContext.delete($0) }
        try modelContext.save()
    }

    // MARK: - Performance Test 8: Material Access Timestamp Update

    /// Benchmark material access tracking performance
    /// Target: < 5ms for updating access timestamp
    func testMaterialAccessTrackingPerformance() throws {
        let material = Material(title: "Access Test Material")
        modelContext.insert(material)
        try modelContext.save()

        measure(metrics: [XCTClockMetric()]) {
            // Update access timestamp 100 times
            for _ in 0..<100 {
                material.markAccessed()
            }

            XCTAssertNotNil(material.lastAccessedAt, "Should have access timestamp")
        }

        // Cleanup
        modelContext.delete(material)
        try modelContext.save()
    }
}
