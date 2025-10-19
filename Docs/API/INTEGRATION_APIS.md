# Integration APIs Documentation

External service integrations for Google Workspace, AI services, and cloud storage.

## Google Workspace Integration

### GoogleOAuthService

OAuth 2.0 authentication for Google services (Drive, Calendar, Gmail).

**Singleton**: `GoogleOAuthService.shared`

#### Configuration

```swift
// Required scopes
static let driveScopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file"
]

static let calendarScopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly"
]

static let gmailScopes = [
    "https://www.googleapis.com/auth/gmail.readonly"
]
```

#### Public Interface

##### `signIn()`

Initiate OAuth sign-in flow.

**Signature**:
```swift
func signIn() async throws
```

**Throws**:
- `GoogleOAuthError.authenticationFailed` - Sign-in failed
- `GoogleOAuthError.networkError` - Network unavailable

**Example**:
```swift
do {
    try await GoogleOAuthService.shared.signIn()
    print("Signed in successfully")
} catch {
    print("Sign-in error: \(error.localizedDescription)")
}
```

##### `getTokens()`

Get current OAuth tokens.

**Signature**:
```swift
func getTokens() async throws -> OAuthTokens?
```

**Returns**:
```swift
struct OAuthTokens {
    let accessToken: String
    let refreshToken: String?
    let expiresAt: Date
}
```

##### `signOut()`

Sign out and clear tokens.

**Signature**:
```swift
func signOut() async throws
```

##### `isAuthenticated`

Check if user is currently authenticated.

**Signature**:
```swift
var isAuthenticated: Bool { get }
```

**Example**:
```swift
if GoogleOAuthService.shared.isAuthenticated {
    // Proceed with API calls
} else {
    // Show sign-in prompt
}
```

---

### GoogleDriveClient

Access and download files from Google Drive.

**Singleton**: `GoogleDriveClient.shared`

#### Public Interface

##### `listFiles(inFolder:)`

List files in a Drive folder.

**Signature**:
```swift
func listFiles(inFolder folderID: String? = nil) async throws -> [DriveFile]
```

**Returns**:
```swift
struct DriveFile {
    let id: String
    let name: String
    let mimeType: String
    let modifiedTime: Date
    let size: Int64?
    let webViewLink: String?
}
```

**Example**:
```swift
let files = try await GoogleDriveClient.shared.listFiles(inFolder: "folder123")
for file in files {
    print("\(file.name) (\(file.mimeType))")
}
```

##### `downloadFile(_:)`

Download file content from Drive.

**Signature**:
```swift
func downloadFile(_ fileID: String) async throws -> Data
```

**Throws**:
- `GoogleDriveError.notAuthenticated` - User not signed in
- `GoogleDriveError.fileNotFound` - File doesn't exist
- `GoogleDriveError.downloadFailed` - Download error

**Example**:
```swift
let data = try await GoogleDriveClient.shared.downloadFile("file123")
// Process file data
```

##### `getFileMetadata(_:)`

Get file metadata without downloading content.

**Signature**:
```swift
func getFileMetadata(_ fileID: String) async throws -> DriveFile
```

---

### GoogleCalendarService

Sync calendar events and create assignments.

**Singleton**: `GoogleCalendarService.shared`

#### Configuration

```swift
func configure(modelContext: ModelContext)
```

#### Public Interface

##### `syncCalendarEvents()`

Fetch and sync all calendar events to local tasks.

**Signature**:
```swift
func syncCalendarEvents() async throws -> [GCalendarEvent]
```

**Returns**:
```swift
struct GCalendarEvent {
    let id: String
    let summary: String
    let description: String?
    let startDate: Date
    let endDate: Date
    let location: String?
}
```

**Throws**:
- `GoogleCalendarError.notAuthenticated` - User not signed in
- `GoogleCalendarError.networkError` - Network unavailable
- `GoogleCalendarError.apiError(String)` - API error

**Example**:
```swift
let events = try await GoogleCalendarService.shared.syncCalendarEvents()
print("Synced \(events.count) calendar events")
```

##### `createEvent(title:startDate:endDate:description:)`

Create a new calendar event.

**Signature**:
```swift
func createEvent(
    title: String,
    startDate: Date,
    endDate: Date,
    description: String? = nil
) async throws -> String
```

**Returns**: Created event ID

**Example**:
```swift
let eventID = try await GoogleCalendarService.shared.createEvent(
    title: "Study Math",
    startDate: Date(),
    endDate: Date().addingTimeInterval(3600),
    description: "Complete Chapter 3 problems"
)
```

---

### GmailService

Read and search Gmail messages.

**Singleton**: `GmailService.shared`

#### Public Interface

##### `searchMessages(query:)`

Search Gmail messages with query.

**Signature**:
```swift
func searchMessages(query: String) async throws -> [GmailMessage]
```

**Query Examples**:
- `"subject:homework"` - Messages with "homework" in subject
- `"from:teacher@school.com"` - Messages from specific sender
- `"after:2024/01/01"` - Messages after date

**Example**:
```swift
let messages = try await GmailService.shared.searchMessages(
    query: "subject:assignment after:2024/10/01"
)
```

##### `getMessageContent(_:)`

Get full message content.

**Signature**:
```swift
func getMessageContent(_ messageID: String) async throws -> GmailMessageContent
```

---

### DriveSyncService

Background synchronization for Google Drive files.

**Singleton**: `DriveSyncService.shared`

#### Public Interface

##### `startMonitoring(folderID:)`

Start monitoring a Drive folder for changes.

**Signature**:
```swift
func startMonitoring(folderID: String)
```

##### `syncNow()`

Trigger immediate sync.

**Signature**:
```swift
func syncNow() async throws
```

**Example**:
```swift
DriveSyncService.shared.startMonitoring(folderID: "myStudyFolder")

// Later: manual sync
try await DriveSyncService.shared.syncNow()
```

##### `getSyncStatus()`

Get current sync status.

**Signature**:
```swift
func getSyncStatus() -> SyncStatus

enum SyncStatus {
    case idle
    case syncing
    case error(String)
    case completed(Date)
}
```

---

## AI Service Integration

### GeminiClient

Google Gemini API client for AI-powered features.

#### Initialization

```swift
let config = GeminiConfiguration(
    apiKey: "your-api-key",
    model: .gemini25Pro
)
let client = GeminiClient(configuration: config)
```

Or load from environment:

```swift
guard let config = GeminiConfiguration.loadFromEnvironment() else {
    fatalError("Gemini API key not configured")
}
let client = GeminiClient(configuration: config)
```

#### Public Interface

##### `generateContent(prompt:model:temperature:maxTokens:systemInstruction:)`

Generate text content using Gemini.

**Signature**:
```swift
func generateContent(
    prompt: String,
    model: GeminiConfiguration.Model = .gemini25Pro,
    temperature: Double = 0.7,
    maxTokens: Int? = nil,
    systemInstruction: String? = nil
) async throws -> String
```

**Models**:
```swift
enum Model: String {
    case gemini25Pro = "gemini-2.5-pro-latest"
    case gemini25Flash = "gemini-2.5-flash-latest"
    case gemini15Pro = "gemini-1.5-pro"
    case gemini15Flash = "gemini-1.5-flash"
}
```

**Example**:
```swift
let response = try await client.generateContent(
    prompt: "Explain the Pythagorean theorem in simple terms",
    temperature: 0.7,
    systemInstruction: "You are a helpful math tutor"
)
print(response)
```

##### `analyzeWithVision(text:imageData:mimeType:model:)`

Analyze images with Gemini Vision.

**Signature**:
```swift
func analyzeWithVision(
    text: String,
    imageData: Data,
    mimeType: String = "image/jpeg",
    model: GeminiConfiguration.Model = .gemini25Pro
) async throws -> String
```

**Example**:
```swift
let analysis = try await client.analyzeWithVision(
    text: "What mathematical concepts are shown in this diagram?",
    imageData: imageData,
    mimeType: "image/jpeg"
)
```

##### `analyzeDriveFolder(folderPath:query:)`

Research and analyze Drive folder contents.

**Signature**:
```swift
func analyzeDriveFolder(
    folderPath: String,
    query: String
) async throws -> DriveAnalysisResult
```

---

### OpenAIClient

OpenAI API client for GPT models (used for flashcard generation).

#### Initialization

```swift
let config = OpenAIConfiguration(
    apiKey: "your-api-key",
    model: .gpt5Nano
)
let client = OpenAIClient(configuration: config)
```

#### Public Interface

##### `chatCompletion(model:messages:temperature:maxTokens:)`

Generate chat completion.

**Signature**:
```swift
func chatCompletion(
    model: OpenAIConfiguration.Model,
    messages: [ChatMessage],
    temperature: Double = 0.7,
    maxTokens: Int? = nil
) async throws -> ChatCompletionResponse
```

**Message Structure**:
```swift
struct ChatMessage {
    let role: Role  // .system, .user, .assistant
    let content: Content

    enum Role: String {
        case system, user, assistant
    }

    enum Content {
        case text(String)
        case multipart([Part])
    }
}
```

**Example**:
```swift
let response = try await client.chatCompletion(
    model: .gpt5Nano,
    messages: [
        ChatMessage(role: .system, content: .text("You are a flashcard creator")),
        ChatMessage(role: .user, content: .text("Create 5 flashcards about calculus"))
    ],
    temperature: 0.7,
    maxTokens: 2000
)
```

**Models**:
```swift
enum Model: String {
    case gpt5Nano = "gpt-5-nano"
    case gpt4o = "gpt-4o"
    case gpt4oMini = "gpt-4o-mini"
}
```

---

### OpenAIRealtimeClient

Real-time streaming API for conversational AI.

#### Public Interface

##### `connect()`

Establish WebSocket connection.

**Signature**:
```swift
func connect() async throws
```

##### `sendMessage(_:)`

Send message to real-time API.

**Signature**:
```swift
func sendMessage(_ message: String) async throws
```

##### `onResponse`

Callback for streaming responses.

**Signature**:
```swift
var onResponse: ((String) -> Void)?
```

**Example**:
```swift
let realtimeClient = OpenAIRealtimeClient(apiKey: "...")

realtimeClient.onResponse = { response in
    print("Streaming: \(response)")
}

try await realtimeClient.connect()
try await realtimeClient.sendMessage("Explain derivatives")
```

---

## Error Handling

### Google API Errors

```swift
enum GoogleOAuthError: LocalizedError {
    case authenticationFailed
    case tokenRefreshFailed
    case networkError
}

enum GoogleDriveError: LocalizedError {
    case notAuthenticated
    case fileNotFound
    case downloadFailed(String)
    case uploadFailed(String)
}

enum GoogleCalendarError: LocalizedError {
    case notAuthenticated
    case networkError
    case apiError(String)
    case invalidURL
}
```

### AI API Errors

```swift
enum GeminiError: LocalizedError {
    case invalidRequest(String)
    case invalidResponse
    case rateLimitExceeded
    case apiKeyInvalid
}

enum OpenAIError: LocalizedError {
    case invalidRequest
    case authenticationFailed
    case rateLimitExceeded
    case modelNotAvailable
}
```

### Error Handling Example

```swift
do {
    let events = try await GoogleCalendarService.shared.syncCalendarEvents()
} catch GoogleCalendarError.notAuthenticated {
    // Prompt user to sign in
    try await GoogleOAuthService.shared.signIn()
} catch GoogleCalendarError.networkError {
    // Show offline message
    print("Network unavailable")
} catch {
    // Generic error handling
    print("Sync failed: \(error.localizedDescription)")
}
```

---

## Rate Limiting

API clients implement rate limiting to prevent quota exhaustion:

```swift
// Gemini: 60 requests per minute (free tier)
private let rateLimiter = RateLimiter(requestsPerMinute: 60)

// OpenAI: varies by tier
private let rateLimiter = RateLimiter(requestsPerMinute: 90)
```

Rate limiter automatically waits if needed:

```swift
try await rateLimiter.waitIfNeeded()
// Proceed with API call
```

---

## Circuit Breaker Pattern

Integration APIs use circuit breakers for resilience:

```swift
let circuitBreaker = CircuitBreaker(
    failureThreshold: 5,
    timeout: 60.0
)

try await circuitBreaker.execute {
    // API call
}
```

States:
- **Closed**: Normal operation
- **Open**: Failures exceeded threshold, fail fast
- **Half-Open**: Testing if service recovered

---

For complete examples, see [EXAMPLES.md](EXAMPLES.md).
