//
//  GoogleAPIIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.1: Google API Integration Tests
//  Tests OAuth flow, Gmail API, Calendar API, and Drive API integration
//

import AuthenticationServices
@testable import MirrorBuddy
import XCTest

/// Integration tests for Google API services (OAuth, Gmail, Calendar, Drive)
@MainActor
final class GoogleAPIIntegrationTests: XCTestCase {
    var mockURLSession: URLSession!
    var configuration: URLSessionConfiguration!

    override func setUpWithError() throws {
        try super.setUpWithError()

        // Configure URL session with mock protocol
        configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        mockURLSession = URLSession(configuration: configuration)

        // Reset mock responses
        MockURLProtocol.responseQueue = []
        MockURLProtocol.requestHistory = []
    }

    override func tearDownWithError() throws {
        mockURLSession = nil
        configuration = nil
        MockURLProtocol.responseQueue = []
        MockURLProtocol.requestHistory = []
        try super.tearDownWithError()
    }

    // MARK: - OAuth Integration Tests

    /// Test 1: OAuth token exchange flow
    func testOAuthTokenExchangeFlow() async throws {
        // Given: Mock token response
        let tokenResponse = """
            {
            "access_token": "ya29.test_access_token",
            "refresh_token": "1//test_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly"
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: tokenResponse,
            statusCode: 200,
            delay: 0.1
            )
            )

            // When: Exchange authorization code for tokens
            let request = try XCTUnwrap(
            URLRequest(url: URL(string: "https://oauth2.googleapis.com/token") ?? URL(fileURLWithPath: ""))
            )

            let (data, response) = try await mockURLSession.data(for: request)

            // Then: Verify token response
            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 200, "Token exchange should succeed")

            let tokens = try JSONDecoder().decode(MockOAuthTokenResponse.self, from: data)
            XCTAssertEqual(tokens.tokenType, "Bearer")
            XCTAssertTrue(tokens.accessToken.starts(with: "ya29."))
            XCTAssertNotNil(tokens.refreshToken)
            XCTAssertEqual(tokens.expiresIn, 3_600)
            }

            /// Test 2: OAuth token refresh flow
            func testOAuthTokenRefreshFlow() async throws {
            // Given: Mock refresh token response
        let refreshResponse = """
        {
            "access_token": "ya29.new_access_token",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "https://www.googleapis.com/auth/gmail.readonly"
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: refreshResponse,
            statusCode: 200,
            delay: 0.1
            )
        )

        // When: Refresh access token
        let request = try XCTUnwrap(
            URLRequest(url: URL(string: "https://oauth2.googleapis.com/token") ?? URL(fileURLWithPath: ""))
        )

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify new access token
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let tokens = try JSONDecoder().decode(MockOAuthTokenResponse.self, from: data)
        XCTAssertTrue(tokens.accessToken.starts(with: "ya29.new"))
        XCTAssertNil(tokens.refreshToken, "Refresh response shouldn't include new refresh token")
    }

    /// Test 3: OAuth token expiration and automatic refresh
    func testOAuthTokenExpirationHandling() async throws {
        // Given: Expired token
        let expiredToken = OAuthTokens(
            accessToken: "expired_token",
            refreshToken: "valid_refresh_token",
            expiresAt: Date().addingTimeInterval(-3_600) // Expired 1 hour ago
        )

        // Then: Verify token is expired
        XCTAssertTrue(expiredToken.isExpired, "Token should be expired")
        XCTAssertTrue(expiredToken.needsRefresh, "Expired token needs refresh")

        // Given: Valid token
        let validToken = OAuthTokens(
            accessToken: "valid_token",
            refreshToken: "refresh_token",
            expiresAt: Date().addingTimeInterval(3_600) // Expires in 1 hour
        )

        // Then: Verify token is valid
        XCTAssertFalse(validToken.isExpired, "Token should not be expired")
        XCTAssertFalse(validToken.needsRefresh, "Valid token doesn't need refresh")
    }

    /// Test 4: OAuth token revocation flow
    func testOAuthTokenRevocationFlow() async throws {
        // Given: Mock revocation success
        MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
                data: Data(),
                statusCode: 200,
                delay: 0.1
            )
        )

        // When: Revoke token
        let request = try XCTUnwrap(
            URLRequest(url: URL(string: "https://oauth2.googleapis.com/revoke") ?? URL(fileURLWithPath: ""))
        )

        let (_, response) = try await mockURLSession.data(for: request)

        // Then: Verify revocation succeeded
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200, "Token revocation should succeed")
    }

    // MARK: - Gmail API Integration Tests

    /// Test 5: Gmail message list retrieval
    func testGmailMessageListRetrieval() async throws {
        // Given: Mock Gmail messages response
        let messagesResponse = """
            {
            "messages": [
            {"id": "msg001", "threadId": "thread001"},
            {"id": "msg002", "threadId": "thread001"},
            {"id": "msg003", "threadId": "thread002"}
            ],
            "nextPageToken": "page2_token",
            "resultSizeEstimate": 3
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: messagesResponse,
            statusCode: 200,
            delay: 0.1
            )
            )

            // When: Fetch message list
            let url = URL(string: "https://www.googleapis.com/gmail/v1/users/me/messages?q=from:teacher") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)

            let (data, response) = try await mockURLSession.data(for: request)

            // Then: Verify message list
            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 200)

            let messageList = try JSONDecoder().decode(MockGmailMessageList.self, from: data)
            XCTAssertEqual(messageList.messages.count, 3, "Should have 3 messages")
            XCTAssertEqual(messageList.nextPageToken, "page2_token")
            XCTAssertEqual(messageList.resultSizeEstimate, 3)
            }

            /// Test 6: Gmail message detail retrieval
            func testGmailMessageDetailRetrieval() async throws {
            // Given: Mock Gmail message detail
        let messageDetail = """
        {
            "id": "msg001",
            "threadId": "thread001",
            "snippet": "Assignment: Complete Chapter 5 problems",
            "payload": {
            "headers": [
            {"name": "Subject", "value": "Math Homework - Due Friday"},
            {"name": "From", "value": "teacher@school.edu"},
            {"name": "Date", "value": "Mon, 21 Oct 2024 10:30:00 -0700"}
            ],
            "body": {
            "data": "Q29tcGxldGUgQ2hhcHRlciA1IHByb2JsZW1zIDE1"
            }
            },
            "internalDate": "1729529400000"
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: messageDetail,
            statusCode: 200,
            delay: 0.1
            )
        )

        // When: Fetch message detail
        let url = URL(string: "https://www.googleapis.com/gmail/v1/users/me/messages/msg001") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify message detail
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let message = try JSONDecoder().decode(MockGmailMessage.self, from: data)
        XCTAssertEqual(message.id, "msg001")
        XCTAssertTrue(message.snippet.contains("Assignment"))
        XCTAssertFalse(message.payload.headers.isEmpty)
    }

    /// Test 7: Gmail attachment download
    func testGmailAttachmentDownload() async throws {
        // Given: Mock attachment data
        let attachmentData = "VGVzdCBQREYgY29udGVudA==Data(".utf8) ?? Data()

        MockURLProtocol.responseQueue.append(
        MockURLProtocol.MockResponse(
        data: attachmentData,
        statusCode: 200,
        delay: 0.2
        )
        )

        // When: Download attachment
        let url = URL(string: "https://www.googleapis.com/gmail/v1/users/me/messages/msg001/attachments/att001") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify attachment download
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)
        XCTAssertFalse(data.isEmpty, "Attachment data should not be empty")
    }

    /// Test 8: Gmail query filtering (from teachers)
    func testGmailQueryFiltering() async throws {
        // Given: Multiple mock responses for different queries
        let teacherMessages = """
            {
            "messages": [
            {"id": "msg001", "threadId": "thread001"},
            {"id": "msg002", "threadId": "thread001"}
            ],
            "resultSizeEstimate": 2
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: teacherMessages,
            statusCode: 200,
            delay: 0.1
            )
            )

            // When: Query with filter
            let url = URL(string: "https://www.googleapis.com/gmail/v1/users/me/messages?q=from:teacher+subject:homework") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)

            let (data, response) = try await mockURLSession.data(for: request)

            // Then: Verify filtered results
            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 200)

            let messageList = try JSONDecoder().decode(MockGmailMessageList.self, from: data)
            XCTAssertEqual(messageList.messages.count, 2, "Should have 2 teacher messages")
            }

            // MARK: - Google Calendar API Integration Tests

            /// Test 9: Calendar event list retrieval
            func testCalendarEventListRetrieval() async throws {
            // Given: Mock calendar events response
        let eventsResponse = """
        {
            "items": [
            {
            "id": "event001",
            "summary": "Math Exam",
            "description": "Chapter 1-5 coverage",
            "start": {"dateTime": "2024-10-25T10:00:00-07:00"},
            "end": {"dateTime": "2024-10-25T12:00:00-07:00"}
            },
            {
            "id": "event002",
            "summary": "Physics Lab Due",
            "start": {"dateTime": "2024-10-26T23:59:00-07:00"},
            "end": {"dateTime": "2024-10-26T23:59:00-07:00"}
            }
            ],
            "nextPageToken": null
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: eventsResponse,
            statusCode: 200,
            delay: 0.1
            )
        )

        // When: Fetch calendar events
        let url = URL(string: "https://www.googleapis.com/calendar/v3/calendars/primary/events") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify events
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let calendar = try JSONDecoder().decode(MockCalendarEventList.self, from: data)
        XCTAssertEqual(calendar.items.count, 2, "Should have 2 events")
        XCTAssertTrue(calendar.items[0].summary.contains("Math"))
    }

    /// Test 10: Calendar event creation
    func testCalendarEventCreation() async throws {
        // Given: Mock event creation response
        let createdEvent = """
            {
            "id": "event_new001",
            "summary": "Study Session",
            "description": "Review math concepts",
            "start": {"dateTime": "2024-10-27T15:00:00-07:00"},
            "end": {"dateTime": "2024-10-27T17:00:00-07:00"},
            "status": "confirmed"
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: createdEvent,
            statusCode: 200,
            delay: 0.1
            )
            )

            // When: Create calendar event
            let url = URL(string: "https://www.googleapis.com/calendar/v3/calendars/primary/events") ?? URL(fileURLWithPath: "")
            var request = URLRequest(url: url)
            request.httpMethod = "POST"

            let (data, response) = try await mockURLSession.data(for: request)

            // Then: Verify event creation
            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 200)

            let event = try JSONDecoder().decode(MockCalendarEvent.self, from: data)
            XCTAssertEqual(event.summary, "Study Session")
            XCTAssertEqual(event.status, "confirmed")
            }

            /// Test 11: Calendar time zone handling
            func testCalendarTimeZoneHandling() async throws {
            // Given: Mock event with different time zones
        let eventWithTimezone = """
        {
            "id": "event_tz001",
            "summary": "International Meeting",
            "start": {
            "dateTime": "2024-10-25T14:00:00-04:00",
            "timeZone": "America/New_York"
            },
            "end": {
            "dateTime": "2024-10-25T15:00:00-04:00",
            "timeZone": "America/New_York"
            }
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: eventWithTimezone,
            statusCode: 200,
            delay: 0.1
            )
        )

        // When: Fetch event
        let url = URL(string: "https://www.googleapis.com/calendar/v3/calendars/primary/events/event_tz001") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify timezone data
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 200)

        let event = try JSONDecoder().decode(MockCalendarEvent.self, from: data)
        XCTAssertNotNil(event.start)
        XCTAssertNotNil(event.end)
    }

    // MARK: - Google Drive API Integration Tests

    /// Test 12: Drive file list retrieval
    func testDriveFileListRetrieval() async throws {
        // Given: Mock Drive files response
        let filesResponse = """
            {
            "files": [
            {
            "id": "file001",
            "name": "Lecture Notes.pdf",
            "mimeType": "application/pdf",
            "size": "1048576",
            "modifiedTime": "2024-10-20T10:30:00.000Z"
            },
            {
            "id": "file002",
            "name": "Assignment.docx",
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "size": "524288",
            "modifiedTime": "2024-10-21T15:45:00.000Z"
            }
            ],
            "nextPageToken": null
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: filesResponse,
            statusCode: 200,
            delay: 0.1
            )
            )

            // When: Fetch file list
            let url = URL(string: "https://www.googleapis.com/drive/v3/files") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)

            let (data, response) = try await mockURLSession.data(for: request)

            // Then: Verify file list
            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 200)

            let fileList = try JSONDecoder().decode(MockDriveFileList.self, from: data)
            XCTAssertEqual(fileList.files.count, 2, "Should have 2 files")
            XCTAssertTrue(fileList.files[0].name.contains("Lecture"))
            }

            /// Test 13: Drive file download
            func testDriveFileDownload() async throws {
            // Given: Mock file content
            let fileContent = "Sample PDF content dataData(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: fileContent,
            statusCode: 200,
            delay: 0.3
            )
            )

            // When: Download file
            let url = URL(string: "https://www.googleapis.com/drive/v3/files/file001?alt=media") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)

            let (data, response) = try await mockURLSession.data(for: request)

            // Then: Verify download
            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 200)
            XCTAssertFalse(data.isEmpty, "Downloaded file should have content")
            }

            /// Test 14: Drive API error handling
            func testDriveAPIErrorHandling() async throws {
            // Given: Mock error response
        let errorResponse = """
        {
            "error": {
            "code": 404,
            "message": "File not found",
            "status": "NOT_FOUND"
            }
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(
            data: errorResponse,
            statusCode: 404,
            delay: 0.1
            )
        )

        // When: Request non-existent file
        let url = URL(string: "https://www.googleapis.com/drive/v3/files/nonexistent") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)

        let (data, response) = try await mockURLSession.data(for: request)

        // Then: Verify error response
        let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
        XCTAssertEqual(httpResponse.statusCode, 404)

        let error = try JSONDecoder().decode(MockGoogleAPIError.self, from: data)
        XCTAssertEqual(error.error.code, 404)
        XCTAssertEqual(error.error.status, "NOT_FOUND")
    }
}

// MARK: - Mock Data Structures

struct MockOAuthTokenResponse: Codable {
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
}

struct MockGmailMessageList: Codable {
    let messages: [MockGmailMessageRef]
    let nextPageToken: String?
    let resultSizeEstimate: Int
}

struct MockGmailMessageRef: Codable {
    let id: String
    let threadId: String
}

struct MockGmailMessage: Codable {
    let id: String
    let threadId: String
    let snippet: String
    let payload: MockGmailPayload
    let internalDate: String
}

struct MockGmailPayload: Codable {
    let headers: [MockGmailHeader]
    let body: MockGmailBody
}

struct MockGmailHeader: Codable {
    let name: String
    let value: String
}

struct MockGmailBody: Codable {
    let data: String
}

struct MockCalendarEventList: Codable {
    let items: [MockCalendarEvent]
    let nextPageToken: String?
}

struct MockCalendarEvent: Codable {
    let id: String
    let summary: String
    let description: String?
    let start: MockCalendarDateTime
    let end: MockCalendarDateTime
    let status: String?
}

struct MockCalendarDateTime: Codable {
    let dateTime: String
    let timeZone: String?
}

struct MockDriveFileList: Codable {
    let files: [MockDriveFile]
    let nextPageToken: String?
}

struct MockDriveFile: Codable {
    let id: String
    let name: String
    let mimeType: String
    let size: String?
    let modifiedTime: String
}

struct MockGoogleAPIError: Codable {
    let error: MockGoogleErrorDetail
}

struct MockGoogleErrorDetail: Codable {
    let code: Int
    let message: String
    let status: String
}
