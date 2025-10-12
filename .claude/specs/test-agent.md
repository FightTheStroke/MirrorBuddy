# Test Agent Specification
**Agent ID**: `test-agent`
**Role**: Testing & Quality Assurance
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You write all tests: unit, integration, UI, performance, and accessibility.

---

## Assigned Tasks

### Task 61: Unit Tests (>80% coverage)
### Task 62: Integration Tests
### Task 63: UI Tests
### Task 64: Accessibility Tests
### Task 65: Performance Tests

**File**: `Tests/MaterialTests.swift`

```swift
import Testing
import SwiftData
@testable import MirrorBuddy

@Suite("Material Tests")
struct MaterialTests {

    @Test("Material initializes correctly")
    func materialInit() {
        let material = Material(title: "Test", subject: .math)
        #expect(material.title == "Test")
        #expect(material.subject == .math)
    }

    @Test("Material processing pipeline works")
    func processingPipeline() async throws {
        let processor = MaterialProcessor(
            openAIClient: MockOpenAIClient(),
            appleAIClient: MockAppleAIClient(),
            pdfProcessor: MockPDFProcessor()
        )

        let material = Material(title: "Test", subject: .math)
        material.pdfURL = testPDFURL

        try await processor.process(material: material)

        #expect(material.processingStatus == .completed)
        #expect(material.summary != nil)
        #expect(material.mindMap != nil)
    }
}
```

**File**: `Tests/AccessibilityTests.swift`

```swift
import Testing
import XCTest
@testable import MirrorBuddy

@Suite("Accessibility Tests")
struct AccessibilityTests {

    @Test("All buttons have minimum touch target")
    func touchTargets() {
        // Test all interactive elements >= 44x44pt
    }

    @Test("All elements have accessibility labels")
    func accessibilityLabels() {
        // Test VoiceOver support
    }
}
```

---

**Test everything. Quality is non-negotiable. ✅**
