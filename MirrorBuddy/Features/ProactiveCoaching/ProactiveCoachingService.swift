import Foundation
import Combine
import AVFoundation

/// Main service coordinating proactive coaching interventions
@MainActor
final class ProactiveCoachingService: ObservableObject {

    // MARK: - Published Properties

    @Published var currentPrompt: ProactivePrompt?
    @Published var isActive: Bool = false
    @Published var promptHistory: [ProactivePrompt] = []

    // MARK: - Dependencies

    private let contextTracker: ContextTracker
    private let idleDetector: IdleDetector
    private let checkpointManager: WorkingMemoryCheckpoint
    private let speechSynthesizer = AVSpeechSynthesizer()

    // MARK: - State

    private var cancellables = Set<AnyCancellable>()
    private var proactiveTimer: Timer?
    private var lastPromptTime: Date?

    // Configuration
    private let minimumPromptInterval: TimeInterval = 2 * 60 // Min 2 minutes between prompts

    // MARK: - Initialization

    init(
        contextTracker: ContextTracker = ContextTracker(),
        idleDetector: IdleDetector? = nil,
        checkpointManager: WorkingMemoryCheckpoint? = nil
    ) {
        self.contextTracker = contextTracker

        // Initialize dependencies with context tracker
        self.idleDetector = idleDetector ?? IdleDetector(contextTracker: contextTracker)
        self.checkpointManager = checkpointManager ?? WorkingMemoryCheckpoint(
            contextTracker: contextTracker
        )

        setupObservers()
    }

    // MARK: - Setup

    private func setupObservers() {
        // Monitor idle state
        idleDetector.$isIdle
            .sink { [weak self] isIdle in
                if isIdle {
                    self?.handleIdleDetected()
                }
            }
            .store(in: &cancellables)

        // Monitor emotional state
        contextTracker.$emotionalState
            .sink { [weak self] state in
                if state.needsSupport {
                    self?.handleEmotionalSupport(for: state)
                }
            }
            .store(in: &cancellables)

        // Monitor checkpoints
        checkpointManager.$isCheckpointActive
            .sink { [weak self] isActive in
                if !isActive, let lastTime = self?.checkpointManager.lastCheckpointTime {
                    self?.handleCheckpointCompleted(at: lastTime)
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Service Control

    func startCoaching() {
        isActive = true
        idleDetector.startMonitoring()
        checkpointManager.startCheckpointMonitoring()
        startProactiveMonitoring()
    }

    func stopCoaching() {
        isActive = false
        idleDetector.stopMonitoring()
        checkpointManager.stopCheckpointMonitoring()
        proactiveTimer?.invalidate()
        currentPrompt = nil
    }

    private func startProactiveMonitoring() {
        proactiveTimer?.invalidate()

        proactiveTimer = Timer.scheduledTimer(
            withTimeInterval: 30, // Check every 30 seconds
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in
                self?.evaluateProactiveActions()
            }
        }
    }

    // MARK: - Proactive Evaluation

    private func evaluateProactiveActions() {
        guard isActive else { return }
        guard canShowPrompt() else { return }

        // Priority order of interventions
        if contextTracker.shouldOfferBreak() {
            showBreakSuggestion()
        } else if contextTracker.needsWorkingMemoryCheckpoint() {
            checkpointManager.performCheckpoint()
        } else if contextTracker.shouldOfferEncouragement() {
            showEncouragement()
        }
    }

    private func canShowPrompt() -> Bool {
        // Don't interrupt if there's already a prompt
        guard currentPrompt == nil else { return false }

        // Respect minimum interval between prompts
        if let lastTime = lastPromptTime {
            let elapsed = Date().timeIntervalSince(lastTime)
            guard elapsed >= minimumPromptInterval else { return false }
        }

        return true
    }

    // MARK: - Event Handlers

    private func handleIdleDetected() {
        guard canShowPrompt() else { return }

        let reason = idleDetector.getIdleReason()
        let prompt = ProactivePrompt.idlePrompt(reason: reason.suggestedAction)

        showPrompt(prompt, speak: true)
    }

    private func handleEmotionalSupport(for state: ContextTracker.EmotionalState) {
        guard canShowPrompt() else { return }

        let message: String
        switch state {
        case .frustrated:
            message = ProactiveCoachingStrings.Prompts.frustrated
        case .confused:
            message = ProactiveCoachingStrings.Prompts.confused
        default:
            return
        }

        let prompt = ProactivePrompt.encouragementPrompt(message: message)
        showPrompt(prompt, speak: true)
    }

    private func handleCheckpointCompleted(at time: Date) {
        // Could log checkpoint completion or trigger follow-up actions
    }

    // MARK: - Prompt Display

    private func showBreakSuggestion() {
        let prompt = ProactivePrompt.breakPrompt()
        showPrompt(prompt, speak: true)
    }

    private func showEncouragement() {
        let messages = [
            ProactiveCoachingStrings.Prompts.encouragement1,
            ProactiveCoachingStrings.Prompts.encouragement2,
            ProactiveCoachingStrings.Prompts.encouragement3,
            ProactiveCoachingStrings.Prompts.encouragement4
        ]

        let message = messages.randomElement() ?? messages[0]
        let prompt = ProactivePrompt.encouragementPrompt(message: message)

        showPrompt(prompt, speak: true)
    }

    func suggestNextStep() {
        guard let subject = contextTracker.currentSubject else { return }

        let suggestions = [
            ProactiveCoachingStrings.Prompts.nextTopicSuggestion(subject),
            ProactiveCoachingStrings.Prompts.practiceExercise(subject),
            ProactiveCoachingStrings.Prompts.reviewConcepts(subject),
            ProactiveCoachingStrings.Prompts.createMindMap(subject)
        ]

        let suggestion = suggestions.randomElement() ?? suggestions[0]
        let prompt = ProactivePrompt.nextStepPrompt(suggestion: suggestion)

        showPrompt(prompt, speak: true)
    }

    func celebrate(achievement: String) {
        let prompt = ProactivePrompt.celebrationPrompt(achievement: achievement)
        showPrompt(prompt, speak: true)
    }

    private func showPrompt(_ prompt: ProactivePrompt, speak: Bool) {
        currentPrompt = prompt
        promptHistory.append(prompt)
        lastPromptTime = Date()

        if speak {
            speakPrompt(prompt.message)
        }

        // Auto-dismiss low-priority prompts after 15 seconds
        if prompt.priority == .low {
            Task {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                if currentPrompt?.id == prompt.id {
                    dismissCurrentPrompt()
                }
            }
        }
    }

    private func speakPrompt(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.0
        utterance.volume = 0.7

        speechSynthesizer.speak(utterance)
    }

    // MARK: - Prompt Actions

    func handleAction(_ action: PromptAction.ActionType) {
        switch action {
        case .takeBreak:
            contextTracker.updateActivity(.break)
            dismissCurrentPrompt()

        case .continueStudying:
            contextTracker.recordInteraction()
            idleDetector.resetIdle()
            dismissCurrentPrompt()

        case .getHelp:
            // This would trigger help/clarification flow
            contextTracker.recordInteraction()
            dismissCurrentPrompt()

        case .viewSummary:
            // This would show a summary view
            contextTracker.recordInteraction()
            dismissCurrentPrompt()

        case .nextMaterial:
            // This would navigate to next material
            contextTracker.recordInteraction()
            dismissCurrentPrompt()

        case .reviewConcepts:
            // This would trigger review mode
            contextTracker.recordInteraction()
            dismissCurrentPrompt()

        case .dismiss:
            dismissCurrentPrompt()

        case .custom:
            dismissCurrentPrompt()
        }
    }

    func dismissCurrentPrompt() {
        currentPrompt = nil
        speechSynthesizer.stopSpeaking(at: .word)
    }

    // MARK: - Public Interface

    func recordUserInteraction() {
        contextTracker.recordInteraction()
    }

    func recordCorrectAnswer() {
        contextTracker.recordCorrectAnswer()

        // Celebrate streaks
        if contextTracker.correctAnswerStreak >= 5 {
            celebrate(achievement: ProactiveCoachingStrings.Prompts.celebrateStreak(5))
        }
    }

    func recordIncorrectAnswer() {
        contextTracker.recordIncorrectAnswer()
    }

    func startStudySession(subject: String?, material: Material?) {
        contextTracker.startStudySession(subject: subject, material: material)
        startCoaching()
    }

    func endStudySession() {
        contextTracker.endStudySession()
        stopCoaching()
    }

    deinit {
        stopCoaching()
    }
}
