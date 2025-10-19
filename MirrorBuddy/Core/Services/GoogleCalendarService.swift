import BackgroundTasks
import Foundation
import os.log
import SwiftData

/// Google Calendar API integration for assignment due dates (Task 42)
@MainActor
final class GoogleCalendarService {
    /// Shared singleton instance
    static let shared = GoogleCalendarService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "GoogleCalendar")

    // MARK: - Configuration (Subtask 42.1)

    /// Calendar API base URL
    private let baseURL = "https://www.googleapis.com/calendar/v3"

    /// OAuth service for authentication
    private let oauthService = GoogleOAuthService.shared

    /// Required calendar scopes
    static let calendarScopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events.readonly"
    ]

    // MARK: - Dependencies

    private var modelContext: ModelContext?
    private var lastSyncDate: Date?

    // MARK: - Initialization

    private init() {}

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Google Calendar service configured")
    }

    // MARK: - Calendar Sync (Subtask 42.2)

    /// Fetch and sync calendar events
    func syncCalendarEvents() async throws -> [GCalendarEvent] {
        logger.info("Starting calendar sync")

        // Ensure authentication
        guard let tokens = try await oauthService.getTokens() else {
            throw GoogleCalendarError.notAuthenticated
        }

        let accessToken = tokens.accessToken

        // Fetch calendar list
        let calendars = try await fetchCalendarList(accessToken: accessToken)
        logger.debug("Found \(calendars.count) calendars")

        // Fetch events from all calendars
        var allEvents: [GCalendarEvent] = []

        for calendar in calendars {
            let events = try await fetchEvents(
                calendarID: calendar.id,
                accessToken: accessToken
            )
            allEvents.append(contentsOf: events)
            logger.debug("Fetched \(events.count) events from calendar: \(calendar.summary)")
        }

        // Store in SwiftData
        try storeEvents(allEvents)

        // Update last sync date
        lastSyncDate = Date()
        UserDefaults.standard.set(lastSyncDate, forKey: "GoogleCalendar.LastSyncDate")

        logger.info("Calendar sync completed: \(allEvents.count) events")
        return allEvents
    }

    /// Fetch list of calendars
    private func fetchCalendarList(accessToken: String) async throws -> [GoogleCalendar] {
        guard let url = URL(string: "\(baseURL)/users/me/calendarList") else {
            throw GoogleCalendarError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GoogleCalendarError.apiError("Failed to fetch calendar list")
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let calendarList = try decoder.decode(CalendarListResponse.self, from: data)
        return calendarList.items
    }

    /// Fetch events from a specific calendar
    private func fetchEvents(
        calendarID: String,
        accessToken: String,
        timeMin: Date? = nil,
        timeMax: Date? = nil
    ) async throws -> [GCalendarEvent] {
        // Default time range: 1 month ago to 6 months ahead
        let startDate = timeMin ?? Calendar.current.date(byAdding: .month, value: -1, to: Date())!
        let endDate = timeMax ?? Calendar.current.date(byAdding: .month, value: 6, to: Date())!

        let iso8601Formatter = ISO8601DateFormatter()
        let timeMinString = iso8601Formatter.string(from: startDate)
        let timeMaxString = iso8601Formatter.string(from: endDate)

        guard var components = URLComponents(string: "\(baseURL)/calendars/\(calendarID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? calendarID)/events") else {
            throw GoogleCalendarError.invalidURL
        }

        components.queryItems = [
            URLQueryItem(name: "timeMin", value: timeMinString),
            URLQueryItem(name: "timeMax", value: timeMaxString),
            URLQueryItem(name: "singleEvents", value: "true"),
            URLQueryItem(name: "orderBy", value: "startTime"),
            URLQueryItem(name: "maxResults", value: "250")
        ]

        guard let url = components.url else {
            throw GoogleCalendarError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GoogleCalendarError.apiError("Failed to fetch calendar events")
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        let eventsResponse = try decoder.decode(GCalendarEventsResponse.self, from: data)
        return eventsResponse.items.map { event in
            GCalendarEvent(
                id: event.id,
                calendarID: calendarID,
                summary: event.summary,
                description: event.description,
                startDate: event.start.dateTime ?? event.start.date ?? Date(),
                endDate: event.end.dateTime ?? event.end.date ?? Date(),
                isAllDay: event.start.date != nil,
                location: event.location,
                htmlLink: event.htmlLink,
                lastSyncedAt: Date()
            )
        }
    }

    // MARK: - Assignment Extraction (Subtask 42.3)

    /// Extract assignment due dates from calendar events
    func extractAssignments(from events: [GCalendarEvent]) -> [Assignment] {
        logger.info("Extracting assignments from \(events.count) events")

        var assignments: [Assignment] = []

        for event in events {
            // Check if event looks like an assignment
            guard isAssignmentEvent(event) else { continue }

            let assignment = Assignment(
                title: event.summary,
                description: event.description ?? "",
                dueDate: event.endDate,
                subject: inferSubject(from: event),
                sourceType: .googleCalendar,
                sourceID: event.id,
                calendarID: event.calendarID
            )

            assignments.append(assignment)
        }

        logger.info("Extracted \(assignments.count) assignments")
        return assignments
    }

    /// Determine if an event is an assignment
    private func isAssignmentEvent(_ event: GCalendarEvent) -> Bool {
        let assignmentKeywords = [
            "assignment", "homework", "compiti", "verifica", "test",
            "esame", "exam", "quiz", "project", "progetto", "consegna",
            "due", "scadenza", "deadline"
        ]

        let summary = event.summary.lowercased()
        let description = (event.description ?? "").lowercased()

        return assignmentKeywords.contains { keyword in
            summary.contains(keyword) || description.contains(keyword)
        }
    }

    /// Infer subject from event details
    private func inferSubject(from event: GCalendarEvent) -> Subject? {
        let text = "\(event.summary) \(event.description ?? "")".lowercased()

        // Check for Italian subject keywords
        if text.contains("matematica") || text.contains("math") {
            return .matematica
        } else if text.contains("fisica") || text.contains("physics") {
            return .fisica
        } else if text.contains("scienze") || text.contains("science") || text.contains("biologia") || text.contains("chimica") {
            return .scienzeNaturali
        } else if text.contains("storia") || text.contains("geografia") || text.contains("history") {
            return .storiaGeografia
        } else if text.contains("italiano") || text.contains("letteratura") {
            return .italiano
        } else if text.contains("inglese") || text.contains("english") {
            return .inglese
        } else if text.contains("religione") {
            return .religione
        } else if text.contains("motorie") || text.contains("sport") || text.contains("educazione fisica") {
            return .scienzeMotorie
        } else if text.contains("civica") || text.contains("cittadinanza") {
            return .educazioneCivica
        }

        return nil
    }

    /// Create or update Task objects from assignments (Subtask 42.3)
    func syncAssignmentsToTasks(_ assignments: [Assignment]) async throws {
        guard let context = modelContext else {
            logger.warning("No model context available")
            return
        }

        for assignment in assignments {
            // Check if task already exists
            let sourceID = assignment.sourceID
            let sourceType = assignment.sourceType.rawValue

            let descriptor = FetchDescriptor<TaskModel>(
                predicate: #Predicate { task in
                    task.sourceID == sourceID &&
                    task.sourceType == sourceType
                }
            )

            let existingTasks = try context.fetch(descriptor)

            if let existingTask = existingTasks.first {
                // Update existing task
                updateTask(existingTask, with: assignment)
                logger.debug("Updated existing task: \(assignment.title)")
            } else {
                // Create new task
                let newTask = createTask(from: assignment)
                context.insert(newTask)
                logger.debug("Created new task: \(assignment.title)")
            }
        }

        try context.save()
        logger.info("Synced \(assignments.count) assignments to tasks")
    }

    /// Update existing task with assignment data
    private func updateTask(_ task: TaskModel, with assignment: Assignment) {
        task.title = assignment.title
        task.taskDescription = assignment.description
        task.dueDate = assignment.dueDate
        task.subjectRawValue = assignment.subject?.rawValue
        task.updatedAt = Date()
    }

    /// Create new task from assignment
    private func createTask(from assignment: Assignment) -> TaskModel {
        TaskModel(
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate,
            subject: assignment.subject,
            sourceType: assignment.sourceType.rawValue,
            sourceID: assignment.sourceID
        )
    }

    // MARK: - Storage

    /// Store calendar events in SwiftData
    private func storeEvents(_ events: [GCalendarEvent]) throws {
        guard let context = modelContext else {
            logger.warning("No model context available for storing events")
            return
        }

        for event in events {
            // Check if event already exists
            let eventID = event.id

            let descriptor = FetchDescriptor<GCalendarEventModel>(
                predicate: #Predicate { storedEvent in
                    storedEvent.id == eventID
                }
            )

            let existingEvents = try context.fetch(descriptor)

            if let existing = existingEvents.first {
                // Update existing event
                existing.summary = event.summary
                existing.eventDescription = event.description
                existing.startDate = event.startDate
                existing.endDate = event.endDate
                existing.lastSyncedAt = event.lastSyncedAt
            } else {
                // Insert new event
                let model = GCalendarEventModel(
                    id: event.id,
                    calendarID: event.calendarID,
                    summary: event.summary,
                    description: event.description,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    isAllDay: event.isAllDay,
                    location: event.location,
                    htmlLink: event.htmlLink,
                    lastSyncedAt: event.lastSyncedAt
                )
                context.insert(model)
            }
        }

        try context.save()
    }

    // MARK: - Background Sync (Subtask 42.4)

    /// Register background task for calendar sync
    func registerBackgroundTasks() {
        let identifier = "com.mirrorbuddy.calendar.refresh"

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
        let identifier = "com.mirrorbuddy.calendar.refresh"

        let request = BGAppRefreshTaskRequest(identifier: identifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 3_600) // 1 hour

        do {
            try BGTaskScheduler.shared.submit(request)
            logger.info("Scheduled background sync")
        } catch {
            logger.error("Failed to schedule background sync: \(error.localizedDescription)")
        }
    }

    /// Handle background sync task
    private func handleBackgroundSync(task: BGAppRefreshTask) {
        logger.info("Starting background calendar sync")

        let syncTask = _Concurrency.Task {
            do {
                let events = try await syncCalendarEvents()
                let assignments = extractAssignments(from: events)
                try await syncAssignmentsToTasks(assignments)

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

    /// Perform full calendar sync with assignment extraction
    func performFullSync() async throws {
        let events = try await syncCalendarEvents()
        let assignments = extractAssignments(from: events)
        try await syncAssignmentsToTasks(assignments)

        logger.info("Full sync completed")
    }

    /// Get last sync date
    func getLastSyncDate() -> Date? {
        lastSyncDate ?? UserDefaults.standard.object(forKey: "GoogleCalendar.LastSyncDate") as? Date
    }
}

// MARK: - Models

/// Calendar event extracted from Google Calendar
struct GCalendarEvent {
    let id: String
    let calendarID: String
    let summary: String
    let description: String?
    let startDate: Date
    let endDate: Date
    let isAllDay: Bool
    let location: String?
    let htmlLink: String?
    let lastSyncedAt: Date
}

/// Assignment extracted from calendar event
struct Assignment {
    let title: String
    let description: String
    let dueDate: Date
    let subject: Subject?
    let sourceType: TaskSourceType
    let sourceID: String
    let calendarID: String?
}

/// Task source types
enum TaskSourceType: String, Codable {
    case googleCalendar = "google_calendar"
    case gmail = "gmail"
    case manual = "manual"
}

// MARK: - SwiftData Models (Subtask 42.3)

/// SwiftData model for calendar events
@Model
final class GCalendarEventModel {
    var id: String
    var calendarID: String
    var summary: String
    var eventDescription: String?
    var startDate: Date
    var endDate: Date
    var isAllDay: Bool
    var location: String?
    var htmlLink: String?
    var lastSyncedAt: Date

    init(
        id: String,
        calendarID: String,
        summary: String,
        description: String? = nil,
        startDate: Date,
        endDate: Date,
        isAllDay: Bool,
        location: String? = nil,
        htmlLink: String? = nil,
        lastSyncedAt: Date
    ) {
        self.id = id
        self.calendarID = calendarID
        self.summary = summary
        self.eventDescription = description
        self.startDate = startDate
        self.endDate = endDate
        self.isAllDay = isAllDay
        self.location = location
        self.htmlLink = htmlLink
        self.lastSyncedAt = lastSyncedAt
    }
}

/// SwiftData model for tasks
@Model
final class TaskModel {
    var id: UUID
    var title: String
    var taskDescription: String
    var dueDate: Date?
    var completedAt: Date?
    var subjectRawValue: String?
    var sourceType: String
    var sourceID: String?
    var createdAt: Date
    var updatedAt: Date

    var subject: Subject? {
        get {
            guard let raw = subjectRawValue else { return nil }
            return Subject(rawValue: raw)
        }
        set {
            subjectRawValue = newValue?.rawValue
        }
    }

    init(
        title: String,
        description: String,
        dueDate: Date? = nil,
        subject: Subject? = nil,
        sourceType: String = TaskSourceType.manual.rawValue,
        sourceID: String? = nil
    ) {
        self.id = UUID()
        self.title = title
        self.taskDescription = description
        self.dueDate = dueDate
        self.subjectRawValue = subject?.rawValue
        self.sourceType = sourceType
        self.sourceID = sourceID
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}

// MARK: - API Response Models

/// Calendar list response
struct CalendarListResponse: Codable {
    let items: [GoogleCalendar]
}

/// Google Calendar
struct GoogleCalendar: Codable {
    let id: String
    let summary: String
    let description: String?
    let primary: Bool?
}

/// Calendar events response
struct GCalendarEventsResponse: Codable {
    let items: [GoogleGCalendarEvent]
}

/// Google Calendar event
struct GoogleGCalendarEvent: Codable {
    let id: String
    let summary: String
    let description: String?
    let start: GEventDateTime
    let end: GEventDateTime
    let location: String?
    let htmlLink: String?
}

/// Event date/time
struct GEventDateTime: Codable {
    let dateTime: Date?
    let date: Date?

    enum CodingKeys: String, CodingKey {
        case dateTime
        case date
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Try to decode dateTime first
        if let dateTimeString = try? container.decode(String.self, forKey: .dateTime) {
            let formatter = ISO8601DateFormatter()
            dateTime = formatter.date(from: dateTimeString)
            date = nil
        } else if let dateString = try? container.decode(String.self, forKey: .date) {
            // Parse date-only format
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            date = formatter.date(from: dateString)
            dateTime = nil
        } else {
            dateTime = nil
            date = nil
        }
    }
}

// MARK: - Errors (Subtask 42.4)

enum GoogleCalendarError: LocalizedError {
    case notAuthenticated
    case apiError(String)
    case invalidURL
    case noEventsFound
    case syncFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated with Google Calendar"
        case .apiError(let message):
            return "Calendar API error: \(message)"
        case .invalidURL:
            return "Invalid calendar URL"
        case .noEventsFound:
            return "No calendar events found"
        case .syncFailed(let message):
            return "Calendar sync failed: \(message)"
        }
    }
}
