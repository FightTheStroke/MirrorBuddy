import AVFoundation
import Combine
import Foundation

/// Manages working memory checkpoints during study sessions
@MainActor
final class WorkingMemoryCheckpoint: ObservableObject {
    // MARK: - Published Properties

    @Published var isCheckpointActive: Bool = false
    @Published var lastCheckpointTime: Date?
    @Published var checkpointCount: Int = 0

    // MARK: - Properties

    private let contextTracker: ContextTracker
    private var checkpointTimer: Timer?

    // Configuration
    private let checkpointInterval: TimeInterval = 10 * 60 // Every 10 minutes
    private let speechSynthesizer = AVSpeechSynthesizer()

    // MARK: - Initialization

    init(contextTracker: ContextTracker) {
        self.contextTracker = contextTracker
    }

    // MARK: - Checkpoint Management

    func startCheckpointMonitoring() {
        checkpointTimer?.invalidate()

        checkpointTimer = Timer.scheduledTimer(
            withTimeInterval: checkpointInterval,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in
                self?.triggerCheckpointIfNeeded()
            }
        }
    }

    func stopCheckpointMonitoring() {
        checkpointTimer?.invalidate()
        checkpointTimer = nil
        checkpointCount = 0
    }

    private func triggerCheckpointIfNeeded() {
        // Only trigger checkpoints during active study
        guard contextTracker.currentActivity != .idle,
              contextTracker.currentActivity != .takingBreak else { return }

        // Skip if already in a checkpoint
        guard !isCheckpointActive else { return }

        performCheckpoint()
    }

    // MARK: - Checkpoint Execution

    func performCheckpoint() {
        isCheckpointActive = true
        lastCheckpointTime = Date()
        checkpointCount += 1

        let checkpointContent = generateCheckpointContent()
        speakCheckpoint(checkpointContent)

        // Auto-dismiss after speaking
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            self?.isCheckpointActive = false
        }
    }

    private func generateCheckpointContent() -> String {
        var content = ""

        // Greeting based on checkpoint number
        if checkpointCount == 1 {
            content = ProactiveCoachingStrings.Checkpoints.greeting1 + " "
        } else {
            content = ProactiveCoachingStrings.Checkpoints.greeting2 + " "
        }

        // Subject-specific recap
        if let subject = contextTracker.currentSubject {
            content += ProactiveCoachingStrings.Checkpoints.studyingSubject(subject) + " "
        }

        // Performance feedback
        if contextTracker.emotionalState == .confident {
            content += ProactiveCoachingStrings.Checkpoints.performanceExcellent + " "
        } else if contextTracker.emotionalState == .engaged {
            content += ProactiveCoachingStrings.Checkpoints.performanceGood + " "
        } else if contextTracker.emotionalState == .confused {
            content += ProactiveCoachingStrings.Checkpoints.performanceDifficult + " "
        }

        // Working memory prompts
        let prompts = getWorkingMemoryPrompts()
        content += prompts.randomElement() ?? ProactiveCoachingStrings.Checkpoints.mentalRepeat + " "

        // Next steps
        content += ProactiveCoachingStrings.Checkpoints.continue

        return content
    }

    private func getWorkingMemoryPrompts() -> [String] {
        guard let mode = contextTracker.studyMode else {
            return [
                ProactiveCoachingStrings.Checkpoints.mentalRepeat,
                ProactiveCoachingStrings.Checkpoints.recallKeyPoints,
                ProactiveCoachingStrings.Checkpoints.whatLearned
            ]
        }

        switch mode {
        case .math:
            return [
                ProactiveCoachingStrings.Checkpoints.mathFormulas,
                ProactiveCoachingStrings.Checkpoints.mathSteps,
                ProactiveCoachingStrings.Checkpoints.mathProperties
            ]
        case .italian:
            return [
                ProactiveCoachingStrings.Checkpoints.italianGrammar,
                ProactiveCoachingStrings.Checkpoints.italianConjugation,
                ProactiveCoachingStrings.Checkpoints.italianVocabulary
            ]
        case .history:
            return [
                ProactiveCoachingStrings.Checkpoints.historySequence,
                ProactiveCoachingStrings.Checkpoints.historyCharacters,
                ProactiveCoachingStrings.Checkpoints.historyCauses
            ]
        case .science:
            return [
                ProactiveCoachingStrings.Checkpoints.scienceProcess,
                ProactiveCoachingStrings.Checkpoints.scienceConcepts,
                ProactiveCoachingStrings.Checkpoints.scienceHow
            ]
        case .language:
            return [
                ProactiveCoachingStrings.Checkpoints.languageWords,
                ProactiveCoachingStrings.Checkpoints.languageSentence,
                ProactiveCoachingStrings.Checkpoints.languagePronunciation
            ]
        case .general:
            return [
                ProactiveCoachingStrings.Checkpoints.generalKeyPoints,
                ProactiveCoachingStrings.Checkpoints.generalLearned,
                ProactiveCoachingStrings.Checkpoints.generalDetails
            ]
        }
    }

    private func speakCheckpoint(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.1
        utterance.volume = 0.8

        speechSynthesizer.speak(utterance)
    }

    // MARK: - Manual Checkpoint

    func triggerManualCheckpoint() {
        performCheckpoint()
    }

    deinit {
        stopCheckpointMonitoring()
        speechSynthesizer.stopSpeaking(at: .immediate)
    }
}
