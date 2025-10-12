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
    @State private var syncMonitor = CloudKitSyncMonitor.shared

    init() {
        // Register background tasks
        BackgroundSyncManager.shared.registerBackgroundTasks()
    }

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            SubjectEntity.self,
            Material.self,
            MindMap.self,
            MindMapNode.self,
            Flashcard.self,
            Task.self,
            UserProgress.self
        ])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .private("iCloud.com.mirrorbuddy.MirrorBuddy")
        )

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
            ContentView()
                .environment(LocalizationManager.shared)
                .environment(syncMonitor)
                .onAppear {
                    // Schedule background sync on app launch
                    BackgroundSyncManager.shared.scheduleBackgroundSync()
                }
        }
        .modelContainer(sharedModelContainer)
    }
}
