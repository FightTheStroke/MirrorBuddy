//
//  TodayViewModel.swift
//  MirrorBuddy
//
//  ViewModel for Today screen - manages daily tasks and progress
//

import Foundation
import SwiftUI
import SwiftData
import os.log

/// Today view model
@MainActor
final class TodayViewModel: ObservableObject {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TodayViewModel")

    // MARK: - Published State

    @Published var todayItems: [TodayItem] = []
    @Published var streakDays: Int = 0
    @Published var todayStudyTime: String = "0 min"
    @Published var completedTasksCount: Int = 0
    @Published var reviewsDue: Int = 0

    @Published var isLoading: Bool = false
    @Published var error: String?

    // MARK: - Services

    private let spacedRepetitionService = SpacedRepetitionService.shared
    private let timerService = StudyTimerService.shared

    // MARK: - Public Methods

    /// Load all today's data
    func loadTodayData(context: ModelContext) async {
        isLoading = true
        logger.info("Loading today's data")

        do {
            // Load materials with upcoming tests/deadlines
            let materials = try await loadUpcomingMaterials(context: context)

            // Load due flashcards
            let dueFlashcards = try await loadDueFlashcards(context: context)

            // Load today's tasks
            let tasks = try await loadTodayTasks(context: context)

            // Build today items
            todayItems = buildTodayItems(
                materials: materials,
                flashcards: dueFlashcards,
                tasks: tasks
            )

            // Load progress metrics
            await loadProgressMetrics(context: context)

            logger.info("✅ Loaded \(todayItems.count) today items")
        } catch {
            logger.error("Failed to load today data: \(error)")
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Start focus timer
    func startFocusTimer() async {
        logger.info("Starting focus timer")
        await timerService.startTimer(duration: 25 * 60) // 25 minutes

        // Navigate to timer view
        NotificationCenter.default.post(
            name: .navigateToTimer,
            object: nil
        )
    }

    /// Start review session
    func startReview() async {
        logger.info("Starting review session")

        NotificationCenter.default.post(
            name: .navigateToReview,
            object: nil
        )
    }

    /// Create new task
    func createTask() async {
        logger.info("Creating new task")

        NotificationCenter.default.post(
            name: .showTaskCreation,
            object: nil
        )
    }

    /// Show progress screen
    func showProgress() async {
        logger.info("Showing progress")

        NotificationCenter.default.post(
            name: .navigateToProgress,
            object: nil
        )
    }

    // MARK: - Private Methods

    private func loadUpcomingMaterials(context: ModelContext) async throws -> [Material] {
        let descriptor = FetchDescriptor<Material>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )

        let allMaterials = try context.fetch(descriptor)

        // Filter materials with upcoming tests or recent activity
        // TODO: Add deadline tracking to Material model
        return Array(allMaterials.prefix(3))
    }

    private func loadDueFlashcards(context: ModelContext) async throws -> [Flashcard] {
        let now = Date()
        let predicate = #Predicate<Flashcard> { card in
            card.nextReview ?? Date.distantFuture <= now
        }

        let descriptor = FetchDescriptor<Flashcard>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.nextReview)]
        )

        return try context.fetch(descriptor)
    }

    private func loadTodayTasks(context: ModelContext) async throws -> [StudyTask] {
        // TODO: Implement StudyTask model with due dates
        // For now, return empty array
        return []
    }

    private func buildTodayItems(
        materials: [Material],
        flashcards: [Flashcard],
        tasks: [StudyTask]
    ) -> [TodayItem] {
        var items: [TodayItem] = []

        // Add materials
        for material in materials {
            items.append(TodayItem(
                id: material.id.uuidString,
                title: material.title,
                subtitle: "Verifica domani", // TODO: Calculate from deadline
                icon: "book.fill",
                color: .blue,
                progress: 0.75, // TODO: Calculate readiness
                actionTitle: "Inizia Ripasso",
                action: {
                    NotificationCenter.default.post(
                        name: .navigateToStudy,
                        object: nil,
                        userInfo: ["materialID": material.id]
                    )
                }
            ))
        }

        // Add flashcard review if due
        if !flashcards.isEmpty {
            items.append(TodayItem(
                id: "flashcard-review",
                title: "Ripasso Flashcard",
                subtitle: "\(flashcards.count) carte da rivedere",
                icon: "rectangle.stack.fill",
                color: .purple,
                progress: nil,
                actionTitle: "Inizia Ripasso",
                action: {
                    NotificationCenter.default.post(
                        name: .navigateToReview,
                        object: nil
                    )
                }
            ))
        }

        // Add tasks
        for task in tasks {
            items.append(TodayItem(
                id: task.id.uuidString,
                title: task.title,
                subtitle: task.subject ?? "Generale",
                icon: "checkmark.circle",
                color: .green,
                progress: nil,
                actionTitle: "Completa",
                action: {
                    NotificationCenter.default.post(
                        name: .completeTask,
                        object: nil,
                        userInfo: ["taskID": task.id]
                    )
                }
            ))
        }

        return items
    }

    private func loadProgressMetrics(context: ModelContext) async {
        // Streak
        streakDays = calculateStreak(context: context)

        // Today's study time
        let minutes = calculateTodayStudyMinutes(context: context)
        todayStudyTime = formatStudyTime(minutes)

        // Completed tasks
        completedTasksCount = calculateCompletedTasks(context: context)

        // Reviews due
        let descriptor = FetchDescriptor<Flashcard>()
        if let flashcards = try? context.fetch(descriptor) {
            reviewsDue = flashcards.filter { card in
                guard let nextReview = card.nextReview else { return false }
                return nextReview <= Date()
            }.count
        }
    }

    private func calculateStreak(context: ModelContext) -> Int {
        // TODO: Implement streak calculation based on StudySession
        return 5 // Placeholder
    }

    private func calculateTodayStudyMinutes(context: ModelContext) -> Int {
        // TODO: Sum duration of today's study sessions
        return 45 // Placeholder
    }

    private func calculateCompletedTasks(context: ModelContext) -> Int {
        // TODO: Count completed tasks today
        return 3 // Placeholder
    }

    private func formatStudyTime(_ minutes: Int) -> String {
        if minutes < 60 {
            return "\(minutes) min"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            return "\(hours)h \(remainingMinutes)m"
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let navigateToTimer = Notification.Name("navigateToTimer")
    static let navigateToReview = Notification.Name("navigateToReview")
    static let navigateToStudy = Notification.Name("navigateToStudy")
    static let navigateToProgress = Notification.Name("navigateToProgress")
    static let showTaskCreation = Notification.Name("showTaskCreation")
    static let completeTask = Notification.Name("completeTask")
}

// MARK: - Placeholder Models

/// Temporary StudyTask model (will be properly implemented)
struct StudyTask: Identifiable {
    let id: UUID
    let title: String
    let subject: String?
    let dueDate: Date?
}
