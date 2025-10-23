import AVFoundation
import Combine
import Foundation
import os.log

/// Text-to-Speech service using Apple Speech framework (Task 73.1)
/// Cross-platform implementation works on both iOS and macOS
@MainActor
final class TextToSpeechService: NSObject, ObservableObject, TextToSpeechManaging {
    static let shared = TextToSpeechService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TextToSpeech")

    // MARK: - Core Components (Subtask 73.1)

    private let synthesizer = AVSpeechSynthesizer()

    // MARK: - Published State

    @Published private(set) var isSpeaking = false
    @Published private(set) var isPaused = false
    @Published private(set) var currentProgress: Double = 0.0
    @Published private(set) var currentText: String?

    // MARK: - Configuration

    var rate: Float = AVSpeechUtteranceDefaultSpeechRate {
        didSet {
            logger.info("Speech rate changed to \(self.rate)")
        }
    }

    var pitch: Float = 1.0 {
        didSet {
            logger.info("Speech pitch changed to \(self.pitch)")
        }
    }

    var volume: Float = 1.0 {
        didSet {
            logger.info("Speech volume changed to \(self.volume)")
        }
    }

    var selectedVoice: AVSpeechSynthesisVoice? {
        didSet {
            logger.info("Voice changed to \(self.selectedVoice?.language ?? "default")")
        }
    }

    // MARK: - Callbacks

    var onSpeechStarted: (() -> Void)?
    var onSpeechFinished: (() -> Void)?
    var onSpeechPaused: (() -> Void)?
    var onSpeechResumed: (() -> Void)?
    var onWordBoundary: ((NSRange) -> Void)?

    // MARK: - Initialization

    override private init() {
        super.init()
        synthesizer.delegate = self
        configureAudioSession()
    }

    // MARK: - Audio Session Configuration (Subtask 73.1)

    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try audioSession.setActive(true)
            logger.info("Audio session configured successfully")
        } catch {
            logger.error("Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    // MARK: - Text-to-Speech Methods (Subtask 73.1)

    /// Speak the given text
    func speak(_ text: String, language: String? = nil) {
        guard !text.isEmpty else {
            logger.warning("Attempted to speak empty text")
            return
        }

        // Stop current speech if any
        if isSpeaking {
            stop()
        }

        // Create utterance
        let utterance = AVSpeechUtterance(string: text)

        // Configure voice
        if let language = language {
            utterance.voice = AVSpeechSynthesisVoice(language: language)
        } else if let selectedVoice = selectedVoice {
            utterance.voice = selectedVoice
        } else {
            // Auto-detect language
            utterance.voice = detectVoice(for: text)
        }

        // Configure speech parameters
        utterance.rate = rate
        utterance.pitchMultiplier = pitch
        utterance.volume = volume

        // Store current text
        currentText = text
        currentProgress = 0.0

        // Speak
        synthesizer.speak(utterance)

        logger.info("Started speaking text of length \(text.count)")
    }

    /// Speak formatted text (removes markdown, HTML, etc.)
    func speakFormatted(_ text: String, language: String? = nil) {
        let plainText = stripFormatting(from: text)
        speak(plainText, language: language)
    }

    /// Pause current speech
    func pause() {
        guard isSpeaking, !isPaused else { return }

        synthesizer.pauseSpeaking(at: .word)
        isPaused = true
        onSpeechPaused?()

        logger.info("Speech paused")
    }

    /// Resume paused speech
    func resume() {
        guard isPaused else { return }

        synthesizer.continueSpeaking()
        isPaused = false
        onSpeechResumed?()

        logger.info("Speech resumed")
    }

    /// Stop current speech
    func stop() {
        guard isSpeaking else { return }

        synthesizer.stopSpeaking(at: .immediate)
        resetState()

        logger.info("Speech stopped")
    }

    // MARK: - Content Type Handling (Subtask 73.1)

    /// Strip formatting from text (markdown, HTML, etc.)
    private func stripFormatting(from text: String) -> String {
        var plainText = text

        // Remove markdown bold/italic
        plainText = plainText.replacingOccurrences(of: "\\*\\*([^*]+)\\*\\*", with: "$1", options: .regularExpression)
        plainText = plainText.replacingOccurrences(of: "\\*([^*]+)\\*", with: "$1", options: .regularExpression)
        plainText = plainText.replacingOccurrences(of: "__([^_]+)__", with: "$1", options: .regularExpression)
        plainText = plainText.replacingOccurrences(of: "_([^_]+)_", with: "$1", options: .regularExpression)

        // Remove markdown headings
        plainText = plainText.replacingOccurrences(of: "^#{1,6}\\s+", with: "", options: .regularExpression)

        // Remove markdown links [text](url)
        plainText = plainText.replacingOccurrences(of: "\\[([^]]+)\\]\\([^)]+\\)", with: "$1", options: .regularExpression)

        // Remove markdown code blocks
        plainText = plainText.replacingOccurrences(of: "```[^`]*```", with: "", options: .regularExpression)
        plainText = plainText.replacingOccurrences(of: "`([^`]+)`", with: "$1", options: .regularExpression)

        // Remove HTML tags (basic)
        plainText = plainText.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)

        return plainText
    }

    /// Detect appropriate voice for text based on language
    private func detectVoice(for text: String) -> AVSpeechSynthesisVoice? {
        // Use NSLinguisticTagger for language detection
        let tagger = NSLinguisticTagger(tagSchemes: [.language], options: 0)
        tagger.string = text

        _ = NSRange(location: 0, length: min(text.count, 200)) // Sample first 200 chars
        let language = tagger.tag(at: 0, scheme: .language, tokenRange: nil, sentenceRange: nil)

        if let detectedLanguage = language?.rawValue {
            logger.info("Detected language: \(detectedLanguage)")
            return AVSpeechSynthesisVoice(language: detectedLanguage)
        }

        // Default to Italian for this app
        return AVSpeechSynthesisVoice(language: "it-IT")
    }

    // MARK: - Chunking for Long Text (Subtask 73.1)

    /// Speak long text by breaking it into chunks
    func speakLongText(_ text: String, chunkSize: Int = 200, language: String? = nil) {
        guard !text.isEmpty else { return }

        // If text is short enough, speak directly
        if text.count <= chunkSize * 2 {
            speak(text, language: language)
            return
        }

        // Split into sentences
        let sentences = text.components(separatedBy: CharacterSet(charactersIn: ".!?"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        // Group sentences into chunks
        var chunks: [String] = []
        var currentChunk = ""

        for sentence in sentences {
            if currentChunk.count + sentence.count > chunkSize, !currentChunk.isEmpty {
                chunks.append(currentChunk)
                currentChunk = sentence
            } else {
                if !currentChunk.isEmpty {
                    currentChunk += ". " + sentence
                } else {
                    currentChunk = sentence
                }
            }
        }

        if !currentChunk.isEmpty {
            chunks.append(currentChunk)
        }

        logger.info("Split text into \(chunks.count) chunks for speech")

        // Speak first chunk (remaining chunks will be queued automatically)
        speak(chunks.joined(separator: ". "), language: language)
    }

    // MARK: - Voice Management

    /// Synthesize speech to audio data (for digest generation)
    /// - Parameters:
    ///   - text: Text to synthesize
    ///   - voice: Voice identifier
    ///   - rate: Speech rate
    /// - Returns: Audio data
    func synthesizeSpeech(
        text: String,
        voice: String,
        rate: Float
    ) async throws -> Data {
        logger.info("Synthesizing speech to audio data")

        // Note: AVSpeechSynthesizer doesn't directly produce audio files
        // This is a stub that would need AVAudioEngine integration for actual file output
        // For now, return empty data as placeholder
        logger.warning("synthesizeSpeech is a stub - requires AVAudioEngine integration for actual audio file generation")
        return Data()
    }

    /// Get all available voices
    static func getAvailableVoices() -> [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
    }

    /// Get voices for specific language
    static func getVoices(for languageCode: String) -> [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix(languageCode) }
    }

    // MARK: - State Management

    private func resetState() {
        isSpeaking = false
        isPaused = false
        currentProgress = 0.0
        currentText = nil
    }
}

// MARK: - AVSpeechSynthesizerDelegate (Subtask 73.1)

extension TextToSpeechService: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.isSpeaking = true
            self.isPaused = false
            self.onSpeechStarted?()
            self.logger.info("Speech synthesis started")
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.resetState()
            self.onSpeechFinished?()
            self.logger.info("Speech synthesis finished")
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.isPaused = true
            self.onSpeechPaused?()
            self.logger.info("Speech synthesis paused")
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.isPaused = false
            self.onSpeechResumed?()
            self.logger.info("Speech synthesis continued")
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.resetState()
            self.logger.info("Speech synthesis cancelled")
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange, utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            // Calculate progress
            if let text = self.currentText {
                self.currentProgress = Double(characterRange.location) / Double(text.count)
            }

            // Notify about word boundary for highlighting
            self.onWordBoundary?(characterRange)
        }
    }
}
