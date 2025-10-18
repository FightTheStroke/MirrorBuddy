import Foundation
import os.log
import UserNotifications

/// Manager for handling local notifications for file changes
@MainActor
final class NotificationManager: NSObject {
    /// Shared singleton instance
    static let shared = NotificationManager()

    // MARK: - Properties

    private let center = UNUserNotificationCenter.current()
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Notifications")

    /// Whether notifications are authorized
    private(set) var isAuthorized = false

    // MARK: - Notification Categories

    enum NotificationCategory: String {
        case fileAdded = "FILE_ADDED"
        case fileModified = "FILE_MODIFIED"
        case fileDeleted = "FILE_DELETED"
        case syncCompleted = "SYNC_COMPLETED"

        var title: String {
            switch self {
            case .fileAdded: return "New File"
            case .fileModified: return "File Updated"
            case .fileDeleted: return "File Deleted"
            case .syncCompleted: return "Sync Completed"
            }
        }
    }

    // MARK: - Notification Actions

    enum NotificationAction: String {
        case viewFile = "VIEW_FILE"
        case openApp = "OPEN_APP"
        case dismiss = "DISMISS"
    }

    // MARK: - User Preferences

    struct NotificationPreferences: Codable {
        var enableFileAdded: Bool = true
        var enableFileModified: Bool = true
        var enableFileDeleted: Bool = true
        var enableSyncCompleted: Bool = true
        var soundEnabled: Bool = true
        var groupNotifications: Bool = true

        static let defaultPreferences = NotificationPreferences()
    }

    private let preferencesKey = "notification_preferences"

    var preferences: NotificationPreferences {
        get {
            guard let data = UserDefaults.standard.data(forKey: preferencesKey) else {
                return .defaultPreferences
            }
            return (try? JSONDecoder().decode(NotificationPreferences.self, from: data)) ?? .defaultPreferences
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                UserDefaults.standard.set(data, forKey: preferencesKey)
            }
        }
    }

    // MARK: - Initialization

    override private init() {
        super.init()
        center.delegate = self
    }

    // MARK: - Authorization

    /// Request notification authorization from user
    /// - Returns: Whether authorization was granted
    func requestAuthorization() async throws -> Bool {
        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        let granted = try await center.requestAuthorization(options: options)
        isAuthorized = granted

        if granted {
            registerNotificationCategories()
            logger.info("Notification authorization granted")
        } else {
            logger.warning("Notification authorization denied")
        }

        return granted
    }

    /// Check current authorization status
    func checkAuthorization() async {
        let settings = await center.notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
        logger.info("Notification authorization status: \(settings.authorizationStatus.rawValue)")
    }

    /// Register notification categories and actions
    private func registerNotificationCategories() {
        let viewFileAction = UNNotificationAction(
            identifier: NotificationAction.viewFile.rawValue,
            title: "View File",
            options: [.foreground]
        )

        let openAppAction = UNNotificationAction(
            identifier: NotificationAction.openApp.rawValue,
            title: "Open App",
            options: [.foreground]
        )

        let dismissAction = UNNotificationAction(
            identifier: NotificationAction.dismiss.rawValue,
            title: "Dismiss",
            options: []
        )

        let fileAddedCategory = UNNotificationCategory(
            identifier: NotificationCategory.fileAdded.rawValue,
            actions: [viewFileAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        let fileModifiedCategory = UNNotificationCategory(
            identifier: NotificationCategory.fileModified.rawValue,
            actions: [viewFileAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        let fileDeletedCategory = UNNotificationCategory(
            identifier: NotificationCategory.fileDeleted.rawValue,
            actions: [dismissAction],
            intentIdentifiers: [],
            options: []
        )

        let syncCompletedCategory = UNNotificationCategory(
            identifier: NotificationCategory.syncCompleted.rawValue,
            actions: [openAppAction, dismissAction],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([
            fileAddedCategory,
            fileModifiedCategory,
            fileDeletedCategory,
            syncCompletedCategory
        ])

        logger.info("Notification categories registered")
    }

    // MARK: - Sending Notifications

    /// Notify about a new file
    /// - Parameter file: The new file
    func notifyFileAdded(_ file: TrackedDriveFile) async throws {
        guard preferences.enableFileAdded, isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "New File Added"
        content.body = file.name
        content.categoryIdentifier = NotificationCategory.fileAdded.rawValue
        content.sound = preferences.soundEnabled ? .default : nil
        content.userInfo = [
            "fileID": file.fileID,
            "fileName": file.name,
            "mimeType": file.mimeType,
            "category": NotificationCategory.fileAdded.rawValue
        ]

        if preferences.groupNotifications {
            content.threadIdentifier = "file-changes"
        }

        let request = UNNotificationRequest(
            identifier: "file-added-\(file.fileID)",
            content: content,
            trigger: nil
        )

        try await center.add(request)
        logger.info("Notification sent for file added: \(file.name)")
    }

    /// Notify about a modified file
    /// - Parameter file: The modified file
    func notifyFileModified(_ file: TrackedDriveFile) async throws {
        guard preferences.enableFileModified, isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "File Updated"
        content.body = file.name
        content.categoryIdentifier = NotificationCategory.fileModified.rawValue
        content.sound = preferences.soundEnabled ? .default : nil
        content.userInfo = [
            "fileID": file.fileID,
            "fileName": file.name,
            "mimeType": file.mimeType,
            "category": NotificationCategory.fileModified.rawValue
        ]

        if preferences.groupNotifications {
            content.threadIdentifier = "file-changes"
        }

        let request = UNNotificationRequest(
            identifier: "file-modified-\(file.fileID)-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        try await center.add(request)
        logger.info("Notification sent for file modified: \(file.name)")
    }

    /// Notify about a deleted file
    /// - Parameter file: The deleted file
    func notifyFileDeleted(_ file: TrackedDriveFile) async throws {
        guard preferences.enableFileDeleted, isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "File Deleted"
        content.body = file.name
        content.categoryIdentifier = NotificationCategory.fileDeleted.rawValue
        content.sound = preferences.soundEnabled ? .default : nil
        content.userInfo = [
            "fileID": file.fileID,
            "fileName": file.name,
            "category": NotificationCategory.fileDeleted.rawValue
        ]

        if preferences.groupNotifications {
            content.threadIdentifier = "file-changes"
        }

        let request = UNNotificationRequest(
            identifier: "file-deleted-\(file.fileID)",
            content: content,
            trigger: nil
        )

        try await center.add(request)
        logger.info("Notification sent for file deleted: \(file.name)")
    }

    /// Notify about sync completion with statistics
    /// - Parameter stats: Sync statistics
    func notifySyncCompleted(stats: SyncStatistics) async throws {
        guard preferences.enableSyncCompleted, isAuthorized else { return }

        // Only notify if there were changes
        guard stats.hasChanges else { return }

        let content = UNMutableNotificationContent()
        content.title = "Sync Completed"

        var bodyParts: [String] = []
        if stats.new > 0 {
            bodyParts.append("\(stats.new) new")
        }
        if stats.modified > 0 {
            bodyParts.append("\(stats.modified) modified")
        }
        if stats.deleted > 0 {
            bodyParts.append("\(stats.deleted) deleted")
        }

        content.body = bodyParts.joined(separator: ", ")
        content.categoryIdentifier = NotificationCategory.syncCompleted.rawValue
        content.sound = preferences.soundEnabled ? .default : nil
        content.badge = NSNumber(value: stats.new + stats.modified)
        content.userInfo = [
            "totalFiles": stats.total,
            "newFiles": stats.new,
            "modifiedFiles": stats.modified,
            "deletedFiles": stats.deleted,
            "category": NotificationCategory.syncCompleted.rawValue
        ]

        if preferences.groupNotifications {
            content.threadIdentifier = "sync-updates"
        }

        let request = UNNotificationRequest(
            identifier: "sync-completed-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        try await center.add(request)
        logger.info("Notification sent for sync completed: \(stats.hasChanges ? "changes detected" : "no changes")")
    }

    /// Notify about batch file changes
    /// - Parameters:
    ///   - newFiles: Newly added files
    ///   - modifiedFiles: Modified files
    ///   - deletedFiles: Deleted files
    func notifyBatchChanges(
        newFiles: [TrackedDriveFile],
        modifiedFiles: [TrackedDriveFile],
        deletedFiles: [TrackedDriveFile]
    ) async throws {
        guard isAuthorized else { return }

        // Send individual notifications if grouping is disabled
        if !preferences.groupNotifications {
            for file in newFiles where preferences.enableFileAdded {
                try await notifyFileAdded(file)
            }
            for file in modifiedFiles where preferences.enableFileModified {
                try await notifyFileModified(file)
            }
            for file in deletedFiles where preferences.enableFileDeleted {
                try await notifyFileDeleted(file)
            }
            return
        }

        // Send grouped notification
        let totalChanges = newFiles.count + modifiedFiles.count + deletedFiles.count
        guard totalChanges > 0 else { return }

        let content = UNMutableNotificationContent()
        content.title = "Files Updated"

        var bodyParts: [String] = []
        if !newFiles.isEmpty && preferences.enableFileAdded {
            bodyParts.append("\(newFiles.count) new")
        }
        if !modifiedFiles.isEmpty && preferences.enableFileModified {
            bodyParts.append("\(modifiedFiles.count) modified")
        }
        if !deletedFiles.isEmpty && preferences.enableFileDeleted {
            bodyParts.append("\(deletedFiles.count) deleted")
        }

        guard !bodyParts.isEmpty else { return }

        content.body = bodyParts.joined(separator: ", ")
        content.categoryIdentifier = NotificationCategory.syncCompleted.rawValue
        content.sound = preferences.soundEnabled ? .default : nil
        content.badge = NSNumber(value: newFiles.count + modifiedFiles.count)
        content.threadIdentifier = "file-changes"

        let request = UNNotificationRequest(
            identifier: "batch-changes-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        try await center.add(request)
        logger.info("Batch notification sent: \(totalChanges) changes")
    }

    // MARK: - Badge Management

    /// Update app badge count
    /// - Parameter count: Badge count (0 to clear)
    func updateBadgeCount(_ count: Int) async {
        do {
            try await center.setBadgeCount(count)
            logger.info("Badge count updated: \(count)")
        } catch {
            logger.error("Failed to update badge count: \(error.localizedDescription)")
        }
    }

    /// Clear all badges
    func clearBadge() async {
        await updateBadgeCount(0)
    }

    // MARK: - Notification Management

    /// Remove all delivered notifications
    func removeAllDeliveredNotifications() {
        center.removeAllDeliveredNotifications()
        logger.info("All delivered notifications removed")
    }

    /// Remove all pending notifications
    func removeAllPendingNotifications() {
        center.removeAllPendingNotificationRequests()
        logger.info("All pending notifications removed")
    }

    /// Get count of pending notifications
    func getPendingNotificationCount() async -> Int {
        let requests = await center.pendingNotificationRequests()
        return requests.count
    }

    /// Get count of delivered notifications
    func getDeliveredNotificationCount() async -> Int {
        let notifications = await center.deliveredNotifications()
        return notifications.count
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationManager: UNUserNotificationCenterDelegate {
    /// Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    /// Handle notification response (user tapped notification)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        logger.info("Notification response received: \(response.actionIdentifier)")

        switch response.actionIdentifier {
        case NotificationAction.viewFile.rawValue:
            if let fileID = userInfo["fileID"] as? String {
                handleViewFile(fileID: fileID)
            }

        case NotificationAction.openApp.rawValue:
            handleOpenApp()

        case UNNotificationDefaultActionIdentifier:
            // User tapped the notification body
            if let fileID = userInfo["fileID"] as? String {
                handleViewFile(fileID: fileID)
            } else {
                handleOpenApp()
            }

        case NotificationAction.dismiss.rawValue,
             UNNotificationDismissActionIdentifier:
            // User dismissed the notification
            logger.info("Notification dismissed")

        default:
            break
        }

        completionHandler()
    }

    // MARK: - Deep Linking Handlers

    private func handleViewFile(fileID: String) {
        logger.info("Handle view file: \(fileID)")

        // Post notification for app to handle
        NotificationCenter.default.post(
            name: .openFile,
            object: nil,
            userInfo: ["fileID": fileID]
        )
    }

    private func handleOpenApp() {
        logger.info("Handle open app")

        // Post notification for app to handle
        NotificationCenter.default.post(
            name: .openApp,
            object: nil
        )
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when user taps notification to view a file
    static let openFile = Notification.Name("openFile")

    /// Posted when user taps notification to open app
    static let openApp = Notification.Name("openApp")
}
