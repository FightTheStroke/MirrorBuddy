//
//  LessonRecording.swift
//  MirrorBuddy
//
//  SwiftData model for lesson recordings with segmented transcription (Task 129)
//  Supports ambient recording, chunked transcription, and auto-generated summaries/mind maps
//

import Foundation
import SwiftData

/// Status of a lesson recording
enum RecordingStatus: String, Codable {
    case recording      // Currently recording
    case processing     // Transcription in progress
    case ready          // Transcription complete, ready for review
    case failed         // Transcription or processing failed
}

/// Individual segment of a lesson recording with transcription
struct LessonSegment: Codable, Identifiable {
    var id = UUID()
    let segmentIndex: Int
    let startTime: TimeInterval
    let endTime: TimeInterval
    let duration: TimeInterval
    var audioFileURL: URL?
    var transcriptText: String?
    var summary: String?
    var transcriptionAttempts: Int = 0
    var lastError: String?

    /// Formatted timestamp string (HH:MM:SS)
    var formattedStartTime: String {
        let hours = Int(startTime) / 3_600
        let minutes = (Int(startTime) % 3_600) / 60
        let seconds = Int(startTime) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    /// Word count for this segment
    var wordCount: Int {
        transcriptText?.split(separator: " ").count ?? 0
    }
}

/// Complete lesson recording session
@Model
final class LessonRecording {
    var id = UUID()
    var createdAt = Date()
    var lastModifiedAt = Date()

    // Recording metadata
    var title: String = ""
    var recordingDate = Date()
    var recordingDuration: TimeInterval = 0
    var status: String = RecordingStatus.recording.rawValue

    // Audio files
    var audioFileURL: URL?  // Main merged audio file
    var fileSize: Int64 = 0  // File size in bytes

    // Transcription metadata
    var language: String = "it"
    var transcriptionStartDate: Date?
    var transcriptionCompletedDate: Date?
    var totalWords: Int = 0
    var wordsPerMinute: Double = 0

    // Segmented data (stored as JSON for flexibility)
    @Attribute(.externalStorage)
    var segmentsJSON: Data?

    // Generated content
    var fullTranscript: String?
    var overallSummary: String?

    // Relationship to generated mind map
    @Relationship(deleteRule: .cascade)
    var mindMap: MindMap?

    // Relationship to subject (optional, detected from context)
    @Relationship(deleteRule: .nullify)
    var subject: SubjectEntity?

    // Relationship to material (lesson can be linked to study material)
    @Relationship(deleteRule: .nullify, inverse: \Material.lessonRecordings)
    var material: Material?

    // Processing state
    var processingProgress: Double = 0  // 0.0 to 1.0
    var errorMessage: String?

    init(
        title: String,
        recordingDate: Date = Date(),
        audioFileURL: URL? = nil,
        language: String = "it"
    ) {
        self.id = UUID()
        self.createdAt = Date()
        self.lastModifiedAt = Date()
        self.title = title
        self.recordingDate = recordingDate
        self.audioFileURL = audioFileURL
        self.language = language
        self.status = RecordingStatus.recording.rawValue
    }

    // MARK: - Computed Properties

    /// Recording status as enum
    var recordingStatus: RecordingStatus {
        get { RecordingStatus(rawValue: status) ?? .recording }
        set { status = newValue.rawValue }
    }

    /// Decoded segments array
    var segments: [LessonSegment] {
        get {
            guard let data = segmentsJSON else { return [] }
            return (try? JSONDecoder().decode([LessonSegment].self, from: data)) ?? []
        }
        set {
            segmentsJSON = try? JSONEncoder().encode(newValue)
        }
    }

    /// Formatted file size
    var formattedFileSize: String {
        let sizeMB = Double(fileSize) / (1_024 * 1_024)
        if sizeMB > 1_000 {
            return String(format: "%.1f GB", sizeMB / 1_024)
        } else {
            return String(format: "%.1f MB", sizeMB)
        }
    }

    /// Formatted recording duration
    var formattedDuration: String {
        let hours = Int(recordingDuration) / 3_600
        let minutes = (Int(recordingDuration) % 3_600) / 60
        let seconds = Int(recordingDuration) % 60

        if hours > 0 {
            return String(format: "%dh %02dm", hours, minutes)
        } else if minutes > 0 {
            return String(format: "%dm %02ds", minutes, seconds)
        } else {
            return String(format: "%ds", seconds)
        }
    }

    /// Transcription completion percentage
    var transcriptionProgress: Int {
        guard !segments.isEmpty else { return 0 }
        let completed = segments.filter { $0.transcriptText != nil }.count
        return Int((Double(completed) / Double(segments.count)) * 100)
    }

    /// Check if transcription is complete
    var isTranscriptionComplete: Bool {
        !segments.isEmpty && segments.allSatisfy { $0.transcriptText != nil }
    }

    /// Get segment at specific timestamp
    func segment(at timestamp: TimeInterval) -> LessonSegment? {
        segments.first { segment in
            timestamp >= segment.startTime && timestamp < segment.endTime
        }
    }

    /// Update last modified timestamp
    func markModified() {
        lastModifiedAt = Date()
    }

    /// Search within full transcript
    func containsText(_ searchText: String) -> Bool {
        fullTranscript?.localizedCaseInsensitiveContains(searchText) ?? false
    }

    /// Calculate processing time
    var processingDuration: TimeInterval? {
        guard let start = transcriptionStartDate,
              let end = transcriptionCompletedDate else {
            return nil
        }
        return end.timeIntervalSince(start)
    }
}

// MARK: - Material Extension

extension Material {
    /// Relationship to lesson recordings
    @Relationship(deleteRule: .cascade)
    var lessonRecordings: [LessonRecording]? {
        get { nil }  // Computed property, actual storage in LessonRecording
        set { }
    }
}
