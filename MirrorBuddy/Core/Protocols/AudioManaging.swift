import AVFoundation
import Combine
import Foundation

/// Protocol for cross-platform audio pipeline management
@MainActor
protocol AudioManaging: AnyObject {
    // MARK: - Published State

    var isRecording: Bool { get }
    var isPaused: Bool { get }
    var recordingDuration: TimeInterval { get }

    // MARK: - Audio Session Management

    /// Configure audio session for recording
    func configureAudioSession() throws

    /// Deactivate audio session
    func deactivateAudioSession() throws

    // MARK: - Recording Control

    /// Start recording audio
    func startRecording() throws

    /// Stop recording and return audio data
    func stopRecording() throws -> Data

    /// Pause recording
    func pauseRecording() throws

    /// Resume recording
    func resumeRecording() throws

    /// Cancel recording
    func cancelRecording()

    // MARK: - Audio Processing

    /// Convert audio data to base64 encoded PCM16 at 24kHz
    func convertToBase64PCM16(_ audioData: Data) throws -> String

    /// Get current audio level (0.0 to 1.0)
    func getAudioLevel() -> Float

    // MARK: - Format Information

    /// Get the recording format being used
    var recordingFormat: AVAudioFormat { get }
}

/// Audio format configuration for cross-platform compatibility
struct AudioConfiguration {
    /// Sample rate for recording
    let sampleRate: Double

    /// Number of channels
    let channels: UInt32

    /// Audio format (PCM16, PCM32, etc.)
    let commonFormat: AVAudioCommonFormat

    /// Standard configuration (24kHz PCM16 mono)
    static let standard = AudioConfiguration(
        sampleRate: 24_000,
        channels: 1,
        commonFormat: .pcmFormatInt16
    )

    /// Fallback configuration (16kHz PCM16 mono)
    static let fallback = AudioConfiguration(
        sampleRate: 16_000,
        channels: 1,
        commonFormat: .pcmFormatInt16
    )
}
