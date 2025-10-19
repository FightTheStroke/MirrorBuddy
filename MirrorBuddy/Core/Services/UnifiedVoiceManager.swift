//
//  UnifiedVoiceManager.swift
//  MirrorBuddy
//
//  Task 139.3: Unified voice interaction orchestrator
//  Task 114: Enhanced with confidence scoring, context awareness, and analytics
//  Smart intent detection for commands vs conversations
//

import Combine
import Foundation
import os.log

/// Voice interaction intent type
enum VoiceIntent {
    case command      // Short navigation/action command
    case conversation // Extended interaction with AI
}

/// Intent detection result with confidence scoring
struct IntentResult {
    let intent: VoiceIntent
    let confidence: Double  // 0.0 - 1.0
    let reason: String     // For debugging and analytics
}

/// Result of voice interaction
enum VoiceResult {
    case command(VoiceCommandResult)
    case conversation(String) // Recognized text to pre-fill conversation
    case error(String)
    case suggestions([VoiceCommand], originalText: String) // For disambiguation
    case requiresConfirmation(VoiceCommand) // For destructive actions

    var isSuccess: Bool {
        if case .command(.success) = self {
            return true
        }
        return false
    }
}

/// Voice context for context-aware intent detection
struct VoiceContext {
    var currentScreen: String = ""
    var activeMaterial: String? = nil
    var activeStudySession: String? = nil
    var recentCommands: [String] = []
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
    private let cache = VoiceCommandCache.shared
    private let analytics = VoiceAnalytics.shared

    // Context awareness (Task 114 enhancement)
    private var currentContext = VoiceContext()

    private init() {
        logger.info("UnifiedVoiceManager initialized with enhanced intent detection (Task 114)")
    }

    // MARK: - Context Management

    /// Update current voice context for context-aware intent detection
    func updateContext(_ context: VoiceContext) {
        self.currentContext = context
        logger.debug("Voice context updated: screen=\(context.currentScreen)")
    }

    // MARK: - Public Interface

    /// Start listening and detect intent with performance tracking
    func startListening(completion: @escaping (VoiceResult) -> Void) {
        guard !isListening else {
            logger.warning("Already listening, ignoring duplicate request")
            return
        }

        isListening = true
        recognizedText = ""
        let startTime = Date()
        logger.debug("Started listening for voice input")

        // Set up callbacks
        commandService.onCommandRecognized = { [weak self] text in
            guard let self = self else { return }

            let recognitionLatency = Date().timeIntervalSince(startTime)
            self.logger.debug("Recognized text: \(text) (latency: \(Int(recognitionLatency * 1000))ms)")
            self.recognizedText = text
            self.isListening = false

            // Check cache first for performance
            if let cachedAction = self.cache.get(text) {
                self.logger.debug("Cache hit for: \(text)")
                self.executeCommandAction(cachedAction, text: text, completion: completion)
                return
            }

            // Detect intent with confidence scoring
            let intentStart = Date()
            let intentResult = self.detectIntentWithConfidence(from: text, context: self.currentContext)
            let intentLatency = Date().timeIntervalSince(intentStart)

            self.logger.info("Intent: \(String(describing: intentResult.intent)), Confidence: \(String(format: "%.2f", intentResult.confidence)), Reason: \(intentResult.reason)")

            switch intentResult.intent {
            case .command:
                let executionStart = Date()
                self.executeCommand(text) { result in
                    let executionLatency = Date().timeIntervalSince(executionStart)
                    let totalLatency = Date().timeIntervalSince(startTime)

                    // Track performance metrics
                    self.analytics.trackCommandExecution(
                        text: text,
                        recognitionLatency: recognitionLatency,
                        intentLatency: intentLatency,
                        executionLatency: executionLatency,
                        totalLatency: totalLatency,
                        success: result.isSuccess
                    )

                    completion(result)
                }

            case .conversation:
                let totalLatency = Date().timeIntervalSince(startTime)
                self.logger.debug("Conversation mode selected (total latency: \(Int(totalLatency * 1000))ms)")
                completion(.conversation(text))
            }
        }

        commandService.onError = { [weak self] error in
            guard let self = self else { return }

            self.logger.error("Voice recognition error: \(error.localizedDescription)")
            self.isListening = false
            self.analytics.trackError(error.localizedDescription)
            completion(.error(error.localizedDescription))
        }

        // Start listening
        do {
            try commandService.startListening()
        } catch {
            logger.error("Failed to start listening: \(error.localizedDescription)")
            isListening = false
            analytics.trackError(error.localizedDescription)
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

    // MARK: - Enhanced Intent Detection (Task 114)

    /// Detect intent with confidence scoring and context awareness
    func detectIntentWithConfidence(from text: String, context: VoiceContext) -> IntentResult {
        let normalizedText = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        var score = 0.0
        var reasons: [String] = []

        // 1. Exact registry match = 1.0 confidence
        if commandRegistry.matches(text: normalizedText) {
            return IntentResult(intent: .command, confidence: 1.0, reason: "Exact command match")
        }

        // 2. Command prefixes (Italian + English) - expanded list
        let italianPrefixes = ["vai", "apri", "mostra", "chiudi", "torna", "cerca", "aggiungi", "crea",
                               "elimina", "cancella", "modifica", "seleziona", "filtra", "esporta",
                               "rimuovi", "ordina", "imposta", "cambia", "attiva", "disattiva"]

        let englishPrefixes = ["go", "open", "show", "close", "back", "search", "add", "create",
                               "delete", "remove", "edit", "select", "filter", "export",
                               "sort", "set", "change", "enable", "disable"]

        let hasItalianPrefix = italianPrefixes.contains { normalizedText.starts(with: $0) }
        let hasEnglishPrefix = englishPrefixes.contains { normalizedText.starts(with: $0) }

        if hasItalianPrefix || hasEnglishPrefix {
            score += 0.8
            reasons.append("Command prefix detected")
        }

        // 3. Context-specific patterns (Task 114 enhancement)
        if context.currentScreen == "MaterialDetail" {
            if normalizedText.contains("leggi") || normalizedText.contains("spiega") ||
               normalizedText.contains("read") || normalizedText.contains("explain") {
                score += 0.7
                reasons.append("Material detail context match")
            }
        }

        if context.currentScreen == "Dashboard" {
            if normalizedText.contains("ultimo") || normalizedText.contains("recent") {
                score += 0.6
                reasons.append("Dashboard context match")
            }
        }

        // 4. Length heuristic (shorter = more likely command)
        let wordCount = normalizedText.split(separator: " ").count
        if wordCount <= 3 {
            score += 0.7
            reasons.append("Very short utterance (\(wordCount) words)")
        } else if wordCount <= 5 {
            score += 0.5
            reasons.append("Short utterance (\(wordCount) words)")
        } else if wordCount <= 8 {
            score += 0.3
            reasons.append("Medium utterance (\(wordCount) words)")
        }

        // 5. Question detection (likely conversation)
        let questionPatterns = ["?", "spiegami", "come", "perché", "cosa", "quale", "dimmi",
                               "why", "how", "what", "explain", "tell me", "show me how"]
        if questionPatterns.contains(where: { normalizedText.contains($0) }) {
            return IntentResult(intent: .conversation, confidence: 0.95, reason: "Question pattern detected")
        }

        // 6. Complex input (> 12 words) → conversation
        if wordCount > 12 {
            return IntentResult(intent: .conversation, confidence: 0.9, reason: "Long utterance (\(wordCount) words)")
        }

        // 7. Fuzzy matching fallback
        if let fuzzyMatch = commandRegistry.fuzzyMatch(text: normalizedText, threshold: 0.75) {
            score += 0.6
            reasons.append("Fuzzy match with '\(fuzzyMatch.name)'")
        }

        // Determine final intent based on threshold
        if score >= 0.7 {
            return IntentResult(intent: .command, confidence: score, reason: reasons.joined(separator: ", "))
        } else {
            return IntentResult(intent: .conversation, confidence: 1.0 - score, reason: "Below command threshold (\(String(format: "%.2f", score)))")
        }
    }

    /// Legacy method for backwards compatibility
    func detectIntent(from text: String) -> VoiceIntent {
        return detectIntentWithConfidence(from: text, context: currentContext).intent
    }

    // MARK: - Command Execution (Enhanced Task 114)

    private func executeCommand(_ text: String, completion: @escaping (VoiceResult) -> Void) {
        logger.debug("Executing command: \(text)")

        // Find matching command
        guard let matchedCommand = commandRegistry.matchCommand(text: text) else {
            logger.warning("No matching command found for: \(text)")

            // Suggest similar commands for disambiguation
            let suggestions = commandRegistry.suggestCommands(for: text, maxSuggestions: 3)
            if !suggestions.isEmpty {
                logger.info("Suggesting \(suggestions.count) similar commands")
                completion(.suggestions(suggestions, originalText: text))
            } else {
                completion(.error("Comando non riconosciuto. Vuoi continuare la conversazione?"))
            }
            return
        }

        // Check if confirmation required for destructive actions
        if requiresConfirmation(matchedCommand.action) {
            logger.info("Confirmation required for: \(matchedCommand.name)")
            completion(.requiresConfirmation(matchedCommand))
            return
        }

        // Execute command via AppVoiceCommandHandler
        logger.info("Executing command: \(matchedCommand.name)")
        AppVoiceCommandHandler.shared.executeCommand(matchedCommand.action)

        // Cache successful command for faster repeat access
        cache.set(text, action: matchedCommand.action)

        completion(.command(.success(matchedCommand)))
    }

    private func executeCommandAction(_ action: VoiceCommandAction, text: String, completion: @escaping (VoiceResult) -> Void) {
        logger.debug("Executing cached command action")
        AppVoiceCommandHandler.shared.executeCommand(action)

        // Create dummy command for result
        let command = VoiceCommand(
            name: "Cached Command",
            triggers: [text],
            action: action,
            context: .global,
            description: "Cached command execution"
        )
        completion(.command(.success(command)))
    }

    private func requiresConfirmation(_ action: VoiceCommandAction) -> Bool {
        // Destructive actions that require user confirmation
        switch action {
        // Add destructive action cases here when implemented
        // case .deleteAllTasks, .clearHistory, .archiveOldMaterials, .resetProgress:
        //     return true
        default:
            return false
        }
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

    /// Find fuzzy match with similarity threshold (Task 114 enhancement)
    func fuzzyMatch(text: String, threshold: Double) -> VoiceCommand? {
        let normalizedText = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        return availableCommands().first { command in
            command.triggers.contains { trigger in
                let similarity = jaccardSimilarity(normalizedText, trigger.lowercased())
                return similarity >= threshold
            }
        }
    }

    /// Suggest similar commands for disambiguation (Task 114 enhancement)
    func suggestCommands(for text: String, maxSuggestions: Int = 3) -> [VoiceCommand] {
        let normalizedText = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        return availableCommands()
            .map { command -> (VoiceCommand, Int) in
                let minDistance = command.triggers.map { trigger in
                    normalizedText.levenshteinDistance(to: trigger.lowercased())
                }.min() ?? Int.max
                return (command, minDistance)
            }
            .filter { $0.1 <= 5 }  // Only suggest if within 5 character edits
            .sorted { $0.1 < $1.1 }
            .prefix(maxSuggestions)
            .map { $0.0 }
    }

    /// Calculate Jaccard similarity between two strings
    private func jaccardSimilarity(_ a: String, _ b: String) -> Double {
        let setA = Set(a.lowercased().split(separator: " "))
        let setB = Set(b.lowercased().split(separator: " "))

        guard !setA.isEmpty && !setB.isEmpty else { return 0.0 }

        let intersection = setA.intersection(setB)
        let union = setA.union(setB)

        return Double(intersection.count) / Double(union.count)
    }
}

// MARK: - Voice Command Cache (Task 114)

/// LRU cache for frequently used voice commands to improve performance
final class VoiceCommandCache {
    static let shared = VoiceCommandCache()

    private var cache: [String: VoiceCommandAction] = [:]
    private var accessOrder: [String] = []
    private let maxCacheSize = 50

    private init() {}

    func get(_ text: String) -> VoiceCommandAction? {
        let key = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        guard let action = cache[key] else {
            return nil
        }

        // Update LRU access order
        if let index = accessOrder.firstIndex(of: key) {
            accessOrder.remove(at: index)
        }
        accessOrder.append(key)

        return action
    }

    func set(_ text: String, action: VoiceCommandAction) {
        let key = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        cache[key] = action
        accessOrder.append(key)

        // LRU eviction if cache too large
        if cache.count > maxCacheSize, let oldest = accessOrder.first {
            cache.removeValue(forKey: oldest)
            accessOrder.removeFirst()
        }
    }

    func clear() {
        cache.removeAll()
        accessOrder.removeAll()
    }

    var count: Int {
        cache.count
    }
}

// MARK: - Voice Analytics (Task 114)

/// Analytics tracking for voice command performance and usage
final class VoiceAnalytics {
    static let shared = VoiceAnalytics()

    private var metrics: [VoiceCommandMetric] = []
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VoiceAnalytics")
    private let maxStoredMetrics = 1000

    private init() {}

    func trackCommandExecution(
        text: String,
        recognitionLatency: TimeInterval,
        intentLatency: TimeInterval,
        executionLatency: TimeInterval,
        totalLatency: TimeInterval,
        success: Bool
    ) {
        let metric = VoiceCommandMetric(
            text: text,
            recognitionLatency: recognitionLatency,
            intentLatency: intentLatency,
            executionLatency: executionLatency,
            totalLatency: totalLatency,
            success: success,
            timestamp: Date()
        )

        metrics.append(metric)

        // Log slow commands (> 1 second total)
        if totalLatency > 1.0 {
            logger.warning("Slow voice command: '\(text)' took \(String(format: "%.2f", totalLatency))s (recognition: \(Int(recognitionLatency * 1000))ms, intent: \(Int(intentLatency * 1000))ms, execution: \(Int(executionLatency * 1000))ms)")
        }

        // Trim old metrics to prevent memory growth
        if metrics.count > maxStoredMetrics {
            metrics.removeFirst(metrics.count - maxStoredMetrics)
        }

        // TODO: Send to analytics service (Firebase, Mixpanel, etc.)
    }

    func trackError(_ errorMessage: String) {
        logger.error("Voice error: \(errorMessage)")
        // TODO: Send to analytics service
    }

    func getAverageLatency(for commandText: String? = nil) -> TimeInterval {
        let relevantMetrics: [VoiceCommandMetric]

        if let commandText = commandText {
            relevantMetrics = metrics.filter { $0.text.lowercased() == commandText.lowercased() }
        } else {
            relevantMetrics = metrics
        }

        guard !relevantMetrics.isEmpty else { return 0 }

        let total = relevantMetrics.map { $0.totalLatency }.reduce(0, +)
        return total / Double(relevantMetrics.count)
    }

    func getSuccessRate(for commandText: String? = nil) -> Double {
        let relevantMetrics: [VoiceCommandMetric]

        if let commandText = commandText {
            relevantMetrics = metrics.filter { $0.text.lowercased() == commandText.lowercased() }
        } else {
            relevantMetrics = metrics
        }

        guard !relevantMetrics.isEmpty else { return 0 }

        let successCount = relevantMetrics.filter { $0.success }.count
        return Double(successCount) / Double(relevantMetrics.count)
    }

    func getMetrics() -> [VoiceCommandMetric] {
        metrics
    }

    func clearMetrics() {
        metrics.removeAll()
    }
}

struct VoiceCommandMetric {
    let text: String
    let recognitionLatency: TimeInterval
    let intentLatency: TimeInterval
    let executionLatency: TimeInterval
    let totalLatency: TimeInterval
    let success: Bool
    let timestamp: Date
}
