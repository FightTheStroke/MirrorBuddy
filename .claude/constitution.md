# MirrorBuddy - Project Constitution
**Date**: 2025-10-12
**Status**: ACTIVE
**Binding**: All AI agents MUST follow these principles

---

## 🎯 Core Mission

**Build a learning companion for Mario that makes studying joyful, accessible, and effective.**

Every decision, every line of code, every interaction must serve Mario's needs:
- Dyslexia (reading difficulties)
- Dyscalculia (math difficulties)
- Dysgraphia (writing difficulties)
- Left hemiplegia (limited left hand mobility)
- Limited working memory

---

## 💎 Core Values (Priority Order)

### 1. Mario-First
**Every decision prioritizes Mario's learning experience over technical elegance.**

❌ Bad: "This architecture is more elegant"
✅ Good: "Mario can use this feature one-handed while it explains step-by-step"

### 2. Accessibility
**Voice-first, one-handed, dyslexia-friendly, minimal memory load.**

- Every feature MUST be accessible via voice
- Every UI MUST work one-handed (right-thumb optimized)
- Every text MUST support Dynamic Type and dyslexia fonts
- Every interaction MUST minimize working memory requirements

### 3. Simplicity
**Simple architecture that works > Complex architecture that's perfect.**

- Direct API calls > complex orchestration layers
- iOS native > cross-platform
- One clear way > multiple options
- Ship working features > wait for perfect features

### 4. Quality
**Tests are non-negotiable. Code must be maintainable.**

- 80%+ test coverage required
- VoiceOver MUST work for all UI
- No memory leaks
- SwiftLint: 0 warnings

### 5. Privacy
**On-device processing when possible. Transparent about cloud usage.**

- Apple Intelligence first (local, free, private)
- Cloud AI only when necessary
- User knows what data goes where
- API keys in Keychain only
- No telemetry without consent

### 6. Verification & Truth
**Never assume. Always verify. When uncertain, escalate.**

- Every technical claim MUST be verified against official documentation
- Every API assumption MUST be tested with real requests
- Every architectural decision MUST be validated with working code
- When documentation conflicts, escalate to human for resolution
- Never provide information without being 100% certain of its accuracy

---

## 🚫 Hard Constraints (NEVER Violate)

### 1. Never Compromise Mario's Privacy
- ❌ NEVER commit API keys
- ❌ NEVER send data to unauthorized services
- ❌ NEVER log sensitive user data
- ❌ NEVER use user data for training without consent

### 2. Never Break Accessibility
- ❌ NEVER create UI without VoiceOver support
- ❌ NEVER use small touch targets (<44×44 pt)
- ❌ NEVER require two-handed operation for core features
- ❌ NEVER use time pressure (Mario works at his pace)

### 3. Never Ship Untested Code
- ❌ NEVER merge without unit tests
- ❌ NEVER skip accessibility tests
- ❌ NEVER ignore SwiftLint warnings
- ❌ NEVER skip QA agent review

### 4. Never Modify Core Architecture Without Approval
- ❌ NEVER change data models without human approval
- ❌ NEVER add dependencies without human approval
- ❌ NEVER modify .env or config files directly
- ❌ NEVER change API providers without human approval

### 5. Never Make Unverified Claims
- ❌ NEVER provide technical information without verification
- ❌ NEVER assume API behavior without testing
- ❌ NEVER state compatibility without checking official docs
- ❌ NEVER recommend solutions without validating them work
- ❌ NEVER provide code examples without ensuring they compile

### 6. Never Accumulate Technical Debt
- ❌ NEVER leave TODO comments without creating tracking issues
- ❌ NEVER skip refactoring when code becomes complex
- ❌ NEVER accept "good enough" when "perfect" is achievable
- ❌ NEVER defer cleanup that can be done immediately
- ❌ NEVER ignore code smells or architectural inconsistencies

---

## 📐 Development Principles

### Technical Debt Management

#### Zero Technical Debt Policy
**Every piece of code must be production-ready from day one.**

```swift
// ✅ Good: Complete, tested, documented code
class MindMapGenerator {
    private let apiClient: OpenAIClient
    private let logger: Logger
    
    /// Generates a mind map from material content
    /// - Parameter material: The material to process
    /// - Returns: A complete mind map with nodes and relationships
    /// - Throws: MindMapError if generation fails
    func generateMindMap(for material: Material) async throws -> MindMap {
        // Implementation with proper error handling and logging
    }
}

// ❌ Bad: Incomplete code with technical debt
class MindMapGenerator {
    func generateMindMap(for material: Material) -> MindMap {
        // TODO: Add error handling
        // TODO: Add logging
        // TODO: Add validation
        return MindMap() // Returns empty map - technical debt!
    }
}
```

#### Immediate Refactoring Rules
```swift
// ✅ Good: Refactor immediately when complexity increases
func processMaterial(_ material: Material) async throws -> ProcessedMaterial {
    let extractedContent = try await extractContent(from: material)
    let validatedContent = try validateContent(extractedContent)
    let processedContent = try await processContent(validatedContent)
    return ProcessedMaterial(content: processedContent)
}

// ❌ Bad: Accepting complex, hard-to-maintain code
func processMaterial(_ material: Material) async throws -> ProcessedMaterial {
    // 200 lines of complex logic in one function - REFACTOR IMMEDIATELY!
    // This is technical debt that will compound over time
}
```

### Verification & Validation Standards

#### Documentation Verification
**Every technical claim must be verified against official sources.**

```swift
// ✅ Good: Verified against Apple's official documentation
// Reference: https://developer.apple.com/documentation/swiftdata/model
@Model
final class Material {
    // Implementation verified against SwiftData documentation
}

// ❌ Bad: Assumptions without verification
@Model
final class Material {
    // Assuming this works based on similar patterns - VERIFY FIRST!
}
```

#### API Testing Requirements
```swift
// ✅ Good: Every API call must be tested
@Test func openAIAPICall_withValidRequest_returnsExpectedResponse() async throws {
    // Given
    let client = OpenAIClient(apiKey: "test-key")
    let request = ChatCompletionRequest(messages: [.user("test")])
    
    // When
    let response = try await client.chatCompletion(request)
    
    // Then
    #expect(response.choices.count > 0)
    #expect(response.choices[0].message.content != nil)
}

// ❌ Bad: Assuming API behavior without testing
// This might work, but we haven't verified it
let response = try await openAI.chatCompletion(request)
```

### Critical Decision Escalation

#### Mandatory Human Review Triggers
```yaml
escalation_triggers:
  - new_dependency: "Adding any external library requires human approval"
  - architecture_change: "Modifying core data models or service architecture"
  - security_decision: "Any security-related implementation or configuration"
  - performance_critical: "Changes that might impact app performance significantly"
  - api_provider_change: "Switching between OpenAI, Apple Intelligence, or other AI providers"
  - cost_impact: "Changes that might significantly impact API costs"
  - timeline_risk: "Any decision that might delay project milestones"
```

#### Escalation Format
```yaml
critical_decision_required:
  agent: "swiftui-agent"
  decision_type: "new_dependency"
  issue: "Need to add SwiftUI-Introspect for custom styling"
  impact_analysis:
    pros:
      - "Enables custom styling of native components"
      - "Widely used and maintained library"
    cons:
      - "Adds external dependency"
      - "Might break with iOS updates"
    alternatives:
      - "Custom implementation (2-3 days extra work)"
      - "Use native SwiftUI only (limited styling)"
  recommendation: "Add dependency with fallback plan"
  requires_human_decision: true
  deadline: "2025-01-15 18:00"
```

### Code Quality Standards

#### Swift Style
```swift
// ✅ Good: Clear, descriptive names
func generateMindMapForMaterial(_ material: Material) async throws -> MindMap {
    let content = try await extractText(from: material)
    let map = try await openAI.generateMindMap(content)
    return map
}

// ❌ Bad: Unclear abbreviations
func genMM(_ m: Mat) async throws -> MM {
    let c = try await ext(m)
    return try await oai.gen(c)
}
```

#### Error Handling
```swift
// ✅ Good: Specific errors, recovery strategies
enum MaterialError: Error {
    case downloadFailed(reason: String)
    case processingFailed(stage: String)
    case invalidFormat(expected: String)
}

// Graceful degradation
do {
    let mindMap = try await generateMindMap(material)
    return mindMap
} catch {
    logger.error("Mind map generation failed: \(error)")
    // Fallback: return simple outline
    return generateSimpleOutline(material)
}
```

#### Async/Await
```swift
// ✅ Good: Parallel async operations
async let mindMap = openAI.generateMindMap(pdf)
async let images = openAI.generateImages(pdf)
async let summary = appleAI.summarize(pdf)

let material = Material(
    mindMap: await mindMap,
    images: await images,
    summary: await summary
)

// ❌ Bad: Sequential when could be parallel
let mindMap = try await openAI.generateMindMap(pdf)
let images = try await openAI.generateImages(pdf) // Waited unnecessarily
let summary = try await appleAI.summarize(pdf)    // Waited even more
```

#### SwiftData Models
```swift
// ✅ Good: Clear relationships, proper types
@Model
final class Material {
    var id: UUID
    var title: String
    var subject: Subject
    var createdAt: Date
    var mindMap: MindMap?
    @Relationship(deleteRule: .cascade) var flashcards: [Flashcard]

    init(title: String, subject: Subject) {
        self.id = UUID()
        self.title = title
        self.subject = subject
        self.createdAt = Date()
    }
}
```

### Testing Requirements

#### Unit Tests (Required)
```swift
@Test func mindMapGeneration_withValidPDF_succeeds() async throws {
    // Given
    let material = Material(title: "Test", subject: .math)
    let mockAPI = MockOpenAIClient()
    let generator = MindMapGenerator(api: mockAPI)

    // When
    let mindMap = try await generator.generate(for: material)

    // Then
    #expect(mindMap != nil)
    #expect(mindMap.nodes.count > 0)
}

@Test func voiceCommands_recognizedByAppleSpeech() async throws {
    let recognizer = VoiceCommandRecognizer()
    let audioFile = loadTestAudio("open_math.m4a")

    let command = try await recognizer.recognize(audioFile)

    #expect(command == .openSubject(.math))
}
```

#### Accessibility Tests
```swift
@Test func materialList_accessibleWithVoiceOver() {
    let view = MaterialListView(materials: testMaterials)

    // Verify accessibility elements exist
    #expect(view.accessibilityElements.count == testMaterials.count)

    // Verify labels are descriptive
    for element in view.accessibilityElements {
        #expect(element.accessibilityLabel?.isEmpty == false)
        #expect(element.accessibilityHint?.isEmpty == false)
    }
}
```

### SwiftUI Best Practices

#### Accessibility
```swift
// ✅ Good: Complete accessibility support
Button {
    startVoiceConversation()
} label: {
    Label("Start Studying", systemImage: "mic.fill")
}
.accessibilityLabel("Start voice conversation")
.accessibilityHint("Double tap to begin talking with your study coach")
.accessibilityAddTraits(.startsMediaSession)
.frame(minWidth: 44, minHeight: 44) // Minimum touch target
```

#### Performance
```swift
// ✅ Good: Efficient rendering
struct MaterialListView: View {
    let materials: [Material]

    var body: some View {
        List {
            ForEach(materials) { material in
                MaterialRow(material: material)
                    .id(material.id) // Stable IDs
            }
        }
        .listStyle(.plain)
    }
}

// ❌ Bad: Inefficient, causes redraws
struct MaterialListView: View {
    @State private var materials: [Material] = []

    var body: some View {
        List {
            ForEach(materials.map { $0 }) { material in // Creates new array every time!
                MaterialRow(material: material)
            }
        }
    }
}
```

---

## 🔒 Security Requirements

### API Keys & Secrets
```swift
// ✅ Good: Keychain storage
class SecureStorage {
    func store(apiKey: String, for service: String) throws {
        let data = apiKey.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecValueData as String: data
        ]
        SecItemAdd(query as CFDictionary, nil)
    }
}

// ❌ Bad: Hardcoded keys
let openAIKey = "sk-proj-ABC123..." // NEVER DO THIS
```

### Data Encryption
```swift
// ✅ Good: SwiftData automatically encrypts at rest
// No additional work needed, just use @Model

// For additional sensitive data:
class EncryptedStorage {
    func encrypt(_ data: Data, using key: SymmetricKey) -> Data {
        try! AES.GCM.seal(data, using: key).combined
    }
}
```

---

## 🎨 Mario-Specific Design Principles

### 1. Voice-First Interface
**Every action must be achievable via voice.**

```swift
// ✅ Good: Voice commands everywhere
VoiceCommandRegistry.shared.register([
    .openMath: "Open math" / "Apri matematica",
    .startStudying: "Start studying" / "Inizia a studiare",
    .readThisPage: "Read this page" / "Leggi questa pagina",
    .nextMaterial: "Next" / "Prossimo"
])
```

### 2. One-Handed Operation
**Right-thumb zone optimization (iPhone/iPad portrait).**

```swift
// ✅ Good: Important buttons in thumb reach
VStack {
    Spacer() // Content above

    HStack {
        Spacer()
        // Primary action in bottom-right (right thumb)
        Button("Continue") { ... }
            .buttonStyle(.prominent)
            .frame(width: 200, height: 60)
    }
    .padding()
}
```

### 3. Limited Working Memory Support
**Always show context. Never require remembering previous steps.**

```swift
// ✅ Good: Context always visible
struct StudySessionView: View {
    let currentMaterial: Material
    let progress: Progress

    var body: some View {
        VStack {
            // Always show where Mario is
            ProgressBanner(
                subject: currentMaterial.subject,
                step: progress.currentStep,
                totalSteps: progress.totalSteps
            )

            // Content here

            // Always show what's next
            NextStepHint(nextStep: progress.nextStep)
        }
    }
}

// ❌ Bad: Requires remembering previous screen
struct StudySessionView: View {
    var body: some View {
        Text("Continue where you left off") // Where? Mario doesn't remember!
    }
}
```

### 4. Dyslexia-Friendly Text
```swift
// ✅ Good: Dyslexia-friendly typography
Text(material.content)
    .font(.custom("OpenDyslexic", size: 18)) // Optional font
    .lineSpacing(8) // Extra spacing
    .foregroundColor(.primary) // High contrast
    .dynamicTypeSize(...<= .xxxLarge) // Support Dynamic Type
```

### 5. Encouraging, Never Judgmental
```swift
// ✅ Good: Positive reinforcement
"Great job! You've completed 3 problems today. Ready for one more?"

// ❌ Bad: Pressure or judgment
"You're behind schedule. You need to complete 5 more problems."
```

---

## 🏗️ Build & Test Requirements

### Simulator Usage
**ALWAYS use the iPad simulator "IpadDiMario" for building and testing.**

```bash
# ✅ Good: Correct simulator
xcodebuild -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=IpadDiMario' \
  test

# ❌ Bad: Wrong platform
xcodebuild -scheme MirrorBuddy \
  -destination 'platform=macOS' \
  build  # NEVER use macOS

# ❌ Bad: Wrong simulator
xcodebuild -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  test  # NEVER use iPhone simulators
```

**Why IpadDiMario?**
- Mario's primary device is an iPad Pro 11"
- UI layouts are optimized for iPad
- Testing on iPhone gives false results
- macOS has different APIs (BGProcessingTask unavailable)

### Git Commit Requirements
**ALWAYS commit after completing each task.**

```bash
# ✅ Good: Descriptive commit with task reference
git add .
git commit -m "Task 11: Implement OpenAI API Client Infrastructure

- Created OpenAIClient with async/await support
- Implemented GPT-5 chat completion, vision, and DALL-E 3
- Added WebSocket support for Realtime API
- Implemented comprehensive error handling and retry logic
- Added rate limiting with actor-based limiter
- Created 40+ unit tests with >90% coverage

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# ❌ Bad: Vague commit message
git commit -m "updated files"
```

---

## 🔄 Agent Workflow Requirements

### Before Starting Work
1. Read this constitution
2. Read relevant spec file (`.claude/specs/{agent}.md`)
3. Check Task Master for assigned tasks (`tm next-task --agent {agent-id}`)
4. Review dependencies and blockers

### During Work
1. Follow TDD: Write tests before implementation
2. **Build and test ONLY using the iPad simulator "IpadDiMario"** (never macOS or iPhone)
3. Commit frequently with descriptive messages
4. Update task status in Task Master
5. Document complex decisions inline
6. **Verify every technical claim against official documentation**
7. **Test every API assumption with real requests**
8. **Refactor immediately when code complexity increases**
9. **Escalate any decision requiring human judgment**

### Before Completing Task
1. All tests pass (unit + integration) on **IpadDiMario simulator**
2. SwiftLint: 0 warnings
3. Accessibility: VoiceOver works
4. Documentation updated
5. **Technical debt audit: No TODO comments, no incomplete implementations**
6. **Verification complete: All technical claims validated**
7. Task marked complete in Task Master
8. **Git commit created with task number reference** (e.g., "Task 11: OpenAI API Client Infrastructure")

### When Blocked
1. Document blocker clearly
2. Notify dependent agents
3. Escalate to human if blocked >2 hours
4. Work on parallel task if available

---

## 📝 Documentation Requirements

### Code Comments
```swift
// ✅ Good: Explains WHY, not WHAT
// We use Apple Speech for offline fallback because Mario studies
// in areas with poor internet connectivity
func recognizeSpeech(offline: Bool) async throws -> String {
    if offline {
        return try await appleSpeech.recognize(audioBuffer)
    } else {
        return try await openAI.transcribe(audioBuffer)
    }
}

// ❌ Bad: States the obvious
// This function recognizes speech
func recognizeSpeech() { ... }
```

### API Documentation
```swift
/// Generates a mind map from material content, optimized for Mario's learning style.
///
/// The generated mind map uses:
/// - Simple, short phrases (max 5-7 words per node)
/// - Maximum 3 levels deep (to avoid overwhelming working memory)
/// - Concrete examples from daily life
/// - Visual images for each major node (via DALL-E 3)
///
/// - Parameters:
///   - material: The material to generate mind map from
///   - complexity: Target complexity level (default: simplified)
/// - Returns: Generated mind map with embedded images
/// - Throws: `MindMapError` if generation fails
func generateMindMap(
    for material: Material,
    complexity: Complexity = .simplified
) async throws -> MindMap
```

---

## ✅ Definition of Done

A task is DONE only when:
- [ ] Feature implemented according to spec
- [ ] Unit tests written (>80% coverage for new code)
- [ ] Integration tests pass
- [ ] UI tests pass (if applicable)
- [ ] VoiceOver works correctly
- [ ] SwiftLint: 0 warnings
- [ ] Performance acceptable (no lag, no memory leaks)
- [ ] **Build and tests verified on IpadDiMario simulator**
- [ ] **Zero technical debt: No TODO comments, no incomplete implementations**
- [ ] **All technical claims verified against official documentation**
- [ ] **All API assumptions tested with real requests**
- [ ] **Code complexity kept to minimum (functions <50 lines)**
- [ ] QA agent approved
- [ ] Documentation updated
- [ ] Task marked complete in Task Master
- [ ] **Git commit created with descriptive message referencing task number**

---

## 🚨 Escalation Triggers

**Immediately escalate to human when:**
1. Architectural decision required (new dependency, major refactor)
2. Security concern identified
3. Blocked for >2 hours with no resolution
4. API rate limits exceeded
5. Critical bug in production code discovered
6. Cost estimates exceeded by >20%
7. Timeline at risk (phase running behind)
8. **Technical documentation conflicts or unclear**
9. **API behavior differs from official documentation**
10. **Uncertain about technical implementation approach**
11. **Need to make assumptions about system behavior**
12. **Any decision that might introduce technical debt**

**Format for escalation:**
```yaml
escalation:
  agent: "{agent-id}"
  task: "{task-id}"
  issue: "{clear description}"
  severity: "high|medium|low"
  options:
    - option_a: {description}
      pros: [...]
      cons: [...]
    - option_b: {description}
      pros: [...]
      cons: [...]
  recommended: "option_a"
  blocked_tasks: [task-ids]
  requires_decision_by: "YYYY-MM-DD HH:MM"
```

---

## 🎓 Learning & Improvement

### After Each Phase
- Retrospective: What went well? What can improve?
- Update constitution if patterns emerge
- Share learnings with other agents
- Celebrate wins!

### Continuous Improvement
- Monitor API costs weekly
- Review test coverage
- Check accessibility compliance
- Profile performance
- Collect Mario's feedback

---

**This constitution is the source of truth for all development decisions.**
**When in doubt, ask: "Does this serve Mario's learning?"**
**When uncertain, ask: "Have I verified this claim?"**
**When complex, ask: "Can this be simplified without compromising quality?"**

---

## 🔍 Verification Checklist

Before making any technical statement or recommendation:

- [ ] **Have I verified this against official documentation?**
- [ ] **Have I tested this with real API calls or code?**
- [ ] **Am I 100% certain this information is accurate?**
- [ ] **If not certain, have I escalated to human for verification?**
- [ ] **Does this code have zero technical debt?**
- [ ] **Can this implementation be simplified further?**
- [ ] **Have I validated all assumptions with concrete tests?**

**Remember: It's better to escalate and wait for verification than to provide unverified information that could mislead development.**

---

**Last Updated**: 2025-01-15
**Version**: 2.0
**Binding**: All agents
**Status**: ACTIVE - Enhanced with verification and technical debt management
