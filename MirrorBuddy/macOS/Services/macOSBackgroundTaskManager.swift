import Foundation
import os.log

/// macOS-native background task manager
/// Note: macOS doesn't have BGTaskScheduler like iOS, so this uses alternative approaches
@MainActor
final class macOSBackgroundTaskManager: BackgroundTaskManaging {
    static let shared = macOSBackgroundTaskManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "BackgroundTasks-macOS")

    // MARK: - Task State

    private var registeredTasks: [String: () async -> Void] = [:]
    private var refreshHandler: (() async -> Void)?
    private var scheduledTimers: [String: Timer] = [:]

    // MARK: - Initialization

    private init() {}

    // MARK: - Task Registration

    func registerBackgroundTasks() {
        // macOS doesn't require explicit task registration like iOS
        logger.info("Background tasks registration (macOS - using timers)")
    }

    func registerRefreshTask(handler: @escaping () async -> Void) {
        refreshHandler = handler
        logger.info("Refresh task handler registered")
    }

    func registerProcessingTask(identifier: String, handler: @escaping () async -> Void) {
        registeredTasks[identifier] = handler
        logger.info("Processing task registered: \(identifier)")
    }

    // MARK: - Task Scheduling

    func scheduleBackgroundRefresh(earliestBeginDate: Date?) throws {
        // macOS: Use timer-based scheduling instead of BGTaskScheduler
        let timeInterval = earliestBeginDate?.timeIntervalSinceNow ?? 3600 // Default 1 hour

        guard timeInterval > 0 else {
            // Execute immediately
            if let handler = refreshHandler {
                _Concurrency.Task {
                    await handler()
                }
            }
            return
        }

        // Schedule timer
        let timer = Timer.scheduledTimer(withTimeInterval: timeInterval, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self, let handler = self.refreshHandler else { return }
                await handler()
            }
        }

        scheduledTimers["refresh"] = timer
        logger.info("Background refresh scheduled for \(timeInterval) seconds from now")
    }

    func scheduleBackgroundProcessing(
        identifier: String,
        earliestBeginDate: Date?,
        requiresNetworkConnectivity: Bool,
        requiresExternalPower: Bool
    ) throws {
        guard let handler = registeredTasks[identifier] else {
            throw BackgroundTaskError.schedulingFailed("No handler registered for \(identifier)")
        }

        let timeInterval = earliestBeginDate?.timeIntervalSinceNow ?? 3600

        guard timeInterval > 0 else {
            // Execute immediately
            _Concurrency.Task {
                await handler()
            }
            return
        }

        // macOS: Network and power requirements are advisory only
        if requiresNetworkConnectivity {
            logger.info("Task \(identifier) requires network connectivity (advisory)")
        }
        if requiresExternalPower {
            logger.info("Task \(identifier) requires external power (advisory)")
        }

        // Schedule timer
        let timer = Timer.scheduledTimer(withTimeInterval: timeInterval, repeats: false) { _ in
            _Concurrency.Task {
                await handler()
            }
        }

        scheduledTimers[identifier] = timer
        logger.info("Background processing task '\(identifier)' scheduled for \(timeInterval) seconds from now")
    }

    // MARK: - Task Execution

    func performBackgroundSync() async throws {
        logger.info("Performing background sync (macOS)")

        // Execute all registered tasks
        for (identifier, handler) in registeredTasks {
            logger.info("Executing background task: \(identifier)")
            await handler()
        }

        // Execute refresh handler if registered
        if let refreshHandler = refreshHandler {
            logger.info("Executing refresh task")
            await refreshHandler()
        }
    }

    func cancelAllPendingTasks() {
        // Cancel all scheduled timers
        for (identifier, timer) in scheduledTimers {
            timer.invalidate()
            logger.info("Cancelled task: \(identifier)")
        }

        scheduledTimers.removeAll()
        logger.info("All pending tasks cancelled")
    }

    func getPendingTaskRequests() async -> [String] {
        // Return identifiers of currently scheduled tasks
        Array(scheduledTimers.keys)
    }
}
