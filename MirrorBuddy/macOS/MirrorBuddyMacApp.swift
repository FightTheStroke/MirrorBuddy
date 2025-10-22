//
//  MirrorBuddyMacApp.swift
//  MirrorBuddy macOS
//
//  macOS 26 "Tahoe" native app entry point
//  Liquid Glass design system + Apple Intelligence integration
//

import SwiftUI
import SwiftData

@main
struct MirrorBuddyMacApp: App {
    init() {
        // Start performance monitoring
        Task { @MainActor in
            PerformanceMonitor.shared.startAppLaunch()
        }

        print("🍎 MirrorBuddy for macOS 26 Tahoe")
        print("✨ Liquid Glass UI enabled")
        print("🤖 Apple Intelligence ready")
    }

    /// Shared model container (reused from iOS with macOS-specific config)
    var sharedModelContainer: ModelContainer = {
        // Pre-create Application Support directory
        let fileManager = FileManager.default
        if let appSupportURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            try? fileManager.createDirectory(at: appSupportURL, withIntermediateDirectories: true, attributes: nil)
        }

        let schema = Schema([
            SubjectEntity.self,
            Material.self,
            MindMap.self,
            MindMapNode.self,
            Flashcard.self,
            Task.self,
            UserProgress.self,
            TrackedDriveFile.self,
            Transcript.self,
            VoiceMessage.self,
            VoiceConversation.self,
            StudySession.self
        ])

        // CloudKit always enabled on macOS (no simulator issues)
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .private("iCloud.com.mirrorbuddy.MirrorBuddy")
        )

        do {
            let container = try ModelContainer(for: schema, configurations: [modelConfiguration])

            // Initialize default subjects
            let context = container.mainContext
            let subjectService = SubjectService(modelContext: context)
            try? subjectService.initializeDefaultSubjects()

            // Migrate existing data
            let migrationService = DataMigrationService(modelContext: context)
            if migrationService.isMigrationNeeded() {
                Task { @MainActor in
                    do {
                        let result = try await migrationService.performMigration()
                        print("✅ Data migration completed: \(result.summary)")
                    } catch {
                        print("⚠️ Data migration failed: \(error.localizedDescription)")
                    }
                }
            }

            return container
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        // Main window with Liquid Glass UI
        WindowGroup {
            MacOSMainView()
                .environment(LocalizationManager.shared)
                .environment(CloudKitSyncMonitor.shared)
                .environmentObject(AppVoiceCommandHandler.shared)
                .environment(\.font, .openDyslexicBody) // Mario's dyslexia-friendly font
                .frame(minWidth: 900, minHeight: 600) // Minimum window size
                .onAppear {
                    // Performance monitoring
                    Task { @MainActor in
                        PerformanceMonitor.shared.completeAppLaunch()
                        PerformanceMonitor.shared.setMemoryBaseline()
                        PerformanceMonitor.shared.logBatteryStatus()
                    }

                    // Restore window frame
                    WindowManager.shared.restoreWindowFrame()

                    // Configure services
                    Task { @MainActor in
                        DriveSyncService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        BackgroundSyncService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        GmailService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        GoogleCalendarService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        UpdateManager.shared.configure(modelContext: sharedModelContainer.mainContext)
                    }

                    // Request notification authorization
                    Task {
                        await NotificationManager.shared.checkAuthorization()
                        if !NotificationManager.shared.isAuthorized {
                            _ = try? await NotificationManager.shared.requestAuthorization()
                        }
                    }

                    // Start offline monitoring
                    Task { @MainActor in
                        OfflineManager.shared.startMonitoring()
                    }
                }
                .onDisappear {
                    // Save window frame on quit
                    WindowManager.shared.saveWindowFrame()
                }
        }
        .windowStyle(.automatic)
        .windowResizability(.contentSize)
        .commands {
            // Custom menu bar commands
            MirrorBuddyCommands()
        }
        .modelContainer(sharedModelContainer)

        // Settings window (Cmd+,)
        Settings {
            SettingsView()
                .environment(\.font, .openDyslexicBody)
        }
    }
}
