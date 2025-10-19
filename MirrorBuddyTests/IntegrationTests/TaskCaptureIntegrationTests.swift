@testable import MirrorBuddy
import XCTest

/// Integration tests for natural language task capture
@MainActor
final class TaskCaptureIntegrationTests: XCTestCase {
    var parser: NaturalLanguageTaskParser!
    var captureService: TaskCaptureService!

    override func setUp() async throws {
        try await super.setUp()

        parser = NaturalLanguageTaskParser()
        captureService = TaskCaptureService()
    }

    override func tearDown() async throws {
        parser = nil
        captureService = nil

        try await super.tearDown()
    }

    // MARK: - Title Extraction Tests

    func testTitleExtraction() {
        let result1 = parser.parse("ricordami di studiare matematica")
        XCTAssertEqual(result1.title, "Studiare matematica")

        let result2 = parser.parse("devo fare i compiti di storia")
        XCTAssertEqual(result2.title, "Fare i compiti di storia")

        let result3 = parser.parse("aggiungi task leggere capitolo 5")
        XCTAssertEqual(result3.title, "Leggere capitolo 5")
    }

    func testTitleWithTimeRemoval() {
        let result = parser.parse("ricordami di studiare per domani")
        XCTAssertEqual(result.title, "Studiare")
        XCTAssertFalse(result.title.contains("domani"))
    }

    // MARK: - Subject Extraction Tests

    func testMathSubjectDetection() {
        let result1 = parser.parse("ricordami di studiare matematica")
        XCTAssertEqual(result1.subject, TaskCaptureStrings.Subject.math)

        let result2 = parser.parse("compiti di mate per domani")
        XCTAssertEqual(result2.subject, TaskCaptureStrings.Subject.math)

        let result3 = parser.parse("esercizi di algebra")
        XCTAssertEqual(result3.subject, TaskCaptureStrings.Subject.math)
    }

    func testItalianSubjectDetection() {
        let result1 = parser.parse("studiare italiano")
        XCTAssertEqual(result1.subject, TaskCaptureStrings.Subject.italian)

        let result2 = parser.parse("compiti di grammatica")
        XCTAssertEqual(result2.subject, TaskCaptureStrings.Subject.italian)

        let result3 = parser.parse("leggere letteratura")
        XCTAssertEqual(result3.subject, TaskCaptureStrings.Subject.italian)
    }

    func testHistorySubjectDetection() {
        let result = parser.parse("studiare storia antica")
        XCTAssertEqual(result.subject, TaskCaptureStrings.Subject.history)
    }

    func testScienceSubjectDetection() {
        let result1 = parser.parse("compiti di scienze")
        XCTAssertEqual(result1.subject, TaskCaptureStrings.Subject.science)

        let result2 = parser.parse("studiare fisica")
        XCTAssertEqual(result2.subject, TaskCaptureStrings.Subject.science)

        let result3 = parser.parse("esercizi di chimica")
        XCTAssertEqual(result3.subject, TaskCaptureStrings.Subject.science)
    }

    func testLanguageSubjectDetection() {
        let result1 = parser.parse("studiare inglese")
        XCTAssertEqual(result1.subject, TaskCaptureStrings.Subject.language)

        let result2 = parser.parse("compiti di francese")
        XCTAssertEqual(result2.subject, TaskCaptureStrings.Subject.language)
    }

    // MARK: - Due Date Extraction Tests

    func testTomorrowDueDate() {
        let result = parser.parse("ricordami di studiare per domani")
        XCTAssertNotNil(result.dueDate)

        if let dueDate = result.dueDate {
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
            XCTAssertTrue(Calendar.current.isDate(dueDate, inSameDayAs: tomorrow))
        }
    }

    func testTodayDueDate() {
        let result = parser.parse("ricordami di studiare oggi")
        XCTAssertNotNil(result.dueDate)

        if let dueDate = result.dueDate {
            XCTAssertTrue(Calendar.current.isDateInToday(dueDate))
        }
    }

    func testDayAfterTomorrowDueDate() {
        let result = parser.parse("ricordami di studiare per dopodomani")
        XCTAssertNotNil(result.dueDate)

        if let dueDate = result.dueDate {
            let dayAfterTomorrow = Calendar.current.date(byAdding: .day, value: 2, to: Date())!
            XCTAssertTrue(Calendar.current.isDate(dueDate, inSameDayAs: dayAfterTomorrow))
        }
    }

    func testThisWeekDueDate() {
        let result = parser.parse("ricordami di studiare questa settimana")
        XCTAssertNotNil(result.dueDate)
    }

    func testSpecificWeekdayDueDate() {
        let result = parser.parse("ricordami di studiare per venerdì")
        XCTAssertNotNil(result.dueDate)

        if let dueDate = result.dueDate {
            let weekday = Calendar.current.component(.weekday, from: dueDate)
            XCTAssertEqual(weekday, 6) // Friday is 6
        }
    }

    // MARK: - Priority Extraction Tests

    func testHighPriorityDetection() {
        let result1 = parser.parse("ricordami di studiare urgente")
        XCTAssertEqual(result1.priority, .high)

        let result2 = parser.parse("importante fare i compiti")
        XCTAssertEqual(result2.priority, .high)

        let result3 = parser.parse("priorità alta per matematica")
        XCTAssertEqual(result3.priority, .high)
    }

    func testLowPriorityDetection() {
        let result1 = parser.parse("ricordami di studiare quando posso")
        XCTAssertEqual(result1.priority, .low)

        let result2 = parser.parse("non urgente leggere capitolo")
        XCTAssertEqual(result2.priority, .low)
    }

    func testDefaultMediumPriority() {
        let result = parser.parse("ricordami di studiare")
        XCTAssertEqual(result.priority, .medium)
    }

    // MARK: - Complex Parsing Tests

    func testComplexTaskParsing() {
        let result = parser.parse("ricordami di studiare matematica capitolo 5 urgente per domani")

        XCTAssertTrue(result.title.contains("matematica"))
        XCTAssertEqual(result.subject, TaskCaptureStrings.Subject.math)
        XCTAssertEqual(result.priority, .high)
        XCTAssertNotNil(result.dueDate)
    }

    func testMultipleKeywordsTask() {
        let result = parser.parse("compiti di fisica per venerdì importante")

        XCTAssertEqual(result.subject, TaskCaptureStrings.Subject.science)
        XCTAssertEqual(result.priority, .high)
        XCTAssertNotNil(result.dueDate)
    }

    // MARK: - Task Capture Service Tests

    func testInitialState() {
        XCTAssertFalse(captureService.isListening)
        XCTAssertTrue(captureService.capturedText.isEmpty)
        XCTAssertNil(captureService.parsedTask)
        XCTAssertFalse(captureService.isConfirming)
        XCTAssertTrue(captureService.savedTasks.isEmpty)
    }

    func testManualTaskAddition() {
        let title = "Test Task"
        let subject = TaskCaptureStrings.Subject.math
        let dueDate = Date()
        let priority: NaturalLanguageTaskParser.ParsedTask.TaskPriority = .high

        captureService.addTask(
            title: title,
            subject: subject,
            dueDate: dueDate,
            priority: priority,
            notes: nil
        )

        XCTAssertEqual(captureService.savedTasks.count, 1)
        XCTAssertEqual(captureService.savedTasks.first?.title, title)
        XCTAssertEqual(captureService.savedTasks.first?.subject, subject)
        XCTAssertEqual(captureService.savedTasks.first?.priority, priority)
    }

    func testMultipleTasksAddition() {
        captureService.addTask(
            title: "Task 1",
            subject: TaskCaptureStrings.Subject.math,
            dueDate: Date(),
            priority: .high,
            notes: nil
        )

        captureService.addTask(
            title: "Task 2",
            subject: TaskCaptureStrings.Subject.italian,
            dueDate: Date(),
            priority: .medium,
            notes: nil
        )

        XCTAssertEqual(captureService.savedTasks.count, 2)
    }

    // MARK: - Nightly Plan Tests

    func testNightlyPlanGeneration() {
        let plan = captureService.generateNightlyPlan()

        XCTAssertFalse(plan.isEmpty)
        XCTAssertTrue(plan.contains(TaskCaptureStrings.NightlyPlan.greeting))
        XCTAssertTrue(plan.contains(TaskCaptureStrings.NightlyPlan.goodNight))
    }

    func testNightlyPlanWithTasks() {
        // Add some tasks
        captureService.addTask(
            title: "Task 1",
            subject: TaskCaptureStrings.Subject.math,
            dueDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()),
            priority: .high,
            notes: nil
        )

        let plan = captureService.generateNightlyPlan()

        XCTAssertTrue(plan.contains(TaskCaptureStrings.NightlyPlan.tomorrowPlan))
    }

    func testNightlyPlanEmptyState() {
        // No tasks added
        let plan = captureService.generateNightlyPlan()

        XCTAssertTrue(plan.contains(TaskCaptureStrings.NightlyPlan.noTasksToday))
        XCTAssertTrue(plan.contains(TaskCaptureStrings.NightlyPlan.noTasksTomorrow))
    }

    // MARK: - Edge Cases

    func testEmptyInputParsing() {
        let result = parser.parse("")
        XCTAssertFalse(result.title.isEmpty)
    }

    func testVeryLongInputParsing() {
        let longText = String(repeating: "test ", count: 100)
        let result = parser.parse(longText)
        XCTAssertFalse(result.title.isEmpty)
    }

    func testSpecialCharactersParsing() {
        let result = parser.parse("ricordami di studiare @#$% matematica!")
        XCTAssertEqual(result.subject, TaskCaptureStrings.Subject.math)
    }

    // MARK: - Context-Aware Parsing

    func testParsingWithContext() {
        let context = TaskContext(
            currentSubject: TaskCaptureStrings.Subject.history,
            recentTasks: [],
            studySchedule: [:]
        )

        let result = parser.parse("ricordami di studiare il capitolo 3", currentContext: context)

        // Should use context subject if no explicit subject is mentioned
        XCTAssertEqual(result.subject, TaskCaptureStrings.Subject.history)
    }

    // MARK: - Integration Flow Tests

    func testCompleteTaskCaptureFlow() async {
        // Start voice capture
        captureService.startVoiceCapture()
        XCTAssertTrue(captureService.isListening)

        // Wait for simulated recognition
        try? await Task.sleep(nanoseconds: 4_000_000_000) // 4 seconds

        // Should have captured and parsed text
        XCTAssertFalse(captureService.capturedText.isEmpty)
        XCTAssertNotNil(captureService.parsedTask)
        XCTAssertTrue(captureService.isConfirming)

        // Confirm task
        captureService.confirmAndSaveTask()
        XCTAssertEqual(captureService.savedTasks.count, 1)
        XCTAssertFalse(captureService.isConfirming)
    }

    func testCancelTaskFlow() async {
        captureService.startVoiceCapture()

        try? await Task.sleep(nanoseconds: 4_000_000_000)

        // Cancel instead of confirm
        captureService.cancelTask()
        XCTAssertTrue(captureService.savedTasks.isEmpty)
        XCTAssertNil(captureService.parsedTask)
        XCTAssertFalse(captureService.isConfirming)
    }
}
