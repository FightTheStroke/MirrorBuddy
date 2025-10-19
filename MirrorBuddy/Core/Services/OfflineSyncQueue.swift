//
//  OfflineSyncQueue.swift
//  MirrorBuddy
//
//  Task 57: Offline Mode Functionality
//  Queue for managing actions that need to be synced when back online
//

import Foundation
import os.log
import SwiftData

/// Manages a queue of actions to be performed when the device comes back online
actor OfflineSyncQueue {
    /// Shared singleton instance
    static let shared = OfflineSyncQueue()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "OfflineSyncQueue")
    private let queueKey = "com.mirrorbuddy.offlineSyncQueue"

    private var pendingActions: [PendingAction] = []

    // MARK: - Initialization

    private init() {
        // Load from disk will be called lazily on first access
    }

    // MARK: - Action Management

    /// Add an action to the sync queue
    func enqueue(_ action: PendingAction) {
        if pendingActions.isEmpty {
            loadFromDiskSync()
        }
        pendingActions.append(action)
        saveToDisk()
        logger.info("Enqueued action: \(action.type.rawValue) [\(action.id)]")
    }

    /// Remove an action from the queue
    func dequeue(_ actionID: UUID) {
        pendingActions.removeAll { $0.id == actionID }
        saveToDisk()
        logger.debug("Dequeued action: \(actionID)")
    }

    /// Get all pending actions
    func getPendingActions() -> [PendingAction] {
        pendingActions
    }

    /// Get count of pending actions
    func getPendingCount() -> Int {
        pendingActions.count
    }

    /// Clear all pending actions
    func clearAll() {
        pendingActions.removeAll()
        saveToDisk()
        logger.info("Cleared all pending actions")
    }

    // MARK: - Sync Operations

    /// Sync all pending actions when online
    func syncAll() async throws {
        logger.info("Starting sync of \(self.pendingActions.count) pending actions")

        guard !pendingActions.isEmpty else {
            logger.debug("No pending actions to sync")
            return
        }

        var failedActions: [PendingAction] = []

        for action in pendingActions {
            do {
                try await process(action)
                logger.info("Successfully processed action: \(action.id)")
            } catch {
                logger.error("Failed to process action \(action.id): \(error.localizedDescription)")
                failedActions.append(action)
            }
        }

        // Keep only failed actions in the queue
        pendingActions = failedActions
        saveToDisk()

        if failedActions.isEmpty {
            logger.info("All actions synced successfully")
        } else {
            logger.warning("\(failedActions.count) actions failed to sync")
            throw OfflineSyncError.partialSyncFailure(failedCount: failedActions.count)
        }
    }

    // MARK: - Action Processing

    /// Process a single pending action
    private func process(_ action: PendingAction) async throws {
        switch action.type {
        case .materialImport:
            try await processMaterialImport(action)

        case .flashcardSync:
            try await processFlashcardSync(action)

        case .progressSync:
            try await processProgressSync(action)

        case .studySessionSync:
            try await processStudySessionSync(action)
        }
    }

    nonisolated private func processMaterialImport(_ action: PendingAction) async throws {
        // Decode material import data
        let importData: MaterialImportData
        do {
            importData = try JSONDecoder().decode(MaterialImportData.self, from: action.data)
        } catch {
            throw OfflineSyncError.invalidActionData
        }

        // Retry material import from Google Drive
        logger.debug("Retrying material import: \(importData.title)")
        // Implementation would integrate with GoogleDriveDownloadService
        // For now, we'll log the action
    }

    nonisolated private func processFlashcardSync(_ action: PendingAction) async throws {
        // Decode flashcard sync data
        let syncData: FlashcardSyncData
        do {
            syncData = try JSONDecoder().decode(FlashcardSyncData.self, from: action.data)
        } catch {
            throw OfflineSyncError.invalidActionData
        }

        logger.debug("Syncing flashcard reviews: \(syncData.flashcardIDs.count) cards")
        // Implementation would sync flashcard review data to cloud
    }

    nonisolated private func processProgressSync(_ action: PendingAction) async throws {
        // Decode progress sync data
        let progressData: ProgressSyncData
        do {
            progressData = try JSONDecoder().decode(ProgressSyncData.self, from: action.data)
        } catch {
            throw OfflineSyncError.invalidActionData
        }

        logger.debug("Syncing user progress data: level \(progressData.level)")
        // Implementation would sync user progress to cloud/backend
    }

    nonisolated private func processStudySessionSync(_ action: PendingAction) async throws {
        // Decode study session data
        let sessionData: StudySessionSyncData
        do {
            sessionData = try JSONDecoder().decode(StudySessionSyncData.self, from: action.data)
        } catch {
            throw OfflineSyncError.invalidActionData
        }

        logger.debug("Syncing study session: \(sessionData.sessionID)")
        // Implementation would sync study session to analytics/cloud
    }

    // MARK: - Persistence

    /// Save queue to disk
    private func saveToDisk() {
        do {
            let data = try JSONEncoder().encode(pendingActions)
            UserDefaults.standard.set(data, forKey: queueKey)
            logger.debug("Saved \(self.pendingActions.count) actions to disk")
        } catch {
            logger.error("Failed to save queue to disk: \(error.localizedDescription)")
        }
    }

    /// Load queue from disk (synchronous version for initial load)
    private func loadFromDiskSync() {
        guard let data = UserDefaults.standard.data(forKey: queueKey) else {
            logger.debug("No saved queue found on disk")
            return
        }

        do {
            pendingActions = try JSONDecoder().decode([PendingAction].self, from: data)
            logger.info("Loaded \(self.pendingActions.count) actions from disk")
        } catch {
            logger.error("Failed to load queue from disk: \(error.localizedDescription)")
        }
    }
}

// MARK: - Supporting Types

/// Action waiting to be synced
struct PendingAction: Codable {
    let id: UUID
    let type: ActionType
    let data: Data
    let createdAt: Date

    enum ActionType: String, Codable {
        case materialImport
        case flashcardSync
        case progressSync
        case studySessionSync
    }

    init(id: UUID = UUID(), type: ActionType, data: Data, createdAt: Date = Date()) {
        self.id = id
        self.type = type
        self.data = data
        self.createdAt = createdAt
    }
}

/// Material import data
struct MaterialImportData: Codable {
    let title: String
    let googleDriveFileID: String
    let subjectID: UUID?
}

/// Flashcard sync data
struct FlashcardSyncData: Codable {
    let flashcardIDs: [UUID]
    let reviewData: [FlashcardReviewData]

    struct FlashcardReviewData: Codable {
        let flashcardID: UUID
        let quality: Int
        let reviewedAt: Date
    }
}

/// Progress sync data
struct ProgressSyncData: Codable {
    let xp: Int
    let level: Int
    let streak: Int
    let lastStudyDate: Date
}

/// Study session sync data
struct StudySessionSyncData: Codable {
    let sessionID: UUID
    let materialID: UUID
    let duration: TimeInterval
    let completedAt: Date
}

/// Errors for offline sync
enum OfflineSyncError: LocalizedError {
    case invalidActionData
    case partialSyncFailure(failedCount: Int)
    case syncNotAvailable

    var errorDescription: String? {
        switch self {
        case .invalidActionData:
            return "Invalid action data format"
        case .partialSyncFailure(let count):
            return "\(count) actions failed to sync"
        case .syncNotAvailable:
            return "Sync service not available"
        }
    }
}
