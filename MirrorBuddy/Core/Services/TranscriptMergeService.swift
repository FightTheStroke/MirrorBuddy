//
//  TranscriptMergeService.swift
//  MirrorBuddy
//
//  Service for merging individual chunk transcripts into complete lesson transcript
//  Adjusts timestamps to maintain continuity (Task 93.4)
//

import Foundation
import os.log

/// Service for merging chunk transcripts into a complete lesson transcript
@MainActor
final class TranscriptMergeService {
    static let shared = TranscriptMergeService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TranscriptMerge")

    private init() {}

    // MARK: - Transcript Merging

    /// Merge multiple chunk transcripts into a single complete transcript
    /// - Parameter chunkTranscripts: Array of transcription results (one per chunk)
    /// - Returns: Complete merged transcript with adjusted timestamps
    func mergeTranscripts(_ chunkTranscripts: [TranscriptionResult]) throws -> MergedTranscript {
        guard !chunkTranscripts.isEmpty else {
            throw MergeError.noTranscripts
        }

        logger.info("Merging \(chunkTranscripts.count) chunk transcripts")

        // Sort by segment index to ensure proper order
        let sortedChunks = chunkTranscripts.sorted { $0.segmentIndex < $1.segmentIndex }

        // Validate chunk continuity (no gaps in segment indices)
        try validateChunkContinuity(sortedChunks)

        // Build complete text and create timestamp-adjusted segments
        var fullText = ""
        var mergedSegments: [TranscriptSegment] = []
        var totalWordCount = 0

        for (index, chunk) in sortedChunks.enumerated() {
            // Add spacing between chunks (except first)
            if index > 0 && !fullText.isEmpty {
                fullText += " "
            }

            // Append chunk text
            let chunkText = chunk.text.trimmingCharacters(in: .whitespacesAndNewlines)
            fullText += chunkText

            // Create transcript segment with original recording timestamps
            let segment = TranscriptSegment(
                index: chunk.segmentIndex,
                text: chunkText,
                startTime: chunk.startTime,
                endTime: chunk.endTime,
                wordCount: chunk.wordCount
            )

            mergedSegments.append(segment)
            totalWordCount += chunk.wordCount

            logger.info("Merged chunk \(chunk.segmentIndex): \(chunk.wordCount) words, \(chunk.formattedStartTime) - \(segment.formattedEndTime)")
        }

        // Calculate overall duration
        let startTime = sortedChunks.first!.startTime
        let endTime = sortedChunks.last!.endTime
        let totalDuration = endTime - startTime

        logger.info("""
            Merge complete:
            - Total duration: \(totalDuration / 60.0) minutes
            - Total words: \(totalWordCount)
            - Segments: \(mergedSegments.count)
            """)

        return MergedTranscript(
            text: fullText,
            segments: mergedSegments,
            startTime: startTime,
            endTime: endTime,
            duration: totalDuration,
            totalWords: totalWordCount,
            chunkCount: sortedChunks.count,
            language: sortedChunks.first?.language ?? "it",
            mergedAt: Date()
        )
    }

    /// Merge transcripts and generate formatted output
    func mergeAndFormat(
        _ chunkTranscripts: [TranscriptionResult],
        format: TranscriptFormat = .plainText
    ) throws -> String {
        let merged = try mergeTranscripts(chunkTranscripts)

        switch format {
        case .plainText:
            return merged.text

        case .timestamped:
            return formatWithTimestamps(merged)

        case .srt:
            return formatAsSRT(merged)

        case .vtt:
            return formatAsVTT(merged)

        case .json:
            return try formatAsJSON(merged)
        }
    }

    // MARK: - Validation

    /// Validate that chunks are continuous (no missing segments)
    private func validateChunkContinuity(_ sortedChunks: [TranscriptionResult]) throws {
        for (index, chunk) in sortedChunks.enumerated() {
            if chunk.segmentIndex != index {
                logger.error("Missing chunk at index \(index). Found chunk with index \(chunk.segmentIndex)")
                throw MergeError.discontinuousChunks(expected: index, found: chunk.segmentIndex)
            }
        }
    }

    // MARK: - Formatting

    /// Format transcript with timestamp markers
    private func formatWithTimestamps(_ transcript: MergedTranscript) -> String {
        var output = ""

        for segment in transcript.segments {
            output += "[\(segment.formattedStartTime) - \(segment.formattedEndTime)]\n"
            output += segment.text
            output += "\n\n"
        }

        return output
    }

    /// Format transcript as SRT subtitle file
    private func formatAsSRT(_ transcript: MergedTranscript) -> String {
        var output = ""

        for (index, segment) in transcript.segments.enumerated() {
            // Subtitle index (1-based)
            output += "\(index + 1)\n"

            // Timestamp range (SRT format: HH:MM:SS,mmm --> HH:MM:SS,mmm)
            output += formatSRTTimestamp(segment.startTime)
            output += " --> "
            output += formatSRTTimestamp(segment.endTime)
            output += "\n"

            // Text
            output += segment.text
            output += "\n\n"
        }

        return output
    }

    /// Format transcript as WebVTT subtitle file
    private func formatAsVTT(_ transcript: MergedTranscript) -> String {
        var output = "WEBVTT\n\n"

        for segment in transcript.segments {
            // Cue identifier (optional)
            output += "\(segment.index)\n"

            // Timestamp range (VTT format: HH:MM:SS.mmm --> HH:MM:SS.mmm)
            output += formatVTTTimestamp(segment.startTime)
            output += " --> "
            output += formatVTTTimestamp(segment.endTime)
            output += "\n"

            // Text
            output += segment.text
            output += "\n\n"
        }

        return output
    }

    /// Format transcript as JSON
    private func formatAsJSON(_ transcript: MergedTranscript) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601

        let data = try encoder.encode(transcript)
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    // MARK: - Timestamp Formatting

    /// Format timestamp for SRT (HH:MM:SS,mmm)
    private func formatSRTTimestamp(_ time: TimeInterval) -> String {
        let hours = Int(time) / 3600
        let minutes = (Int(time) % 3600) / 60
        let seconds = Int(time) % 60
        let milliseconds = Int((time.truncatingRemainder(dividingBy: 1.0)) * 1000)

        return String(format: "%02d:%02d:%02d,%03d", hours, minutes, seconds, milliseconds)
    }

    /// Format timestamp for VTT (HH:MM:SS.mmm)
    private func formatVTTTimestamp(_ time: TimeInterval) -> String {
        let hours = Int(time) / 3600
        let minutes = (Int(time) % 3600) / 60
        let seconds = Int(time) % 60
        let milliseconds = Int((time.truncatingRemainder(dividingBy: 1.0)) * 1000)

        return String(format: "%02d:%02d:%02d.%03d", hours, minutes, seconds, milliseconds)
    }

    // MARK: - Export

    /// Export merged transcript to file
    func exportTranscript(
        _ transcript: MergedTranscript,
        format: TranscriptFormat,
        to directory: URL,
        filename: String? = nil
    ) throws -> URL {
        let formatted = try mergeAndFormat(transcript.segments.map { segment in
            TranscriptionResult(
                segmentIndex: segment.index,
                text: segment.text,
                language: transcript.language,
                duration: segment.duration,
                startTime: segment.startTime,
                endTime: segment.endTime,
                attemptCount: 1,
                timestamp: transcript.mergedAt
            )
        }, format: format)

        let baseFilename = filename ?? "transcript_\(Int(Date().timeIntervalSince1970))"
        let fullFilename = "\(baseFilename).\(format.fileExtension)"
        let fileURL = directory.appendingPathComponent(fullFilename)

        try formatted.write(to: fileURL, atomically: true, encoding: .utf8)

        logger.info("Exported transcript to: \(fileURL.lastPathComponent)")

        return fileURL
    }
}

// MARK: - Merged Transcript Model

/// Complete merged transcript from all chunks
struct MergedTranscript: Codable, Identifiable {
    let id: UUID
    let text: String
    let segments: [TranscriptSegment]
    let startTime: TimeInterval
    let endTime: TimeInterval
    let duration: TimeInterval
    let totalWords: Int
    let chunkCount: Int
    let language: String
    let mergedAt: Date

    init(
        text: String,
        segments: [TranscriptSegment],
        startTime: TimeInterval,
        endTime: TimeInterval,
        duration: TimeInterval,
        totalWords: Int,
        chunkCount: Int,
        language: String,
        mergedAt: Date
    ) {
        self.id = UUID()
        self.text = text
        self.segments = segments
        self.startTime = startTime
        self.endTime = endTime
        self.duration = duration
        self.totalWords = totalWords
        self.chunkCount = chunkCount
        self.language = language
        self.mergedAt = mergedAt
    }

    /// Average words per minute
    var wordsPerMinute: Double {
        guard duration > 0 else { return 0 }
        return Double(totalWords) / (duration / 60.0)
    }

    /// Formatted duration
    var formattedDuration: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60

        if hours > 0 {
            return String(format: "%dh %dm %ds", hours, minutes, seconds)
        } else if minutes > 0 {
            return String(format: "%dm %ds", minutes, seconds)
        } else {
            return String(format: "%ds", seconds)
        }
    }
}

// MARK: - Transcript Segment Model

/// Individual segment within merged transcript
struct TranscriptSegment: Codable, Identifiable {
    let id: UUID
    let index: Int
    let text: String
    let startTime: TimeInterval
    let endTime: TimeInterval
    let wordCount: Int

    init(
        index: Int,
        text: String,
        startTime: TimeInterval,
        endTime: TimeInterval,
        wordCount: Int
    ) {
        self.id = UUID()
        self.index = index
        self.text = text
        self.startTime = startTime
        self.endTime = endTime
        self.wordCount = wordCount
    }

    /// Segment duration
    var duration: TimeInterval {
        endTime - startTime
    }

    /// Formatted start time
    var formattedStartTime: String {
        let hours = Int(startTime) / 3600
        let minutes = (Int(startTime) % 3600) / 60
        let seconds = Int(startTime) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    /// Formatted end time
    var formattedEndTime: String {
        let hours = Int(endTime) / 3600
        let minutes = (Int(endTime) % 3600) / 60
        let seconds = Int(endTime) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
}

// MARK: - Transcript Formats

enum TranscriptFormat: String, CaseIterable {
    case plainText = "Plain Text"
    case timestamped = "Timestamped"
    case srt = "SRT Subtitles"
    case vtt = "WebVTT Subtitles"
    case json = "JSON"

    var fileExtension: String {
        switch self {
        case .plainText: return "txt"
        case .timestamped: return "txt"
        case .srt: return "srt"
        case .vtt: return "vtt"
        case .json: return "json"
        }
    }
}

// MARK: - Errors

enum MergeError: LocalizedError {
    case noTranscripts
    case discontinuousChunks(expected: Int, found: Int)
    case exportFailed

    var errorDescription: String? {
        switch self {
        case .noTranscripts:
            return "Nessuna trascrizione da unire"
        case .discontinuousChunks(let expected, let found):
            return "Chunk mancante: atteso indice \(expected), trovato \(found)"
        case .exportFailed:
            return "Impossibile esportare la trascrizione"
        }
    }
}
