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

        // Subject-specific shortcuts
        AppShortcut(
            intent: StartConversationIntent(subject: "matematica"),
            phrases: [
                "Aiutami con la matematica",
                "Parla di matematica con \(.applicationName)",
                "Spiegami la matematica"
            ],
            shortTitle: "Matematica",
            systemImageName: "function"
        )

        AppShortcut(
            intent: StartConversationIntent(subject: "italiano"),
            phrases: [
                "Aiutami con l'italiano",
                "Parla di italiano con \(.applicationName)",
                "Spiegami l'italiano"
            ],
            shortTitle: "Italiano",
            systemImageName: "book"
        )

        AppShortcut(
            intent: StartConversationIntent(subject: "scienze"),
            phrases: [
                "Aiutami con le scienze",
                "Parla di scienze con \(.applicationName)",
                "Spiegami le scienze"
            ],
            shortTitle: "Scienze",
            systemImageName: "flask"
        )

        AppShortcut(
            intent: StartConversationIntent(subject: "inglese"),
            phrases: [
                "Aiutami con l'inglese",
                "Parla di inglese con \(.applicationName)",
                "Spiegami l'inglese"
            ],
            shortTitle: "Inglese",
            systemImageName: "globe"
        )

        AppShortcut(
            intent: StartConversationIntent(subject: "storia"),
            phrases: [
                "Aiutami con la storia",
                "Parla di storia con \(.applicationName)",
                "Spiegami la storia"
            ],
            shortTitle: "Storia",
            systemImageName: "clock"
        )
    }

    static var shortcutTileColor: ShortcutTileColor = .blue
}
