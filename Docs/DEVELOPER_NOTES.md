# MirrorBuddy Developer Notes

Last Updated: 2025-10-19

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Code Patterns](#code-patterns)
4. [Known Issues](#known-issues)
5. [Performance Considerations](#performance-considerations)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)
9. [Git Workflow](#git-workflow)
10. [Resources](#resources)

---

## Architecture Overview

### Tech Stack
- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI
- **Data Persistence**: SwiftData
- **Concurrency**: Async/await, Actors
- **Architecture**: MVVM + Clean Architecture
- **Minimum iOS**: 17.0
- **External APIs**: Google OAuth, Gemini AI, OpenAI Whisper

### Project Structure
```
MirrorBuddy/
├── Core/
│   ├── Models/ - SwiftData models (Material, StudySession, etc.)
│   ├── Services/ - Business logic services
│   ├── API/ - External API clients (Gemini, Gmail, Calendar)
│   └── Extensions/ - Swift extensions
├── Features/
│   ├── Dashboard/ - Main dashboard UI
│   ├── Materials/ - Material management
│   ├── VoiceCommands/ - Voice interaction system
│   ├── HomeworkHelp/ - AI homework assistance
│   └── Tasks/ - Task management
├── Resources/ - Assets, localization
└── MirrorBuddyTests/ - Test suites
```

### Key Design Decisions

#### 1. SwiftUI + SwiftData
**Why**: Modern, declarative UI with built-in persistence
**Benefits**:
- Reactive data binding
- Built-in iCloud sync support
- Type-safe queries
- Reduced boilerplate

**Trade-offs**: iOS 17+ only, learning curve for SwiftData
**Alternatives considered**: Core Data (too verbose), Realm (external dependency)

#### 2. Actor Isolation for Services
**Why**: Thread-safety for concurrent operations without locks
**Pattern**:
```swift
actor MaterialProcessor {
    static let shared = MaterialProcessor()

    func processMaterial(_ url: URL) async throws -> Material {
        // Thread-safe processing
    }
}
```

**Benefits**:
- Automatic synchronization
- No manual lock management
- Clear concurrency boundaries
- Prevents data races

#### 3. Unified Voice System (Task 139)
**Why**: Reduced redundancy from 5 separate voice entry points to 1
**Benefits**:
- 80% UI code reduction
- Consistent UX across all features
- Single source of truth for voice commands
- Easier maintenance

**Implementation**: `UnifiedVoiceManager.swift` + `SmartVoiceButton.swift`

#### 4. Clean Architecture Layers
**Domain Layer**: Models, business logic (Services)
**Presentation Layer**: SwiftUI Views, ViewModels
**Data Layer**: SwiftData persistence, API clients

**Dependency Rule**: Inner layers never depend on outer layers

---

## Development Setup

### Prerequisites
- **Xcode**: 15.0 or later
- **macOS**: Sonoma 14.0 or later
- **SwiftLint**: `brew install swiftlint`
- **API Keys**: Google OAuth, Gemini, OpenAI

### First-Time Setup

```bash
# Clone repository
git clone https://github.com/.../MirrorBuddy.git
cd MirrorBuddy

# Install SwiftLint (if not already installed)
brew install swiftlint

# Configure API keys
cp .env.example .env
# Edit .env with your API keys:
# - GOOGLE_CLIENT_ID
# - GEMINI_API_KEY
# - OPENAI_API_KEY (for Whisper transcription)

# Open project
open MirrorBuddy.xcodeproj

# Build (Cmd+B)
# Run (Cmd+R) - select simulator or device
```

### Environment Configuration

Create `.env` file in project root:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Security Note**: `.env` is gitignored. Never commit API keys to version control.

### API Key Setup

#### Google OAuth (Calendar, Gmail, Drive)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: Calendar API, Gmail API, Drive API
4. Create OAuth 2.0 credentials (iOS app)
5. Add bundle ID: `com.yourcompany.MirrorBuddy`
6. Copy client ID to `.env`

#### Gemini AI
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy to `.env` as `GEMINI_API_KEY`

#### OpenAI (Whisper)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create API key
3. Copy to `.env` as `OPENAI_API_KEY`

### Xcode Configuration

**Schemes**:
- `MirrorBuddy` - Main app scheme
- `MirrorBuddyTests` - Test scheme

**Build Configurations**:
- `Debug` - Development with detailed logging
- `Release` - Optimized for App Store

---

## Code Patterns

### 1. SwiftData Queries

#### Basic Query
```swift
// In Views
@Query(sort: \Material.createdAt, order: .reverse)
private var materials: [Material]
```

#### Filtered Query
```swift
// Static filter
@Query(filter: #Predicate<Material> { $0.subject?.name == "Math" })
private var mathMaterials: [Material]

// With sorting
@Query(
    filter: #Predicate<Material> { $0.isArchived == false },
    sort: \Material.createdAt,
    order: .reverse
)
private var activeMaterials: [Material]
```

#### Dynamic Queries
```swift
@Query private var materials: [Material]

init(subjectFilter: String?) {
    if let subject = subjectFilter {
        _materials = Query(
            filter: #Predicate<Material> { $0.subject?.name == subject },
            sort: \Material.createdAt
        )
    } else {
        _materials = Query(sort: \Material.createdAt)
    }
}
```

#### Complex Predicates
```swift
// Multiple conditions
@Query(filter: #Predicate<Material> { material in
    material.isArchived == false &&
    material.subject?.name == "Physics" &&
    material.createdAt > Date().addingTimeInterval(-7 * 24 * 3600)
})
private var recentPhysicsMaterials: [Material]
```

### 2. Async Service Calls

#### Basic Pattern
```swift
// Always use async/await (never completion handlers)
Task {
    do {
        let material = try await MaterialProcessor.shared.processMaterial(url)
        // Update UI on main actor
        await MainActor.run {
            self.processedMaterial = material
        }
    } catch {
        await MainActor.run {
            self.errorMessage = error.localizedDescription
        }
    }
}
```

#### With Progress Updates
```swift
Task {
    for progress in try await MaterialProcessor.shared.processWithProgress(url) {
        await MainActor.run {
            self.uploadProgress = progress
        }
    }
}
```

#### Cancellation Support
```swift
private var processingTask: Task<Void, Never>?

func startProcessing() {
    processingTask = Task {
        do {
            try await MaterialProcessor.shared.processMaterial(url)
        } catch is CancellationError {
            print("Processing cancelled")
        } catch {
            print("Error: \(error)")
        }
    }
}

func cancelProcessing() {
    processingTask?.cancel()
    processingTask = nil
}
```

### 3. Error Handling

#### Typed Errors
```swift
// Define specific error types
enum MaterialError: LocalizedError {
    case invalidURL
    case unsupportedFormat
    case processingFailed(String)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid material URL"
        case .unsupportedFormat:
            return "File format not supported"
        case .processingFailed(let reason):
            return "Processing failed: \(reason)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// Throw specific errors
guard url.pathExtension.lowercased() == "pdf" else {
    throw MaterialError.unsupportedFormat
}
```

#### Error Recovery
```swift
do {
    let material = try await processMaterial(url)
} catch MaterialError.unsupportedFormat {
    // Show format picker
    showFormatConverter = true
} catch MaterialError.networkError {
    // Retry logic
    try await retryWithBackoff()
} catch {
    // Generic error handling
    showError(error)
}
```

### 4. Voice Command Pattern

#### Register Commands
```swift
// In app initialization
VoiceCommandRegistry.shared.register(
    pattern: "show * materials",
    category: .navigation,
    handler: { params in
        if let subject = params["*"] as? String {
            // Navigate to subject materials
            NavigationManager.shared.showMaterials(subject: subject)
        }
    }
)
```

#### Process Commands via UnifiedVoiceManager
```swift
struct SmartVoiceButton: View {
    @State private var isListening = false

    var body: some View {
        Button(action: handleVoiceInput) {
            Image(systemName: isListening ? "mic.fill" : "mic")
        }
    }

    func handleVoiceInput() {
        Task {
            isListening = true
            defer { isListening = false }

            let result = try await UnifiedVoiceManager.shared.processCommand()
            await MainActor.run {
                // Handle result
            }
        }
    }
}
```

#### Command Patterns
```swift
// Wildcards
"show * materials" → matches "show math materials"
"create flashcard about *" → matches "create flashcard about photosynthesis"

// Optional parameters
"schedule study [session]" → matches both "schedule study" and "schedule study session"

// Intent detection
UnifiedVoiceManager automatically detects:
- Navigation commands
- Creation commands
- Query commands
- Action commands
```

### 5. SwiftData Model Relationships

#### One-to-Many
```swift
@Model
final class Subject {
    var name: String
    @Relationship(deleteRule: .cascade, inverse: \Material.subject)
    var materials: [Material] = []
}

@Model
final class Material {
    var title: String
    var subject: Subject?
}
```

#### Many-to-Many
```swift
@Model
final class Student {
    var name: String
    var subjects: [Subject] = []
}

@Model
final class Subject {
    var name: String
    var students: [Student] = []
}
```

### 6. SwiftUI View Patterns

#### View Composition
```swift
// Break down complex views
struct MaterialCardView: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HeaderView(material: material)
            ContentPreview(material: material)
            ActionButtons(material: material)
        }
    }
}

// Prefer @ViewBuilder for conditional content
@ViewBuilder
func statusBadge(for material: Material) -> some View {
    if material.isArchived {
        Label("Archived", systemImage: "archivebox")
    } else if material.isPriority {
        Label("Priority", systemImage: "star.fill")
    }
}
```

#### Environment Management
```swift
// Share model context
.environment(\.modelContext, modelContext)

// Custom environment values
private struct IsCompactKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var isCompact: Bool {
        get { self[IsCompactKey.self] }
        set { self[IsCompactKey.self] = newValue }
    }
}
```

---

## Known Issues

### 1. WhisperKit API Changes (RESOLVED)
**Issue**: `WhisperKit.modelSearchPath()` deprecated in newer versions
**Status**: ✅ Fixed in commit cc29544
**Solution**: Updated to new API pattern in `WhisperTranscriptionService.swift`
```swift
// Old (deprecated)
let searchPath = WhisperKit.modelSearchPath()

// New (current)
let whisperKit = try await WhisperKit()
let modelPath = whisperKit.modelPath
```

### 2. Dashboard Hardcoded Data (RESOLVED)
**Issue**: TodayCard displayed fake/hardcoded metrics
**Status**: ✅ Fixed in Task 137
**Solution**: Connected to SwiftData (UserProgress, StudySession models)
**Files Modified**: `DashboardView.swift`, `TodayCard.swift`

### 3. SwiftLint Violations
**Issue**: 364/405 violations remaining (90% violation rate)
**Impact**: Non-blocking (warnings only, doesn't prevent builds)
**Priority**: Medium
**Target**: <100 violations (<25%)
**Action**: Run `swiftlint autocorrect` and manual cleanup

**Common Violations**:
- Line length (120 chars)
- Force unwrapping
- Trailing whitespace
- Function body length

### 4. Test Coverage
**Current**: ~60% code coverage
**Target**: 80% overall, 90% for critical services
**Gaps**:
- UI tests (SwiftUI views)
- Integration tests for API clients
- Edge case handling

**Blockers**:
- Some services require better mocking infrastructure
- SwiftData in-memory testing needs refinement

### 5. Flashcard Generation Disabled
**Issue**: Auto-flashcard generation commented out in `MaterialProcessor.swift` (line 159)
**Status**: Task 138 partially complete
**Impact**: Flashcards must be created manually
**Action**: Either complete implementation or remove feature entirely
```swift
// Currently disabled:
// let flashcards = try await FlashcardGenerator.shared.generate(from: material)
```

### 6. Voice Command Cache Size
**Issue**: LRU cache limited to 50 commands
**Impact**: Minimal for typical usage, but frequent users may experience cache misses
**Status**: Acceptable for v1.0
**Future**: Consider dynamic sizing based on available memory

### 7. Google OAuth Token Refresh
**Issue**: Access tokens expire after 1 hour, refresh logic implemented but needs testing
**Status**: In review (Task 61-64)
**Files**: `GoogleOAuthService.swift`, `GoogleCalendarService.swift`, `GmailService.swift`
**Test**: Long-running sessions with Calendar/Gmail access

---

## Performance Considerations

### 1. Material Processing

**Target**: <2s for 10KB documents, <5s for 100KB
**Current**: Meeting targets for most documents

**Optimization Strategies**:
```swift
// Process on background thread
Task.detached(priority: .userInitiated) {
    let processedMaterial = try await MaterialProcessor.shared.processMaterial(url)
    await MainActor.run {
        self.material = processedMaterial
    }
}

// Cache extracted text
actor MaterialProcessor {
    private var textCache: [URL: String] = [:]

    func extractText(from url: URL) async throws -> String {
        if let cached = textCache[url] {
            return cached
        }
        let text = try await performExtraction(url)
        textCache[url] = text
        return text
    }
}
```

**Benchmarks**:
- 1KB document: ~200ms
- 10KB document: ~1.5s
- 100KB document: ~4s
- 1MB document: ~15s (needs optimization)

### 2. Voice Recognition

**Target**: <100ms intent detection, <500ms full transcription
**Current**: ~50ms intent detection (with cache), ~800ms transcription

**Optimizations Implemented** (Task 114):
- LRU cache for common commands (50 entries)
- ~50% latency reduction for cached commands
- Intent classification before full transcription

**Cache Performance**:
```swift
// Cache hit: ~50ms
// Cache miss: ~100ms + transcription time
let result = VoiceCommandCache.shared.getCachedCommand(audioHash)
```

**Future Optimizations**:
- Client-side intent detection (no network)
- Incremental transcription for long audio
- Command prediction based on context

### 3. Database Queries

**Target**: <50ms for common queries
**Current**: <30ms for most queries

**Indexing Strategy**:
```swift
// SwiftData doesn't support explicit indexes yet
// But we can optimize with proper predicates

// Efficient: uses indexed createdAt
@Query(sort: \Material.createdAt, order: .reverse)

// Less efficient: full table scan
@Query(filter: #Predicate<Material> {
    $0.content.contains("photosynthesis")
})
```

**Query Optimization Tips**:
- Use `@Query` with specific predicates (not filtering in view)
- Limit results with `FetchDescriptor.fetchLimit`
- Avoid querying large text fields unless necessary
- Use relationships efficiently (avoid N+1 queries)

### 4. Memory Management

**Target**: <150MB baseline, <300MB with active media
**Current**: ~120MB baseline, ~250MB peak

**Best Practices**:
```swift
// Avoid retain cycles in actors
actor MaterialProcessor {
    func process(completion: @escaping (Material) -> Void) {
        // Bad: captures self strongly
        Task {
            completion(try await self.performProcessing())
        }

        // Good: explicit weak self
        Task { [weak self] in
            guard let self = self else { return }
            completion(try await self.performProcessing())
        }
    }
}

// Lazy load images
struct MaterialCardView: View {
    let material: Material

    var body: some View {
        AsyncImage(url: material.thumbnailURL) { image in
            image.resizable()
        } placeholder: {
            ProgressView()
        }
    }
}

// Limit cache sizes
actor VoiceCommandCache {
    private let maxSize = 50
    private var cache: [String: CachedCommand] = [:]

    func add(_ command: CachedCommand) {
        if cache.count >= maxSize {
            // Evict oldest
            cache.removeValue(forKey: cache.keys.first!)
        }
        cache[command.hash] = command
    }
}
```

### 5. UI Responsiveness

**Target**: 60fps scrolling, <100ms tap response
**Current**: Mostly meeting targets

**SwiftUI Optimization**:
```swift
// Use equatable for large lists
struct MaterialRow: View, Equatable {
    let material: Material

    static func == (lhs: MaterialRow, rhs: MaterialRow) -> Bool {
        lhs.material.id == rhs.material.id
    }

    var body: some View {
        // View content
    }
}

// In parent view
ForEach(materials) { material in
    MaterialRow(material: material)
        .equatable()
}

// Avoid expensive computations in body
struct DashboardView: View {
    let materials: [Material]

    // Good: computed once
    private var recentMaterials: [Material] {
        materials.filter { $0.isRecent }
    }

    var body: some View {
        ForEach(recentMaterials) { material in
            // ...
        }
    }
}
```

---

## Testing Strategy

### Test Organization

```
MirrorBuddyTests/
├── CoreTests/
│   ├── MaterialProcessorTests.swift
│   ├── FlashcardGeneratorTests.swift
│   └── VoiceCommandTests.swift
├── IntegrationTests/
│   ├── DataFlowIntegrationTests.swift
│   └── APIIntegrationTests.swift
├── PerformanceTests/
│   ├── MaterialProcessingBenchmarks.swift
│   └── VoiceRecognitionBenchmarks.swift
├── UITests/
│   └── DashboardUITests.swift
└── README.md - Test documentation
```

### Running Tests

```bash
# All tests
xcodebuild test -scheme MirrorBuddy

# Specific suite
xcodebuild test -scheme MirrorBuddy \
  -only-testing:MirrorBuddyTests/DataFlowIntegrationTests

# With coverage
xcodebuild test -scheme MirrorBuddy -enableCodeCoverage YES

# View coverage report
xcrun xccov view \
  DerivedData/MirrorBuddy/Logs/Test/*.xcresult \
  --report --only-targets
```

### In Xcode
1. **Run all tests**: Cmd+U
2. **Run specific test**: Click diamond next to test method
3. **View coverage**: Editor → Show Code Coverage
4. **Parallel testing**: Scheme → Test → Options → Execute in Parallel

### Test Coverage Goals

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| MaterialProcessor | 70% | 90% | High |
| FlashcardGenerator | 40% | 90% | High |
| VoiceCommandRegistry | 80% | 90% | Medium |
| API Clients (Gemini, etc.) | 50% | 80% | Medium |
| SwiftUI Views | 30% | 50% | Low |
| **Overall** | **60%** | **80%** | High |

### Writing Tests

#### Unit Tests for Services
```swift
import XCTest
@testable import MirrorBuddy

final class MaterialProcessorTests: XCTestCase {
    var processor: MaterialProcessor!

    override func setUp() async throws {
        processor = await MaterialProcessor.shared
    }

    func testMaterialProcessing() async throws {
        let testURL = Bundle(for: type(of: self))
            .url(forResource: "sample", withExtension: "pdf")!

        let material = try await processor.processMaterial(testURL)

        XCTAssertNotNil(material.keywords)
        XCTAssertFalse(material.keywords.isEmpty)
        XCTAssertNotNil(material.summary)
    }

    func testInvalidURL() async {
        let invalidURL = URL(string: "invalid://url")!

        do {
            _ = try await processor.processMaterial(invalidURL)
            XCTFail("Should throw error")
        } catch {
            XCTAssertTrue(error is MaterialError)
        }
    }
}
```

#### Integration Tests with SwiftData
```swift
final class DataFlowIntegrationTests: XCTestCase {
    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() throws {
        // Use in-memory container for isolation
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(
            for: Material.self, Subject.self, Flashcard.self,
            configurations: config
        )
        modelContext = ModelContext(modelContainer)
    }

    func testMaterialToFlashcardFlow() async throws {
        // Create test material
        let material = Material(
            title: "Test Material",
            content: "Photosynthesis is the process..."
        )
        modelContext.insert(material)
        try modelContext.save()

        // Generate flashcards
        let flashcards = try await FlashcardGenerator.shared
            .generate(from: material)

        XCTAssertGreaterThan(flashcards.count, 0)
        XCTAssertEqual(flashcards.first?.material?.id, material.id)
    }
}
```

#### Performance Tests
```swift
final class MaterialProcessingBenchmarks: XCTestCase {
    func testMaterialProcessingPerformance() async throws {
        let testURL = Bundle(for: type(of: self))
            .url(forResource: "large_document", withExtension: "pdf")!

        measure {
            Task {
                _ = try await MaterialProcessor.shared.processMaterial(testURL)
            }
        }

        // Baseline: <2s for 10KB documents
    }
}
```

#### UI Tests (Basic)
```swift
import XCTest

final class DashboardUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testDashboardNavigation() {
        // Verify dashboard loads
        XCTAssertTrue(app.staticTexts["Today"].exists)

        // Tap materials tab
        app.tabBars.buttons["Materials"].tap()

        // Verify materials view
        XCTAssertTrue(app.navigationBars["Materials"].exists)
    }
}
```

### Mocking Best Practices

```swift
// Protocol-based mocking
protocol MaterialProcessing {
    func processMaterial(_ url: URL) async throws -> Material
}

// Production implementation
actor MaterialProcessor: MaterialProcessing {
    // Real implementation
}

// Test mock
class MockMaterialProcessor: MaterialProcessing {
    var mockResult: Material?
    var mockError: Error?

    func processMaterial(_ url: URL) async throws -> Material {
        if let error = mockError {
            throw error
        }
        return mockResult ?? Material(title: "Mock Material")
    }
}

// Use in tests
let mockProcessor = MockMaterialProcessor()
mockProcessor.mockResult = Material(title: "Test")
```

---

## Deployment

### Build Configurations

#### Debug Configuration
- **Purpose**: Development and testing
- **Optimizations**: Disabled for fast builds
- **Logging**: Verbose (all levels)
- **Assertions**: Enabled
- **Testability**: Enabled

#### Release Configuration
- **Purpose**: App Store submission
- **Optimizations**: Full (-O)
- **Logging**: Errors only
- **Assertions**: Disabled
- **Bitcode**: Yes (if required)

### Version Numbering

Follow Semantic Versioning (semver):
- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

Update in Xcode:
1. Select project in navigator
2. Target → General → Identity
3. Update **Version** (1.0.0) and **Build** (1)

### TestFlight Distribution

```bash
# 1. Archive build
xcodebuild archive \
  -scheme MirrorBuddy \
  -configuration Release \
  -archivePath build/MirrorBuddy.xcarchive

# 2. Export for TestFlight
xcodebuild -exportArchive \
  -archivePath build/MirrorBuddy.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist exportOptions.plist

# 3. Upload to App Store Connect
xcrun altool --upload-app \
  --file build/MirrorBuddy.ipa \
  --type ios \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

#### exportOptions.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
</dict>
</plist>
```

### App Store Submission Checklist

**Pre-Submission**:
- [ ] All tests passing (xcodebuild test)
- [ ] SwiftLint violations < 100
- [ ] Code coverage > 80%
- [ ] Performance benchmarks met
- [ ] Memory leaks checked (Instruments)
- [ ] App icons all sizes (20x20 to 1024x1024)
- [ ] Screenshots for all required devices
- [ ] Privacy policy updated and accessible
- [ ] App description and keywords optimized
- [ ] Release notes written (What's New)
- [ ] Version number incremented
- [ ] All third-party licenses documented

**App Store Connect**:
- [ ] Build uploaded via Xcode or altool
- [ ] Build processed and available
- [ ] TestFlight testing completed
- [ ] App Review Information filled
- [ ] Contact information current
- [ ] Age rating set correctly
- [ ] Pricing and availability configured
- [ ] App Privacy details submitted

**Submission**:
- [ ] Submit for Review
- [ ] Monitor App Review status
- [ ] Respond to rejection (if any) within 14 days
- [ ] Release app when approved

### Continuous Integration (Future)

Recommended CI/CD setup with GitHub Actions:

```yaml
name: iOS CI

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and test
        run: |
          xcodebuild test \
            -scheme MirrorBuddy \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -enableCodeCoverage YES
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Troubleshooting

### Build Errors

#### "SwiftLint violations"
**Symptom**: Build succeeds with warnings about code style
**Solution**:
```bash
# Auto-fix many issues
swiftlint autocorrect

# Or disable temporarily
# Build Settings → Other Swift Flags → Add -DDISABLE_SWIFTLINT
```
**Prevention**: Run SwiftLint before committing

#### "Cannot find 'WhisperKit' in scope"
**Symptom**: Build fails with missing WhisperKit
**Solution**:
1. Xcode → File → Add Package Dependencies
2. Search: `https://github.com/argmaxinc/WhisperKit`
3. Add to MirrorBuddy target
4. Clean build folder (Cmd+Shift+K)
5. Rebuild (Cmd+B)

#### "Type 'Material' has no member 'keywords'"
**Symptom**: SwiftData model property not found
**Solution**:
1. Clean build folder (Cmd+Shift+K)
2. Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
3. Rebuild project
4. Check that `@Model` macro is applied to class
5. Verify property is not marked `@Transient`

#### "Signing for MirrorBuddy requires a development team"
**Symptom**: Cannot build without signing certificate
**Solution**:
1. Xcode → MirrorBuddy target → Signing & Capabilities
2. Team: Select your Apple ID or team
3. Bundle Identifier: Make unique (com.yourname.MirrorBuddy)
4. Automatically manage signing: ✓

#### "Failed to load model container"
**Symptom**: App crashes on launch with SwiftData error
**Solution**:
```swift
// Check model definitions
@Model
final class Material {
    // All stored properties must have default values or be initialized
    var title: String = ""
    var content: String = ""
}

// Ensure ModelContainer setup is correct
let container = try ModelContainer(for: Material.self, Subject.self)
```

### Runtime Issues

#### "Google OAuth failed"
**Symptom**: Login fails with OAuth error
**Debugging**:
1. Check `.env` file has correct `GOOGLE_CLIENT_ID`
2. Verify bundle ID matches Google Console configuration
3. Check redirect URI: `com.googleusercontent.apps.YOUR_CLIENT_ID:/oauthredirect`
4. Enable Google APIs in Cloud Console (Calendar, Gmail, Drive)
5. Check Xcode console for specific error messages

**Common Errors**:
- `invalid_client`: Client ID doesn't match
- `redirect_uri_mismatch`: Bundle ID or redirect URI incorrect
- `access_denied`: User denied permissions

#### "Voice commands not recognized"
**Symptom**: Voice button doesn't respond or transcription fails
**Debugging**:
1. Check microphone permissions: Settings → Privacy → Microphone → MirrorBuddy
2. Verify OpenAI API key in `.env`
3. Check network connection
4. Enable verbose logging in `WhisperTranscriptionService.swift`
5. Test with simple command: "show materials"

**Logs to Check**:
```swift
// In WhisperTranscriptionService
print("Transcription result: \(transcription)")
print("Confidence: \(confidence)")
```

#### "Gemini API calls failing"
**Symptom**: Homework help not working
**Debugging**:
1. Verify `GEMINI_API_KEY` in `.env`
2. Check API quota: [Google AI Studio](https://makersuite.google.com/)
3. Test with curl:
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```
4. Check for rate limiting (429 errors)

#### "App crashes on material upload"
**Symptom**: Crash when selecting document
**Debugging**:
1. Check file size (>10MB may cause memory issues)
2. Verify file format is supported (PDF, DOCX, TXT)
3. Enable Exception Breakpoint in Xcode
4. Check console for error messages
5. Test with smaller files first

**Memory Profiling**:
1. Xcode → Product → Profile (Cmd+I)
2. Select "Leaks" instrument
3. Record while uploading material
4. Check for memory leaks or excessive allocations

### Performance Issues

#### "Material processing slow"
**Symptom**: Takes >5s to process small documents
**Solutions**:
1. Check document size: `print("File size: \(data.count / 1024)KB")`
2. Profile with Instruments (Time Profiler)
3. Ensure processing happens on background thread
4. Consider chunked processing for large files:
```swift
// Process in chunks
let chunkSize = 10000 // characters
let chunks = stride(from: 0, to: text.count, by: chunkSize).map {
    String(text[$0..<min($0 + chunkSize, text.count)])
}
for chunk in chunks {
    await processChunk(chunk)
}
```

#### "App uses too much memory"
**Symptom**: Memory usage >300MB or crashes with memory warnings
**Debugging**:
1. Profile with Instruments (Allocations)
2. Check for retain cycles in actors:
```swift
// Look for strong references in closures
Task { [weak self] in
    guard let self = self else { return }
    // ...
}
```
3. Limit cache sizes
4. Release large objects when done
5. Use `autoreleasepool` for batch operations

#### "UI freezing or laggy"
**Symptom**: Scrolling not smooth, taps delayed
**Solutions**:
1. Move expensive work off main thread
2. Use `Task.detached` for heavy computations
3. Profile with Instruments (Time Profiler)
4. Optimize SwiftUI views:
```swift
// Use .equatable() for list items
ForEach(materials) { material in
    MaterialRow(material: material)
        .equatable()
}

// Avoid expensive computations in body
```

### SwiftData Issues

#### "Data not persisting"
**Symptom**: Changes lost after app restart
**Debugging**:
1. Verify `modelContext.save()` is called
2. Check for errors:
```swift
do {
    try modelContext.save()
} catch {
    print("Save error: \(error)")
}
```
3. Ensure models have `@Model` macro
4. Check delete rules on relationships

#### "Relationship not working"
**Symptom**: Related objects not linked
**Solution**:
```swift
// Ensure inverse relationship is set
@Model
final class Material {
    var subject: Subject?
}

@Model
final class Subject {
    @Relationship(deleteRule: .cascade, inverse: \Material.subject)
    var materials: [Material] = []
}
```

#### "Query not updating"
**Symptom**: `@Query` doesn't reflect changes
**Solution**:
1. Ensure changes are saved to context
2. Check predicate syntax
3. Try invalidating query:
```swift
// Force refresh
@Query private var materials: [Material]

// In some action
modelContext.refresh()
```

### Xcode Issues

#### "Xcode running slow"
**Solutions**:
1. Clean build folder: Cmd+Shift+K
2. Delete DerivedData:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```
3. Close other apps
4. Restart Xcode
5. Disable unnecessary indexing: Preferences → Locations → DerivedData → Delete

#### "Simulator not responding"
**Solutions**:
1. Reset simulator: Device → Erase All Content and Settings
2. Restart simulator
3. Delete and reinstall app
4. Try different simulator device

---

## Git Workflow

### Branch Strategy

```
main (production-ready)
  ↑
develop (integration)
  ↑
feature/* (new features)
fix/* (bug fixes)
release/* (release preparation)
hotfix/* (urgent production fixes)
```

#### Branch Types

**main**:
- Production-ready code only
- Protected branch (requires PR + review)
- Tagged releases (v1.0.0, v1.1.0)
- Deployed to App Store

**develop**:
- Integration branch
- All features merge here first
- Must pass CI before merging to main

**feature/***:
- New features or enhancements
- Branch from: `develop`
- Merge to: `develop`
- Naming: `feature/task-70-developer-notes`

**fix/***:
- Bug fixes
- Branch from: `develop` or `main` (hotfix)
- Merge to: `develop` or `main`
- Naming: `fix/voice-command-crash`

**release/***:
- Release preparation (testing, version bumps)
- Branch from: `develop`
- Merge to: `main` and `develop`
- Naming: `release/1.1.0`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance (dependencies, config)
- `perf`: Performance improvements

#### Examples
```bash
# Feature
git commit -m "feat(voice): add voice command caching for 50% latency reduction"

# Bug fix
git commit -m "fix(api): resolve WhisperKit API deprecation warning"

# Documentation
git commit -m "docs(dev): add comprehensive developer notes (Task 70)"

# Breaking change
git commit -m "feat(auth)!: migrate to OAuth 2.0

BREAKING CHANGE: Removed legacy username/password authentication.
Users must re-authenticate with Google OAuth."

# Multiple scopes
git commit -m "chore(deps,config): update dependencies and SwiftLint rules"

# Task reference
git commit -m "feat(dashboard): connect TodayCard to real data (Task 137)"
```

### Pull Request Workflow

1. **Create Branch**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/task-70-developer-notes
```

2. **Make Changes**
```bash
# Work on feature
git add Docs/DEVELOPER_NOTES.md
git commit -m "docs(dev): add architecture and setup sections"

git add Docs/DEVELOPER_NOTES.md
git commit -m "docs(dev): add code patterns and known issues"
```

3. **Keep Updated**
```bash
# Regularly sync with develop
git fetch origin
git rebase origin/develop
```

4. **Push to Remote**
```bash
git push origin feature/task-70-developer-notes
```

5. **Create Pull Request**
```bash
# Using GitHub CLI
gh pr create \
  --base develop \
  --title "feat: Add comprehensive developer notes (Task 70)" \
  --body "Completes Task 70 by creating DEVELOPER_NOTES.md covering:

  - Architecture overview
  - Development setup
  - Code patterns
  - Known issues
  - Performance considerations
  - Testing strategy
  - Deployment
  - Troubleshooting

  Closes #70"
```

6. **Code Review**
- Address review comments
- Push new commits (auto-updates PR)
- Request re-review

7. **Merge**
```bash
# Squash and merge via GitHub UI
# Or command line:
git checkout develop
git merge --squash feature/task-70-developer-notes
git commit -m "feat: add comprehensive developer notes (Task 70)"
git push origin develop
```

8. **Cleanup**
```bash
git branch -d feature/task-70-developer-notes
git push origin --delete feature/task-70-developer-notes
```

### Pre-Commit Checklist

Before committing:
- [ ] Code compiles (Cmd+B) with 0 errors
- [ ] SwiftLint passes (or violations documented)
- [ ] Tests pass (Cmd+U)
- [ ] Documentation updated (if public API changed)
- [ ] Task Master status updated
- [ ] Commit message follows conventional commits
- [ ] No sensitive data (API keys, tokens) in commit

### Pre-Push Checklist

Before pushing:
- [ ] All commits have meaningful messages
- [ ] Branch is up-to-date with base (`git rebase origin/develop`)
- [ ] No merge conflicts
- [ ] Tests pass on all commits
- [ ] Large files excluded (.gitignore)

### Useful Git Commands

```bash
# View commit history
git log --oneline --graph --all

# Amend last commit (if not pushed)
git commit --amend

# Interactive rebase (clean up commits)
git rebase -i HEAD~3

# Stash changes
git stash
git stash pop

# Cherry-pick commit
git cherry-pick <commit-hash>

# Reset to previous commit (careful!)
git reset --hard HEAD~1

# View changes
git diff
git diff --staged

# Blame (find who changed line)
git blame Docs/DEVELOPER_NOTES.md
```

---

## Resources

### Official Documentation

**Apple**:
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [SwiftData Guide](https://developer.apple.com/documentation/swiftdata)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

**Third-Party APIs**:
- [Google APIs (OAuth, Calendar, Gmail)](https://developers.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [WhisperKit GitHub](https://github.com/argmaxinc/WhisperKit)

### Development Tools

**Required**:
- **Xcode** - IDE for iOS development
- **SwiftLint** - Code quality and style enforcement
- **Git** - Version control

**Recommended**:
- **SF Symbols** - Apple's icon library
- **Instruments** - Performance profiling and memory leak detection
- **xcbeautify** - Prettier xcodebuild output (`brew install xcbeautify`)
- **Task Master** - Project task management (see `.taskmaster/CLAUDE.md`)

**Optional**:
- **Charles Proxy** - Network debugging
- **Postman** - API testing
- **Figma** - UI/UX design reference
- **GitHub CLI** (`gh`) - PR management from terminal

### Task Master Integration

**Documentation**:
- [Task Master CLAUDE.md](.taskmaster/CLAUDE.md) - Full integration guide
- [Task Master README](https://github.com/taskmaster-ai/task-master-ai) - Official documentation

**Essential Commands**:
```bash
task-master list                          # Show all tasks
task-master next                          # Get next task
task-master show <id>                    # View task details
task-master set-status --id=<id> --status=done
task-master update-task --id=<id> --prompt="notes"
```

**MCP Integration**:
Task Master MCP server configured in `.mcp.json` provides AI-powered task management directly in Claude Code conversations.

### Learning Resources

**SwiftUI**:
- [Hacking with Swift](https://www.hackingwithswift.com/)
- [Apple SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [SwiftUI Lab](https://swiftui-lab.com/)

**SwiftData**:
- [WWDC23: Meet SwiftData](https://developer.apple.com/videos/play/wwdc2023/10187/)
- [Donny Wals SwiftData Guide](https://www.donnywals.com/swiftdata/)

**Swift Concurrency**:
- [WWDC21: Meet async/await](https://developer.apple.com/videos/play/wwdc2021/10132/)
- [Swift by Sundell - Async/await](https://www.swiftbysundell.com/articles/async-await/)

### Code Style Guides

- [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- [Google Swift Style Guide](https://google.github.io/swift/)
- [Ray Wenderlich Swift Style Guide](https://github.com/raywenderlich/swift-style-guide)

### Community

- [Swift Forums](https://forums.swift.org/)
- [iOS Developers Slack](https://ios-developers.io/)
- [r/iOSProgramming](https://www.reddit.com/r/iOSProgramming/)
- [Stack Overflow - Swift](https://stackoverflow.com/questions/tagged/swift)

---

## Appendix

### Common SwiftData Patterns

```swift
// Create
let material = Material(title: "New Material")
modelContext.insert(material)
try modelContext.save()

// Read (query in view)
@Query(sort: \Material.createdAt) var materials: [Material]

// Update
material.title = "Updated Title"
try modelContext.save()

// Delete
modelContext.delete(material)
try modelContext.save()

// Relationship (one-to-many)
let subject = Subject(name: "Math")
material.subject = subject
try modelContext.save()
```

### Voice Command Examples

```
Navigation:
- "show materials"
- "show math materials"
- "go to dashboard"
- "open homework help"

Creation:
- "create flashcard about [topic]"
- "add material from [source]"
- "schedule study session"

Queries:
- "what's my progress today"
- "show recent materials"
- "list upcoming tasks"

Actions:
- "start study session"
- "review flashcards"
- "mark task as done"
```

### Environment Variables Reference

```env
# Google OAuth (required for Calendar, Gmail, Drive)
GOOGLE_CLIENT_ID=your_google_client_id_here

# Gemini AI (required for homework help)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI (required for Whisper transcription)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Logging level
LOG_LEVEL=debug  # debug, info, warning, error
```

### File Size Limits

- **Materials**: 50MB max per file
- **Images**: 10MB max
- **Audio (voice)**: 5MB max (~5 minutes)
- **Database**: No enforced limit (SwiftData managed)

### API Rate Limits

- **Gemini**: 60 requests/minute
- **OpenAI Whisper**: 50 requests/minute
- **Google Calendar**: 1000 requests/100 seconds
- **Gmail**: 250 quota units/user/second

### Supported File Formats

**Materials**:
- Documents: PDF, DOCX, DOC, TXT, MD
- Images: PNG, JPG, JPEG, HEIC
- Presentations: PPTX, PPT (limited support)

**Export**:
- Flashcards: JSON, CSV
- Study sessions: JSON
- Reports: PDF, JSON

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-19
**Maintained By**: MirrorBuddy Development Team
**Next Review**: 2025-11-19 (monthly updates recommended)

---

## Changelog

### Version 1.0.0 (2025-10-19)
- Initial comprehensive developer notes created
- Documented architecture, setup, patterns, and workflows
- Added troubleshooting guide and testing strategy
- Included deployment procedures and git workflow
- Task 70 completed
