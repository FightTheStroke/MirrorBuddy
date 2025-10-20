//
//  LessonRecordingService.swift
//  MirrorBuddy
//
//  Service for managing lesson recordings with segmented transcription (Task 129)
//  Integrates: ambient recording, chunked Whisper transcription, summary generation, and mind map creation
//

import AVFoundation
import Combine
import Foundation
import os.log
import SwiftData

/// Service for managing complete lesson recording lifecycle
@MainActor
final class LessonRecordingService: ObservableObject {
    static let shared = LessonRecordingService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "LessonRecording")

    // MARK: - Published State

    @Published var currentRecording: LessonRecording?
    @Published var isRecording: Bool = false
    @Published var recordingDuration: TimeInterval = 0
    @Published var storageAvailable: Int64 = 0
    @Published var estimatedStorageNeeded: Int64 = 0

    // MARK: - Dependencies

    private let extendedRecorder = ExtendedVoiceRecordingService.shared
    private let segmentationService = AudioSegmentationService.shared
    private let optimizerService = WhisperAudioOptimizer.shared
    private let transcriptionService = WhisperTranscriptionService.shared
    private let summaryService = SummaryGenerationService.shared
    private let mindMapService = MindMapGenerationService.shared

    private var modelContext: ModelContext?
    private var recordingTimer: Timer?

    // MARK: - Configuration

    /// Storage warning threshold (500 MB)
    private let storageWarningThreshold: Int64 = 500 * 1_024 * 1_024

    /// Estimated storage per hour of recording (approximately 60 MB)
    private let storagePerHour: Int64 = 60 * 1_024 * 1_024

    // MARK: - Initialization

    private init() {
        updateStorageInfo()
    }

    /// Configure with SwiftData context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        summaryService.configure(modelContext: modelContext)
        mindMapService.configure(modelContext: modelContext)
        logger.info("Lesson recording service configured")
    }

    // MARK: - Recording Management (Subtask 129.1)

    /// Start a new lesson recording
    func startRecording(title: String? = nil) async throws {
        guard !isRecording else {
            throw LessonRecordingError.alreadyRecording
        }

        // Check storage availability
        updateStorageInfo()
        guard storageAvailable > storageWarningThreshold else {
            throw LessonRecordingError.insufficientStorage
        }

        // Request microphone permission
        let hasPermission = await extendedRecorder.requestMicrophonePermission()
        guard hasPermission else {
            throw LessonRecordingError.noMicrophonePermission
        }

        // Create recording session
        let recordingTitle = title ?? "Lesson \(Date().formatted(date: .abbreviated, time: .shortened))"
        let recording = LessonRecording(title: recordingTitle, language: "it")

        // Store in SwiftData
        guard let context = modelContext else {
            throw LessonRecordingError.noContext
        }

        context.insert(recording)
        try context.save()

        currentRecording = recording

        // Start recording
        try await extendedRecorder.startRecording()

        isRecording = true
        startRecordingTimer()

        logger.info("Started lesson recording: \(recordingTitle)")
    }

    /// Pause current recording
    func pauseRecording() async throws {
        guard isRecording else {
            throw LessonRecordingError.notRecording
        }

        await extendedRecorder.pauseRecording()
        stopRecordingTimer()

        logger.info("Paused lesson recording")
    }

    /// Resume paused recording
    func resumeRecording() async throws {
        guard isRecording else {
            throw LessonRecordingError.notRecording
        }

        await extendedRecorder.resumeRecording()
        startRecordingTimer()

        logger.info("Resumed lesson recording")
    }

    /// Stop and process recording
    func stopRecording() async throws -> LessonRecording {
        guard isRecording, let recording = currentRecording else {
            throw LessonRecordingError.notRecording
        }

        stopRecordingTimer()

        // Stop recording and get final URL
        guard let recordingURL = await extendedRecorder.stopRecording() else {
            throw LessonRecordingError.recordingFailed
        }

        // Update recording metadata
        recording.audioFileURL = recordingURL
        recording.recordingDuration = recordingDuration
        recording.recordingStatus = .processing

        // Calculate file size
        if let attributes = try? FileManager.default.attributesOfItem(atPath: recordingURL.path),
           let size = attributes[.size] as? Int64 {
            recording.fileSize = size
        }

        recording.markModified()

        guard let context = modelContext else {
            throw LessonRecordingError.noContext
        }

        try context.save()

        isRecording = false
        recordingDuration = 0

        logger.info("Stopped recording, starting transcription pipeline")

        // Start background transcription process
        Task {
            await processRecording(recording)
        }

        return recording
    }

    // MARK: - Transcription Pipeline (Subtask 129.2)

    /// Process recording: segment, optimize, transcribe, summarize, generate mind map
    private func processRecording(_ recording: LessonRecording) async {
        guard let audioURL = recording.audioFileURL else {
            await markRecordingFailed(recording, error: "No audio file URL")
            return
        }

        logger.info("Starting transcription pipeline for recording: \(recording.title)")
        recording.transcriptionStartDate = Date()
        recording.processingProgress = 0.1

        do {
            // Step 1: Segment audio into 30-minute chunks
            logger.info("Step 1/5: Segmenting audio...")
            let audioSegments = try await segmentationService.segmentRecording(at: audioURL)
            recording.processingProgress = 0.2

            // Step 2: Optimize segments for Whisper
            logger.info("Step 2/5: Optimizing audio segments...")
            let optimizedSegments = try await optimizeSegments(audioSegments)
            recording.processingProgress = 0.3

            // Step 3: Transcribe each segment
            logger.info("Step 3/5: Transcribing \(optimizedSegments.count) segments...")
            let transcriptionResults = try await transcriptionService.transcribeSegments(
                optimizedSegments,
                language: recording.language
            ) { completed, total in
                let progress = 0.3 + (0.4 * Double(completed) / Double(total))
                recording.processingProgress = progress
            }

            // Step 4: Build lesson segments with transcripts
            logger.info("Step 4/5: Building lesson segments...")
            let lessonSegments = buildLessonSegments(
                audioSegments: audioSegments,
                transcriptionResults: transcriptionResults
            )
            recording.segments = lessonSegments
            recording.processingProgress = 0.7

            // Merge full transcript
            recording.fullTranscript = lessonSegments
                .compactMap { $0.transcriptText }
                .joined(separator: " ")

            recording.totalWords = recording.fullTranscript?.split(separator: " ").count ?? 0

            if recording.recordingDuration > 0 {
                recording.wordsPerMinute = Double(recording.totalWords) / (recording.recordingDuration / 60.0)
            }

            // Step 5: Generate summaries and mind map
            logger.info("Step 5/5: Generating summaries and mind map...")
            try await generateSummariesAndMindMap(for: recording)
            recording.processingProgress = 1.0

            // Mark as ready
            recording.transcriptionCompletedDate = Date()
            recording.recordingStatus = .ready
            recording.markModified()

            // Save final state
            try modelContext?.save()

            // Cleanup temporary segment files
            await segmentationService.cleanupSegments(audioSegments)

            logger.info("Transcription pipeline completed successfully")
        } catch {
            logger.error("Transcription pipeline failed: \(error.localizedDescription)")
            await markRecordingFailed(recording, error: error.localizedDescription)
        }
    }

    /// Optimize audio segments for Whisper transcription
    private func optimizeSegments(_ segments: [AudioSegment]) async throws -> [OptimizedAudioSegment] {
        var optimized: [OptimizedAudioSegment] = []

        for segment in segments {
            let optimizedSegment = try await optimizerService.optimizeSegment(segment)
            optimized.append(optimizedSegment)
        }

        return optimized
    }

    /// Build lesson segments from audio and transcription results
    private func buildLessonSegments(
        audioSegments: [AudioSegment],
        transcriptionResults: [TranscriptionResult]
    ) -> [LessonSegment] {
        var lessonSegments: [LessonSegment] = []

        for audioSegment in audioSegments {
            // Find matching transcription result
            let transcription = transcriptionResults.first { $0.segmentIndex == audioSegment.index }

            let lessonSegment = LessonSegment(
                segmentIndex: audioSegment.index,
                startTime: audioSegment.startTime,
                endTime: audioSegment.endTime,
                duration: audioSegment.duration,
                audioFileURL: audioSegment.fileURL,
                transcriptText: transcription?.text,
                summary: nil,  // Will be generated later
                transcriptionAttempts: transcription?.attemptCount ?? 0,
                lastError: transcription == nil ? "Transcription not available" : nil
            )

            lessonSegments.append(lessonSegment)
        }

        return lessonSegments.sorted { $0.segmentIndex < $1.segmentIndex }
    }

    // MARK: - Summary and Mind Map Generation (Subtask 129.3)

    /// Generate summaries per segment and overall mind map
    private func generateSummariesAndMindMap(for recording: LessonRecording) async throws {
        var segments = recording.segments

        // Generate summary for each segment
        for index in segments.indices {
            guard let transcriptText = segments[index].transcriptText else { continue }

            do {
                let summary = try await summaryService.generateSummary(
                    for: transcriptText,
                    detailLevel: .brief
                )
                segments[index].summary = summary.summaryText
            } catch {
                logger.warning("Failed to generate summary for segment \(index): \(error.localizedDescription)")
            }
        }

        recording.segments = segments

        // Generate overall summary from full transcript
        if let fullTranscript = recording.fullTranscript, !fullTranscript.isEmpty {
            do {
                let overallSummary = try await summaryService.generateSummary(
                    for: fullTranscript,
                    detailLevel: .detailed
                )
                recording.overallSummary = overallSummary.summaryText
            } catch {
                logger.warning("Failed to generate overall summary: \(error.localizedDescription)")
            }

            // Generate mind map from full transcript
            do {
                let mindMap = try await mindMapService.generateMindMap(
                    from: fullTranscript,
                    materialID: recording.id,
                    subject: recording.subject?.toSubject()
                )
                recording.mindMap = mindMap
            } catch {
                logger.warning("Failed to generate mind map: \(error.localizedDescription)")
            }
        }

        try modelContext?.save()
    }

    /// Mark recording as failed
    private func markRecordingFailed(_ recording: LessonRecording, error: String) async {
        recording.recordingStatus = .failed
        recording.errorMessage = error
        recording.transcriptionCompletedDate = Date()
        recording.markModified()

        try? modelContext?.save()
    }

    // MARK: - Storage Management

    /// Update storage availability
    func updateStorageInfo() {
        do {
            let fileURL = URL(fileURLWithPath: NSHomeDirectory())
            let values = try fileURL.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
            if let capacity = values.volumeAvailableCapacityForImportantUsage {
                storageAvailable = capacity
            }

            // Estimate storage needed for 1 hour
            estimatedStorageNeeded = storagePerHour
        } catch {
            logger.error("Failed to check storage: \(error.localizedDescription)")
        }
    }

    /// Check if enough storage for estimated duration
    func hasEnoughStorage(forDuration duration: TimeInterval) -> Bool {
        let hoursEstimated = duration / 3_600
        let storageNeeded = Int64(Double(storagePerHour) * hoursEstimated)
        return storageAvailable > (storageNeeded + storageWarningThreshold)
    }

    // MARK: - Recording Timer

    private func startRecordingTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                self.recordingDuration += 1
                self.currentRecording?.recordingDuration = self.recordingDuration
            }
        }
    }

    private func stopRecordingTimer() {
        recordingTimer?.invalidate()
        recordingTimer = nil
    }

    // MARK: - Query Methods

    /// Fetch all recordings
    func fetchAllRecordings() throws -> [LessonRecording] {
        guard let context = modelContext else { return [] }

        let descriptor = FetchDescriptor<LessonRecording>(
            sortBy: [SortDescriptor(\.recordingDate, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Fetch recordings by status
    func fetchRecordings(status: RecordingStatus) throws -> [LessonRecording] {
        guard let context = modelContext else { return [] }

        let descriptor = FetchDescriptor<LessonRecording>(
            predicate: #Predicate { recording in
                recording.status == status.rawValue
            },
            sortBy: [SortDescriptor(\.recordingDate, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Delete recording and associated files
    func deleteRecording(_ recording: LessonRecording) throws {
        guard let context = modelContext else {
            throw LessonRecordingError.noContext
        }

        // Delete audio file
        if let audioURL = recording.audioFileURL {
            try? FileManager.default.removeItem(at: audioURL)
        }

        // Delete segment files
        for segment in recording.segments {
            if let segmentURL = segment.audioFileURL {
                try? FileManager.default.removeItem(at: segmentURL)
            }
        }

        context.delete(recording)
        try context.save()

        logger.info("Deleted recording: \(recording.title)")
    }
}

// MARK: - Errors

enum LessonRecordingError: LocalizedError {
    case alreadyRecording
    case notRecording
    case noMicrophonePermission
    case insufficientStorage
    case recordingFailed
    case noContext
    case processingFailed(String)

    var errorDescription: String? {
        switch self {
        case .alreadyRecording:
            return "A recording is already in progress"
        case .notRecording:
            return "No active recording found"
        case .noMicrophonePermission:
            return "Microphone permission is required to record lessons"
        case .insufficientStorage:
            return "Insufficient storage space available for recording"
        case .recordingFailed:
            return "Recording failed to complete"
        case .noContext:
            return "SwiftData context not configured"
        case .processingFailed(let message):
            return "Processing failed: \(message)"
        }
    }
}
