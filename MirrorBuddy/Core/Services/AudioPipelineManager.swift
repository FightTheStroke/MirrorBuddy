import Foundation
import AVFoundation
import os.log

/// Manager for audio pipeline operations for voice conversations
@MainActor
final class AudioPipelineManager: NSObject {
    /// Shared singleton instance
    static let shared = AudioPipelineManager()

    // MARK: - Properties

    private let audioSession = AVAudioSession.sharedInstance()
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Audio")

    /// Audio engine for processing
    private let audioEngine = AVAudioEngine()

    /// Microphone input node
    private var inputNode: AVAudioInputNode {
        audioEngine.inputNode
    }

    /// Audio player node for playback
    private let playerNode = AVAudioPlayerNode()

    /// Audio format for recording (PCM16 24kHz mono)
    private var recordingFormat: AVAudioFormat {
        AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 24000,
            channels: 1,
            interleaved: false
        )!
    }

    /// Whether audio pipeline is active
    private(set) var isActive = false

    /// Audio level monitoring
    private var audioLevelTimer: Timer?
    var currentInputLevel: Float = 0.0
    var currentOutputLevel: Float = 0.0

    // MARK: - Callbacks

    var onAudioData: ((Data) -> Void)?
    var onAudioLevelChanged: ((Float) -> Void)?
    var onError: ((Error) -> Void)?
    var onInterruption: ((Bool) -> Void)?  // true = began, false = ended

    // MARK: - Initialization

    private override init() {
        super.init()
        setupNotifications()
    }

    // MARK: - Audio Session Configuration

    /// Configure audio session for voice conversations
    func configureAudioSession() throws {
        do {
            // Set category for playback and recording with background support
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [
                    .allowBluetooth,
                    .allowBluetoothA2DP,
                    .allowAirPlay,
                    .defaultToSpeaker,
                    .mixWithOthers
                ]
            )

            // Configure for optimal voice quality
            try audioSession.setPreferredSampleRate(24000)
            try audioSession.setPreferredIOBufferDuration(0.005) // 5ms for low latency

            // Activate session
            try audioSession.setActive(true)

            logger.info("Audio session configured successfully")
        } catch {
            logger.error("Failed to configure audio session: \(error.localizedDescription)")
            throw AudioPipelineError.configurationFailed(error)
        }
    }

    /// Configure audio engine for recording and playback
    private func configureAudioEngine() throws {
        // Attach player node
        audioEngine.attach(playerNode)

        // Connect nodes
        audioEngine.connect(
            playerNode,
            to: audioEngine.mainMixerNode,
            format: recordingFormat
        )

        // Install tap on microphone for recording
        let inputFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(
            onBus: 0,
            bufferSize: 4096,
            format: inputFormat
        ) { [weak self] buffer, time in
            guard let self else { return }

            // Convert to target format if needed
            let convertedData = self.convertAudioBuffer(buffer, to: self.recordingFormat)

            // Update audio level
            self.updateInputAudioLevel(from: buffer)

            // Send audio data
            Task { @MainActor in
                self.onAudioData?(convertedData)
            }
        }

        // Prepare audio engine
        audioEngine.prepare()

        logger.info("Audio engine configured successfully")
    }

    // MARK: - Start/Stop Pipeline

    /// Start audio pipeline
    func start() async throws {
        guard !isActive else { return }

        do {
            // Configure session
            try configureAudioSession()

            // Configure engine
            try configureAudioEngine()

            // Start engine
            try audioEngine.start()

            isActive = true

            // Start audio level monitoring
            startAudioLevelMonitoring()

            logger.info("Audio pipeline started")
        } catch {
            logger.error("Failed to start audio pipeline: \(error.localizedDescription)")
            throw AudioPipelineError.startFailed(error)
        }
    }

    /// Stop audio pipeline
    func stop() {
        guard isActive else { return }

        // Stop audio level monitoring
        stopAudioLevelMonitoring()

        // Remove tap
        inputNode.removeTap(onBus: 0)

        // Stop engine
        audioEngine.stop()

        // Deactivate session
        try? audioSession.setActive(false)

        isActive = false

        logger.info("Audio pipeline stopped")
    }

    /// Pause audio pipeline
    func pause() {
        guard isActive else { return }
        audioEngine.pause()
        stopAudioLevelMonitoring()
        logger.info("Audio pipeline paused")
    }

    /// Resume audio pipeline
    func resume() throws {
        guard isActive else { return }

        do {
            try audioEngine.start()
            startAudioLevelMonitoring()
            logger.info("Audio pipeline resumed")
        } catch {
            logger.error("Failed to resume audio pipeline: \(error.localizedDescription)")
            throw AudioPipelineError.resumeFailed(error)
        }
    }

    // MARK: - Audio Playback

    /// Play audio data through the output
    func play(audioData: Data) throws {
        guard isActive else {
            throw AudioPipelineError.pipelineNotActive
        }

        // Convert data to audio buffer
        let audioBuffer = try convertDataToAudioBuffer(audioData, format: recordingFormat)

        // Schedule buffer for playback
        playerNode.scheduleBuffer(audioBuffer) {
            self.logger.debug("Audio playback completed")
        }

        // Start player if not already playing
        if !playerNode.isPlaying {
            playerNode.play()
        }
    }

    // MARK: - Audio Format Conversion

    /// Convert audio buffer to target format
    private func convertAudioBuffer(_ buffer: AVAudioPCMBuffer, to format: AVAudioFormat) -> Data {
        guard let converter = AVAudioConverter(from: buffer.format, to: format) else {
            // If conversion fails, return original buffer data
            return bufferToData(buffer)
        }

        // Calculate output buffer size
        let capacity = AVAudioFrameCount(
            Double(buffer.frameLength) * format.sampleRate / buffer.format.sampleRate
        )

        guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else {
            return bufferToData(buffer)
        }

        var error: NSError?
        let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        converter.convert(to: convertedBuffer, error: &error, withInputFrom: inputBlock)

        if let error {
            logger.error("Audio conversion error: \(error.localizedDescription)")
            return bufferToData(buffer)
        }

        return bufferToData(convertedBuffer)
    }

    /// Convert PCM buffer to Data
    private func bufferToData(_ buffer: AVAudioPCMBuffer) -> Data {
        let audioBuffer = buffer.audioBufferList.pointee.mBuffers
        return Data(bytes: audioBuffer.mData!, count: Int(audioBuffer.mDataByteSize))
    }

    /// Convert Data to audio buffer
    private func convertDataToAudioBuffer(_ data: Data, format: AVAudioFormat) throws -> AVAudioPCMBuffer {
        let frameLength = UInt32(data.count) / format.streamDescription.pointee.mBytesPerFrame

        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameLength) else {
            throw AudioPipelineError.bufferCreationFailed
        }

        buffer.frameLength = frameLength

        let audioBuffer = buffer.audioBufferList.pointee.mBuffers
        data.withUnsafeBytes { bytes in
            guard let baseAddress = bytes.baseAddress else { return }
            audioBuffer.mData?.copyMemory(from: baseAddress, byteCount: Int(audioBuffer.mDataByteSize))
        }

        return buffer
    }

    // MARK: - Audio Level Monitoring

    /// Start monitoring audio levels
    private func startAudioLevelMonitoring() {
        audioLevelTimer?.invalidate()
        audioLevelTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self else { return }

            // Enable metering
            self.audioSession.setActive(true, options: [])

            // Update levels
            Task { @MainActor in
                self.onAudioLevelChanged?(self.currentInputLevel)
            }
        }
    }

    /// Stop monitoring audio levels
    private func stopAudioLevelMonitoring() {
        audioLevelTimer?.invalidate()
        audioLevelTimer = nil
        currentInputLevel = 0.0
        currentOutputLevel = 0.0
    }

    /// Update input audio level from buffer
    private func updateInputAudioLevel(from buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }

        let channelDataValue = channelData.pointee
        let channelDataValueArray = stride(from: 0, to: Int(buffer.frameLength), by: buffer.stride).map { channelDataValue[$0] }

        let rms = sqrt(channelDataValueArray.map { $0 * $0 }.reduce(0, +) / Float(buffer.frameLength))

        // Convert to dB
        let avgPower = 20 * log10(rms)

        // Normalize to 0-1 range
        let normalizedLevel = max(0, min(1, (avgPower + 60) / 60))

        Task { @MainActor in
            self.currentInputLevel = normalizedLevel
        }
    }

    // MARK: - Interruption Handling

    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption),
            name: AVAudioSession.interruptionNotification,
            object: audioSession
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: audioSession
        )
    }

    @objc
    private func handleInterruption(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        _Concurrency.Task { @MainActor in
            switch type {
            case .began:
                logger.info("Audio interruption began")
                pause()
                onInterruption?(true)

            case .ended:
                logger.info("Audio interruption ended")
                if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                    let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                    if options.contains(.shouldResume) {
                        try? resume()
                        onInterruption?(false)
                    }
                }

            @unknown default:
                break
            }
        }
    }

    @objc
    private func handleRouteChange(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        _Concurrency.Task { @MainActor in
            switch reason {
            case .newDeviceAvailable:
                logger.info("New audio device available")

            case .oldDeviceUnavailable:
                logger.info("Audio device disconnected")
                // May need to pause or adjust configuration

            case .categoryChange:
                logger.info("Audio category changed")

            default:
                break
            }
        }
    }

    // MARK: - Audio Device Information

    /// Get current audio input device
    func getCurrentAudioInput() -> String? {
        let currentRoute = audioSession.currentRoute
        for input in currentRoute.inputs {
            return input.portName
        }
        return nil
    }

    /// Get current audio output device
    func getCurrentAudioOutput() -> String? {
        let currentRoute = audioSession.currentRoute
        for output in currentRoute.outputs {
            return output.portName
        }
        return nil
    }

    /// Check if AirPods are connected
    func isUsingAirPods() -> Bool {
        let currentRoute = audioSession.currentRoute
        for output in currentRoute.outputs {
            if output.portType == .bluetoothA2DP || output.portType == .bluetoothLE {
                return output.portName.lowercased().contains("airpods")
            }
        }
        return false
    }

    // MARK: - Cleanup

    nonisolated deinit {
        NotificationCenter.default.removeObserver(self)
        // Note: Cannot call @MainActor method from deinit
        // Caller is responsible for calling stop() before deallocation
    }
}

// MARK: - Audio Pipeline Errors

enum AudioPipelineError: LocalizedError {
    case configurationFailed(Error)
    case startFailed(Error)
    case stopFailed(Error)
    case resumeFailed(Error)
    case pipelineNotActive
    case bufferCreationFailed
    case conversionFailed

    var errorDescription: String? {
        switch self {
        case let .configurationFailed(error):
            return "Failed to configure audio session: \(error.localizedDescription)"
        case let .startFailed(error):
            return "Failed to start audio pipeline: \(error.localizedDescription)"
        case let .stopFailed(error):
            return "Failed to stop audio pipeline: \(error.localizedDescription)"
        case let .resumeFailed(error):
            return "Failed to resume audio pipeline: \(error.localizedDescription)"
        case .pipelineNotActive:
            return "Audio pipeline is not active"
        case .bufferCreationFailed:
            return "Failed to create audio buffer"
        case .conversionFailed:
            return "Failed to convert audio format"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .configurationFailed:
            return "Check audio permissions in Settings and try again."
        case .startFailed, .resumeFailed:
            return "Ensure no other apps are using the microphone and try again."
        case .pipelineNotActive:
            return "Start the audio pipeline before attempting to play or record."
        default:
            return "Please try again or restart the app."
        }
    }
}
