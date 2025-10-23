import Foundation
import os.log
import SwiftData

/// macOS-native Google Calendar API integration for assignment due dates
/// Uses Timer-based scheduling instead of BGTaskScheduler
@MainActor
final class macOSGoogleCalendarService {
    /// Shared singleton instance
    static let shared = macOSGoogleCalendarService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "GoogleCalendar-macOS")

    // MARK: - Configuration

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

    // MARK: - macOS-specific Scheduling

    private var syncTimer: Timer?
    private let defaultSyncInterval: TimeInterval = 3600 // 1 hour

    // MARK: - Initialization

    private init() {}

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Google Calendar service configured (macOS)")
    }

    // MARK: - Calendar Sync

    /// Fetch and sync calendar events
    func syncCalendarEvents() async throws -> [GCalendarEvent] {
        logger.info("Starting calendar sync (macOS)")

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

            // Rate limiting
            try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 0.1s
        }

        // Store in SwiftData
        try storeEvents(allEvents)

        // Update last sync date
        lastSyncDate = Date()
        UserDefaults.standard.set(lastSyncDate, forKey: "GoogleCalendar.LastSyncDate")

        logger.info("Calendar sync completed: \(allEvents.count) events")
        return allEvents
    }

    // MARK: - macOS Background Sync (Timer-based)

    /// Start automatic background sync
    func startBackgroundSync(interval: TimeInterval? = nil) {
        stopBackgroundSync()

        let syncInterval = interval ?? defaultSyncInterval

        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                do {
                    _ = try await self.syncCalendarEvents()
                    self.logger.info("Background calendar sync completed")
                } catch {
                    self.logger.error("Background calendar sync failed: \(error.localizedDescription)")
                }
            }
        }

        logger.info("Background calendar sync started with interval: \(syncInterval)s")
    }

    /// Stop automatic background sync
    func stopBackgroundSync() {
        syncTimer?.invalidate()
        syncTimer = nil
        logger.info("Background calendar sync stopped")
    }

    /// Perform immediate background sync
    func performBackgroundSync() async {
        do {
            _ = try await syncCalendarEvents()
            logger.info("Manual background calendar sync completed")
        } catch {
            logger.error("Manual background calendar sync failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Google Calendar API Methods

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

        struct CalendarListResponse: Codable {
            let items: [CalendarItem]

            struct CalendarItem: Codable {
                let id: String
                let summary: String
                let primary: Bool?
            }
        }

        let response = try decoder.decode(CalendarListResponse.self, from: data)

        return response.items.map { item in
            GoogleCalendar(
                id: item.id,
                summary: item.summary,
                isPrimary: item.primary ?? false
            )
        }
    }

    /// Fetch events from a specific calendar
    private func fetchEvents(
        calendarID: String,
        accessToken: String
    ) async throws -> [GCalendarEvent] {
        // Get time range (next 30 days)
        let now = Date()
        let thirtyDaysFromNow = Calendar.current.date(byAdding: .day, value: 30, to: now)!

        let formatter = ISO8601DateFormatter()
        let timeMin = formatter.string(from: now)
        let timeMax = formatter.string(from: thirtyDaysFromNow)

        let encodedCalendarID = calendarID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? calendarID
        let urlString = "\(baseURL)/calendars/\(encodedCalendarID)/events?timeMin=\(timeMin)&timeMax=\(timeMax)&singleEvents=true&orderBy=startTime"

        guard let url = URL(string: urlString) else {
            throw GoogleCalendarError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GoogleCalendarError.apiError("Failed to fetch events from calendar \(calendarID)")
        }

        return try parseCalendarEvents(data: data, calendarID: calendarID)
    }

    /// Parse calendar events from API response
    private func parseCalendarEvents(data: Data, calendarID: String) throws -> [GCalendarEvent] {
        struct EventsResponse: Codable {
            let items: [EventItem]?

            struct EventItem: Codable {
                let id: String
                let summary: String?
                let description: String?
                let start: EventDateTime
                let end: EventDateTime
                let location: String?

                struct EventDateTime: Codable {
                    let dateTime: String?
                    let date: String? // All-day events use date instead of dateTime
                }
            }
        }

        let decoder = JSONDecoder()
        let response = try decoder.decode(EventsResponse.self, from: data)

        guard let items = response.items else {
            return []
        }

        let formatter = ISO8601DateFormatter()
        let dateOnlyFormatter = DateFormatter()
        dateOnlyFormatter.dateFormat = "yyyy-MM-dd"

        var events: [GCalendarEvent] = []

        for item in items {
            // Parse start date
            let startDate: Date
            if let dateTimeString = item.start.dateTime {
                startDate = formatter.date(from: dateTimeString) ?? Date()
            } else if let dateString = item.start.date {
                startDate = dateOnlyFormatter.date(from: dateString) ?? Date()
            } else {
                continue // Skip invalid events
            }

            // Parse end date
            let endDate: Date
            if let dateTimeString = item.end.dateTime {
                endDate = formatter.date(from: dateTimeString) ?? startDate
            } else if let dateString = item.end.date {
                endDate = dateOnlyFormatter.date(from: dateString) ?? startDate
            } else {
                endDate = startDate
            }

            let event = GCalendarEvent(
                id: item.id,
                calendarID: calendarID,
                summary: item.summary ?? "Untitled Event",
                description: item.description,
                location: item.location,
                startDate: startDate,
                endDate: endDate,
                isAllDay: item.start.date != nil
            )

            events.append(event)
        }

        return events
    }

    // MARK: - SwiftData Storage

    /// Store events in SwiftData
    private func storeEvents(_ events: [GCalendarEvent]) throws {
        guard let context = modelContext else {
            throw GoogleCalendarError.noModelContext
        }

        for event in events {
            context.insert(event)
        }

        try context.save()
        logger.debug("Stored \(events.count) events in SwiftData")
    }

    /// Fetch all stored events
    func fetchStoredEvents() throws -> [GCalendarEvent] {
        guard let context = modelContext else {
            throw GoogleCalendarError.noModelContext
        }

        let descriptor = FetchDescriptor<GCalendarEvent>(
            sortBy: [SortDescriptor(\.startDate, order: .forward)]
        )

        return try context.fetch(descriptor)
    }

    /// Fetch upcoming events (next 7 days)
    func fetchUpcomingEvents() throws -> [GCalendarEvent] {
        guard let context = modelContext else {
            throw GoogleCalendarError.noModelContext
        }

        let now = Date()
        let sevenDaysFromNow = Calendar.current.date(byAdding: .day, value: 7, to: now)!

        let descriptor = FetchDescriptor<GCalendarEvent>(
            predicate: #Predicate { event in
                event.startDate >= now && event.startDate <= sevenDaysFromNow
            },
            sortBy: [SortDescriptor(\.startDate, order: .forward)]
        )

        return try context.fetch(descriptor)
    }

    /// Extract assignment-related events
    func extractAssignmentEvents() throws -> [GCalendarEvent] {
        let allEvents = try fetchStoredEvents()

        return allEvents.filter { event in
            let text = "\(event.summary) \(event.description ?? "")".lowercased()
            let keywords = ["compiti", "homework", "assignment", "esercizi", "verifica", "test", "consegna", "scadenza"]
            return keywords.contains(where: { text.contains($0) })
        }
    }
}

// MARK: - Google Calendar Errors

enum GoogleCalendarError: LocalizedError {
    case notAuthenticated
    case invalidURL
    case apiError(String)
    case noModelContext
    case parsingFailed

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated with Google Calendar"
        case .invalidURL:
            return "Invalid Google Calendar API URL"
        case .apiError(let message):
            return "Google Calendar API error: \(message)"
        case .noModelContext:
            return "No SwiftData model context configured"
        case .parsingFailed:
            return "Failed to parse calendar events"
        }
    }
}

// MARK: - Supporting Models

struct GoogleCalendar {
    let id: String
    let summary: String
    let isPrimary: Bool
}

@Model
final class GCalendarEvent {
    @Attribute(.unique) var id: String
    var calendarID: String
    var summary: String
    var eventDescription: String?
    var location: String?
    var startDate: Date
    var endDate: Date
    var isAllDay: Bool

    init(
        id: String,
        calendarID: String,
        summary: String,
        description: String?,
        location: String?,
        startDate: Date,
        endDate: Date,
        isAllDay: Bool
    ) {
        self.id = id
        self.calendarID = calendarID
        self.summary = summary
        self.eventDescription = description
        self.location = location
        self.startDate = startDate
        self.endDate = endDate
        self.isAllDay = isAllDay
    }
}
