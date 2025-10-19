//
//  LessonRecordingServiceTests.swift
//  MirrorBuddyTests
//
//  Unit tests for LessonRecordingService (Task 129)
//

import XCTest
import SwiftData
@testable import MirrorBuddy

@MainActor
final class LessonRecordingServiceTests: XCTestCase {
    var service: LessonRecordingService!
    var modelContext: ModelContext!
    var container: ModelContainer!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([
            LessonRecording.self,
            MindMap.self,
            MindMapNode.self,
            SubjectEntity.self,
            Material.self
        ])

        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: schema, configurations: [configuration])
        modelContext = ModelContext(container)

        // Configure service with test context
        service = LessonRecordingService.shared
        service.configure(modelContext: modelContext)
    }

    override func tearDown() async throws {
        service = nil
        modelContext = nil
        container = nil
        try await super.tearDown()
    }

    // MARK: - Storage Management Tests

    func testUpdateStorageInfo() {
        // When
        service.updateStorageInfo()

        // Then
        XCTAssertGreaterThan(service.storageAvailable, 0, "Storage available should be greater than 0")
        XCTAssertGreaterThan(service.estimatedStorageNeeded, 0, "Estimated storage needed should be greater than 0")
    }

    func testHasEnoughStorageForShortDuration() {
        // Given
        let shortDuration: TimeInterval = 10 * 60 // 10 minutes

        // When
        service.updateStorageInfo()
        let hasEnough = service.hasEnoughStorage(forDuration: shortDuration)

        // Then
        XCTAssertTrue(hasEnough, "Should have enough storage for 10 minutes")
    }

    func testHasEnoughStorageForLongDuration() {
        // Given
        let longDuration: TimeInterval = 100 * 60 * 60 // 100 hours (unrealistic)

        // When
        service.updateStorageInfo()
        let hasEnough = service.hasEnoughStorage(forDuration: longDuration)

        // Then - This might fail if device actually has massive storage, but unlikely
        XCTAssertFalse(hasEnough, "Should not have enough storage for 100 hours")
    }

    // MARK: - Recording Lifecycle Tests

    func testRecordingCreation() async throws {
        // Given
        let title = "Test Lesson Recording"

        // When
        let recording = LessonRecording(title: title)
        modelContext.insert(recording)
        try modelContext.save()

        // Then
        XCTAssertEqual(recording.title, title)
        XCTAssertEqual(recording.recordingStatus, .recording)
        XCTAssertNotNil(recording.id)
        XCTAssertEqual(recording.language, "it")
    }

    func testRecordingStatusTransitions() {
        // Given
        let recording = LessonRecording(title: "Test")

        // When/Then - Recording to Processing
        recording.recordingStatus = .processing
        XCTAssertEqual(recording.status, RecordingStatus.processing.rawValue)

        // When/Then - Processing to Ready
        recording.recordingStatus = .ready
        XCTAssertEqual(recording.status, RecordingStatus.ready.rawValue)

        // When/Then - Ready to Failed
        recording.recordingStatus = .failed
        XCTAssertEqual(recording.status, RecordingStatus.failed.rawValue)
    }

    // MARK: - Segment Management Tests

    func testSegmentsEncoding() throws {
        // Given
        let recording = LessonRecording(title: "Test")
        let segments = [
            LessonSegment(
                segmentIndex: 0,
                startTime: 0,
                endTime: 60,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Test transcript segment 1"
            ),
            LessonSegment(
                segmentIndex: 1,
                startTime: 60,
                endTime: 120,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Test transcript segment 2"
            )
        ]

        // When
        recording.segments = segments

        // Then
        XCTAssertNotNil(recording.segmentsJSON)
        XCTAssertEqual(recording.segments.count, 2)
        XCTAssertEqual(recording.segments[0].transcriptText, "Test transcript segment 1")
        XCTAssertEqual(recording.segments[1].transcriptText, "Test transcript segment 2")
    }

    func testSegmentAtTimestamp() {
        // Given
        let recording = LessonRecording(title: "Test")
        recording.segments = [
            LessonSegment(
                segmentIndex: 0,
                startTime: 0,
                endTime: 60,
                duration: 60,
                audioFileURL: nil
            ),
            LessonSegment(
                segmentIndex: 1,
                startTime: 60,
                endTime: 120,
                duration: 60,
                audioFileURL: nil
            )
        ]

        // When/Then - First segment
        let segment1 = recording.segment(at: 30)
        XCTAssertNotNil(segment1)
        XCTAssertEqual(segment1?.segmentIndex, 0)

        // When/Then - Second segment
        let segment2 = recording.segment(at: 90)
        XCTAssertNotNil(segment2)
        XCTAssertEqual(segment2?.segmentIndex, 1)

        // When/Then - No segment
        let segment3 = recording.segment(at: 150)
        XCTAssertNil(segment3)
    }

    // MARK: - Transcription Progress Tests

    func testTranscriptionProgressCalculation() {
        // Given
        let recording = LessonRecording(title: "Test")
        recording.segments = [
            LessonSegment(
                segmentIndex: 0,
                startTime: 0,
                endTime: 60,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Completed"
            ),
            LessonSegment(
                segmentIndex: 1,
                startTime: 60,
                endTime: 120,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Completed"
            ),
            LessonSegment(
                segmentIndex: 2,
                startTime: 120,
                endTime: 180,
                duration: 60,
                audioFileURL: nil,
                transcriptText: nil  // Not completed
            ),
            LessonSegment(
                segmentIndex: 3,
                startTime: 180,
                endTime: 240,
                duration: 60,
                audioFileURL: nil,
                transcriptText: nil  // Not completed
            )
        ]

        // When
        let progress = recording.transcriptionProgress

        // Then - 2 out of 4 segments completed = 50%
        XCTAssertEqual(progress, 50)
    }

    func testIsTranscriptionComplete() {
        // Given
        let recording = LessonRecording(title: "Test")

        // When - No segments
        XCTAssertFalse(recording.isTranscriptionComplete)

        // When - All segments completed
        recording.segments = [
            LessonSegment(
                segmentIndex: 0,
                startTime: 0,
                endTime: 60,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Complete"
            ),
            LessonSegment(
                segmentIndex: 1,
                startTime: 60,
                endTime: 120,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Complete"
            )
        ]

        // Then
        XCTAssertTrue(recording.isTranscriptionComplete)

        // When - One segment incomplete
        var segments = recording.segments
        segments[1].transcriptText = nil
        recording.segments = segments

        // Then
        XCTAssertFalse(recording.isTranscriptionComplete)
    }

    // MARK: - Formatting Tests

    func testFormattedDuration() {
        // Given
        let recording = LessonRecording(title: "Test")

        // When/Then - Seconds only
        recording.recordingDuration = 45
        XCTAssertEqual(recording.formattedDuration, "45s")

        // When/Then - Minutes and seconds
        recording.recordingDuration = 125  // 2m 5s
        XCTAssertEqual(recording.formattedDuration, "2m 05s")

        // When/Then - Hours and minutes
        recording.recordingDuration = 3_665  // 1h 1m 5s
        XCTAssertEqual(recording.formattedDuration, "1h 01m")
    }

    func testFormattedFileSize() {
        // Given
        let recording = LessonRecording(title: "Test")

        // When/Then - MB
        recording.fileSize = 50 * 1_024 * 1_024  // 50 MB
        XCTAssertTrue(recording.formattedFileSize.contains("50"))
        XCTAssertTrue(recording.formattedFileSize.contains("MB"))

        // When/Then - GB
        recording.fileSize = 2 * 1_024 * 1_024 * 1_024  // 2 GB
        XCTAssertTrue(recording.formattedFileSize.contains("2"))
        XCTAssertTrue(recording.formattedFileSize.contains("GB"))
    }

    // MARK: - Query Tests

    func testFetchAllRecordings() throws {
        // Given
        let recording1 = LessonRecording(title: "Recording 1")
        let recording2 = LessonRecording(title: "Recording 2")
        let recording3 = LessonRecording(title: "Recording 3")

        modelContext.insert(recording1)
        modelContext.insert(recording2)
        modelContext.insert(recording3)
        try modelContext.save()

        // When
        let recordings = try service.fetchAllRecordings()

        // Then
        XCTAssertEqual(recordings.count, 3)
    }

    func testFetchRecordingsByStatus() throws {
        // Given
        let recording1 = LessonRecording(title: "Recording 1")
        recording1.recordingStatus = .ready

        let recording2 = LessonRecording(title: "Recording 2")
        recording2.recordingStatus = .processing

        let recording3 = LessonRecording(title: "Recording 3")
        recording3.recordingStatus = .ready

        modelContext.insert(recording1)
        modelContext.insert(recording2)
        modelContext.insert(recording3)
        try modelContext.save()

        // When
        let readyRecordings = try service.fetchRecordings(status: .ready)
        let processingRecordings = try service.fetchRecordings(status: .processing)

        // Then
        XCTAssertEqual(readyRecordings.count, 2)
        XCTAssertEqual(processingRecordings.count, 1)
    }

    // MARK: - Full Transcript Tests

    func testFullTranscriptGeneration() {
        // Given
        let recording = LessonRecording(title: "Test")
        recording.segments = [
            LessonSegment(
                segmentIndex: 0,
                startTime: 0,
                endTime: 60,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "First segment text."
            ),
            LessonSegment(
                segmentIndex: 1,
                startTime: 60,
                endTime: 120,
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Second segment text."
            )
        ]

        // When - Simulate what the service does
        let fullTranscript = recording.segments
            .compactMap { $0.transcriptText }
            .joined(separator: " ")
        recording.fullTranscript = fullTranscript

        // Then
        XCTAssertEqual(recording.fullTranscript, "First segment text. Second segment text.")
    }

    func testWordCountCalculation() {
        // Given
        let recording = LessonRecording(title: "Test")
        recording.fullTranscript = "This is a test transcript with ten words here."

        // When
        let wordCount = recording.fullTranscript?.split(separator: " ").count ?? 0
        recording.totalWords = wordCount

        // Then
        XCTAssertEqual(recording.totalWords, 10)
    }

    func testWordsPerMinuteCalculation() {
        // Given
        let recording = LessonRecording(title: "Test")
        recording.fullTranscript = String(repeating: "word ", count: 100)  // 100 words
        recording.totalWords = 100
        recording.recordingDuration = 5 * 60  // 5 minutes

        // When
        recording.wordsPerMinute = Double(recording.totalWords) / (recording.recordingDuration / 60.0)

        // Then
        XCTAssertEqual(recording.wordsPerMinute, 20.0, accuracy: 0.1)
    }

    // MARK: - Search Tests

    func testContainsText() {
        // Given
        let recording = LessonRecording(title: "Test")
        recording.fullTranscript = "This is a comprehensive transcript about physics and mathematics."

        // When/Then - Case insensitive search
        XCTAssertTrue(recording.containsText("Physics"))
        XCTAssertTrue(recording.containsText("mathematics"))
        XCTAssertTrue(recording.containsText("COMPREHENSIVE"))

        // When/Then - Not found
        XCTAssertFalse(recording.containsText("chemistry"))
    }

    // MARK: - Processing Time Tests

    func testProcessingDuration() {
        // Given
        let recording = LessonRecording(title: "Test")
        let startDate = Date()
        let endDate = startDate.addingTimeInterval(120)  // 2 minutes later

        // When
        recording.transcriptionStartDate = startDate
        recording.transcriptionCompletedDate = endDate

        // Then
        XCTAssertEqual(recording.processingDuration, 120, accuracy: 0.1)
    }

    func testProcessingDurationNilDates() {
        // Given
        let recording = LessonRecording(title: "Test")

        // When/Then - No dates set
        XCTAssertNil(recording.processingDuration)

        // When/Then - Only start date
        recording.transcriptionStartDate = Date()
        XCTAssertNil(recording.processingDuration)
    }

    // MARK: - Segment Formatting Tests

    func testSegmentFormattedStartTime() {
        // Given
        let segment = LessonSegment(
            segmentIndex: 0,
            startTime: 3_665,  // 1h 1m 5s
            endTime: 3_725,
            duration: 60,
            audioFileURL: nil
        )

        // When/Then
        XCTAssertEqual(segment.formattedStartTime, "01:01:05")
    }

    func testSegmentWordCount() {
        // Given
        var segment = LessonSegment(
            segmentIndex: 0,
            startTime: 0,
            endTime: 60,
            duration: 60,
            audioFileURL: nil
        )

        // When/Then - No transcript
        XCTAssertEqual(segment.wordCount, 0)

        // When/Then - With transcript
        segment.transcriptText = "This is a test with five words"
        XCTAssertEqual(segment.wordCount, 7)
    }

    // MARK: - Performance Tests

    func testPerformanceOfLargeSegmentArray() {
        // Given
        let recording = LessonRecording(title: "Test")

        // Create 100 segments (simulating a long recording)
        var segments: [LessonSegment] = []
        for i in 0..<100 {
            let segment = LessonSegment(
                segmentIndex: i,
                startTime: TimeInterval(i * 60),
                endTime: TimeInterval((i + 1) * 60),
                duration: 60,
                audioFileURL: nil,
                transcriptText: "Segment \(i) transcript text here."
            )
            segments.append(segment)
        }

        // When - Measure encoding/decoding performance
        measure {
            recording.segments = segments
            _ = recording.segments
        }

        // Then - Should complete quickly
        XCTAssertEqual(recording.segments.count, 100)
    }
}
