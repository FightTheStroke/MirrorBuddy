import Combine
import Foundation
import os.log
import SwiftUI

// MARK: - Voice Command Model (Task 29.2)

/// A voice command with its triggers and action
struct VoiceCommand: Identifiable {
    let id = UUID()
    let name: String
    let triggers: [String] // Phrases that activate this command
    let action: VoiceCommandAction
    let context: VoiceCommandContext
    let description: String

    /// Check if a recognized phrase matches this command
    func matches(_ phrase: String) -> Bool {
        let lowercasePhrase = phrase.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        return triggers.contains { trigger in
            let lowercaseTrigger = trigger.lowercased()
            return lowercasePhrase.contains(lowercaseTrigger) ||
                lowercasePhrase.levenshteinDistance(to: lowercaseTrigger) <= 2
        }
    }
}

// MARK: - Command Action Types (Task 29.2)

enum VoiceCommandAction {
    // Navigation
    case goBack
    case goHome
    case openSettings
    case openProfile
    case openMaterials
    case openTasks
    case openHelp

    // Material actions
    case openMaterial(String?)
    case createMaterial
    case searchMaterials

    // Study actions
    case startStudy
    case reviewFlashcards
    case viewMindMap

    // Accessibility
    case enableDyslexiaMode
    case disableDyslexiaMode
    case increaseFontSize
    case decreaseFontSize
    case readScreen

    // TTS controls
    case startReading
    case stopReading
    case pauseReading
    case resumeReading

    // App controls
    case refresh
    case closeView
    case showHelp
    case customAction(String, () -> Void)
}

// MARK: - Command Context (Task 29.2)

enum VoiceCommandContext: Hashable {
    case global // Available everywhere
    case materialDetail // Only in material detail view
    case studySession // Only during study
    case settings // Only in settings
    case dashboard // Only in dashboard

    func isActive(in currentView: String) -> Bool {
        switch self {
        case .global:
            return true
        case .materialDetail:
            return currentView.contains("MaterialDetail")
        case .studySession:
            return currentView.contains("Study")
        case .settings:
            return currentView.contains("Settings")
        case .dashboard:
            return currentView.contains("Dashboard")
        }
    }
}

// MARK: - Command Registry Service (Task 29.2)

@MainActor
final class VoiceCommandRegistry: ObservableObject {
    static let shared = VoiceCommandRegistry()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VoiceCommands")

    @Published private(set) var commands: [VoiceCommand] = []
    @Published var currentView: String = ""

    private init() {
        registerDefaultCommands()
    }

    // MARK: - Command Registration (Task 29.2)

    /// Register default voice commands
    private func registerDefaultCommands() {
        registerNavigationCommands()
        registerMaterialCommands()
        registerStudyCommands()
        registerAccessibilityCommands()
        registerSpeechCommands()
        registerAppControlCommands()

        logger.info("Registered \(self.commands.count) default voice commands")
    }

    private func registerNavigationCommands() {
        registerCommand(
            name: "Indietro",
            triggers: ["indietro", "torna indietro", "vai indietro", "back"],
            action: .goBack,
            context: .global,
            description: "Torna alla schermata precedente"
        )

        registerCommand(
            name: "Home",
            triggers: ["home", "vai alla home", "vai a casa", "homepage", "go home"],
            action: .goHome,
            context: .global,
            description: "Vai alla schermata principale"
        )

        registerCommand(
            name: "Impostazioni",
            triggers: ["impostazioni", "apri impostazioni", "vai alle impostazioni", "settings", "open settings"],
            action: .openSettings,
            context: .global,
            description: "Apri le impostazioni"
        )

        registerCommand(
            name: "Profilo",
            triggers: ["profilo", "apri profilo", "il mio profilo", "profile", "my profile"],
            action: .openProfile,
            context: .global,
            description: "Apri il tuo profilo"
        )

        registerCommand(
            name: "Materiali",
            triggers: ["materiali", "apri materiali", "vai ai materiali", "materials", "open materials"],
            action: .openMaterials,
            context: .global,
            description: "Vai ai materiali di studio"
        )
    }

    private func registerMaterialCommands() {
        registerCommand(
            name: "Crea Materiale",
            triggers: ["crea materiale", "nuovo materiale", "aggiungi materiale", "create material", "new material"],
            action: .createMaterial,
            context: .dashboard,
            description: "Crea un nuovo materiale"
        )

        registerCommand(
            name: "Cerca",
            triggers: ["cerca", "cerca materiali", "trova", "search", "find"],
            action: .searchMaterials,
            context: .dashboard,
            description: "Cerca tra i materiali"
        )
    }

    private func registerStudyCommands() {
        registerCommand(
            name: "Inizia Studio",
            triggers: ["inizia studio", "studia", "comincia", "start study", "study"],
            action: .startStudy,
            context: .materialDetail,
            description: "Inizia una sessione di studio"
        )

        registerCommand(
            name: "Flashcard",
            triggers: ["flashcard", "ripassa flashcard", "rivedi flashcard", "review flashcards"],
            action: .reviewFlashcards,
            context: .materialDetail,
            description: "Ripassa le flashcard"
        )

        registerCommand(
            name: "Mappa Mentale",
            triggers: ["mappa mentale", "mostra mappa", "visualizza mappa", "mind map", "show map"],
            action: .viewMindMap,
            context: .materialDetail,
            description: "Visualizza la mappa mentale"
        )
    }

    private func registerAccessibilityCommands() {
        registerCommand(
            name: "Attiva Dislessia",
            triggers: ["attiva modalità dislessia", "abilita dislessia", "modalità dislessia on"],
            action: .enableDyslexiaMode,
            context: .global,
            description: "Attiva la modalità per la dislessia"
        )

        registerCommand(
            name: "Disattiva Dislessia",
            triggers: ["disattiva modalità dislessia", "disabilita dislessia", "modalità dislessia off"],
            action: .disableDyslexiaMode,
            context: .global,
            description: "Disattiva la modalità per la dislessia"
        )

        registerCommand(
            name: "Aumenta Font",
            triggers: ["aumenta font", "testo più grande", "ingrandisci testo", "increase font", "bigger text"],
            action: .increaseFontSize,
            context: .global,
            description: "Aumenta la dimensione del testo"
        )

        registerCommand(
            name: "Riduci Font",
            triggers: ["riduci font", "testo più piccolo", "rimpicciolisci testo", "decrease font", "smaller text"],
            action: .decreaseFontSize,
            context: .global,
            description: "Riduci la dimensione del testo"
        )
    }

    private func registerSpeechCommands() {
        registerCommand(
            name: "Leggi",
            triggers: ["leggi", "leggi testo", "ascolta", "read", "read text", "listen"],
            action: .startReading,
            context: .materialDetail,
            description: "Inizia la lettura del testo"
        )

        registerCommand(
            name: "Stop Lettura",
            triggers: ["stop", "ferma lettura", "basta", "stop reading"],
            action: .stopReading,
            context: .global,
            description: "Ferma la lettura"
        )

        registerCommand(
            name: "Pausa",
            triggers: ["pausa", "metti in pausa", "pause"],
            action: .pauseReading,
            context: .global,
            description: "Metti in pausa la lettura"
        )

        registerCommand(
            name: "Riprendi",
            triggers: ["riprendi", "continua", "resume", "continue"],
            action: .resumeReading,
            context: .global,
            description: "Riprendi la lettura"
        )
    }

    private func registerAppControlCommands() {
        registerCommand(
            name: "Aggiorna",
            triggers: ["aggiorna", "ricarica", "refresh", "reload"],
            action: .refresh,
            context: .global,
            description: "Aggiorna la schermata corrente"
        )

        registerCommand(
            name: "Chiudi",
            triggers: ["chiudi", "esci", "close", "exit"],
            action: .closeView,
            context: .global,
            description: "Chiudi la vista corrente"
        )

        registerCommand(
            name: "Aiuto",
            triggers: ["aiuto", "help", "comandi", "commands", "cosa posso dire"],
            action: .showHelp,
            context: .global,
            description: "Mostra i comandi disponibili"
        )
    }

    /// Register a new voice command
    func registerCommand(
        name: String,
        triggers: [String],
        action: VoiceCommandAction,
        context: VoiceCommandContext,
        description: String
    ) {
        let command = VoiceCommand(
            name: name,
            triggers: triggers,
            action: action,
            context: context,
            description: description
        )
        commands.append(command)
    }

    // MARK: - Command Matching (Task 29.2)

    /// Find a command that matches the recognized phrase
    func findCommand(for phrase: String) -> VoiceCommand? {
        // Get contextual commands (global + current context)
        let contextualCommands = commands.filter { command in
            command.context == .global || command.context.isActive(in: currentView)
        }

        // Find best match
        return contextualCommands.first { command in
            command.matches(phrase)
        }
    }

    /// Get all available commands for current context
    func availableCommands() -> [VoiceCommand] {
        commands.filter { command in
            command.context == .global || command.context.isActive(in: currentView)
        }
    }

    // MARK: - Command Execution (Task 29.2)

    /// Process a recognized phrase and execute the matching command
    func processCommand(_ phrase: String, handler: VoiceCommandHandler) {
        logger.info("Processing command: \(phrase)")

        // Try smart material lookup patterns first
        if let materialQuery = extractMaterialQuery(from: phrase) {
            logger.info("Material query extracted: \(materialQuery)")
            handler.executeCommand(.openMaterial(materialQuery))
            return
        }

        // Fall back to standard command matching
        guard let command = findCommand(for: phrase) else {
            logger.warning("No matching command found for: \(phrase)")
            handler.handleUnrecognizedCommand(phrase)
            return
        }

        logger.info("Executing command: \(command.name)")
        handler.executeCommand(command.action)
    }

    // MARK: - Smart Material Query Extraction

    /// Extract material query from natural language phrases
    /// - Examples:
    ///   - "apri ultimo materiale" → "newest"
    ///   - "apri ultimo materiale di geometria" → "last:geometria"
    ///   - "apri materiale storia romana" → "title:storia romana"
    private func extractMaterialQuery(from phrase: String) -> String? {
        let lowercasePhrase = phrase.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Pattern: "apri ultimo materiale (di [subject])"
        if lowercasePhrase.contains("ultimo materiale") ||
            lowercasePhrase.contains("last material") ||
            lowercasePhrase.contains("materiale più recente") ||
            lowercasePhrase.contains("newest material") {
            // Check for subject specification
            if let subjectMatch = lowercasePhrase.range(of: "di ") {
                let afterDi = lowercasePhrase[subjectMatch.upperBound...].trimmingCharacters(in: .whitespaces)
                let subjectName = String(afterDi)
                return "last:\(subjectName)"
            }

            // No subject specified - return newest overall
            return "newest"
        }

        // Pattern: "apri materiale [title]"
        if lowercasePhrase.hasPrefix("apri materiale ") ||
            lowercasePhrase.hasPrefix("open material ") ||
            lowercasePhrase.hasPrefix("mostra materiale ") {
            let prefixes = ["apri materiale ", "open material ", "mostra materiale "]
            for prefix in prefixes where lowercasePhrase.hasPrefix(prefix) {
                let titlePart = String(lowercasePhrase.dropFirst(prefix.count))
                    .trimmingCharacters(in: .whitespaces)
                if !titlePart.isEmpty {
                    return "title:\(titlePart)"
                }
            }
        }

        return nil
    }
}

// MARK: - Command Handler Protocol (Task 29.2)

@MainActor
protocol VoiceCommandHandler {
    func executeCommand(_ action: VoiceCommandAction)
    func handleUnrecognizedCommand(_ phrase: String)
}

// MARK: - String Extension for Fuzzy Matching

extension String {
    /// Calculate Levenshtein distance for fuzzy matching
    func levenshteinDistance(to other: String) -> Int {
        let m = self.count
        let n = other.count

        var matrix = [[Int]](repeating: [Int](repeating: 0, count: n + 1), count: m + 1)

        for i in 0...m {
            matrix[i][0] = i
        }

        for j in 0...n {
            matrix[0][j] = j
        }

        for i in 1...m {
            for j in 1...n {
                let cost = self[self.index(self.startIndex, offsetBy: i - 1)] ==
                    other[other.index(other.startIndex, offsetBy: j - 1)] ? 0 : 1

                matrix[i][j] = Swift.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                )
            }
        }

        return matrix[m][n]
    }
}
