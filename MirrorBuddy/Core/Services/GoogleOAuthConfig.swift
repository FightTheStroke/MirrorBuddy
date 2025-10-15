import Foundation

/// Google OAuth configuration loaded from unified APIKeys-Info.plist
struct GoogleOAuthConfig {
    static let shared = GoogleOAuthConfig()

    let clientID: String
    let reversedClientID: String

    private init() {
        // Load from APIKeys-Info.plist (unified credentials file)
        guard let path = Bundle.main.path(forResource: "APIKeys-Info", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: path) as? [String: Any],
              let clientID = dict["GOOGLE_CLIENT_ID"] as? String,
              let reversedClientID = dict["GOOGLE_REVERSED_CLIENT_ID"] as? String else {
            fatalError("APIKeys-Info.plist not found or Google OAuth keys missing")
        }

        self.clientID = clientID
        self.reversedClientID = reversedClientID
    }

    /// Google OAuth scopes for Drive, Gmail, and Calendar
    static let scopes = [
        // Drive scopes
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive.file",
        // Gmail scopes
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        // Calendar scopes
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events.readonly",
        // User info
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email"
    ]

    /// OAuth endpoints
    static let authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    static let tokenEndpoint = "https://oauth2.googleapis.com/token"
    static let revokeEndpoint = "https://oauth2.googleapis.com/revoke"
}
