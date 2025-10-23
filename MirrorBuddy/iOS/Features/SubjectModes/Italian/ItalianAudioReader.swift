import AVFoundation
import os.log

/// Text-to-speech audio reader for Italian texts using AVSpeechSynthesizer
@MainActor
final class ItalianAudioReader: NSObject, AVSpeechSynthesizerDelegate {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ItalianAudio")
    private let synthesizer = AVSpeechSynthesizer()

    private(set) var isPlaying = false
    private(set) var isPaused = false
    private(set) var currentText: String?

    var onFinished: (() -> Void)?
    var onProgress: ((Double) -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    // MARK: - Playback Control

    /// Read Italian text aloud
    func read(_ text: String, rate: Float = 0.5, voice: ItalianVoice = .default) {
        stop() // Stop any current playback

        currentText = text

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice.avVoice
        utterance.rate = rate
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        isPlaying = true
        isPaused = false
        synthesizer.speak(utterance)

        logger.info("Started reading Italian text")
    }

    /// Pause playback
    func pause() {
        guard isPlaying && !isPaused else { return }

        synthesizer.pauseSpeaking(at: .word)
        isPaused = true
        logger.info("Paused audio playback")
    }

    /// Resume playback
    func resume() {
        guard isPlaying && isPaused else { return }

        synthesizer.continueSpeaking()
        isPaused = false
        logger.info("Resumed audio playback")
    }

    /// Stop playback
    func stop() {
        guard isPlaying else { return }

        synthesizer.stopSpeaking(at: .immediate)
        isPlaying = false
        isPaused = false
        currentText = nil
        logger.info("Stopped audio playback")
    }

    // MARK: - Sentence-by-Sentence Reading

    /// Read text sentence by sentence with pauses
    func readSentenceBySentence(_ text: String, pauseDuration: TimeInterval = 0.5) {
        let sentences = text.components(separatedBy: CharacterSet(charactersIn: ".!?"))
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

        readSentences(sentences, index: 0, pauseDuration: pauseDuration)
    }

    private func readSentences(_ sentences: [String], index: Int, pauseDuration: TimeInterval) {
        guard index < sentences.count else {
            onFinished?()
            return
        }

        let sentence = sentences[index].trimmingCharacters(in: .whitespacesAndNewlines)

        onFinished = { [weak self] in
            DispatchQueue.main.asyncAfter(deadline: .now() + pauseDuration) {
                self?.readSentences(sentences, index: index + 1, pauseDuration: pauseDuration)
            }
        }

        read(sentence)
    }

    // MARK: - AVSpeechSynthesizerDelegate

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.isPlaying = false
            self.isPaused = false
            self.logger.info("Finished reading")
            self.onFinished?()
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange, utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            guard let text = self.currentText else { return }
            let progress = Double(characterRange.location) / Double(text.count)
            self.onProgress?(progress)
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            self.isPlaying = false
            self.isPaused = false
            self.logger.info("Cancelled reading")
        }
    }
}

// MARK: - Supporting Types

enum ItalianVoice {
    case `default`
    case male
    case female

    var avVoice: AVSpeechSynthesisVoice? {
        // Try to get Italian voice
        let italianVoices = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.starts(with: "it") }

        switch self {
        case .default:
            return italianVoices.first ?? AVSpeechSynthesisVoice(language: "it-IT")
        case .male:
            return italianVoices.first { $0.gender == .male } ?? italianVoices.first
        case .female:
            return italianVoices.first { $0.gender == .female } ?? italianVoices.first
        }
    }
}
