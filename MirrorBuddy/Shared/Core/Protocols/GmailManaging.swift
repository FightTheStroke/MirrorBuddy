import Foundation
import SwiftData

/// Protocol for cross-platform Gmail service management
@MainActor
protocol GmailManaging: AnyObject {
    // MARK: - Configuration

    /// Configure the service with SwiftData context
    func configure(modelContext: ModelContext)

    // MARK: - Email Sync

    /// Sync emails from Gmail
    func syncEmails(fromTeachersOnly: Bool) async throws -> [MBGmailMessage]

    /// Fetch stored messages from local database
    func fetchStoredMessages() throws -> [MBGmailMessage]

    /// Extract assignments from stored messages
    func extractAssignments() async throws -> [String]

    // MARK: - Background Sync (Platform-specific implementation)

    /// Start automatic background synchronization
    /// - Parameter interval: Sync interval in seconds (nil uses platform default)
    func startBackgroundSync(interval: TimeInterval?) async

    /// Stop automatic background synchronization
    func stopBackgroundSync()

    /// Perform immediate background sync
    func performBackgroundSync() async
}

/// Extension providing default implementations
extension GmailManaging {
    func syncEmails() async throws -> [MBGmailMessage] {
        try await syncEmails(fromTeachersOnly: true)
    }

    func startBackgroundSync() async {
        await startBackgroundSync(interval: nil)
    }
}
