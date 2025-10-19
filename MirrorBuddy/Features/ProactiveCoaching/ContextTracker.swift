import Foundation
import Combine
import SwiftUI

/// Tracks user context for proactive coaching decisions
@MainActor
final class ContextTracker: ObservableObject {

    // MARK: - Published Properties

    @Published var currentSubject: String?
    @Published var currentMaterial: Material?
    @Published var currentActivity: StudyActivity = .idle
    @Published var sessionStartTime: Date?
    @Published var lastInteractionTime: Date = Date()
    @Published var emotionalState: EmotionalState = .neutral
    @Published var studyMode: StudyMode?

    // MARK: - Types

    enum StudyActivity {
        case idle
        case reading
        case flashcards
        case mindMap
        case voiceConversation
        case taskWork
        case break
    }

    enum EmotionalState {
        case frustrated
        case confused
        case neutral
        case engaged
        case confident

        var needsSupport: Bool {
            switch self {
            case .frustrated, .confused:
                return true
            case .neutral, .engaged, .confident:
                return false
            }
        }
    }

    enum StudyMode {
        case math
        case italian
        case history
        case science
        case language
        case general

        var displayName: String {
            switch self {
            case .math: return ProactiveCoachingStrings.StudyMode.math
            case .italian: return ProactiveCoachingStrings.StudyMode.italian
            case .history: return ProactiveCoachingStrings.StudyMode.history
            case .science: return ProactiveCoachingStrings.StudyMode.science
            case .language: return ProactiveCoachingStrings.StudyMode.language
            case .general: return ProactiveCoachingStrings.StudyMode.general
            }
        }
    }

    // MARK: - Context Metrics

    private(set) var studyDuration: TimeInterval {
        guard let start = sessionStartTime else { return 0 }
        return Date().timeIntervalSince(start)
    }

    private(set) var idleDuration: TimeInterval {
        Date().timeIntervalSince(lastInteractionTime)
    }

    private(set) var correctAnswerStreak: Int = 0
    private(set) var incorrectAnswerStreak: Int = 0

    // MARK: - Session Management

    func startStudySession(subject: String?, material: Material?) {
        sessionStartTime = Date()
        currentSubject = subject
        currentMaterial = material
        currentActivity = .reading
        lastInteractionTime = Date()
        emotionalState = .neutral

        // Infer study mode from subject
        if let subject = subject {
            studyMode = inferStudyMode(from: subject)
        }
    }

    func endStudySession() {
        sessionStartTime = nil
        currentActivity = .idle
        correctAnswerStreak = 0
        incorrectAnswerStreak = 0
    }

    // MARK: - Activity Tracking

    func updateActivity(_ activity: StudyActivity) {
        currentActivity = activity
        lastInteractionTime = Date()
    }

    func recordInteraction() {
        lastInteractionTime = Date()
    }

    // MARK: - Performance Tracking

    func recordCorrectAnswer() {
        correctAnswerStreak += 1
        incorrectAnswerStreak = 0

        // Update emotional state based on performance
        if correctAnswerStreak >= 3 {
            emotionalState = .confident
        } else if correctAnswerStreak >= 1 {
            emotionalState = .engaged
        }

        recordInteraction()
    }

    func recordIncorrectAnswer() {
        incorrectAnswerStreak += 1
        correctAnswerStreak = 0

        // Update emotional state based on performance
        if incorrectAnswerStreak >= 3 {
            emotionalState = .frustrated
        } else if incorrectAnswerStreak >= 2 {
            emotionalState = .confused
        }

        recordInteraction()
    }

    // MARK: - Context Analysis

    func shouldOfferBreak() -> Bool {
        // Suggest break after 25-30 minutes of continuous study
        guard studyDuration >= 25 * 60 else { return false }
        return currentActivity != .break
    }

    func shouldOfferEncouragement() -> Bool {
        emotionalState.needsSupport
    }

    func isUserIdle() -> Bool {
        idleDuration > 60 // 60 seconds of inactivity
    }

    func needsWorkingMemoryCheckpoint() -> Bool {
        // Checkpoint every 10 minutes during active study
        guard currentActivity != .idle,
              currentActivity != .break else { return false }

        let studyMinutes = Int(studyDuration / 60)
        return studyMinutes > 0 && studyMinutes % 10 == 0
    }

    // MARK: - Private Helpers

    private func inferStudyMode(from subject: String) -> StudyMode {
        let lowercased = subject.lowercased()

        if lowercased.contains("mat") {
            return .math
        } else if lowercased.contains("ita") || lowercased.contains("gram") {
            return .italian
        } else if lowercased.contains("stor") || lowercased.contains("hist") {
            return .history
        } else if lowercased.contains("sci") || lowercased.contains("fis") || lowercased.contains("chim") {
            return .science
        } else if lowercased.contains("ingl") || lowercased.contains("fran") || lowercased.contains("ling") {
            return .language
        } else {
            return .general
        }
    }
}

// MARK: - Material Stub

struct Material: Identifiable, Codable {
    let id: String
    let title: String
    let subject: String
    let difficulty: String
}
