import Foundation
import os.log
import SwiftData

/// macOS-native Gmail API integration for assignment extraction
/// Uses Timer-based scheduling instead of BGTaskScheduler
@MainActor
final class macOSGmailService: GmailManaging {
    /// Shared singleton instance
    static let shared = macOSGmailService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Gmail-macOS")

    // MARK: - Configuration

    /// Gmail API base URL
    private let baseURL = "https://www.googleapis.com/gmail/v1"

    /// OAuth service for authentication
    private let oauthService = GoogleOAuthService.shared

    /// Required Gmail scopes
    static let gmailScopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify"
    ]

    // MARK: - Dependencies

    private var modelContext: ModelContext?
    private var lastSyncDate: Date?

    // MARK: - macOS-specific Scheduling

    private var syncTimer: Timer?
    private let defaultSyncInterval: TimeInterval = 3600 // 1 hour

    // MARK: - Initialization

    private init() {}

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Gmail service configured (macOS)")
    }

    // MARK: - Email Sync

    /// Fetch and sync emails
    func syncEmails(fromTeachersOnly: Bool = true) async throws -> [MBGmailMessage] {
        logger.info("Starting email sync (macOS)")

        // Ensure authentication
        guard let tokens = try await oauthService.getTokens() else {
            throw GmailError.notAuthenticated
        }

        let accessToken = tokens.accessToken

        // Build search query
        let query = buildSearchQuery(fromTeachersOnly: fromTeachersOnly)

        // Fetch message IDs
        let messageIDs = try await fetchMessageList(
            accessToken: accessToken,
            query: query
        )
        logger.debug("Found \(messageIDs.count) messages")

        // Fetch full message details
        var messages: [MBGmailMessage] = []

        for messageID in messageIDs {
            do {
                let message = try await fetchMessage(
                    messageID: messageID,
                    accessToken: accessToken
                )
                messages.append(message)

                // Rate limiting
                try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 0.1s
            } catch {
                logger.warning("Failed to fetch message \(messageID): \(error.localizedDescription)")
                // Continue with other messages
            }
        }

        // Store in SwiftData
        try storeMessages(messages)

        // Update last sync date
        lastSyncDate = Date()
        UserDefaults.standard.set(lastSyncDate, forKey: "Gmail.LastSyncDate")

        logger.info("Email sync completed: \(messages.count) messages")
        return messages
    }

    // MARK: - macOS Background Sync (Timer-based)

    /// Start automatic background sync
    func startBackgroundSync(interval: TimeInterval?) {
        stopBackgroundSync()

        let syncInterval = interval ?? defaultSyncInterval

        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                do {
                    _ = try await self.syncEmails()
                    self.logger.info("Background sync completed")
                } catch {
                    self.logger.error("Background sync failed: \(error.localizedDescription)")
                }
            }
        }

        logger.info("Background sync started with interval: \(syncInterval)s")
    }

    /// Stop automatic background sync
    func stopBackgroundSync() {
        syncTimer?.invalidate()
        syncTimer = nil
        logger.info("Background sync stopped")
    }

    /// Perform immediate background sync
    func performBackgroundSync() async {
        do {
            _ = try await syncEmails()
            logger.info("Manual background sync completed")
        } catch {
            logger.error("Manual background sync failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Search Query Building

    /// Build Gmail search query
    private func buildSearchQuery(fromTeachersOnly: Bool) -> String {
        var queryParts: [String] = []

        // Search for assignment-related keywords
        let assignmentKeywords = [
            "compiti",
            "homework",
            "assignment",
            "esercizi",
            "verifica",
            "test"
        ]

        let keywordQuery = assignmentKeywords.map { "(\($0))" }.joined(separator: " OR ")
        queryParts.append("(\(keywordQuery))")

        // Filter by teachers if requested
        if fromTeachersOnly {
            // This would need teacher email list from settings
            // For now, filter by common school domains
            queryParts.append("(from:*.edu OR from:*scuola* OR from:*school*)")
        }

        // Only unread or recent messages (last 7 days)
        if let lastSync = lastSyncDate {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy/MM/dd"
            let dateString = formatter.string(from: lastSync)
            queryParts.append("after:\(dateString)")
        } else {
            // Last 7 days on first sync
            let sevenDaysAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy/MM/dd"
            let dateString = formatter.string(from: sevenDaysAgo)
            queryParts.append("after:\(dateString)")
        }

        return queryParts.joined(separator: " ")
    }

    // MARK: - Gmail API Methods

    /// Fetch list of message IDs matching query
    private func fetchMessageList(accessToken: String, query: String) async throws -> [String] {
        let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let urlString = "\(baseURL)/users/me/messages?q=\(encodedQuery)&maxResults=50"

        guard let url = URL(string: urlString) else {
            throw GmailError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GmailError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            logger.error("Gmail API error: \(httpResponse.statusCode)")
            throw GmailError.apiError(httpResponse.statusCode)
        }

        struct MessageListResponse: Codable {
            let messages: [MessageReference]?

            struct MessageReference: Codable {
                let id: String
            }
        }

        let decoder = JSONDecoder()
        let listResponse = try decoder.decode(MessageListResponse.self, from: data)

        return listResponse.messages?.map { $0.id } ?? []
    }

    /// Fetch full message details
    private func fetchMessage(messageID: String, accessToken: String) async throws -> MBGmailMessage {
        let urlString = "\(baseURL)/users/me/messages/\(messageID)?format=full"

        guard let url = URL(string: urlString) else {
            throw GmailError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GmailError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw GmailError.apiError(httpResponse.statusCode)
        }

        // Parse Gmail API message format
        return try parseGmailMessage(data: data)
    }

    /// Parse Gmail API message JSON to MBGmailMessage
    private func parseGmailMessage(data: Data) throws -> MBGmailMessage {
        struct GmailAPIMessage: Codable {
            let id: String
            let threadId: String
            let snippet: String
            let payload: Payload

            struct Payload: Codable {
                let headers: [Header]
                let body: Body?
                let parts: [Part]?

                struct Header: Codable {
                    let name: String
                    let value: String
                }

                struct Body: Codable {
                    let data: String?
                }

                struct Part: Codable {
                    let mimeType: String
                    let body: Body?
                }
            }
        }

        let decoder = JSONDecoder()
        let apiMessage = try decoder.decode(GmailAPIMessage.self, from: data)

        // Extract headers
        let headers = apiMessage.payload.headers
        let subject = headers.first(where: { $0.name.lowercased() == "subject" })?.value ?? ""
        let from = headers.first(where: { $0.name.lowercased() == "from" })?.value ?? ""
        let date = headers.first(where: { $0.name.lowercased() == "date" })?.value ?? ""

        // Extract body
        var bodyText = ""
        if let bodyData = apiMessage.payload.body?.data {
            bodyText = decodeBase64URL(bodyData)
        } else if let parts = apiMessage.payload.parts {
            // Try to find text/plain part
            for part in parts where part.mimeType == "text/plain" {
                if let partData = part.body?.data {
                    bodyText = decodeBase64URL(partData)
                    break
                }
            }
        }

        // Parse date
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss Z"
        let receivedDate = dateFormatter.date(from: date) ?? Date()

        // Create MBGmailMessage
        return MBGmailMessage(
            id: apiMessage.id,
            threadId: apiMessage.threadId,
            subject: subject,
            from: from,
            snippet: apiMessage.snippet,
            body: bodyText,
            receivedDate: receivedDate,
            isRead: false, // API doesn't provide this directly
            hasAttachments: apiMessage.payload.parts?.contains(where: { $0.mimeType.hasPrefix("application/") }) ?? false
        )
    }

    /// Decode base64URL encoded string (Gmail uses this format)
    private func decodeBase64URL(_ string: String) -> String {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64),
              let decoded = String(data: data, encoding: .utf8) else {
            return ""
        }

        return decoded
    }

    // MARK: - SwiftData Storage

    /// Store messages in SwiftData
    private func storeMessages(_ messages: [MBGmailMessage]) throws {
        guard let context = modelContext else {
            throw GmailError.noModelContext
        }

        for message in messages {
            context.insert(message)
        }

        try context.save()
        logger.debug("Stored \(messages.count) messages in SwiftData")
    }

    /// Fetch all stored messages
    func fetchStoredMessages() throws -> [MBGmailMessage] {
        guard let context = modelContext else {
            throw GmailError.noModelContext
        }

        let descriptor = FetchDescriptor<MBGmailMessage>(
            sortBy: [SortDescriptor(\.receivedDate, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Extract assignments from stored messages
    func extractAssignments() async throws -> [String] {
        let messages = try fetchStoredMessages()
        var assignments: [String] = []

        for message in messages {
            // Simple keyword-based extraction
            let text = "\(message.subject) \(message.body)"

            if containsAssignmentKeywords(text) {
                assignments.append("""
                From: \(message.from)
                Subject: \(message.subject)
                Date: \(message.receivedDate)
                ---
                \(message.snippet)
                """)
            }
        }

        logger.info("Extracted \(assignments.count) assignments from \(messages.count) messages")
        return assignments
    }

    /// Check if text contains assignment-related keywords
    private func containsAssignmentKeywords(_ text: String) -> Bool {
        let lowercased = text.lowercased()
        let keywords = ["compiti", "homework", "assignment", "esercizi", "verifica", "test", "consegna"]
        return keywords.contains(where: { lowercased.contains($0) })
    }
}

// MARK: - Gmail Errors

enum GmailError: LocalizedError {
    case notAuthenticated
    case invalidURL
    case invalidResponse
    case apiError(Int)
    case noModelContext
    case parsingFailed

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated with Gmail"
        case .invalidURL:
            return "Invalid Gmail API URL"
        case .invalidResponse:
            return "Invalid response from Gmail API"
        case .apiError(let code):
            return "Gmail API error: \(code)"
        case .noModelContext:
            return "No SwiftData model context configured"
        case .parsingFailed:
            return "Failed to parse Gmail message"
        }
    }
}

// MARK: - Gmail Message Model
// Note: MBGmailMessage is now defined in MirrorBuddy/Core/Models/MBGmailMessage.swift
