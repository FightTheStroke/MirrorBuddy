# Foundation Agent Specification
**Agent ID**: `foundation-agent`
**Role**: Project Foundation & Infrastructure
**Priority**: Critical (blocks all other agents)
**Model**: claude-sonnet-4.5

---

## Overview

You are the Foundation Agent responsible for establishing the core infrastructure of MirrorBuddy. Your work is critical as it blocks all other agents. You must create a solid, working foundation that enables parallel development by other agents.

### Your Mission
Build the foundational layer of MirrorBuddy: Xcode project, SwiftData models, CloudKit sync, and API client infrastructure. Everything must be production-ready, tested, and accessible to other agents.

---

## Assigned Tasks (from Task Master)

### Phase 0: Foundation (Weeks 1-2)

#### Task 1: Setup Xcode Project with Required Configurations
**Priority**: HIGH | **Blocks**: ALL

**Deliverables**:
- ✅ Xcode project for MirrorBuddy
- ✅ iOS 26+ target (iPad priority)
- ✅ macOS 26+ target
- ✅ Swift 6 strict concurrency enabled
- ✅ Build schemes configured (Debug, Release, Testing)
- ✅ Project compiles successfully

**Implementation**:
```swift
// Project Settings
// - iOS Deployment Target: 26.0
// - macOS Deployment Target: 26.0
// - Swift Language Version: 6.0
// - Strict Concurrency Checking: Complete
// - Enable Testability: Yes (Debug)

// Build Schemes:
// 1. MirrorBuddy (iOS) - Debug/Release
// 2. MirrorBuddy (macOS) - Debug/Release
// 3. MirrorBuddyTests - Testing
```

**Validation**:
- [ ] Project builds without errors
- [ ] All targets compile
- [ ] Swift 6 strict concurrency warnings addressed

---

#### Task 2: Integrate SwiftLint for Code Quality
**Priority**: HIGH | **Depends on**: Task 1

**Deliverables**:
- ✅ SwiftLint integrated via SPM or build phase
- ✅ `.swiftlint.yml` configuration file
- ✅ Zero warnings on initial build
- ✅ Build fails on SwiftLint errors (enforced)

**SwiftLint Configuration**:
```yaml
# .swiftlint.yml
disabled_rules:
  - trailing_whitespace
opt_in_rules:
  - empty_count
  - closure_spacing
  - contains_over_filter_count
  - explicit_init
  - fatal_error_message
  - force_unwrapping
  - implicitly_unwrapped_optional
included:
  - MirrorBuddy
  - Tests
excluded:
  - Pods
  - .build
line_length:
  warning: 120
  error: 200
identifier_name:
  min_length: 2
  max_length: 60
type_name:
  min_length: 3
  max_length: 50
```

**Validation**:
- [ ] `swiftlint` command runs successfully
- [ ] Zero warnings in Xcode
- [ ] Build phase script configured

---

#### Task 3-8: Define SwiftData Models
**Priority**: HIGH | **Depends on**: Task 1

You must create ALL SwiftData models with proper relationships, cascade rules, and validation. These models are the foundation for the entire app.

##### Task 3: Material Model
```swift
import SwiftData
import Foundation

/// Represents a study material (PDF, document, etc.)
@Model
final class Material {
    /// Unique identifier
    var id: UUID

    /// Material title
    var title: String

    /// Subject category
    var subject: Subject

    /// Creation date
    var createdAt: Date

    /// Last accessed date
    var lastAccessedAt: Date?

    /// PDF file URL (local storage)
    var pdfURL: URL?

    /// Extracted text content
    var textContent: String?

    /// Generated summary (Apple Intelligence)
    var summary: String?

    /// Google Drive file ID
    var googleDriveFileID: String?

    /// Processing status
    var processingStatus: ProcessingStatus

    /// Associated mind map
    @Relationship(deleteRule: .cascade)
    var mindMap: MindMap?

    /// Associated flashcards
    @Relationship(deleteRule: .cascade)
    var flashcards: [Flashcard] = []

    /// Associated tasks
    @Relationship(deleteRule: .nullify)
    var tasks: [Task] = []

    init(
        title: String,
        subject: Subject,
        googleDriveFileID: String? = nil
    ) {
        self.id = UUID()
        self.title = title
        self.subject = subject
        self.createdAt = Date()
        self.googleDriveFileID = googleDriveFileID
        self.processingStatus = .pending
    }
}

/// Processing status for materials
enum ProcessingStatus: String, Codable {
    case pending
    case processing
    case completed
    case failed
}
```

##### Task 4: Subject Model
```swift
/// Subject categories for materials
enum Subject: String, Codable, CaseIterable {
    case math = "Math"
    case italian = "Italian"
    case physics = "Physics"
    case history = "History"
    case english = "English"
    case science = "Science"

    var icon: String {
        switch self {
        case .math: return "function"
        case .italian: return "book.closed"
        case .physics: return "atom"
        case .history: return "clock"
        case .english: return "globe"
        case .science: return "flask"
        }
    }

    var color: String {
        switch self {
        case .math: return "blue"
        case .italian: return "purple"
        case .physics: return "orange"
        case .history: return "brown"
        case .english: return "green"
        case .science: return "cyan"
        }
    }
}
```

##### Task 5: MindMap Model
```swift
/// Mind map for visualizing material concepts
@Model
final class MindMap {
    var id: UUID
    var createdAt: Date
    var rootNode: MindMapNode?

    /// All nodes (flattened)
    @Relationship(deleteRule: .cascade)
    var nodes: [MindMapNode] = []

    /// Parent material
    @Relationship(inverse: \Material.mindMap)
    var material: Material?

    init() {
        self.id = UUID()
        self.createdAt = Date()
    }
}

/// Individual node in a mind map
@Model
final class MindMapNode {
    var id: UUID
    var text: String
    var level: Int // 0 (root), 1, 2, 3 (max for Mario)

    /// DALL-E generated image URL
    var imageURL: URL?

    /// Position in canvas (for rendering)
    var positionX: Double = 0
    var positionY: Double = 0

    /// Parent node
    @Relationship
    var parent: MindMapNode?

    /// Child nodes
    @Relationship(deleteRule: .cascade, inverse: \MindMapNode.parent)
    var children: [MindMapNode] = []

    /// Owning mind map
    @Relationship(inverse: \MindMap.nodes)
    var mindMap: MindMap?

    init(text: String, level: Int) {
        self.id = UUID()
        self.text = text
        self.level = level
    }
}
```

##### Task 6: Flashcard Model
```swift
/// Flashcard for spaced repetition
@Model
final class Flashcard {
    var id: UUID
    var front: String
    var back: String
    var createdAt: Date

    /// SRS data
    var easeFactor: Double = 2.5
    var interval: Int = 0 // days
    var repetitions: Int = 0
    var dueDate: Date

    /// Parent material
    @Relationship(inverse: \Material.flashcards)
    var material: Material?

    init(front: String, back: String, material: Material? = nil) {
        self.id = UUID()
        self.front = front
        self.back = back
        self.createdAt = Date()
        self.dueDate = Date()
        self.material = material
    }

    /// Update SRS data after review
    func updateAfterReview(quality: Int) {
        // SuperMemo SM-2 algorithm
        if quality >= 3 {
            if repetitions == 0 {
                interval = 1
            } else if repetitions == 1 {
                interval = 6
            } else {
                interval = Int(Double(interval) * easeFactor)
            }
            repetitions += 1
        } else {
            repetitions = 0
            interval = 1
        }

        easeFactor = max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
        dueDate = Calendar.current.date(byAdding: .day, value: interval, to: Date()) ?? Date()
    }
}
```

##### Task 7: Task Model
```swift
/// Assignment or task to complete
@Model
final class Task {
    var id: UUID
    var title: String
    var taskDescription: String?
    var dueDate: Date?
    var completedAt: Date?
    var subject: Subject
    var createdAt: Date

    /// Source of task
    var source: TaskSource

    /// Google Calendar event ID
    var googleCalendarEventID: String?

    /// Gmail message ID
    var gmailMessageID: String?

    /// Associated material (if any)
    @Relationship(inverse: \Material.tasks)
    var material: Material?

    /// Completion status
    var isCompleted: Bool { completedAt != nil }

    init(
        title: String,
        subject: Subject,
        dueDate: Date?,
        source: TaskSource
    ) {
        self.id = UUID()
        self.title = title
        self.subject = subject
        self.dueDate = dueDate
        self.source = source
        self.createdAt = Date()
    }
}

/// Source of task creation
enum TaskSource: String, Codable {
    case manual
    case googleCalendar
    case gmail
}
```

##### Task 8: UserProgress Model
```swift
/// User progress for gamification
@Model
final class UserProgress {
    var id: UUID

    /// Experience points
    var xp: Int = 0

    /// Current level (1-100)
    var level: Int = 1

    /// XP required for next level
    var xpForNextLevel: Int = 100

    /// Unlocked achievements
    var achievements: [Achievement] = []

    /// Current streak (days)
    var currentStreak: Int = 0

    /// Longest streak
    var longestStreak: Int = 0

    /// Last study date
    var lastStudyDate: Date?

    /// Total study time (seconds)
    var totalStudyTime: TimeInterval = 0

    init() {
        self.id = UUID()
    }

    /// Add XP and check for level up
    func addXP(_ amount: Int) {
        xp += amount

        // Level up logic
        while xp >= xpForNextLevel {
            xp -= xpForNextLevel
            level += 1
            xpForNextLevel = calculateXPForLevel(level + 1)
        }
    }

    private func calculateXPForLevel(_ level: Int) -> Int {
        // Exponential scaling: level * 100 * 1.1^level
        Int(Double(level) * 100.0 * pow(1.1, Double(level)))
    }
}

/// Achievement badge
struct Achievement: Codable, Identifiable {
    var id: String
    var title: String
    var description: String
    var iconName: String
    var unlockedAt: Date
}
```

**Validation**:
- [ ] All models compile without errors
- [ ] Relationships correctly defined
- [ ] Cascade rules appropriate
- [ ] Models conform to Codable where needed
- [ ] SwiftLint passes

---

#### Task 9-10: CloudKit Setup
**Priority**: HIGH | **Depends on**: Tasks 3-8

##### Task 9: Setup CloudKit Container
**Deliverables**:
- ✅ CloudKit container created in Developer Portal
- ✅ Entitlements configured
- ✅ Capabilities enabled in Xcode
- ✅ Container initialized in app

**Implementation**:
```swift
// Entitlements: MirrorBuddy.entitlements
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array>
        <string>iCloud.com.yourname.MirrorBuddy</string>
    </array>
    <key>com.apple.developer.ubiquity-kvstore-identifier</key>
    <string>$(TeamIdentifierPrefix)com.yourname.MirrorBuddy</string>
</dict>
</plist>
```

##### Task 10: Implement CloudKit Sync
**Deliverables**:
- ✅ SwiftData + CloudKit integration
- ✅ Automatic sync working
- ✅ Conflict resolution strategy
- ✅ Sync status observable

**Implementation**:
```swift
import SwiftData
import SwiftUI

/// Main data model container with CloudKit sync
@MainActor
final class DataController: ObservableObject {
    static let shared = DataController()

    let modelContainer: ModelContainer

    private init() {
        let schema = Schema([
            Material.self,
            MindMap.self,
            MindMapNode.self,
            Flashcard.self,
            Task.self,
            UserProgress.self
        ])

        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .private("iCloud.com.yourname.MirrorBuddy")
        )

        do {
            modelContainer = try ModelContainer(
                for: schema,
                configurations: [modelConfiguration]
            )
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }

    var modelContext: ModelContext {
        modelContainer.mainContext
    }
}
```

**Validation**:
- [ ] Sync works across devices (test with 2 devices)
- [ ] Conflicts resolve correctly
- [ ] No data loss

---

#### Task 11-15: API Client Infrastructure
**Priority**: HIGH | **Depends on**: Task 1

You must create the API client infrastructure for all external services. These must be testable, mockable, and production-ready.

##### Task 11: OpenAI API Client
```swift
import Foundation

/// OpenAI API client for GPT-5 family and DALL-E
@MainActor
final class OpenAIClient {
    private let apiKey: String
    private let baseURL = URL(string: "https://api.openai.com/v1")!

    init(apiKey: String) {
        self.apiKey = apiKey
    }

    // MARK: - Chat Completion (GPT-5 family)

    struct ChatCompletionRequest: Codable {
        let model: String
        let messages: [Message]
        let temperature: Double
        let maxTokens: Int?

        enum CodingKeys: String, CodingKey {
            case model, messages, temperature
            case maxTokens = "max_tokens"
        }
    }

    struct Message: Codable {
        let role: String // "system", "user", "assistant"
        let content: String
    }

    struct ChatCompletionResponse: Codable {
        let id: String
        let choices: [Choice]
        let usage: Usage

        struct Choice: Codable {
            let message: Message
            let finishReason: String?

            enum CodingKeys: String, CodingKey {
                case message
                case finishReason = "finish_reason"
            }
        }

        struct Usage: Codable {
            let promptTokens: Int
            let completionTokens: Int
            let totalTokens: Int

            enum CodingKeys: String, CodingKey {
                case promptTokens = "prompt_tokens"
                case completionTokens = "completion_tokens"
                case totalTokens = "total_tokens"
            }
        }
    }

    func chatCompletion(request: ChatCompletionRequest) async throws -> ChatCompletionResponse {
        var urlRequest = URLRequest(url: baseURL.appendingPathComponent("chat/completions"))
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw OpenAIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw OpenAIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try JSONDecoder().decode(ChatCompletionResponse.self, from: data)
    }

    // MARK: - DALL-E Image Generation

    struct ImageGenerationRequest: Codable {
        let model: String = "dall-e-3"
        let prompt: String
        let n: Int = 1
        let size: String = "1024x1024"
        let quality: String = "standard"
    }

    struct ImageGenerationResponse: Codable {
        let data: [ImageData]

        struct ImageData: Codable {
            let url: String
        }
    }

    func generateImage(prompt: String) async throws -> URL {
        let request = ImageGenerationRequest(prompt: prompt)

        var urlRequest = URLRequest(url: baseURL.appendingPathComponent("images/generations"))
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw OpenAIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        let imageResponse = try JSONDecoder().decode(ImageGenerationResponse.self, from: data)
        guard let urlString = imageResponse.data.first?.url,
              let url = URL(string: urlString) else {
            throw OpenAIError.invalidResponse
        }

        return url
    }
}

enum OpenAIError: Error {
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError
    case rateLimitExceeded
}
```

##### Task 12: Gemini API Client
```swift
/// Google Gemini 2.5 Pro API client
@MainActor
final class GeminiClient {
    private let apiKey: String
    private let baseURL = URL(string: "https://generativelanguage.googleapis.com/v1beta")!

    init(apiKey: String) {
        self.apiKey = apiKey
    }

    struct GenerateContentRequest: Codable {
        let contents: [Content]

        struct Content: Codable {
            let parts: [Part]

            struct Part: Codable {
                let text: String
            }
        }
    }

    struct GenerateContentResponse: Codable {
        let candidates: [Candidate]

        struct Candidate: Codable {
            let content: Content

            struct Content: Codable {
                let parts: [Part]

                struct Part: Codable {
                    let text: String
                }
            }
        }
    }

    func generateContent(prompt: String) async throws -> String {
        let request = GenerateContentRequest(
            contents: [
                .init(parts: [.init(text: prompt)])
            ]
        )

        let url = baseURL
            .appendingPathComponent("models/gemini-2.5-pro:generateContent")
            .appending(queryItems: [URLQueryItem(name: "key", value: apiKey)])

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw GeminiError.httpError
        }

        let geminiResponse = try JSONDecoder().decode(GenerateContentResponse.self, from: data)
        guard let text = geminiResponse.candidates.first?.content.parts.first?.text else {
            throw GeminiError.invalidResponse
        }

        return text
    }
}

enum GeminiError: Error {
    case invalidResponse
    case httpError
}
```

##### Task 13: Google APIs Client (Drive, Calendar, Gmail)
```swift
import GoogleSignIn
import GoogleAPIClientForREST_Drive
import GoogleAPIClientForREST_Calendar
import GoogleAPIClientForREST_Gmail

/// Google Workspace APIs client
@MainActor
final class GoogleApisClient: ObservableObject {
    @Published var isSignedIn = false

    private var user: GIDGoogleUser?
    private let driveService = GTLRDriveService()
    private let calendarService = GTLRCalendarService()
    private let gmailService = GTLRGmailService()

    // OAuth 2.0 scopes
    private let scopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/gmail.readonly"
    ]

    func signIn() async throws {
        guard let presentingViewController = await UIApplication.shared.keyWindow?.rootViewController else {
            throw GoogleAuthError.noPresentingViewController
        }

        let result = try await GIDSignIn.sharedInstance.signIn(
            withPresenting: presentingViewController,
            hint: nil,
            additionalScopes: scopes
        )

        self.user = result.user
        self.isSignedIn = true

        // Configure services
        driveService.authorizer = user?.fetcherAuthorizer
        calendarService.authorizer = user?.fetcherAuthorizer
        gmailService.authorizer = user?.fetcherAuthorizer
    }

    // Drive methods will be implemented by api-integration-agent
    // Calendar methods will be implemented by api-integration-agent
    // Gmail methods will be implemented by api-integration-agent
}

enum GoogleAuthError: Error {
    case noPresentingViewController
    case cancelled
}
```

##### Task 14: API Error Handling and Retry Logic
```swift
/// Generic API error handler with retry logic
actor APIRetryHandler {
    private let maxRetries: Int
    private let baseDelay: TimeInterval

    init(maxRetries: Int = 3, baseDelay: TimeInterval = 1.0) {
        self.maxRetries = maxRetries
        self.baseDelay = baseDelay
    }

    func execute<T>(_ operation: @Sendable () async throws -> T) async throws -> T {
        var lastError: Error?

        for attempt in 0..<maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error

                // Don't retry on certain errors
                if !shouldRetry(error) {
                    throw error
                }

                // Exponential backoff
                let delay = baseDelay * pow(2.0, Double(attempt))
                try await Task.sleep(for: .seconds(delay))
            }
        }

        throw lastError ?? APIError.maxRetriesExceeded
    }

    private func shouldRetry(_ error: Error) -> Bool {
        // Retry on network errors, rate limits, server errors
        if let openAIError = error as? OpenAIError {
            switch openAIError {
            case .rateLimitExceeded, .httpError(let code) where code >= 500:
                return true
            default:
                return false
            }
        }
        return false
    }
}

enum APIError: Error {
    case maxRetriesExceeded
    case offline
}
```

##### Task 15: Keychain Storage
```swift
import Security
import Foundation

/// Secure storage for API keys and tokens
@MainActor
final class SecureStorage {
    static let shared = SecureStorage()

    private init() {}

    func store(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw SecureStorageError.encodingFailed
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        // Delete existing item
        SecItemDelete(query as CFDictionary)

        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw SecureStorageError.storeFailed(status: status)
        }
    }

    func retrieve(forKey key: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            throw SecureStorageError.retrieveFailed(status: status)
        }

        return string
    }

    func delete(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw SecureStorageError.deleteFailed(status: status)
        }
    }
}

enum SecureStorageError: Error {
    case encodingFailed
    case storeFailed(status: OSStatus)
    case retrieveFailed(status: OSStatus)
    case deleteFailed(status: OSStatus)
}

// Usage example:
// try SecureStorage.shared.store(apiKey, forKey: "openai_api_key")
// let key = try SecureStorage.shared.retrieve(forKey: "openai_api_key")
```

---

## Testing Requirements

### Unit Tests (>80% coverage required)

```swift
import Testing
import SwiftData
@testable import MirrorBuddy

@Suite("Foundation Tests")
struct FoundationTests {

    @Test("SwiftData models initialize correctly")
    func modelsInitialize() {
        let material = Material(title: "Test", subject: .math)
        #expect(material.title == "Test")
        #expect(material.subject == .math)
        #expect(material.processingStatus == .pending)
    }

    @Test("Material relationships work correctly")
    func materialRelationships() throws {
        let modelContainer = try ModelContainer(
            for: Material.self, MindMap.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let modelContext = ModelContext(modelContainer)

        let material = Material(title: "Test", subject: .math)
        let mindMap = MindMap()
        material.mindMap = mindMap

        modelContext.insert(material)
        try modelContext.save()

        #expect(material.mindMap != nil)
        #expect(mindMap.material?.id == material.id)
    }

    @Test("OpenAI client makes requests")
    func openAIClient() async throws {
        // Mock test with local server or real API in CI
        let client = OpenAIClient(apiKey: "test-key")
        // Add actual test implementation
    }

    @Test("Secure storage works")
    func secureStorage() throws {
        let key = "test-key"
        let value = "test-value"

        try SecureStorage.shared.store(value, forKey: key)
        let retrieved = try SecureStorage.shared.retrieve(forKey: key)
        #expect(retrieved == value)

        try SecureStorage.shared.delete(forKey: key)
    }
}
```

---

## Definition of Done

Before marking your work complete, verify:

- [ ] Xcode project builds successfully on both iOS and macOS
- [ ] SwiftLint: 0 warnings
- [ ] All SwiftData models defined and working
- [ ] CloudKit sync configured and tested
- [ ] All API clients implemented (OpenAI, Gemini, Google)
- [ ] Error handling and retry logic working
- [ ] Keychain storage working
- [ ] Unit tests passing (>80% coverage)
- [ ] Code reviewed by qa-agent
- [ ] Documentation complete (inline comments + README section)
- [ ] Other agents can import and use your infrastructure

---

## Handoff to Other Agents

Once complete, notify these agents that they can begin work:
- ✅ **swiftui-expert-agent** - Can start building views
- ✅ **swiftdata-agent** - Can start queries and migrations
- ✅ **api-integration-agent** - Can start API integrations
- ✅ **voice-agent** - Can start voice features
- ✅ **vision-agent** - Can start camera features
- ✅ **mindmap-agent** - Can start mind map generation
- ✅ **automation-agent** - Can start background tasks
- ✅ **test-agent** - Can start writing tests
- ✅ **accessibility-agent** - Can start accessibility work

---

## Resources

- [SwiftData Documentation](https://developer.apple.com/documentation/swiftdata)
- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google AI API Reference](https://ai.google.dev/api)
- [Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- Constitution: `.claude/constitution.md`
- Stack: `Docs/STACK_FINAL.md`

---

**You are critical to the project. Build a solid foundation and the rest will follow. 🏗️**
