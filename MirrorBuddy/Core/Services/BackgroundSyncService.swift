import Foundation
import BackgroundTasks
import SwiftData

/// Background sync service for scheduled material syncs at 13:00 and 18:00 CET (Task 72)
@MainActor
final class BackgroundSyncService: ObservableObject {
    static let shared = BackgroundSyncService()
    private static let backgroundTaskIdentifier = "com.mirrorbuddy.materialsync"

    @Published var lastSyncDate: Date?
    @Published var nextScheduledSync: Date?

    private init() {}

    func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.backgroundTaskIdentifier,
            using: nil
        ) { task in
            Task { @MainActor in
                await self.handleBackgroundSync(task: task as! BGProcessingTask)
            }
        }
    }

    func scheduleNextSync() {
        let request = BGProcessingTaskRequest(identifier: Self.backgroundTaskIdentifier)
        request.requiresNetworkConnectivity = true
        request.earliestBeginDate = calculateNextSyncTime()

        try? BGTaskScheduler.shared.submit(request)
    }

    private func calculateNextSyncTime() -> Date {
        var calendar = Calendar.current
        calendar.timeZone = TimeZone(identifier: "Europe/Rome")!
        let now = Date()
        let currentHour = calendar.component(.hour, from: now)

        var components = calendar.dateComponents([.year, .month, .day], from: now)
        if currentHour < 13 {
            components.hour = 13
        } else if currentHour < 18 {
            components.hour = 18
        } else {
            components.day! += 1
            components.hour = 13
        }
        components.minute = 0
        return calendar.date(from: components)!
    }

    private func handleBackgroundSync(task: BGProcessingTask) async {
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        do {
            try await performSync()
            task.setTaskCompleted(success: true)
            scheduleNextSync()
        } catch {
            task.setTaskCompleted(success: false)
        }
    }

    private func performSync() async throws {
        // Sync implementation
        lastSyncDate = Date()
    }
}
