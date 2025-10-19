# MirrorBuddy Test Suite

Comprehensive test suite for MirrorBuddy iOS application, ensuring code quality, reliability, and performance.

## Test Coverage Overview

### Current Status
- **Overall Coverage**: ~60% (target achieved from baseline 40%)
- **Core Services**: 55%
- **UI Components**: 25%
- **Integration Tests**: 40%
- **Performance Benchmarks**: New (8 benchmarks added)

### Coverage by Module
| Module | Coverage | Test Files |
|--------|----------|------------|
| Material Processing | 65% | MaterialProcessorTests, ProcessingPipelineTests |
| Voice Commands | 70% | VoiceConversationViewModelTests, VoiceCommandRecognitionTests |
| Flashcard System | 60% | FlashcardGeneratorTests, SM-2 Algorithm Tests |
| API Clients | 55% | APIClientTests, GeminiClientTests, GoogleWorkspaceClientTests |
| Resilience Utilities | 93% | CircuitBreakerTests, RetryableTaskTests, FallbackTests |
| Google Services | 45% | GoogleOAuthServiceTests, DriveFileServiceTests |
| Study Views | 98%+ | StudyViewTests |

## Test Organization

### Directory Structure

```
MirrorBuddyTests/
├── README.md (this file)
├── IntegrationTests/
│   └── DataFlowIntegrationTests.swift       # End-to-end data flow tests
├── PerformanceTests/
│   ├── PerformanceTests.swift              # General performance tests
│   └── CoreServicesPerformanceTests.swift  # Core service benchmarks (NEW)
├── Core Tests/
│   ├── APIClientTests.swift
│   ├── CircuitBreakerTests.swift
│   ├── RetryableTaskTests.swift
│   ├── FallbackTests.swift
│   ├── ErrorAnalyticsTests.swift
│   └── KeychainManagerTests.swift
├── Service Tests/
│   ├── GeminiClientTests.swift
│   ├── GoogleOAuthServiceTests.swift
│   ├── GoogleWorkspaceClientTests.swift
│   ├── OpenAIClientTests.swift
│   └── ProcessingPipelineTests.swift
├── ViewModel Tests/
│   ├── VoiceConversationViewModelTests.swift
│   ├── StudyViewTests.swift
│   └── UpdateManagerTests.swift
└── Model Tests/
    ├── ModelTests.swift
    └── AccessibilityTests.swift
```

### Test Categories

#### 1. Unit Tests
Test individual components in isolation with mocked dependencies.

**Examples:**
- `APIClientTests.swift` - API client functionality
- `CircuitBreakerTests.swift` - Circuit breaker pattern
- `ModelTests.swift` - Data model validation
- `VoiceConversationViewModelTests.swift` - Voice conversation logic

#### 2. Integration Tests
Test interactions between multiple components and data flows.

**File:** `IntegrationTests/DataFlowIntegrationTests.swift`

**Test Cases:**
1. Material Creation → Flashcard Generation Flow
2. Voice Command Detection → Intent Execution Flow
3. Study Session → Progress Tracking Flow
4. Material Processing Status Lifecycle
5. Subject-Material-Flashcard Hierarchy
6. Google Drive Integration Flow

#### 3. Performance Tests
Benchmark critical operations and ensure performance targets.

**Files:**
- `PerformanceTests/PerformanceTests.swift` - General benchmarks
- `PerformanceTests/CoreServicesPerformanceTests.swift` - Core service benchmarks

**Benchmarks:**
1. Material Text Extraction (< 500ms for 10K words)
2. Flashcard Generation (< 1s for 1K words)
3. Voice Command Intent Detection (< 10ms per command)
4. Database Query Performance (< 50ms for 100 materials)
5. Flashcard Review Algorithm (< 1ms per review)
6. Bulk Material Creation (< 2s for 1000 materials)
7. Complex Relationship Queries (< 100ms)
8. Material Access Tracking (< 5ms)

## Running Tests

### Command Line

#### Run All Tests
```bash
# Using xcodebuild
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Using swift test (for Swift package tests)
swift test
```

#### Run Specific Test Suite
```bash
# Run only integration tests
xcodebuild test -scheme MirrorBuddy \
  -only-testing:MirrorBuddyTests/DataFlowIntegrationTests \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Run only performance tests
xcodebuild test -scheme MirrorBuddy \
  -only-testing:MirrorBuddyTests/CoreServicesPerformanceTests \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Run specific test method
xcodebuild test -scheme MirrorBuddy \
  -only-testing:MirrorBuddyTests/DataFlowIntegrationTests/testMaterialToFlashcardGenerationFlow \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

#### Run with Code Coverage
```bash
# Enable code coverage
xcodebuild test -scheme MirrorBuddy \
  -enableCodeCoverage YES \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Generate coverage report
xcrun xccov view --report \
  ~/Library/Developer/Xcode/DerivedData/MirrorBuddy-*/Logs/Test/*.xcresult
```

### Xcode IDE

1. **Run All Tests**: `⌘U`
2. **Run Single Test**: Click diamond icon next to test method
3. **View Coverage**: `⌘9` → Coverage tab
4. **Test Navigator**: `⌘6` → Shows all test suites

### CI/CD Integration

Tests are automatically run on:
- Every pull request
- Merge to main branch
- Nightly builds

**GitHub Actions Workflow:**
```yaml
- name: Run Tests
  run: |
    xcodebuild test \
      -scheme MirrorBuddy \
      -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
      -enableCodeCoverage YES
```

## Writing Tests

### Unit Test Template

```swift
import XCTest
@testable import MirrorBuddy

final class MyFeatureTests: XCTestCase {

    // MARK: - Setup/Teardown

    override func setUp() async throws {
        try await super.setUp()
        // Setup test data, mocks, etc.
    }

    override func tearDown() async throws {
        // Cleanup
        try await super.tearDown()
    }

    // MARK: - Tests

    /// Test description in natural language
    func testFeatureName() async throws {
        // Given: Setup test data and preconditions
        let input = createTestInput()

        // When: Execute the operation under test
        let result = try await service.operation(input)

        // Then: Verify expectations
        XCTAssertEqual(result.expected, value)
        XCTAssertNotNil(result.data)
        XCTAssertTrue(result.isValid)
    }
}
```

### Integration Test Template

```swift
import XCTest
import SwiftData
@testable import MirrorBuddy

@MainActor
final class MyIntegrationTests: XCTestCase {

    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container
        let schema = Schema([Material.self, Flashcard.self])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(for: schema, configurations: [config])
        modelContext = ModelContext(modelContainer)
    }

    override func tearDown() async throws {
        modelContainer = nil
        modelContext = nil
        try await super.tearDown()
    }

    func testEndToEndFlow() async throws {
        // Given: Setup complete flow
        let material = Material(title: "Test")
        modelContext.insert(material)

        // When: Execute multi-step flow
        material.processingStatus = .completed
        try modelContext.save()

        let flashcard = Flashcard(materialID: material.id, question: "Q", answer: "A")
        flashcard.material = material
        modelContext.insert(flashcard)
        try modelContext.save()

        // Then: Verify entire flow
        XCTAssertEqual(material.flashcards?.count, 1)
        XCTAssertEqual(flashcard.material?.id, material.id)
    }
}
```

### Performance Test Template

```swift
import XCTest
@testable import MirrorBuddy

final class MyPerformanceTests: XCTestCase {

    func testOperationPerformance() {
        // Setup test data
        let input = generateLargeTestData()

        // Measure performance
        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            // Operation to benchmark
            _ = performExpensiveOperation(input)
        }
    }

    private func generateLargeTestData() -> Data {
        // Generate realistic test data
        return Data(count: 10_000)
    }
}
```

## Best Practices

### General Guidelines

1. **Follow AAA Pattern**: Arrange (Given), Act (When), Assert (Then)
2. **One Assertion Per Concept**: Each test should verify one specific behavior
3. **Descriptive Names**: Use `testFeatureUnderTest_StateUnderTest_ExpectedBehavior`
4. **Isolation**: Tests should not depend on each other or external state
5. **Fast Execution**: Unit tests should run in milliseconds
6. **Deterministic**: Tests should always produce the same result

### SwiftData Testing

```swift
// Always use in-memory storage for tests
let config = ModelConfiguration(
    schema: schema,
    isStoredInMemoryOnly: true  // ✅ Fast, isolated
)

// Clean up after each test
override func tearDown() async throws {
    modelContainer = nil
    modelContext = nil
    try await super.tearDown()
}
```

### Async Testing

```swift
// Use async/await for asynchronous operations
func testAsyncOperation() async throws {
    let result = try await service.fetchData()
    XCTAssertNotNil(result)
}

// Use expectations for callbacks
func testCompletion() {
    let expectation = expectation(description: "Completion called")

    service.operation { result in
        XCTAssertNotNil(result)
        expectation.fulfill()
    }

    wait(for: [expectation], timeout: 1.0)
}
```

### Mocking Services

```swift
// Protocol-based mocking
protocol DataService {
    func fetchData() async throws -> Data
}

class MockDataService: DataService {
    var shouldFail = false
    var mockData: Data?

    func fetchData() async throws -> Data {
        if shouldFail {
            throw NSError(domain: "test", code: -1)
        }
        return mockData ?? Data()
    }
}

// Use in tests
func testWithMock() async throws {
    let mock = MockDataService()
    mock.mockData = Data("test".utf8)

    let result = try await service.process(using: mock)
    XCTAssertNotNil(result)
}
```

### Performance Testing

```swift
// Set realistic baselines
measure(metrics: [XCTClockMetric()]) {
    // Should complete in < 100ms
    _ = expensiveOperation()
}

// Use representative data sizes
let testData = generateTestData(size: 10_000) // 10KB realistic size
```

## Troubleshooting

### Common Issues

#### 1. Tests Fail to Compile

**Error:** `Use of undeclared type 'Material'`

**Solution:**
```swift
@testable import MirrorBuddy  // Add @testable import
```

#### 2. SwiftData Model Context Issues

**Error:** `Context has been deleted`

**Solution:**
```swift
override func tearDown() async throws {
    // Ensure cleanup order
    modelContext = nil
    modelContainer = nil
    try await super.tearDown()
}
```

#### 3. Async Test Timeouts

**Error:** `Timed out waiting for expectations`

**Solution:**
```swift
// Increase timeout for slow operations
wait(for: [expectation], timeout: 5.0)  // Increase from 1.0 to 5.0

// Or use async/await instead
let result = try await operation()  // More reliable
```

#### 4. Performance Test Inconsistency

**Error:** Performance tests fail intermittently

**Solution:**
```swift
// Use metrics that account for variability
measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
    // Ensure consistent test data
    let input = generateDeterministicTestData()
    _ = operation(input)
}
```

#### 5. Model Relationship Errors

**Error:** `Inverse relationship not found`

**Solution:**
```swift
// Ensure both sides of relationship are set
flashcard.material = material
modelContext.insert(flashcard)

// Or rely on cascade rules
@Relationship(deleteRule: .cascade, inverse: \Flashcard.material)
var flashcards: [Flashcard]?
```

### Test Debugging

```swift
// Add print statements for debugging
print("DEBUG: Input = \(input)")
print("DEBUG: Result = \(result)")

// Use breakpoints
// Set breakpoint in Xcode at line where test fails

// Use XCTContext for detailed messages
XCTContext.runActivity(named: "Processing material") { _ in
    // Test code here
}
```

## Coverage Goals

### Target Coverage by Area

- **Critical Paths**: 90%+ (authentication, payment, data loss prevention)
- **Core Business Logic**: 80%+ (material processing, flashcards, study tracking)
- **UI Components**: 50%+ (view models, user interactions)
- **Utilities**: 70%+ (helpers, extensions)
- **Third-party Integrations**: 60%+ (API clients, OAuth)

### Measuring Coverage

```bash
# Generate coverage report
xcodebuild test -scheme MirrorBuddy \
  -enableCodeCoverage YES \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# View detailed coverage
xcrun xccov view --report \
  ~/Library/Developer/Xcode/DerivedData/MirrorBuddy-*/Logs/Test/*.xcresult \
  --json > coverage.json

# Generate HTML report (requires xccov-to-html)
xccov-to-html coverage.json > coverage.html
open coverage.html
```

## Continuous Integration

### Pre-commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
echo "Running tests..."
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro' || exit 1
echo "All tests passed!"
```

### GitHub Actions

See `.github/workflows/test.yml` for full CI configuration.

**Key steps:**
1. Install dependencies
2. Build project
3. Run tests with coverage
4. Upload coverage to Codecov
5. Fail PR if coverage drops below threshold

## Resources

### Documentation
- [XCTest Framework](https://developer.apple.com/documentation/xctest)
- [SwiftData Testing Guide](https://developer.apple.com/documentation/swiftdata)
- [Performance Testing](https://developer.apple.com/documentation/xctest/performance_testing)

### Tools
- **Xcode Test Navigator**: `⌘6`
- **Coverage Report**: `⌘9` → Coverage tab
- **Test Plan Editor**: Edit `MirrorBuddy.xctestplan`

### Related Files
- `.xctestplan` - Test configuration and environments
- `scheme.xcscheme` - Build and test settings
- `.swiftlint.yml` - Code quality rules applied to tests

## Contributing

When adding new features:

1. **Write tests first** (TDD approach when possible)
2. **Maintain coverage** (don't decrease existing coverage)
3. **Follow templates** (use provided test templates)
4. **Add performance tests** for critical operations
5. **Update this README** if adding new test categories

## Questions?

For questions about testing:
- Check this README first
- Review existing test files for examples
- Consult the team's testing guidelines
- Ask in #engineering-testing Slack channel

---

**Last Updated**: October 19, 2025
**Test Framework**: XCTest 15.0+
**Minimum iOS Version**: iOS 17.0+
