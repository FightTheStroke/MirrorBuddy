import Foundation

/// Configuration for Google Workspace APIs (Drive, Calendar, Gmail)
struct GoogleWorkspaceConfiguration {
    /// OAuth 2.0 client ID
    let clientID: String

    /// OAuth 2.0 client secret
    let clientSecret: String

    /// OAuth 2.0 redirect URI
    let redirectURI: String

    /// OAuth 2.0 scopes
    let scopes: [String]

    /// Base URL for Google APIs
    let baseURL: String

    /// Request timeout in seconds
    let timeout: TimeInterval

    /// Maximum retry attempts
    let maxRetries: Int

    /// Default initializer
    init(
        clientID: String,
        clientSecret: String,
        redirectURI: String,
        scopes: [String] = GoogleWorkspaceConfiguration.defaultScopes,
        baseURL: String = "https://www.googleapis.com",
        timeout: TimeInterval = 60.0,
        maxRetries: Int = 3
    ) {
        self.clientID = clientID
        self.clientSecret = clientSecret
        self.redirectURI = redirectURI
        self.scopes = scopes
        self.baseURL = baseURL
        self.timeout = timeout
        self.maxRetries = maxRetries
    }

    /// Default scopes for MirrorBuddy (read-only access)
    static let defaultScopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/gmail.readonly"
    ]

    /// Load configuration from environment or UserDefaults
    static func loadFromEnvironment() -> GoogleWorkspaceConfiguration? {
        // Try to load from environment variables (for development)
        if let clientID = ProcessInfo.processInfo.environment["GOOGLE_CLIENT_ID"],
           let clientSecret = ProcessInfo.processInfo.environment["GOOGLE_CLIENT_SECRET"],
           let redirectURI = ProcessInfo.processInfo.environment["GOOGLE_REDIRECT_URI"],
           !clientID.isEmpty, !clientSecret.isEmpty, !redirectURI.isEmpty {
            return GoogleWorkspaceConfiguration(
                clientID: clientID,
                clientSecret: clientSecret,
                redirectURI: redirectURI
            )
        }

        // Try to load from UserDefaults (for production)
        if let clientID = UserDefaults.standard.string(forKey: "google_client_id"),
           let clientSecret = UserDefaults.standard.string(forKey: "google_client_secret"),
           let redirectURI = UserDefaults.standard.string(forKey: "google_redirect_uri"),
           !clientID.isEmpty, !clientSecret.isEmpty, !redirectURI.isEmpty {
            return GoogleWorkspaceConfiguration(
                clientID: clientID,
                clientSecret: clientSecret,
                redirectURI: redirectURI
            )
        }

        return nil
    }

    /// Save configuration to UserDefaults
    func save() {
        UserDefaults.standard.set(clientID, forKey: "google_client_id")
        UserDefaults.standard.set(clientSecret, forKey: "google_client_secret")
        UserDefaults.standard.set(redirectURI, forKey: "google_redirect_uri")
    }
}

// MARK: - OAuth 2.0

extension GoogleWorkspaceConfiguration {
    /// Build OAuth 2.0 authorization URL
    func buildAuthorizationURL() -> URL? {
        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")
        components?.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: scopes.joined(separator: " ")),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent")
        ]
        return components?.url
    }

    /// Token endpoint URL
    var tokenEndpoint: String {
        "https://oauth2.googleapis.com/token"
    }

    /// Revoke token endpoint URL
    var revokeEndpoint: String {
        "https://oauth2.googleapis.com/revoke"
    }
}

// MARK: - API Endpoints

extension GoogleWorkspaceConfiguration {
    enum Endpoint {
        // Drive
        case driveFilesList
        case driveFilesGet(fileID: String)
        case driveFilesExport(fileID: String, mimeType: String)

        // Calendar
        case calendarEventsList(calendarID: String)
        case calendarEventsGet(calendarID: String, eventID: String)

        // Gmail
        case gmailMessagesList
        case gmailMessagesGet(messageID: String)

        func path(baseURL: String) -> String {
            switch self {
            case .driveFilesList:
                return "\(baseURL)/drive/v3/files"
            case .driveFilesGet(let fileID):
                return "\(baseURL)/drive/v3/files/\(fileID)"
            case .driveFilesExport(let fileID, _):
                return "\(baseURL)/drive/v3/files/\(fileID)/export"
            case .calendarEventsList(let calendarID):
                return "\(baseURL)/calendar/v3/calendars/\(calendarID)/events"
            case let .calendarEventsGet(calendarID, eventID):
                return "\(baseURL)/calendar/v3/calendars/\(calendarID)/events/\(eventID)"
            case .gmailMessagesList:
                return "\(baseURL)/gmail/v1/users/me/messages"
            case .gmailMessagesGet(let messageID):
                return "\(baseURL)/gmail/v1/users/me/messages/\(messageID)"
            }
        }
    }
}

// MARK: - OAuth Token Storage

/// OAuth 2.0 token response
struct OAuthToken: Codable {
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int
    let tokenType: String
    let scope: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case tokenType = "token_type"
        case scope
    }

    /// Check if token is expired
    var isExpired: Bool {
        guard let expirationDate = UserDefaults.standard.object(
            forKey: "google_token_expiration"
        ) as? Date else {
            return true
        }
        return Date() >= expirationDate
    }

    /// Save token to UserDefaults
    func save() {
        UserDefaults.standard.set(accessToken, forKey: "google_access_token")
        if let refreshToken {
            UserDefaults.standard.set(refreshToken, forKey: "google_refresh_token")
        }
        let expirationDate = Date().addingTimeInterval(TimeInterval(expiresIn))
        UserDefaults.standard.set(expirationDate, forKey: "google_token_expiration")
    }

    /// Load token from UserDefaults
    static func load() -> OAuthToken? {
        guard let accessToken = UserDefaults.standard.string(forKey: "google_access_token"),
              let expirationDate = UserDefaults.standard.object(
                forKey: "google_token_expiration"
              ) as? Date else {
            return nil
        }

        let refreshToken = UserDefaults.standard.string(forKey: "google_refresh_token")
        let expiresIn = Int(expirationDate.timeIntervalSinceNow)

        return OAuthToken(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: max(0, expiresIn),
            tokenType: "Bearer",
            scope: nil
        )
    }

    /// Clear token from UserDefaults
    static func clear() {
        UserDefaults.standard.removeObject(forKey: "google_access_token")
        UserDefaults.standard.removeObject(forKey: "google_refresh_token")
        UserDefaults.standard.removeObject(forKey: "google_token_expiration")
    }
}
