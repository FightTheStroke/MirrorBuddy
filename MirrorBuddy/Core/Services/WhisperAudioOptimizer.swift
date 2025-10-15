//
//  WhisperAudioOptimizer.swift
//  MirrorBuddy
//
//  Service for optimizing audio chunks for Whisper API compatibility
//  Validates format, file size, and prepares metadata (Task 93.2)
//

import Foundation
import AVFoundation
import os.log

/// Service for optimizing and validating audio chunks for Whisper API transcription
@MainActor
final class WhisperAudioOptimizer {
    static let shared = WhisperAudioOptimizer()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "WhisperOptimizer")

    // MARK: - Configuration

    /// Whisper API maximum file size (25 MB)
    private let maxFileSizeBytes: Int64 = 25 * 1024 * 1024 // 25 MB

    /// Whisper-supported audio formats
    private let supportedFormats: Set<String> = [
        "m4a", "mp3", "mp4", "mpeg", "mpga", "wav", "webm", "flac", "ogg"
    ]

    /// Optimal audio settings for Whisper API
    private struct OptimalSettings {
        static let sampleRate: Double = 16000.0  // 16 kHz (Whisper's native sample rate)
        static let bitRate: Int = 32000          // 32 kbps (good balance of quality and size)
        static let channels: UInt32 = 1          // Mono (Whisper works best with mono)
        static let format: String = "m4a"        // M4A with AAC codec
    }

    private init() {}

    // MARK: - Audio Optimization

    /// Optimize audio segment for Whisper API
    /// - Parameter segment: The audio segment to optimize
    /// - Returns: Optimized audio segment (may be the same if already optimal)
    func optimizeSegment(_ segment: AudioSegment) async throws -> OptimizedAudioSegment {
        logger.info("Optimizing segment \(segment.index) for Whisper API")

        // Step 1: Validate file exists
        guard FileManager.default.fileExists(atPath: segment.fileURL.path) else {
            throw OptimizationError.fileNotFound
        }

        // Step 2: Check file size
        let fileSize = try getFileSize(at: segment.fileURL)
        logger.info("Segment \(segment.index) size: \(fileSize) bytes (\(Double(fileSize) / (1024 * 1024)) MB)")

        // Step 3: Validate format
        let fileExtension = segment.fileURL.pathExtension.lowercased()
        guard supportedFormats.contains(fileExtension) else {
            throw OptimizationError.unsupportedFormat(fileExtension)
        }

        // Step 4: Load audio asset and check properties
        let asset = AVURLAsset(url: segment.fileURL)
        let audioTracks = try await asset.loadTracks(withMediaType: .audio)

        guard let audioTrack = audioTracks.first else {
            throw OptimizationError.noAudioTrack
        }

        // Get current audio settings
        let formatDescriptions = try await audioTrack.load(.formatDescriptions)
        let currentSampleRate = try await getSampleRate(from: formatDescriptions)
        let currentChannels = try await getChannelCount(from: formatDescriptions)

        logger.info("Current settings - Sample rate: \(currentSampleRate) Hz, Channels: \(currentChannels)")

        // Step 5: Decide if optimization is needed
        let needsOptimization = fileSize > maxFileSizeBytes ||
                               currentSampleRate > OptimalSettings.sampleRate * 1.5 ||
                               currentChannels > OptimalSettings.channels

        if needsOptimization {
            logger.info("Segment \(segment.index) needs optimization")
            // Re-export with optimal settings
            let optimizedURL = try await reexportAudio(
                from: segment.fileURL,
                chunkIndex: segment.index,
                startTime: segment.startTime
            )

            let optimizedSize = try getFileSize(at: optimizedURL)

            return OptimizedAudioSegment(
                originalSegment: segment,
                optimizedURL: optimizedURL,
                originalFileSize: fileSize,
                optimizedFileSize: optimizedSize,
                wasOptimized: true,
                sampleRate: OptimalSettings.sampleRate,
                channels: Int(OptimalSettings.channels),
                format: OptimalSettings.format
            )
        } else {
            logger.info("Segment \(segment.index) already optimal, no re-export needed")

            return OptimizedAudioSegment(
                originalSegment: segment,
                optimizedURL: segment.fileURL,
                originalFileSize: fileSize,
                optimizedFileSize: fileSize,
                wasOptimized: false,
                sampleRate: currentSampleRate,
                channels: currentChannels,
                format: fileExtension
            )
        }
    }

    /// Optimize multiple segments in batch
    func optimizeSegments(_ segments: [AudioSegment]) async throws -> [OptimizedAudioSegment] {
        logger.info("Optimizing \(segments.count) segments for Whisper API")

        var optimizedSegments: [OptimizedAudioSegment] = []

        for segment in segments {
            let optimized = try await optimizeSegment(segment)
            optimizedSegments.append(optimized)
        }

        // Log statistics
        let totalOriginalSize = optimizedSegments.reduce(0) { $0 + $1.originalFileSize }
        let totalOptimizedSize = optimizedSegments.reduce(0) { $0 + $1.optimizedFileSize }
        let reductionPercent = (1.0 - Double(totalOptimizedSize) / Double(totalOriginalSize)) * 100

        logger.info("""
            Optimization complete:
            - Original total size: \(Double(totalOriginalSize) / (1024 * 1024)) MB
            - Optimized total size: \(Double(totalOptimizedSize) / (1024 * 1024)) MB
            - Reduction: \(reductionPercent)%
            """)

        return optimizedSegments
    }

    // MARK: - Audio Re-export

    /// Re-export audio with optimal Whisper API settings
    private func reexportAudio(
        from sourceURL: URL,
        chunkIndex: Int,
        startTime: TimeInterval
    ) async throws -> URL {
        let asset = AVURLAsset(url: sourceURL)

        // Create output URL in temporary directory
        let outputURL = try createOptimizedURL(chunkIndex: chunkIndex)

        // Remove existing file if present
        try? FileManager.default.removeItem(at: outputURL)

        // Configure export session
        guard let exportSession = AVAssetExportSession(
            asset: asset,
            presetName: AVAssetExportPresetAppleM4A
        ) else {
            throw OptimizationError.exportFailed
        }

        exportSession.outputURL = outputURL
        exportSession.outputFileType = .m4a

        // Set audio mix to convert to mono if needed
        let audioMix = AVMutableAudioMix()
        let audioTracks = try await asset.loadTracks(withMediaType: .audio)

        if let audioTrack = audioTracks.first {
            let audioMixInputParameters = AVMutableAudioMixInputParameters(track: audioTrack)
            audioMixInputParameters.trackID = audioTrack.trackID
            audioMix.inputParameters = [audioMixInputParameters]
        }

        exportSession.audioMix = audioMix

        // Export
        await exportSession.export()

        if exportSession.status == .completed {
            logger.info("Re-export completed for chunk \(chunkIndex)")
            return outputURL
        } else if let error = exportSession.error {
            logger.error("Re-export failed: \(error.localizedDescription)")
            throw OptimizationError.exportFailed
        } else {
            throw OptimizationError.exportFailed
        }
    }

    // MARK: - Audio Properties

    /// Get sample rate from format descriptions
    private func getSampleRate(from formatDescriptions: [CMFormatDescription]) async throws -> Double {
        guard let formatDescription = formatDescriptions.first else {
            throw OptimizationError.invalidAudioFormat
        }

        let audioStreamBasicDescription = CMAudioFormatDescriptionGetStreamBasicDescription(formatDescription)
        return audioStreamBasicDescription?.pointee.mSampleRate ?? 44100.0
    }

    /// Get channel count from format descriptions
    private func getChannelCount(from formatDescriptions: [CMFormatDescription]) async throws -> Int {
        guard let formatDescription = formatDescriptions.first else {
            throw OptimizationError.invalidAudioFormat
        }

        let audioStreamBasicDescription = CMAudioFormatDescriptionGetStreamBasicDescription(formatDescription)
        return Int(audioStreamBasicDescription?.pointee.mChannelsPerFrame ?? 1)
    }

    // MARK: - File Management

    /// Get file size in bytes
    private func getFileSize(at url: URL) throws -> Int64 {
        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        return attributes[.size] as? Int64 ?? 0
    }

    /// Create URL for optimized audio chunk
    private func createOptimizedURL(chunkIndex: Int) throws -> URL {
        let tempDirectory = FileManager.default.temporaryDirectory
        let optimizedDirectory = tempDirectory.appendingPathComponent("WhisperOptimized", isDirectory: true)

        // Create directory if needed
        try FileManager.default.createDirectory(
            at: optimizedDirectory,
            withIntermediateDirectories: true
        )

        let fileName = "optimized_chunk_\(chunkIndex)_\(Int(Date().timeIntervalSince1970)).m4a"
        return optimizedDirectory.appendingPathComponent(fileName)
    }

    // MARK: - Validation

    /// Validate that an optimized segment meets Whisper API requirements
    func validateForWhisper(_ segment: OptimizedAudioSegment) throws {
        // Check file size
        guard segment.optimizedFileSize <= maxFileSizeBytes else {
            throw OptimizationError.fileTooLarge(segment.optimizedFileSize, maxFileSizeBytes)
        }

        // Check format
        guard supportedFormats.contains(segment.format.lowercased()) else {
            throw OptimizationError.unsupportedFormat(segment.format)
        }

        // Check file exists
        guard FileManager.default.fileExists(atPath: segment.optimizedURL.path) else {
            throw OptimizationError.fileNotFound
        }

        logger.info("Segment \(segment.originalSegment.index) validated for Whisper API")
    }

    /// Validate all segments
    func validateAll(_ segments: [OptimizedAudioSegment]) throws {
        for segment in segments {
            try validateForWhisper(segment)
        }
        logger.info("All \(segments.count) segments validated successfully")
    }

    // MARK: - Cleanup

    /// Clean up optimized audio files after transcription
    func cleanupOptimizedSegments(_ segments: [OptimizedAudioSegment]) async {
        logger.info("Cleaning up \(segments.count) optimized segments")

        for segment in segments {
            // Only delete if optimization created a new file
            guard segment.wasOptimized else { continue }

            do {
                try FileManager.default.removeItem(at: segment.optimizedURL)
                logger.info("Deleted optimized chunk: \(segment.optimizedURL.lastPathComponent)")
            } catch {
                logger.error("Failed to delete \(segment.optimizedURL.lastPathComponent): \(error.localizedDescription)")
            }
        }
    }

    /// Clean up all temporary optimized files
    func cleanupAllOptimizedFiles() async {
        logger.info("Cleaning up all optimized audio files")

        let tempDirectory = FileManager.default.temporaryDirectory
        let optimizedDirectory = tempDirectory.appendingPathComponent("WhisperOptimized", isDirectory: true)

        guard FileManager.default.fileExists(atPath: optimizedDirectory.path) else {
            logger.info("No optimized files directory found")
            return
        }

        do {
            let files = try FileManager.default.contentsOfDirectory(
                at: optimizedDirectory,
                includingPropertiesForKeys: nil,
                options: .skipsHiddenFiles
            )

            for fileURL in files {
                try FileManager.default.removeItem(at: fileURL)
            }

            logger.info("Deleted \(files.count) optimized files")

        } catch {
            logger.error("Cleanup failed: \(error.localizedDescription)")
        }
    }
}

// MARK: - Optimized Audio Segment Model

/// Represents an audio segment optimized for Whisper API
struct OptimizedAudioSegment: Identifiable {
    let id: UUID
    let originalSegment: AudioSegment
    let optimizedURL: URL
    let originalFileSize: Int64
    let optimizedFileSize: Int64
    let wasOptimized: Bool
    let sampleRate: Double
    let channels: Int
    let format: String

    init(
        originalSegment: AudioSegment,
        optimizedURL: URL,
        originalFileSize: Int64,
        optimizedFileSize: Int64,
        wasOptimized: Bool,
        sampleRate: Double,
        channels: Int,
        format: String
    ) {
        self.id = UUID()
        self.originalSegment = originalSegment
        self.optimizedURL = optimizedURL
        self.originalFileSize = originalFileSize
        self.optimizedFileSize = optimizedFileSize
        self.wasOptimized = wasOptimized
        self.sampleRate = sampleRate
        self.channels = channels
        self.format = format
    }

    /// File size in MB
    var fileSizeMB: Double {
        Double(optimizedFileSize) / (1024 * 1024)
    }

    /// Size reduction percentage (if optimized)
    var sizeReductionPercent: Double {
        guard wasOptimized, originalFileSize > 0 else { return 0 }
        return (1.0 - Double(optimizedFileSize) / Double(originalFileSize)) * 100
    }

    /// Formatted file size
    var formattedFileSize: String {
        if fileSizeMB < 1 {
            return String(format: "%.1f KB", Double(optimizedFileSize) / 1024)
        } else {
            return String(format: "%.1f MB", fileSizeMB)
        }
    }

    /// Audio settings summary
    var settingsSummary: String {
        "\(format.uppercased()), \(Int(sampleRate / 1000))kHz, \(channels == 1 ? "Mono" : "Stereo")"
    }
}

// MARK: - Optimization Statistics

struct OptimizationStats {
    let totalSegments: Int
    let optimizedSegments: Int
    let totalOriginalSize: Int64
    let totalOptimizedSize: Int64

    var averageReduction: Double {
        guard totalOriginalSize > 0 else { return 0 }
        return (1.0 - Double(totalOptimizedSize) / Double(totalOriginalSize)) * 100
    }

    var formattedOriginalSize: String {
        let sizeMB = Double(totalOriginalSize) / (1024 * 1024)
        return String(format: "%.1f MB", sizeMB)
    }

    var formattedOptimizedSize: String {
        let sizeMB = Double(totalOptimizedSize) / (1024 * 1024)
        return String(format: "%.1f MB", sizeMB)
    }
}

// MARK: - Errors

enum OptimizationError: LocalizedError {
    case fileNotFound
    case unsupportedFormat(String)
    case fileTooLarge(Int64, Int64)
    case noAudioTrack
    case invalidAudioFormat
    case exportFailed

    var errorDescription: String? {
        switch self {
        case .fileNotFound:
            return "File audio non trovato"
        case .unsupportedFormat(let format):
            return "Formato audio non supportato: \(format)"
        case .fileTooLarge(let size, let max):
            let sizeMB = Double(size) / (1024 * 1024)
            let maxMB = Double(max) / (1024 * 1024)
            return "File troppo grande: \(String(format: "%.1f", sizeMB)) MB (massimo \(String(format: "%.1f", maxMB)) MB)"
        case .noAudioTrack:
            return "Nessuna traccia audio trovata nel file"
        case .invalidAudioFormat:
            return "Formato audio non valido"
        case .exportFailed:
            return "Impossibile esportare l'audio ottimizzato"
        }
    }
}
