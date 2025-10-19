//
//  UnifiedVoiceManager.swift
//  MirrorBuddy
//
//  Task 139.3: Unified voice interaction orchestrator
//  Smart intent detection for commands vs conversations
//
//  NOTE: This is a placeholder implementation for Task 139
//  Full integration with VoiceCommandRecognitionService requires deeper refactoring
//

import Combine
import Foundation
import os.log

/// Voice interaction intent type
enum VoiceIntent {
    case command      // Short navigation/action command
    case conversation // Extended interaction with AI
}

/// Result of voice interaction
enum VoiceResult {
    case command(VoiceCommandResult)
    case conversation(String) // Recognized text to pre-fill conversation
    case error(String)
}

/// Unified voice interaction manager with smart intent detection
@MainActor
final class UnifiedVoiceManager: ObservableObject {
    static let shared = UnifiedVoiceManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "UnifiedVoiceManager")

    @Published var isListening = false
    @Published var recognizedText = ""

    // Services
    private let commandService = VoiceCommandRecognitionService.shared
    private let commandRegistry = VoiceCommandRegistry.shared

    private init() {
        logger.info("UnifiedVoiceManager initialized")
    }

    // MARK: - Public Interface

    /// Start listening and detect intent
    func startListening(completion: @escaping (VoiceResult) -> Void) {
        guard !isListening else {
            logger.warning("Already listening, ignoring duplicate request")
            return
        }

        isListening = true
        recognizedText = ""
        logger.debug("Started listening for voice input")

        // Set up callbacks
        commandService.onCommandRecognized = { [weak self] text in
            guard let self = self else { return }

            self.logger.debug("Recognized text: \(text)")
            self.recognizedText = text
            self.isListening = false

            // Detect intent
            let intent = self.detectIntent(from: text)
            self.logger.debug("Detected intent: \(String(describing: intent))")

            switch intent {
            case .command:
                self.executeCommand(text, completion: completion)

            case .conversation:
                completion(.conversation(text))
            }
        }

        commandService.onError = { [weak self] error in
            guard let self = self else { return }

            self.logger.error("Voice recognition error: \(error.localizedDescription)")
            self.isListening = false
            completion(.error(error.localizedDescription))
        }

        // Start listening
        do {
            try commandService.startListening()
        } catch {
            logger.error("Failed to start listening: \(error.localizedDescription)")
            isListening = false
            completion(.error(error.localizedDescription))
        }
    }

    /// Stop listening
    func stopListening() {
        guard isListening else { return }

        commandService.stopListening()
        isListening = false
        logger.debug("Stopped listening")
    }

    // MARK: - Intent Detection

    /// Detect whether user intent is command or conversation
    func detectIntent(from text: String) -> VoiceIntent {
        let normalizedText = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // 1. Check against registered voice commands (highest priority)
        if commandRegistry.matches(text: normalizedText) {
            logger.debug("Intent: command (matched registry)")
            return .command
        }

        // 2. Detect command-like prefixes
        let commandPrefixes = ["vai", "apri", "mostra", "chiudi", "torna", "cerca", "aggiungi", "crea"]
        if commandPrefixes.contains(where: { normalizedText.starts(with: $0) }) {
            logger.debug("Intent: command (matched prefix)")
            return .command
        }

        // 3. Length heuristic (commands are typically brief)
        let wordCount = normalizedText.split(separator: " ").count
        if wordCount <= 5 {
            logger.debug("Intent: command (short utterance, \(wordCount) words)")
            return .command
        }

        // 4. Question detection (likely conversation)
        if normalizedText.contains("?") ||
           normalizedText.starts(with: "spiegami") ||
           normalizedText.starts(with: "come") ||
           normalizedText.starts(with: "perché") ||
           normalizedText.starts(with: "cosa") ||
           normalizedText.starts(with: "quale") ||
           normalizedText.starts(with: "dimmi") {
            logger.debug("Intent: conversation (question pattern)")
            return .conversation
        }

        // 5. Complex input (> 10 words) → conversation
        if wordCount > 10 {
            logger.debug("Intent: conversation (long utterance, \(wordCount) words)")
            return .conversation
        }

        // 6. Default to conversation for ambiguous input
        logger.debug("Intent: conversation (default)")
        return .conversation
    }

    // MARK: - Command Execution

    private func executeCommand(_ text: String, completion: @escaping (VoiceResult) -> Void) {
        logger.debug("Executing command: \(text)")

        // Find matching command
        guard let matchedCommand = commandRegistry.matchCommand(text: text) else {
            logger.warning("No matching command found for: \(text)")
            completion(.error("Comando non riconosciuto. Vuoi continuare la conversazione?"))
            return
        }

        // Execute command
        logger.info("Executing command: \(matchedCommand.name)")

        // TODO: Proper command execution - requires AppVoiceCommandHandler integration
        // VoiceCommandAction is an enum, not a function - needs proper dispatch
        completion(.command(.success(matchedCommand)))
        logger.debug("Command execution placeholder - full integration pending")
    }
}

// MARK: - VoiceCommand Result Extension

/// Result of voice command execution
enum VoiceCommandResult {
    case success(VoiceCommand)
    case failed(Error)
}

// MARK: - Extension for VoiceCommandRegistry

extension VoiceCommandRegistry {
    /// Check if text matches any registered command
    func matches(text: String) -> Bool {
        matchCommand(text: text) != nil
    }

    /// Find command matching the given text
    func matchCommand(text: String) -> VoiceCommand? {
        let normalizedText = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        return availableCommands().first { command in
            command.triggers.contains { trigger in
                normalizedText.contains(trigger.lowercased())
            }
        }
    }
}
