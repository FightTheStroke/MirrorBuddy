# Data Models API Documentation

All data models use SwiftData for persistent storage with proper relationship handling and query optimization.

## Core Models

### Material

Primary study material entity supporting PDFs, text, and Google Drive imports.

**Import**: `import SwiftData`

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `title` | `String` | Material title |
| `createdAt` | `Date` | Creation timestamp |
| `lastAccessedAt` | `Date?` | Last access time |
| `pdfURL` | `URL?` | Local PDF file URL |
| `textContent` | `String?` | Material text content |
| `summary` | `String?` | AI-generated summary |
| `extractedText` | `String` | OCR extracted text |
| `googleDriveFileID` | `String?` | Google Drive file ID |
| `processingStatus` | `ProcessingStatus` | Processing state |
| `subject` | `SubjectEntity?` | Associated subject |
| `mindMap` | `MindMap?` | Mind map relationship |
| `flashcards` | `[Flashcard]?` | Flashcards relationship |
| `tasks` | `[Task]?` | Associated tasks |
| `transcript` | `Transcript?` | Audio transcript |
| `voiceConversations` | `[VoiceConversation]?` | Voice interactions |

#### Processing Status

```swift
enum ProcessingStatus: String, Codable {
    case pending
    case processing
    case completed
    case failed
}
```

#### Initialization

```swift
let material = Material(
    title: "Calculus Chapter 1",
    subject: mathSubject,
    googleDriveFileID: "1abc123..."
)
```

#### Instance Methods

##### `markAccessed()`

Update the last accessed timestamp.

```swift
material.markAccessed()
```

##### `needsReprocessing`

Check if material requires reprocessing.

```swift
if material.needsReprocessing {
    // Reprocess material
}
```

#### Querying Materials

```swift
// Fetch all materials
@Query var materials: [Material]

// Filter by subject
@Query(
    filter: #Predicate<Material> { $0.subject?.name == "Math" }
)
var mathMaterials: [Material]

// Sort by creation date
@Query(
    sort: \Material.createdAt,
    order: .reverse
)
var recentMaterials: [Material]

// Complex query with multiple conditions
@Query(
    filter: #Predicate<Material> { material in
        material.processingStatus == .completed &&
        material.subject?.name == "Physics"
    },
    sort: \Material.lastAccessedAt,
    order: .reverse
)
var completedPhysicsMaterials: [Material]
```

#### Programmatic Queries

```swift
// Using FetchDescriptor
let descriptor = FetchDescriptor<Material>(
    predicate: #Predicate { $0.summary != nil },
    sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
)
let materials = try modelContext.fetch(descriptor)

// With limit
var limitedDescriptor = FetchDescriptor<Material>()
limitedDescriptor.fetchLimit = 10
let recentMaterials = try modelContext.fetch(limitedDescriptor)
```

---

### Flashcard

Spaced repetition flashcard using SuperMemo SM-2 algorithm.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `materialID` | `UUID` | Parent material ID |
| `question` | `String` | Flashcard question |
| `answer` | `String` | Flashcard answer |
| `explanation` | `String?` | Optional explanation |
| `easeFactor` | `Double` | SM-2 ease factor (default: 2.5) |
| `interval` | `Int` | Days until next review |
| `repetitions` | `Int` | Consecutive correct answers |
| `nextReviewDate` | `Date` | Next review date |
| `createdAt` | `Date` | Creation timestamp |
| `lastReviewedAt` | `Date?` | Last review time |
| `material` | `Material?` | Parent material relationship |

#### Initialization

```swift
let flashcard = Flashcard(
    materialID: material.id,
    question: "What is the derivative of x^2?",
    answer: "2x",
    explanation: "Using the power rule: d/dx(x^n) = nx^(n-1)"
)
```

#### Instance Methods

##### `review(quality:)`

Update flashcard based on review performance using SM-2 algorithm.

**Parameters**:
- `quality`: Review quality (0-5 scale)
  - 0 = Complete blackout
  - 1 = Incorrect, but recognized
  - 2 = Incorrect, but almost correct
  - 3 = Correct with difficulty
  - 4 = Correct with hesitation
  - 5 = Perfect response

**Example**:
```swift
flashcard.review(quality: 4)
// Updates: easeFactor, interval, repetitions, nextReviewDate, lastReviewedAt
```

##### `isDue`

Check if flashcard is due for review.

```swift
if flashcard.isDue {
    // Show flashcard for review
}
```

#### Querying Flashcards

```swift
// Fetch due flashcards
@Query(
    filter: #Predicate<Flashcard> { $0.nextReviewDate <= Date() },
    sort: \Flashcard.nextReviewDate
)
var dueFlashcards: [Flashcard]

// Filter by material
@Query(
    filter: #Predicate<Flashcard> { $0.materialID == material.id }
)
var materialFlashcards: [Flashcard]

// Get mastered flashcards
@Query(
    filter: #Predicate<Flashcard> {
        $0.repetitions >= 3 && $0.easeFactor >= 2.5
    }
)
var masteredFlashcards: [Flashcard]
```

---

### MindMap

Hierarchical mind map structure for visual learning.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `title` | `String` | Mind map title |
| `createdAt` | `Date` | Creation timestamp |
| `material` | `Material?` | Parent material |
| `nodes` | Data of `[MindMapNode]` | Encoded node hierarchy |

#### Node Structure

```swift
struct MindMapNode: Codable {
    let id: String
    let text: String
    let level: Int
    let children: [MindMapNode]
    let imageURL: String?
}
```

#### Computed Properties

```swift
// Access nodes as array
var nodesArray: [MindMapNode] {
    // Decodes from stored Data
}
```

---

### SubjectEntity

Subject categorization for materials and tasks.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `name` | `String` | Subject name |
| `color` | `String` | Color hex code |
| `emoji` | `String` | Subject emoji |
| `materials` | `[Material]?` | Associated materials |
| `tasks` | `[Task]?` | Associated tasks |

#### Predefined Subjects

```swift
enum Subject: String, CaseIterable {
    case matematica = "Matematica"
    case italiano = "Italiano"
    case inglese = "Inglese"
    case scienzeNaturali = "Scienze Naturali"
    case storiaGeografia = "Storia e Geografia"
    case fisica = "Fisica"
    case educazioneCivica = "Educazione Civica"
    case religione = "Religione"
    case scienzeMotorie = "Scienze Motorie"
    case sostegno = "Sostegno"
    case other = "Altro"
}
```

---

### Task

Assignment and task tracking with calendar integration.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `title` | `String` | Task title |
| `desc` | `String` | Task description |
| `dueDate` | `Date` | Due date |
| `isCompleted` | `Bool` | Completion status |
| `priority` | `String?` | Priority level |
| `subject` | `SubjectEntity?` | Associated subject |
| `material` | `Material?` | Related material |
| `googleCalendarEventID` | `String?` | Calendar event ID |

#### Initialization

```swift
let task = Task(
    title: "Complete calculus homework",
    desc: "Problems 1-15 from Chapter 3",
    dueDate: Date().addingTimeInterval(86400 * 2)
)
```

#### Querying Tasks

```swift
// Upcoming tasks
@Query(
    filter: #Predicate<Task> {
        !$0.isCompleted && $0.dueDate > Date()
    },
    sort: \Task.dueDate
)
var upcomingTasks: [Task]

// Overdue tasks
@Query(
    filter: #Predicate<Task> {
        !$0.isCompleted && $0.dueDate < Date()
    }
)
var overdueTasks: [Task]

// Completed tasks
@Query(
    filter: #Predicate<Task> { $0.isCompleted }
)
var completedTasks: [Task]
```

---

### UserProgress

Track student learning progress and statistics.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `studyStreak` | `Int` | Current study streak (days) |
| `totalStudyMinutes` | `Int` | Total study time |
| `flashcardsReviewed` | `Int` | Total flashcards reviewed |
| `materialsCompleted` | `Int` | Materials completed |
| `averageScore` | `Double` | Average quiz/test score |
| `lastStudyDate` | `Date?` | Last study session |

---

### VoiceConversation

Store voice conversation history with AI.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `startedAt` | `Date` | Conversation start time |
| `endedAt` | `Date?` | Conversation end time |
| `material` | `Material?` | Related material |
| `messages` | Data of `[Message]` | Conversation messages |

#### Message Structure

```swift
struct Message: Codable {
    let id: String
    let role: String  // "user" or "assistant"
    let content: String
    let timestamp: Date
}
```

---

### Transcript

Audio transcription storage.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `text` | `String` | Transcribed text |
| `audioURL` | `URL?` | Original audio file |
| `createdAt` | `Date` | Creation timestamp |
| `duration` | `TimeInterval` | Audio duration |
| `confidence` | `Double` | Transcription confidence |

---

### TrackedDriveFile

Google Drive file synchronization tracking.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `UUID` | Unique identifier |
| `driveFileID` | `String` | Google Drive file ID |
| `name` | `String` | File name |
| `mimeType` | `String` | MIME type |
| `modifiedTime` | `Date` | Last modified |
| `localMaterialID` | `UUID?` | Linked material ID |
| `syncStatus` | `String` | Sync state |
| `lastSyncedAt` | `Date?` | Last sync time |

---

## Query Best Practices

### Using @Query in SwiftUI

```swift
struct MaterialListView: View {
    @Query(
        filter: #Predicate<Material> { $0.processingStatus == .completed },
        sort: \Material.createdAt,
        order: .reverse
    )
    private var materials: [Material]

    var body: some View {
        List(materials) { material in
            MaterialRow(material: material)
        }
    }
}
```

### Dynamic Queries

```swift
struct FilteredMaterialsView: View {
    let subjectFilter: String?

    @Query private var materials: [Material]

    init(subjectFilter: String?) {
        self.subjectFilter = subjectFilter

        let predicate = if let subject = subjectFilter {
            #Predicate<Material> { $0.subject?.name == subject }
        } else {
            #Predicate<Material> { _ in true }
        }

        _materials = Query(
            filter: predicate,
            sort: \Material.createdAt,
            order: .reverse
        )
    }
}
```

### Complex Relationships

```swift
// Fetch materials with flashcards
let descriptor = FetchDescriptor<Material>(
    predicate: #Predicate { material in
        (material.flashcards?.count ?? 0) > 0
    }
)
let materialsWithFlashcards = try modelContext.fetch(descriptor)

// Fetch materials by subject with tasks
let descriptor = FetchDescriptor<Material>(
    predicate: #Predicate { material in
        material.subject?.name == "Math" &&
        (material.tasks?.count ?? 0) > 0
    },
    sortBy: [SortDescriptor(\.lastAccessedAt, order: .reverse)]
)
```

---

For usage examples, see [EXAMPLES.md](EXAMPLES.md).
