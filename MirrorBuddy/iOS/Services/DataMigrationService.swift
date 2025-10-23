//
//  DataMigrationService.swift
//  MirrorBuddy
//
//  Task 83.5: Data migration service for Subject enum to SubjectEntity migration
//  Handles migrating existing Material and Task records to use SubjectEntity relationships
//

import Foundation
import os.log
import SwiftData

/// Service for migrating data from old Subject enum to new SubjectEntity model
@MainActor
final class DataMigrationService {
    private let modelContext: ModelContext
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "DataMigration")

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Migration Status

    /// Check if migration is needed
    func isMigrationNeeded() -> Bool {
        do {
            // Check if there are any Materials or Tasks without subjects
            let materialsDescriptor = FetchDescriptor<Material>(
                predicate: #Predicate { $0.subject == nil }
            )
            let materialsWithoutSubject = try modelContext.fetch(materialsDescriptor)

            let tasksDescriptor = FetchDescriptor<Task>(
                predicate: #Predicate { $0.subject == nil }
            )
            let tasksWithoutSubject = try modelContext.fetch(tasksDescriptor)

            let needsMigration = !materialsWithoutSubject.isEmpty || !tasksWithoutSubject.isEmpty

            if needsMigration {
                logger.info("Migration needed: \(materialsWithoutSubject.count) materials and \(tasksWithoutSubject.count) tasks without subjects")
            } else {
                logger.info("No migration needed - all records have subjects")
            }

            return needsMigration
        } catch {
            logger.error("Error checking migration status: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Migration Execution

    /// Perform complete data migration
    /// - Returns: Migration result with statistics
    func performMigration() async throws -> MigrationResult {
        logger.info("Starting data migration from Subject enum to SubjectEntity")

        var result = MigrationResult()

        // Get all available subjects for detection
        let subjectService = SubjectService(modelContext: modelContext)
        let availableSubjects = try subjectService.getAllSubjects()

        guard !availableSubjects.isEmpty else {
            logger.warning("No subjects available - initializing default subjects")
            try subjectService.initializeDefaultSubjects()
            return try await performMigration() // Retry after initialization
        }

        // Migrate materials
        let materialsResult = try migrateMaterials(availableSubjects: availableSubjects)
        result.materialsMigrated = materialsResult.migrated
        result.materialsSkipped = materialsResult.skipped
        result.materialsDetected = materialsResult.detected

        // Migrate tasks
        let tasksResult = try migrateTasks(availableSubjects: availableSubjects)
        result.tasksMigrated = tasksResult.migrated
        result.tasksSkipped = tasksResult.skipped
        result.tasksDetected = tasksResult.detected

        // Save changes
        try modelContext.save()

        logger.info("Migration completed: \(result.totalMigrated) records migrated, \(result.totalSkipped) skipped")

        return result
    }

    // MARK: - Material Migration

    private func migrateMaterials(availableSubjects: [SubjectEntity]) throws -> ItemMigrationResult {
        let descriptor = FetchDescriptor<Material>(
            predicate: #Predicate { $0.subject == nil }
        )
        let materialsWithoutSubject = try modelContext.fetch(descriptor)

        var result = ItemMigrationResult()
        let detectionService = SubjectDetectionService.shared

        for material in materialsWithoutSubject {
            // Try to detect subject from material content
            let detectedSubject = detectSubjectForMaterial(
                material,
                availableSubjects: availableSubjects,
                detectionService: detectionService
            )

            if let subject = detectedSubject {
                material.subject = subject
                result.detected += 1
                logger.debug("Detected subject '\(subject.displayName)' for material '\(material.title)'")
            } else {
                // Assign default "Other" subject if detection fails
                if let otherSubject = availableSubjects.first(where: { $0.localizationKey == "subject.other" }) {
                    material.subject = otherSubject
                    result.skipped += 1
                    logger.debug("Assigned default 'Other' subject to material '\(material.title)'")
                }
            }

            result.migrated += 1
        }

        return result
    }

    // MARK: - Task Migration

    private func migrateTasks(availableSubjects: [SubjectEntity]) throws -> ItemMigrationResult {
        let descriptor = FetchDescriptor<Task>(
            predicate: #Predicate { $0.subject == nil }
        )
        let tasksWithoutSubject = try modelContext.fetch(descriptor)

        var result = ItemMigrationResult()
        let detectionService = SubjectDetectionService.shared

        for task in tasksWithoutSubject {
            // Try to detect subject from task content
            let detectedSubject = detectSubjectForTask(
                task,
                availableSubjects: availableSubjects,
                detectionService: detectionService
            )

            if let subject = detectedSubject {
                task.subject = subject
                result.detected += 1
                logger.debug("Detected subject '\(subject.displayName)' for task '\(task.title)'")
            } else {
                // Assign default "Other" subject if detection fails
                if let otherSubject = availableSubjects.first(where: { $0.localizationKey == "subject.other" }) {
                    task.subject = otherSubject
                    result.skipped += 1
                    logger.debug("Assigned default 'Other' subject to task '\(task.title)'")
                }
            }

            result.migrated += 1
        }

        return result
    }

    // MARK: - Subject Detection Helpers

    private func detectSubjectForMaterial(
        _ material: Material,
        availableSubjects: [SubjectEntity],
        detectionService: SubjectDetectionService
    ) -> SubjectEntity? {
        // Combine all available text for detection
        var textToAnalyze = material.title

        if let summary = material.summary {
            textToAnalyze += " \(summary)"
        }

        if let textContent = material.textContent {
            textToAnalyze += " \(textContent)"
        }

        if !material.extractedText.isEmpty {
            textToAnalyze += " \(material.extractedText)"
        }

        return detectionService.detectSubject(from: textToAnalyze, availableSubjects: availableSubjects)
    }

    private func detectSubjectForTask(
        _ task: Task,
        availableSubjects: [SubjectEntity],
        detectionService: SubjectDetectionService
    ) -> SubjectEntity? {
        // Combine all available text for detection
        var textToAnalyze = task.title

        if let description = task.taskDescription {
            textToAnalyze += " \(description)"
        }

        return detectionService.detectSubject(from: textToAnalyze, availableSubjects: availableSubjects)
    }
}

// MARK: - Migration Results

/// Result of data migration operation
struct MigrationResult {
    var materialsMigrated: Int = 0
    var materialsSkipped: Int = 0
    var materialsDetected: Int = 0

    var tasksMigrated: Int = 0
    var tasksSkipped: Int = 0
    var tasksDetected: Int = 0

    var totalMigrated: Int {
        materialsMigrated + tasksMigrated
    }

    var totalSkipped: Int {
        materialsSkipped + tasksSkipped
    }

    var totalDetected: Int {
        materialsDetected + tasksDetected
    }

    var summary: String {
        """
        Migration Summary:
        - Materials: \(materialsMigrated) migrated (\(materialsDetected) detected, \(materialsSkipped) assigned default)
        - Tasks: \(tasksMigrated) migrated (\(tasksDetected) detected, \(tasksSkipped) assigned default)
        - Total: \(totalMigrated) records processed
        """
    }
}

/// Result of migrating a specific item type
private struct ItemMigrationResult {
    var migrated: Int = 0
    var skipped: Int = 0
    var detected: Int = 0
}
