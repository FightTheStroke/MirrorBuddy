import Foundation

/// Protocol for cross-platform background task scheduling and execution
@MainActor
protocol BackgroundTaskManaging: AnyObject {
    // MARK: - Task Registration

    /// Register background task identifiers with the system
    func registerBackgroundTasks()

    /// Register refresh task handler
    func registerRefreshTask(handler: @escaping () async -> Void)

    /// Register processing task handler
    func registerProcessingTask(identifier: String, handler: @escaping () async -> Void)

    // MARK: - Task Scheduling

    /// Schedule background refresh
    func scheduleBackgroundRefresh(earliestBeginDate: Date?) throws

    /// Schedule background processing task
    func scheduleBackgroundProcessing(
        identifier: String,
        earliestBeginDate: Date?,
        requiresNetworkConnectivity: Bool,
        requiresExternalPower: Bool
    ) throws

    // MARK: - Task Execution

    /// Execute background sync
    func performBackgroundSync() async throws

    /// Cancel all pending background tasks
    func cancelAllPendingTasks()

    /// Get pending task requests
    func getPendingTaskRequests() async -> [String]
}

// MARK: - Supporting Types

enum BackgroundTaskError: LocalizedError {
    case notAuthorized
    case schedulingFailed(String)
    case executionFailed(String)
    case unsupportedOnPlatform

    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Background task authorization not granted"
        case .schedulingFailed(let message):
            return "Failed to schedule background task: \(message)"
        case .executionFailed(let message):
            return "Background task execution failed: \(message)"
        case .unsupportedOnPlatform:
            return "Background tasks not supported on this platform"
        }
    }
}
