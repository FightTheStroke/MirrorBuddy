//
//  AudioSegmentationService.swift
//  MirrorBuddy
//
//  Service for segmenting long audio recordings into 30-minute chunks
//  for Whisper API transcription (Task 93.1)
//

import AVFoundation
import Foundation
import os.log
import Combine


/// Service for splitting extended recordings into chunks for Whisper API
@MainActor
final class AudioSegmentationService {
    static let shared = AudioSegmentationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "AudioSegmentation")

    // MARK: - Configuration

    /// Whisper API optimal chunk duration (30 minutes)
    private let chunkDuration: TimeInterval = 30 * 60 // 30 minutes

    /// Overlap between chunks for better transcription continuity (30 seconds)
    private let overlapDuration: TimeInterval = 30.0

    private init() {}

    // MARK: - Audio Segmentation

    /// Segment a long recording into 30-minute chunks
    /// - Parameter recordingURL: URL of the complete merged recording
    /// - Returns: Array of audio segment metadata
    func segmentRecording(at recordingURL: URL) async throws -> [AudioSegment] {
        logger.info("Starting segmentation of recording: \(recordingURL.lastPathComponent)")

        // Load audio asset
        let asset = AVAsset(url: recordingURL)

        // Get duration
        let duration = try await asset.load(.duration)
        let totalSeconds = CMTimeGetSeconds(duration)

        logger.info("Recording duration: \(totalSeconds) seconds (\(totalSeconds / 60) minutes)")

        // Check if recording needs segmentation
        if totalSeconds <= chunkDuration {
            logger.info("Recording is shorter than chunk duration, no segmentation needed")

            // Return single segment for the entire recording
            return [AudioSegment(
                index: 0,
                startTime: 0,
                endTime: totalSeconds,
                duration: totalSeconds,
                fileURL: recordingURL,
                isOriginal: true
            )]
        }

        // Calculate number of chunks needed
        let numberOfChunks = Int(ceil(totalSeconds / chunkDuration))
        logger.info("Splitting into \(numberOfChunks) chunks")

        var segments: [AudioSegment] = []

        // Create chunks with overlap
        for chunkIndex in 0..<numberOfChunks {
            let startTime = max(0, Double(chunkIndex) * chunkDuration - overlapDuration)
            let endTime = min(totalSeconds, Double(chunkIndex + 1) * chunkDuration)
            let segmentDuration = endTime - startTime

            logger.info("Creating chunk \(chunkIndex + 1)/\(numberOfChunks): \(startTime)s - \(endTime)s (\(segmentDuration)s)")

            // Export this chunk to a temporary file
            let segmentURL = try await exportSegment(
                from: asset,
                startTime: startTime,
                endTime: endTime,
                chunkIndex: chunkIndex,
                sessionID: extractSessionID(from: recordingURL)
            )

            let segment = AudioSegment(
                index: chunkIndex,
                startTime: startTime,
                endTime: endTime,
                duration: segmentDuration,
                fileURL: segmentURL,
                isOriginal: false
            )

            segments.append(segment)
        }

        logger.info("Segmentation complete: \(segments.count) segments created")

        return segments
    }

    // MARK: - Segment Export

    /// Export a specific time range from an audio asset to a file
    private func exportSegment(
        from asset: AVAsset,
        startTime: TimeInterval,
        endTime: TimeInterval,
        chunkIndex: Int,
        sessionID: String
    ) async throws -> URL {
        // Create temporary output URL
        let outputURL = try createChunkURL(sessionID: sessionID, chunkIndex: chunkIndex)

        // Remove existing file if present
        try? FileManager.default.removeItem(at: outputURL)

        // Create time range for this segment
        let startCMTime = CMTime(seconds: startTime, preferredTimescale: 600)
        let endCMTime = CMTime(seconds: endTime, preferredTimescale: 600)
        let timeRange = CMTimeRange(start: startCMTime, end: endCMTime)

        // Configure export session
        guard let exportSession = AVAssetExportSession(
            asset: asset,
            presetName: AVAssetExportPresetAppleM4A
        ) else {
            throw SegmentationError.exportFailed
        }

        exportSession.outputURL = outputURL
        exportSession.outputFileType = .m4a
        exportSession.timeRange = timeRange

        // Export the segment
        await exportSession.export()

        if exportSession.status == .completed {
            logger.info("Chunk \(chunkIndex) exported successfully: \(outputURL.lastPathComponent)")
            return outputURL
        } else if let error = exportSession.error {
            logger.error("Export failed for chunk \(chunkIndex): \(error.localizedDescription)")
            throw SegmentationError.exportFailed
        } else {
            logger.error("Export failed for chunk \(chunkIndex): unknown error")
            throw SegmentationError.exportFailed
        }
    }

    // MARK: - File Management

    /// Create URL for audio chunk in temporary directory
    private func createChunkURL(sessionID: String, chunkIndex: Int) throws -> URL {
        let tempDirectory = FileManager.default.temporaryDirectory
        let chunksDirectory = tempDirectory.appendingPathComponent("AudioChunks", isDirectory: true)

        // Create directory if needed
        try FileManager.default.createDirectory(
            at: chunksDirectory,
            withIntermediateDirectories: true
        )

        let fileName = "chunk_\(sessionID)_\(chunkIndex).m4a"
        return chunksDirectory.appendingPathComponent(fileName)
    }

    /// Extract session ID from recording filename
    private func extractSessionID(from url: URL) -> String {
        let filename = url.deletingPathExtension().lastPathComponent

        // Extract UUID from filename like "lesson_UUID_merged.m4a" or "lesson_UUID.m4a"
        let components = filename.components(separatedBy: "_")
        if components.count >= 2 {
            return components[1]
        }

        // Fallback: use timestamp
        return String(Int(Date().timeIntervalSince1970))
    }

    // MARK: - Cleanup

    /// Clean up temporary chunk files after transcription
    func cleanupSegments(_ segments: [AudioSegment]) async {
        logger.info("Cleaning up \(segments.count) segment files")

        for segment in segments {
            // Only delete temporary segments, not original recording
            guard !segment.isOriginal else { continue }

            do {
                try FileManager.default.removeItem(at: segment.fileURL)
                logger.info("Deleted chunk: \(segment.fileURL.lastPathComponent)")
            } catch {
                logger.error("Failed to delete chunk \(segment.fileURL.lastPathComponent): \(error.localizedDescription)")
            }
        }
    }

    /// Clean up all temporary chunks (call on app termination or cleanup)
    func cleanupAllTemporaryChunks() async {
        logger.info("Cleaning up all temporary audio chunks")

        let tempDirectory = FileManager.default.temporaryDirectory
        let chunksDirectory = tempDirectory.appendingPathComponent("AudioChunks", isDirectory: true)

        guard FileManager.default.fileExists(atPath: chunksDirectory.path) else {
            logger.info("No temporary chunks directory found")
            return
        }

        do {
            let chunkFiles = try FileManager.default.contentsOfDirectory(
                at: chunksDirectory,
                includingPropertiesForKeys: nil,
                options: .skipsHiddenFiles
            )

            for fileURL in chunkFiles {
                try FileManager.default.removeItem(at: fileURL)
            }

            logger.info("Deleted \(chunkFiles.count) temporary chunk files")
        } catch {
            logger.error("Cleanup failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Statistics

    /// Get segmentation statistics
    func getSegmentStatistics(for segments: [AudioSegment]) -> SegmentationStats {
        let totalDuration = segments.reduce(0.0) { $0 + $1.duration }

        let fileSizes = segments.compactMap { segment -> Int64? in
            try? FileManager.default.attributesOfItem(atPath: segment.fileURL.path)[.size] as? Int64
        }

        let totalSize = fileSizes.reduce(0, +)

        return SegmentationStats(
            segmentCount: segments.count,
            totalDuration: totalDuration,
            averageSegmentDuration: totalDuration / Double(segments.count),
            totalFileSize: totalSize,
            averageFileSize: totalSize / Int64(segments.count)
        )
    }
}

// MARK: - Audio Segment Model

/// Represents a single audio segment for transcription
struct AudioSegment: Identifiable, Codable {
    let id: UUID
    let index: Int              // Segment index (0, 1, 2...)
    let startTime: TimeInterval // Start time in original recording
    let endTime: TimeInterval   // End time in original recording
    let duration: TimeInterval  // Segment duration
    let fileURL: URL           // URL of the segment file
    let isOriginal: Bool       // True if this is the original file (no segmentation needed)

    init(
        index: Int,
        startTime: TimeInterval,
        endTime: TimeInterval,
        duration: TimeInterval,
        fileURL: URL,
        isOriginal: Bool = false
    ) {
        self.id = UUID()
        self.index = index
        self.startTime = startTime
        self.endTime = endTime
        self.duration = duration
        self.fileURL = fileURL
        self.isOriginal = isOriginal
    }

    /// Formatted duration string
    var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    /// Formatted start time string
    var formattedStartTime: String {
        let hours = Int(startTime) / 3_600
        let minutes = (Int(startTime) % 3_600) / 60
        let seconds = Int(startTime) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    /// File size in MB
    var fileSizeMB: Double {
        guard let fileSize = try? FileManager.default.attributesOfItem(atPath: fileURL.path)[.size] as? Int64 else {
            return 0
        }
        return Double(fileSize) / (1_024 * 1_024)
    }
}

// MARK: - Segmentation Statistics

struct SegmentationStats {
    let segmentCount: Int
    let totalDuration: TimeInterval
    let averageSegmentDuration: TimeInterval
    let totalFileSize: Int64
    let averageFileSize: Int64

    var formattedTotalDuration: String {
        let hours = Int(totalDuration) / 3_600
        let minutes = (Int(totalDuration) % 3_600) / 60
        return String(format: "%02d:%02d hours", hours, minutes)
    }

    var formattedTotalSize: String {
        let sizeMB = Double(totalFileSize) / (1_024 * 1_024)
        return String(format: "%.1f MB", sizeMB)
    }

    var formattedAverageSize: String {
        let sizeMB = Double(averageFileSize) / (1_024 * 1_024)
        return String(format: "%.1f MB", sizeMB)
    }
}

// MARK: - Errors

enum SegmentationError: LocalizedError {
    case exportFailed
    case invalidAudioFile
    case fileAccessError

    var errorDescription: String? {
        switch self {
        case .exportFailed:
            return "Impossibile esportare il segmento audio"
        case .invalidAudioFile:
            return "File audio non valido"
        case .fileAccessError:
            return "Impossibile accedere al file audio"
        }
    }
}
