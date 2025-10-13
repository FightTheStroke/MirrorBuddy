import Foundation
import Speech
import AVFoundation
import Combine
import os.log

/// Voice command recognition service using Apple Speech framework (Task 29.1)
@MainActor
final class VoiceCommandRecognitionService: NSObject, ObservableObject {
    static let shared = VoiceCommandRecognitionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VoiceCommands")

    // MARK: - Published State (Subtask 29.1)

    @Published private(set) var isListening = false
    @Published private(set) var isAuthorized = false
    @Published private(set) var recognizedText = ""
    @Published private(set) var lastCommand: String?

    // MARK: - Speech Recognition Components (Subtask 29.1)

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    // MARK: - Configuration

    private var currentLanguage: String = "it-IT" {
        didSet {
            setupRecognizer()
        }
    }

    // MARK: - Callbacks

    var onCommandRecognized: ((String) -> Void)?
    var onPartialResult: ((String) -> Void)?
    var onError: ((Error) -> Void)?

    // MARK: - Initialization

    private override init() {
        super.init()
        setupRecognizer()
        configureAudioSession()
    }

    // MARK: - Setup (Subtask 29.1)

    private func setupRecognizer() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: currentLanguage))
        speechRecognizer?.delegate = self

        logger.info("Speech recognizer initialized for \(self.currentLanguage)")
    }

    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

            logger.info("Audio session configured for voice recognition")
        } catch {
            logger.error("Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    // MARK: - Permission Handling (Subtask 29.1)

    /// Request authorization for speech recognition
    func requestAuthorization() async -> Bool {
        let authStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }

        let authorized = authStatus == .authorized
        await MainActor.run {
            self.isAuthorized = authorized
        }

        if authorized {
            logger.info("Speech recognition authorized")
        } else {
            logger.warning("Speech recognition not authorized: \(authStatus.rawValue)")
        }

        return authorized
    }

    /// Check current authorization status
    func checkAuthorizationStatus() -> Bool {
        let status = SFSpeechRecognizer.authorizationStatus()
        isAuthorized = status == .authorized
        return isAuthorized
    }

    // MARK: - Language Support (Subtask 29.1)

    /// Set recognition language
    func setLanguage(_ languageCode: String) {
        guard SFSpeechRecognizer.supportedLocales().contains(where: { $0.identifier == languageCode }) else {
            logger.error("Language \(languageCode) not supported")
            return
        }

        currentLanguage = languageCode
        logger.info("Recognition language changed to \(languageCode)")
    }

    /// Get supported languages
    static func supportedLanguages() -> [String] {
        return SFSpeechRecognizer.supportedLocales().map { $0.identifier }
    }

    // MARK: - Voice Recognition (Subtask 29.1)

    /// Start listening for voice commands
    func startListening() throws {
        // Cancel any existing task
        if recognitionTask != nil {
            recognitionTask?.cancel()
            recognitionTask = nil
        }

        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            throw VoiceCommandError.recognizerNotAvailable
        }

        guard isAuthorized else {
            throw VoiceCommandError.notAuthorized
        }

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()

        guard let recognitionRequest = recognitionRequest else {
            throw VoiceCommandError.unableToCreateRequest
        }

        recognitionRequest.shouldReportPartialResults = true

        // Configure task for live recognition
        if #available(iOS 13, *) {
            recognitionRequest.requiresOnDeviceRecognition = false
        }

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Install tap on audio input
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        // Start recognition task
        recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            _Concurrency.Task { @MainActor in
                if let result = result {
                    let recognizedText = result.bestTranscription.formattedString
                    self.recognizedText = recognizedText

                    // Partial result callback
                    self.onPartialResult?(recognizedText)

                    // If final result, process as command
                    if result.isFinal {
                        self.lastCommand = recognizedText
                        self.onCommandRecognized?(recognizedText)
                        self.logger.info("Command recognized: \(recognizedText)")
                    }
                }

                if let error = error {
                    self.logger.error("Recognition error: \(error.localizedDescription)")
                    self.onError?(error)
                    self.stopListening()
                }
            }
        }

        isListening = true
        logger.info("Started listening for voice commands")
    }

    /// Stop listening for voice commands
    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        recognitionTask?.cancel()
        recognitionTask = nil

        isListening = false
        logger.info("Stopped listening for voice commands")
    }

    /// Toggle listening state
    func toggleListening() {
        if isListening {
            stopListening()
        } else {
            do {
                try startListening()
            } catch {
                logger.error("Failed to start listening: \(error.localizedDescription)")
                onError?(error)
            }
        }
    }

    // MARK: - Continuous Recognition (Subtask 29.1)

    /// Start continuous recognition (restarts automatically)
    func startContinuousListening() {
        do {
            try startListening()

            // Set up automatic restart on completion
            recognitionTask?.finish()
        } catch {
            logger.error("Failed to start continuous listening: \(error.localizedDescription)")
            onError?(error)
        }
    }

    /// Process a single command and stop
    func recognizeSingleCommand() async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            var resumed = false

            onCommandRecognized = { [weak self] command in
                guard !resumed else { return }
                resumed = true
                self?.stopListening()
                continuation.resume(returning: command)
            }

            onError = { error in
                guard !resumed else { return }
                resumed = true
                continuation.resume(throwing: error)
            }

            do {
                try startListening()
            } catch {
                guard !resumed else { return }
                resumed = true
                continuation.resume(throwing: error)
            }

            // Timeout after 10 seconds
            _Concurrency.Task {
                try? await _Concurrency.Task.sleep(nanoseconds: 10_000_000_000)
                guard !resumed else { return }
                resumed = true
                await MainActor.run {
                    self.stopListening()
                }
                continuation.resume(throwing: VoiceCommandError.timeout)
            }
        }
    }
}

// MARK: - SFSpeechRecognizerDelegate (Subtask 29.1)

extension VoiceCommandRecognitionService: SFSpeechRecognizerDelegate {
    nonisolated func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        _Concurrency.Task { @MainActor in
            if !available && self.isListening {
                self.stopListening()
            }
            self.logger.info("Speech recognizer availability: \(available)")
        }
    }
}

// MARK: - Errors

enum VoiceCommandError: LocalizedError {
    case recognizerNotAvailable
    case notAuthorized
    case unableToCreateRequest
    case timeout
    case audioEngineError

    var errorDescription: String? {
        switch self {
        case .recognizerNotAvailable:
            return "Speech recognizer is not available"
        case .notAuthorized:
            return "Speech recognition not authorized"
        case .unableToCreateRequest:
            return "Unable to create recognition request"
        case .timeout:
            return "Voice command recognition timed out"
        case .audioEngineError:
            return "Audio engine error"
        }
    }
}
