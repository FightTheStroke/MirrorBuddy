import Foundation
@testable import MirrorBuddy
import Testing

@Suite("Google Workspace Client Tests")
@MainActor
struct GoogleWorkspaceClientTests {
    // MARK: - Configuration Tests

    @Test("Configuration initialization with OAuth credentials")
    func testConfigurationInit() {
        let config = GoogleWorkspaceConfiguration(
            clientID: "test-client-id",
            clientSecret: "test-client-secret",
            redirectURI: "https://example.com/oauth/callback"
        )

        #expect(config.clientID == "test-client-id")
        #expect(config.clientSecret == "test-client-secret")
        #expect(config.redirectURI == "https://example.com/oauth/callback")
        #expect(config.scopes.count == 3)
        #expect(config.baseURL == "https://www.googleapis.com")
    }

    @Test("Configuration save and load from UserDefaults")
    func testConfigurationPersistence() {
        let config = GoogleWorkspaceConfiguration(
            clientID: "persist-id",
            clientSecret: "persist-secret",
            redirectURI: "https://persist.com/callback"
        )
        config.save()

        let loaded = GoogleWorkspaceConfiguration.loadFromEnvironment()
        #expect(loaded?.clientID == "persist-id")
        #expect(loaded?.clientSecret == "persist-secret")

        // Cleanup
        UserDefaults.standard.removeObject(forKey: "google_client_id")
        UserDefaults.standard.removeObject(forKey: "google_client_secret")
        UserDefaults.standard.removeObject(forKey: "google_redirect_uri")
    }

    @Test("Configuration builds valid authorization URL")
    func testAuthorizationURLGeneration() {
        let config = GoogleWorkspaceConfiguration(
            clientID: "test-id",
            clientSecret: "test-secret",
            redirectURI: "https://example.com/callback"
        )

        let url = config.buildAuthorizationURL()
        #expect(url != nil)
        #expect(url?.absoluteString.contains("accounts.google.com") == true)
        #expect(url?.absoluteString.contains("client_id=test-id") == true)
        #expect(url?.absoluteString.contains("response_type=code") == true)
    }

    @Test("Configuration default scopes")
    func testDefaultScopes() {
        let scopes = GoogleWorkspaceConfiguration.defaultScopes

        #expect(scopes.count == 3)
        #expect(scopes.contains("https://www.googleapis.com/auth/drive.readonly"))
        #expect(scopes.contains("https://www.googleapis.com/auth/calendar.readonly"))
        #expect(scopes.contains("https://www.googleapis.com/auth/gmail.readonly"))
    }

    // MARK: - OAuth Token Tests

    @Test("OAuthToken encoding and decoding")
    func testOAuthTokenCoding() throws {
        let token = OAuthToken(
            accessToken: "access123",
            refreshToken: "refresh456",
            expiresIn: 3_600,
            tokenType: "Bearer",
            scope: "drive.readonly"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(token)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(OAuthToken.self, from: data)

        #expect(decoded.accessToken == "access123")
        #expect(decoded.refreshToken == "refresh456")
        #expect(decoded.expiresIn == 3_600)
        #expect(decoded.tokenType == "Bearer")
    }

    @Test("OAuthToken save and load from UserDefaults")
    func testOAuthTokenPersistence() {
        let token = OAuthToken(
            accessToken: "test-access",
            refreshToken: "test-refresh",
            expiresIn: 3_600,
            tokenType: "Bearer",
            scope: nil
        )
        token.save()

        let loaded = OAuthToken.load()
        #expect(loaded?.accessToken == "test-access")
        #expect(loaded?.refreshToken == "test-refresh")

        // Cleanup
        OAuthToken.clear()
    }

    @Test("OAuthToken expiration check")
    func testTokenExpiration() {
        let expiredToken = OAuthToken(
            accessToken: "expired",
            refreshToken: "refresh",
            expiresIn: -1, // Expired 1 second ago
            tokenType: "Bearer",
            scope: nil
        )
        expiredToken.save()

        let loaded = OAuthToken.load()
        #expect(loaded?.isExpired == true)

        OAuthToken.clear()
    }

    // MARK: - Drive Models Tests

    @Test("DriveFile decoding from JSON")
    func testDriveFileDecoding() throws {
        let json = """
        {
            "id": "file123",
            "name": "Test Document.pdf",
            "mimeType": "application/pdf",
            "webViewLink": "https://drive.google.com/file/d/file123",
            "size": "1024"
        }
        """

        guard let data = json.data(using: .utf8) else {
            Issue.record("Failed to convert JSON to data")
            return
        }
        let decoder = JSONDecoder()
        let file = try decoder.decode(DriveFile.self, from: data)

        #expect(file.id == "file123")
        #expect(file.name == "Test Document.pdf")
        #expect(file.isPDF == true)
        #expect(file.sizeInBytes == 1_024)
    }

    @Test("DriveFile type checking")
    func testDriveFileTypeChecking() {
        let pdfFile = DriveFile(
            id: "1",
            name: "doc.pdf",
            mimeType: "application/pdf",
            webViewLink: nil,
            thumbnailLink: nil,
            createdTime: nil,
            modifiedTime: nil,
            size: nil,
            parents: nil,
            description: nil,
            md5Checksum: nil,
            trashed: nil
        )

        let googleDoc = DriveFile(
            id: "2",
            name: "doc",
            mimeType: "application/vnd.google-apps.document",
            webViewLink: nil,
            thumbnailLink: nil,
            createdTime: nil,
            modifiedTime: nil,
            size: nil,
            parents: nil,
            description: nil,
            md5Checksum: nil,
            trashed: nil
        )

        let folder = DriveFile(
            id: "3",
            name: "folder",
            mimeType: "application/vnd.google-apps.folder",
            webViewLink: nil,
            thumbnailLink: nil,
            createdTime: nil,
            modifiedTime: nil,
            size: nil,
            parents: nil,
            description: nil,
            md5Checksum: nil,
            trashed: nil
        )

        #expect(pdfFile.isPDF == true)
        #expect(googleDoc.isGoogleDoc == true)
        #expect(folder.isFolder == true)
    }

    // MARK: - Calendar Models Tests

    @Test("CalendarEvent decoding from JSON")
    func testCalendarEventDecoding() throws {
        let json = """
        {
            "id": "event123",
            "summary": "Math Class",
            "start": {
                "dateTime": "2025-01-15T09:00:00Z"
            },
            "end": {
                "dateTime": "2025-01-15T10:00:00Z"
            }
        }
        """

        guard let data = json.data(using: .utf8) else {
            Issue.record("Failed to convert JSON to data")
            return
        }
        let decoder = JSONDecoder()
        let event = try decoder.decode(CalendarEvent.self, from: data)

        #expect(event.id == "event123")
        #expect(event.summary == "Math Class")
        #expect(event.isAllDay == false)
    }

    @Test("CalendarEvent all-day event detection")
    func testCalendarAllDayEvent() {
        let allDayEvent = CalendarEvent(
            id: "1",
            summary: "Holiday",
            description: nil,
            location: nil,
            start: EventDateTime(dateTime: nil, date: "2025-01-15", timeZone: nil),
            end: EventDateTime(dateTime: nil, date: "2025-01-16", timeZone: nil),
            attendees: nil,
            creator: nil,
            organizer: nil,
            status: nil,
            htmlLink: nil
        )

        #expect(allDayEvent.isAllDay == true)
    }

    // MARK: - Gmail Models Tests

    @Test("GmailMessage decoding from JSON")
    func testGmailMessageDecoding() throws {
        let json = """
        {
            "id": "msg123",
            "threadId": "thread456",
            "snippet": "Test message",
            "payload": {
                "headers": [
                    {"name": "Subject", "value": "Test Subject"},
                    {"name": "From", "value": "sender@example.com"}
                ],
                "body": {
                    "size": 100
                }
            }
        }
        """

        guard let data = json.data(using: .utf8) else {
            Issue.record("Failed to convert JSON to data")
            return
        }
        let decoder = JSONDecoder()
        let message = try decoder.decode(GmailMessage.self, from: data)

        #expect(message.id == "msg123")
        #expect(message.subject == "Test Subject")
        #expect(message.from == "sender@example.com")
    }

    @Test("GmailMessage header extraction")
    func testGmailMessageHeaders() {
        let headers = [
            GmailHeader(name: "Subject", value: "Math Homework"),
            GmailHeader(name: "From", value: "teacher@school.com"),
            GmailHeader(name: "To", value: "student@school.com"),
            GmailHeader(name: "Date", value: "Mon, 15 Jan 2025 10:00:00 +0000")
        ]

        let payload = GmailMessagePayload(
            headers: headers,
            body: nil,
            parts: nil
        )

        let message = GmailMessage(
            id: "1",
            threadId: "1",
            labelIds: nil,
            snippet: nil,
            payload: payload,
            internalDate: nil
        )

        #expect(message.subject == "Math Homework")
        #expect(message.from == "teacher@school.com")
        #expect(message.to == "student@school.com")
        #expect(message.date != nil)
    }

    // MARK: - Error Tests

    @Test("GoogleAPIError descriptions")
    func testErrorDescriptions() {
        let configError = GoogleAPIError.configurationError("Missing client ID")
        #expect(configError.errorDescription?.contains("Missing client ID") == true)

        let oauthError = GoogleAPIError.oauthError("Token expired")
        #expect(oauthError.errorDescription?.contains("OAuth") == true)

        let apiError = GoogleAPIError.apiError(code: 403, message: "Permission denied")
        #expect(apiError.errorDescription?.contains("403") == true)

        let notFoundError = GoogleAPIError.notFound("file123")
        #expect(notFoundError.errorDescription?.contains("file123") == true)
    }

    @Test("GoogleAPIError recovery suggestions")
    func testErrorRecoverySuggestions() {
        let configError = GoogleAPIError.configurationError("Test")
        #expect(configError.recoverySuggestion?.contains("credentials") == true)

        let oauthError = GoogleAPIError.oauthError("Test")
        #expect(oauthError.recoverySuggestion?.contains("authenticate") == true)

        let permissionError = GoogleAPIError.permissionDenied
        #expect(permissionError.recoverySuggestion?.contains("permission") == true)

        let rateLimitError = GoogleAPIError.rateLimitExceeded(retryAfter: 60)
        #expect(rateLimitError.recoverySuggestion?.contains("Wait") == true)
    }

    // MARK: - Endpoint Tests

    @Test("Drive endpoints path generation")
    func testDriveEndpoints() {
        let listEndpoint = GoogleWorkspaceConfiguration.Endpoint.driveFilesList
        let listPath = listEndpoint.path(baseURL: "https://www.googleapis.com")
        #expect(listPath.contains("drive/v3/files"))

        let getEndpoint = GoogleWorkspaceConfiguration.Endpoint.driveFilesGet(fileID: "file123")
        let getPath = getEndpoint.path(baseURL: "https://www.googleapis.com")
        #expect(getPath.contains("files/file123"))
    }

    @Test("Calendar endpoints path generation")
    func testCalendarEndpoints() {
        let listEndpoint = GoogleWorkspaceConfiguration.Endpoint.calendarEventsList(calendarID: "primary")
        let listPath = listEndpoint.path(baseURL: "https://www.googleapis.com")
        #expect(listPath.contains("calendar/v3"))
        #expect(listPath.contains("calendars/primary/events"))
    }

    @Test("Gmail endpoints path generation")
    func testGmailEndpoints() {
        let listEndpoint = GoogleWorkspaceConfiguration.Endpoint.gmailMessagesList
        let listPath = listEndpoint.path(baseURL: "https://www.googleapis.com")
        #expect(listPath.contains("gmail/v1"))
        #expect(listPath.contains("users/me/messages"))

        let getEndpoint = GoogleWorkspaceConfiguration.Endpoint.gmailMessagesGet(messageID: "msg123")
        let getPath = getEndpoint.path(baseURL: "https://www.googleapis.com")
        #expect(getPath.contains("messages/msg123"))
    }
}
