import Foundation
import SwiftData

/// Service for syncing Drive files with change tracking
@MainActor
final class DriveSyncService {
    /// Shared singleton instance
    static let shared = DriveSyncService()

    // MARK: - Properties

    private let driveClient = GoogleDriveClient.shared
    private let fileService = DriveFileService.shared
    private var fileTracker: DriveFileTracker?
    private var startPageToken: String?

    /// Last sync timestamp
    private(set) var lastSyncDate: Date?

    /// Whether sync is currently in progress
    private(set) var isSyncing = false

    // MARK: - Initialization

    private init() {}

    /// Configure with model context
    func configure(modelContext: ModelContext) {
        self.fileTracker = DriveFileTracker(modelContext: modelContext)
    }

    // MARK: - Full Sync

    /// Perform a full sync of all files
    /// - Parameter forceRefresh: Force refresh from server
    /// - Returns: Sync statistics
    func performFullSync(forceRefresh: Bool = false) async throws -> SyncStatistics {
        guard !isSyncing else {
            throw DriveSyncError.syncInProgress
        }

        guard let tracker = fileTracker else {
            throw DriveSyncError.notConfigured
        }

        isSyncing = true
        defer { isSyncing = false }

        // Get all files from Drive
        let files = try await fileService.listFiles(forceRefresh: forceRefresh)

        // Sync with database
        let stats = try tracker.syncFiles(files)

        // Update sync timestamp
        lastSyncDate = Date()

        // Initialize start page token if needed
        if startPageToken == nil {
            startPageToken = try await driveClient.getStartPageToken()
            UserDefaults.standard.set(startPageToken, forKey: "drive_start_page_token")
        }

        return stats
    }

    // MARK: - Incremental Sync

    /// Perform incremental sync using change tracking
    /// - Returns: Sync statistics
    func performIncrementalSync() async throws -> SyncStatistics {
        guard !isSyncing else {
            throw DriveSyncError.syncInProgress
        }

        guard let tracker = fileTracker else {
            throw DriveSyncError.notConfigured
        }

        // Load saved start page token
        if startPageToken == nil {
            startPageToken = UserDefaults.standard.string(forKey: "drive_start_page_token")
        }

        guard let token = startPageToken else {
            // No token, perform full sync
            return try await performFullSync()
        }

        isSyncing = true
        defer { isSyncing = false }

        var allChanges: [DriveChange] = []
        var nextPageToken: String? = token

        // Fetch all changes
        repeat {
            guard let currentToken = nextPageToken else {
                break
            }

            let changeList = try await driveClient.getChanges(
                startPageToken: currentToken,
                pageSize: 100
            )

            allChanges.append(contentsOf: changeList.changes)
            nextPageToken = changeList.nextPageToken

            // Update token for next sync
            if let newToken = changeList.newStartPageToken {
                startPageToken = newToken
                UserDefaults.standard.set(newToken, forKey: "drive_start_page_token")
            }
        } while nextPageToken != nil

        // Process changes
        let stats = try await processChanges(allChanges, tracker: tracker)

        // Update sync timestamp
        lastSyncDate = Date()

        return stats
    }

    // MARK: - Auto Sync

    /// Perform automatic sync (incremental if possible, full otherwise)
    /// - Returns: Sync statistics
    func performAutoSync() async throws -> SyncStatistics {
        if startPageToken != nil || UserDefaults.standard.string(forKey: "drive_start_page_token") != nil {
            return try await performIncrementalSync()
        } else {
            return try await performFullSync()
        }
    }

    // MARK: - Private Helpers

    private func processChanges(_ changes: [DriveChange], tracker: DriveFileTracker) async throws -> SyncStatistics {
        var stats = SyncStatistics()

        // Get target folder ID
        let folderID = try await fileService.getTargetFolderID()

        for change in changes {
            guard let file = change.file else {
                // File was deleted
                stats.deleted += 1
                continue
            }

            // Check if file is in target folder
            guard file.parents?.contains(folderID) == true else {
                continue
            }

            // Skip if trashed
            if file.trashed == true {
                stats.deleted += 1
                continue
            }

            // Get existing tracked file
            let existing = try tracker.getAllFiles().first { $0.fileID == file.id }

            if let existing = existing {
                // Check if modified
                if existing.hasChanged(comparedTo: file, remoteModifiedDate: file.modifiedDate) {
                    existing.update(from: file)
                    stats.modified += 1
                } else {
                    stats.total += 1
                }
            } else {
                // New file
                let tracked = TrackedDriveFile(from: file)
                tracker.modelContext.insert(tracked)
                stats.new += 1
            }

            stats.total += 1
        }

        // Save changes
        try tracker.modelContext.save()

        return stats
    }

    // MARK: - Status

    /// Get new files since last sync
    func getNewFilesSinceLastSync() throws -> [TrackedDriveFile] {
        guard let tracker = fileTracker, let lastSync = lastSyncDate else {
            return []
        }
        return try tracker.getNewFiles(since: lastSync)
    }

    /// Get modified files since last sync
    func getModifiedFilesSinceLastSync() throws -> [TrackedDriveFile] {
        guard let tracker = fileTracker, let lastSync = lastSyncDate else {
            return []
        }
        return try tracker.getModifiedFiles(since: lastSync)
    }
}

// MARK: - Errors

enum DriveSyncError: LocalizedError {
    case notConfigured
    case syncInProgress
    case noStartPageToken

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Sync service not configured with model context"
        case .syncInProgress:
            return "A sync operation is already in progress"
        case .noStartPageToken:
            return "No start page token available for incremental sync"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .notConfigured:
            return "Call configure(modelContext:) before syncing"
        case .syncInProgress:
            return "Wait for the current sync to complete"
        case .noStartPageToken:
            return "Perform a full sync first to initialize change tracking"
        }
    }
}
