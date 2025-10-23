import Foundation
import SwiftData

// Platform-specific type alias for calendar events
#if os(macOS)
typealias GCalendarEvent = GoogleCalendarEvent
#endif
// iOS already has GCalendarEvent as a struct in GoogleCalendarService.swift

/// Protocol for cross-platform Google Calendar service management
@MainActor
protocol GoogleCalendarManaging: AnyObject {
    // MARK: - Configuration

    /// Configure the service with SwiftData context
    func configure(modelContext: ModelContext)

    // MARK: - Calendar Sync

    /// Sync calendar events from Google Calendar
    func syncCalendarEvents() async throws -> [GCalendarEvent]

    /// Fetch all stored events from local database
    func fetchStoredEvents() throws -> [GCalendarEvent]

    /// Fetch upcoming events (next 7 days)
    func fetchUpcomingEvents() throws -> [GCalendarEvent]

    /// Extract assignment-related events
    func extractAssignmentEvents() throws -> [GCalendarEvent]

    // MARK: - Background Sync (Platform-specific implementation)

    /// Start automatic background synchronization
    /// - Parameter interval: Sync interval in seconds (nil uses platform default)
    func startBackgroundSync(interval: TimeInterval?)

    /// Stop automatic background synchronization
    func stopBackgroundSync()

    /// Perform immediate background sync
    func performBackgroundSync() async
}

/// Extension providing default implementations
extension GoogleCalendarManaging {
    func startBackgroundSync() {
        startBackgroundSync(interval: nil)
    }
}
