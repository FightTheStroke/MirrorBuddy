//
//  MainTabView.swift
//  MirrorBuddy
//
//  Task 109: Reduced to lightweight tab coordinator
//  All tab content extracted to separate view files for better organization
//

import SwiftData
import SwiftUI

/// Sheet type for consolidated sheet presentation (Fix: SwiftUI allows only 1 sheet per view)
/// Note: Voice conversation removed - now handled by SmartVoiceButton (Task 139.3)
enum MainTabSheet: Identifiable {
    case materialImport
    case settings
    case profile
    case help

    var id: String {
        switch self {
        case .materialImport: return "import"
        case .settings: return "settings"
        case .profile: return "profile"
        case .help: return "help"
        }
    }
}

/// Main tab coordinator - lightweight container for app navigation (Task 109)

struct MainTabView: View {
    @EnvironmentObject var voiceCommandHandler: AppVoiceCommandHandler
    @State private var selectedTab = 0
    @State private var activeSheet: MainTabSheet?

    var body: some View {
        ZStack {
            // Main tab view
            TabView(selection: $selectedTab) {
                // MARK: - Dashboard Tab (Materiali)
                // SWITCHED TO SIMPLE DASHBOARD - User feedback: "UI fa ancora cagare"
                SimpleDashboardView()
                    .tabItem {
                        Label {
                            Text("Materiali")
                                .font(.headline)
                        } icon: {
                            Image(systemName: "books.vertical")
                                .font(.system(size: 28))
                        }
                    }
                    .tag(0)

                // MARK: - Study Tab (Studia)
                StudyView()
                    .tabItem {
                        Label {
                            Text("Studia")
                                .font(.headline)
                        } icon: {
                            Image(systemName: "brain.head.profile")
                                .font(.system(size: 28))
                        }
                    }
                    .tag(1)

                // MARK: - Tasks Tab (Compiti)
                TasksView()
                    .tabItem {
                        Label {
                            Text("Compiti")
                                .font(.headline)
                        } icon: {
                            Image(systemName: "checklist")
                                .font(.system(size: 28))
                        }
                    }
                    .tag(2)

                // MARK: - Voice Tab (Voce)
                VoiceView()
                    .tabItem {
                        Label {
                            Text("Voce")
                                .font(.headline)
                        } icon: {
                            Image(systemName: "waveform")
                                .font(.system(size: 28))
                        }
                    }
                    .tag(3)
            }
            // Larger tab bar for child-friendly touch targets
            .onAppear {
                let appearance = UITabBarAppearance()
                appearance.configureWithDefaultBackground()

                // Increase tab bar height and icon size via item appearance
                let itemAppearance = UITabBarItemAppearance()
                itemAppearance.normal.iconColor = UIColor.systemGray
                itemAppearance.selected.iconColor = UIColor.systemBlue

                // Larger font for labels
                let normalAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 12, weight: .medium)
                ]
                let selectedAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 12, weight: .semibold)
                ]

                itemAppearance.normal.titleTextAttributes = normalAttributes
                itemAppearance.selected.titleTextAttributes = selectedAttributes

                appearance.stackedLayoutAppearance = itemAppearance
                appearance.inlineLayoutAppearance = itemAppearance
                appearance.compactInlineLayoutAppearance = itemAppearance

                UITabBar.appearance().standardAppearance = appearance
                UITabBar.appearance().scrollEdgeAppearance = appearance
            }

            // MARK: - Smart Voice Button (Task 139.3 + Task 113: Unified voice entry point with safe positioning)
            // Single floating button for all voice interactions (commands + conversation)
            // Task 113: Now handles its own safe area positioning, orientation, and keyboard awareness
            SmartVoiceButton()
                .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                .ignoresSafeArea(edges: .bottom)
                .allowsHitTesting(true)

            // MARK: - Voice Command Feedback (Task 103)
            // Global feedback overlay for voice commands
            VoiceCommandFeedbackView()
                .zIndex(999)
        }
        // Consolidated sheet presentation (Fix: SwiftUI allows only 1 sheet per view)
        // Note: Voice conversation sheet removed - now handled by SmartVoiceButton (Task 139.3)
        .sheet(item: $activeSheet) { sheetType in
            switch sheetType {
            case .materialImport:
                MaterialImportView()
            case .settings:
                SettingsView()
            case .profile:
                ProfileView()
            case .help:
                VoiceCommandHelpView()
            }
        }
        // Voice command navigation bindings (Assessment fix)
        .onChange(of: voiceCommandHandler.showMaterials) { _, newValue in
            if newValue {
                selectedTab = 0 // Dashboard/Materials tab
                voiceCommandHandler.showMaterials = false // Reset flag
            }
        }
        .onChange(of: voiceCommandHandler.showTasks) { _, newValue in
            if newValue {
                selectedTab = 2 // Tasks tab
                voiceCommandHandler.showTasks = false // Reset flag
            }
        }
        .onChange(of: voiceCommandHandler.showStudy) { _, newValue in
            if newValue {
                selectedTab = 1 // Study tab (Task 111)
                voiceCommandHandler.showStudy = false // Reset flag
                // studyMode is maintained for StudyView to use
            }
        }
        // Voice command sheet triggers (consolidated via activeSheet)
        .onChange(of: voiceCommandHandler.showMaterialImport) { _, show in
            if show {
                activeSheet = .materialImport
                voiceCommandHandler.showMaterialImport = false
            }
        }
        .onChange(of: voiceCommandHandler.showSettings) { _, show in
            if show {
                activeSheet = .settings
                voiceCommandHandler.showSettings = false
            }
        }
        .onChange(of: voiceCommandHandler.showProfile) { _, show in
            if show {
                activeSheet = .profile
                voiceCommandHandler.showProfile = false
            }
        }
        .onChange(of: voiceCommandHandler.showHelp) { _, show in
            if show {
                activeSheet = .help
                voiceCommandHandler.showHelp = false
            }
        }
    }
}

// MARK: - Preview

#Preview {
    MainTabView()
        .modelContainer(for: Material.self, inMemory: true)
}
