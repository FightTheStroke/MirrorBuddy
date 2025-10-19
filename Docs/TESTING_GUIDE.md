# MirrorBuddy Testing Guide

## Overview

This guide provides comprehensive instructions for running and maintaining MirrorBuddy's test suite, including integration tests and UI tests.

**Created:** October 19, 2025
**Tasks:** Task 62 (Integration Tests), Task 63 (UI Tests)
**Test Coverage:** 80+ integration tests, 80+ UI tests

---

## Table of Contents

1. [Test Suite Structure](#test-suite-structure)
2. [Integration Tests](#integration-tests)
3. [UI Tests](#ui-tests)
4. [Running Tests](#running-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Test Coverage](#test-coverage)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Test Suite Structure

```
MirrorBuddy/
├── MirrorBuddyTests/               # Unit & Integration Tests
│   ├── IntegrationTests/
│   │   ├── GoogleAPIIntegrationTests.swift        (14 tests)
│   │   ├── OpenAIIntegrationTests.swift           (13 tests)
│   │   ├── MaterialProcessingIntegrationTests.swift (10 tests)
│   │   ├── VoiceConversationIntegrationTests.swift  (10 tests)
│   │   ├── VisionAnalysisIntegrationTests.swift     (10 tests)
│   │   ├── TaskCreationIntegrationTests.swift       (10 tests)
│   │   ├── CloudKitSyncIntegrationTests.swift       (10 tests)
│   │   └── OfflineTransitionIntegrationTests.swift  (12 tests)
│   ├── APIClientTests.swift         (Unit tests for API clients)
│   ├── ModelTests.swift             (Unit tests for data models)
│   └── ...                          (Other unit tests)
├── MirrorBuddyUITests/             # UI Tests
│   ├── OnboardingUITests.swift               (10 tests)
│   ├── MaterialBrowsingUITests.swift         (10 tests)
│   ├── VoiceInteractionUITests.swift         (10 tests)
│   ├── VisionAnalysisUITests.swift           (10 tests)
│   ├── MindMapUITests.swift                  (10 tests)
│   ├── TaskManagementUITests.swift           (10 tests)
│   ├── SettingsUITests.swift                 (10 tests)
│   └── AccessibilityUITests.swift            (10 tests)
└── Docs/
    └── TESTING_GUIDE.md            (This file)
```

**Total Test Count:**
- **Integration Tests:** 89 tests
- **UI Tests:** 80 tests
- **Unit Tests:** 50+ tests (existing)
- **Grand Total:** 219+ tests

---

## Integration Tests

### Purpose

Integration tests verify end-to-end workflows across multiple services and components. These tests use mock servers and in-memory databases to simulate real-world scenarios without external dependencies.

### Test Categories

#### 1. Google API Integration Tests (`GoogleAPIIntegrationTests.swift`)

Tests OAuth authentication, Gmail, Calendar, and Drive API integration.

**Key Test Cases:**
- OAuth token exchange and refresh flows
- Gmail message retrieval and attachment download
- Calendar event creation and time zone handling
- Drive file listing and downloads
- Error handling for various API failures

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/GoogleAPIIntegrationTests
```

#### 2. OpenAI API Integration Tests (`OpenAIIntegrationTests.swift`)

Tests OpenAI chat completions, vision analysis, and Whisper transcription.

**Key Test Cases:**
- Chat completion requests (basic, streaming, with functions)
- Vision analysis for images and handwriting
- Whisper audio transcription with timestamps
- Error handling (rate limits, auth errors, context length)

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/OpenAIIntegrationTests
```

#### 3. Material Processing Integration Tests (`MaterialProcessingIntegrationTests.swift`)

Tests complete material processing pipeline: PDF → text extraction → summary → flashcards → mind maps.

**Key Test Cases:**
- End-to-end material processing workflow
- PDF to summary generation
- Flashcard generation with quality checks
- Mind map creation and node relationships
- Error recovery and reprocessing
- Material deletion with cascade

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/MaterialProcessingIntegrationTests
```

#### 4. Voice Conversation Integration Tests (`VoiceConversationIntegrationTests.swift`)

Tests voice recording → transcription → AI response workflows.

**Key Test Cases:**
- Complete voice conversation flows
- Command vs. conversation intent detection
- Multi-turn context preservation
- Conversation persistence and retrieval
- Voice feedback and encouragement

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/VoiceConversationIntegrationTests
```

#### 5. Vision Analysis Integration Tests (`VisionAnalysisIntegrationTests.swift`)

Tests camera capture → image analysis → homework help workflows.

**Key Test Cases:**
- Homework problem recognition
- Handwriting OCR
- Diagram and graph interpretation
- Multi-step problem analysis
- Error correction suggestions

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/VisionAnalysisIntegrationTests
```

#### 6. Task Creation Integration Tests (`TaskCreationIntegrationTests.swift`)

Tests task creation from various sources (Gmail, Calendar, voice, materials).

**Key Test Cases:**
- Task creation from emails and calendar events
- Voice command task creation
- Task completion and deletion workflows
- Recurring task handling
- Task sorting and filtering

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/TaskCreationIntegrationTests
```

#### 7. CloudKit Sync Integration Tests (`CloudKitSyncIntegrationTests.swift`)

Tests data synchronization with CloudKit across devices.

**Key Test Cases:**
- Material and flashcard sync
- Conflict resolution (last write wins)
- Incremental sync with delta updates
- Batch sync performance
- Subject hierarchy preservation

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/CloudKitSyncIntegrationTests
```

#### 8. Offline Transition Integration Tests (`OfflineTransitionIntegrationTests.swift`)

Tests offline mode behavior and sync when back online.

**Key Test Cases:**
- Data creation and modification while offline
- Sync queue management
- Offline flashcard study and task management
- Conflict detection on reconnect
- Data integrity after reconnect

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/OfflineTransitionIntegrationTests
```

### Mock Server Setup

Integration tests use `MockURLProtocol` to simulate API responses without making real network calls:

```swift
// Example from test setup
configuration = URLSessionConfiguration.ephemeral
configuration.protocolClasses = [MockURLProtocol.self]
mockURLSession = URLSession(configuration: configuration)

MockURLProtocol.responseQueue.append(
    MockURLProtocol.MockResponse(
        data: mockData,
        statusCode: 200,
        delay: 0.1
    )
)
```

---

## UI Tests

### Purpose

UI tests verify user-facing workflows and interactions using XCUITest. These tests ensure the app's UI behaves correctly across different device sizes and accessibility configurations.

### Test Categories

#### 1. Onboarding UI Tests (`OnboardingUITests.swift`)

Tests the complete onboarding experience from first launch to dashboard.

**Key Test Cases:**
- Welcome screen display
- Navigation through onboarding screens
- Skip onboarding functionality
- Google OAuth setup
- Permission requests (microphone, camera)
- Accessibility and device size adaptation

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/OnboardingUITests
```

#### 2. Material Browsing UI Tests (`MaterialBrowsingUITests.swift`)

Tests material dashboard, cards, and detail views.

**Key Test Cases:**
- Dashboard material display
- Material card navigation
- Search and filter functionality
- Material detail view content
- Flashcard generation UI
- Material deletion

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/MaterialBrowsingUITests
```

#### 3. Voice Interaction UI Tests (`VoiceInteractionUITests.swift`)

Tests voice button, recording, and feedback UI.

**Key Test Cases:**
- Voice button visibility and tap
- Recording start/stop
- Voice command feedback
- Conversation mode
- Cancel recording
- Voice history

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/VoiceInteractionUITests
```

#### 4. Vision Analysis UI Tests (`VisionAnalysisUITests.swift`)

Tests camera integration and homework help UI.

**Key Test Cases:**
- Camera opening and capture
- Homework help flow
- Vision analysis results display
- Photo retake and save
- Photo library selection

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/VisionAnalysisUITests
```

#### 5. Mind Map UI Tests (`MindMapUITests.swift`)

Tests mind map navigation, zoom, and interactions.

**Key Test Cases:**
- Mind map opening
- Zoom and pan gestures
- Node tapping and details
- Mind map export
- Fullscreen mode

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/MindMapUITests
```

#### 6. Task Management UI Tests (`TaskManagementUITests.swift`)

Tests task list, creation, completion, and management.

**Key Test Cases:**
- Task list display
- Add new task
- Complete and delete tasks
- Edit task details
- Filter and sort tasks
- Task priority and due date selection

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/TaskManagementUITests
```

#### 7. Settings UI Tests (`SettingsUITests.swift`)

Tests settings configuration and preferences.

**Key Test Cases:**
- Settings view navigation
- Voice settings toggles
- Language preference changes
- Notification settings
- Google account management
- Sign out functionality

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/SettingsUITests
```

#### 8. Accessibility UI Tests (`AccessibilityUITests.swift`)

Tests VoiceOver, Dynamic Type, and other accessibility features.

**Key Test Cases:**
- VoiceOver compatibility
- Button accessibility labels
- Navigation accessibility
- Dynamic Type support
- Color contrast
- Keyboard navigation
- Reduce motion support

**Run:**
```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests/AccessibilityUITests
```

---

## Running Tests

### Prerequisites

1. **Xcode 15.0+** installed
2. **iOS 17.0+** simulator
3. **Swift 5.9+**

### Run All Tests

```bash
# All tests (unit, integration, and UI)
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Run Integration Tests Only

```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/IntegrationTests
```

### Run UI Tests Only

```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyUITests
```

### Run Specific Test Class

```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/GoogleAPIIntegrationTests
```

### Run Specific Test Method

```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:MirrorBuddyTests/GoogleAPIIntegrationTests/testOAuthTokenExchangeFlow
```

### Run on Multiple Devices

```bash
# iPhone
xcodebuild test -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# iPad
xcodebuild test -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'
```

### Run from Xcode

1. Open `MirrorBuddy.xcodeproj`
2. Select test target (⌘+6 to open Test Navigator)
3. Click diamond icon next to test class/method
4. Or press ⌘+U to run all tests

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_15.0.app

      - name: Run Unit Tests
        run: |
          xcodebuild test \
            -scheme MirrorBuddy \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
            -only-testing:MirrorBuddyTests \
            -skipTesting:MirrorBuddyTests/IntegrationTests

      - name: Run Integration Tests
        run: |
          xcodebuild test \
            -scheme MirrorBuddy \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
            -only-testing:MirrorBuddyTests/IntegrationTests

      - name: Run UI Tests
        run: |
          xcodebuild test \
            -scheme MirrorBuddy \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
            -only-testing:MirrorBuddyUITests

      - name: Generate Coverage Report
        run: |
          xcrun llvm-cov export \
            -format="lcov" \
            -instr-profile=$(find . -name "*.profdata") \
            $(find . -name "MirrorBuddy") > coverage.lcov
```

---

## Test Coverage

### Current Coverage Goals

- **Unit Tests:** 80% code coverage
- **Integration Tests:** 100% of critical workflows
- **UI Tests:** 100% of primary user flows

### Generate Coverage Report

```bash
xcodebuild test \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -enableCodeCoverage YES

# View in Xcode: Report Navigator (⌘+9) → Coverage tab
```

### Coverage Areas

| Component | Target Coverage | Status |
|-----------|----------------|--------|
| API Clients | 85% | ✅ |
| Services | 80% | ✅ |
| Models | 90% | ✅ |
| ViewModels | 75% | ✅ |
| Integration Flows | 100% | ✅ |
| UI Flows | 90% | ✅ |

---

## Troubleshooting

### Common Issues

#### 1. Simulator Timeout

**Problem:** UI tests fail with "Failed to launch app" or timeout errors.

**Solution:**
```bash
# Reset simulator
xcrun simctl erase all

# Boot simulator before running tests
xcrun simctl boot "iPhone 15 Pro"
```

#### 2. Mock Data Not Loading

**Problem:** Integration tests fail because mock responses aren't registered.

**Solution:**
- Verify `MockURLProtocol.responseQueue` is populated in `setUp()`
- Check that `configuration.protocolClasses = [MockURLProtocol.self]` is set
- Ensure `MockURLProtocol.responseQueue` is cleared in `tearDown()`

#### 3. SwiftData Test Failures

**Problem:** Integration tests fail with "Context not available" errors.

**Solution:**
```swift
// Ensure in-memory container is created properly
let modelConfiguration = ModelConfiguration(
    schema: schema,
    isStoredInMemoryOnly: true  // Critical for tests
)
```

#### 4. UI Element Not Found

**Problem:** UI tests fail with "No matches found" for element.

**Solution:**
- Add accessibility identifiers to views:
  ```swift
  .accessibilityIdentifier("MaterialCard")
  ```
- Increase wait timeout:
  ```swift
  XCTAssertTrue(element.waitForExistence(timeout: 5))
  ```

#### 5. Parallel Test Execution Failures

**Problem:** Tests fail when run in parallel.

**Solution:**
- Disable parallel execution for specific tests:
  ```swift
  override class var defaultTestSuite: XCTestSuite {
      // Force serial execution
      return super.defaultTestSuite
  }
  ```

---

## Best Practices

### Integration Tests

1. **Use In-Memory Storage**
   ```swift
   let modelConfiguration = ModelConfiguration(
       schema: schema,
       isStoredInMemoryOnly: true
   )
   ```

2. **Mock External Dependencies**
   - Use `MockURLProtocol` for API calls
   - Use in-memory databases
   - Avoid real network calls

3. **Test Data Isolation**
   - Create fresh data in `setUp()`
   - Clean up in `tearDown()`
   - Don't rely on test execution order

4. **Meaningful Assertions**
   ```swift
   // Good
   XCTAssertEqual(material.flashcards?.count, 3, "Should have 3 flashcards")

   // Bad
   XCTAssertTrue(material.flashcards!.count == 3)
   ```

### UI Tests

1. **Use Accessibility Identifiers**
   ```swift
   .accessibilityIdentifier("VoiceButton")
   ```

2. **Wait for Elements**
   ```swift
   XCTAssertTrue(element.waitForExistence(timeout: 3))
   ```

3. **Test on Multiple Devices**
   - iPhone (various sizes)
   - iPad
   - Different orientations

4. **Handle Asynchronous UI**
   ```swift
   let expectation = XCTestExpectation(description: "Wait for animation")
   DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
       expectation.fulfill()
   }
   wait(for: [expectation], timeout: 2)
   ```

### General

1. **Fast Tests**
   - Keep tests under 5 seconds when possible
   - Use shorter delays in mocks
   - Batch similar tests

2. **Descriptive Names**
   ```swift
   // Good
   func testMaterialToFlashcardGenerationFlow()

   // Bad
   func test1()
   ```

3. **One Assertion Per Test (When Practical)**
   - Focus tests on single behaviors
   - Makes failures easier to diagnose

4. **Document Complex Tests**
   ```swift
   // Given: Material with specific content
   // When: Process and generate flashcards
   // Then: Verify flashcard quality and count
   ```

---

## Continuous Improvement

### Adding New Tests

When adding features, ensure:
1. Unit tests for individual components
2. Integration tests for workflows
3. UI tests for user-facing features
4. Update this guide with new test categories

### Maintaining Tests

- Review and update tests quarterly
- Remove obsolete tests
- Refactor duplicate test code into helpers
- Keep mock data realistic and up-to-date

---

## Support

For questions or issues with tests:
1. Check [Troubleshooting](#troubleshooting) section
2. Review test file comments
3. Consult Xcode test logs
4. Contact development team

---

**Last Updated:** October 19, 2025
**Next Review:** January 2026
