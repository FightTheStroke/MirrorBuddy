//
//  AppShortcutsProvider.swift
//  MirrorBuddy
//
//  Suggested Siri phrases for MirrorBuddy
//

import AppIntents

/// Provides suggested Siri shortcuts for MirrorBuddy
@available(iOS 16.0, *)
struct MirrorBuddyShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        // Main conversation shortcut
        AppShortcut(
            intent: StartConversationIntent(),
            phrases: [
                "Parla con \(.applicationName)",
                "Aiutami con \(.applicationName)",
                "Inizia conversazione con \(.applicationName)",
                "Apri \(.applicationName) e parla"
            ],
            shortTitle: "Parla con MirrorBuddy",
            systemImageName: "mic.circle.fill"
        )

        // Note: Subject-specific shortcuts removed due to @Parameter incompatibility
        // Users can still invoke with "Hey Siri, parla con MirrorBuddy di matematica"
    }

    static let shortcutTileColor: ShortcutTileColor = .blue
}
