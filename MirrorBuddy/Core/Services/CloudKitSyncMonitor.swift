import Foundation
import Observation
import SwiftData

/// Service for monitoring CloudKit sync status and handling sync events
@Observable
final class CloudKitSyncMonitor {
    /// Singleton instance
    static let shared = CloudKitSyncMonitor()

    /// Current sync status
    var syncStatus: SyncStatus = .idle

    /// Last sync date
    var lastSyncDate: Date?

    /// Last error encountered during sync
    var lastError: Error?

    /// Whether sync is currently in progress
    var isSyncing: Bool {
        syncStatus == .syncing
    }

    private init() {
        setupNotificationObservers()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    /// Setup observers for CloudKit sync notifications
    private func setupNotificationObservers() {
        // Observe NSPersistentCloudKitContainer events
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleImportEvent),
            name: NSNotification.Name("NSPersistentCloudKitContainerEventChangedNotification"),
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleExportEvent),
            name: NSNotification.Name("NSPersistentCloudKitContainerEventChangedNotification"),
            object: nil
        )
    }

    /// Handle import events from CloudKit
    @objc private func handleImportEvent(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.syncStatus = .syncing
        }
    }

    /// Handle export events to CloudKit
    @objc private func handleExportEvent(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.syncStatus = .syncing
            self?.lastSyncDate = Date()
        }
    }

    /// Manually trigger sync completion (called after successful operations)
    func syncCompleted() {
        syncStatus = .synced
        lastSyncDate = Date()
        lastError = nil
    }

    /// Handle sync error
    func syncFailed(with error: Error) {
        syncStatus = .failed
        lastError = error
        print("[CloudKitSyncMonitor] Sync failed: \(error.localizedDescription)")
    }

    /// Request manual sync (for user-initiated sync)
    func requestManualSync() {
        syncStatus = .syncing
        // SwiftData automatically handles sync when data changes
        // This updates the UI to show sync is in progress
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.syncCompleted()
        }
    }

    /// Reset sync status
    func reset() {
        syncStatus = .idle
        lastError = nil
    }
}

// MARK: - Sync Status
extension CloudKitSyncMonitor {
    enum SyncStatus: Equatable {
        case idle
        case syncing
        case synced
        case failed

        var displayText: String {
            switch self {
            case .idle:
                return String(localized: "sync.status.idle")
            case .syncing:
                return String(localized: "sync.status.syncing")
            case .synced:
                return String(localized: "sync.status.synced")
            case .failed:
                return String(localized: "sync.status.failed")
            }
        }

        var iconName: String {
            switch self {
            case .idle:
                return "icloud"
            case .syncing:
                return "icloud.and.arrow.up.fill"
            case .synced:
                return "icloud.fill"
            case .failed:
                return "icloud.slash"
            }
        }
    }
}
