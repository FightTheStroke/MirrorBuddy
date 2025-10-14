import XCTest
import SwiftData
@testable import MirrorBuddy

// MARK: - Model Tests (Task 61.1)

@MainActor
final class ModelTests: XCTestCase {

    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUpWithError() throws {
        // Create in-memory model container for testing
        let schema = Schema([
            Material.self,
            Task.self,
            SubjectEntity.self,
            UserProgress.self,
            Flashcard.self,
            MindMap.self,
            MindMapNode.self,
            TrackedDriveFile.self
        ])

        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: true
        )

        modelContainer = try ModelContainer(
            for: schema,
            configurations: [modelConfiguration]
        )

        modelContext = ModelContext(modelContainer)
    }

    override func tearDownWithError() throws {
        modelContainer = nil
        modelContext = nil
    }

    // MARK: - Material Tests

    func testMaterialInitialization() throws {
        let material = Material(title: "Test Material")

        XCTAssertNotNil(material.id)
        XCTAssertEqual(material.title, "Test Material")
        XCTAssertEqual(material.processingStatus, .pending)
        XCTAssertNotNil(material.createdAt)
        XCTAssertNil(material.lastAccessedAt)
        XCTAssertNil(material.pdfURL)
        XCTAssertNil(material.textContent)
        XCTAssertNil(material.summary)
    }

    func testMaterialMarkAccessed() throws {
        let material = Material(title: "Test Material")

        XCTAssertNil(material.lastAccessedAt)

        material.markAccessed()

        XCTAssertNotNil(material.lastAccessedAt)
        XCTAssertLessThanOrEqual(
            abs(material.lastAccessedAt!.timeIntervalSinceNow),
            1.0,
            "Last accessed should be within 1 second"
        )
    }

    func testMaterialNeedsReprocessing() throws {
        let material = Material(title: "Test")

        // Pending status needs reprocessing
        material.processingStatus = .pending
        XCTAssertTrue(material.needsReprocessing)

        // Failed status needs reprocessing
        material.processingStatus = .failed
        XCTAssertTrue(material.needsReprocessing)

        // Processing status doesn't need reprocessing
        material.processingStatus = .processing
        XCTAssertFalse(material.needsReprocessing)

        // Completed status doesn't need reprocessing
        material.processingStatus = .completed
        XCTAssertFalse(material.needsReprocessing)
    }

    func testMaterialPersistence() throws {
        let material = Material(title: "Persistent Material")
        material.textContent = "Some content"
        material.processingStatus = .completed

        modelContext.insert(material)
        try modelContext.save()

        // Fetch and verify
        let descriptor = FetchDescriptor<Material>()
        let materials = try modelContext.fetch(descriptor)

        XCTAssertEqual(materials.count, 1)
        XCTAssertEqual(materials.first?.title, "Persistent Material")
        XCTAssertEqual(materials.first?.textContent, "Some content")
        XCTAssertEqual(materials.first?.processingStatus, .completed)
    }

    func testMaterialRelationship() throws {
        let subject = SubjectEntity(
            localizationKey: "math",
            iconName: "function",
            colorName: "blue",
            sortOrder: 0
        )

        let material = Material(title: "Math Material", subject: subject)

        modelContext.insert(subject)
        modelContext.insert(material)
        try modelContext.save()

        XCTAssertEqual(material.subject?.localizationKey, "math")
        XCTAssertTrue(subject.materials.contains { $0.id == material.id })
    }

    // MARK: - Task Tests

    func testTaskInitialization() throws {
        let task = Task(title: "Test Task", priority: 4)

        XCTAssertNotNil(task.id)
        XCTAssertEqual(task.title, "Test Task")
        XCTAssertFalse(task.isCompleted)
        XCTAssertNil(task.completedAt)
        XCTAssertEqual(task.source, .manual)
        XCTAssertEqual(task.priority, 4)
        XCTAssertNotNil(task.createdAt)
    }

    func testTaskPriorityValidation() throws {
        // Priority clamped to 1-5 range
        let lowTask = Task(title: "Low", priority: -1)
        XCTAssertEqual(lowTask.priority, 1)

        let highTask = Task(title: "High", priority: 10)
        XCTAssertEqual(highTask.priority, 5)

        let normalTask = Task(title: "Normal", priority: 3)
        XCTAssertEqual(normalTask.priority, 3)
    }

    func testTaskCompletion() throws {
        let task = Task(title: "Complete Me")

        XCTAssertFalse(task.isCompleted)
        XCTAssertNil(task.completedAt)

        task.complete()

        XCTAssertTrue(task.isCompleted)
        XCTAssertNotNil(task.completedAt)
        XCTAssertLessThanOrEqual(
            abs(task.completedAt!.timeIntervalSinceNow),
            1.0
        )
    }

    func testTaskUncomplete() throws {
        let task = Task(title: "Complete Me")
        task.complete()

        XCTAssertTrue(task.isCompleted)

        task.uncomplete()

        XCTAssertFalse(task.isCompleted)
        XCTAssertNil(task.completedAt)
    }

    func testTaskIsOverdue() throws {
        // Task without due date
        let taskNoDue = Task(title: "No Due")
        XCTAssertFalse(taskNoDue.isOverdue)

        // Task with past due date
        let pastDate = Calendar.current.date(
            byAdding: .day,
            value: -1,
            to: Date()
        )!
        let overdueTask = Task(title: "Overdue", dueDate: pastDate)
        XCTAssertTrue(overdueTask.isOverdue)

        // Task with future due date
        let futureDate = Calendar.current.date(
            byAdding: .day,
            value: 1,
            to: Date()
        )!
        let futureTask = Task(title: "Future", dueDate: futureDate)
        XCTAssertFalse(futureTask.isOverdue)

        // Completed task should not be overdue
        overdueTask.complete()
        XCTAssertFalse(overdueTask.isOverdue)
    }

    func testTaskIsDueSoon() throws {
        // Task within next 24 hours
        let tomorrow = Calendar.current.date(
            byAdding: .hour,
            value: 12,
            to: Date()
        )!
        let soonTask = Task(title: "Due Soon", dueDate: tomorrow)
        XCTAssertTrue(soonTask.isDueSoon)

        // Task beyond 24 hours
        let laterDate = Calendar.current.date(
            byAdding: .day,
            value: 2,
            to: Date()
        )!
        let laterTask = Task(title: "Due Later", dueDate: laterDate)
        XCTAssertFalse(laterTask.isDueSoon)
    }

    // MARK: - SubjectEntity Tests

    func testSubjectInitialization() throws {
        let subject = SubjectEntity(
            localizationKey: "mathematics",
            iconName: "function",
            colorName: "blue",
            sortOrder: 1
        )

        XCTAssertNotNil(subject.id)
        XCTAssertEqual(subject.localizationKey, "mathematics")
        XCTAssertEqual(subject.iconName, "function")
        XCTAssertEqual(subject.colorName, "blue")
        XCTAssertEqual(subject.sortOrder, 1)
        XCTAssertTrue(subject.isActive)
        XCTAssertFalse(subject.isCustom)
    }

    func testSubjectDisplayName() throws {
        // Custom subject
        let customSubject = SubjectEntity(
            localizationKey: "My Custom Subject",
            iconName: "star",
            colorName: "yellow",
            sortOrder: 0,
            isCustom: true
        )
        XCTAssertEqual(customSubject.displayName, "My Custom Subject")

        // Default subject (would use localization)
        let defaultSubject = SubjectEntity(
            localizationKey: "math",
            iconName: "function",
            colorName: "blue",
            sortOrder: 0
        )
        XCTAssertFalse(defaultSubject.displayName.isEmpty)
    }

    func testSubjectColorMapping() throws {
        let colorTests: [(String, String)] = [
            ("purple", "purple"),
            ("blue", "blue"),
            ("red", "red"),
            ("green", "green"),
            ("orange", "orange"),
            ("yellow", "yellow"),
            ("cyan", "cyan"),
            ("mint", "mint"),
            ("pink", "pink"),
            ("brown", "brown"),
            ("gray", "gray"),
            ("unknown", "gray") // Default
        ]

        for (colorName, _) in colorTests {
            let subject = SubjectEntity(
                localizationKey: "test",
                iconName: "circle",
                colorName: colorName,
                sortOrder: 0
            )
            // Just verify color is not nil
            XCTAssertNotNil(subject.color)
        }
    }

    // MARK: - UserProgress Tests

    func testUserProgressInitialization() throws {
        let progress = UserProgress()

        XCTAssertNotNil(progress.id)
        XCTAssertEqual(progress.totalStudyTimeMinutes, 0)
        XCTAssertEqual(progress.materialsCreated, 0)
        XCTAssertEqual(progress.flashcardsReviewed, 0)
        XCTAssertEqual(progress.tasksCompleted, 0)
        XCTAssertEqual(progress.mindMapsGenerated, 0)
        XCTAssertEqual(progress.currentStreak, 0)
        XCTAssertEqual(progress.longestStreak, 0)
        XCTAssertEqual(progress.totalXP, 0)
        XCTAssertEqual(progress.level, 1)
        XCTAssertTrue(progress.unlockedAchievements.isEmpty)
    }

    func testUserProgressAddXP() throws {
        let progress = UserProgress()

        progress.addXP(50)
        XCTAssertEqual(progress.totalXP, 50)
        XCTAssertEqual(progress.level, 1)

        progress.addXP(60)
        XCTAssertEqual(progress.totalXP, 110)
        XCTAssertEqual(progress.level, 2)

        progress.addXP(100)
        XCTAssertEqual(progress.totalXP, 210)
        XCTAssertEqual(progress.level, 3)
    }

    func testUserProgressLevelProgress() throws {
        let progress = UserProgress()

        // At level 1 with 0 XP
        XCTAssertEqual(progress.levelProgress, 0.0, accuracy: 0.01)

        // Add 50 XP (50% to level 2)
        progress.addXP(50)
        XCTAssertEqual(progress.levelProgress, 0.5, accuracy: 0.01)

        // Add 50 more XP (level up to 2)
        progress.addXP(50)
        XCTAssertEqual(progress.levelProgress, 0.0, accuracy: 0.01)
        XCTAssertEqual(progress.level, 2)
    }

    func testUserProgressUpdateStreak() throws {
        let progress = UserProgress()

        // First study session
        progress.updateStreak()
        XCTAssertEqual(progress.currentStreak, 1)
        XCTAssertEqual(progress.longestStreak, 0)
        XCTAssertNotNil(progress.lastStudyDate)

        // Same day - no change
        progress.updateStreak()
        XCTAssertEqual(progress.currentStreak, 1)

        // Simulate next day
        let tomorrow = Calendar.current.date(
            byAdding: .day,
            value: 1,
            to: Calendar.current.startOfDay(for: Date())
        )!
        progress.lastStudyDate = Calendar.current.date(
            byAdding: .day,
            value: -1,
            to: tomorrow
        )
        progress.updateStreak()
        XCTAssertEqual(progress.currentStreak, 2)
        XCTAssertEqual(progress.longestStreak, 2)

        // Simulate broken streak
        progress.lastStudyDate = Calendar.current.date(
            byAdding: .day,
            value: -5,
            to: Date()
        )
        progress.updateStreak()
        XCTAssertEqual(progress.currentStreak, 1)
    }

    func testUserProgressUnlockAchievement() throws {
        let progress = UserProgress()
        let initialXP = progress.totalXP

        progress.unlockAchievement(.firstMaterial)

        XCTAssertTrue(progress.unlockedAchievements.contains(.firstMaterial))
        XCTAssertEqual(progress.totalXP, initialXP + 50)

        // Unlocking same achievement again doesn't add XP
        progress.unlockAchievement(.firstMaterial)
        XCTAssertEqual(progress.unlockedAchievements.filter { $0 == .firstMaterial }.count, 1)
        XCTAssertEqual(progress.totalXP, initialXP + 50)
    }

    func testUserProgressStreakAchievements() throws {
        let progress = UserProgress()

        // Simulate 7-day streak
        for day in 0..<7 {
            progress.lastStudyDate = Calendar.current.date(
                byAdding: .day,
                value: day - 1,
                to: Calendar.current.startOfDay(for: Date())
            )
            progress.updateStreak()
        }

        XCTAssertTrue(progress.unlockedAchievements.contains(.streak7Days))
    }

    // MARK: - Flashcard Tests

    func testFlashcardInitialization() throws {
        let materialID = UUID()
        let flashcard = Flashcard(
            materialID: materialID,
            question: "What is 2+2?",
            answer: "4"
        )

        XCTAssertNotNil(flashcard.id)
        XCTAssertEqual(flashcard.materialID, materialID)
        XCTAssertEqual(flashcard.question, "What is 2+2?")
        XCTAssertEqual(flashcard.answer, "4")
        XCTAssertEqual(flashcard.easeFactor, 2.5)
        XCTAssertEqual(flashcard.interval, 1)
        XCTAssertEqual(flashcard.repetitions, 0)
        XCTAssertNotNil(flashcard.createdAt)
    }

    func testFlashcardReviewCorrect() throws {
        let flashcard = Flashcard(
            materialID: UUID(),
            question: "Test",
            answer: "Answer"
        )

        // First correct review (quality 5)
        flashcard.review(quality: 5)
        XCTAssertEqual(flashcard.repetitions, 1)
        XCTAssertEqual(flashcard.interval, 1)
        XCTAssertGreaterThan(flashcard.easeFactor, 2.5)

        // Second correct review
        flashcard.review(quality: 5)
        XCTAssertEqual(flashcard.repetitions, 2)
        XCTAssertEqual(flashcard.interval, 6)

        // Third correct review
        let previousEaseFactor = flashcard.easeFactor
        flashcard.review(quality: 4)
        XCTAssertEqual(flashcard.repetitions, 3)
        XCTAssertGreaterThan(flashcard.interval, 6)
        XCTAssertGreaterThan(flashcard.easeFactor, 1.3)
    }

    func testFlashcardReviewIncorrect() throws {
        let flashcard = Flashcard(
            materialID: UUID(),
            question: "Test",
            answer: "Answer"
        )

        // Build up some repetitions
        flashcard.review(quality: 5)
        flashcard.review(quality: 5)
        XCTAssertEqual(flashcard.repetitions, 2)

        // Incorrect review resets
        flashcard.review(quality: 2)
        XCTAssertEqual(flashcard.repetitions, 0)
        XCTAssertEqual(flashcard.interval, 1)
    }

    func testFlashcardIsDue() throws {
        let flashcard = Flashcard(
            materialID: UUID(),
            question: "Test",
            answer: "Answer"
        )

        // Newly created flashcard is due
        XCTAssertTrue(flashcard.isDue)

        // After review, set next review date to future
        flashcard.nextReviewDate = Calendar.current.date(
            byAdding: .day,
            value: 1,
            to: Date()
        )!
        XCTAssertFalse(flashcard.isDue)

        // Set to past date
        flashcard.nextReviewDate = Calendar.current.date(
            byAdding: .day,
            value: -1,
            to: Date()
        )!
        XCTAssertTrue(flashcard.isDue)
    }

    func testFlashcardEaseFactorBounds() throws {
        let flashcard = Flashcard(
            materialID: UUID(),
            question: "Test",
            answer: "Answer"
        )

        // Multiple poor reviews
        for _ in 0..<10 {
            flashcard.review(quality: 0)
        }

        // Ease factor should not go below 1.3
        XCTAssertGreaterThanOrEqual(flashcard.easeFactor, 1.3)
    }

    // MARK: - MindMap Tests

    func testMindMapInitialization() throws {
        let materialID = UUID()
        let mindMap = MindMap(materialID: materialID, prompt: "Test prompt")

        XCTAssertNotNil(mindMap.id)
        XCTAssertEqual(mindMap.materialID, materialID)
        XCTAssertEqual(mindMap.prompt, "Test prompt")
        XCTAssertNotNil(mindMap.generatedAt)
        XCTAssertTrue(mindMap.nodes.isEmpty)
    }

    func testMindMapNodeInitialization() throws {
        let node = MindMapNode(
            title: "Root",
            content: "Main concept",
            positionX: 0,
            positionY: 0,
            color: "blue"
        )

        XCTAssertNotNil(node.id)
        XCTAssertEqual(node.title, "Root")
        XCTAssertEqual(node.content, "Main concept")
        XCTAssertEqual(node.positionX, 0)
        XCTAssertEqual(node.positionY, 0)
        XCTAssertEqual(node.color, "blue")
        XCTAssertNil(node.parentNodeID)
    }

    func testMindMapNodeHierarchy() throws {
        let rootNode = MindMapNode(
            title: "Root",
            positionX: 0,
            positionY: 0
        )

        let childNode = MindMapNode(
            title: "Child",
            positionX: 100,
            positionY: 100,
            parentNodeID: rootNode.id
        )

        XCTAssertNil(rootNode.parentNodeID)
        XCTAssertEqual(childNode.parentNodeID, rootNode.id)
    }

    // MARK: - TrackedDriveFile Tests

    func testTrackedDriveFileInitialization() throws {
        let file = TrackedDriveFile(
            fileID: "test123",
            name: "Test.pdf",
            mimeType: "application/pdf",
            size: 1024
        )

        XCTAssertEqual(file.fileID, "test123")
        XCTAssertEqual(file.name, "Test.pdf")
        XCTAssertEqual(file.mimeType, "application/pdf")
        XCTAssertEqual(file.size, 1024)
        XCTAssertFalse(file.isTrashed)
        XCTAssertEqual(file.status, .unchanged)
    }

    func testTrackedDriveFileComputedProperties() throws {
        let folder = TrackedDriveFile(
            fileID: "folder1",
            name: "My Folder",
            mimeType: "application/vnd.google-apps.folder"
        )
        XCTAssertTrue(folder.isFolder)
        XCTAssertFalse(folder.isPDF)

        let pdf = TrackedDriveFile(
            fileID: "pdf1",
            name: "Document.pdf",
            mimeType: "application/pdf"
        )
        XCTAssertFalse(pdf.isFolder)
        XCTAssertTrue(pdf.isPDF)
        XCTAssertTrue(pdf.isDocument)
    }

    func testTrackedDriveFileHasChanged() throws {
        let file = TrackedDriveFile(
            fileID: "test1",
            name: "Test.pdf",
            mimeType: "application/pdf",
            md5Checksum: "abc123"
        )

        // Create DriveFile with different checksum
        let driveFile = DriveFile(
            id: "test1",
            name: "Test.pdf",
            mimeType: "application/pdf",
            webViewLink: nil,
            thumbnailLink: nil,
            createdTime: nil,
            modifiedTime: nil,
            size: nil,
            parents: nil,
            description: nil,
            md5Checksum: "def456",
            trashed: nil
        )

        XCTAssertTrue(file.hasChanged(comparedTo: driveFile, remoteModifiedDate: nil))

        // Same checksum
        let unchangedDriveFile = DriveFile(
            id: "test1",
            name: "Test.pdf",
            mimeType: "application/pdf",
            webViewLink: nil,
            thumbnailLink: nil,
            createdTime: nil,
            modifiedTime: nil,
            size: nil,
            parents: nil,
            description: nil,
            md5Checksum: "abc123",
            trashed: nil
        )

        XCTAssertFalse(file.hasChanged(comparedTo: unchangedDriveFile, remoteModifiedDate: nil))
    }

    // MARK: - Integration Tests

    func testMaterialFlashcardRelationship() throws {
        let material = Material(title: "Test Material")
        let flashcard = Flashcard(
            materialID: material.id,
            question: "Q",
            answer: "A"
        )

        material.flashcards.append(flashcard)

        modelContext.insert(material)
        modelContext.insert(flashcard)
        try modelContext.save()

        // Verify relationship
        let descriptor = FetchDescriptor<Material>()
        let materials = try modelContext.fetch(descriptor)

        XCTAssertEqual(materials.count, 1)
        XCTAssertEqual(materials.first?.flashcards.count, 1)
        XCTAssertEqual(materials.first?.flashcards.first?.question, "Q")
    }

    func testSubjectMaterialTaskRelationships() throws {
        let subject = SubjectEntity(
            localizationKey: "math",
            iconName: "function",
            colorName: "blue",
            sortOrder: 0
        )

        let material = Material(title: "Math Material", subject: subject)
        let task = Task(title: "Math Task", subject: subject, material: material)

        modelContext.insert(subject)
        modelContext.insert(material)
        modelContext.insert(task)
        try modelContext.save()

        // Verify relationships
        XCTAssertEqual(subject.materials.count, 1)
        XCTAssertEqual(subject.tasks.count, 1)
        XCTAssertEqual(material.tasks.count, 1)
        XCTAssertEqual(task.subject?.localizationKey, "math")
        XCTAssertEqual(task.material?.title, "Math Material")
    }

    func testEmptyStringValidation() throws {
        // Test edge case with empty strings
        let material = Material(title: "")
        XCTAssertEqual(material.title, "")

        let task = Task(title: "", description: "")
        XCTAssertEqual(task.title, "")
        XCTAssertEqual(task.taskDescription, "")
    }

    func testMaximumValueEdgeCases() throws {
        // Test with very long strings
        let longTitle = String(repeating: "A", count: 10000)
        let material = Material(title: longTitle)
        XCTAssertEqual(material.title.count, 10000)

        // Test with maximum priority
        let task = Task(title: "Max Priority", priority: Int.max)
        XCTAssertEqual(task.priority, 5) // Should be clamped

        // Test with minimum priority
        let taskMin = Task(title: "Min Priority", priority: Int.min)
        XCTAssertEqual(taskMin.priority, 1) // Should be clamped
    }
}
