//
//  MainTabView.swift
//  MirrorBuddy
//
//  Task 109: Reduced to lightweight tab coordinator
//  All tab content extracted to separate view files for better organization
//

import SwiftUI
import SwiftData

/// Main tab coordinator - lightweight container for app navigation (Task 109)

struct MainTabView: View {
    @State private var selectedTab = 0
    @State private var showingVoiceInterface = false

    var body: some View {
        ZStack {
            // Main tab view
            TabView(selection: $selectedTab) {
            // MARK: - Dashboard Tab (Materiali)
            DashboardView()
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

            // MARK: - Persistent Voice Button (Task 106)
            // Floating voice activation button accessible from all tabs
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    PersistentVoiceButton(isPresented: $showingVoiceInterface)
                        .padding(.trailing, 16)
                        .padding(.bottom, 90) // Position above tab bar
                        .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                }
            }
            .allowsHitTesting(true)

            // MARK: - Voice Command Feedback (Task 103)
            // Global feedback overlay for voice commands
            VoiceCommandFeedbackView()
                .zIndex(999)
        }
        // Voice interface sheet (attached to ZStack, not to VoiceCommandFeedbackView)
        .sheet(isPresented: $showingVoiceInterface) {
            NavigationStack {
                VoiceConversationView()
            }
        }
    }
}

// MARK: - Preview

#Preview {
    MainTabView()
        .modelContainer(for: Material.self, inMemory: true)
}
