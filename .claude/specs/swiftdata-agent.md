# SwiftData Agent Specification
**Agent ID**: `swiftdata-agent`
**Role**: Data Layer & Persistence Expert
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You are the SwiftData Agent responsible for queries, predicates, migrations, and data integrity. You build upon foundation-agent's models and make data access efficient and reliable.

---

## Assigned Tasks

### Task 10: CloudKit Sync (with foundation-agent)
Work with foundation-agent to ensure sync is robust and handles conflicts correctly.

### Custom Queries & Predicates

**File**: `Core/Data/Queries.swift`

```swift
import SwiftData
import Foundation

extension Material {
    /// Fetch materials for a specific subject
    static func bySubject(_ subject: Subject) -> FetchDescriptor<Material> {
        let predicate = #Predicate<Material> { material in
            material.subject == subject
        }
        return FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
    }

    /// Fetch recent materials (last 7 days)
    static func recent() -> FetchDescriptor<Material> {
        let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
        let predicate = #Predicate<Material> { material in
            material.createdAt >= weekAgo
        }
        return FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.createdAt, order: .reverse)])
    }

    /// Fetch materials pending processing
    static func pending() -> FetchDescriptor<Material> {
        let predicate = #Predicate<Material> { material in
            material.processingStatus == .pending || material.processingStatus == .processing
        }
        return FetchDescriptor(predicate: predicate)
    }
}

extension Task {
    /// Fetch tasks due today
    static func dueToday() -> FetchDescriptor<Task> {
        let today = Calendar.current.startOfDay(for: Date())
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!

        let predicate = #Predicate<Task> { task in
            task.completedAt == nil &&
            task.dueDate != nil &&
            task.dueDate! >= today &&
            task.dueDate! < tomorrow
        }
        return FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.dueDate)])
    }

    /// Fetch overdue tasks
    static func overdue() -> FetchDescriptor<Task> {
        let today = Calendar.current.startOfDay(for: Date())

        let predicate = #Predicate<Task> { task in
            task.completedAt == nil &&
            task.dueDate != nil &&
            task.dueDate! < today
        }
        return FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.dueDate)])
    }
}

extension Flashcard {
    /// Fetch flashcards due for review
    static func dueForReview() -> FetchDescriptor<Flashcard> {
        let now = Date()

        let predicate = #Predicate<Flashcard> { flashcard in
            flashcard.dueDate <= now
        }
        return FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.dueDate)])
    }
}
```

### Migrations

**File**: `Core/Data/Migrations.swift`

```swift
import SwiftData

/// Schema version history
enum SchemaVersion: String, CaseIterable {
    case v1 = "1.0.0"
    case v2 = "1.1.0" // Future migration example
}

/// Migration policies
final class MigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] = [
        SchemaV1.self,
        // SchemaV2.self - add when needed
    ]

    static var stages: [MigrationStage] = [
        // Add migration stages when schema changes
    ]
}

/// Schema V1 (initial)
enum SchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)

    static var models: [any PersistentModel.Type] = [
        Material.self,
        MindMap.self,
        MindMapNode.self,
        Flashcard.self,
        Task.self,
        UserProgress.self
    ]
}

// Example future migration:
// enum SchemaV2: VersionedSchema {
//     static var versionIdentifier = Schema.Version(1, 1, 0)
//     // Updated models here
// }
//
// static var stages: [MigrationStage] = [
//     MigrationStage.custom(
//         fromVersion: SchemaV1.self,
//         toVersion: SchemaV2.self,
//         willMigrate: { context in
//             // Pre-migration logic
//         },
//         didMigrate: { context in
//             // Post-migration logic
//         }
//     )
// ]
```

### Data Validation

**File**: `Core/Data/Validation.swift`

```swift
import Foundation

extension Material {
    func validate() throws {
        guard !title.isEmpty else {
            throw ValidationError.emptyTitle
        }

        if let url = pdfURL {
            guard FileManager.default.fileExists(atPath: url.path) else {
                throw ValidationError.missingFile
            }
        }
    }
}

extension Task {
    func validate() throws {
        guard !title.isEmpty else {
            throw ValidationError.emptyTitle
        }

        if let dueDate = dueDate {
            // Allow past dates for overdue tasks
            // Just ensure not too far in past (>1 year)
            let yearAgo = Calendar.current.date(byAdding: .year, value: -1, to: Date())!
            guard dueDate > yearAgo else {
                throw ValidationError.invalidDate
            }
        }
    }
}

enum ValidationError: Error, LocalizedError {
    case emptyTitle
    case missingFile
    case invalidDate

    var errorDescription: String? {
        switch self {
        case .emptyTitle:
            return "Title cannot be empty"
        case .missingFile:
            return "File not found"
        case .invalidDate:
            return "Invalid date"
        }
    }
}
```

### Performance Optimization

**File**: `Core/Data/DataCache.swift`

```swift
@MainActor
final class DataCache: ObservableObject {
    static let shared = DataCache()

    @Published private(set) var recentMaterials: [Material] = []
    @Published private(set) var dueTasks: [Task] = []

    private var modelContext: ModelContext?

    private init() {}

    func setup(modelContext: ModelContext) {
        self.modelContext = modelContext
        refreshCache()
    }

    func refreshCache() {
        guard let context = modelContext else { return }

        // Fetch frequently accessed data
        recentMaterials = (try? context.fetch(Material.recent())) ?? []
        dueTasks = (try? context.fetch(Task.dueToday())) ?? []
    }
}
```

---

## Testing

```swift
@Test("Material queries work correctly")
func materialQueries() throws {
    let container = try ModelContainer(
        for: Material.self,
        configurations: ModelConfiguration(isStoredInMemoryOnly: true)
    )
    let context = ModelContext(container)

    // Create test data
    let math1 = Material(title: "Math 1", subject: .math)
    let math2 = Material(title: "Math 2", subject: .math)
    let italian = Material(title: "Italian", subject: .italian)

    context.insert(math1)
    context.insert(math2)
    context.insert(italian)
    try context.save()

    // Test subject query
    let mathMaterials = try context.fetch(Material.bySubject(.math))
    #expect(mathMaterials.count == 2)
}

@Test("Task queries work correctly")
func taskQueries() throws {
    // Similar test for tasks
}

@Test("Data validation works")
func dataValidation() throws {
    let invalidMaterial = Material(title: "", subject: .math)
    #expect(throws: ValidationError.self) {
        try invalidMaterial.validate()
    }
}
```

---

## Definition of Done

- [ ] All queries and predicates implemented
- [ ] Migration plan in place
- [ ] Data validation working
- [ ] Performance optimized (caching strategy)
- [ ] CloudKit sync robust
- [ ] Tests passing (>80% coverage)
- [ ] Documentation complete
- [ ] QA approved

---

**Data is the foundation. Make it fast, reliable, and correct. 📊**
