import Foundation
import SwiftData
import os.log

/// Parallel material processing pipeline coordinator (Task 25)
@MainActor
final class MaterialProcessingPipeline {
    // MARK: - Singleton

    static let shared = MaterialProcessingPipeline()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ProcessingPipeline")

    // MARK: - Dependencies (Subtask 25.1)

    private let summaryService = SummaryGenerationService.shared
    private let mindMapService = MindMapGenerationService.shared
    // private let imageService = ImageGenerationService.shared // TODO: Implement in Task 22
    private let flashcardService = FlashcardGenerationService.shared
    // private let explanationService = ExplanationGenerationService.shared // TODO: Implement in Task 24

    // MARK: - State (Subtask 25.3)

    private var activePipelines: [UUID: PipelineExecution] = [:]
    private var processingQueue: [ProcessingJob] = []
    private var isProcessingQueue = false

    // MARK: - Configuration

    private let maxConcurrentOperations = 3
    private let backgroundProcessingIdentifier = "com.mirrorbuddy.material-processing"

    private init() {}

    // MARK: - Public API (Subtask 25.2)

    /// Process a single material through the complete pipeline
    func processMaterial(
        _ material: Material,
        options: ProcessingOptions,
        progressHandler: @escaping (ProcessingProgress) -> Void
    ) async throws {
        let execution = PipelineExecution(
            id: UUID(),
            material: material,
            options: options,
            progressHandler: progressHandler
        )

        activePipelines[execution.id] = execution
        defer { activePipelines.removeValue(forKey: execution.id) }

        logger.info("Starting pipeline for material: \(material.title)")

        do {
            try await executePipeline(execution)
            logger.info("Pipeline completed for material: \(material.title)")
        } catch {
            logger.error("Pipeline failed for material: \(material.title) - \(error.localizedDescription)")
            throw error
        }
    }

    /// Process multiple materials with queue management (Subtask 25.2)
    func processMaterials(
        _ materials: [Material],
        options: ProcessingOptions,
        progressHandler: @escaping (BatchProgress) -> Void
    ) async throws {
        logger.info("Starting batch processing for \(materials.count) materials")

        var completed = 0
        var failed = 0
        var errors: [MaterialProcessingError] = []

        // Create processing jobs
        let jobs = materials.map { material in
            ProcessingJob(
                material: material,
                options: options
            )
        }

        // Process with controlled concurrency (Subtask 25.2)
        try await withThrowingTaskGroup(of: ProcessingResult.self) { group in
            var iterator = jobs.makeIterator()
            var activeTasks = 0

            // Initial batch
            for _ in 0..<min(maxConcurrentOperations, jobs.count) {
                if let job = iterator.next() {
                    group.addTask {
                        await self.processJob(job)
                    }
                    activeTasks += 1
                }
            }

            // Process results and add new tasks
            for try await result in group {
                activeTasks -= 1

                switch result {
                case .success:
                    completed += 1
                case .failure(let error):
                    failed += 1
                    errors.append(error)
                }

                // Report progress (Subtask 25.3)
                let progress = BatchProgress(
                    total: materials.count,
                    completed: completed,
                    failed: failed,
                    errors: errors
                )
                progressHandler(progress)

                // Add next task if available
                if let job = iterator.next() {
                    group.addTask {
                        await self.processJob(job)
                    }
                    activeTasks += 1
                }
            }
        }

        logger.info("Batch processing completed. Success: \(completed), Failed: \(failed)")
    }

    // MARK: - Pipeline Execution (Subtask 25.2)

    private func executePipeline(_ execution: PipelineExecution) async throws {
        let material = execution.material
        let options = execution.options

        var completedSteps = 0
        let totalSteps = options.enabledSteps.count

        // Helper to report progress
        func reportProgress(_ step: ProcessingStep, status: StepStatus) {
            if status == .completed {
                completedSteps += 1
            }

            let progress = ProcessingProgress(
                currentStep: step,
                stepStatus: status,
                completedSteps: completedSteps,
                totalSteps: totalSteps
            )
            execution.progressHandler(progress)
        }

        // Parallel processing of independent tasks (Subtask 25.2)
        try await withThrowingTaskGroup(of: Void.self) { group in
            // Summary generation
            if options.enabledSteps.contains(.summary) {
                group.addTask {
                    reportProgress(.summary, status: .inProgress)
                    do {
                        _ = try await self.summaryService.generateSummary(for: material.title, materialID: material.id)
                        reportProgress(.summary, status: .completed)
                    } catch {
                        reportProgress(.summary, status: .failed)
                        throw MaterialProcessingError.summaryFailed(error)
                    }
                }
            }

            // Flashcard generation (depends on content)
            if options.enabledSteps.contains(.flashcards) {
                group.addTask {
                    reportProgress(.flashcards, status: .inProgress)
                    do {
                        _ = try await self.flashcardService.generateFlashcards(from: material.title, materialID: material.id)
                        reportProgress(.flashcards, status: .completed)
                    } catch {
                        reportProgress(.flashcards, status: .failed)
                        throw MaterialProcessingError.flashcardsFailed(error)
                    }
                }
            }

            // Explanation generation - TODO: Implement in Task 24
            // if options.enabledSteps.contains(.explanations) {
            //     group.addTask {
            //         reportProgress(.explanations, status: .inProgress)
            //         do {
            //             _ = try await self.explanationService.generateExplanations(for: material)
            //             reportProgress(.explanations, status: .completed)
            //         } catch {
            //             reportProgress(.explanations, status: .failed)
            //             throw MaterialProcessingError.explanationsFailed(error)
            //         }
            //     }
            // }

            // Wait for first batch to complete
            try await group.waitForAll()
        }

        // Sequential processing for dependent tasks

        // Mind map (depends on content understanding)
        if options.enabledSteps.contains(.mindMap) {
            reportProgress(.mindMap, status: .inProgress)
            do {
                _ = try await mindMapService.generateMindMap(from: material.title, materialID: material.id)
                reportProgress(.mindMap, status: .completed)
            } catch {
                reportProgress(.mindMap, status: .failed)
                if options.failFast {
                    throw MaterialProcessingError.mindMapFailed(error)
                }
            }
        }

        // Image generation - TODO: Implement in Task 22
        // if options.enabledSteps.contains(.images), let mindMap = material.mindMap {
        //     reportProgress(.images, status: .inProgress)
        //     do {
        //         try await imageService.generateImagesForMindMap(mindMap, material: material)
        //         reportProgress(.images, status: .completed)
        //     } catch {
        //         reportProgress(.images, status: .failed)
        //         if options.failFast {
        //             throw MaterialProcessingError.imagesFailed(error)
        //         }
        //     }
        // }
    }

    private func processJob(_ job: ProcessingJob) async -> ProcessingResult {
        do {
            try await processMaterial(job.material, options: job.options) { _ in }
            return .success(job.material)
        } catch {
            return .failure(MaterialProcessingError.processingFailed(job.material.id, error))
        }
    }

    // MARK: - Background Processing (Subtask 25.4)

    /// Schedule background processing for pending materials
    func scheduleBackgroundProcessing(for materials: [Material]) {
        logger.info("Scheduling background processing for \(materials.count) materials")

        // Add to queue
        let jobs = materials.map { material in
            ProcessingJob(
                material: material,
                options: ProcessingOptions(
                    enabledSteps: [.summary, .flashcards, .mindMap],
                    failFast: false
                )
            )
        }

        processingQueue.append(contentsOf: jobs)

        // Start processing if not already running
        if !isProcessingQueue {
            _Concurrency.Task { [weak self] in
                await self?.processQueue()
            }
        }
    }

    private func processQueue() async {
        guard !isProcessingQueue else { return }
        isProcessingQueue = true
        defer { isProcessingQueue = false }

        logger.info("Processing queue with \(self.processingQueue.count) jobs")

        while !self.processingQueue.isEmpty {
            let batch = Array(self.processingQueue.prefix(maxConcurrentOperations))
            self.processingQueue.removeFirst(min(maxConcurrentOperations, self.processingQueue.count))

            await withTaskGroup(of: Void.self) { group in
                for job in batch {
                    group.addTask {
                        _ = await self.processJob(job)
                    }
                }
            }
        }

        self.logger.info("Queue processing completed")
    }

    // MARK: - Error Recovery (Subtask 25.4)

    /// Retry failed processing jobs
    func retryFailedMaterials(
        _ materials: [Material],
        options: ProcessingOptions
    ) async throws {
        logger.info("Retrying \(materials.count) failed materials")

        try await processMaterials(materials, options: options) { [self] progress in
            self.logger.debug("Retry progress: \(progress.completed)/\(progress.total)")
        }
    }

    /// Cancel all active processing
    func cancelAllProcessing() {
        logger.warning("Cancelling all active processing")
        activePipelines.removeAll()
        processingQueue.removeAll()
    }
}

// MARK: - Models (Subtask 25.1)

/// Processing step types
enum ProcessingStep: String, CaseIterable {
    case summary
    case mindMap
    case images
    case flashcards
    case explanations

    var displayName: String {
        switch self {
        case .summary: return "Summary Generation"
        case .mindMap: return "Mind Map Creation"
        case .images: return "Image Generation"
        case .flashcards: return "Flashcard Creation"
        case .explanations: return "Simplified Explanations"
        }
    }
}

/// Step status
enum StepStatus {
    case pending
    case inProgress
    case completed
    case failed
}

/// Processing options
struct ProcessingOptions {
    var enabledSteps: Set<ProcessingStep>
    var failFast: Bool
    var priority: Priority

    enum Priority {
        case low
        case normal
        case high
    }

    init(
        enabledSteps: Set<ProcessingStep> = Set(ProcessingStep.allCases),
        failFast: Bool = false,
        priority: Priority = .normal
    ) {
        self.enabledSteps = enabledSteps
        self.failFast = failFast
        self.priority = priority
    }
}

/// Progress tracking (Subtask 25.3)
struct ProcessingProgress {
    let currentStep: ProcessingStep
    let stepStatus: StepStatus
    let completedSteps: Int
    let totalSteps: Int

    var percentComplete: Double {
        guard totalSteps > 0 else { return 0 }
        return Double(completedSteps) / Double(totalSteps)
    }
}

/// Batch progress
struct BatchProgress {
    let total: Int
    let completed: Int
    let failed: Int
    let errors: [MaterialProcessingError]

    var percentComplete: Double {
        guard total > 0 else { return 0 }
        return Double(completed + failed) / Double(total)
    }
}

/// Pipeline execution context
private struct PipelineExecution {
    let id: UUID
    let material: Material
    let options: ProcessingOptions
    let progressHandler: (ProcessingProgress) -> Void
}

/// Processing job
private struct ProcessingJob {
    let material: Material
    let options: ProcessingOptions
}

/// Processing result
private enum ProcessingResult {
    case success(Material)
    case failure(MaterialProcessingError)
}

// MARK: - Errors (Subtask 25.4)

enum MaterialProcessingError: LocalizedError {
    case summaryFailed(Error)
    case mindMapFailed(Error)
    case imagesFailed(Error)
    case flashcardsFailed(Error)
    case explanationsFailed(Error)
    case processingFailed(UUID, Error)
    case cancelled

    var errorDescription: String? {
        switch self {
        case .summaryFailed(let error):
            return "Summary generation failed: \(error.localizedDescription)"
        case .mindMapFailed(let error):
            return "Mind map generation failed: \(error.localizedDescription)"
        case .imagesFailed(let error):
            return "Image generation failed: \(error.localizedDescription)"
        case .flashcardsFailed(let error):
            return "Flashcard generation failed: \(error.localizedDescription)"
        case .explanationsFailed(let error):
            return "Explanation generation failed: \(error.localizedDescription)"
        case .processingFailed(let id, let error):
            return "Processing failed for material \(id): \(error.localizedDescription)"
        case .cancelled:
            return "Processing was cancelled"
        }
    }
}
