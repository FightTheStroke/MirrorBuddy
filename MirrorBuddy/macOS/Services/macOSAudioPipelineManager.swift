import AVFoundation
import Combine
import Foundation
import os.log

/// macOS-native audio pipeline manager using native macOS audio APIs
@MainActor
final class macOSAudioPipelineManager: NSObject, AudioManaging {
    static let shared = macOSAudioPipelineManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "AudioPipeline-macOS")

    // MARK: - Audio Engine Components

    private let audioEngine = AVAudioEngine()
    private var audioFile: AVAudioFile?
    private var recordingBuffer: AVAudioPCMBuffer?
    private var accumulatedBuffer: [Float] = []

    // MARK: - Published State

    @Published private(set) var isRecording = false
    @Published private(set) var isPaused = false
    @Published private(set) var recordingDuration: TimeInterval = 0

    // MARK: - Recording State

    private var recordingStartTime: Date?
    private var pausedTime: TimeInterval = 0
    private var recordingTimer: Timer?

    // MARK: - Audio Format (3-tier fallback strategy)

    private(set) lazy var recordingFormat: AVAudioFormat = {
        // Tier 1: Try standard 24kHz PCM16 mono
        if let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 24_000,
            channels: 1,
            interleaved: false
        ) {
            logger.info("Using standard 24kHz PCM16 audio format")
            return format
        }

        // Tier 2: Try fallback 16kHz PCM16 mono
        if let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16_000,
            channels: 1,
            interleaved: false
        ) {
            logger.warning("Using fallback 16kHz PCM16 audio format (24kHz unavailable)")
            return format
        }

        // Tier 3: Use input node's native format
        logger.error("Standard formats unavailable, using input node native format")
        return audioEngine.inputNode.inputFormat(forBus: 0)
    }()

    // MARK: - Initialization

    override private init() {
        super.init()
    }

    // MARK: - Audio Session Management (macOS-specific)

    func configureAudioSession() throws {
        // macOS doesn't use AVAudioSession like iOS
        // Audio configuration is handled through AVAudioEngine directly
        logger.info("Audio session configured (macOS native)")
    }

    func deactivateAudioSession() throws {
        // No-op on macOS (no AVAudioSession)
        logger.info("Audio session deactivated (macOS native)")
    }

    // MARK: - Recording Control

    func startRecording() throws {
        guard !isRecording else {
            logger.warning("Already recording")
            return
        }

        // Reset state
        accumulatedBuffer.removeAll()
        recordingDuration = 0
        pausedTime = 0

        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.inputFormat(forBus: 0)

        // Install tap on input node
        inputNode.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, _ in
            guard let self = self, !self.isPaused else { return }

            // Convert to recording format if needed
            if inputFormat != self.recordingFormat {
                guard let convertedBuffer = self.convert(buffer: buffer, to: self.recordingFormat) else {
                    return
                }
                self.accumulate(buffer: convertedBuffer)
            } else {
                self.accumulate(buffer: buffer)
            }
        }

        // Start audio engine
        try audioEngine.start()

        // Update state
        isRecording = true
        recordingStartTime = Date()

        // Start timer for duration tracking
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.updateRecordingDuration()
            }
        }

        logger.info("Recording started (macOS)")
    }

    func stopRecording() throws -> Data {
        guard isRecording else {
            throw AudioError.notRecording
        }

        // Stop engine and remove tap
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        // Stop timer
        recordingTimer?.invalidate()
        recordingTimer = nil

        // Convert accumulated buffer to Data
        let audioData = convertBufferToData()

        // Reset state
        isRecording = false
        isPaused = false
        recordingStartTime = nil
        accumulatedBuffer.removeAll()

        logger.info("Recording stopped, captured \(audioData.count) bytes (macOS)")
        return audioData
    }

    func pauseRecording() throws {
        guard isRecording, !isPaused else {
            throw AudioError.invalidState
        }

        isPaused = true
        pausedTime = recordingDuration

        logger.info("Recording paused (macOS)")
    }

    func resumeRecording() throws {
        guard isRecording, isPaused else {
            throw AudioError.invalidState
        }

        isPaused = false
        recordingStartTime = Date().addingTimeInterval(-pausedTime)

        logger.info("Recording resumed (macOS)")
    }

    func cancelRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        recordingTimer?.invalidate()
        recordingTimer = nil

        isRecording = false
        isPaused = false
        recordingStartTime = nil
        accumulatedBuffer.removeAll()

        logger.info("Recording cancelled (macOS)")
    }

    // MARK: - Audio Processing

    func convertToBase64PCM16(_ audioData: Data) throws -> String {
        // Audio data is already in PCM16 format from our recording
        return audioData.base64EncodedString()
    }

    func getAudioLevel() -> Float {
        guard isRecording, !isPaused else { return 0.0 }

        // Calculate average level from recent samples
        let recentSamples = accumulatedBuffer.suffix(1024)
        guard !recentSamples.isEmpty else { return 0.0 }

        let sum = recentSamples.reduce(0.0) { $0 + abs($1) }
        let average = sum / Float(recentSamples.count)

        return min(average, 1.0)
    }

    // MARK: - Private Helpers

    private func accumulate(buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }

        let channelDataValue = channelData.pointee
        let channelDataArray = Array(UnsafeBufferPointer(start: channelDataValue, count: Int(buffer.frameLength)))

        accumulatedBuffer.append(contentsOf: channelDataArray)
    }

    private func convert(buffer: AVAudioPCMBuffer, to format: AVAudioFormat) -> AVAudioPCMBuffer? {
        guard let converter = AVAudioConverter(from: buffer.format, to: format) else {
            logger.error("Failed to create audio converter")
            return nil
        }

        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * format.sampleRate / buffer.format.sampleRate)
        guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else {
            logger.error("Failed to create converted buffer")
            return nil
        }

        var error: NSError?
        let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        converter.convert(to: convertedBuffer, error: &error, withInputFrom: inputBlock)

        if let error = error {
            logger.error("Audio conversion error: \(error.localizedDescription)")
            return nil
        }

        return convertedBuffer
    }

    private func convertBufferToData() -> Data {
        // Convert float samples to Int16 PCM data
        var pcmData = Data()

        for sample in accumulatedBuffer {
            let clampedSample = max(-1.0, min(1.0, sample))
            let int16Sample = Int16(clampedSample * Float(Int16.max))

            var sampleValue = int16Sample
            pcmData.append(Data(bytes: &sampleValue, count: MemoryLayout<Int16>.size))
        }

        return pcmData
    }

    private func updateRecordingDuration() {
        guard let startTime = recordingStartTime, !isPaused else { return }
        recordingDuration = Date().timeIntervalSince(startTime)
    }
}

// MARK: - Audio Errors

enum AudioError: LocalizedError {
    case notRecording
    case invalidState
    case conversionFailed

    var errorDescription: String? {
        switch self {
        case .notRecording:
            return "Not currently recording"
        case .invalidState:
            return "Invalid recording state"
        case .conversionFailed:
            return "Audio format conversion failed"
        }
    }
}
