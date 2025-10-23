import AVFoundation
import Foundation

/// Protocol for cross-platform text-to-speech management
@MainActor
protocol TextToSpeechManaging: AnyObject {
    // MARK: - Published State

    var isSpeaking: Bool { get }
    var isPaused: Bool { get }
    var currentProgress: Double { get }
    var currentText: String? { get }

    // MARK: - Configuration

    var rate: Float { get set }
    var pitch: Float { get set }
    var volume: Float { get set }
    var selectedVoice: AVSpeechSynthesisVoice? { get set }

    // MARK: - Callbacks

    var onSpeechStarted: (() -> Void)? { get set }
    var onSpeechFinished: (() -> Void)? { get set }
    var onSpeechPaused: (() -> Void)? { get set }
    var onSpeechResumed: (() -> Void)? { get set }
    var onWordBoundary: ((NSRange) -> Void)? { get set }

    // MARK: - Speech Methods

    /// Speak the given text
    func speak(_ text: String, language: String?)

    /// Speak formatted text (removes markdown, HTML, etc.)
    func speakFormatted(_ text: String, language: String?)

    /// Pause current speech
    func pause()

    /// Resume paused speech
    func resume()

    /// Stop current speech
    func stop()

    /// Speak long text by breaking it into chunks
    func speakLongText(_ text: String, chunkSize: Int, language: String?)

    /// Synthesize speech to audio data
    func synthesizeSpeech(text: String, voice: String, rate: Float) async throws -> Data
}
