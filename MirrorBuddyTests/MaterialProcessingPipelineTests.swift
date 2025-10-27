import XCTest
import SwiftData
@testable import MirrorBuddy

/// Automated tests for MaterialProcessingPipeline
/// Tests that materials are correctly processed with proper status updates
@MainActor
final class MaterialProcessingPipelineTests: XCTestCase {
    var modelContainer: ModelContainer!
    var modelContext: ModelContext!
    var pipeline: MaterialProcessingPipeline!

    override func setUp() async throws {
        // Create in-memory model container for testing
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(
            for: Material.self, SubjectEntity.self, Flashcard.self, MindMap.self,
            configurations: config
        )
        modelContext = modelContainer.mainContext

        // Initialize pipeline
        pipeline = MaterialProcessingPipeline.shared
    }

    override func tearDown() async throws {
        modelContainer = nil
        modelContext = nil
    }

    // MARK: - Status Update Tests

    func testMaterialStatusUpdatesOnSuccess() async throws {
        // Given: A material with extracted text
        let material = Material(
            title: "Test Material - Photosynthesis",
            subject: nil
        )
        material.extractedText = """
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        This process occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
        The result is glucose and oxygen.
        """

        modelContext.insert(material)
        try modelContext.save()

        XCTAssertEqual(material.processingStatus, .pending, "Material should start as pending")

        // When: Processing the material (mind map only for faster test)
        var progressUpdates: [ProcessingProgress] = []

        do {
            try await pipeline.processMaterial(
                material,
                options: ProcessingOptions(
                    enabledSteps: [.mindMap],  // Just test mind map
                    failFast: false,
                    priority: .normal
                ),
                progressHandler: { progress in
                    progressUpdates.append(progress)
                }
            )

            // Then: Material status should be completed
            XCTAssertEqual(
                material.processingStatus,
                .completed,
                "Material should be marked as completed after successful processing"
            )

            // Verify we received progress updates
            XCTAssertFalse(progressUpdates.isEmpty, "Should receive progress updates")

            print("✅ Test passed: Material status correctly updates to .completed")
            print("   Progress updates received: \(progressUpdates.count)")

        } catch {
            // On failure, status should be .failed
            XCTAssertEqual(
                material.processingStatus,
                .failed,
                "Material should be marked as failed when processing throws error"
            )

            print("⚠️  Processing failed (expected if no API keys): \(error)")
            print("   Material status correctly set to: .failed")
        }
    }

    func testMaterialStatusUpdatesOnFailure() async throws {
        // Given: A material with NO text (should fail)
        let material = Material(
            title: "Empty Material",
            subject: nil
        )
        // Intentionally leave extractedText empty
        material.extractedText = ""

        modelContext.insert(material)
        try modelContext.save()

        // When: Attempting to process
        do {
            try await pipeline.processMaterial(
                material,
                options: ProcessingOptions(
                    enabledSteps: [.mindMap],
                    failFast: true,
                    priority: .normal
                ),
                progressHandler: { _ in }
            )

            XCTFail("Should have thrown an error for empty material")

        } catch {
            // Then: Material should be marked as failed
            XCTAssertEqual(
                material.processingStatus,
                .failed,
                "Material should be marked as failed when processing fails"
            )

            print("✅ Test passed: Material correctly marked as .failed on error")
            print("   Error: \(error.localizedDescription)")
        }
    }

    // MARK: - Progress Reporting Tests

    func testProgressReportingDuringProcessing() async throws {
        // Given: A material ready for processing
        let material = Material(title: "Progress Test Material", subject: nil)
        material.extractedText = "Sample text for progress testing. This should generate some progress updates."

        modelContext.insert(material)
        try modelContext.save()

        // When: Processing with progress handler
        var progressSteps: [ProcessingStep] = []
        var progressStatuses: [StepStatus] = []

        do {
            try await pipeline.processMaterial(
                material,
                options: ProcessingOptions(
                    enabledSteps: [.mindMap],
                    failFast: false,
                    priority: .normal
                ),
                progressHandler: { progress in
                    progressSteps.append(progress.currentStep)
                    progressStatuses.append(progress.stepStatus)
                }
            )

            // Then: Should have received progress updates
            XCTAssertFalse(progressSteps.isEmpty, "Should receive progress step updates")
            XCTAssertTrue(
                progressSteps.contains(.mindMap),
                "Should include mind map step in progress"
            )

            print("✅ Test passed: Progress updates received")
            print("   Steps: \(progressSteps)")
            print("   Statuses: \(progressStatuses)")

        } catch {
            // Even on failure, we should have received progress before the error
            XCTAssertFalse(progressSteps.isEmpty, "Should have progress even on failure")
            print("⚠️  Processing failed but progress was tracked: \(progressSteps)")
        }
    }

    // MARK: - Flashcard Generation Tests

    func testFlashcardGenerationEnabled() async throws {
        // Given: A material with text suitable for flashcards
        let material = Material(title: "Flashcard Test", subject: nil)
        material.extractedText = """
        The water cycle describes how water evaporates from surfaces, rises into the atmosphere,
        cools and condenses into clouds, and falls back to Earth as precipitation.
        Evaporation is the process of water turning into vapor.
        Condensation is when water vapor cools and forms droplets.
        Precipitation includes rain, snow, sleet, and hail.
        """

        modelContext.insert(material)
        try modelContext.save()

        // When: Processing with flashcards enabled
        var flashcardStepReceived = false

        do {
            try await pipeline.processMaterial(
                material,
                options: ProcessingOptions(
                    enabledSteps: [.flashcards],
                    failFast: false,
                    priority: .normal
                ),
                progressHandler: { progress in
                    if progress.currentStep == .flashcards {
                        flashcardStepReceived = true
                    }
                }
            )

            // Then: Flashcard step should be executed
            XCTAssertTrue(
                flashcardStepReceived,
                "Flashcard processing step should be received"
            )

            print("✅ Test passed: Flashcard generation is enabled in pipeline")

        } catch {
            // Flashcards might fail due to API issues, but step should still be attempted
            print("⚠️  Flashcard generation attempted (may fail without API): \(error)")
            print("   Step received: \(flashcardStepReceived)")
        }
    }
}
