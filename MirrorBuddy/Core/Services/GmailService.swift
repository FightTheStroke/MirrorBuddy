import BackgroundTasks
import Foundation
import os.log
import SwiftData

/// Gmail API integration for assignment extraction (Task 43)
@MainActor
final class GmailService {
    /// Shared singleton instance
    static let shared = GmailService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Gmail")

    // MARK: - Configuration (Subtask 43.1)

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

    // MARK: - Initialization

    private init() {}

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Gmail service configured")
    }

    // MARK: - Email Sync (Subtask 43.2)

    /// Fetch and sync emails
    func syncEmails(fromTeachersOnly: Bool = true) async throws -> [MBGmailMessage] {
        logger.info("Starting email sync")

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

    /// Build Gmail search query
    private func buildSearchQuery(fromTeachersOnly: Bool) -> String {
        var queryParts: [String] = []

        // Search for assignment-related keywords
        let keywords = [
            "compito", "compiti", "homework",
            "verifica", "test", "esame", "exam",
            "consegna", "deadline", "scadenza",
            "assignment", "progetto", "project"
        ]

        let keywordQuery = keywords.map { "(\($0))" }.joined(separator: " OR ")
        queryParts.append("{\(keywordQuery)}")

        // Filter by sender if needed
        if fromTeachersOnly {
            // Add common teacher email patterns
            queryParts.append("(from:@scuola OR from:@istituto OR from:prof OR from:teacher)")
        }

        // Only unread messages in the last 30 days
        queryParts.append("is:unread newer_than:30d")

        return queryParts.joined(separator: " ")
    }

    /// Fetch list of message IDs
    private func fetchMessageList(
        accessToken: String,
        query: String
    ) async throws -> [String] {
        guard var components = URLComponents(string: "\(baseURL)/users/me/messages") else {
            throw GmailError.invalidURL
        }

        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "maxResults", value: "100")
        ]

        guard let url = components.url else {
            throw GmailError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GmailError.apiError("Failed to fetch message list")
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let messageList = try decoder.decode(MBGmailMessageListResponse.self, from: data)
        return messageList.messages?.map { $0.id } ?? []
    }

    /// Fetch full message details
    private func fetchMessage(
        messageID: String,
        accessToken: String
    ) async throws -> MBGmailMessage {
        guard let url = URL(string: "\(baseURL)/users/me/messages/\(messageID)?format=full") else {
            throw GmailError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GmailError.apiError("Failed to fetch message")
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let apiMessage = try decoder.decode(GmailAPIMessage.self, from: data)

        // Parse message to extract relevant fields
        return parseMessage(apiMessage)
    }

    /// Parse Gmail API message
    private func parseMessage(_ apiMessage: GmailAPIMessage) -> MBGmailMessage {
        let headers = apiMessage.payload.headers

        let from = headers.first { $0.name.lowercased() == "from" }?.value ?? ""
        let subject = headers.first { $0.name.lowercased() == "subject" }?.value ?? ""
        let date = headers.first { $0.name.lowercased() == "date" }?.value ?? ""

        // Extract body text
        let body = extractBody(from: apiMessage.payload)

        // Parse date
        let receivedDate = parseEmailDate(date) ?? Date()

        return MBGmailMessage(
            id: apiMessage.id,
            threadID: apiMessage.threadId,
            from: from,
            subject: subject,
            body: body,
            receivedDate: receivedDate,
            isRead: !apiMessage.labelIds.contains("UNREAD"),
            lastSyncedAt: Date()
        )
    }

    /// Extract body text from message payload
    private func extractBody(from payload: MBMBGmailMessagePayload) -> String {
        // Try to get plain text body
        if let plainTextPart = findPart(payload: payload, mimeType: "text/plain") {
            if let bodyData = plainTextPart.body.data,
               let decodedData = Data(base64URLEncoded: bodyData),
               let text = String(data: decodedData, encoding: .utf8) {
                return text
            }
        }

        // Fallback to HTML body
        if let htmlPart = findPart(payload: payload, mimeType: "text/html") {
            if let bodyData = htmlPart.body.data,
               let decodedData = Data(base64URLEncoded: bodyData),
               let html = String(data: decodedData, encoding: .utf8) {
                return stripHTML(html)
            }
        }

        // If no body found, try snippet
        return ""
    }

    /// Find message part by MIME type
    private func findPart(payload: MBMBGmailMessagePayload, mimeType: String) -> MBGmailMessagePart? {
        if payload.mimeType == mimeType {
            return payload
        }

        if let parts = payload.parts {
            for part in parts {
                if let found = findPart(payload: part, mimeType: mimeType) {
                    return found
                }
            }
        }

        return nil
    }

    /// Strip HTML tags from text
    private func stripHTML(_ html: String) -> String {
        var result = html
        result = result.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: "&nbsp;", with: " ")
        result = result.replacingOccurrences(of: "&lt;", with: "<")
        result = result.replacingOccurrences(of: "&gt;", with: ">")
        result = result.replacingOccurrences(of: "&amp;", with: "&")
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Parse email date string
    private func parseEmailDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, d MMM yyyy HH:mm:ss Z"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: dateString)
    }

    // MARK: - Assignment Extraction (Subtask 43.2)

    /// Extract assignments from emails
    func extractAssignments(from messages: [MBGmailMessage]) -> [GmailAssignment] {
        logger.info("Extracting assignments from \(messages.count) messages")

        var assignments: [GmailAssignment] = []

        for message in messages {
            // Check if message contains assignment
            guard isAssignmentEmail(message) else { continue }

            // Extract assignment details
            if let assignment = parseAssignment(from: message) {
                assignments.append(assignment)
            }
        }

        logger.info("Extracted \(assignments.count) assignments")
        return assignments
    }

    /// Determine if email is an assignment
    private func isAssignmentEmail(_ message: MBGmailMessage) -> Bool {
        let text = "\(message.subject) \(message.body)".lowercased()

        let assignmentKeywords = [
            "compito", "compiti", "homework",
            "verifica", "test", "esame", "exam",
            "consegna", "deadline", "scadenza",
            "assignment", "progetto", "project"
        ]

        return assignmentKeywords.contains { keyword in
            text.contains(keyword)
        }
    }

    /// Parse assignment from email
    private func parseAssignment(from message: MBGmailMessage) -> GmailAssignment? {
        // Extract title (use subject or first line)
        let title = message.subject.isEmpty ? extractFirstLine(message.body) : message.subject

        // Extract description
        let description = extractDescription(from: message.body)

        // Extract due date
        let dueDate = extractDueDate(from: message.body) ?? Calendar.current.date(byAdding: .day, value: 7, to: Date())!

        // Infer subject
        let subject = inferSubject(from: message)

        return GmailAssignment(
            messageID: message.id,
            title: title,
            description: description,
            dueDate: dueDate,
            subject: subject,
            senderEmail: message.from
        )
    }

    /// Extract first line from text
    private func extractFirstLine(_ text: String) -> String {
        text.components(separatedBy: .newlines).first?.trimmingCharacters(in: .whitespaces) ?? text
    }

    /// Extract description from email body
    private func extractDescription(from body: String) -> String {
        // Take first 500 characters
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        return String(trimmed.prefix(500))
    }

    /// Extract due date from email text
    private func extractDueDate(from text: String) -> Date? {
        // Common Italian date patterns
        let patterns = [
            // "entro il 15/03/2025"
            "entro il (\\d{1,2})/(\\d{1,2})/(\\d{4})",
            // "scadenza: 15-03-2025"
            "scadenza[:\\s]+(\\d{1,2})-(\\d{1,2})-(\\d{4})",
            // "consegna 15 marzo"
            "consegna[\\s]+(\\d{1,2})\\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)",
            // "deadline: March 15"
            "deadline[:\\s]+(\\w+)\\s+(\\d{1,2})"
        ]

        for pattern in patterns {
            if let date = extractDateWithPattern(pattern, from: text) {
                return date
            }
        }

        return nil
    }

    /// Extract date using regex pattern
    private func extractDateWithPattern(_ pattern: String, from text: String) -> Date? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else {
            return nil
        }

        let nsText = text as NSString
        let matches = regex.matches(in: text, range: NSRange(location: 0, length: nsText.length))

        guard let match = matches.first else { return nil }

        let calendar = Calendar.current
        var components = DateComponents()
        components.year = calendar.component(.year, from: Date())

        // Extract components based on capture groups
        if match.numberOfRanges >= 3 {
            if let dayRange = Range(match.range(at: 1), in: text),
               let monthRange = Range(match.range(at: 2), in: text) {
                components.day = Int(text[dayRange])
                components.month = Int(text[monthRange])

                if match.numberOfRanges >= 4,
                   let yearRange = Range(match.range(at: 3), in: text) {
                    components.year = Int(text[yearRange])
                }
            }
        }

        return calendar.date(from: components)
    }

    /// Infer subject from email
    private func inferSubject(from message: MBGmailMessage) -> Subject? {
        let text = "\(message.subject) \(message.body)".lowercased()

        if text.contains("matematica") || text.contains("math") {
            return .matematica
        } else if text.contains("fisica") || text.contains("physics") {
            return .fisica
        } else if text.contains("scienze") || text.contains("biologia") || text.contains("chimica") {
            return .scienzeNaturali
        } else if text.contains("storia") || text.contains("geografia") {
            return .storiaGeografia
        } else if text.contains("italiano") || text.contains("letteratura") {
            return .italiano
        } else if text.contains("inglese") || text.contains("english") {
            return .inglese
        }

        return nil
    }

    // MARK: - Task Sync (Subtask 43.3)

    /// Create or update Task objects from assignments
    func syncAssignmentsToTasks(_ assignments: [GmailAssignment]) async throws {
        guard let context = modelContext else {
            logger.warning("No model context available")
            return
        }

        for assignment in assignments {
            // Check if task already exists
            let sourceID = assignment.messageID
            let sourceType = TaskSourceType.gmail.rawValue

            let descriptor = FetchDescriptor<TaskModel>(
                predicate: #Predicate { task in
                    task.sourceID == sourceID &&
                        task.sourceType == sourceType
                }
            )

            let existingTasks = try context.fetch(descriptor)

            if let existingTask = existingTasks.first {
                // Update existing task
                updateTaskFromAssignment(existingTask, assignment: assignment)
                logger.debug("Updated existing task: \(assignment.title)")
            } else {
                // Create new task
                let newTask = createTaskFromAssignment(assignment)
                context.insert(newTask)
                logger.debug("Created new task: \(assignment.title)")
            }
        }

        try context.save()
        logger.info("Synced \(assignments.count) assignments to tasks")
    }

    /// Update task from assignment
    private func updateTaskFromAssignment(_ task: TaskModel, assignment: GmailAssignment) {
        task.title = assignment.title
        task.taskDescription = assignment.description
        task.dueDate = assignment.dueDate
        task.subjectRawValue = assignment.subject?.rawValue
        task.updatedAt = Date()
    }

    /// Create task from assignment
    private func createTaskFromAssignment(_ assignment: GmailAssignment) -> TaskModel {
        TaskModel(
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate,
            subject: assignment.subject,
            sourceType: TaskSourceType.gmail.rawValue,
            sourceID: assignment.messageID
        )
    }

    /// Mark email as read (Subtask 43.2)
    func markAsRead(messageID: String) async throws {
        guard let tokens = try await oauthService.getTokens() else {
            throw GmailError.notAuthenticated
        }

        let accessToken = tokens.accessToken
        guard let url = URL(string: "\(baseURL)/users/me/messages/\(messageID)/modify") else {
            throw GmailError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["removeLabelIds": ["UNREAD"]]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GmailError.apiError("Failed to mark message as read")
        }

        logger.debug("Marked message \(messageID) as read")
    }

    // MARK: - Storage

    /// Store messages in SwiftData
    private func storeMessages(_ messages: [MBGmailMessage]) throws {
        guard let context = modelContext else {
            logger.warning("No model context available for storing messages")
            return
        }

        for message in messages {
            let messageID = message.id

            let descriptor = FetchDescriptor<MBGmailMessageModel>(
                predicate: #Predicate { storedMessage in
                    storedMessage.id == messageID
                }
            )

            let existingMessages = try context.fetch(descriptor)

            if let existing = existingMessages.first {
                // Update existing message
                existing.subject = message.subject
                existing.body = message.body
                existing.isRead = message.isRead
                existing.lastSyncedAt = message.lastSyncedAt
            } else {
                // Insert new message
                let model = MBGmailMessageModel(
                    id: message.id,
                    threadID: message.threadID,
                    from: message.from,
                    subject: message.subject,
                    body: message.body,
                    receivedDate: message.receivedDate,
                    isRead: message.isRead,
                    lastSyncedAt: message.lastSyncedAt
                )
                context.insert(model)
            }
        }

        try context.save()
    }

    // MARK: - Background Sync (Subtask 43.4)

    /// Register background task for email sync
    func registerBackgroundTasks() {
        let identifier = "com.mirrorbuddy.gmail.refresh"

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: identifier,
            using: nil
        ) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            self.handleBackgroundSync(task: refreshTask)
        }

        logger.info("Registered background task: \(identifier)")
    }

    /// Schedule next background sync
    func scheduleBackgroundSync() {
        let identifier = "com.mirrorbuddy.gmail.refresh"

        let request = BGAppRefreshTaskRequest(identifier: identifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 1_800) // 30 minutes

        do {
            try BGTaskScheduler.shared.submit(request)
            logger.info("Scheduled background sync")
        } catch {
            logger.error("Failed to schedule background sync: \(error.localizedDescription)")
        }
    }

    /// Handle background sync task
    private func handleBackgroundSync(task: BGAppRefreshTask) {
        logger.info("Starting background email sync")

        let syncTask = _Concurrency.Task {
            do {
                let messages = try await syncEmails()
                let assignments = extractAssignments(from: messages)
                try await syncAssignmentsToTasks(assignments)

                // Mark processed emails as read
                for assignment in assignments {
                    try? await markAsRead(messageID: assignment.messageID)
                }

                task.setTaskCompleted(success: true)
                logger.info("Background sync completed successfully")
            } catch {
                logger.error("Background sync failed: \(error.localizedDescription)")
                task.setTaskCompleted(success: false)
            }

            // Schedule next sync
            scheduleBackgroundSync()
        }

        task.expirationHandler = {
            syncTask.cancel()
            self.logger.warning("Background sync expired")
        }
    }

    // MARK: - Public API

    /// Perform full email sync with assignment extraction
    func performFullSync() async throws {
        let messages = try await syncEmails()
        let assignments = extractAssignments(from: messages)
        try await syncAssignmentsToTasks(assignments)

        // Mark processed emails as read
        for assignment in assignments {
            try? await markAsRead(messageID: assignment.messageID)
        }

        logger.info("Full sync completed")
    }

    /// Get last sync date
    func getLastSyncDate() -> Date? {
        lastSyncDate ?? UserDefaults.standard.object(forKey: "Gmail.LastSyncDate") as? Date
    }
}

// MARK: - Models

/// Gmail message
struct MBGmailMessage {
    let id: String
    let threadID: String
    let from: String
    let subject: String
    let body: String
    let receivedDate: Date
    let isRead: Bool
    let lastSyncedAt: Date
}

/// Assignment extracted from Gmail
struct GmailAssignment {
    let messageID: String
    let title: String
    let description: String
    let dueDate: Date
    let subject: Subject?
    let senderEmail: String
}

// MARK: - SwiftData Models

/// SwiftData model for Gmail messages
@Model
final class MBGmailMessageModel {
    var id: String
    var threadID: String
    var from: String
    var subject: String
    var body: String
    var receivedDate: Date
    var isRead: Bool
    var lastSyncedAt: Date

    init(
        id: String,
        threadID: String,
        from: String,
        subject: String,
        body: String,
        receivedDate: Date,
        isRead: Bool,
        lastSyncedAt: Date
    ) {
        self.id = id
        self.threadID = threadID
        self.from = from
        self.subject = subject
        self.body = body
        self.receivedDate = receivedDate
        self.isRead = isRead
        self.lastSyncedAt = lastSyncedAt
    }
}

// MARK: - API Response Models

/// Gmail message list response
struct MBGmailMessageListResponse: Codable {
    let messages: [MBGmailMessageReference]?
    let resultSizeEstimate: Int?
}

/// Gmail message reference
struct MBGmailMessageReference: Codable {
    let id: String
    let threadId: String
}

/// Gmail API message
struct GmailAPIMessage: Codable {
    let id: String
    let threadId: String
    let labelIds: [String]
    let snippet: String
    let payload: MBMBGmailMessagePayload
}

/// Gmail message payload
struct MBMBGmailMessagePayload: Codable {
    let mimeType: String
    let headers: [MBGmailHeader]
    let body: MBMBGmailMessageBody
    let parts: [MBGmailMessagePart]?
}

/// Gmail message part (recursive)
typealias MBGmailMessagePart = MBMBGmailMessagePayload

/// Gmail message header
struct MBGmailHeader: Codable {
    let name: String
    let value: String
}

/// Gmail message body
struct MBMBGmailMessageBody: Codable {
    let data: String?
    let size: Int
}

// MARK: - Errors (Subtask 43.4)

enum GmailError: LocalizedError {
    case notAuthenticated
    case apiError(String)
    case invalidURL
    case noMessagesFound
    case syncFailed(String)
    case parsingError(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated with Gmail"
        case .apiError(let message):
            return "Gmail API error: \(message)"
        case .invalidURL:
            return "Invalid Gmail URL"
        case .noMessagesFound:
            return "No Gmail messages found"
        case .syncFailed(let message):
            return "Gmail sync failed: \(message)"
        case .parsingError(let message):
            return "Failed to parse email: \(message)"
        }
    }
}

// MARK: - Base64 URL Decoding Extension

extension Data {
    init?(base64URLEncoded string: String) {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        self.init(base64Encoded: base64)
    }
}
