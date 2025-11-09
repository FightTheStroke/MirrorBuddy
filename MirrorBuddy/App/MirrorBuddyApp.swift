//
//  MirrorBuddyApp.swift
//  MirrorBuddy
//
//  Created by Mario D'Angelo on 12/10/25.
//

import SwiftData
import SwiftUI

/// Wrapper view that applies localization dynamically
/// MirrorBuddy 2.0: Now uses TodayView instead of 4-tab navigation
private struct LocalizedContentView: View {
    @Environment(\.localizationManager) private var localizationManager

    var body: some View {
        TodayView()
            .environment(\.locale, localizationManager.currentLanguage.locale)
            .id(localizationManager.currentLanguage.rawValue) // Force refresh on language change
    }
}

@main
struct MirrorBuddyApp: App {
    init() {
        // Configure OpenDyslexic font for navigation bars
        configureNavigationBarFont()

        // Start performance monitoring (Task 59)
        _Concurrency.Task { @MainActor in
            PerformanceMonitor.shared.startAppLaunch()
        }

        // Register background tasks (must be on MainActor)
        _Concurrency.Task { @MainActor in
            BackgroundSyncManager.shared.registerBackgroundTasks()
            BackgroundTaskScheduler.shared.registerBackgroundTasks()
        }

        // Register scheduled material sync (Task 72)
        _Concurrency.Task { @MainActor in
            BackgroundSyncService.shared.register()
        }
    }

    /// Configure OpenDyslexic font for UIKit navigation bars
    private func configureNavigationBarFont() {
        // Verify OpenDyslexic fonts are loaded
        #if DEBUG
        verifyOpenDyslexicFonts()
        #endif

        // Navigation bar large title
        let largeTitleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont(name: "OpenDyslexic-Bold", size: 34) ?? UIFont.systemFont(ofSize: 34, weight: .bold)
        ]
        UINavigationBar.appearance().largeTitleTextAttributes = largeTitleAttributes

        // Navigation bar regular title
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont(name: "OpenDyslexic-Bold", size: 18) ?? UIFont.systemFont(ofSize: 18, weight: .semibold)
        ]
        UINavigationBar.appearance().titleTextAttributes = titleAttributes
    }

    /// Verify that OpenDyslexic fonts are properly loaded (DEBUG only)
    private func verifyOpenDyslexicFonts() {
        let requiredFonts = ["OpenDyslexic-Regular", "OpenDyslexic-Bold", "OpenDyslexic-Italic", "OpenDyslexic-Bold-Italic"]
        var allLoaded = true

        for fontName in requiredFonts {
            if UIFont(name: fontName, size: 12) != nil {
                print("✅ Font loaded: \(fontName)")
            } else {
                print("❌ Font NOT loaded: \(fontName)")
                allLoaded = false
            }
        }

        if allLoaded {
            print("✅ All OpenDyslexic fonts loaded successfully!")
        } else {
            print("⚠️ WARNING: Some OpenDyslexic fonts failed to load. Check Info.plist UIAppFonts configuration.")
        }
    }

    var sharedModelContainer: ModelContainer = {
        // Pre-create Application Support directory to avoid CoreData error logs
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

        // Automatically enable CloudKit on real devices, disable on simulator
        // Simulator doesn't have provisioning profile needed for CloudKit
        #if targetEnvironment(simulator)
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
            // CloudKit disabled on simulator - no provisioning profile
        )
        #else
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .private("iCloud.com.mirrorbuddy.MirrorBuddy")
        )
        #endif

        do {
            let container = try ModelContainer(for: schema, configurations: [modelConfiguration])

            // Initialize default subjects on first launch
            let context = container.mainContext
            let subjectService = SubjectService(modelContext: context)
            try? subjectService.initializeDefaultSubjects()

            // Task 83.5: Migrate existing data to use SubjectEntity
            let migrationService = DataMigrationService(modelContext: context)
            if migrationService.isMigrationNeeded() {
                _Concurrency.Task { @MainActor in
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
        WindowGroup {
            LocalizedContentView()
                .environment(LocalizationManager.shared)
                .environment(CloudKitSyncMonitor.shared)
                .environmentObject(AppVoiceCommandHandler.shared) // Task 103: Inject voice command handler
                .environment(\.font, .openDyslexicBody) // Apply OpenDyslexic as default font (modern best practice)
                .onAppear {
                    // Complete performance monitoring setup (Task 59)
                    _Concurrency.Task { @MainActor in
                        PerformanceMonitor.shared.completeAppLaunch()
                        PerformanceMonitor.shared.setMemoryBaseline()
                        // FPS monitoring disabled - causes severe performance degradation
                        // PerformanceMonitor.shared.startFPSMonitoring()
                        PerformanceMonitor.shared.logBatteryStatus()
                    }

                    // Schedule background sync on app launch (on main thread)
                    _Concurrency.Task { @MainActor in
                        BackgroundSyncManager.shared.scheduleBackgroundSync()
                    }

                    // Configure Google Drive sync service with model context (on main thread)
                    _Concurrency.Task { @MainActor in
                        DriveSyncService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        BackgroundTaskScheduler.shared.scheduleNextSync()
                    }

                    // Configure and schedule material sync (Task 72)
                    _Concurrency.Task { @MainActor in
                        BackgroundSyncService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        BackgroundSyncService.shared.scheduleNextSync()
                    }

                    // Configure Gmail and Calendar services
                    _Concurrency.Task { @MainActor in
                        GmailService.shared.configure(modelContext: sharedModelContainer.mainContext)
                        GoogleCalendarService.shared.configure(modelContext: sharedModelContainer.mainContext)
                    }

                    // Configure UpdateManager (for "Aggiornami" button)
                    _Concurrency.Task { @MainActor in
                        UpdateManager.shared.configure(modelContext: sharedModelContainer.mainContext)
                    }

                    // Request notification authorization
                    _Concurrency.Task {
                        await NotificationManager.shared.checkAuthorization()
                        if !NotificationManager.shared.isAuthorized {
                            _ = try? await NotificationManager.shared.requestAuthorization()
                        }
                    }

                    // Task 57: Start offline network monitoring
                    _Concurrency.Task { @MainActor in
                        OfflineManager.shared.startMonitoring()
                    }

                    // MirrorBuddy 2.0: Initialize continuous voice engine
                    _Concurrency.Task { @MainActor in
                        do {
                            try await ContinuousVoiceEngine.shared.requestPermission()
                            print("✅ Voice engine permission granted")
                        } catch {
                            print("⚠️ Voice engine permission denied: \(error)")
                        }
                    }
                }
        }
        .modelContainer(sharedModelContainer)
    }
}
