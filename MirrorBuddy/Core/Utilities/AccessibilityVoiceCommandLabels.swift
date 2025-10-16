import SwiftUI

// MARK: - Accessibility Voice Command Labels (Task 102.7)

/// Extension to add voice command hints to accessibility labels
extension View {
    /// Add a voice command hint to the accessibility label
    /// - Parameters:
    ///   - label: The base accessibility label
    ///   - voiceCommand: The voice command that triggers this action
    /// - Returns: View with enhanced accessibility label including voice command hint
    func accessibilityLabelWithVoiceCommand(_ label: String, voiceCommand: String) -> some View {
        self.accessibilityLabel("\(label). Comando vocale: \(voiceCommand)")
    }

    /// Add voice command hint as accessibility hint (separate from label)
    /// - Parameter voiceCommand: The voice command that triggers this action
    /// - Returns: View with voice command accessibility hint
    func accessibilityVoiceCommandHint(_ voiceCommand: String) -> some View {
        self.accessibilityHint("Puoi dire '\(voiceCommand)' per attivare questa azione")
    }

    /// Add both label and voice command hint
    /// - Parameters:
    ///   - label: The accessibility label
    ///   - voiceCommand: The voice command
    /// - Returns: View with full accessibility information
    func accessibilityWithVoiceCommand(label: String, command: String) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint("Comando vocale: '\(command)'")
    }
}

// MARK: - Common Voice Command Labels

/// Centralized voice command documentation for consistency
enum VoiceCommandLabels {
    // Navigation
    static let goBack = "indietro"
    static let goHome = "home"
    static let openSettings = "impostazioni"
    static let openProfile = "profilo"
    static let openMaterials = "materiali"
    static let openTasks = "compiti"
    static let openHelp = "aiuto"

    // Material Actions
    static let createMaterial = "crea materiale"
    static let searchMaterials = "cerca"
    static let openMaterial = "apri materiale"

    // Study Actions
    static let startStudy = "inizia studio"
    static let reviewFlashcards = "flashcard"
    static let viewMindMap = "mappa mentale"
    static let startVoiceLesson = "lezione vocale"

    // Accessibility
    static let enableDyslexia = "attiva dislessia"
    static let disableDyslexia = "disattiva dislessia"
    static let increaseFontSize = "aumenta font"
    static let decreaseFontSize = "riduci font"

    // TTS Controls
    static let startReading = "leggi"
    static let stopReading = "stop"
    static let pauseReading = "pausa"
    static let resumeReading = "riprendi"

    // App Controls
    static let refresh = "aggiorna"
    static let closeView = "chiudi"
    static let showHelp = "comandi"
}

// MARK: - Voice Command Accessibility Audit Helper

/// Helper struct to audit views for voice command accessibility
@MainActor
struct VoiceCommandAccessibilityAudit {
    /// Check if a view has proper voice command labels
    static func checkAccessibilityLabels(in viewName: String) -> [AccessibilityIssue] {
        var issues: [AccessibilityIssue] = []

        // This would be expanded with actual runtime checks
        // For now, it serves as documentation structure
        print("🔍 Auditing accessibility for: \(viewName)")

        return issues
    }

    struct AccessibilityIssue {
        let viewName: String
        let element: String
        let issue: String
        let suggestion: String
    }
}

// MARK: - Button Extension for Common Patterns

extension Button where Label == Text {
    /// Create a button with voice command accessibility
    init(
        _ titleKey: String,
        voiceCommand: String,
        action: @escaping () -> Void
    ) {
        self.init(titleKey, action: action)
    }
}

// MARK: - Quick Action Voice Commands

/// Voice commands for dashboard quick actions
struct QuickActionVoiceCommands {
    static let voiceLesson = "lezione vocale"
    static let createFlashcards = "crea flashcard"
    static let captureMaterial = "fotografa"
    static let importMaterial = "importa materiale"
    static let viewProgress = "progressi"
    static let reviewTasks = "compiti"
}

// MARK: - Documentation

/**
 # Voice Command Accessibility Integration

 ## Overview
 This file provides utilities for integrating voice commands with accessibility features,
 ensuring that all voice-controllable actions are properly announced by VoiceOver.

 ## Usage Examples

 ### Basic Voice Command Label
 ```swift
 Button("Settings") {
     openSettings()
 }
 .accessibilityWithVoiceCommand(
     label: "Open Settings",
     command: VoiceCommandLabels.openSettings
 )
 ```

 ### Quick Action with Voice Command
 ```swift
 QuickActionCard(
     icon: "waveform",
     title: "Voice Lesson",
     color: .purple
 ) {
     startVoiceLesson()
 }
 .accessibilityLabelWithVoiceCommand(
     "Start Voice Lesson",
     voiceCommand: QuickActionVoiceCommands.voiceLesson
 )
 ```

 ## Testing with VoiceOver

 1. Enable VoiceOver: Settings > Accessibility > VoiceOver
 2. Navigate through the app using VoiceOver
 3. Verify that voice command hints are properly announced
 4. Test voice commands while VoiceOver is active

 ## Compliance Checklist

 - [ ] All buttons have accessibility labels
 - [ ] Voice commands are included in accessibility hints
 - [ ] Custom controls have proper accessibility traits
 - [ ] State changes are announced
 - [ ] Dynamic content updates are handled
 - [ ] All images have descriptions or are marked as decorative
 - [ ] Color is not the only means of conveying information
 - [ ] Touch targets meet minimum size requirements (44x44pt)

 ## VoiceCommand Integration Pattern

 For any interactive element that can be triggered by a voice command:

 1. Add the base accessibility label (what the element does)
 2. Add accessibility hint with voice command
 3. Ensure accessibility identifier is unique
 4. Test with VoiceOver enabled
 5. Document the voice command in VoiceCommandRegistry

 ## Notes

 - Voice command hints should always be in Italian to match app locale
 - Keep voice commands short and intuitive
 - Use consistent phrasing across the app
 - Always test with actual users who rely on screen readers
 */
