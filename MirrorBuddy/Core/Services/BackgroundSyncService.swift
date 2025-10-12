import Foundation
import BackgroundTasks
import SwiftData
import UserNotifications
import os.log

/// Background sync service for scheduled material syncs (Task 72)
@MainActor
final class BackgroundSyncService {
    static let shared = BackgroundSyncService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "BackgroundSync")

    // MARK: - Configuration (Subtask 72.1)

    /// Background task identifier
    static let taskIdentifier = "com.mirrorbuddy.material-sync"

    /// Scheduled sync times (CET)
    private let syncTimes: [(hour: Int, minute: Int)] = [
        (13, 0),  // 13:00 CET
        (18, 0)   // 18:00 CET
    ]

    private var modelContext: ModelContext?
    private var isRegistered = false

    private init() {}

    // MARK: - Registration (Subtask 72.1)

    /// Register background task handler
    func register() {
        guard !isRegistered else {
            logger.warning("Background sync already registered")
            return
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.taskIdentifier,
            using: nil
        ) { [weak self] task in
            guard let self = self else { return }

            _Concurrency.Task { @MainActor in
                await self.handleBackgroundSync(task: task as! BGProcessingTask)
            }
        }

        isRegistered = true
        logger.info("Background sync task registered successfully")
    }

    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Background sync service configured")
    }

    // MARK: - Scheduling (Subtask 72.2)

    /// Schedule next sync at 13:00 or 18:00 CET
    func scheduleNextSync() {
        let calendar = Calendar.current
        let now = Date()

        // Convert current time to CET
        guard let cetTimeZone = TimeZone(identifier: "Europe/Paris") else {
            logger.error("Failed to get CET timezone")
            return
        }

        var earliestSync: Date?

        // Find next sync time
        for syncTime in syncTimes {
            // Create sync date for today
            var components = calendar.dateComponents(in: cetTimeZone, from: now)
            components.hour = syncTime.hour
            components.minute = syncTime.minute
            components.second = 0

            guard var syncDate = calendar.date(from: components) else { continue }

            // If time has passed today, schedule for tomorrow
            if syncDate < now {
                syncDate = calendar.date(byAdding: .day, value: 1, to: syncDate) ?? syncDate
            }

            // Keep earliest sync time
            if earliestSync == nil || syncDate < earliestSync! {
                earliestSync = syncDate
            }
        }

        guard let nextSync = earliestSync else {
            logger.error("Failed to calculate next sync time")
            return
        }

        // Schedule the background task
        let request = BGProcessingTaskRequest(identifier: Self.taskIdentifier)
        request.earliestBeginDate = nextSync
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false // Allow on battery

        do {
            try BGTaskScheduler.shared.submit(request)

            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            formatter.timeZone = cetTimeZone

            logger.info("Background sync scheduled for: \(formatter.string(from: nextSync)) CET")
        } catch {
            logger.error("Failed to schedule background sync: \(error.localizedDescription)")
        }
    }

    /// Cancel all scheduled syncs
    func cancelScheduledSync() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.taskIdentifier)
        logger.info("Cancelled scheduled background sync")
    }

    // MARK: - Sync Implementation (Subtask 72.3)

    /// Handle background sync execution
    private func handleBackgroundSync(task: BGProcessingTask) async {
        logger.info("Background sync task started")

        // Create expiration handler
        task.expirationHandler = { [weak self] in
            self?.logger.warning("Background sync task expired")
            task.setTaskCompleted(success: false)
        }

        do {
            // Perform the sync
            try await performSync()

            // Schedule next sync
            scheduleNextSync()

            // Mark task as completed
            task.setTaskCompleted(success: true)

            // Send completion notification
            sendSyncCompletionNotification(success: true)

            logger.info("Background sync completed successfully")
        } catch {
            logger.error("Background sync failed: \(error.localizedDescription)")

            // Schedule retry (next scheduled time)
            scheduleNextSync()

            // Mark task as failed
            task.setTaskCompleted(success: false)

            // Send failure notification
            sendSyncCompletionNotification(success: false, error: error)
        }
    }

    /// Perform the actual sync operation
    private func performSync() async throws {
        guard let context = modelContext else {
            throw BackgroundSyncError.noModelContext
        }

        logger.info("Starting material sync")

        // Fetch all materials that need syncing
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { material in
                material.googleDriveFileID != nil
            }
        )

        let materials = try context.fetch(descriptor)

        guard !materials.isEmpty else {
            logger.info("No materials to sync")
            return
        }

        logger.info("Syncing \(materials.count) materials from Google Drive")

        // Use GoogleDriveDownloadService to sync each material
        let driveService = GoogleDriveDownloadService.shared
        var syncedCount = 0
        var failedCount = 0

        for material in materials {
            guard let fileID = material.googleDriveFileID else { continue }

            do {
                // Download updated file
                let fileURL = try await driveService.downloadFile(fileId: fileID)

                // Read text content from downloaded file
                let content = try String(contentsOf: fileURL, encoding: .utf8)

                // Update material
                material.textContent = content
                material.lastAccessedAt = Date()

                syncedCount += 1
            } catch {
                logger.error("Failed to sync material \(material.title): \(error.localizedDescription)")
                failedCount += 1
            }
        }

        // Save changes
        try context.save()

        logger.info("Sync complete: \(syncedCount) synced, \(failedCount) failed")
    }

    // MARK: - Manual Sync (Subtask 72.3)

    /// Trigger manual sync (not via background task)
    func triggerManualSync() async throws {
        logger.info("Manual sync triggered")
        try await performSync()

        // Send notification
        sendSyncCompletionNotification(success: true, isManual: true)
    }

    // MARK: - Notifications (Subtask 72.3)

    /// Send sync completion notification
    private func sendSyncCompletionNotification(
        success: Bool,
        error: Error? = nil,
        isManual: Bool = false
    ) {
        let content = UNMutableNotificationContent()

        if success {
            content.title = isManual ? "Manual Sync Complete" : "Scheduled Sync Complete"
            content.body = "Your study materials have been updated"
            content.sound = .default
        } else {
            content.title = isManual ? "Manual Sync Failed" : "Scheduled Sync Failed"
            content.body = error?.localizedDescription ?? "An error occurred during sync"
            content.sound = .default
        }

        let request = UNNotificationRequest(
            identifier: "sync-completion-\(UUID().uuidString)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                self.logger.error("Failed to send notification: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - Errors

enum BackgroundSyncError: LocalizedError {
    case noModelContext
    case syncFailed(Error)

    var errorDescription: String? {
        switch self {
        case .noModelContext:
            return "Model context not configured"
        case .syncFailed(let error):
            return "Sync failed: \(error.localizedDescription)"
        }
    }
}
