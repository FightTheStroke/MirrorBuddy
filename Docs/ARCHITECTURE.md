# MirrorBuddy Architecture

**Last Updated:** 2025-10-19
**Version:** 0.9.0
**Status:** Living Document

---

## Overview

MirrorBuddy is a voice-first, multimodal learning operating system built for neurodiverse learners. The architecture follows Clean Architecture principles with SwiftUI and SwiftData, emphasizing offline-first capabilities, accessibility, and AI-powered assistance.

---

## Architecture Principles

### 1. Clean Architecture
- **Dependency Inversion** - Core business logic independent of frameworks
- **Separation of Concerns** - Clear boundaries between layers
- **Testability** - Easy to unit test core services
- **Maintainability** - Modular design for easy updates

### 2. Offline-First
- **Local Storage** - SwiftData as primary data store
- **CloudKit Sync** - Optional cloud backup and sync
- **Background Tasks** - Sync when network available
- **Graceful Degradation** - Core features work without internet

### 3. Accessibility-First
- **VoiceOver Support** - Full screen reader compatibility
- **Dynamic Type** - Respects system text size
- **High Contrast** - WCAG AA/AAA compliance
- **Large Touch Targets** - 48px+ minimum for children

### 4. Voice-First
- **Unified Voice Interface** - Single entry point for all voice interactions
- **Intent Detection** - Automatic command vs conversation routing
- **Natural Language** - Italian language support
- **Multimodal** - Voice + vision + text integration

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MirrorBuddy iOS App                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Presentation Layer                     │  │
│  │                      (SwiftUI Views)                      │  │
│  │                                                           │  │
│  │  ├─ Dashboard          ├─ Materials        ├─ Voice      │  │
│  │  ├─ Homework Help      ├─ Tasks            ├─ Settings   │  │
│  │  └─ Study Views        └─ Mind Maps        └─ Onboarding │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Service Layer                        │  │
│  │                    (Business Logic)                       │  │
│  │                                                           │  │
│  │  Voice Services:                                          │  │
│  │  ├─ UnifiedVoiceManager        (Intent detection)         │  │
│  │  ├─ VoiceCommandRecognitionService (Speech recognition)   │  │
│  │  ├─ VoiceConversationService   (Conversation management)  │  │
│  │  └─ AppVoiceCommandHandler     (Command execution)        │  │
│  │                                                           │  │
│  │  Material Services:                                       │  │
│  │  ├─ MaterialProcessor          (Auto-processing)          │  │
│  │  ├─ FlashcardGenerator         (Flashcard creation)       │  │
│  │  └─ MaterialProcessingPipeline (Processing coordination)  │  │
│  │                                                           │  │
│  │  AI Services:                                             │  │
│  │  ├─ OpenAIRealtimeClient       (Voice conversations)      │  │
│  │  ├─ GeminiClient               (AI assistance)            │  │
│  │  └─ WhisperTranscriptionService (Audio transcription)     │  │
│  │                                                           │  │
│  │  Integration Services:                                    │  │
│  │  ├─ GoogleOAuthService         (Authentication)           │  │
│  │  ├─ GmailService                (Email integration)        │  │
│  │  ├─ GoogleCalendarService       (Calendar integration)     │  │
│  │  └─ UpdateManager              (Multi-service sync)       │  │
│  │                                                           │  │
│  │  Core Services:                                           │  │
│  │  ├─ StudyCoachPersonality      (Empathetic coaching)      │  │
│  │  ├─ EncouragementService       (Motivational messages)    │  │
│  │  └─ FeedbackService            (User feedback tracking)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                       Data Layer                          │  │
│  │                    (SwiftData Models)                     │  │
│  │                                                           │  │
│  │  ├─ Material            (Study materials)                 │  │
│  │  ├─ MindMap             (Visual knowledge graphs)         │  │
│  │  ├─ Flashcard           (Study cards)                     │  │
│  │  ├─ VoiceConversation   (Voice sessions)                  │  │
│  │  ├─ Task                (Study tasks)                     │  │
│  │  └─ Transcript          (Lesson transcripts)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Persistence Layer                       │  │
│  │                                                           │  │
│  │  ├─ SwiftData Container (Local SQLite)                    │  │
│  │  ├─ CloudKit Sync       (Cloud backup)                    │  │
│  │  └─ Keychain            (Secure credentials)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                          │
│                                                                 │
│  ├─ OpenAI (Realtime API, Chat, Whisper)                       │
│  ├─ Google (Drive, Gmail, Calendar, OAuth)                     │
│  ├─ Apple (CloudKit, Speech, VisionKit)                        │
│  └─ Gemini (AI assistance)                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Presentation Layer (SwiftUI Views)

**Responsibilities:**
- User interface rendering
- User input handling
- Navigation and routing
- Accessibility support
- State management (via @State, @StateObject)

**Key Components:**
- `MainTabView` - Tab navigation container
- `DashboardView` - Today Card and study overview
- `MaterialsView` - Material library
- `HomeworkHelpView` - AI homework assistance
- `VoiceConversationView` - Voice chat interface
- `SmartVoiceButton` - Unified voice entry point

**Design Patterns:**
- MVVM (Model-View-ViewModel)
- Declarative UI with SwiftUI
- Composition over inheritance
- Unidirectional data flow

### 2. Service Layer (Business Logic)

**Responsibilities:**
- Business rule implementation
- Orchestration of data operations
- API communication
- Error handling and recovery
- Background task coordination

**Key Services:**

#### Voice Services
- **UnifiedVoiceManager** - Intent detection and routing
  - Smart command vs conversation detection
  - Callback-based integration with recognition service
  - Fallback to conversation mode

- **VoiceCommandRecognitionService** - Speech-to-text
  - Apple Speech framework integration
  - Command matching against registry
  - Real-time transcription

- **VoiceConversationService** - Conversation persistence
  - SwiftData conversation storage
  - Message history management
  - Metadata tracking

- **AppVoiceCommandHandler** - Command execution
  - Navigation command handling
  - Action dispatch
  - State updates

#### Material Services
- **MaterialProcessor** - Auto-processing pipeline
  - Keyword extraction
  - Metadata generation
  - Bloom's taxonomy classification
  - Concurrent processing

- **FlashcardGenerator** - Flashcard creation
  - AI-powered card generation
  - Spaced repetition optimization
  - Question-answer pair creation

#### AI Services
- **OpenAIRealtimeClient** - Voice conversations
  - WebSocket streaming
  - Real-time audio processing
  - Delta message handling

- **GeminiClient** - AI assistance
  - Homework help
  - Explanations
  - Content generation

- **WhisperTranscriptionService** - Audio transcription
  - Lesson recording transcription
  - Timestamp alignment
  - Segment merging

#### Integration Services
- **UpdateManager** - Multi-service sync orchestration
  - Google Drive file sync
  - Gmail assignment extraction
  - Calendar event import
  - Background task scheduling

- **GoogleOAuthService** - Authentication
  - OAuth 2.0 flow
  - Token refresh
  - Credential storage

### 3. Data Layer (SwiftData Models)

**Responsibilities:**
- Data structure definition
- Relationships management
- Validation rules
- CloudKit schema

**Key Models:**

```swift
// Material - Study content
@Model class Material {
    var id: UUID
    var title: String
    var content: String
    var subject: Subject
    var keywords: [String]
    var difficulty: String
    var bloomLevel: String
    var createdAt: Date
    var updatedAt: Date

    // Relationships
    @Relationship(deleteRule: .cascade) var flashcards: [Flashcard]
    @Relationship(deleteRule: .cascade) var mindMaps: [MindMap]
    @Relationship var transcript: Transcript?
}

// VoiceConversation - Voice session
@Model class VoiceConversation {
    var id: UUID
    var title: String
    var messages: [VoiceMessage]?
    var createdAt: Date
    var duration: TimeInterval
}

// MindMap - Visual knowledge graph
@Model class MindMap {
    var id: UUID
    var title: String
    var centralConcept: String
    var nodes: [MindMapNode]
    var material: Material?
}

// Flashcard - Study card
@Model class Flashcard {
    var id: UUID
    var question: String
    var answer: String
    var difficulty: String
    var material: Material?
}

// Task - Study task
@Model class Task {
    var id: UUID
    var title: String
    var description: String
    var dueDate: Date?
    var isCompleted: Bool
    var priority: Priority
}

// Transcript - Lesson transcript
@Model class Transcript {
    var id: UUID
    var text: String
    var duration: TimeInterval
    var wordCount: Int
    var language: String
    var createdAt: Date
    var material: Material?
}
```

**Relationships:**
- Material → Flashcards (one-to-many, cascade delete)
- Material → MindMaps (one-to-many, cascade delete)
- Material → Transcript (one-to-one, cascade delete)

### 4. Persistence Layer

**SwiftData Container:**
- Local SQLite database
- Automatic schema migration
- Query optimization
- Transaction management

**CloudKit Sync:**
- CKContainer for user data
- Background sync tasks
- Conflict resolution
- Privacy-first design

**Keychain:**
- API key storage
- OAuth tokens
- Sensitive credentials
- Secure enclave support

---

## Voice System Architecture

### Unified Voice Model (Task 139)

The voice system consolidates multiple entry points into a single unified interface:

```
User Speaks → SmartVoiceButton → UnifiedVoiceManager → Intent Detection
                                                             │
                                                             ├─→ Command Detection
                                                             │   - Registry lookup
                                                             │   - Prefix matching
                                                             │   - Length heuristic
                                                             │   - Execute command
                                                             │
                                                             └─→ Conversation Mode
                                                                 - OpenAI Realtime
                                                                 - GPT-4 streaming
                                                                 - Context aware
```

**Intent Detection Algorithm:**
1. Check VoiceCommandRegistry for exact matches
2. Match command prefixes ("vai", "apri", "mostra", "chiudi")
3. Length heuristic (≤5 words = likely command)
4. Question patterns ("spiegami", "come", "perché", "?")
5. Default to conversation for ambiguous cases

**Benefits:**
- 80% reduction in UI complexity (5 → 1 entry points)
- Clear user mental model
- Improved discoverability
- Consistent behavior across app

---

## Data Flow Examples

### Voice Command Flow

```
1. User taps SmartVoiceButton
2. SmartVoiceButton shows recording UI
3. User speaks: "Vai al materiale di matematica"
4. VoiceCommandRecognitionService transcribes speech
5. UnifiedVoiceManager detects intent = COMMAND
6. AppVoiceCommandHandler executes navigation
7. App navigates to Materials view filtered by Math
```

### Material Import Flow

```
1. User imports PDF via Google Drive sync
2. UpdateManager fetches file metadata
3. MaterialProcessor creates Material entity
4. Auto-processing pipeline runs:
   - Extract text via VisionKit
   - Generate keywords via AI
   - Classify difficulty
   - Assign Bloom's taxonomy level
   - Store metadata
5. Material appears in library
6. CloudKit syncs to other devices
```

### Voice Conversation Flow

```
1. User taps SmartVoiceButton
2. User speaks: "Spiegami le frazioni come se fossi in Fortnite"
3. UnifiedVoiceManager detects intent = CONVERSATION
4. VoiceConversationView opens
5. OpenAIRealtimeClient establishes WebSocket
6. Audio streams to OpenAI
7. GPT-4 responds with Fortnite analogy
8. Audio plays back to user
9. Conversation saved to SwiftData
10. CloudKit syncs conversation
```

---

## Background Tasks

### Registered Tasks
- `com.mirrorbuddy.backgroundsync` - Multi-service sync
- `com.mirrorbuddy.cloudkitsync` - CloudKit updates
- `com.mirrorbuddy.materialsync` - Material processing queue

### Sync Strategy
1. **Opportunistic** - Sync when app opens
2. **Background Refresh** - Every 4-6 hours
3. **Push Notifications** - On CloudKit changes
4. **Manual Trigger** - "Aggiornami" button

---

## Security Architecture

### API Key Management
- **Keychain Storage** - Secure credential storage
- **Environment Separation** - Dev/Prod keys
- **Rotation Support** - Easy key updates
- **No Hardcoding** - Keys never in code

### OAuth Flow
1. User taps "Connect Google"
2. Safari opens OAuth consent screen
3. User grants permissions
4. Redirect with authorization code
5. Exchange for access + refresh tokens
6. Store tokens in Keychain
7. Auto-refresh before expiration

### Data Privacy
- **Local-First** - Data stays on device by default
- **CloudKit Private Database** - User-owned cloud data
- **No Analytics** - No user tracking
- **Transparent API Usage** - User knows what's sent to AI

---

## Performance Considerations

### Material Processing
- **Concurrent Queue** - Process multiple materials in parallel
- **Background Thread** - Never block main thread
- **Progress Callbacks** - Update UI incrementally
- **Error Recovery** - Retry failed items

### Voice Recognition
- **Streaming** - Real-time audio streaming to reduce latency
- **Local Fallback** - Apple Speech for offline support
- **Connection Pooling** - Reuse WebSocket connections
- **Buffer Management** - Efficient audio buffer handling

### CloudKit Sync
- **Batch Operations** - Sync multiple records at once
- **Change Tokens** - Only fetch changes since last sync
- **Priority Queue** - User-initiated syncs first
- **Throttling** - Respect rate limits

---

## Testing Strategy

### Unit Tests (~40% coverage)
- Core service logic
- Data model validation
- Business rule verification
- Utility function testing

### Integration Tests
- UpdateManager sync flow
- Voice conversation persistence
- Material processing pipeline
- CloudKit sync operations

### UI Tests (Partial)
- Critical user flows
- Accessibility compliance
- Voice button interaction
- Navigation paths

### Performance Tests
- Sync performance baselines
- Transcription speed
- Mind map generation time
- Material processing throughput

---

## Deployment Architecture

### Build Configuration
- **Swift 6.0** - Concurrency model enabled
- **iOS 17.0+** - Minimum deployment target
- **macOS 14.0+** - Development requirement
- **Xcode 16+** - Latest tooling

### Supported Devices
- iPhone SE (3rd gen) - Minimum screen size
- iPhone 15 Pro Max - Maximum screen size
- iPad (10th gen) - Tablet support
- All models support Dynamic Island where available

### App Distribution
- TestFlight for beta testing
- App Store for public release
- Enterprise distribution (future)

---

## Technology Stack

### Core Technologies
- **SwiftUI** - UI framework
- **SwiftData** - Data persistence
- **Combine** - Reactive programming
- **CloudKit** - Cloud sync
- **AVFoundation** - Audio processing

### Apple Frameworks
- **Speech** - Voice recognition
- **VisionKit** - Document scanning
- **VoiceOver** - Accessibility
- **AVKit** - Media playback

### Third-Party APIs
- **OpenAI** - Realtime, Chat, Whisper
- **Google** - Drive, Gmail, Calendar
- **Gemini** - AI assistance

### Development Tools
- **SwiftLint** - Code quality
- **Task Master** - Project management
- **tmQA** - Quality assurance
- **Git** - Version control

---

## Known Limitations

### Current (v0.9.0)
- Flashcard generation disabled (partial implementation)
- UnifiedVoiceManager command execution needs deeper integration
- Some tasks marked "done" without full implementation
- Test coverage at 40% (target: 60%)
- 56 build warnings remain (target: <30)

### Planned Improvements
- Complete voice command integration
- Increase test coverage to 60%
- Reduce build warnings below 30
- Add offline voice recognition fallback
- Implement full mind map export
- Add parent/teacher dashboard

---

## Architecture Evolution

### Version 0.1-0.5 (Foundation)
- SwiftData models
- Basic UI structure
- Google integration
- CloudKit setup

### Version 0.6-0.8 (Features)
- Voice conversations
- Material processing
- Mind map generation
- Background sync

### Version 0.9.0 (Consolidation)
- Unified voice system
- Dashboard redesign
- Quality assurance
- Build stabilization

### Version 1.0 (Target)
- Complete voice integration
- 60%+ test coverage
- Production-ready stability
- App Store release

---

## References

### Key Documentation
- [ADR-001: Technology Stack](ADR/001-technology-stack-and-architecture.md)
- [Unified Voice Model](UNIFIED_VOICE_MODEL.md)
- [Dashboard Design Spec](DASHBOARD_DESIGN_SPEC.md)
- [TMQAReport](TMQAReport.md)

### External Resources
- [SwiftData Documentation](https://developer.apple.com/documentation/swiftdata)
- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)

---

**This architecture is a living document and evolves with the project.**
**Last major revision: 2025-10-19 (v0.9.0)**
