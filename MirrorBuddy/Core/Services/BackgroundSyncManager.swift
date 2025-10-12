import BackgroundTasks
import Foundation
import SwiftData

/// Manager for background sync operations
final class BackgroundSyncManager {
    static let shared = BackgroundSyncManager()

    /// Background task identifier
    static let backgroundSyncTaskIdentifier = "com.mirrorbuddy.MirrorBuddy.backgroundSync"

    private init() {}

    /// Register background task
    func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.backgroundSyncTaskIdentifier,
            using: nil
        ) { task in
            guard let bgProcessingTask = task as? BGProcessingTask else {
                print("[BackgroundSyncManager] Invalid task type")
                task.setTaskCompleted(success: false)
                return
            }
            self.handleBackgroundSync(task: bgProcessingTask)
        }
    }

    /// Schedule next background sync
    func scheduleBackgroundSync() {
        let request = BGProcessingTaskRequest(identifier: Self.backgroundSyncTaskIdentifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes

        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BackgroundSyncManager] Background sync scheduled")
        } catch {
            print("[BackgroundSyncManager] Failed to schedule background sync: \(error)")
        }
    }

    /// Handle background sync task
    private func handleBackgroundSync(task bgTask: BGProcessingTask) {
        print("[BackgroundSyncManager] Background sync started")

        // Schedule next sync
        scheduleBackgroundSync()

        // Set expiration handler
        bgTask.expirationHandler = {
            print("[BackgroundSyncManager] Background sync expired")
            CloudKitSyncMonitor.shared.syncFailed(
                with: NSError(
                    domain: "BackgroundSync",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Background sync expired"]
                )
            )
            bgTask.setTaskCompleted(success: false)
        }

        // Perform sync
        DispatchQueue.global(qos: .background).async {
            // CloudKit sync happens automatically via SwiftData
            // This just triggers the monitor update
            CloudKitSyncMonitor.shared.requestManualSync()

            // Wait for sync to complete
            Thread.sleep(forTimeInterval: 5.0)

            // Mark as completed
            CloudKitSyncMonitor.shared.syncCompleted()
            bgTask.setTaskCompleted(success: true)
            print("[BackgroundSyncManager] Background sync completed")
        }
    }

    /// Cancel scheduled background sync
    func cancelBackgroundSync() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.backgroundSyncTaskIdentifier)
        print("[BackgroundSyncManager] Background sync cancelled")
    }
}
