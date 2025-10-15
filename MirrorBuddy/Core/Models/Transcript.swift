//
//  Transcript.swift
//  MirrorBuddy
//
//  SwiftData model for storing lesson transcripts
//  Links transcripts to materials and provides searchable text (Task 93.5)
//

import Foundation
import SwiftData

/// Lesson transcript from audio recording
@Model
final class Transcript {
    var id: UUID = UUID()
    var createdAt: Date = Date()
    var lastModifiedAt: Date = Date()

    // Transcript content
    var text: String = ""
    var language: String = "it"

    // Audio metadata
    var recordingDuration: TimeInterval = 0
    var recordingDate: Date?
    var audioFileURL: URL?

    // Transcription metadata
    var transcriptionDate: Date = Date()
    var chunkCount: Int = 0
    var totalWords: Int = 0
    var wordsPerMinute: Double = 0

    // Segmented transcript data (stored as JSON)
    @Attribute(.externalStorage)
    var segmentsJSON: Data?

    // Export formats
    @Attribute(.externalStorage)
    var srtFileURL: URL?

    @Attribute(.externalStorage)
    var vttFileURL: URL?

    @Attribute(.externalStorage)
    var jsonFileURL: URL?

    // Relationship to Material (a lesson recording is associated with study materials)
    @Relationship(deleteRule: .nullify, inverse: \Material.transcript)
    var material: Material?

    init(
        text: String,
        language: String = "it",
        recordingDuration: TimeInterval,
        recordingDate: Date? = nil,
        audioFileURL: URL? = nil,
        chunkCount: Int,
        totalWords: Int,
        wordsPerMinute: Double,
        material: Material? = nil
    ) {
        self.id = UUID()
        self.createdAt = Date()
        self.lastModifiedAt = Date()
        self.text = text
        self.language = language
        self.recordingDuration = recordingDuration
        self.recordingDate = recordingDate ?? Date()
        self.audioFileURL = audioFileURL
        self.transcriptionDate = Date()
        self.chunkCount = chunkCount
        self.totalWords = totalWords
        self.wordsPerMinute = wordsPerMinute
        self.material = material
    }

    /// Formatted duration string
    var formattedDuration: String {
        let hours = Int(recordingDuration) / 3600
        let minutes = (Int(recordingDuration) % 3600) / 60
        let seconds = Int(recordingDuration) % 60

        if hours > 0 {
            return String(format: "%dh %dm %ds", hours, minutes, seconds)
        } else if minutes > 0 {
            return String(format: "%dm %ds", minutes, seconds)
        } else {
            return String(format: "%ds", seconds)
        }
    }

    /// Update last modified timestamp
    func markModified() {
        lastModifiedAt = Date()
    }

    /// Search within transcript text
    func containsText(_ searchText: String) -> Bool {
        text.localizedCaseInsensitiveContains(searchText)
    }

    /// Get excerpt around search term
    func excerpt(for searchText: String, contextLength: Int = 100) -> String? {
        guard let range = text.range(of: searchText, options: .caseInsensitive) else {
            return nil
        }

        let startIndex = text.index(range.lowerBound, offsetBy: -contextLength, limitedBy: text.startIndex) ?? text.startIndex
        let endIndex = text.index(range.upperBound, offsetBy: contextLength, limitedBy: text.endIndex) ?? text.endIndex

        return String(text[startIndex..<endIndex])
    }
}
