import Foundation
import Combine
import SwiftUI

/// Detects user idle state and triggers proactive interventions
@MainActor
final class IdleDetector: ObservableObject {

    // MARK: - Published Properties

    @Published var isIdle: Bool = false
    @Published var idleDuration: TimeInterval = 0

    // MARK: - Properties

    private let contextTracker: ContextTracker
    private var cancellables = Set<AnyCancellable>()
    private var idleCheckTimer: Timer?

    // Configuration
    private let idleThreshold: TimeInterval = 60 // 60 seconds
    private let checkInterval: TimeInterval = 10 // Check every 10 seconds

    // MARK: - Initialization

    init(contextTracker: ContextTracker) {
        self.contextTracker = contextTracker
        startMonitoring()
    }

    // MARK: - Monitoring

    func startMonitoring() {
        idleCheckTimer?.invalidate()

        idleCheckTimer = Timer.scheduledTimer(
            withTimeInterval: checkInterval,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in
                self?.checkIdleState()
            }
        }
    }

    func stopMonitoring() {
        idleCheckTimer?.invalidate()
        idleCheckTimer = nil
        isIdle = false
        idleDuration = 0
    }

    // MARK: - Idle Detection

    private func checkIdleState() {
        let currentIdleDuration = contextTracker.idleDuration

        if currentIdleDuration >= idleThreshold {
            if !isIdle {
                isIdle = true
            }
            idleDuration = currentIdleDuration
        } else {
            if isIdle {
                isIdle = false
            }
            idleDuration = 0
        }
    }

    // MARK: - Idle Analysis

    func getIdleReason() -> IdleReason {
        guard isIdle else { return .notIdle }

        // Analyze context to determine likely reason for idle state
        if contextTracker.emotionalState == .frustrated {
            return .frustrated
        }

        if contextTracker.emotionalState == .confused {
            return .confused
        }

        if contextTracker.studyDuration > 25 * 60 {
            return .needsBreak
        }

        if contextTracker.currentActivity == .reading && idleDuration > 120 {
            return .possiblyStuck
        }

        return .unknown
    }

    enum IdleReason {
        case notIdle
        case frustrated
        case confused
        case needsBreak
        case possiblyStuck
        case unknown

        var suggestedAction: String {
            switch self {
            case .notIdle:
                return ""
            case .frustrated:
                return ProactiveCoachingStrings.IdlePrompts.frustrated
            case .confused:
                return ProactiveCoachingStrings.IdlePrompts.confused
            case .needsBreak:
                return ProactiveCoachingStrings.IdlePrompts.needsBreak
            case .possiblyStuck:
                return ProactiveCoachingStrings.IdlePrompts.possiblyStuck
            case .unknown:
                return ProactiveCoachingStrings.IdlePrompts.unknown
            }
        }
    }

    // MARK: - Manual Idle Reset

    func resetIdle() {
        isIdle = false
        idleDuration = 0
        contextTracker.recordInteraction()
    }

    deinit {
        stopMonitoring()
    }
}
