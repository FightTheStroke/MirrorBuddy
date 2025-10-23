import Foundation

/// Client for interacting with Google Workspace APIs (Drive, Calendar, Gmail)
@MainActor
final class GoogleWorkspaceClient {
    private let configuration: GoogleWorkspaceConfiguration
    private let urlSession: URLSession
    private var currentToken: OAuthToken?

    init(configuration: GoogleWorkspaceConfiguration) {
        self.configuration = configuration

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = configuration.timeout
        config.timeoutIntervalForResource = configuration.timeout
        self.urlSession = URLSession(configuration: config)

        // Load existing token if available
        self.currentToken = OAuthToken.load()
    }

    // MARK: - OAuth 2.0 Authentication

    /// Get OAuth authorization URL
    func getAuthorizationURL() -> URL? {
        configuration.buildAuthorizationURL()
    }

    /// Exchange authorization code for access token
    func exchangeCodeForToken(code: String) async throws -> OAuthToken {
        let request = OAuthTokenRequest(
            code: code,
            clientID: configuration.clientID,
            clientSecret: configuration.clientSecret,
            redirectURI: configuration.redirectURI,
            grantType: "authorization_code",
            refreshToken: nil
        )

        let token = try await requestToken(request: request)
        currentToken = token
        try token.save()
        return token
    }

    /// Refresh access token using refresh token
    func refreshToken() async throws -> OAuthToken {
        guard let refreshToken = currentToken?.refreshToken else {
            throw GoogleAPIError.oauthError("No refresh token available")
        }

        let request = OAuthTokenRequest(
            code: nil,
            clientID: configuration.clientID,
            clientSecret: configuration.clientSecret,
            redirectURI: configuration.redirectURI,
            grantType: "refresh_token",
            refreshToken: refreshToken
        )

        let token = try await requestToken(request: request)
        // Preserve old refresh token if not provided
        let updatedToken = OAuthToken(
            accessToken: token.accessToken,
            refreshToken: token.refreshToken ?? refreshToken,
            expiresIn: token.expiresIn,
            tokenType: token.tokenType,
            scope: token.scope
        )
        currentToken = updatedToken
        try updatedToken.save()
        return updatedToken
    }

    /// Revoke current token
    func revokeToken() async throws {
        guard let token = currentToken else {
            throw GoogleAPIError.oauthError("No token to revoke")
        }

        guard let url = URL(string: configuration.revokeEndpoint) else {
            throw GoogleAPIError.configurationError("Invalid revoke endpoint URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("token=\(token.accessToken)".utf8)

        let (_, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GoogleAPIError.oauthError("Failed to revoke token")
        }

        currentToken = nil
        OAuthToken.clear()
    }

    // MARK: - Google Drive

    /// List files in Google Drive
    func listDriveFiles(
        query: String? = nil,
        pageSize: Int = 100,
        pageToken: String? = nil
    ) async throws -> DriveFilesListResponse {
        var urlComponents = URLComponents(
            string: GoogleWorkspaceConfiguration.Endpoint.driveFilesList.path(
                baseURL: configuration.baseURL
            )
        )

        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "pageSize", value: String(pageSize)),
            URLQueryItem(
                name: "fields",
                value: "files(id,name,mimeType,webViewLink,thumbnailLink,createdTime,modifiedTime,size,parents,description)"
            )
        ]

        if let query {
            queryItems.append(URLQueryItem(name: "q", value: query))
        }

        if let pageToken {
            queryItems.append(URLQueryItem(name: "pageToken", value: pageToken))
        }

        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedRequest(url: url, method: "GET")
    }

    /// Get Drive file metadata
    func getDriveFile(fileID: String) async throws -> DriveFile {
        let urlString = GoogleWorkspaceConfiguration.Endpoint.driveFilesGet(fileID: fileID)
            .path(baseURL: configuration.baseURL)

        guard let url = URL(string: urlString) else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedRequest(url: url, method: "GET")
    }

    /// Export Google Doc as PDF
    func exportDriveFileAsPDF(fileID: String) async throws -> Data {
        let urlString = GoogleWorkspaceConfiguration.Endpoint.driveFilesExport(
            fileID: fileID,
            mimeType: "application/pdf"
        ).path(baseURL: configuration.baseURL)

        var urlComponents = URLComponents(string: urlString)
        urlComponents?.queryItems = [
            URLQueryItem(name: "mimeType", value: "application/pdf")
        ]

        guard let url = urlComponents?.url else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedDataRequest(url: url, method: "GET")
    }

    // MARK: - Google Calendar

    /// List calendar events
    func listCalendarEvents(
        calendarID: String = "primary",
        timeMin: Date? = nil,
        timeMax: Date? = nil,
        maxResults: Int = 100,
        pageToken: String? = nil
    ) async throws -> CalendarEventsListResponse {
        let urlString = GoogleWorkspaceConfiguration.Endpoint.calendarEventsList(calendarID: calendarID)
            .path(baseURL: configuration.baseURL)

        var urlComponents = URLComponents(string: urlString)

        let formatter = ISO8601DateFormatter()
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "maxResults", value: String(maxResults))
        ]

        if let timeMin {
            queryItems.append(
                URLQueryItem(name: "timeMin", value: formatter.string(from: timeMin))
            )
        }

        if let timeMax {
            queryItems.append(
                URLQueryItem(name: "timeMax", value: formatter.string(from: timeMax))
            )
        }

        if let pageToken {
            queryItems.append(URLQueryItem(name: "pageToken", value: pageToken))
        }

        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedRequest(url: url, method: "GET")
    }

    /// Get specific calendar event
    func getCalendarEvent(
        calendarID: String = "primary",
        eventID: String
    ) async throws -> CalendarEvent {
        let urlString = GoogleWorkspaceConfiguration.Endpoint.calendarEventsGet(
            calendarID: calendarID,
            eventID: eventID
        ).path(baseURL: configuration.baseURL)

        guard let url = URL(string: urlString) else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedRequest(url: url, method: "GET")
    }

    // MARK: - Gmail

    /// List Gmail messages
    func listGmailMessages(
        query: String? = nil,
        maxResults: Int = 100,
        pageToken: String? = nil
    ) async throws -> GmailMessagesListResponse {
        let urlString = GoogleWorkspaceConfiguration.Endpoint.gmailMessagesList
            .path(baseURL: configuration.baseURL)

        var urlComponents = URLComponents(string: urlString)

        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "maxResults", value: String(maxResults))
        ]

        if let query {
            queryItems.append(URLQueryItem(name: "q", value: query))
        }

        if let pageToken {
            queryItems.append(URLQueryItem(name: "pageToken", value: pageToken))
        }

        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedRequest(url: url, method: "GET")
    }

    /// Get full Gmail message
    func getGmailMessage(messageID: String) async throws -> GmailMessage {
        let urlString = GoogleWorkspaceConfiguration.Endpoint.gmailMessagesGet(messageID: messageID)
            .path(baseURL: configuration.baseURL)

        var urlComponents = URLComponents(string: urlString)
        urlComponents?.queryItems = [
            URLQueryItem(name: "format", value: "full")
        ]

        guard let url = urlComponents?.url else {
            throw GoogleAPIError.configurationError("Invalid URL")
        }

        return try await performAuthenticatedRequest(url: url, method: "GET")
    }

    // MARK: - Private Methods

    private func requestToken(request: OAuthTokenRequest) async throws -> OAuthToken {
        guard let url = URL(string: configuration.tokenEndpoint) else {
            throw GoogleAPIError.configurationError("Invalid token endpoint URL")
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await urlSession.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleAPIError.invalidResponse
        }

        if !(200...299).contains(httpResponse.statusCode) {
            if let errorResponse = try? JSONDecoder().decode(
                GoogleAPIErrorResponse.self,
                from: data
            ) {
                throw GoogleAPIError.apiError(
                    code: errorResponse.error.code,
                    message: errorResponse.error.message
                )
            }
            throw GoogleAPIError.oauthError("Token request failed")
        }

        do {
            return try JSONDecoder().decode(OAuthToken.self, from: data)
        } catch {
            throw GoogleAPIError.decodingError(error)
        }
    }

    private func performAuthenticatedRequest<T: Decodable>(
        url: URL,
        method: String
    ) async throws -> T {
        try await ensureValidToken()

        guard let token = currentToken else {
            throw GoogleAPIError.oauthError("No valid token available")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token.accessToken)", forHTTPHeaderField: "Authorization")

        return try await executeWithRetry {
            try await self.performRequest(request)
        }
    }

    private func performAuthenticatedDataRequest(
        url: URL,
        method: String
    ) async throws -> Data {
        try await ensureValidToken()

        guard let token = currentToken else {
            throw GoogleAPIError.oauthError("No valid token available")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token.accessToken)", forHTTPHeaderField: "Authorization")

        return try await executeWithRetry {
            try await self.performDataRequest(request)
        }
    }

    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleAPIError.invalidResponse
        }

        // Handle rate limiting
        if httpResponse.statusCode == 429 {
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
                .flatMap { TimeInterval($0) }
            throw GoogleAPIError.rateLimitExceeded(retryAfter: retryAfter)
        }

        // Handle authentication errors
        if httpResponse.statusCode == 401 {
            throw GoogleAPIError.oauthError("Authentication failed")
        }

        // Handle permission errors
        if httpResponse.statusCode == 403 {
            throw GoogleAPIError.permissionDenied
        }

        // Handle not found
        if httpResponse.statusCode == 404 {
            throw GoogleAPIError.notFound(request.url?.absoluteString ?? "unknown")
        }

        // Handle other error status codes
        if !(200...299).contains(httpResponse.statusCode) {
            if let errorResponse = try? JSONDecoder().decode(
                GoogleAPIErrorResponse.self,
                from: data
            ) {
                throw GoogleAPIError.apiError(
                    code: errorResponse.error.code,
                    message: errorResponse.error.message
                )
            }
            throw GoogleAPIError.apiError(
                code: httpResponse.statusCode,
                message: "Unknown error occurred"
            )
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw GoogleAPIError.decodingError(error)
        }
    }

    private func performDataRequest(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleAPIError.invalidResponse
        }

        if !(200...299).contains(httpResponse.statusCode) {
            throw GoogleAPIError.apiError(
                code: httpResponse.statusCode,
                message: "Request failed"
            )
        }

        return data
    }

    private func ensureValidToken() async throws {
        guard let token = currentToken else {
            throw GoogleAPIError.oauthError("No token available. Please authenticate.")
        }

        if token.isExpired {
            _ = try await refreshToken()
        }
    }

    private func executeWithRetry<T>(
        operation: () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        var attempt = 0

        while attempt < configuration.maxRetries {
            do {
                return try await operation()
            } catch let error as GoogleAPIError {
                lastError = error

                switch error {
                case .rateLimitExceeded(let retryAfter):
                    let delay = retryAfter ?? Double(attempt * 2)
                    try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                case .networkError, .invalidResponse:
                    let delay = Double(attempt + 1)
                    try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                case .oauthError:
                    throw error // Don't retry OAuth errors
                default:
                    throw error // Don't retry on other errors
                }

                attempt += 1
            } catch {
                throw GoogleAPIError.networkError(error)
            }
        }

        throw lastError ?? GoogleAPIError.maxRetriesExceeded
    }
}
