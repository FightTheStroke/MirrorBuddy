#if os(macOS)
//
//  MirrorBuddyCommands.swift
//  MirrorBuddy macOS
//
//  Custom menu bar commands for macOS
//  Optimized for one-handed (right hand) operation
//

import SwiftUI
import UniformTypeIdentifiers
import Combine

struct MirrorBuddyCommands: Commands {
    @FocusedValue(\.selectedSection) private var selectedSection
    @StateObject private var windowManager = WindowManager.shared

    var body: some Commands {
        // MARK: - MirrorBuddy Menu (App Menu)
        CommandGroup(replacing: .appInfo) {
            Button("About MirrorBuddy") {
                showAbout()
            }
        }

        CommandGroup(replacing: .appSettings) {
            Button("Preferences...") {
                showPreferences()
            }
            .keyboardShortcut(",", modifiers: .command)
        }

        // MARK: - File Menu
        CommandGroup(replacing: .newItem) {
            Button("New Material") {
                NotificationCenter.default.post(name: .showMaterialImport, object: nil)
            }
            .keyboardShortcut("n", modifiers: .command)

            Button("Import from Files...") {
                importFromFiles()
            }
            .keyboardShortcut("o", modifiers: .command)

            Button("Import from Drive") {
                importFromDrive()
            }
            .keyboardShortcut("d", modifiers: [.command, .shift])
        }

        // MARK: - Edit Menu
        CommandGroup(after: .pasteboard) {
            Divider()

            Button("Find...") {
                showSearch()
            }
            .keyboardShortcut("f", modifiers: .command)

            Button("Voice Conversation") {
                // TODO: Define .startVoiceConversation notification
                NotificationCenter.default.post(name: Notification.Name("startVoiceConversation"), object: nil)
            }
            .keyboardShortcut("v", modifiers: [.command, .shift])

            Button("Writing Tools") {
                // Trigger Apple Intelligence Writing Tools
                showWritingTools()
            }
            .keyboardShortcut("w", modifiers: [.command, .shift])
        }

        // MARK: - View Menu
        CommandGroup(before: .sidebar) {
            Button("Materials") {
                navigateToSection(.materials)
            }
            .keyboardShortcut("1", modifiers: .command)

            Button("Study") {
                navigateToSection(.study)
            }
            .keyboardShortcut("2", modifiers: .command)

            Button("Tasks") {
                navigateToSection(.tasks)
            }
            .keyboardShortcut("3", modifiers: .command)

            Button("Voice") {
                navigateToSection(.voice)
            }
            .keyboardShortcut("4", modifiers: .command)

            Divider()
        }

        CommandGroup(after: .sidebar) {
            Toggle("Always on Top", isOn: Binding(
                get: { windowManager.isAlwaysOnTop },
                set: { windowManager.setAlwaysOnTop($0) }
            ))
            .keyboardShortcut("t", modifiers: [.command, .shift])

            Divider()
        }

        // MARK: - Window Menu
        CommandGroup(replacing: .windowSize) {
            Button("Minimize") {
                minimizeWindow()
            }
            .keyboardShortcut("m", modifiers: .command)

            Button("Zoom") {
                zoomWindow()
            }

            Divider()

            Button("Center Window") {
                windowManager.centerWindow()
            }

            Button("Reset Window Size") {
                resetWindowSize()
            }
        }

        // MARK: - Help Menu
        CommandGroup(replacing: .help) {
            Button("MirrorBuddy Help") {
                openHelp()
            }
            .keyboardShortcut("?", modifiers: .command)

            Button("Keyboard Shortcuts") {
                showKeyboardShortcuts()
            }
            .keyboardShortcut("/", modifiers: .command)

            Divider()

            Button("Send Feedback") {
                sendFeedback()
            }

            Button("Report a Problem") {
                reportProblem()
            }
        }
    }

    // MARK: - Actions
    private func showAbout() {
        NSApplication.shared.orderFrontStandardAboutPanel()
    }

    private func showPreferences() {
        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
    }

    private func importFromFiles() {
        #if os(macOS)
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.pdf, .text, .image, .data]

        panel.begin { response in
            if response == .OK {
                for url in panel.urls {
                    print("📄 Importing file: \(url.lastPathComponent)")
                    // TODO: Import file via MaterialProcessingPipeline
                }
            }
        }
        #endif
    }

    private func importFromDrive() {
        // TODO: Add DriveSyncService to macOS target
        // Trigger Drive sync
        Task { @MainActor in
            // await DriveSyncService.shared.performSync()
            print("📂 Drive import requested (DriveSyncService not yet in macOS target)")
        }
    }

    private func showSearch() {
        // Focus search field or show Spotlight-like search
        NotificationCenter.default.post(name: Notification.Name("showSearch"), object: nil)
    }

    private func showWritingTools() {
        // This would trigger system Writing Tools on selected text
        // In practice, Writing Tools are triggered automatically on text fields
        print("✍️ Writing Tools requested")
    }

    private func navigateToSection(_ section: SidebarSection) {
        NotificationCenter.default.post(
            name: Notification.Name("navigateToSection"),
            object: section
        )
    }

    private func minimizeWindow() {
        NSApplication.shared.keyWindow?.miniaturize(nil)
    }

    private func zoomWindow() {
        NSApplication.shared.keyWindow?.zoom(nil)
    }

    private func resetWindowSize() {
        if let window = NSApplication.shared.keyWindow {
            window.setFrame(NSRect(x: window.frame.origin.x,
                                  y: window.frame.origin.y,
                                  width: 1200,
                                  height: 800),
                          display: true,
                          animate: true)
        }
    }

    private func openHelp() {
        navigateToSection(.help)
    }

    private func showKeyboardShortcuts() {
        NotificationCenter.default.post(name: Notification.Name("showKeyboardShortcuts"), object: nil)
    }

    private func sendFeedback() {
        if let url = URL(string: "mailto:feedback@mirrorbuddy.app") {
            NSWorkspace.shared.open(url)
        }
    }

    private func reportProblem() {
        if let url = URL(string: "https://github.com/FightTheStroke/MirrorBuddy/issues/new") {
            NSWorkspace.shared.open(url)
        }
    }
}

// MARK: - Focused Values
struct SelectedSectionKey: FocusedValueKey {
    typealias Value = SidebarSection
}

extension FocusedValues {
    var selectedSection: SelectedSectionKey.Value? {
        get { self[SelectedSectionKey.self] }
        set { self[SelectedSectionKey.self] = newValue }
    }
}

#endif
