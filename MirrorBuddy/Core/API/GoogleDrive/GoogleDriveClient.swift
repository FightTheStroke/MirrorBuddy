import Foundation

/// Google Drive API client for file operations
@MainActor
final class GoogleDriveClient {
    /// Shared singleton instance
    static let shared = GoogleDriveClient()

    // MARK: - Properties

    /// OAuth service for authentication
    private let oauthService = GoogleOAuthService.shared

    /// Base URL for Google Drive API v3
    private let baseURL = "https://www.googleapis.com/drive/v3"

    /// URL session for API requests
    private let session: URLSession

    // MARK: - Initialization

    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Authentication

    /// Ensure user is authenticated and tokens are valid
    private func ensureAuthenticated() async throws -> String {
        // Check if authenticated
        guard await oauthService.isAuthenticated() else {
            throw GoogleDriveError.notAuthenticated
        }

        // Get tokens
        guard let tokens = try await oauthService.getTokens() else {
            throw GoogleDriveError.noTokens
        }

        // Check if token needs refresh
        if tokens.needsRefresh {
            let refreshedTokens = try await oauthService.refreshToken()
            return refreshedTokens.accessToken
        }

        return tokens.accessToken
    }

    // MARK: - File Operations

    /// List files in Google Drive
    /// - Parameters:
    ///   - folderID: Optional folder ID to list files from (nil for root)
    ///   - pageSize: Number of files to return per page (default: 100)
    ///   - pageToken: Token for pagination
    ///   - query: Optional query string for filtering files
    /// - Returns: File list response
    func listFiles(
        folderID: String? = nil,
        pageSize: Int = 100,
        pageToken: String? = nil,
        query: String? = nil
    ) async throws -> DriveFilesListResponse {
        let accessToken = try await ensureAuthenticated()

        var queryString = query ?? "'root' in parents and trashed = false"

        // Override with folder-specific query if folder ID provided
        if let folderID = folderID {
            queryString = "'\(folderID)' in parents and trashed = false"
        }

        var components = URLComponents(string: "\(baseURL)/files")!
        components.queryItems = [
            URLQueryItem(name: "q", value: queryString),
            URLQueryItem(name: "pageSize", value: String(pageSize)),
            URLQueryItem(name: "fields", value: "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, parents, createdTime, md5Checksum)")
        ]

        if let pageToken = pageToken {
            components.queryItems?.append(URLQueryItem(name: "pageToken", value: pageToken))
        }

        guard let url = components.url else {
            throw GoogleDriveError.invalidURL("Failed to construct list files URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleDriveError.invalidResponse("Invalid HTTP response")
        }

        if httpResponse.statusCode == 401 {
            // Token might be expired, try refreshing once
            let newToken = try await oauthService.refreshToken()
            request.setValue("Bearer \(newToken.accessToken)", forHTTPHeaderField: "Authorization")
            let (retryData, retryResponse) = try await session.data(for: request)

            guard let retryHTTPResponse = retryResponse as? HTTPURLResponse,
                  (200...299).contains(retryHTTPResponse.statusCode) else {
                throw GoogleDriveError.requestFailed("Failed after token refresh")
            }

            return try JSONDecoder().decode(DriveFilesListResponse.self, from: retryData)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw GoogleDriveError.requestFailed("HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        return try JSONDecoder().decode(DriveFilesListResponse.self, from: data)
    }

    /// Search for files by name or query
    /// - Parameters:
    ///   - query: Search query
    ///   - pageSize: Number of results per page
    /// - Returns: File list response
    func searchFiles(query: String, pageSize: Int = 100) async throws -> DriveFilesListResponse {
        try await listFiles(pageSize: pageSize, query: query)
    }

    /// Get file metadata by ID
    /// - Parameter fileID: The file ID
    /// - Returns: File metadata
    func getFile(fileID: String) async throws -> DriveFile {
        let accessToken = try await ensureAuthenticated()

        var components = URLComponents(string: "\(baseURL)/files/\(fileID)")!
        components.queryItems = [
            URLQueryItem(name: "fields", value: "id, name, mimeType, modifiedTime, size, webViewLink, parents, createdTime, md5Checksum")
        ]

        guard let url = components.url else {
            throw GoogleDriveError.invalidURL("Failed to construct get file URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GoogleDriveError.requestFailed("Failed to get file metadata")
        }

        return try JSONDecoder().decode(DriveFile.self, from: data)
    }

    /// Find folder by name
    /// - Parameters:
    ///   - folderName: Name of the folder to find
    ///   - parentID: Optional parent folder ID to search within
    /// - Returns: Folder file object if found
    func findFolder(name folderName: String, parentID: String? = nil) async throws -> DriveFile? {
        var query = "mimeType = 'application/vnd.google-apps.folder' and name = '\(folderName)' and trashed = false"

        if let parentID = parentID {
            query += " and '\(parentID)' in parents"
        }

        let result = try await listFiles(pageSize: 1, query: query)
        return result.files.first
    }

    /// Get changes since a specific token or page token
    /// - Parameters:
    ///   - startPageToken: Token for starting point
    ///   - pageSize: Number of changes per page
    /// - Returns: Changes list
    func getChanges(startPageToken: String, pageSize: Int = 100) async throws -> DriveChangeList {
        let accessToken = try await ensureAuthenticated()

        var components = URLComponents(string: "\(baseURL)/changes")!
        components.queryItems = [
            URLQueryItem(name: "pageToken", value: startPageToken),
            URLQueryItem(name: "pageSize", value: String(pageSize)),
            URLQueryItem(name: "fields", value: "nextPageToken, newStartPageToken, changes(fileId, file(id, name, mimeType, modifiedTime, size, trashed))")
        ]

        guard let url = components.url else {
            throw GoogleDriveError.invalidURL("Failed to construct changes URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleDriveError.invalidResponse("Invalid HTTP response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw GoogleDriveError.requestFailed("HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        return try JSONDecoder().decode(DriveChangeList.self, from: data)
    }

    /// Get the start page token for changes tracking
    /// - Returns: Start page token
    func getStartPageToken() async throws -> String {
        let accessToken = try await ensureAuthenticated()

        guard let url = URL(string: "\(baseURL)/changes/startPageToken") else {
            throw GoogleDriveError.invalidURL("Failed to construct start page token URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GoogleDriveError.requestFailed("Failed to get start page token")
        }

        struct StartPageTokenResponse: Codable {
            let startPageToken: String
        }

        let result = try JSONDecoder().decode(StartPageTokenResponse.self, from: data)
        return result.startPageToken
    }
}

// MARK: - Change Tracking Models

/// Drive change entry
struct DriveChange: Codable, Sendable {
    let fileId: String
    let file: DriveFile?
}

/// Response from changes API
struct DriveChangeList: Codable, Sendable {
    let changes: [DriveChange]
    let nextPageToken: String?
    let newStartPageToken: String?
}

// MARK: - Error Types

enum GoogleDriveError: LocalizedError {
    case notAuthenticated
    case noTokens
    case invalidURL(String)
    case invalidResponse(String)
    case requestFailed(String)
    case fileNotFound(String)
    case folderNotFound(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated with Google Drive"
        case .noTokens:
            return "No authentication tokens available"
        case .invalidURL(let message):
            return "Invalid URL: \(message)"
        case .invalidResponse(let message):
            return "Invalid response: \(message)"
        case .requestFailed(let message):
            return "Request failed: \(message)"
        case .fileNotFound(let fileID):
            return "File not found: \(fileID)"
        case .folderNotFound(let folderName):
            return "Folder not found: \(folderName)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .notAuthenticated, .noTokens:
            return "Please sign in to Google Drive first."
        case .invalidURL, .invalidResponse, .requestFailed:
            return "Please check your internet connection and try again."
        case .fileNotFound, .folderNotFound:
            return "Please verify the file or folder exists and you have access to it."
        }
    }
}
