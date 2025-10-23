import Foundation

/// Service for managing Google Drive file operations with filtering and caching
@MainActor
final class DriveFileService {
    /// Shared singleton instance
    static let shared = DriveFileService()

    // MARK: - Properties

    private let driveClient = GoogleDriveClient.shared
    private var fileCache: [String: CachedFileList] = [:]
    private let cacheExpiryDuration: TimeInterval = 300 // 5 minutes

    /// Target folder name
    private let targetFolderName = "Mario - Scuola"

    /// Cached folder ID
    private var cachedFolderID: String?

    // MARK: - File Types

    enum FileType: String, CaseIterable {
        case pdf = "application/pdf"
        case docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case doc = "application/msword"
        case xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        case xls = "application/msapplication/vnd.ms-excel"
        case pptx = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        case ppt = "application/vnd.ms-powerpoint"
        case googleDoc = "application/vnd.google-apps.document"
        case googleSheet = "application/vnd.google-apps.spreadsheet"
        case googleSlides = "application/vnd.google-apps.presentation"
        case image = "image/"
        case video = "video/"
        case audio = "audio/"

        var displayName: String {
            switch self {
            case .pdf: return "PDF"
            case .docx, .doc, .googleDoc: return "Document"
            case .xlsx, .xls, .googleSheet: return "Spreadsheet"
            case .pptx, .ppt, .googleSlides: return "Presentation"
            case .image: return "Image"
            case .video: return "Video"
            case .audio: return "Audio"
            }
        }
    }

    // MARK: - Sorting

    enum SortOption {
        case nameAscending
        case nameDescending
        case dateModifiedNewest
        case dateModifiedOldest
        case sizeSmallest
        case sizeLargest
    }

    // MARK: - Initialization

    private init() {}

    // MARK: - Public API

    /// Get or find the target folder ID
    func getTargetFolderID() async throws -> String {
        if let cached = cachedFolderID {
            return cached
        }

        guard let folder = try await driveClient.findFolder(name: targetFolderName) else {
            throw DriveFileServiceError.folderNotFound(targetFolderName)
        }

        cachedFolderID = folder.id
        return folder.id
    }

    /// List all files in the target folder
    /// - Parameters:
    ///   - fileTypes: Optional filter by file types
    ///   - sortOption: Sorting option
    ///   - forceRefresh: Force refresh from server
    /// - Returns: Filtered and sorted file list
    func listFiles(
        fileTypes: [FileType]? = nil,
        sortOption: SortOption = .nameAscending,
        forceRefresh: Bool = false
    ) async throws -> [DriveFile] {
        let folderID = try await getTargetFolderID()
        let cacheKey = "files_\(folderID)"

        // Check cache
        if !forceRefresh, let cached = fileCache[cacheKey],
           !cached.isExpired {
            return applyFiltersAndSort(files: cached.files, fileTypes: fileTypes, sortOption: sortOption)
        }

        // Fetch from server
        var allFiles: [DriveFile] = []
        var pageToken: String?

        repeat {
            let response = try await driveClient.listFiles(
                folderID: folderID,
                pageSize: 100,
                pageToken: pageToken
            )

            allFiles.append(contentsOf: response.files)
            pageToken = response.nextPageToken
        } while pageToken != nil

        // Cache the results
        fileCache[cacheKey] = CachedFileList(files: allFiles, cachedAt: Date())

        return applyFiltersAndSort(files: allFiles, fileTypes: fileTypes, sortOption: sortOption)
    }

    /// Search for files by name in the target folder
    /// - Parameters:
    ///   - searchTerm: Search term
    ///   - fileTypes: Optional filter by file types
    ///   - sortOption: Sorting option
    /// - Returns: Matching files
    func searchFiles(
        searchTerm: String,
        fileTypes: [FileType]? = nil,
        sortOption: SortOption = .nameAscending
    ) async throws -> [DriveFile] {
        let folderID = try await getTargetFolderID()
        let escapedTerm = searchTerm.replacingOccurrences(of: "'", with: "\\'")

        let query = "name contains '\(escapedTerm)' and '\(folderID)' in parents and trashed = false"

        let response = try await driveClient.searchFiles(query: query, pageSize: 100)

        return applyFiltersAndSort(files: response.files, fileTypes: fileTypes, sortOption: sortOption)
    }

    /// Get file by ID
    /// - Parameter fileID: File ID
    /// - Returns: File metadata
    func getFile(fileID: String) async throws -> DriveFile {
        try await driveClient.getFile(fileID: fileID)
    }

    /// Clear cached file list
    func clearCache() {
        fileCache.removeAll()
    }

    // MARK: - Private Helpers

    private func applyFiltersAndSort(
        files: [DriveFile],
        fileTypes: [FileType]?,
        sortOption: SortOption
    ) -> [DriveFile] {
        var filtered = files

        // Apply file type filter
        if let fileTypes = fileTypes, !fileTypes.isEmpty {
            filtered = filtered.filter { file in
                fileTypes.contains { fileType in
                    file.mimeType.starts(with: fileType.rawValue)
                }
            }
        }

        // Apply sorting
        return sortFiles(filtered, by: sortOption)
    }

    private func sortFiles(_ files: [DriveFile], by sortOption: SortOption) -> [DriveFile] {
        switch sortOption {
        case .nameAscending:
            return files.sorted { $0.name.lowercased() < $1.name.lowercased() }
        case .nameDescending:
            return files.sorted { $0.name.lowercased() > $1.name.lowercased() }
        case .dateModifiedNewest:
            return files.sorted { ($0.modifiedDate ?? Date.distantPast) > ($1.modifiedDate ?? Date.distantPast) }
        case .dateModifiedOldest:
            return files.sorted { ($0.modifiedDate ?? Date.distantPast) < ($1.modifiedDate ?? Date.distantPast) }
        case .sizeSmallest:
            return files.sorted { ($0.sizeInBytes ?? 0) < ($1.sizeInBytes ?? 0) }
        case .sizeLargest:
            return files.sorted { ($0.sizeInBytes ?? 0) > ($1.sizeInBytes ?? 0) }
        }
    }
}

// MARK: - Cached File List

private struct CachedFileList {
    let files: [DriveFile]
    let cachedAt: Date

    var isExpired: Bool {
        Date().timeIntervalSince(cachedAt) > 300 // 5 minutes
    }
}

// MARK: - Errors

enum DriveFileServiceError: LocalizedError {
    case folderNotFound(String)
    case noFilesFound

    var errorDescription: String? {
        switch self {
        case .folderNotFound(let folderName):
            return "Folder '\(folderName)' not found in Google Drive"
        case .noFilesFound:
            return "No files found"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .folderNotFound:
            return "Please ensure the folder exists and you have access to it."
        case .noFilesFound:
            return "Try adjusting your search criteria or check if files exist in the folder."
        }
    }
}
