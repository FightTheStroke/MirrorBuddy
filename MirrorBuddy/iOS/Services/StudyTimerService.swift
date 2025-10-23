import Combine
import Foundation
import SwiftData

/// Service for managing study timer sessions
@MainActor
class StudyTimerService: ObservableObject {
    static let shared = StudyTimerService()

    @Published private(set) var isRunning: Bool = false
    @Published private(set) var isPaused: Bool = false
    @Published private(set) var elapsedSeconds: Int = 0
    @Published private(set) var currentSubject: String?
    @Published private(set) var currentMaterial: Material?

    private var startTime: Date?
    private var timer: Timer?
    private var sessionID: UUID?
    private var pauseStartTime: Date?
    private var totalPausedSeconds: Int = 0

    private init() {}

    /// Start a new study session
    func startSession(subject: String? = nil, material: Material? = nil) {
        guard !isRunning else { return }

        startTime = Date()
        isRunning = true
        isPaused = false
        currentSubject = subject
        currentMaterial = material
        sessionID = UUID()
        elapsedSeconds = 0
        totalPausedSeconds = 0

        // Start timer
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            _Concurrency.Task { @MainActor in
                self?.elapsedSeconds += 1
            }
        }

        // Post notification
        NotificationCenter.default.post(name: .studySessionStarted, object: sessionID)
    }

    /// Pause the current session
    func pauseSession() {
        guard isRunning, !isPaused else { return }

        timer?.invalidate()
        timer = nil
        isPaused = true
        pauseStartTime = Date()

        NotificationCenter.default.post(name: .studySessionPaused, object: sessionID)
    }

    /// Resume a paused session
    func resumeSession() {
        guard isRunning, isPaused, sessionID != nil else { return }

        // Calculate paused time
        if let pauseStart = pauseStartTime {
            let pausedDuration = Int(Date().timeIntervalSince(pauseStart))
            totalPausedSeconds += pausedDuration
        }

        isPaused = false
        pauseStartTime = nil

        // Restart timer
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            _Concurrency.Task { @MainActor in
                self?.elapsedSeconds += 1
            }
        }

        NotificationCenter.default.post(name: .studySessionResumed, object: sessionID)
    }

    /// End the current session and save to database
    func endSession(modelContext: ModelContext) throws -> StudySession {
        guard let startTime = startTime, let sessionID = sessionID else {
            throw StudyTimerError.noActiveSession
        }

        timer?.invalidate()
        timer = nil

        // Calculate final paused time if currently paused
        if isPaused, let pauseStart = pauseStartTime {
            let pausedDuration = Int(Date().timeIntervalSince(pauseStart))
            totalPausedSeconds += pausedDuration
        }

        // Calculate actual study duration (minus paused time)
        let totalMinutes = max(0, (elapsedSeconds - totalPausedSeconds) / 60)

        let session = StudySession(
            id: sessionID,
            date: startTime,
            durationMinutes: totalMinutes,
            subject: currentSubject
        )

        session.startTime = startTime
        session.endTime = Date()
        session.totalPausedMinutes = totalPausedSeconds / 60

        if let material = currentMaterial {
            session.materialsStudied = [material]
        }

        // Calculate and award XP
        let xp = session.calculateXP()
        session.xpEarned = xp

        // Update user progress
        updateUserProgress(modelContext: modelContext, studyMinutes: totalMinutes, xp: xp)

        modelContext.insert(session)
        try modelContext.save()

        // Reset state
        isRunning = false
        isPaused = false
        elapsedSeconds = 0
        totalPausedSeconds = 0
        self.startTime = nil
        self.sessionID = nil
        currentSubject = nil
        currentMaterial = nil
        pauseStartTime = nil

        // Post notification
        NotificationCenter.default.post(name: .studySessionEnded, object: session)

        return session
    }

    /// Format elapsed time as HH:MM:SS or MM:SS
    var formattedTime: String {
        let hours = elapsedSeconds / 3_600
        let minutes = (elapsedSeconds % 3_600) / 60
        let seconds = elapsedSeconds % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }

    /// Update user progress with study time and XP
    private func updateUserProgress(modelContext: ModelContext, studyMinutes: Int, xp: Int) {
        let descriptor = FetchDescriptor<UserProgress>()
        guard let progress = try? modelContext.fetch(descriptor).first else { return }

        progress.totalStudyTimeMinutes += studyMinutes
        progress.addXP(xp)
        progress.updateStreak()

        try? modelContext.save()
    }
}

enum StudyTimerError: LocalizedError {
    case noActiveSession

    var errorDescription: String? {
        switch self {
        case .noActiveSession:
            return "No active study session"
        }
    }
}

extension Notification.Name {
    static let studySessionStarted = Notification.Name("studySessionStarted")
    static let studySessionPaused = Notification.Name("studySessionPaused")
    static let studySessionResumed = Notification.Name("studySessionResumed")
    static let studySessionEnded = Notification.Name("studySessionEnded")
}
