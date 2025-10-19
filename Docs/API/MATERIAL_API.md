# Material API Documentation

Material query, processing, and management APIs for intelligent content organization.

## Material Query Services

### MaterialQueryParser

Parse voice commands and queries to find specific materials.

#### Supported Query Formats

| Format | Example | Description |
|--------|---------|-------------|
| UUID | `"a1b2c3d4-..."` | Direct material ID |
| Last by Subject | `"last:math"` | Latest material in subject |
| Newest | `"newest"` or `"ultimo"` | Most recent material |
| Title Match | `"title:Calculus"` | Material with title containing text |
| Direct Title | `"Geometry Notes"` | Case-insensitive title search |

#### Public Interface

##### `findMaterial(query:in:subjects:)`

Find material matching a query.

**Signature**:
```swift
static func findMaterial(
    query: String,
    in materials: [Material],
    subjects: [SubjectEntity]
) -> UUID?
```

**Returns**: Material ID if found

**Example**:
```swift
// Find by UUID
let materialID = MaterialQueryParser.findMaterial(
    query: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    in: allMaterials,
    subjects: allSubjects
)

// Find last math material
let mathID = MaterialQueryParser.findMaterial(
    query: "last:math",
    in: allMaterials,
    subjects: allSubjects
)

// Find newest material
let newestID = MaterialQueryParser.findMaterial(
    query: "newest",
    in: allMaterials,
    subjects: allSubjects
)

// Find by title
let calcID = MaterialQueryParser.findMaterial(
    query: "title:Calculus",
    in: allMaterials,
    subjects: allSubjects
)
```

##### `findMaterialsWithNaturalLanguage(query:in:subjects:)`

Find materials using AI-powered natural language queries.

**Signature**:
```swift
static func findMaterialsWithNaturalLanguage(
    query: String,
    in materials: [Material],
    subjects: [SubjectEntity]
) async -> [Material]
```

**Returns**: Array of materials sorted by relevance

**Example - Natural Language Queries**:
```swift
// Complex query with intent
let strugglingMaterials = await MaterialQueryParser.findMaterialsWithNaturalLanguage(
    query: "materials I struggled with in math last week",
    in: allMaterials,
    subjects: allSubjects
)

// Subject and date filter
let recentPhysics = await MaterialQueryParser.findMaterialsWithNaturalLanguage(
    query: "recent physics materials from this month",
    in: allMaterials,
    subjects: allSubjects
)

// Difficulty-based query
let hardMaterials = await MaterialQueryParser.findMaterialsWithNaturalLanguage(
    query: "show me the most difficult materials",
    in: allMaterials,
    subjects: allSubjects
)
```

---

### SmartQueryParser

AI-powered natural language query parser for complex material searches.

**Singleton**: `SmartQueryParser.shared`

#### Query Components

```swift
struct ParsedQuery {
    let intent: QueryIntent
    let filters: [QueryFilter]
    let sortOrder: SortOrder
    let context: [String: Any]
}

enum QueryIntent {
    case show              // Display materials
    case filter            // Filter by criteria
    case search            // Text search
    case analyze           // Analyze materials
}

enum QueryFilter {
    case subject(String)
    case dateRange(Date, Date)
    case difficulty(DifficultyLevel)
    case status(ProcessingStatus)
    case hasFlashcards
    case hasMindMap
    case recentlyAccessed(Int)  // days
}

enum SortOrder {
    case createdAt(ascending: Bool)
    case lastAccessed(ascending: Bool)
    case title(ascending: Bool)
    case relevance
}
```

#### Public Interface

##### `parse(_:)`

Parse natural language query into structured components.

**Signature**:
```swift
func parse(_ query: String) async throws -> ParsedQuery
```

**Example**:
```swift
let parsed = try await SmartQueryParser.shared.parse(
    "show my difficult math materials from last week with flashcards"
)

print("Intent: \(parsed.intent)")
// Intent: show

print("Filters: \(parsed.filters)")
// Filters: [.subject("Math"), .difficulty(.hard),
//           .dateRange(...), .hasFlashcards]

print("Sort: \(parsed.sortOrder)")
// Sort: .createdAt(ascending: false)
```

**Query Examples**:

```swift
// Subject filtering
"show all physics materials"
→ intent: .show, filters: [.subject("Physics")]

// Date range
"materials from last month"
→ intent: .show, filters: [.dateRange(lastMonth, now)]

// Difficulty + subject
"difficult calculus topics"
→ intent: .filter, filters: [.difficulty(.hard), .subject("Math")]

// Recently accessed
"materials I viewed this week"
→ intent: .show, filters: [.recentlyAccessed(7)]

// Combined filters
"completed physics materials with mind maps from September"
→ filters: [.subject("Physics"), .hasMindMap, .status(.completed), .dateRange(...)]
```

---

## Material Processing Services

### MaterialTextExtractionService

Extract text content from various file formats.

**Singleton**: `MaterialTextExtractionService.shared`

#### Public Interface

##### `extractText(from:)`

Extract text from file URL.

**Signature**:
```swift
func extractText(from url: URL) async throws -> String
```

**Supported Formats**:
- PDF (.pdf)
- Plain text (.txt)
- Markdown (.md)
- Word documents (.docx)
- Images with OCR (.jpg, .png, .heic)

**Example**:
```swift
let text = try await MaterialTextExtractionService.shared.extractText(
    from: pdfURL
)
material.textContent = text
```

##### `extractTextFromPDF(_:)`

Specific PDF text extraction.

**Signature**:
```swift
func extractTextFromPDF(_ url: URL) async throws -> String
```

##### `extractTextFromImage(_:)`

OCR-based image text extraction.

**Signature**:
```swift
func extractTextFromImage(_ imageData: Data) async throws -> String
```

---

### PDFTextExtractionService

Specialized PDF text extraction with layout preservation.

**Singleton**: `PDFTextExtractionService.shared`

#### Public Interface

##### `extractText(from:preserveLayout:)`

Extract text from PDF with optional layout preservation.

**Signature**:
```swift
func extractText(
    from url: URL,
    preserveLayout: Bool = false
) async throws -> String
```

**Example**:
```swift
// Simple text extraction
let text = try await PDFTextExtractionService.shared.extractText(
    from: pdfURL
)

// Preserve layout (tables, columns)
let layoutText = try await PDFTextExtractionService.shared.extractText(
    from: pdfURL,
    preserveLayout: true
)
```

##### `extractPages(from:pageRange:)`

Extract specific pages from PDF.

**Signature**:
```swift
func extractPages(
    from url: URL,
    pageRange: Range<Int>
) async throws -> String
```

**Example**:
```swift
// Extract pages 5-10
let text = try await PDFTextExtractionService.shared.extractPages(
    from: pdfURL,
    pageRange: 5..<11
)
```

---

### SubjectDetectionService

Automatic subject classification for materials.

**Singleton**: `SubjectDetectionService.shared`

#### Public Interface

##### `detectSubject(from:)`

Detect subject from material content.

**Signature**:
```swift
func detectSubject(from text: String) async throws -> Subject
```

**Example**:
```swift
let subject = try await SubjectDetectionService.shared.detectSubject(
    from: material.textContent ?? material.title
)
material.subject = SubjectEntity(from: subject)
```

##### `detectSubjectWithConfidence(from:)`

Detect subject with confidence scoring.

**Signature**:
```swift
func detectSubjectWithConfidence(
    from text: String
) async throws -> (Subject, Double)
```

**Returns**: Tuple of (detected subject, confidence 0.0-1.0)

**Example**:
```swift
let (subject, confidence) = try await SubjectDetectionService.shared
    .detectSubjectWithConfidence(from: text)

if confidence > 0.8 {
    material.subject = SubjectEntity(from: subject)
} else {
    // Prompt user for confirmation
}
```

---

### TextPreprocessingService

Text cleaning and normalization for processing.

**Singleton**: `TextPreprocessingService.shared`

#### Public Interface

##### `preprocess(_:)`

Clean and normalize text.

**Signature**:
```swift
func preprocess(_ text: String) -> String
```

**Operations**:
- Remove extra whitespace
- Normalize line endings
- Fix encoding issues
- Remove control characters
- Standardize punctuation

**Example**:
```swift
let cleanText = TextPreprocessingService.shared.preprocess(rawText)
```

##### `extractKeywords(from:maxCount:)`

Extract important keywords from text.

**Signature**:
```swift
func extractKeywords(from text: String, maxCount: Int = 10) async throws -> [String]
```

**Example**:
```swift
let keywords = try await TextPreprocessingService.shared.extractKeywords(
    from: material.textContent ?? "",
    maxCount: 15
)
material.keywords = keywords
```

---

## Material Organization

### SubjectService

Manage subjects and categorization.

**Singleton**: `SubjectService.shared`

#### Public Interface

##### `createSubject(name:color:emoji:)`

Create a new subject.

**Signature**:
```swift
func createSubject(
    name: String,
    color: String,
    emoji: String
) throws -> SubjectEntity
```

**Example**:
```swift
let mathSubject = try SubjectService.shared.createSubject(
    name: "Advanced Calculus",
    color: "#FF5733",
    emoji: "📐"
)
```

##### `getAllSubjects()`

Get all subjects.

**Signature**:
```swift
func getAllSubjects() throws -> [SubjectEntity]
```

##### `getMaterials(for:)`

Get all materials for a subject.

**Signature**:
```swift
func getMaterials(for subject: SubjectEntity) throws -> [Material]
```

**Example**:
```swift
let mathMaterials = try SubjectService.shared.getMaterials(for: mathSubject)
print("Math materials: \(mathMaterials.count)")
```

---

## Google Drive Integration

### GoogleDriveDownloadService

Download and import materials from Google Drive.

**Singleton**: `GoogleDriveDownloadService.shared`

#### Public Interface

##### `downloadAndImport(fileID:)`

Download Drive file and create material.

**Signature**:
```swift
func downloadAndImport(fileID: String) async throws -> Material
```

**Example**:
```swift
let material = try await GoogleDriveDownloadService.shared.downloadAndImport(
    fileID: "1abc123xyz"
)
print("Imported: \(material.title)")
```

##### `downloadBatch(fileIDs:progressHandler:)`

Download multiple Drive files with progress tracking.

**Signature**:
```swift
func downloadBatch(
    fileIDs: [String],
    progressHandler: @escaping (Int, Int) -> Void
) async throws -> [Material]
```

**Example**:
```swift
let materials = try await GoogleDriveDownloadService.shared.downloadBatch(
    fileIDs: driveFileIDs,
    progressHandler: { completed, total in
        print("Progress: \(completed)/\(total)")
    }
)
```

---

### DriveFileService

Manage Google Drive file tracking.

**Singleton**: `DriveFileService.shared`

#### Public Interface

##### `trackFile(_:)`

Start tracking a Drive file for sync.

**Signature**:
```swift
func trackFile(_ driveFile: DriveFile) throws -> TrackedDriveFile
```

##### `getTrackedFiles()`

Get all tracked Drive files.

**Signature**:
```swift
func getTrackedFiles() throws -> [TrackedDriveFile]
```

##### `updateSyncStatus(fileID:status:)`

Update file sync status.

**Signature**:
```swift
func updateSyncStatus(fileID: String, status: String) throws
```

---

## Advanced Querying

### Complex Material Queries

```swift
// Materials with flashcards, sorted by last accessed
@Query(
    filter: #Predicate<Material> { material in
        (material.flashcards?.count ?? 0) > 0
    },
    sort: \Material.lastAccessedAt,
    order: .reverse
)
var materialsWithFlashcards: [Material]

// Completed materials from last 7 days
@Query(
    filter: #Predicate<Material> { material in
        material.processingStatus == .completed &&
        material.createdAt > Calendar.current.date(
            byAdding: .day,
            value: -7,
            to: Date()
        )!
    },
    sort: \Material.createdAt,
    order: .reverse
)
var recentCompletedMaterials: [Material]

// Materials by subject with mind map
@Query(
    filter: #Predicate<Material> { material in
        material.subject?.name == "Physics" &&
        material.mindMap != nil
    }
)
var physicsMaterialsWithMindMap: [Material]
```

### Programmatic Queries

```swift
// Dynamic subject filtering
func getMaterials(subject: String?) throws -> [Material] {
    let predicate: Predicate<Material>

    if let subject = subject {
        predicate = #Predicate { $0.subject?.name == subject }
    } else {
        predicate = #Predicate { _ in true }
    }

    let descriptor = FetchDescriptor<Material>(
        predicate: predicate,
        sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
    )

    return try modelContext.fetch(descriptor)
}

// Search by title or content
func searchMaterials(query: String) throws -> [Material] {
    let descriptor = FetchDescriptor<Material>(
        predicate: #Predicate { material in
            material.title.localizedStandardContains(query) ||
            (material.textContent ?? "").localizedStandardContains(query)
        }
    )

    return try modelContext.fetch(descriptor)
}
```

---

For complete examples, see [EXAMPLES.md](EXAMPLES.md).
