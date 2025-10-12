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
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

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
        }
        .modelContainer(sharedModelContainer)
    }
}
