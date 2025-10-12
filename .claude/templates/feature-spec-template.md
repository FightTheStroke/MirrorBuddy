# Feature Spec: [Feature Name]

**Date**: YYYY-MM-DD
**Status**: Draft | In Progress | In Review | Completed
**Agent**: [Agent ID responsible]
**Phase**: [Phase number and name]
**Priority**: Critical | High | Medium | Low

---

## Overview

### Purpose
[1-2 sentence description of what this feature does and why it exists]

### User Story
**As** Mario (student with dyslexia, dyscalculia, limited working memory)
**I want** [capability]
**So that** [benefit]

### Success Criteria
- [ ] Criterion 1 (must have)
- [ ] Criterion 2 (must have)
- [ ] Criterion 3 (nice to have)

---

## Mario-First Design

### Accessibility Requirements
- **Voice**: [How this feature works via voice commands]
- **One-Handed**: [How this works with right thumb only]
- **Dyslexia**: [Font, spacing, contrast considerations]
- **Working Memory**: [How we minimize cognitive load]
- **Physical**: [Accommodation for left hemiplegia]

### User Experience Flow
1. **Entry Point**: Where does Mario start?
2. **Main Interaction**: What does Mario do?
3. **Feedback**: What does Mario see/hear?
4. **Exit/Result**: Where does Mario end up?

### Voice Commands
```swift
// Primary commands for this feature
.commandName: "Command phrase" / "Comando in italiano"
```

---

## Technical Design

### Architecture

```
┌─────────────────────────────────┐
│        SwiftUI Views            │
│  [List main views/components]   │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│      Business Logic             │
│  [ViewModels, Services]         │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│      Data/API Layer             │
│  [SwiftData, API clients]       │
└─────────────────────────────────┘
```

### Components

#### 1. [ComponentName]View
**Purpose**: [What it displays/does]
**File**: `Features/[Feature]/Views/[Component]View.swift`

```swift
// Main structure
struct [Component]View: View {
    // State properties
    @State private var ...

    var body: some View {
        // Layout
    }
}
```

**Accessibility**:
- VoiceOver labels: [describe]
- Touch targets: [minimum 44x44pt]
- Keyboard navigation: [if applicable]

#### 2. [ServiceName]
**Purpose**: [What it manages]
**File**: `Core/Services/[Service].swift`

```swift
// Main interface
@MainActor
final class [Service] {
    func mainMethod() async throws -> Result {
        // Implementation
    }
}
```

#### 3. [ModelName]
**Purpose**: [What data it represents]
**File**: `Core/Models/[Model].swift`

```swift
@Model
final class [ModelName] {
    var id: UUID
    var property: Type

    init(...) {
        // Initialization
    }
}
```

### Data Flow
1. User interaction → View
2. View → ViewModel/Service
3. Service → API/SwiftData
4. Response → Update View

### API Integration (if applicable)

#### OpenAI GPT-5
**Endpoint**: [Which API]
**Model**: [GPT-5 nano/mini/full]
**Cost**: $X per request (estimated)

**Request**:
```swift
let request = ChatCompletionRequest(
    model: "gpt-5-nano",
    messages: [
        .system("You are Mario's study coach..."),
        .user(prompt)
    ],
    temperature: 0.7
)
```

**Response Handling**:
```swift
do {
    let response = try await openAI.chat(request)
    // Process response
} catch {
    // Fallback strategy
}
```

#### Google/Gemini (if applicable)
[Similar structure for Google APIs]

#### Apple Intelligence (if applicable)
**Framework**: [FoundationModels/Speech/Vision]
**Purpose**: [What local processing]

```swift
// Local processing example
let summary = try await appleAI.summarize(text)
```

---

## Testing Strategy

### Unit Tests
**File**: `Tests/[Feature]Tests/[Component]Tests.swift`

```swift
@Test func featureName_scenario_expectedBehavior() async throws {
    // Given
    let sut = ...

    // When
    let result = try await sut.method()

    // Then
    #expect(result == expected)
}
```

**Test Cases**:
- [ ] Happy path scenario
- [ ] Edge case 1
- [ ] Error handling (network failure)
- [ ] Error handling (API rate limit)
- [ ] Offline mode behavior (if applicable)

### Integration Tests
- [ ] API integration with mock data
- [ ] SwiftData persistence
- [ ] CloudKit sync (if applicable)
- [ ] Background task execution (if applicable)

### UI Tests
- [ ] Main user flow end-to-end
- [ ] VoiceOver navigation
- [ ] Voice command recognition
- [ ] Error state handling

### Performance Tests
- [ ] Response time: < [X]s target
- [ ] Memory usage: < [X]MB
- [ ] Battery impact: minimal
- [ ] API call optimization (batching, caching)

---

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Create SwiftData models (if needed)
- [ ] Implement service layer
- [ ] Create main views
- [ ] Add VoiceOver support
- [ ] Write unit tests (>80% coverage)

### Phase 2: API Integration
- [ ] Implement API client
- [ ] Add error handling
- [ ] Add retry logic
- [ ] Test with mock data
- [ ] Test with real API

### Phase 3: Polish
- [ ] Add animations
- [ ] Implement loading states
- [ ] Add empty states
- [ ] Improve error messages
- [ ] Test on actual device

### Phase 4: Accessibility
- [ ] VoiceOver labels complete
- [ ] Voice commands working
- [ ] Dynamic Type support
- [ ] High contrast mode
- [ ] One-handed navigation verified

### Phase 5: Testing & QA
- [ ] All tests pass
- [ ] SwiftLint: 0 warnings
- [ ] Performance acceptable
- [ ] QA agent review
- [ ] Human approval

---

## Dependencies

### Blocked By
- [ ] Task ID: [Description]
- [ ] Task ID: [Description]

### Blocks
- [ ] Task ID: [Description]
- [ ] Task ID: [Description]

### Related Features
- [Feature name]: [Relationship]
- [Feature name]: [Relationship]

---

## Cost Estimation

### API Costs (monthly, steady state)
- OpenAI: $X (Y requests/day)
- Gemini: $X (Y requests/day)
- Total: $X/month

### Development Time
- Design: [X] hours
- Implementation: [X] hours
- Testing: [X] hours
- QA: [X] hours
- **Total**: [X] hours (~[X] days)

---

## Risks & Mitigation

### Risk 1: [Description]
**Likelihood**: High/Medium/Low
**Impact**: High/Medium/Low
**Mitigation**: [Strategy]

### Risk 2: [Description]
**Likelihood**: High/Medium/Low
**Impact**: High/Medium/Low
**Mitigation**: [Strategy]

---

## Offline Behavior

### When Offline
- ✅ Feature works: [What still works with Apple Intelligence]
- ❌ Feature limited: [What requires cloud]
- ℹ️ Graceful degradation: [How we handle it]

### Data Caching
- Cache duration: [X hours/days]
- Cache invalidation: [Strategy]
- Storage size: ~[X]MB

---

## Launch Criteria

- [ ] All implementation checklist items complete
- [ ] Test coverage >80%
- [ ] VoiceOver works perfectly
- [ ] Performance meets targets
- [ ] QA agent approved
- [ ] Tested on physical device
- [ ] Mario feedback collected (if applicable)
- [ ] Documentation updated

---

## Post-Launch

### Monitoring
- API success rate (target: >95%)
- Response time (target: <[X]s)
- User engagement (qualitative)
- Error rate (target: <1%)

### Iteration Plan
- Week 1: Monitor metrics
- Week 2: Address bugs
- Week 3: Collect Mario's feedback
- Week 4: Plan improvements

---

## Notes

[Additional context, design discussions, alternatives considered, etc.]

---

## References

- ADR: [Link to related ADRs]
- Design: [Link to mockups/prototypes]
- API Docs: [Link to API documentation]
- User Research: [Link to Mario's feedback]
