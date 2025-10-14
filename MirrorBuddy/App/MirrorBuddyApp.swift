//
//  MirrorBuddyApp.swift
//  MirrorBuddy
//
//  Created by Mario D'Angelo on 12/10/25.
//

import SwiftData
import SwiftUI

@main
struct MirrorBuddyApp: App {
    init() {
        // Start performance monitoring (Task 59)
        _Concurrency.Task { @MainActor in
            PerformanceMonitor.shared.startAppLaunch()
        }

        // Register background tasks
        BackgroundSyncManager.shared.registerBackgroundTasks()
        BackgroundTaskScheduler.shared.registerBackgroundTasks()

        // Register scheduled material sync (Task 72)
        // Note: register() is sync and can be called from init
        _Concurrency.Task { @MainActor in
            BackgroundSyncService.shared.register()
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
            TrackedDriveFile.self
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

            return container
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environment(LocalizationManager.shared)
                .onAppear {
                    // Complete performance monitoring setup (Task 59)
                    _Concurrency.Task { @MainActor in
                        PerformanceMonitor.shared.completeAppLaunch()
                        PerformanceMonitor.shared.setMemoryBaseline()
                        PerformanceMonitor.shared.startFPSMonitoring()
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

                    // Request notification authorization
                    _Concurrency.Task {
                        await NotificationManager.shared.checkAuthorization()
                        if !NotificationManager.shared.isAuthorized {
                            _ = try? await NotificationManager.shared.requestAuthorization()
                        }
                    }
                }
        }
        .modelContainer(sharedModelContainer)
    }
}
