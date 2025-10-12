import Foundation
import SwiftData

/// SwiftData model for tracking Google Drive files locally
@Model
final class TrackedDriveFile {
    /// Unique Drive file ID
    @Attribute(.unique) var fileID: String

    /// File name
    var name: String

    /// MIME type
    var mimeType: String

    /// File size in bytes
    var size: Int?

    /// MD5 checksum for change detection
    var md5Checksum: String?

    /// Last modified time from Drive
    var modifiedTime: Date?

    /// Created time from Drive
    var createdTime: Date?

    /// Web view link
    var webViewLink: String?

    /// Parent folder IDs
    var parents: [String]

    /// When this record was last synced
    var lastSyncedAt: Date

    /// Whether file is trashed
    var isTrashed: Bool

    /// File status
    var status: FileStatus

    // MARK: - Computed Properties

    /// Check if file is a folder
    var isFolder: Bool {
        mimeType == "application/vnd.google-apps.folder"
    }

    /// Check if file is a PDF
    var isPDF: Bool {
        mimeType == "application/pdf"
    }

    /// Check if file is a document
    var isDocument: Bool {
        mimeType.contains("document") || mimeType == "application/pdf"
    }

    // MARK: - Initialization

    init(
        fileID: String,
        name: String,
        mimeType: String,
        size: Int? = nil,
        md5Checksum: String? = nil,
        modifiedTime: Date? = nil,
        createdTime: Date? = nil,
        webViewLink: String? = nil,
        parents: [String] = [],
        lastSyncedAt: Date = Date(),
        isTrashed: Bool = false,
        status: FileStatus = .unchanged
    ) {
        self.fileID = fileID
        self.name = name
        self.mimeType = mimeType
        self.size = size
        self.md5Checksum = md5Checksum
        self.modifiedTime = modifiedTime
        self.createdTime = createdTime
        self.webViewLink = webViewLink
        self.parents = parents
        self.lastSyncedAt = lastSyncedAt
        self.isTrashed = isTrashed
        self.status = status
    }

    /// Create from DriveFile
    convenience init(from driveFile: DriveFile) {
        self.init(
            fileID: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            size: driveFile.sizeInBytes,
            md5Checksum: driveFile.md5Checksum,
            modifiedTime: driveFile.modifiedDate,
            createdTime: driveFile.createdDate,
            webViewLink: driveFile.webViewLink,
            parents: driveFile.parents ?? [],
            lastSyncedAt: Date(),
            isTrashed: driveFile.trashed ?? false,
            status: .new
        )
    }

    /// Update from DriveFile
    func update(from driveFile: DriveFile) {
        name = driveFile.name
        mimeType = driveFile.mimeType
        size = driveFile.sizeInBytes
        md5Checksum = driveFile.md5Checksum
        modifiedTime = driveFile.modifiedDate
        createdTime = driveFile.createdDate
        webViewLink = driveFile.webViewLink
        parents = driveFile.parents ?? []
        lastSyncedAt = Date()
        isTrashed = driveFile.trashed ?? false
        status = .modified
    }

    /// Check if file has changed compared to DriveFile
    func hasChanged(comparedTo driveFile: DriveFile, remoteModifiedDate: Date?) -> Bool {
        // Compare MD5 checksums if available
        if let localChecksum = md5Checksum,
           let remoteChecksum = driveFile.md5Checksum {
            return localChecksum != remoteChecksum
        }

        // Fallback to modified time comparison
        if let localModified = modifiedTime,
           let remoteModified = remoteModifiedDate {
            return localModified != remoteModified
        }

        // If no checksums or times, consider changed
        return true
    }
}

// MARK: - File Status

enum FileStatus: String, Codable {
    case new         // Newly discovered file
    case unchanged   // No changes detected
    case modified    // File content or metadata changed
    case deleted     // File was deleted/trashed
}

// MARK: - File Tracker Service

/// Service for tracking Drive files in local database
@MainActor
final class DriveFileTracker {
    /// Shared singleton instance
    static let shared = DriveFileTracker()

    private let modelContext: ModelContext

    private init() {
        // Note: In production, modelContext should be injected
        // For now, we'll use a placeholder that will be set from the app
        fatalError("Use init(modelContext:) instead")
    }

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Sync Operations

    /// Sync files with Drive API results
    /// - Parameter driveFiles: Files from Drive API
    /// - Returns: Sync statistics
    func syncFiles(_ driveFiles: [DriveFile]) throws -> SyncStatistics {
        var stats = SyncStatistics()

        // Get all existing tracked files
        let descriptor = FetchDescriptor<TrackedDriveFile>()
        let existingFiles = try modelContext.fetch(descriptor)
        let existingFileMap = Dictionary(uniqueKeysWithValues: existingFiles.map { ($0.fileID, $0) })

        // Track which files were seen
        var seenFileIDs = Set<String>()

        // Process each Drive file
        for driveFile in driveFiles {
            seenFileIDs.insert(driveFile.id)

            if let existing = existingFileMap[driveFile.id] {
                // File exists, check for changes
                if existing.hasChanged(comparedTo: driveFile, remoteModifiedDate: driveFile.modifiedDate) {
                    existing.update(from: driveFile)
                    stats.modified += 1
                } else {
                    existing.status = .unchanged
                    existing.lastSyncedAt = Date()
                }
            } else {
                // New file
                let tracked = TrackedDriveFile(from: driveFile)
                modelContext.insert(tracked)
                stats.new += 1
            }
        }

        // Mark deleted files
        for existing in existingFiles {
            if !seenFileIDs.contains(existing.fileID) && !existing.isTrashed {
                existing.status = .deleted
                existing.isTrashed = true
                existing.lastSyncedAt = Date()
                stats.deleted += 1
            }
        }

        // Save changes
        try modelContext.save()

        stats.total = driveFiles.count
        return stats
    }

    /// Get all tracked files
    func getAllFiles() throws -> [TrackedDriveFile] {
        let descriptor = FetchDescriptor<TrackedDriveFile>(
            sortBy: [SortDescriptor(\.name)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Get files by status
    func getFiles(withStatus status: FileStatus) throws -> [TrackedDriveFile] {
        let descriptor = FetchDescriptor<TrackedDriveFile>(
            sortBy: [SortDescriptor(\.name)]
        )
        let all = try modelContext.fetch(descriptor)
        return all.filter { $0.status == status }
    }

    /// Get new files since last sync
    func getNewFiles(since date: Date) throws -> [TrackedDriveFile] {
        let descriptor = FetchDescriptor<TrackedDriveFile>(
            sortBy: [SortDescriptor(\.lastSyncedAt, order: .reverse)]
        )
        let all = try modelContext.fetch(descriptor)
        return all.filter { $0.status == .new && $0.lastSyncedAt > date }
    }

    /// Get modified files since last sync
    func getModifiedFiles(since date: Date) throws -> [TrackedDriveFile] {
        let descriptor = FetchDescriptor<TrackedDriveFile>(
            sortBy: [SortDescriptor(\.lastSyncedAt, order: .reverse)]
        )
        let all = try modelContext.fetch(descriptor)
        return all.filter { $0.status == .modified && $0.lastSyncedAt > date }
    }

    /// Clear all tracked files
    func clearAll() throws {
        let descriptor = FetchDescriptor<TrackedDriveFile>()
        let allFiles = try modelContext.fetch(descriptor)
        for file in allFiles {
            modelContext.delete(file)
        }
        try modelContext.save()
    }
}

// MARK: - Sync Statistics

struct SyncStatistics {
    var total: Int = 0
    var new: Int = 0
    var modified: Int = 0
    var deleted: Int = 0
    var unchanged: Int {
        total - new - modified - deleted
    }

    var hasChanges: Bool {
        new > 0 || modified > 0 || deleted > 0
    }
}
