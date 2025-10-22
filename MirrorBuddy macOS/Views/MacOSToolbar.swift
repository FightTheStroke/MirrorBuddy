#if os(macOS)
//
//  MacOSToolbar.swift
//  MirrorBuddy macOS
//
//  Floating Liquid Glass toolbar with primary actions
//

import SwiftUI

struct MacOSToolbar: ToolbarContent {
    let selectedSection: SidebarSection
    @State private var isSearching = false
    @State private var searchText = ""

    var body: some ToolbarContent {
        // MARK: - Leading Items (Left side)
        ToolbarItemGroup(placement: .navigation) {
            // Aggiornami Button (Primary CTA)
            Button(action: syncAll) {
                Label("Aggiornami", systemImage: "arrow.triangle.2.circlepath")
            }
            .buttonStyle(.borderedProminent)
            .glassEffect(.clear)
            .help("Sincronizza Drive, Gmail e Calendar")
            .symbolEffect(.bounce, value: UpdateManager.shared.isSyncing)
        }

        // MARK: - Center Items
        ToolbarItemGroup(placement: .principal) {
            if isSearching {
                // Search field
                TextField("Cerca materiali...", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 300)
                    .font(.openDyslexicBody)
                    .onSubmit {
                        performSearch()
                    }

                Button("Chiudi") {
                    isSearching = false
                    searchText = ""
                }
                .buttonStyle(.borderless)
            }
        }

        // MARK: - Trailing Items (Right side)
        ToolbarItemGroup(placement: .primaryAction) {
            // Search Button
            Button(action: { isSearching.toggle() }) {
                Label("Cerca", systemImage: "magnifyingglass")
            }
            .help("Cerca (Cmd+F)")
            .keyboardShortcut("f", modifiers: .command)

            // Voice Conversation Button (ALWAYS VISIBLE)
            Button(action: startVoiceConversation) {
                Label("Voce", systemImage: "waveform")
            }
            .buttonStyle(.borderedProminent)
            .glassEffect(.tinted(.blue.opacity(0.3)))
            .help("Conversazione vocale (Cmd+Shift+V)")
            .keyboardShortcut("v", modifiers: [.command, .shift])

            // Add Material Button
            Button(action: addMaterial) {
                Label("Aggiungi", systemImage: "plus")
            }
            .help("Nuovo materiale (Cmd+N)")
            .keyboardShortcut("n", modifiers: .command)
        }
    }

    // MARK: - Actions
    private func syncAll() {
        Task { @MainActor in
            await UpdateManager.shared.performFullUpdate()
        }
    }

    private func startVoiceConversation() {
        // Navigate to voice or trigger voice overlay
        NotificationCenter.default.post(name: .startVoiceConversation, object: nil)
    }

    private func addMaterial() {
        // Show file picker or import sheet
        NotificationCenter.default.post(name: .showMaterialImport, object: nil)
    }

    private func performSearch() {
        // Perform search with searchText
        print("🔍 Searching for: \(searchText)")
        // TODO: Implement Spotlight-powered search
    }
}

// MARK: - Notification Names
extension Notification.Name {
    // Note: startVoiceConversation is defined in StartConversationIntent.swift
    static let showMaterialImport = Notification.Name("showMaterialImport")
}

#endif
