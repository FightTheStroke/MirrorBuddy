//
//  ContinuousVoiceEngine.swift
//  MirrorBuddy
//
//  MirrorBuddy 2.0 - True voice-first architecture
//  Continuous listening with OpenAI Realtime API
//  Voice is PRIMARY UI, not secondary overlay
//

import Foundation
import Combine
import os.log

/// Voice engine state
enum VoiceEngineState {
    case idle
    case listening
    case processing
    case responding
    case error(String)
}

/// Voice command intent
struct VoiceCommandIntent {
    let command: String
    let intent: String
    let parameters: [String: Any]
    let confidence: Double
}

/// Continuous voice engine with OpenAI Realtime API
/// Starts automatically on app launch - voice is the PRIMARY UI
@MainActor
final class ContinuousVoiceEngine: ObservableObject {
    static let shared = ContinuousVoiceEngine()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ContinuousVoiceEngine")

    // MARK: - Published State

    @Published var isListening: Bool = false
    @Published var state: VoiceEngineState = .idle
    @Published var transcript: String = ""
    @Published var waveformAmplitudes: [Float] = Array(repeating: 0.0, count: 50)

    // Privacy controls
    @Published var isPrivacyIndicatorVisible: Bool = false
    @Published var canStartListening: Bool = false // Requires explicit user permission

    // MARK: - Configuration

    private var apiKey: String {
        ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? ""
    }

    private var continuousListeningEnabled: Bool = false
    private var serverVADEnabled: Bool = true

    // MARK: - Services

    private var realtimeSession: OpenAIRealtimeSession?
    private let commandParser = VoiceCommandParser()
    private let privacyService = PrivacyIndicatorService.shared

    // MARK: - Analytics

    private var sessionStartTime: Date?
    private var commandsHandledCount: Int = 0
    private var totalListeningTime: TimeInterval = 0

    private init() {
        logger.info("ContinuousVoiceEngine initialized - voice-first architecture")
    }

    // MARK: - Public Interface

    /// Start continuous listening (called on app launch)
    /// Requires user permission first
    func startContinuousListening() async throws {
        guard !apiKey.isEmpty else {
            throw VoiceEngineError.missingAPIKey
        }

        guard canStartListening else {
            throw VoiceEngineError.permissionDenied
        }

        logger.info("Starting continuous voice listening - PRIMARY UI mode")

        // Show privacy indicator
        isPrivacyIndicatorVisible = true
        await privacyService.showIndicator(for: .voice)

        // Initialize OpenAI Realtime session
        realtimeSession = OpenAIRealtimeSession(
            apiKey: apiKey,
            serverVAD: serverVADEnabled
        )

        // Configure session
        try await realtimeSession?.configure(
            voice: "alloy",
            instructions: """
            You are MirrorBuddy, a patient and encouraging study companion for Mario.
            Mario has dyslexia, dyscalculia, disgrafia, and left hemiplegia.

            Your role:
            - Listen for study-related commands ("inizia matematica", "mostra progressi")
            - Provide encouragement and positive feedback
            - Adapt to Mario's emotional state
            - Keep responses short and clear
            - Use Fortnite analogies when helpful!

            Commands you understand:
            - "Inizia [materia]" - start studying a subject
            - "Pausa" - take a break
            - "Come va oggi?" - check progress
            - "Aggiungi compito" - create new task
            - "Timer focus" - start pomodoro timer
            """
        )

        // Start listening
        try await realtimeSession?.startListening()

        // Set up event handlers
        setupEventHandlers()

        isListening = true
        state = .listening
        continuousListeningEnabled = true
        sessionStartTime = Date()

        logger.info("✅ Continuous listening active - voice is PRIMARY UI")
    }

    /// Stop continuous listening (user requested)
    func stopContinuousListening() async {
        logger.info("Stopping continuous listening")

        await realtimeSession?.stopListening()

        isListening = false
        state = .idle
        continuousListeningEnabled = false
        isPrivacyIndicatorVisible = false

        await privacyService.hideIndicator(for: .voice)

        // Log analytics
        if let startTime = sessionStartTime {
            totalListeningTime = Date().timeIntervalSince(startTime)
            logger.info("Session ended: \(commandsHandledCount) commands in \(totalListeningTime)s")
        }
    }

    /// Request permission to start continuous listening
    func requestPermission() async throws {
        logger.info("Requesting continuous listening permission")

        // Future: Show permission dialog explaining continuous listening
        // For now, auto-grant for development
        canStartListening = true

        logger.info("✅ Permission granted for continuous listening")
    }

    /// Manually handle a voice command (for testing)
    func handleCommand(_ text: String) async {
        logger.debug("Handling manual command: \(text)")
        transcript = text
        await processVoiceInput(text)
    }

    // MARK: - Private Methods

    private func setupEventHandlers() {
        guard let session = realtimeSession else { return }

        // Transcript updates
        session.onTranscriptUpdate = { [weak self] text in
            await self?.handleTranscriptUpdate(text)
        }

        // Audio level for waveform
        session.onAudioLevel = { [weak self] level in
            await self?.updateWaveform(level: level)
        }

        // Speech started
        session.onSpeechStarted = { [weak self] in
            await self?.handleSpeechStarted()
        }

        // Speech ended (command complete)
        session.onSpeechEnded = { [weak self] finalTranscript in
            await self?.processVoiceInput(finalTranscript)
        }

        // Errors
        session.onError = { [weak self] error in
            await self?.handleError(error)
        }
    }

    private func handleTranscriptUpdate(_ text: String) {
        transcript = text
        logger.debug("Transcript: \(text)")
    }

    private func updateWaveform(level: Float) {
        // Shift waveform array and add new amplitude
        waveformAmplitudes.removeFirst()
        waveformAmplitudes.append(level)
    }

    private func handleSpeechStarted() {
        state = .listening
        logger.debug("Speech started")
    }

    private func processVoiceInput(_ text: String) async {
        guard !text.isEmpty else { return }

        state = .processing
        logger.info("Processing voice input: \(text)")

        // Parse command intent
        let intent = await commandParser.parseIntent(from: text)

        // Execute command
        await executeCommand(intent)

        commandsHandledCount += 1

        // Return to listening
        state = .listening
    }

    private func executeCommand(_ intent: VoiceCommandIntent) async {
        logger.info("Executing command: \(intent.command) (confidence: \(intent.confidence))")

        // Route to appropriate handler
        switch intent.intent {
        case "start_study":
            await handleStartStudy(subject: intent.parameters["subject"] as? String)

        case "show_progress":
            await handleShowProgress()

        case "add_task":
            await handleAddTask(title: intent.parameters["title"] as? String)

        case "start_timer":
            await handleStartTimer()

        case "take_break":
            await handleTakeBreak()

        case "check_sentiment":
            await handleCheckSentiment()

        default:
            logger.warning("Unknown intent: \(intent.intent)")
            await provideVoiceFeedback("Non ho capito. Puoi ripetere?")
        }
    }

    // MARK: - Command Handlers (to be expanded)

    private func handleStartStudy(subject: String?) async {
        logger.info("Starting study for subject: \(subject ?? "unknown")")
        await provideVoiceFeedback("Ok Mario! Iniziamo \(subject ?? "a studiare")!")

        // TODO: Navigate to study session
        NotificationCenter.default.post(
            name: .voiceCommandNavigate,
            object: nil,
            userInfo: ["destination": "study", "subject": subject as Any]
        )
    }

    private func handleShowProgress() async {
        logger.info("Showing progress")
        await provideVoiceFeedback("Ecco i tuoi progressi!")

        NotificationCenter.default.post(
            name: .voiceCommandNavigate,
            object: nil,
            userInfo: ["destination": "progress"]
        )
    }

    private func handleAddTask(title: String?) async {
        logger.info("Adding task: \(title ?? "untitled")")
        await provideVoiceFeedback("Ok, aggiungo il compito!")

        NotificationCenter.default.post(
            name: .voiceCommandAction,
            object: nil,
            userInfo: ["action": "createTask", "title": title as Any]
        )
    }

    private func handleStartTimer() async {
        logger.info("Starting focus timer")
        await provideVoiceFeedback("Timer avviato! Concentrati per 25 minuti.")

        NotificationCenter.default.post(
            name: .voiceCommandAction,
            object: nil,
            userInfo: ["action": "startTimer"]
        )
    }

    private func handleTakeBreak() async {
        logger.info("Taking break")
        await provideVoiceFeedback("Ottimo lavoro! Prendi una pausa.")

        NotificationCenter.default.post(
            name: .voiceCommandAction,
            object: nil,
            userInfo: ["action": "pauseStudy"]
        )
    }

    private func handleCheckSentiment() async {
        logger.info("Checking sentiment")
        await provideVoiceFeedback("Come ti senti oggi?")

        // TODO: Trigger sentiment analysis
    }

    private func provideVoiceFeedback(_ text: String) async {
        state = .responding

        // Send to OpenAI Realtime for TTS
        await realtimeSession?.speak(text)

        // Log for analytics
        logger.debug("Voice feedback: \(text)")
    }

    private func handleError(_ error: Error) {
        logger.error("Voice engine error: \(error.localizedDescription)")
        state = .error(error.localizedDescription)

        // Try to recover
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2s
            if continuousListeningEnabled {
                try? await realtimeSession?.startListening()
                state = .listening
                logger.info("Recovered from error, listening resumed")
            }
        }
    }
}

// MARK: - Voice Command Parser

private class VoiceCommandParser {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VoiceCommandParser")

    func parseIntent(from text: String) async -> VoiceCommandIntent {
        let lowercased = text.lowercased()

        // Simple keyword matching (will be enhanced with Claude AI)
        if lowercased.contains("inizia") || lowercased.contains("studia") {
            let subject = extractSubject(from: lowercased)
            return VoiceCommandIntent(
                command: text,
                intent: "start_study",
                parameters: ["subject": subject],
                confidence: 0.9
            )
        }

        if lowercased.contains("progressi") || lowercased.contains("come va") {
            return VoiceCommandIntent(
                command: text,
                intent: "show_progress",
                parameters: [:],
                confidence: 0.95
            )
        }

        if lowercased.contains("compito") || lowercased.contains("aggiungi") {
            return VoiceCommandIntent(
                command: text,
                intent: "add_task",
                parameters: ["title": text],
                confidence: 0.8
            )
        }

        if lowercased.contains("timer") || lowercased.contains("focus") {
            return VoiceCommandIntent(
                command: text,
                intent: "start_timer",
                parameters: [:],
                confidence: 0.9
            )
        }

        if lowercased.contains("pausa") || lowercased.contains("break") {
            return VoiceCommandIntent(
                command: text,
                intent: "take_break",
                parameters: [:],
                confidence: 0.95
            )
        }

        // Default: unknown
        return VoiceCommandIntent(
            command: text,
            intent: "unknown",
            parameters: [:],
            confidence: 0.0
        )
    }

    private func extractSubject(from text: String) -> String {
        // Simple extraction (will be enhanced)
        if text.contains("matematica") { return "Matematica" }
        if text.contains("italiano") { return "Italiano" }
        if text.contains("inglese") { return "Inglese" }
        if text.contains("storia") { return "Storia" }
        if text.contains("scienze") { return "Scienze" }
        return "General"
    }
}

// MARK: - OpenAI Realtime Session (stub for implementation)

private class OpenAIRealtimeSession {
    var onTranscriptUpdate: ((String) -> Void)?
    var onAudioLevel: ((Float) -> Void)?
    var onSpeechStarted: (() -> Void)?
    var onSpeechEnded: ((String) -> Void)?
    var onError: ((Error) -> Void)?

    private let apiKey: String
    private let serverVAD: Bool

    init(apiKey: String, serverVAD: Bool) {
        self.apiKey = apiKey
        self.serverVAD = serverVAD
    }

    func configure(voice: String, instructions: String) async throws {
        // TODO: Implement OpenAI Realtime API configuration
        // https://platform.openai.com/docs/guides/realtime
    }

    func startListening() async throws {
        // TODO: Implement WebSocket connection and audio streaming
    }

    func stopListening() async {
        // TODO: Close WebSocket connection
    }

    func speak(_ text: String) async {
        // TODO: Send text-to-speech request
    }
}

// MARK: - Errors

enum VoiceEngineError: Error {
    case missingAPIKey
    case permissionDenied
    case sessionNotInitialized
}

// MARK: - NotificationCenter Extensions

extension Notification.Name {
    static let voiceCommandNavigate = Notification.Name("voiceCommandNavigate")
    static let voiceCommandAction = Notification.Name("voiceCommandAction")
}
