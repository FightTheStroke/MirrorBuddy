//
//  MirrorBuddy_macOSApp.swift
//  MirrorBuddy macOS
//
//  Created by Roberto D’Angelo on 22/10/25.
//

import SwiftUI
import SwiftData

@main
struct MirrorBuddy_macOSApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Item.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
