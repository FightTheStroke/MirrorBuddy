# Voice API Documentation

Comprehensive voice interaction system with command recognition, natural language conversations, and smart intent detection.

## Voice System Architecture

```
User Voice Input
    ↓
WhisperTranscriptionService (Speech-to-Text)
    ↓
UnifiedVoiceManager (Intent Detection)
    ├─→ Command → VoiceCommandRegistry → AppVoiceCommandHandler
    └─→ Conversation → VoiceConversationService → AI Response
```

## Core Components

### UnifiedVoiceManager

Central orchestrator for all voice interactions with smart intent classification.

**Singleton**: `UnifiedVoiceManager.shared`

#### Intent Detection

The system automatically classifies voice input as either a command or conversation:

**Command Intent Signals**:
- Exact registry match (100% confidence)
- Command prefixes: "vai", "apri", "mostra", "chiudi", "cerca", "go", "open", "show", "close", "search"
- Short utterances (≤5 words)
- Context-specific patterns (e.g., "ultimo" on Dashboard)

**Conversation Intent Signals**:
- Question patterns: "?", "come", "perché", "why", "how", "explain"
- Long utterances (>12 words)
- No command prefix
- Low command match confidence

#### Public Interface

##### `startListening(completion:)`

Start voice input with automatic intent detection and execution.

**Signature**:
```swift
func startListening(completion: @escaping (VoiceResult) -> Void)
```

**Result Types**:
```swift
enum VoiceResult {
    case command(VoiceCommandResult)           // Command executed
    case conversation(String)                   // Conversation text
    case error(String)                         // Recognition/execution error
    case suggestions([VoiceCommand], originalText: String)  // Disambiguation
    case requiresConfirmation(VoiceCommand)    // Destructive action confirmation
}
```

**Example - Basic Usage**:
```swift
UnifiedVoiceManager.shared.startListening { result in
    switch result {
    case .command(.success(let command)):
        print("✓ Executed: \(command.name)")

    case .conversation(let text):
        // Pre-fill conversation view
        showConversation(withText: text)

    case .error(let message):
        showAlert(message)

    case .suggestions(let commands, let originalText):
        // Show disambiguation UI
        showCommandPicker(commands, original: originalText)

    case .requiresConfirmation(let command):
        // Show confirmation dialog
        confirmCommand(command)
    }
}
```

**Example - SwiftUI Integration**:
```swift
struct VoiceButton: View {
    @StateObject private var voiceManager = UnifiedVoiceManager.shared
    @State private var showConversation = false
    @State private var conversationText = ""

    var body: some View {
        Button {
            voiceManager.startListening { result in
                handleVoiceResult(result)
            }
        } label: {
            Image(systemName: voiceManager.isListening ? "mic.fill" : "mic")
        }
        .sheet(isPresented: $showConversation) {
            ConversationView(initialText: conversationText)
        }
    }

    private func handleVoiceResult(_ result: VoiceResult) {
        switch result {
        case .command:
            break  // Handled automatically

        case .conversation(let text):
            conversationText = text
            showConversation = true

        case .error(let message):
            print("Voice error: \(message)")
        }
    }
}
```

##### `stopListening()`

Stop active voice input.

**Signature**:
```swift
func stopListening()
```

##### `updateContext(_:)`

Update voice context for context-aware intent detection.

**Signature**:
```swift
func updateContext(_ context: VoiceContext)
```

**Context Structure**:
```swift
struct VoiceContext {
    var currentScreen: String
    var activeMaterial: String?
    var activeStudySession: String?
    var recentCommands: [String]
}
```

**Example**:
```swift
// In MaterialDetailView
.onAppear {
    UnifiedVoiceManager.shared.updateContext(
        VoiceContext(
            currentScreen: "MaterialDetail",
            activeMaterial: material.id.uuidString
        )
    )
}
```

##### `detectIntentWithConfidence(from:context:)`

Manually detect intent from text with confidence scoring.

**Signature**:
```swift
func detectIntentWithConfidence(
    from text: String,
    context: VoiceContext
) -> IntentResult
```

**Returns**:
```swift
struct IntentResult {
    let intent: VoiceIntent       // .command or .conversation
    let confidence: Double         // 0.0 - 1.0
    let reason: String            // Debug explanation
}
```

**Example**:
```swift
let result = UnifiedVoiceManager.shared.detectIntentWithConfidence(
    from: "show my math materials",
    context: VoiceContext(currentScreen: "Dashboard")
)

print("Intent: \(result.intent)")
print("Confidence: \(String(format: "%.0f%%", result.confidence * 100))")
print("Reason: \(result.reason)")
// Output:
// Intent: command
// Confidence: 95%
// Reason: Command prefix detected, Short utterance (4 words)
```

---

### VoiceCommandRegistry

Central registry of available voice commands.

**Singleton**: `VoiceCommandRegistry.shared`

#### Voice Command Structure

```swift
struct VoiceCommand {
    let name: String
    let triggers: [String]
    let action: VoiceCommandAction
    let context: VoiceContext
    let description: String
}

enum VoiceCommandAction {
    case navigateTo(Screen)
    case showMaterials(QueryFilter?)
    case createFlashcards(UUID)
    case startStudySession
    case showCalendar
    case syncGoogleDrive
    // ... more actions
}
```

#### Public Interface

##### `availableCommands()`

Get all registered voice commands.

**Signature**:
```swift
func availableCommands() -> [VoiceCommand]
```

##### `register(command:)`

Register a new voice command.

**Signature**:
```swift
func register(command: VoiceCommand)
```

**Example**:
```swift
let command = VoiceCommand(
    name: "Show Math Materials",
    triggers: ["show math", "mostra matematica", "math materials"],
    action: .showMaterials(.subject("Math")),
    context: .global,
    description: "Display all mathematics study materials"
)
VoiceCommandRegistry.shared.register(command: command)
```

##### `matchCommand(text:)`

Find command matching input text.

**Signature**:
```swift
func matchCommand(text: String) -> VoiceCommand?
```

##### `fuzzyMatch(text:threshold:)`

Find command using fuzzy matching with Jaccard similarity.

**Signature**:
```swift
func fuzzyMatch(text: String, threshold: Double) -> VoiceCommand?
```

**Example**:
```swift
// Handles typos/variations
let command = VoiceCommandRegistry.shared.fuzzyMatch(
    text: "shw materils",  // typos
    threshold: 0.75
)
```

##### `suggestCommands(for:maxSuggestions:)`

Suggest similar commands using Levenshtein distance.

**Signature**:
```swift
func suggestCommands(
    for text: String,
    maxSuggestions: Int = 3
) -> [VoiceCommand]
```

**Example**:
```swift
let suggestions = VoiceCommandRegistry.shared.suggestCommands(
    for: "show calenda",  // typo
    maxSuggestions: 3
)
// Returns: ["Show Calendar", "Show Materials", ...]
```

---

### VoiceCommandRecognitionService

Low-level speech recognition service.

**Singleton**: `VoiceCommandRecognitionService.shared`

#### Public Interface

##### `startListening()`

Start speech recognition.

**Signature**:
```swift
func startListening() throws
```

**Throws**:
- `VoiceRecognitionError.notAuthorized` - Microphone permission denied
- `VoiceRecognitionError.unavailable` - Speech recognition unavailable

##### `stopListening()`

Stop speech recognition.

**Signature**:
```swift
func stopListening()
```

#### Callbacks

```swift
var onCommandRecognized: ((String) -> Void)?
var onError: ((Error) -> Void)?
```

**Example**:
```swift
let service = VoiceCommandRecognitionService.shared

service.onCommandRecognized = { text in
    print("Recognized: \(text)")
}

service.onError = { error in
    print("Error: \(error.localizedDescription)")
}

try service.startListening()
```

---

### WhisperTranscriptionService

Audio transcription using Whisper API for high-quality transcription.

**Singleton**: `WhisperTranscriptionService.shared`

#### Public Interface

##### `transcribe(audioURL:)`

Transcribe audio file to text.

**Signature**:
```swift
func transcribe(audioURL: URL) async throws -> String
```

**Supported Formats**: WAV, MP3, M4A, FLAC

**Example**:
```swift
let text = try await WhisperTranscriptionService.shared.transcribe(
    audioURL: recordingURL
)
print("Transcription: \(text)")
```

##### `transcribeWithTimestamps(audioURL:)`

Transcribe with word-level timestamps.

**Signature**:
```swift
func transcribeWithTimestamps(
    audioURL: URL
) async throws -> [TimestampedWord]

struct TimestampedWord {
    let word: String
    let startTime: TimeInterval
    let endTime: TimeInterval
}
```

---

### VoiceConversationService

Extended AI conversations with voice.

**Singleton**: `VoiceConversationService.shared`

#### Public Interface

##### `startConversation(material:initialMessage:)`

Start a new voice conversation.

**Signature**:
```swift
func startConversation(
    material: Material?,
    initialMessage: String
) async throws -> VoiceConversation
```

**Example**:
```swift
let conversation = try await VoiceConversationService.shared.startConversation(
    material: currentMaterial,
    initialMessage: "Explain the Pythagorean theorem"
)
```

##### `sendMessage(_:conversation:)`

Send message in ongoing conversation.

**Signature**:
```swift
func sendMessage(
    _ message: String,
    conversation: VoiceConversation
) async throws -> String
```

**Returns**: AI response

##### `endConversation(_:)`

End and save conversation.

**Signature**:
```swift
func endConversation(_ conversation: VoiceConversation) async throws
```

---

## Voice Analytics

### VoiceAnalytics

Track voice command performance and usage patterns.

**Singleton**: `VoiceAnalytics.shared`

#### Automatic Tracking

Metrics automatically tracked for each command:
- Recognition latency
- Intent detection latency
- Execution latency
- Total latency
- Success/failure status

#### Public Interface

##### `trackCommandExecution(...)`

Manual metric tracking (usually automatic).

**Signature**:
```swift
func trackCommandExecution(
    text: String,
    recognitionLatency: TimeInterval,
    intentLatency: TimeInterval,
    executionLatency: TimeInterval,
    totalLatency: TimeInterval,
    success: Bool
)
```

##### `getAverageLatency(for:)`

Get average command latency.

**Signature**:
```swift
func getAverageLatency(for commandText: String? = nil) -> TimeInterval
```

**Example**:
```swift
// Average for specific command
let avgLatency = VoiceAnalytics.shared.getAverageLatency(
    for: "show materials"
)
print("Avg latency: \(Int(avgLatency * 1000))ms")

// Overall average
let overallAvg = VoiceAnalytics.shared.getAverageLatency()
```

##### `getSuccessRate(for:)`

Get command success rate.

**Signature**:
```swift
func getSuccessRate(for commandText: String? = nil) -> Double
```

**Returns**: Success rate (0.0 - 1.0)

##### `getMetrics()`

Get all collected metrics.

**Signature**:
```swift
func getMetrics() -> [VoiceCommandMetric]

struct VoiceCommandMetric {
    let text: String
    let recognitionLatency: TimeInterval
    let intentLatency: TimeInterval
    let executionLatency: TimeInterval
    let totalLatency: TimeInterval
    let success: Bool
    let timestamp: Date
}
```

---

## Voice Command Cache

### VoiceCommandCache

LRU cache for frequently used commands to improve performance.

**Singleton**: `VoiceCommandCache.shared`

#### Configuration

- **Max Size**: 50 commands
- **Eviction**: Least Recently Used (LRU)

#### Public Interface

##### `get(_:)`

Get cached command action.

**Signature**:
```swift
func get(_ text: String) -> VoiceCommandAction?
```

##### `set(_:action:)`

Cache command action.

**Signature**:
```swift
func set(_ text: String, action: VoiceCommandAction)
```

##### `clear()`

Clear entire cache.

**Signature**:
```swift
func clear()
```

---

## Common Voice Commands

### Navigation Commands

| Italian | English | Action |
|---------|---------|--------|
| "vai a dashboard" | "go to dashboard" | Navigate to dashboard |
| "mostra materiali" | "show materials" | Open materials list |
| "apri calendario" | "open calendar" | Open calendar view |
| "torna indietro" | "go back" | Navigate back |

### Material Commands

| Italian | English | Action |
|---------|---------|--------|
| "ultimo materiale" | "latest material" | Open newest material |
| "materiali matematica" | "math materials" | Filter by subject |
| "cerca fisica" | "search physics" | Search materials |

### Study Commands

| Italian | English | Action |
|---------|---------|--------|
| "crea flashcard" | "create flashcards" | Generate flashcards |
| "inizia sessione" | "start session" | Begin study session |
| "mostra riassunto" | "show summary" | Display summary |

### Sync Commands

| Italian | English | Action |
|---------|---------|--------|
| "sincronizza drive" | "sync drive" | Sync Google Drive |
| "aggiorna calendario" | "update calendar" | Sync calendar |

---

## Error Handling

```swift
enum VoiceRecognitionError: LocalizedError {
    case notAuthorized
    case unavailable
    case recognitionFailed(String)
    case timeout

    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Microphone access denied"
        case .unavailable:
            return "Speech recognition unavailable"
        case .recognitionFailed(let reason):
            return "Recognition failed: \(reason)"
        case .timeout:
            return "Recognition timeout"
        }
    }
}
```

---

For complete examples, see [EXAMPLES.md](EXAMPLES.md).
