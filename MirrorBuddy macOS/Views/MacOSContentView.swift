#if os(macOS)
//
//  MacOSContentView.swift
//  MirrorBuddy macOS
//
//  Content area that switches based on sidebar selection
//

import SwiftUI

struct MacOSContentView: View {
    let section: SidebarSection

    var body: some View {
        Group {
            switch section {
            case .materials:
                DashboardView()

            case .study:
                StudyView()

            case .tasks:
                TasksView()

            case .voice:
                VoiceView()

            case .statistics:
                StudyStatisticsView()

            case .settings:
                SettingsView()

            case .help:
                HelpView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
        .transition(.asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        ))
        .animation(.smooth(duration: 0.3), value: section)
    }
}

// MARK: - Help View (macOS-specific)
struct HelpView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Benvenuto in MirrorBuddy")
                        .font(.openDyslexicTitle)
                        .foregroundStyle(.primary)

                    Text("Il tuo assistente di studio personale per macOS")
                        .font(.openDyslexicBody)
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Quick Start
                VStack(alignment: .leading, spacing: 16) {
                    Text("Guida Rapida")
                        .font(.openDyslexicHeadline)

                    HelpCard(
                        icon: "waveform",
                        title: "Inizia una conversazione",
                        description: "Premi Cmd+Shift+V o clicca il pulsante Voce per parlare con MirrorBuddy",
                        shortcut: "⌘⇧V"
                    )

                    HelpCard(
                        icon: "plus",
                        title: "Aggiungi materiale",
                        description: "Trascina file PDF, documenti o immagini nella finestra",
                        shortcut: "⌘N"
                    )

                    HelpCard(
                        icon: "arrow.triangle.2.circlepath",
                        title: "Sincronizza",
                        description: "Aggiorna Google Drive, Gmail e Calendar",
                        shortcut: nil
                    )
                }

                Divider()

                // Keyboard Shortcuts
                VStack(alignment: .leading, spacing: 12) {
                    Text("Scorciatoie da tastiera")
                        .font(.openDyslexicHeadline)

                    Text("Premi Cmd+/ per vedere tutte le scorciatoie")
                        .font(.openDyslexicCaption)
                        .foregroundStyle(.secondary)

                    KeyboardShortcutRow(shortcut: "⌘1", description: "Materiali")
                    KeyboardShortcutRow(shortcut: "⌘2", description: "Studia")
                    KeyboardShortcutRow(shortcut: "⌘3", description: "Compiti")
                    KeyboardShortcutRow(shortcut: "⌘4", description: "Voce")
                    KeyboardShortcutRow(shortcut: "⌘⇧V", description: "Conversazione vocale")
                    KeyboardShortcutRow(shortcut: "⌘⇧T", description: "Sempre in primo piano")
                }
            }
            .padding(32)
        }
    }
}

struct HelpCard: View {
    let icon: String
    let title: String
    let description: String
    let shortcut: String?

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundStyle(.blue)
                .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.openDyslexicHeadline)

                Text(description)
                    .font(.openDyslexicCaption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let shortcut = shortcut {
                Text(shortcut)
                    .font(.system(.caption, design: .monospaced))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.quaternary)
                    .cornerRadius(4)
            }
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .glassEffect(.regular)
        .cornerRadius(12)
    }
}

struct KeyboardShortcutRow: View {
    let shortcut: String
    let description: String

    var body: some View {
        HStack {
            Text(shortcut)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 80, alignment: .leading)

            Text(description)
                .font(.openDyslexicBody)
        }
    }
}

// MARK: - Preview
#Preview("Dashboard") {
    MacOSContentView(section: .materials)
        .frame(width: 800, height: 600)
}

#Preview("Help") {
    MacOSContentView(section: .help)
        .frame(width: 800, height: 600)
}

#endif
