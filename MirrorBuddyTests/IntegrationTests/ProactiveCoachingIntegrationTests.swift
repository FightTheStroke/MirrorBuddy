@testable import MirrorBuddy
import XCTest

/// Integration tests for proactive coaching system
@MainActor
final class ProactiveCoachingIntegrationTests: XCTestCase {
    var contextTracker: ContextTracker!
    var idleDetector: IdleDetector!
    var checkpointManager: WorkingMemoryCheckpoint!
    var coachingService: ProactiveCoachingService!

    override func setUp() async throws {
        try await super.setUp()

        contextTracker = ContextTracker()
        idleDetector = IdleDetector(contextTracker: contextTracker)
        checkpointManager = WorkingMemoryCheckpoint(contextTracker: contextTracker)
        coachingService = ProactiveCoachingService(
            contextTracker: contextTracker,
            idleDetector: idleDetector,
            checkpointManager: checkpointManager
        )
    }

    override func tearDown() async throws {
        coachingService = nil
        checkpointManager = nil
        idleDetector = nil
        contextTracker = nil

        try await super.tearDown()
    }

    // MARK: - Context Tracking Tests

    func testContextTrackerInitialState() {
        XCTAssertNil(contextTracker.currentSubject)
        XCTAssertNil(contextTracker.currentMaterial)
        XCTAssertEqual(contextTracker.currentActivity, .idle)
        XCTAssertNil(contextTracker.sessionStartTime)
        XCTAssertEqual(contextTracker.emotionalState, .neutral)
    }

    func testStartStudySession() {
        let material = Material(
            id: "1",
            title: "Algebra Chapter 1",
            subject: "Math",
            difficulty: "Medium"
        )

        contextTracker.startStudySession(subject: "Math", material: material)

        XCTAssertEqual(contextTracker.currentSubject, "Math")
        XCTAssertNotNil(contextTracker.currentMaterial)
        XCTAssertEqual(contextTracker.currentActivity, .reading)
        XCTAssertNotNil(contextTracker.sessionStartTime)
        XCTAssertEqual(contextTracker.studyMode, .math)
    }

    func testStudyModeInference() {
        // Test math
        contextTracker.startStudySession(subject: "Matematica", material: nil)
        XCTAssertEqual(contextTracker.studyMode, .math)

        // Test Italian
        contextTracker.startStudySession(subject: "Italiano", material: nil)
        XCTAssertEqual(contextTracker.studyMode, .italian)

        // Test history
        contextTracker.startStudySession(subject: "Storia", material: nil)
        XCTAssertEqual(contextTracker.studyMode, .history)

        // Test science
        contextTracker.startStudySession(subject: "Scienze", material: nil)
        XCTAssertEqual(contextTracker.studyMode, .science)

        // Test language
        contextTracker.startStudySession(subject: "Inglese", material: nil)
        XCTAssertEqual(contextTracker.studyMode, .language)
    }

    func testPerformanceTracking() {
        contextTracker.startStudySession(subject: "Math", material: nil)

        // Test correct answers
        contextTracker.recordCorrectAnswer()
        XCTAssertEqual(contextTracker.emotionalState, .engaged)

        contextTracker.recordCorrectAnswer()
        contextTracker.recordCorrectAnswer()
        XCTAssertEqual(contextTracker.emotionalState, .confident)

        // Test incorrect answers
        contextTracker.recordIncorrectAnswer()
        contextTracker.recordIncorrectAnswer()
        XCTAssertEqual(contextTracker.emotionalState, .confused)

        contextTracker.recordIncorrectAnswer()
        XCTAssertEqual(contextTracker.emotionalState, .frustrated)
    }

    // MARK: - Idle Detection Tests

    func testIdleDetectorInitialState() {
        XCTAssertFalse(idleDetector.isIdle)
        XCTAssertEqual(idleDetector.idleDuration, 0)
    }

    func testIdleReasonDetection() {
        contextTracker.startStudySession(subject: "Math", material: nil)

        // Test frustrated reason
        contextTracker.emotionalState = .frustrated
        let frustratedReason = idleDetector.getIdleReason()
        XCTAssertEqual(frustratedReason, .notIdle) // Not idle yet

        // Test confused reason
        contextTracker.emotionalState = .confused
        let confusedReason = idleDetector.getIdleReason()
        XCTAssertEqual(confusedReason, .notIdle) // Not idle yet
    }

    func testResetIdle() {
        idleDetector.resetIdle()

        XCTAssertFalse(idleDetector.isIdle)
        XCTAssertEqual(idleDetector.idleDuration, 0)
    }

    // MARK: - Working Memory Checkpoint Tests

    func testCheckpointInitialState() {
        XCTAssertFalse(checkpointManager.isCheckpointActive)
        XCTAssertNil(checkpointManager.lastCheckpointTime)
        XCTAssertEqual(checkpointManager.checkpointCount, 0)
    }

    func testManualCheckpoint() {
        contextTracker.startStudySession(subject: "Math", material: nil)

        checkpointManager.triggerManualCheckpoint()

        XCTAssertTrue(checkpointManager.isCheckpointActive)
        XCTAssertNotNil(checkpointManager.lastCheckpointTime)
        XCTAssertEqual(checkpointManager.checkpointCount, 1)
    }

    // MARK: - Proactive Coaching Service Tests

    func testCoachingServiceInitialState() {
        XCTAssertNil(coachingService.currentPrompt)
        XCTAssertFalse(coachingService.isActive)
        XCTAssertTrue(coachingService.promptHistory.isEmpty)
    }

    func testStartAndStopCoaching() {
        coachingService.startCoaching()
        XCTAssertTrue(coachingService.isActive)

        coachingService.stopCoaching()
        XCTAssertFalse(coachingService.isActive)
        XCTAssertNil(coachingService.currentPrompt)
    }

    func testRecordUserInteraction() {
        let beforeTime = Date()
        coachingService.recordUserInteraction()
        let afterTime = Date()

        XCTAssertTrue(contextTracker.lastInteractionTime >= beforeTime)
        XCTAssertTrue(contextTracker.lastInteractionTime <= afterTime)
    }

    func testRecordCorrectAnswers() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        // Record correct answers
        for _ in 1...3 {
            coachingService.recordCorrectAnswer()
        }

        XCTAssertEqual(contextTracker.emotionalState, .confident)
    }

    func testRecordIncorrectAnswers() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        // Record incorrect answers
        for _ in 1...3 {
            coachingService.recordIncorrectAnswer()
        }

        XCTAssertEqual(contextTracker.emotionalState, .frustrated)
    }

    func testStartStudySessionIntegration() {
        let material = Material(
            id: "test1",
            title: "Test Material",
            subject: "Math",
            difficulty: "Easy"
        )

        coachingService.startStudySession(subject: "Math", material: material)

        XCTAssertTrue(coachingService.isActive)
        XCTAssertEqual(contextTracker.currentSubject, "Math")
        XCTAssertEqual(contextTracker.currentMaterial?.id, "test1")
        XCTAssertEqual(contextTracker.studyMode, .math)
    }

    func testEndStudySessionIntegration() {
        let material = Material(
            id: "test1",
            title: "Test Material",
            subject: "Math",
            difficulty: "Easy"
        )

        coachingService.startStudySession(subject: "Math", material: material)
        coachingService.endStudySession()

        XCTAssertFalse(coachingService.isActive)
        XCTAssertNil(contextTracker.sessionStartTime)
        XCTAssertEqual(contextTracker.currentActivity, .idle)
    }

    func testDismissPrompt() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        // Manually create a prompt to test dismissal
        let prompt = ProactivePrompt.encouragementPrompt(
            message: ProactiveCoachingStrings.Prompts.encouragement1
        )

        coachingService.dismissCurrentPrompt()
        XCTAssertNil(coachingService.currentPrompt)
    }

    func testCelebrationStreak() async {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        // Record 5 correct answers to trigger celebration
        for _ in 1...5 {
            coachingService.recordCorrectAnswer()
        }

        // Wait for any async operations to complete
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second

        // The celebration should have been triggered
        XCTAssertEqual(contextTracker.emotionalState, .confident)
    }

    // MARK: - Prompt Action Tests

    func testHandleTakeBreakAction() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        coachingService.handleAction(.takeBreak)

        XCTAssertEqual(contextTracker.currentActivity, .break)
        XCTAssertNil(coachingService.currentPrompt)
    }

    func testHandleContinueStudyingAction() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        coachingService.handleAction(.continueStudying)

        XCTAssertNil(coachingService.currentPrompt)
        XCTAssertFalse(idleDetector.isIdle)
    }

    func testHandleGetHelpAction() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        coachingService.handleAction(.getHelp)

        XCTAssertNil(coachingService.currentPrompt)
    }

    func testHandleDismissAction() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        coachingService.handleAction(.dismiss)

        XCTAssertNil(coachingService.currentPrompt)
    }

    // MARK: - Integration Flow Tests

    func testCompleteStudySessionFlow() async {
        // Start session
        let material = Material(
            id: "flow1",
            title: "Algebra Basics",
            subject: "Matematica",
            difficulty: "Medium"
        )

        coachingService.startStudySession(subject: "Matematica", material: material)

        XCTAssertTrue(coachingService.isActive)
        XCTAssertEqual(contextTracker.studyMode, .math)

        // Simulate correct answers
        coachingService.recordCorrectAnswer()
        coachingService.recordCorrectAnswer()

        XCTAssertEqual(contextTracker.emotionalState, .engaged)

        // Record user interaction
        coachingService.recordUserInteraction()

        // End session
        coachingService.endStudySession()

        XCTAssertFalse(coachingService.isActive)
        XCTAssertNil(contextTracker.sessionStartTime)
    }

    func testEmotionalStateFlow() {
        contextTracker.startStudySession(subject: "Math", material: nil)
        coachingService.startCoaching()

        // Progress from confused to confident
        contextTracker.recordIncorrectAnswer()
        contextTracker.recordIncorrectAnswer()
        XCTAssertEqual(contextTracker.emotionalState, .confused)

        // Turn it around with correct answers
        contextTracker.recordCorrectAnswer()
        contextTracker.recordCorrectAnswer()
        contextTracker.recordCorrectAnswer()
        XCTAssertEqual(contextTracker.emotionalState, .confident)
    }

    func testActivityTransitions() {
        contextTracker.startStudySession(subject: "History", material: nil)

        XCTAssertEqual(contextTracker.currentActivity, .reading)

        contextTracker.updateActivity(.flashcards)
        XCTAssertEqual(contextTracker.currentActivity, .flashcards)

        contextTracker.updateActivity(.mindMap)
        XCTAssertEqual(contextTracker.currentActivity, .mindMap)

        contextTracker.updateActivity(.break)
        XCTAssertEqual(contextTracker.currentActivity, .break)

        contextTracker.updateActivity(.reading)
        XCTAssertEqual(contextTracker.currentActivity, .reading)
    }
}
