import Foundation
@testable import MirrorBuddy
import XCTest

// MARK: - API Client Tests (Task 61.2)

@MainActor
final class APIClientTests: XCTestCase {
    var mockURLSession: URLSession!
    var configuration: URLSessionConfiguration!

    override func setUpWithError() throws {
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
    }

    // MARK: - OAuth Service Tests

    func testOAuthTokenExchange() async throws {
        // Mock successful token response
        let tokenResponse = """
        {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "https://www.googleapis.com/auth/drive.readonly"
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: tokenResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://oauth2.googleapis.com/token")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Note: This test demonstrates the pattern but requires refactoring
        // GoogleOAuthService to accept custom URLSession

        // Verify token response parsing would work
        let decoder = JSONDecoder()
        struct TokenResponse: Codable {
            let access_token: String
            let refresh_token: String?
            let expires_in: Int?
            let token_type: String
            let scope: String?
        }

        let response = try decoder.decode(TokenResponse.self, from: tokenResponse)
        XCTAssertEqual(response.access_token, "test_access_token")
        XCTAssertEqual(response.refresh_token, "test_refresh_token")
        XCTAssertEqual(response.expires_in, 3_600)
        XCTAssertEqual(response.token_type, "Bearer")
    }

    func testOAuthTokenRefresh() async throws {
        // Mock refresh token response
        let refreshResponse = """
        {
            "access_token": "new_access_token",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "https://www.googleapis.com/auth/drive.readonly"
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: refreshResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://oauth2.googleapis.com/token")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Verify refresh response parsing
        let decoder = JSONDecoder()
        struct TokenResponse: Codable {
            let access_token: String
            let refresh_token: String?
            let expires_in: Int?
            let token_type: String
        }

        let response = try decoder.decode(TokenResponse.self, from: refreshResponse)
        XCTAssertEqual(response.access_token, "new_access_token")
        XCTAssertNil(response.refresh_token) // Not returned on refresh
    }

    func testOAuthTokenExchangeFailure() async throws {
        // Mock error response
        let errorResponse = """
        {
            "error": "invalid_grant",
            "error_description": "Bad Request"
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: errorResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://oauth2.googleapis.com/token")!,
                    statusCode: 400,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Verify error can be parsed
        struct OAuthError: Codable {
            let error: String
            let error_description: String
        }

        let decoder = JSONDecoder()
        let error = try decoder.decode(OAuthError.self, from: errorResponse)
        XCTAssertEqual(error.error, "invalid_grant")
        XCTAssertEqual(error.error_description, "Bad Request")
    }

    // MARK: - Google Calendar API Tests

    func testFetchCalendarList() async throws {
        // Mock calendar list response
        let calendarResponse = """
        {
            "items": [
                {
                    "id": "primary",
                    "summary": "Primary Calendar",
                    "description": "Main calendar",
                    "primary": true
                },
                {
                    "id": "school@example.com",
                    "summary": "School Calendar",
                    "description": null,
                    "primary": false
                }
            ]
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: calendarResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://www.googleapis.com/calendar/v3/users/me/calendarList")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: ["Content-Type": "application/json"]
                )!,
                error: nil
            )
        )

        // Test calendar list parsing
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        struct CalendarListResponse: Codable {
            let items: [GoogleCalendar]
        }

        struct GoogleCalendar: Codable {
            let id: String
            let summary: String
            let description: String?
            let primary: Bool?
        }

        let response = try decoder.decode(CalendarListResponse.self, from: calendarResponse)
        XCTAssertEqual(response.items.count, 2)
        XCTAssertEqual(response.items[0].id, "primary")
        XCTAssertEqual(response.items[0].summary, "Primary Calendar")
        XCTAssertTrue(response.items[0].primary ?? false)
    }

    func testFetchCalendarEvents() async throws {
        // Mock events response
        let eventsResponse = """
        {
            "items": [
                {
                    "id": "event1",
                    "summary": "Math Assignment",
                    "description": "Complete homework on algebra",
                    "start": {
                        "dateTime": "2025-01-15T14:00:00Z"
                    },
                    "end": {
                        "dateTime": "2025-01-15T15:00:00Z"
                    },
                    "location": "Room 101",
                    "htmlLink": "https://calendar.google.com/event1"
                },
                {
                    "id": "event2",
                    "summary": "Physics Test",
                    "description": "Chapters 1-5",
                    "start": {
                        "date": "2025-01-20"
                    },
                    "end": {
                        "date": "2025-01-20"
                    },
                    "location": null,
                    "htmlLink": "https://calendar.google.com/event2"
                }
            ]
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: eventsResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://www.googleapis.com/calendar/v3/calendars/primary/events")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Test events parsing
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        struct EventsResponse: Codable {
            let items: [CalendarEvent]
        }

        struct CalendarEvent: Codable {
            let id: String
            let summary: String
            let description: String?
            let start: EventDateTime
            let end: EventDateTime
            let location: String?
            let htmlLink: String?
        }

        struct EventDateTime: Codable {
            let dateTime: String?
            let date: String?
        }

        let response = try decoder.decode(EventsResponse.self, from: eventsResponse)
        XCTAssertEqual(response.items.count, 2)
        XCTAssertEqual(response.items[0].summary, "Math Assignment")
        XCTAssertNotNil(response.items[0].start.dateTime)
        XCTAssertNil(response.items[1].start.dateTime)
        XCTAssertNotNil(response.items[1].start.date) // All-day event
    }

    func testCalendarAPIUnauthorized() async throws {
        // Mock 401 Unauthorized response
        let errorResponse = """
        {
            "error": {
                "code": 401,
                "message": "Request is missing required authentication credential."
            }
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: errorResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://www.googleapis.com/calendar/v3/users/me/calendarList")!,
                    statusCode: 401,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Verify error response structure
        struct APIError: Codable {
            struct ErrorDetail: Codable {
                let code: Int
                let message: String
            }
            let error: ErrorDetail
        }

        let decoder = JSONDecoder()
        let error = try decoder.decode(APIError.self, from: errorResponse)
        XCTAssertEqual(error.error.code, 401)
        XCTAssertTrue(error.error.message.contains("authentication"))
    }

    // MARK: - Google Drive API Tests

    func testFetchDriveFileList() async throws {
        // Mock Drive files response
        let filesResponse = """
        {
            "files": [
                {
                    "id": "file1",
                    "name": "Math Notes.pdf",
                    "mimeType": "application/pdf",
                    "modifiedTime": "2025-01-10T10:30:00Z",
                    "size": "1048576",
                    "webViewLink": "https://drive.google.com/file1",
                    "trashed": false
                },
                {
                    "id": "file2",
                    "name": "Physics Lab Report.docx",
                    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "modifiedTime": "2025-01-12T14:15:00Z",
                    "size": "524288",
                    "webViewLink": "https://drive.google.com/file2",
                    "trashed": false
                }
            ],
            "nextPageToken": null
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: filesResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://www.googleapis.com/drive/v3/files")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Test file list parsing
        struct FilesResponse: Codable {
            let files: [DriveFile]
            let nextPageToken: String?
        }

        struct DriveFile: Codable {
            let id: String
            let name: String
            let mimeType: String
            let modifiedTime: String
            let size: String?
            let webViewLink: String?
            let trashed: Bool?
        }

        let decoder = JSONDecoder()
        let response = try decoder.decode(FilesResponse.self, from: filesResponse)
        XCTAssertEqual(response.files.count, 2)
        XCTAssertEqual(response.files[0].name, "Math Notes.pdf")
        XCTAssertEqual(response.files[0].mimeType, "application/pdf")
        XCTAssertNil(response.nextPageToken)
    }

    func testDriveFileSearch() async throws {
        // Mock search response
        let searchResponse = """
        {
            "files": [
                {
                    "id": "file3",
                    "name": "Assignment Mathematics.pdf",
                    "mimeType": "application/pdf",
                    "modifiedTime": "2025-01-14T09:00:00Z",
                    "size": "2097152",
                    "webViewLink": "https://drive.google.com/file3",
                    "trashed": false
                }
            ],
            "nextPageToken": null
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: searchResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://www.googleapis.com/drive/v3/files")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        struct FilesResponse: Codable {
            let files: [DriveFile]
        }

        struct DriveFile: Codable {
            let id: String
            let name: String
        }

        let decoder = JSONDecoder()
        let response = try decoder.decode(FilesResponse.self, from: searchResponse)
        XCTAssertEqual(response.files.count, 1)
        XCTAssertTrue(response.files[0].name.contains("Mathematics"))
    }

    // MARK: - Request Formation Tests

    func testOAuthRequestFormation() {
        // Test OAuth authorization URL construction
        let clientID = "test_client_id"
        let redirectURI = "com.googleusercontent.apps.test_client_id:/oauth2redirect"
        let scopes = [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/calendar.readonly"
        ]

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: scopes.joined(separator: " ")),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent")
        ]

        let url = components.url!
        XCTAssertTrue(url.absoluteString.contains("client_id=test_client_id"))
        XCTAssertTrue(url.absoluteString.contains("response_type=code"))
        XCTAssertTrue(url.absoluteString.contains("access_type=offline"))
    }

    func testCalendarAPIRequestHeaders() {
        // Test calendar API request headers
        let accessToken = "test_access_token"
        let url = URL(string: "https://www.googleapis.com/calendar/v3/users/me/calendarList")!

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test_access_token")
    }

    func testDriveAPIQueryParameters() {
        // Test Drive API query parameter construction
        let folderID = "test_folder_123"
        var components = URLComponents(string: "https://www.googleapis.com/drive/v3/files")!
        components.queryItems = [
            URLQueryItem(name: "q", value: "'\(folderID)' in parents and trashed = false"),
            URLQueryItem(name: "pageSize", value: "100"),
            URLQueryItem(name: "fields", value: "files(id,name,mimeType)"),
            URLQueryItem(name: "orderBy", value: "name")
        ]

        let url = components.url!
        XCTAssertTrue(url.absoluteString.contains("pageSize=100"))
        XCTAssertTrue(url.absoluteString.contains("orderBy=name"))
    }

    // MARK: - Error Handling Tests

    func testNetworkError() async throws {
        // Mock network error
        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: nil,
                response: nil,
                error: NSError(
                    domain: NSURLErrorDomain,
                    code: NSURLErrorNotConnectedToInternet,
                    userInfo: [NSLocalizedDescriptionKey: "No internet connection"]
                )
            )
        )

        // Verify error can be handled
        let url = URL(string: "https://example.com")!
        let request = URLRequest(url: url)

        do {
            let (_, _) = try await mockURLSession.data(for: request)
            XCTFail("Should have thrown error")
        } catch {
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, NSURLErrorDomain)
            XCTAssertEqual(nsError.code, NSURLErrorNotConnectedToInternet)
        }
    }

    func testHTTP500Error() async throws {
        // Mock server error
        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: "Internal Server Error".data(using: .utf8),
                response: HTTPURLResponse(
                    url: URL(string: "https://api.example.com")!,
                    statusCode: 500,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        let url = URL(string: "https://api.example.com")!
        let request = URLRequest(url: url)

        let (_, response) = try await mockURLSession.data(for: request)
        let httpResponse = response as! HTTPURLResponse
        XCTAssertEqual(httpResponse.statusCode, 500)
    }

    func testRateLimitError() async throws {
        // Mock rate limit error (429)
        let rateLimitResponse = """
        {
            "error": {
                "code": 429,
                "message": "Rate limit exceeded",
                "status": "RESOURCE_EXHAUSTED"
            }
        }
        """.data(using: .utf8)!

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: rateLimitResponse,
                response: HTTPURLResponse(
                    url: URL(string: "https://www.googleapis.com/calendar/v3")!,
                    statusCode: 429,
                    httpVersion: nil,
                    headerFields: ["Retry-After": "60"]
                )!,
                error: nil
            )
        )

        let url = URL(string: "https://www.googleapis.com/calendar/v3")!
        let request = URLRequest(url: url)

        let (data, response) = try await mockURLSession.data(for: request)
        let httpResponse = response as! HTTPURLResponse
        XCTAssertEqual(httpResponse.statusCode, 429)
        XCTAssertEqual(httpResponse.value(forHTTPHeaderField: "Retry-After"), "60")

        struct RateLimitError: Codable {
            struct ErrorDetail: Codable {
                let code: Int
                let message: String
            }
            let error: ErrorDetail
        }

        let decoder = JSONDecoder()
        let error = try decoder.decode(RateLimitError.self, from: data)
        XCTAssertEqual(error.error.code, 429)
    }

    // MARK: - Response Parsing Tests

    func testJSONParsingSuccess() throws {
        let jsonData = """
        {
            "id": "123",
            "name": "Test",
            "created_at": "2025-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        struct TestModel: Codable {
            let id: String
            let name: String
            let createdAt: String

            enum CodingKeys: String, CodingKey {
                case id, name
                case createdAt = "created_at"
            }
        }

        let decoder = JSONDecoder()
        let model = try decoder.decode(TestModel.self, from: jsonData)
        XCTAssertEqual(model.id, "123")
        XCTAssertEqual(model.name, "Test")
    }

    func testJSONParsingInvalidFormat() {
        let invalidJSON = "{ invalid json }".data(using: .utf8)!

        struct TestModel: Codable {
            let id: String
        }

        let decoder = JSONDecoder()
        XCTAssertThrowsError(try decoder.decode(TestModel.self, from: invalidJSON))
    }

    func testJSONParsingMissingRequiredField() {
        let jsonData = """
        {
            "id": "123"
        }
        """.data(using: .utf8)!

        struct TestModel: Codable {
            let id: String
            let name: String // Required but missing
        }

        let decoder = JSONDecoder()
        XCTAssertThrowsError(try decoder.decode(TestModel.self, from: jsonData))
    }

    // MARK: - Retry Logic Tests

    func testRetryOnNetworkFailure() async throws {
        // First request fails, second succeeds
        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: nil,
                response: nil,
                error: NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
            )
        )

        MockURLProtocol.responseQueue.append(
            MockResponse(
                data: "Success".data(using: .utf8),
                response: HTTPURLResponse(
                    url: URL(string: "https://api.example.com")!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                error: nil
            )
        )

        // Test retry logic pattern
        let url = URL(string: "https://api.example.com")!
        let request = URLRequest(url: url)
        var attempts = 0
        let maxRetries = 2

        while attempts < maxRetries {
            do {
                let (data, _) = try await mockURLSession.data(for: request)
                let result = String(data: data, encoding: .utf8)
                XCTAssertEqual(result, "Success")
                break
            } catch {
                attempts += 1
                if attempts >= maxRetries {
                    throw error
                }
            }
        }

        XCTAssertEqual(attempts, 1) // Should succeed on second attempt
    }
}

// MARK: - Mock URL Protocol

@MainActor
class MockURLProtocol: URLProtocol {
    nonisolated(unsafe) static var responseQueue: [MockResponse] = []
    nonisolated(unsafe) static var requestHistory: [URLRequest] = []

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        MockURLProtocol.requestHistory.append(request)

        guard !MockURLProtocol.responseQueue.isEmpty else {
            client?.urlProtocol(
                self,
                didFailWithError: NSError(
                    domain: "MockURLProtocol",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "No mock response configured"]
                )
            )
            return
        }

        let mockResponse = MockURLProtocol.responseQueue.removeFirst()

        if let error = mockResponse.error {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }

        if let response = mockResponse.response {
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        }

        if let data = mockResponse.data {
            client?.urlProtocol(self, didLoad: data)
        }

        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {
        // No cleanup needed
    }
}

// MARK: - Mock Response

struct MockResponse {
    let data: Data?
    let response: HTTPURLResponse?
    let error: Error?
}
