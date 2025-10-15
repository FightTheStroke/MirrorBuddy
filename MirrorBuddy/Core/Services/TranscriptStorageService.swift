//
//  TranscriptStorageService.swift
//  MirrorBuddy
//
//  Service for storing transcripts and linking them to materials
//  Integrates with SwiftData for persistence (Task 93.5)
//

import Foundation
import SwiftData
import os.log

/// Service for storing and managing transcripts in SwiftData
@MainActor
final class TranscriptStorageService {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TranscriptStorage")

    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Storage

    /// Store a merged transcript and optionally link to material
    /// - Parameters:
    ///   - mergedTranscript: The merged transcript to store
    ///   - audioURL: URL of the original audio recording
    ///   - material: Optional material to link transcript to
    /// - Returns: Stored Transcript entity
    @discardableResult
    func storeTranscript(
        _ mergedTranscript: MergedTranscript,
        audioURL: URL? = nil,
        linkToMaterial material: Material? = nil
    ) throws -> Transcript {
        logger.info("Storing transcript with \(mergedTranscript.totalWords) words")

        // Create Transcript entity
        let transcript = Transcript(
            text: mergedTranscript.text,
            language: mergedTranscript.language,
            recordingDuration: mergedTranscript.duration,
            recordingDate: Date(),
            audioFileURL: audioURL,
            chunkCount: mergedTranscript.chunkCount,
            totalWords: mergedTranscript.totalWords,
            wordsPerMinute: mergedTranscript.wordsPerMinute,
            material: material
        )

        // Store segments as JSON
        if let segmentsData = try? JSONEncoder().encode(mergedTranscript.segments) {
            transcript.segmentsJSON = segmentsData
        }

        // Insert into context
        modelContext.insert(transcript)

        // Link to material if provided
        if let material = material {
            material.transcript = transcript
            logger.info("Linked transcript to material: \(material.title)")
        }

        // Save context
        try modelContext.save()

        logger.info("Transcript saved successfully (ID: \(transcript.id))")

        return transcript
    }

    /// Store transcript and export to multiple formats
    /// - Parameters:
    ///   - mergedTranscript: The merged transcript to store
    ///   - audioURL: URL of the original audio recording
    ///   - material: Optional material to link transcript to
    ///   - exportDirectory: Directory to export formatted files
    ///   - formats: Formats to export (defaults to SRT, VTT, JSON)
    /// - Returns: Stored Transcript entity with export URLs
    @discardableResult
    func storeAndExportTranscript(
        _ mergedTranscript: MergedTranscript,
        audioURL: URL? = nil,
        linkToMaterial material: Material? = nil,
        exportDirectory: URL,
        formats: [TranscriptFormat] = [.srt, .vtt, .json]
    ) async throws -> Transcript {
        logger.info("Storing and exporting transcript in \(formats.count) formats")

        // Create transcript entity first
        let transcript = try storeTranscript(
            mergedTranscript,
            audioURL: audioURL,
            linkToMaterial: material
        )

        // Export to requested formats
        let mergeService = TranscriptMergeService.shared
        let filename = "transcript_\(transcript.id.uuidString)"

        for format in formats {
            do {
                let exportURL = try mergeService.exportTranscript(
                    mergedTranscript,
                    format: format,
                    to: exportDirectory,
                    filename: filename
                )

                // Store export URL in transcript
                switch format {
                case .srt:
                    transcript.srtFileURL = exportURL
                case .vtt:
                    transcript.vttFileURL = exportURL
                case .json:
                    transcript.jsonFileURL = exportURL
                default:
                    break
                }

                logger.info("Exported \(format.rawValue) to \(exportURL.lastPathComponent)")

            } catch {
                logger.error("Failed to export \(format.rawValue): \(error.localizedDescription)")
            }
        }

        // Save updated URLs
        try modelContext.save()

        return transcript
    }

    // MARK: - Retrieval

    /// Fetch transcript for a specific material
    func fetchTranscript(for material: Material) -> Transcript? {
        material.transcript
    }

    /// Fetch all transcripts, optionally filtered by date range
    func fetchAllTranscripts(from startDate: Date? = nil, to endDate: Date? = nil) throws -> [Transcript] {
        var descriptor = FetchDescriptor<Transcript>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )

        if let startDate = startDate, let endDate = endDate {
            descriptor.predicate = #Predicate<Transcript> { transcript in
                transcript.createdAt >= startDate && transcript.createdAt <= endDate
            }
        } else if let startDate = startDate {
            descriptor.predicate = #Predicate<Transcript> { transcript in
                transcript.createdAt >= startDate
            }
        } else if let endDate = endDate {
            descriptor.predicate = #Predicate<Transcript> { transcript in
                transcript.createdAt <= endDate
            }
        }

        return try modelContext.fetch(descriptor)
    }

    /// Search transcripts by text content
    func searchTranscripts(containing searchText: String) throws -> [Transcript] {
        let descriptor = FetchDescriptor<Transcript>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )

        let allTranscripts = try modelContext.fetch(descriptor)

        return allTranscripts.filter { $0.containsText(searchText) }
    }

    // MARK: - Update

    /// Update transcript text (for manual corrections)
    func updateTranscriptText(_ transcript: Transcript, newText: String) throws {
        transcript.text = newText
        transcript.markModified()

        try modelContext.save()

        logger.info("Updated transcript text (ID: \(transcript.id))")
    }

    /// Link transcript to a material
    func linkToMaterial(_ transcript: Transcript, material: Material) throws {
        transcript.material = material
        material.transcript = transcript
        transcript.markModified()

        try modelContext.save()

        logger.info("Linked transcript \(transcript.id) to material: \(material.title)")
    }

    // MARK: - Deletion

    /// Delete a transcript and its associated files
    func deleteTranscript(_ transcript: Transcript) throws {
        logger.info("Deleting transcript (ID: \(transcript.id))")

        // Delete associated export files
        let fileManager = FileManager.default

        if let srtURL = transcript.srtFileURL {
            try? fileManager.removeItem(at: srtURL)
        }

        if let vttURL = transcript.vttFileURL {
            try? fileManager.removeItem(at: vttURL)
        }

        if let jsonURL = transcript.jsonFileURL {
            try? fileManager.removeItem(at: jsonURL)
        }

        // Remove from material relationship (if exists)
        if let material = transcript.material {
            material.transcript = nil
        }

        // Delete from database
        modelContext.delete(transcript)
        try modelContext.save()

        logger.info("Transcript deleted successfully")
    }

    // MARK: - Statistics

    /// Get transcript statistics
    func getStatistics() throws -> TranscriptStatistics {
        let descriptor = FetchDescriptor<Transcript>()
        let allTranscripts = try modelContext.fetch(descriptor)

        let totalTranscripts = allTranscripts.count
        let totalWords = allTranscripts.reduce(0) { $0 + $1.totalWords }
        let totalDuration = allTranscripts.reduce(0.0) { $0 + $1.recordingDuration }
        let linkedToMaterials = allTranscripts.filter { $0.material != nil }.count

        let averageWordsPerMinute = totalDuration > 0 ? Double(totalWords) / (totalDuration / 60.0) : 0

        return TranscriptStatistics(
            totalTranscripts: totalTranscripts,
            totalWords: totalWords,
            totalDuration: totalDuration,
            linkedToMaterials: linkedToMaterials,
            averageWordsPerMinute: averageWordsPerMinute
        )
    }
}

// MARK: - Transcript Statistics

struct TranscriptStatistics {
    let totalTranscripts: Int
    let totalWords: Int
    let totalDuration: TimeInterval
    let linkedToMaterials: Int
    let averageWordsPerMinute: Double

    var formattedTotalDuration: String {
        let hours = Int(totalDuration) / 3600
        let minutes = (Int(totalDuration) % 3600) / 60

        if hours > 0 {
            return String(format: "%dh %dm", hours, minutes)
        } else {
            return String(format: "%dm", minutes)
        }
    }

    var linkagePercentage: Double {
        guard totalTranscripts > 0 else { return 0 }
        return Double(linkedToMaterials) / Double(totalTranscripts) * 100
    }
}
