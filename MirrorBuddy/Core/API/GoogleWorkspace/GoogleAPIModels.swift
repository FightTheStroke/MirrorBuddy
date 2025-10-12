import Foundation

// MARK: - Namespace
enum GoogleAPIModels {}

// MARK: - Google Drive Models

struct DriveFilesListResponse: Codable {
    let files: [DriveFile]
    let nextPageToken: String?
    let incompleteSearch: Bool?
}

struct DriveFile: Codable {
    let id: String
    let name: String
    let mimeType: String
    let webViewLink: String?
    let thumbnailLink: String?
    let createdTime: String?
    let modifiedTime: String?
    let size: String?
    let parents: [String]?
    let description: String?
}

// MARK: - Google Calendar Models

struct CalendarEventsListResponse: Codable {
    let items: [CalendarEvent]
    let nextPageToken: String?
    let nextSyncToken: String?
}

struct CalendarEvent: Codable {
    let id: String
    let summary: String?
    let description: String?
    let location: String?
    let start: EventDateTime
    let end: EventDateTime
    let attendees: [EventAttendee]?
    let creator: EventPerson?
    let organizer: EventPerson?
    let status: String?
    let htmlLink: String?
}

struct EventDateTime: Codable {
    let dateTime: String?
    let date: String?
    let timeZone: String?
}

struct EventAttendee: Codable {
    let email: String
    let displayName: String?
    let responseStatus: String?
}

struct EventPerson: Codable {
    let email: String
    let displayName: String?
}

// MARK: - Gmail Models

struct GmailMessagesListResponse: Codable {
    let messages: [GmailMessagePreview]?
    let nextPageToken: String?
    let resultSizeEstimate: Int?
}

struct GmailMessagePreview: Codable {
    let id: String
    let threadId: String
}

struct GmailMessage: Codable {
    let id: String
    let threadId: String
    let labelIds: [String]?
    let snippet: String?
    let payload: GmailMessagePayload?
    let internalDate: String?
}

struct GmailMessagePayload: Codable {
    let headers: [GmailHeader]
    let body: GmailMessageBody?
    let parts: [GmailMessagePart]?
}

struct GmailHeader: Codable {
    let name: String
    let value: String
}

struct GmailMessageBody: Codable {
    let size: Int
    let data: String?
}

struct GmailMessagePart: Codable {
    let mimeType: String
    let filename: String?
    let headers: [GmailHeader]?
    let body: GmailMessageBody?
    let parts: [GmailMessagePart]?
}

// MARK: - OAuth Models

struct OAuthTokenRequest: Codable {
    let code: String?
    let clientID: String
    let clientSecret: String
    let redirectURI: String
    let grantType: String
    let refreshToken: String?

    enum CodingKeys: String, CodingKey {
        case code
        case clientID = "client_id"
        case clientSecret = "client_secret"
        case redirectURI = "redirect_uri"
        case grantType = "grant_type"
        case refreshToken = "refresh_token"
    }
}

// MARK: - Error Response

struct GoogleAPIErrorResponse: Codable {
    let error: GoogleAPIErrorDetail
}

struct GoogleAPIErrorDetail: Codable {
    let code: Int
    let message: String
    let status: String?
    let errors: [GoogleAPISubError]?
}

struct GoogleAPISubError: Codable {
    let message: String
    let domain: String?
    let reason: String?
}

// MARK: - Helper Extensions

extension DriveFile {
    /// Check if file is a Google Doc
    var isGoogleDoc: Bool {
        mimeType == "application/vnd.google-apps.document"
    }

    /// Check if file is a PDF
    var isPDF: Bool {
        mimeType == "application/pdf"
    }

    /// Check if file is a folder
    var isFolder: Bool {
        mimeType == "application/vnd.google-apps.folder"
    }

    /// Get file size in bytes
    var sizeInBytes: Int? {
        guard let size else { return nil }
        return Int(size)
    }
}

extension CalendarEvent {
    /// Get event start date
    var startDate: Date? {
        if let dateTimeString = start.dateTime {
            return ISO8601DateFormatter().date(from: dateTimeString)
        } else if let dateString = start.date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            return formatter.date(from: dateString)
        }
        return nil
    }

    /// Get event end date
    var endDate: Date? {
        if let dateTimeString = end.dateTime {
            return ISO8601DateFormatter().date(from: dateTimeString)
        } else if let dateString = end.date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            return formatter.date(from: dateString)
        }
        return nil
    }

    /// Check if event is all-day
    var isAllDay: Bool {
        start.dateTime == nil
    }
}

extension GmailMessage {
    /// Get email subject
    var subject: String? {
        payload?.headers.first { $0.name.lowercased() == "subject" }?.value
    }

    /// Get email sender
    var from: String? {
        payload?.headers.first { $0.name.lowercased() == "from" }?.value
    }

    /// Get email recipient
    var to: String? {
        payload?.headers.first { $0.name.lowercased() == "to" }?.value
    }

    /// Get email date
    var date: String? {
        payload?.headers.first { $0.name.lowercased() == "date" }?.value
    }

    /// Get decoded body text
    var bodyText: String? {
        guard let data = payload?.body?.data else { return nil }
        return decodeBase64URLString(data)
    }

    /// Decode base64url encoded string
    private func decodeBase64URLString(_ string: String) -> String? {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let paddingLength = (4 - base64.count % 4) % 4
        base64 += String(repeating: "=", count: paddingLength)

        guard let data = Data(base64Encoded: base64) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
