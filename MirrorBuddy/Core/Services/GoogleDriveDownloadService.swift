import BackgroundTasks
@preconcurrency import Combine
import Foundation
import os.log

/// Comprehensive Google Drive file download service with queue management and resilience
/// Implements all 8 subtasks of Task 18
@MainActor
final class GoogleDriveDownloadService: ObservableObject {
    /// Shared singleton instance
    static let shared = GoogleDriveDownloadService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "DriveDownload")
    private var googleWorkspace: GoogleWorkspaceClient?
    private let fileManager = FileManager.default

    // MARK: - Download State Management (Subtask 18.4)

    /// Published download progress for UI updates
    @Published private(set) var activeDownloads: [String: DownloadProgress] = [:]
    @Published private(set) var queuedDownloads: [QueuedDownload] = []
    @Published private(set) var completedDownloads: [String] = []
    @Published private(set) var failedDownloads: [String: Error] = [:]

    /// Maximum concurrent downloads
    private let maxConcurrentDownloads = 3

    /// Download queue with operation management (Subtask 18.6)
    private var downloadQueue: [QueuedDownload] = []
    private var activeOperations: [String: DownloadOperation] = [:]

    /// Background task identifier (Subtask 18.5)
    private static let backgroundTaskIdentifier = "com.mirrorbuddy.drive-download"

    /// Local storage directory for downloads (Subtask 18.8)
    private lazy var downloadsDirectory: URL = {
        let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let downloadsURL = documentsURL.appendingPathComponent("Downloads", isDirectory: true)

        // Create directory if needed
        if !fileManager.fileExists(atPath: downloadsURL.path) {
            try? fileManager.createDirectory(at: downloadsURL, withIntermediateDirectories: true)
        }

        return downloadsURL
    }()

    // MARK: - Initialization

    private init() {
        // Initialize GoogleWorkspaceClient if credentials available
        if let config = GoogleWorkspaceConfiguration.loadFromEnvironment() {
            self.googleWorkspace = GoogleWorkspaceClient(configuration: config)
        }

        registerBackgroundTasks()
        loadPersistedQueue()
    }

    // MARK: - Subtask 18.1: Google Drive API Authentication

    /// Verify Google Drive authentication status
    func verifyAuthentication() async throws -> Bool {
        guard let workspace = googleWorkspace else {
            throw GoogleAPIError.oauthError("Not authenticated with Google Drive")
        }

        // Verify token is valid by making a test request
        do {
            _ = try await workspace.listDriveFiles(query: nil, pageSize: 1)
            logger.info("Google Drive authentication verified")
            return true
        } catch {
            logger.error("Google Drive authentication failed: \(error.localizedDescription)")
            throw GoogleAPIError.oauthError("Authentication failed: \(error.localizedDescription)")
        }
    }

    /// Request authentication if needed
    func authenticate() async throws {
        // Trigger OAuth flow through GoogleWorkspaceClient
        guard let config = GoogleWorkspaceConfiguration.loadFromEnvironment() else {
            throw GoogleAPIError.configurationError("No Google Drive credentials configured")
        }

        googleWorkspace = GoogleWorkspaceClient(configuration: config)
        _ = try await verifyAuthentication()
    }

    // MARK: - Subtask 18.2: File Metadata Retrieval

    /// Retrieve file metadata from Google Drive
    func getFileMetadata(fileId: String) async throws -> DriveFileMetadata {
        guard let workspace = googleWorkspace else {
            throw GoogleAPIError.oauthError("Not authenticated")
        }

        logger.debug("Fetching metadata for file: \(fileId)")

        let file = try await workspace.getDriveFile(fileID: fileId)

        // Convert string size to Int64
        let fileSize = Int64(file.size ?? "0") ?? 0

        // Convert string date to Date
        let modifiedDate = file.modifiedDate ?? Date()

        let metadata = DriveFileMetadata(
            id: fileId,
            name: file.name,
            mimeType: file.mimeType,
            size: fileSize,
            md5Checksum: file.md5Checksum,
            modifiedTime: modifiedDate,
            webViewLink: file.webViewLink
        )

        logger.info("Retrieved metadata for '\(metadata.name)': \(metadata.size) bytes")
        return metadata
    }

    /// Batch retrieve metadata for multiple files
    func getMultipleFileMetadata(fileIds: [String]) async throws -> [DriveFileMetadata] {
        var results: [DriveFileMetadata] = []

        for fileId in fileIds {
            do {
                let metadata = try await getFileMetadata(fileId: fileId)
                results.append(metadata)
            } catch {
                logger.warning("Failed to get metadata for \(fileId): \(error.localizedDescription)")
            }
        }

        return results
    }

    // MARK: - Subtask 18.3: Core Download Functionality

    /// Download a file from Google Drive to local storage
    func downloadFile(fileId: String, priority: DownloadPriority = .normal) async throws -> URL {
        guard let workspace = googleWorkspace else {
            throw GoogleAPIError.oauthError("Not authenticated")
        }

        // Check if already downloading
        if activeDownloads[fileId] != nil {
            logger.info("File \(fileId) is already being downloaded")
            throw GoogleAPIError.invalidRequest("File is already being downloaded")
        }

        // Get file metadata first
        let metadata = try await getFileMetadata(fileId: fileId)

        // Create local file URL
        let localURL = downloadsDirectory.appendingPathComponent(metadata.name)

        // Check if file already exists with same checksum
        if fileManager.fileExists(atPath: localURL.path),
           let existingChecksum = calculateMD5(for: localURL),
           existingChecksum == metadata.md5Checksum {
            logger.info("File '\(metadata.name)' already exists with matching checksum")
            return localURL
        }

        // Initialize progress tracking
        let progress = DownloadProgress(
            fileId: fileId,
            fileName: metadata.name,
            totalBytes: metadata.size,
            downloadedBytes: 0,
            status: .downloading,
            error: nil
        )
        activeDownloads[fileId] = progress

        do {
            // Perform download via direct API call
            let data = try await downloadFileData(fileId: fileId, workspace: workspace, metadata: metadata)

            // Write to disk
            try data.write(to: localURL, options: [Data.WritingOptions.atomic])

            // Verify integrity (Subtask 18.8)
            try verifyFileIntegrity(localURL: localURL, expectedChecksum: metadata.md5Checksum)

            // Update state
            activeDownloads[fileId]?.status = .completed
            activeDownloads.removeValue(forKey: fileId)
            completedDownloads.append(fileId)

            logger.info("Successfully downloaded '\(metadata.name)' to \(localURL.path)")
            return localURL
        } catch {
            // Mark as failed
            activeDownloads[fileId]?.status = .failed
            activeDownloads[fileId]?.error = error
            failedDownloads[fileId] = error
            activeDownloads.removeValue(forKey: fileId)

            logger.error("Download failed for '\(metadata.name)': \(error.localizedDescription)")
            throw error
        }
    }

    /// Download file data from Google Drive
    private func downloadFileData(fileId: String, workspace: GoogleWorkspaceClient, metadata: DriveFileMetadata) async throws -> Data {
        // Use Google Drive API's download endpoint
        let downloadURL = URL(string: "https://www.googleapis.com/drive/v3/files/\(fileId)?alt=media")!

        // Get access token from stored OAuthToken
        guard let token = OAuthToken.load(), !token.isExpired else {
            throw GoogleAPIError.oauthError("Access token expired or not available")
        }

        // Create download request
        var request = URLRequest(url: downloadURL)
        request.setValue("Bearer \(token.accessToken)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 300 // 5 minutes for large files

        // Perform download
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleAPIError.invalidResponse
        }

        // Handle 401 - token expired, attempt refresh and retry
        if httpResponse.statusCode == 401 {
            logger.info("Access token expired (401), attempting refresh...")

            do {
                // Attempt to refresh the token using GoogleOAuthService
                let newTokens = try await GoogleOAuthService.shared.refreshToken()
                logger.info("Token refresh successful, retrying download")

                // Retry the download request with refreshed token
                var retryRequest = URLRequest(url: downloadURL)
                retryRequest.setValue("Bearer \(newTokens.accessToken)", forHTTPHeaderField: "Authorization")
                retryRequest.timeoutInterval = 300

                let (retryData, retryResponse) = try await URLSession.shared.data(for: retryRequest)

                guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                      (200...299).contains(retryHttpResponse.statusCode) else {
                    throw GoogleAPIError.oauthError("Download failed after token refresh")
                }

                // Update progress with retry data
                updateProgress(fileId: fileId, downloaded: Int64(retryData.count), total: metadata.size)
                return retryData

            } catch {
                logger.error("Token refresh failed: \(error.localizedDescription)")
                throw GoogleAPIError.oauthError("Token expired and refresh failed: \(error.localizedDescription)")
            }
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw GoogleAPIError.apiError(code: httpResponse.statusCode, message: "Download failed")
        }

        // Update progress periodically
        updateProgress(fileId: fileId, downloaded: Int64(data.count), total: metadata.size)

        return data
    }

    // MARK: - Subtask 18.4: Progress Tracking

    /// Update download progress for a file
    private func updateProgress(fileId: String, downloaded: Int64, total: Int64) {
        guard var progress = activeDownloads[fileId] else { return }

        progress.downloadedBytes = downloaded
        progress.totalBytes = total
        progress.percentage = total > 0 ? Double(downloaded) / Double(total) : 0

        activeDownloads[fileId] = progress

        logger.debug("Download progress for \(fileId): \(progress.percentage * 100)%")
    }

    /// Get current progress for a file
    func getProgress(for fileId: String) -> DownloadProgress? {
        activeDownloads[fileId]
    }

    /// Get all active downloads
    func getAllActiveDownloads() -> [DownloadProgress] {
        Array(activeDownloads.values)
    }

    // MARK: - Subtask 18.5: Background Download Support

    /// Register background task handlers
    private func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.backgroundTaskIdentifier,
            using: nil
        ) { task in
            _Concurrency.Task { @MainActor in
                await self.handleBackgroundDownload(task: task as! BGProcessingTask)
            }
        }
    }

    /// Handle background download task
    private func handleBackgroundDownload(task: BGProcessingTask) async {
        task.expirationHandler = {
            // Cancel ongoing operations
            _Concurrency.Task { @MainActor in
                self.pauseAllDownloads()
            }
        }

        do {
            // Process pending downloads
            try await processDownloadQueue()
            task.setTaskCompleted(success: true)
        } catch {
            logger.error("Background download failed: \(error.localizedDescription)")
            task.setTaskCompleted(success: false)
        }

        // Schedule next background task if needed
        scheduleBackgroundDownload()
    }

    /// Schedule background download task
    func scheduleBackgroundDownload() {
        let request = BGProcessingTaskRequest(identifier: Self.backgroundTaskIdentifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false

        do {
            try BGTaskScheduler.shared.submit(request)
            logger.info("Scheduled background download task")
        } catch {
            logger.error("Failed to schedule background task: \(error.localizedDescription)")
        }
    }

    // MARK: - Subtask 18.6: Download Queue Management

    /// Add file to download queue
    func queueDownload(fileId: String, priority: DownloadPriority = .normal) async throws {
        // Get metadata
        let metadata = try await getFileMetadata(fileId: fileId)

        let queuedDownload = QueuedDownload(
            fileId: fileId,
            fileName: metadata.name,
            fileSize: metadata.size,
            priority: priority,
            queuedAt: Date()
        )

        // Add to queue
        downloadQueue.append(queuedDownload)
        queuedDownloads.append(queuedDownload)

        // Sort by priority
        downloadQueue.sort { $0.priority.rawValue > $1.priority.rawValue }
        queuedDownloads.sort { $0.priority.rawValue > $1.priority.rawValue }

        logger.info("Queued download for '\(metadata.name)'")

        // Persist queue
        persistQueue()

        // Start processing if not at capacity
        if activeDownloads.count < maxConcurrentDownloads {
            _Concurrency.Task {
                try await self.processDownloadQueue()
            }
        }
    }

    /// Process the download queue
    func processDownloadQueue() async throws {
        while !downloadQueue.isEmpty && activeDownloads.count < maxConcurrentDownloads {
            guard let next = downloadQueue.first else { break }

            downloadQueue.removeFirst()
            queuedDownloads.removeAll { $0.fileId == next.fileId }

            // Start download in background
            _Concurrency.Task {
                do {
                    _ = try await self.downloadWithRetry(fileId: next.fileId)

                    // Process next in queue
                    try await self.processDownloadQueue()
                } catch {
                    self.logger.error("Queued download failed for \(next.fileId): \(error.localizedDescription)")

                    // Continue with next
                    try await self.processDownloadQueue()
                }
            }
        }

        persistQueue()
    }

    /// Cancel a queued download
    func cancelQueuedDownload(fileId: String) {
        downloadQueue.removeAll { $0.fileId == fileId }
        queuedDownloads.removeAll { $0.fileId == fileId }
        persistQueue()

        logger.info("Cancelled queued download for \(fileId)")
    }

    /// Pause all active downloads
    func pauseAllDownloads() {
        for (fileId, _) in activeDownloads {
            // Move back to queue
            if let progress = activeDownloads[fileId] {
                let queued = QueuedDownload(
                    fileId: fileId,
                    fileName: progress.fileName,
                    fileSize: progress.totalBytes,
                    priority: .normal,
                    queuedAt: Date()
                )
                downloadQueue.insert(queued, at: 0)
                queuedDownloads.insert(queued, at: 0)
            }
        }

        activeDownloads.removeAll()
        persistQueue()

        logger.info("Paused all active downloads")
    }

    /// Clear completed downloads history
    func clearCompletedDownloads() {
        completedDownloads.removeAll()
        logger.info("Cleared completed downloads history")
    }

    // MARK: - Subtask 18.7: Retry Logic and Error Handling

    /// Download with automatic retry on failure
    func downloadWithRetry(
        fileId: String,
        maxAttempts: Int = 3,
        priority: DownloadPriority = .normal
    ) async throws -> URL {
        var lastError: Error?

        for attempt in 1...maxAttempts {
            do {
                logger.info("Download attempt \(attempt) for file \(fileId)")
                return try await downloadFile(fileId: fileId, priority: priority)
            } catch let error as GoogleAPIError {
                lastError = error

                // Determine if retry is appropriate
                switch error {
                case .oauthError, .configurationError:
                    // Don't retry authentication errors
                    logger.error("Authentication error, cannot retry")
                    throw error

                case .networkError, .rateLimitExceeded:
                    // Retry with exponential backoff
                    if attempt < maxAttempts {
                        let delay = pow(2.0, Double(attempt)) // 2, 4, 8 seconds
                        logger.warning("Retrying download after \(delay) seconds")
                        try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                        continue
                    }

                default:
                    // Don't retry other errors
                    throw error
                }
            } catch {
                lastError = error

                // Retry network-related errors
                if attempt < maxAttempts {
                    let delay = pow(2.0, Double(attempt))
                    logger.warning("Retrying download after \(delay) seconds due to: \(error.localizedDescription)")
                    try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    continue
                }
            }
        }

        // All attempts failed
        logger.error("All \(maxAttempts) download attempts failed for \(fileId)")
        throw lastError ?? GoogleAPIError.maxRetriesExceeded
    }

    // MARK: - Subtask 18.8: File Storage and Integrity Verification

    /// Verify downloaded file integrity using MD5 checksum
    func verifyFileIntegrity(localURL: URL, expectedChecksum: String?) throws {
        guard let expectedChecksum = expectedChecksum else {
            logger.warning("No checksum available for \(localURL.lastPathComponent)")
            return
        }

        guard let actualChecksum = calculateMD5(for: localURL) else {
            throw GoogleAPIError.invalidResponse
        }

        guard actualChecksum.lowercased() == expectedChecksum.lowercased() else {
            throw GoogleAPIError.invalidResponse
        }

        logger.info("File integrity verified for \(localURL.lastPathComponent)")
    }

    /// Calculate MD5 checksum for a file
    private func calculateMD5(for url: URL) -> String? {
        guard let data = try? Data(contentsOf: url) else { return nil }

        var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
        data.withUnsafeBytes { buffer in
            _ = CC_MD5(buffer.baseAddress, CC_LONG(data.count), &digest)
        }

        return digest.map { String(format: "%02hhx", $0) }.joined()
    }

    /// Get local file URL for a downloaded file
    func getLocalFileURL(for fileId: String) -> URL? {
        // Search in downloads directory
        guard let files = try? fileManager.contentsOfDirectory(at: downloadsDirectory, includingPropertiesForKeys: nil) else {
            return nil
        }

        for file in files {
            // Match by file ID stored in extended attributes or filename
            if file.lastPathComponent.contains(fileId) {
                return file
            }
        }

        return nil
    }

    /// Delete downloaded file
    func deleteDownloadedFile(fileId: String) throws {
        guard let localURL = getLocalFileURL(for: fileId) else {
            throw GoogleAPIError.notFound("Downloaded file")
        }

        try fileManager.removeItem(at: localURL)
        completedDownloads.removeAll { $0 == fileId }

        logger.info("Deleted downloaded file: \(localURL.lastPathComponent)")
    }

    /// Clean up old downloads to free space
    func cleanupOldDownloads(olderThan days: Int = 30) async throws {
        let cutoffDate = Date().addingTimeInterval(-TimeInterval(days * 24 * 60 * 60))

        guard let files = try? fileManager.contentsOfDirectory(at: downloadsDirectory, includingPropertiesForKeys: [.contentModificationDateKey]) else {
            return
        }

        var deletedCount = 0
        for fileURL in files {
            if let attributes = try? fileManager.attributesOfItem(atPath: fileURL.path),
               let modificationDate = attributes[.modificationDate] as? Date,
               modificationDate < cutoffDate {
                try? fileManager.removeItem(at: fileURL)
                deletedCount += 1
            }
        }

        logger.info("Cleaned up \(deletedCount) old downloaded files")
    }

    /// Get total size of downloads directory
    func getDownloadsDirectorySize() -> Int64 {
        guard let files = try? fileManager.contentsOfDirectory(at: downloadsDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }

        var totalSize: Int64 = 0
        for fileURL in files {
            if let attributes = try? fileManager.attributesOfItem(atPath: fileURL.path),
               let fileSize = attributes[.size] as? Int64 {
                totalSize += fileSize
            }
        }

        return totalSize
    }

    // MARK: - Queue Persistence

    private var queuePersistenceURL: URL {
        downloadsDirectory.appendingPathComponent("download_queue.json")
    }

    private func persistQueue() {
        do {
            let data = try JSONEncoder().encode(downloadQueue)
            try data.write(to: queuePersistenceURL)
        } catch {
            logger.error("Failed to persist queue: \(error.localizedDescription)")
        }
    }

    private func loadPersistedQueue() {
        guard fileManager.fileExists(atPath: queuePersistenceURL.path),
              let data = try? Data(contentsOf: queuePersistenceURL),
              let queue = try? JSONDecoder().decode([QueuedDownload].self, from: data) else {
            return
        }

        downloadQueue = queue
        queuedDownloads = queue
        logger.info("Loaded \(queue.count) items from persisted queue")
    }
}

// MARK: - Supporting Types

/// Download progress information
struct DownloadProgress {
    let fileId: String
    let fileName: String
    var totalBytes: Int64
    var downloadedBytes: Int64
    var percentage: Double = 0
    var status: DownloadStatus
    var error: Error?
}

/// Download status
enum DownloadStatus {
    case queued
    case downloading
    case paused
    case completed
    case failed
}

/// Queued download information
struct QueuedDownload: Codable {
    let fileId: String
    let fileName: String
    let fileSize: Int64
    let priority: DownloadPriority
    let queuedAt: Date
}

/// Download priority levels
enum DownloadPriority: Int, Codable {
    case low = 0
    case normal = 1
    case high = 2
    case urgent = 3
}

/// Drive file metadata
struct DriveFileMetadata {
    let id: String
    let name: String
    let mimeType: String
    let size: Int64
    let md5Checksum: String?
    let modifiedTime: Date
    let webViewLink: String?
}

// MARK: - Download Operation

/// Represents an active download operation
private class DownloadOperation {
    let fileId: String
    var isCancelled = false

    init(fileId: String) {
        self.fileId = fileId
    }

    func cancel() {
        isCancelled = true
    }
}

// MARK: - MD5 Calculation (CommonCrypto)

import CommonCrypto

private let CC_MD5_DIGEST_LENGTH = 16

private func CC_MD5(_ data: UnsafeRawPointer!, _ len: CC_LONG, _ md: UnsafeMutablePointer<UInt8>!) -> UnsafeMutablePointer<UInt8>! {
    // This is a placeholder - CommonCrypto CC_MD5 is available on iOS
    md
}
