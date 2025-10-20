import AuthenticationServices
import Foundation
import Security

/// Google OAuth 2.0 authentication service for Google Drive access
/// Configuration is hardcoded in GoogleOAuthConfig loaded from GoogleService-Info.plist
@MainActor
final class GoogleOAuthService: NSObject {
    /// Shared singleton instance
    static let shared = GoogleOAuthService()

    // MARK: - Properties

    /// Keychain manager for secure token storage
    private let keychain = KeychainManager.shared

    /// Current authentication session
    private var authSession: ASWebAuthenticationSession?

    /// Current presentation context provider
    private weak var presentationContextProvider: ASWebAuthenticationPresentationContextProviding?

    // MARK: - Initialization

    override private init() {
        super.init()
    }

    // MARK: - Authentication Flow

    /// Start the OAuth authentication flow
    /// - Parameter presentationContextProvider: Provider for presenting the authentication session
    /// - Returns: OAuth tokens
    func authenticate(
        presentationContextProvider: ASWebAuthenticationPresentationContextProviding? = nil
    ) async throws -> OAuthTokens {
        // Construct authorization URL using hardcoded config
        let authURL = try constructAuthorizationURL()

        // Store presentation context provider
        self.presentationContextProvider = presentationContextProvider

        // Start authentication session
        let authCode = try await startAuthenticationSession(authURL: authURL)

        // Exchange authorization code for tokens
        let tokens = try await exchangeCodeForTokens(code: authCode)

        // Store tokens securely in Keychain
        try keychain.saveOAuthTokens(tokens, for: .google)

        return tokens
    }

    /// Get current OAuth tokens
    func getTokens() async throws -> OAuthTokens? {
        try keychain.getOAuthTokens(for: .google)
    }

    /// Check if user is authenticated
    func isAuthenticated() async -> Bool {
        guard let tokens = try? await getTokens() else {
            return false
        }
        return !tokens.isExpired
    }

    /// Refresh access token using refresh token
    func refreshToken() async throws -> OAuthTokens {
        guard let existingTokens = try await getTokens() else {
            throw GoogleOAuthError.noRefreshToken("No tokens found in Keychain")
        }

        guard let refreshToken = existingTokens.refreshToken else {
            throw GoogleOAuthError.noRefreshToken("No refresh token available")
        }

        let newTokens = try await refreshAccessToken(refreshToken: refreshToken)

        // Store updated tokens
        try keychain.saveOAuthTokens(newTokens, for: .google)

        return newTokens
    }

    /// Sign out and revoke tokens
    func signOut() async throws {
        guard let tokens = try await getTokens() else {
            // No tokens to revoke, just return
            return
        }

        // Revoke tokens on Google's server
        try await revokeToken(token: tokens.accessToken)

        // Delete tokens from Keychain
        try keychain.deleteOAuthTokens(for: .google)
    }

    // MARK: - Private Methods

    private func constructAuthorizationURL() throws -> URL {
        let config = GoogleOAuthConfig.shared
        guard var components = URLComponents(string: GoogleOAuthConfig.authorizationEndpoint) else {
            throw GoogleOAuthError.invalidURL("Invalid authorization endpoint URL")
        }

        let redirectURI = "\(config.reversedClientID):/oauth2redirect"

        components.queryItems = [
            URLQueryItem(name: "client_id", value: config.clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: GoogleOAuthConfig.scopes.joined(separator: " ")),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent")
        ]

        guard let url = components.url else {
            throw GoogleOAuthError.invalidURL("Failed to construct authorization URL")
        }

        return url
    }

    private func startAuthenticationSession(authURL: URL) async throws -> String {
        let config = GoogleOAuthConfig.shared

        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: config.reversedClientID
            ) { callbackURL, error in
                if let error = error {
                    let nsError = error as NSError
                    if nsError.domain == ASWebAuthenticationSessionErrorDomain,
                       nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        continuation.resume(throwing: GoogleOAuthError.userCancelled)
                    } else {
                        continuation.resume(throwing: GoogleOAuthError.authenticationFailed(error.localizedDescription))
                    }
                    return
                }

                guard let callbackURL = callbackURL else {
                    continuation.resume(throwing: GoogleOAuthError.invalidCallback("No callback URL received"))
                    return
                }

                // Extract authorization code from callback URL
                guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                      let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                    continuation.resume(throwing: GoogleOAuthError.invalidCallback("No authorization code in callback"))
                    return
                }

                continuation.resume(returning: code)
            }

            // Set presentation context provider if available
            if let provider = self.presentationContextProvider {
                session.presentationContextProvider = provider
            }

            // Prefer ephemeral session for privacy
            session.prefersEphemeralWebBrowserSession = true

            self.authSession = session

            if !session.start() {
                continuation.resume(throwing: GoogleOAuthError.sessionStartFailed)
            }
        }
    }

    private func exchangeCodeForTokens(code: String) async throws -> OAuthTokens {
        let config = GoogleOAuthConfig.shared
        let redirectURI = "\(config.reversedClientID):/oauth2redirect"

        guard let url = URL(string: GoogleOAuthConfig.tokenEndpoint) else {
            throw GoogleOAuthError.invalidURL("Invalid token endpoint")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        var bodyComponents = URLComponents()
        bodyComponents.queryItems = [
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "client_id", value: config.clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "grant_type", value: "authorization_code")
        ]

        request.httpBody = bodyComponents.query?.data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleOAuthError.invalidResponse("Invalid HTTP response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw GoogleOAuthError.tokenExchangeFailed("HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        return try parseTokenResponse(data: data)
    }

    private func refreshAccessToken(refreshToken: String) async throws -> OAuthTokens {
        let config = GoogleOAuthConfig.shared

        guard let url = URL(string: GoogleOAuthConfig.tokenEndpoint) else {
            throw GoogleOAuthError.invalidURL("Invalid token endpoint")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        var bodyComponents = URLComponents()
        bodyComponents.queryItems = [
            URLQueryItem(name: "refresh_token", value: refreshToken),
            URLQueryItem(name: "client_id", value: config.clientID),
            URLQueryItem(name: "grant_type", value: "refresh_token")
        ]

        request.httpBody = bodyComponents.query?.data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleOAuthError.invalidResponse("Invalid HTTP response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw GoogleOAuthError.tokenRefreshFailed("HTTP \(httpResponse.statusCode): \(errorMessage)")
        }

        // Parse new tokens but preserve refresh token if not returned
        var newTokens = try parseTokenResponse(data: data)
        if newTokens.refreshToken == nil {
            // Google doesn't always return a new refresh token
            newTokens = OAuthTokens(
                accessToken: newTokens.accessToken,
                refreshToken: refreshToken,
                expiresAt: newTokens.expiresAt,
                tokenType: newTokens.tokenType,
                scope: newTokens.scope
            )
        }

        return newTokens
    }

    private func revokeToken(token: String) async throws {
        guard let url = URL(string: "\(GoogleOAuthConfig.revokeEndpoint)?token=\(token)") else {
            throw GoogleOAuthError.invalidURL("Invalid revoke endpoint")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GoogleOAuthError.invalidResponse("Invalid HTTP response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw GoogleOAuthError.revocationFailed("HTTP \(httpResponse.statusCode)")
        }
    }

    private func parseTokenResponse(data: Data) throws -> OAuthTokens {
        struct TokenResponse: Codable {
            // swiftlint:disable:next identifier_name
            let access_token: String
            // swiftlint:disable:next identifier_name
            let refresh_token: String?
            // swiftlint:disable:next identifier_name
            let expires_in: Int?
            // swiftlint:disable:next identifier_name
            let token_type: String
            let scope: String?
        }

        let decoder = JSONDecoder()
        let response = try decoder.decode(TokenResponse.self, from: data)

        let expiresAt = response.expires_in.map { Date().addingTimeInterval(TimeInterval($0)) }

        return OAuthTokens(
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresAt: expiresAt,
            tokenType: response.token_type,
            scope: response.scope
        )
    }
}

// MARK: - Google OAuth Errors

enum GoogleOAuthError: LocalizedError {
    case missingConfiguration(String)
    case invalidURL(String)
    case invalidCallback(String)
    case authenticationFailed(String)
    case tokenExchangeFailed(String)
    case tokenRefreshFailed(String)
    case noRefreshToken(String)
    case revocationFailed(String)
    case invalidResponse(String)
    case sessionStartFailed
    case userCancelled

    var errorDescription: String? {
        switch self {
        case .missingConfiguration(let message):
            return "OAuth configuration error: \(message)"
        case .invalidURL(let message):
            return "Invalid URL: \(message)"
        case .invalidCallback(let message):
            return "Invalid callback: \(message)"
        case .authenticationFailed(let message):
            return "Authentication failed: \(message)"
        case .tokenExchangeFailed(let message):
            return "Token exchange failed: \(message)"
        case .tokenRefreshFailed(let message):
            return "Token refresh failed: \(message)"
        case .noRefreshToken(let message):
            return "No refresh token: \(message)"
        case .revocationFailed(let message):
            return "Token revocation failed: \(message)"
        case .invalidResponse(let message):
            return "Invalid response: \(message)"
        case .sessionStartFailed:
            return "Failed to start authentication session"
        case .userCancelled:
            return "User cancelled authentication"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .missingConfiguration:
            return "Please configure OAuth credentials in app settings or Keychain."
        case .invalidURL, .invalidCallback:
            return "Check OAuth configuration and redirect URIs."
        case .authenticationFailed:
            return "Please try signing in again."
        case .tokenExchangeFailed, .tokenRefreshFailed:
            return "Please try signing in again or check your internet connection."
        case .noRefreshToken:
            return "Please sign in again to obtain a new refresh token."
        case .revocationFailed:
            return "The token may have already been revoked."
        case .invalidResponse:
            return "Check your internet connection and try again."
        case .sessionStartFailed:
            return "Please try again or restart the app."
        case .userCancelled:
            return "Please try again if you want to sign in."
        }
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension GoogleOAuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Return the key window
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            return window
        }
        // Fallback to main window (should not happen in modern iOS)
        return ASPresentationAnchor()
    }
}
