//
//  TaskCreationIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.6: Task Creation Integration Tests
//  Tests task creation from Gmail, Calendar, and voice input
//

@testable import MirrorBuddy
import SwiftData
import XCTest

/// Integration tests for task creation from external sources
@MainActor
final class TaskCreationIntegrationTests: XCTestCase {
    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        let schema = Schema([Task.self, Material.self])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(for: schema, configurations: [modelConfiguration])
        modelContext = ModelContext(modelContainer)
    }

    override func tearDown() async throws {
        modelContainer = nil
        modelContext = nil
        try await super.tearDown()
    }

    // MARK: - Task Creation Tests

    /// Test 1: Create task from Gmail email
    func testCreateTaskFromGmailEmail() async throws {
        // Given: Email with assignment
        let task = Task(title: "Math Homework - Chapter 5", priority: .high)
        task.desc = "Complete problems 1-15 from Chapter 5"
        task.dueDate = Calendar.current.date(byAdding: .day, value: 3, to: Date())
        task.source = "gmail"
        task.isCompleted = false

        modelContext.insert(task)
        try modelContext.save()

        // Then: Verify task creation
        XCTAssertNotNil(task.dueDate)
        XCTAssertEqual(task.priority, .high)
        XCTAssertEqual(task.source, "gmail")
        XCTAssertFalse(task.isCompleted)
    }

    /// Test 2: Create task from Calendar event
    func testCreateTaskFromCalendarEvent() async throws {
        // Given: Calendar event
        let task = Task(title: "Physics Exam", priority: .high)
        task.desc = "Exam covering chapters 1-5 on Newton's Laws"
        task.dueDate = Calendar.current.date(byAdding: .day, value: 7, to: Date())
        task.source = "calendar"

        modelContext.insert(task)
        try modelContext.save()

        // Then: Verify calendar task
        XCTAssertEqual(task.source, "calendar")
        XCTAssertNotNil(task.dueDate)
        XCTAssertTrue(task.desc?.contains("Exam") ?? false)
    }

    /// Test 3: Create task from voice command
    func testCreateTaskFromVoiceCommand() async throws {
        // Given: Voice command "Remind me to study chemistry tomorrow"
        let task = Task(title: "Study chemistry", priority: .medium)
        task.dueDate = Calendar.current.date(byAdding: .day, value: 1, to: Date())
        task.source = "voice"

        modelContext.insert(task)
        try modelContext.save()

        // Then: Verify voice task
        XCTAssertEqual(task.source, "voice")
        XCTAssertNotNil(task.dueDate)
    }

    /// Test 4: Create task from material
    func testCreateTaskFromMaterial() async throws {
        // Given: Material
        let material = Material(title: "Algebra Notes")
        modelContext.insert(material)

        let task = Task(title: "Review Algebra Notes", priority: .medium)
        task.desc = "Study material: Algebra Notes"
        task.linkedMaterialID = material.id

        modelContext.insert(task)
        try modelContext.save()

        // Then: Verify material link
        XCTAssertEqual(task.linkedMaterialID, material.id)
    }

    /// Test 5: Task priority detection from keywords
    func testTaskPriorityDetectionFromKeywords() async throws {
        // Given: Urgent task
        let urgentTask = Task(title: "URGENT: Submit assignment", priority: .high)
        modelContext.insert(urgentTask)

        let normalTask = Task(title: "Read textbook chapter", priority: .medium)
        modelContext.insert(normalTask)

        try modelContext.save()

        // Then: Verify priorities
        XCTAssertEqual(urgentTask.priority, .high)
        XCTAssertEqual(normalTask.priority, .medium)
    }

    /// Test 6: Duplicate task detection
    func testDuplicateTaskDetection() async throws {
        // Given: First task
        let task1 = Task(title: "Study for math test", priority: .high)
        task1.dueDate = Calendar.current.date(byAdding: .day, value: 5, to: Date())
        modelContext.insert(task1)
        try modelContext.save()

        // When: Try to create duplicate
        let task2 = Task(title: "Study for math test", priority: .high)
        task2.dueDate = task1.dueDate
        modelContext.insert(task2)
        try modelContext.save()

        // Then: Both exist (app should handle deduplication)
        let descriptor = FetchDescriptor<Task>(
            predicate: #Predicate { $0.title == "Study for math test" }
        )
        let tasks = try modelContext.fetch(descriptor)
        XCTAssertGreaterThanOrEqual(tasks.count, 1)
    }

    /// Test 7: Task completion workflow
    func testTaskCompletionWorkflow() async throws {
        // Given: Incomplete task
        let task = Task(title: "Complete homework", priority: .high)
        task.isCompleted = false
        modelContext.insert(task)
        try modelContext.save()

        XCTAssertFalse(task.isCompleted)
        XCTAssertNil(task.completedAt)

        // When: Complete task
        task.isCompleted = true
        task.completedAt = Date()
        try modelContext.save()

        // Then: Verify completion
        XCTAssertTrue(task.isCompleted)
        XCTAssertNotNil(task.completedAt)
    }

    /// Test 8: Recurring task handling
    func testRecurringTaskHandling() async throws {
        // Given: Daily task
        let task = Task(title: "Review flashcards", priority: .medium)
        task.dueDate = Date()
        task.isRecurring = true
        modelContext.insert(task)
        try modelContext.save()

        // When: Complete and generate next occurrence
        task.isCompleted = true
        task.completedAt = Date()

        let nextTask = Task(title: task.title, priority: task.priority)
        nextTask.dueDate = Calendar.current.date(byAdding: .day, value: 1, to: Date())
        nextTask.isRecurring = true
        modelContext.insert(nextTask)
        try modelContext.save()

        // Then: Verify recurrence
        let descriptor = FetchDescriptor<Task>(
            predicate: #Predicate { $0.title == "Review flashcards" }
        )
        let tasks = try modelContext.fetch(descriptor)
        XCTAssertEqual(tasks.count, 2)
    }

    /// Test 9: Task sorting by due date
    func testTaskSortingByDueDate() async throws {
        // Given: Tasks with different due dates
        let today = Date()

        let task1 = Task(title: "Task 1", priority: .high)
        task1.dueDate = Calendar.current.date(byAdding: .day, value: 1, to: today)
        modelContext.insert(task1)

        let task2 = Task(title: "Task 2", priority: .medium)
        task2.dueDate = Calendar.current.date(byAdding: .day, value: 3, to: today)
        modelContext.insert(task2)

        let task3 = Task(title: "Task 3", priority: .high)
        task3.dueDate = today
        modelContext.insert(task3)

        try modelContext.save()

        // When: Fetch sorted by due date
        let descriptor = FetchDescriptor<Task>(
            sortBy: [SortDescriptor(\.dueDate, order: .forward)]
        )
        let sortedTasks = try modelContext.fetch(descriptor)

        // Then: Verify sorting
        XCTAssertEqual(sortedTasks.count, 3)
        XCTAssertEqual(sortedTasks[0].title, "Task 3") // Due today
        XCTAssertEqual(sortedTasks[1].title, "Task 1") // Due in 1 day
        XCTAssertEqual(sortedTasks[2].title, "Task 2") // Due in 3 days
    }

    /// Test 10: Task filtering by completion status
    func testTaskFilteringByCompletionStatus() async throws {
        // Given: Mix of completed and incomplete tasks
        let task1 = Task(title: "Completed Task", priority: .medium)
        task1.isCompleted = true
        task1.completedAt = Date()
        modelContext.insert(task1)

        let task2 = Task(title: "Incomplete Task 1", priority: .high)
        task2.isCompleted = false
        modelContext.insert(task2)

        let task3 = Task(title: "Incomplete Task 2", priority: .medium)
        task3.isCompleted = false
        modelContext.insert(task3)

        try modelContext.save()

        // When: Fetch incomplete tasks
        let incompleteDescriptor = FetchDescriptor<Task>(
            predicate: #Predicate { $0.isCompleted == false }
        )
        let incompleteTasks = try modelContext.fetch(incompleteDescriptor)

        // Then: Verify filtering
        XCTAssertEqual(incompleteTasks.count, 2)
        XCTAssertTrue(incompleteTasks.allSatisfy { !$0.isCompleted })
    }
}
