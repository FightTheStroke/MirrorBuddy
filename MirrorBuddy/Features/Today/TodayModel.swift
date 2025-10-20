import Combine
import Foundation

/// Model representing the Today dashboard aggregated data
struct TodayModel: Codable, Equatable {
    let date: Date
    let topTasks: [TodayTask]
    let upcomingMaterials: [TodayMaterial]
    let studyStreak: Int
    let todayProgress: TodayProgress
    let syncSummary: SyncSummary

    /// Quick stats for the day
    struct TodayProgress: Codable, Equatable {
        let completedTasks: Int
        let totalTasks: Int
        let studyMinutes: Int
        let materialsReviewed: Int

        var completionPercentage: Double {
            guard totalTasks > 0 else { return 0 }
            return Double(completedTasks) / Double(totalTasks)
        }
    }

    /// Summary of sync operations from Google/Calendar
    struct SyncSummary: Codable, Equatable {
        let newAssignments: Int
        let upcomingDeadlines: Int
        let recentMaterials: Int
        let lastSyncDate: Date

        var hasUpdates: Bool {
            newAssignments > 0 || upcomingDeadlines > 0 || recentMaterials > 0
        }
    }
}

/// Today task representation
struct TodayTask: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let subject: String?
    let dueDate: Date?
    let priority: Priority
    let isCompleted: Bool

    enum Priority: String, Codable {
        case high = "High"
        case medium = "Medium"
        case low = "Low"
    }
}

/// Today material suggestion
struct TodayMaterial: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let subject: String
    let difficulty: String
    let lastStudied: Date?
    let nextReviewDate: Date?
    let isRecommended: Bool
}

/// Service to aggregate data for Today view
@MainActor
final class TodayService: ObservableObject {
    @Published var todayModel: TodayModel?
    @Published var isLoading: Bool = false
    @Published var error: Error?

    // MARK: - Dependencies (injected)
    private let taskRepository: TaskRepository
    private let materialRepository: MaterialRepository
    private let syncManager: SyncManager
    private let studyTracker: StudyTimeTracker

    init(
        taskRepository: TaskRepository = .shared,
        materialRepository: MaterialRepository = .shared,
        syncManager: SyncManager = .shared,
        studyTracker: StudyTimeTracker = .shared
    ) {
        self.taskRepository = taskRepository
        self.materialRepository = materialRepository
        self.syncManager = syncManager
        self.studyTracker = studyTracker
    }

    /// Aggregate all data sources into Today model
    func refreshTodayData() async {
        isLoading = true
        error = nil

        do {
            // Fetch data from various sources in parallel
            async let topTasks = fetchTopTasks()
            async let materials = fetchUpcomingMaterials()
            async let streak = fetchStudyStreak()
            async let progress = fetchTodayProgress()
            async let syncSummary = fetchSyncSummary()

            // Await all results
            let (tasks, mats, str, prog, sync) = try await (
                topTasks, materials, streak, progress, syncSummary
            )

            // Create Today model
            todayModel = TodayModel(
                date: Date(),
                topTasks: tasks,
                upcomingMaterials: mats,
                studyStreak: str,
                todayProgress: prog,
                syncSummary: sync
            )

            isLoading = false
        } catch {
            self.error = error
            isLoading = false
        }
    }

    // MARK: - Private Data Fetching

    private func fetchTopTasks() async throws -> [TodayTask] {
        let allTasks = await taskRepository.getTasks()

        // Filter to today's tasks and high priority
        let today = Calendar.current.startOfDay(for: Date())
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else {
            return []
        }

        return allTasks
            .filter { task in
                guard let dueDate = task.dueDate else { return false }
                return dueDate >= today && dueDate < tomorrow && !task.isCompleted
            }
            .sorted { task1, task2 in
                // Sort by priority, then by due date
                if task1.priority.rawValue != task2.priority.rawValue {
                    return task1.priority.rawValue > task2.priority.rawValue
                }
                return (task1.dueDate ?? Date.distantFuture) < (task2.dueDate ?? Date.distantFuture)
            }
            .prefix(5)
            .map { task in
                TodayTask(
                    id: task.id,
                    title: task.title,
                    subject: task.subject,
                    dueDate: task.dueDate,
                    priority: TodayTask.Priority(rawValue: task.priority.rawValue) ?? .medium,
                    isCompleted: task.isCompleted
                )
            }
    }

    private func fetchUpcomingMaterials() async throws -> [TodayMaterial] {
        let materials = await materialRepository.getRecommendedMaterials()

        return materials
            .prefix(3)
            .map { material in
                TodayMaterial(
                    id: material.id,
                    title: material.title,
                    subject: material.subject,
                    difficulty: material.difficulty,
                    lastStudied: material.lastStudied,
                    nextReviewDate: material.nextReviewDate,
                    isRecommended: true
                )
            }
    }

    private func fetchStudyStreak() async throws -> Int {
        await studyTracker.getCurrentStreak()
    }

    private func fetchTodayProgress() async throws -> TodayModel.TodayProgress {
        let allTasks = await taskRepository.getTasks()
        let today = Calendar.current.startOfDay(for: Date())
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else {
            return TodayModel.TodayProgress(
                completedTasks: 0,
                totalTasks: 0,
                studyMinutes: 0,
                materialsReviewed: 0
            )
        }

        let todayTasks = allTasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return dueDate >= today && dueDate < tomorrow
        }

        let completed = todayTasks.filter { $0.isCompleted }.count
        let studyMinutes = await studyTracker.getTodayMinutes()
        let materialsReviewed = await materialRepository.getTodayReviewCount()

        return TodayModel.TodayProgress(
            completedTasks: completed,
            totalTasks: todayTasks.count,
            studyMinutes: studyMinutes,
            materialsReviewed: materialsReviewed
        )
    }

    private func fetchSyncSummary() async throws -> TodayModel.SyncSummary {
        let syncStatus = await syncManager.getLastSyncStatus()

        return TodayModel.SyncSummary(
            newAssignments: syncStatus.newAssignments,
            upcomingDeadlines: syncStatus.upcomingDeadlines,
            recentMaterials: syncStatus.newMaterials,
            lastSyncDate: syncStatus.lastSyncDate
        )
    }

    /// Generate voice-friendly summary text
    func generateVoiceSummary() -> String {
        guard let model = todayModel else {
            return "Non ho ancora caricato i dati di oggi."
        }

        var summary = "Ciao! Ecco il tuo riepilogo di oggi. "

        // Study streak
        if model.studyStreak > 0 {
            summary += "Sei a \(model.studyStreak) giorni di streak. "
        }

        // Progress
        let progress = model.todayProgress
        if progress.totalTasks > 0 {
            summary += "Hai completato \(progress.completedTasks) su \(progress.totalTasks) task. "
        }

        if progress.studyMinutes > 0 {
            summary += "Hai studiato per \(progress.studyMinutes) minuti oggi. "
        }

        // Top tasks
        if !model.topTasks.isEmpty {
            summary += "Le tue priorità sono: "
            let taskTitles = model.topTasks.prefix(3).map { $0.title }
            summary += taskTitles.joined(separator: ", ") + ". "
        }

        // Sync updates
        if model.syncSummary.hasUpdates {
            summary += "Ci sono \(model.syncSummary.newAssignments) nuovi compiti sincronizzati. "
        }

        // Recommendations
        if !model.upcomingMaterials.isEmpty, let firstMaterial = model.upcomingMaterials.first {
            summary += "Ti consiglio di ripassare \(firstMaterial.title). "
        }

        summary += "Buono studio!"

        return summary
    }
}

// MARK: - Mock Repositories (placeholders - to be replaced with actual implementations)

class TaskRepository {
    static let shared = TaskRepository()

    func getTasks() async -> [TaskItem] {
        // Placeholder - integrate with actual task storage
        []
    }

    struct TaskItem {
        let id: String
        let title: String
        let subject: String?
        let dueDate: Date?
        let priority: Priority
        let isCompleted: Bool

        enum Priority: String {
            case high = "High"
            case medium = "Medium"
            case low = "Low"
        }
    }
}

class MaterialRepository {
    static let shared = MaterialRepository()

    func getRecommendedMaterials() async -> [MaterialItem] {
        // Placeholder - integrate with actual material storage
        []
    }

    func getTodayReviewCount() async -> Int {
        // Placeholder
        0
    }

    struct MaterialItem {
        let id: String
        let title: String
        let subject: String
        let difficulty: String
        let lastStudied: Date?
        let nextReviewDate: Date?
    }
}

class SyncManager {
    static let shared = SyncManager()

    func getLastSyncStatus() async -> SyncStatus {
        // Placeholder - integrate with actual sync logic
        SyncStatus(
            newAssignments: 0,
            upcomingDeadlines: 0,
            newMaterials: 0,
            lastSyncDate: Date()
        )
    }

    struct SyncStatus {
        let newAssignments: Int
        let upcomingDeadlines: Int
        let newMaterials: Int
        let lastSyncDate: Date
    }
}

class StudyTimeTracker {
    static let shared = StudyTimeTracker()

    func getCurrentStreak() async -> Int {
        // Placeholder - integrate with actual streak tracking
        0
    }

    func getTodayMinutes() async -> Int {
        // Placeholder - integrate with actual time tracking
        0
    }
}
