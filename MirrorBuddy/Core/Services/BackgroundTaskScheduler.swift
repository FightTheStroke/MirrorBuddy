import BackgroundTasks
import Foundation
import os.log
import Combine

/// Service for scheduling and managing background sync tasks
@MainActor
final class BackgroundTaskScheduler {
    /// Shared singleton instance
    static let shared = BackgroundTaskScheduler()

    // MARK: - Constants

    /// Background task identifier for sync operations
    static let syncTaskIdentifier = "com.mirrorbuddy.sync"

    /// Scheduled sync times in CET (Central European Time)
    private let scheduledSyncHours = [13, 18] // 1 PM and 6 PM CET

    // MARK: - Properties

    private let syncService = DriveSyncService.shared
    private let notificationManager = NotificationManager.shared
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "BackgroundTasks")

    /// Last scheduled task date
    private var lastScheduledDate: Date?

    /// Whether background tasks are enabled
    private(set) var isEnabled: Bool = true

    // MARK: - Initialization

    private init() {}

    // MARK: - Registration

    /// Register background task handlers
    /// Call this in App init or AppDelegate
    func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.syncTaskIdentifier,
            using: nil
        ) { task in
            guard let processingTask = task as? BGProcessingTask else {
                task.setTaskCompleted(success: false)
                return
            }
            _Concurrency.Task { @MainActor in
                await self.handleSyncTask(processingTask)
            }
        }

        logger.info("Background tasks registered: \(Self.syncTaskIdentifier)")
    }

    // MARK: - Scheduling

    /// Schedule the next background sync task
    /// - Parameter force: Force reschedule even if already scheduled
    func scheduleNextSync(force: Bool = false) {
        guard isEnabled else {
            logger.info("Background tasks are disabled, skipping scheduling")
            return
        }

        // Cancel existing scheduled tasks
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.syncTaskIdentifier)

        // Calculate next sync time
        guard let nextSyncDate = calculateNextSyncDate() else {
            logger.error("Failed to calculate next sync date")
            return
        }

        // Create background task request
        let request = BGProcessingTaskRequest(identifier: Self.syncTaskIdentifier)
        request.earliestBeginDate = nextSyncDate
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false // Allow on battery

        do {
            try BGTaskScheduler.shared.submit(request)
            lastScheduledDate = nextSyncDate
            logger.info("Scheduled next sync for: \(nextSyncDate.formatted())")
        } catch {
            logger.error("Failed to schedule background task: \(error.localizedDescription)")
        }
    }

    /// Calculate the next scheduled sync time based on CET timezone
    /// - Returns: Next sync date or nil if calculation fails
    private func calculateNextSyncDate() -> Date? {
        guard let cetTimeZone = TimeZone(identifier: "Europe/Rome") else {
            logger.error("Failed to get CET timezone")
            return nil
        }

        let now = Date()
        var calendar = Calendar.current
        calendar.timeZone = cetTimeZone

        // Get current hour in CET
        let currentHour = calendar.component(.hour, from: now)

        // Find next scheduled hour
        var nextSyncHour: Int?
        for hour in scheduledSyncHours where hour > currentHour {
            nextSyncHour = hour
            break
        }

        // If no future hour today, use first hour tomorrow
        let daysToAdd: Int
        if let foundHour = nextSyncHour {
            daysToAdd = 0
            nextSyncHour = foundHour
        } else {
            daysToAdd = 1
            nextSyncHour = scheduledSyncHours.first ?? 13 // Default to 1 PM
        }

        // Create target date
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = nextSyncHour
        components.minute = 0
        components.second = 0
        components.timeZone = cetTimeZone

        guard var targetDate = calendar.date(from: components) else {
            return nil
        }

        // Add days if needed
        if daysToAdd > 0 {
            targetDate = calendar.date(byAdding: .day, value: daysToAdd, to: targetDate) ?? targetDate
        }

        return targetDate
    }

    // MARK: - Task Handling

    /// Handle background sync task execution
    /// - Parameter task: The background processing task
    private func handleSyncTask(_ task: BGProcessingTask) async {
        logger.info("Background sync task started")

        // Schedule next sync immediately
        scheduleNextSync()

        // Create task to perform sync
        let syncTask = _Concurrency.Task {
            do {
                let stats = try await syncService.performAutoSync()

                logger.info("""
                    Background sync completed successfully:
                    - Total: \(stats.total)
                    - New: \(stats.new)
                    - Modified: \(stats.modified)
                    - Deleted: \(stats.deleted)
                    """)

                // Send push notification if changes detected
                if stats.hasChanges {
                    try? await notificationManager.notifySyncCompleted(stats: stats)
                }

                // Mark task as complete
                task.setTaskCompleted(success: true)

                // Post notification if changes detected
                if stats.hasChanges {
                    postSyncNotification(stats: stats)
                }
            } catch {
                logger.error("Background sync failed: \(error.localizedDescription)")
                task.setTaskCompleted(success: false)

                // Retry after delay
                scheduleRetry()
            }
        }

        // Handle task expiration
        task.expirationHandler = {
            self.logger.warning("Background task expired, cancelling sync")
            syncTask.cancel()
            task.setTaskCompleted(success: false)
            self.scheduleRetry()
        }

        await syncTask.value
    }

    /// Schedule a retry for failed sync
    private func scheduleRetry() {
        // Wait 15 minutes before retry
        let retryDate = Date().addingTimeInterval(15 * 60)

        let request = BGProcessingTaskRequest(identifier: Self.syncTaskIdentifier)
        request.earliestBeginDate = retryDate
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false

        do {
            try BGTaskScheduler.shared.submit(request)
            logger.info("Scheduled retry sync for: \(retryDate.formatted())")
        } catch {
            logger.error("Failed to schedule retry: \(error.localizedDescription)")
        }
    }

    // MARK: - Notifications

    /// Post notification about sync results
    /// - Parameter stats: Sync statistics
    private func postSyncNotification(stats: SyncStatistics) {
        let notification = Notification(
            name: .driveSyncCompleted,
            object: self,
            userInfo: [
                "statistics": stats,
                "timestamp": Date()
            ]
        )
        NotificationCenter.default.post(notification)

        logger.info("Posted sync notification with \(stats.total) files")
    }

    // MARK: - Control

    /// Enable background tasks
    func enable() {
        isEnabled = true
        scheduleNextSync(force: true)
        logger.info("Background tasks enabled")
    }

    /// Disable background tasks
    func disable() {
        isEnabled = false
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.syncTaskIdentifier)
        logger.info("Background tasks disabled")
    }

    /// Manually trigger a sync task (for testing)
    func triggerManualSync() async throws -> SyncStatistics {
        logger.info("Manual sync triggered")
        let stats = try await syncService.performAutoSync()

        if stats.hasChanges {
            postSyncNotification(stats: stats)
        }

        return stats
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when a background sync completes successfully
    static let driveSyncCompleted = Notification.Name("driveSyncCompleted")

    /// Posted when a background sync fails
    static let driveSyncFailed = Notification.Name("driveSyncFailed")
}

// MARK: - Background Task Helper

extension BackgroundTaskScheduler {
    /// Get status information about background tasks
    func getStatus() -> BackgroundTaskStatus {
        BackgroundTaskStatus(
            isEnabled: isEnabled,
            lastScheduledDate: lastScheduledDate,
            nextScheduledHours: scheduledSyncHours,
            taskIdentifier: Self.syncTaskIdentifier
        )
    }
}

/// Status information for background tasks
struct BackgroundTaskStatus {
    let isEnabled: Bool
    let lastScheduledDate: Date?
    let nextScheduledHours: [Int]
    let taskIdentifier: String

    var description: String {
        """
        Background Tasks Status:
        - Enabled: \(isEnabled)
        - Last Scheduled: \(lastScheduledDate?.formatted() ?? "Never")
        - Scheduled Hours (CET): \(nextScheduledHours.map { "\($0):00" }.joined(separator: ", "))
        - Task ID: \(taskIdentifier)
        """
    }
}
