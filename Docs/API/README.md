# MirrorBuddy API Documentation

Complete API reference for MirrorBuddy iOS app - an AI-powered study assistant with voice control, material processing, and intelligent learning features.

## Documentation Structure

- [Core Services](CORE_SERVICES.md) - Material processing, flashcards, voice commands, study coach
- [Data Models](DATA_MODELS.md) - SwiftData models and queries
- [Integration APIs](INTEGRATION_APIS.md) - Google Workspace, Gemini AI
- [Voice API](VOICE_API.md) - Voice command system and conversation
- [Material API](MATERIAL_API.md) - Material query and processing
- [Usage Examples](EXAMPLES.md) - Common workflows and code samples

## Quick Start

```swift
import MirrorBuddy

// Process material with full pipeline
let material = Material(title: "Calculus Chapter 1")
try await MaterialProcessingPipeline.shared.processMaterial(
    material,
    options: ProcessingOptions(
        enabledSteps: [.summary, .flashcards, .mindMap]
    ),
    progressHandler: { progress in
        print("Progress: \(progress.percentComplete * 100)%")
    }
)

// Generate flashcards
let flashcards = try await FlashcardGenerationService.shared.generateFlashcards(
    from: material.textContent ?? "",
    materialID: material.id
)

// Use voice commands
UnifiedVoiceManager.shared.startListening { result in
    switch result {
    case .command(let commandResult):
        print("Command executed: \(commandResult)")
    case .conversation(let text):
        print("Conversation started: \(text)")
    case .error(let message):
        print("Error: \(message)")
    }
}
```

## API Categories

### Core Services

**Material Processing**
- `MaterialProcessingPipeline` - Parallel processing pipeline for materials
- `MaterialTextExtractionService` - Extract text from PDFs and images
- `SummaryGenerationService` - AI-powered summary generation
- `MindMapGenerationService` - Mind map creation from content
- `MindMapImageGenerationService` - Visual representation of mind maps

**Learning Tools**
- `FlashcardGenerationService` - Spaced repetition flashcard generation
- `QuizGenerationService` - Quiz creation from materials
- `SimplifiedExplanationService` - Concept simplification for learning

**Voice & Interaction**
- `UnifiedVoiceManager` - Unified voice interaction orchestrator
- `VoiceCommandRecognitionService` - Voice command recognition
- `VoiceConversationService` - Extended AI conversations
- `WhisperTranscriptionService` - Audio transcription
- `StudyCoachPersonality` - AI study coach personality

**Analysis & Support**
- `OCRService` - Optical character recognition
- `VisionAnalysisService` - Image analysis
- `HandwritingRecognitionService` - Handwriting to text
- `TextToSpeechService` - Text-to-speech output
- `DyslexiaFriendlyTextService` - Accessibility features

### Data Models

**Core Models**
- `Material` - Study material entity
- `Flashcard` - Spaced repetition flashcard
- `MindMap` - Mind map structure
- `Subject` / `SubjectEntity` - Subject categorization
- `Task` - Assignment and task tracking
- `UserProgress` - Progress tracking

**Support Models**
- `VoiceConversation` - Voice conversation history
- `Transcript` - Audio transcriptions
- `TrackedDriveFile` - Google Drive file tracking

### Integration APIs

**Google Workspace**
- `GoogleOAuthService` - OAuth 2.0 authentication
- `GoogleDriveClient` - Drive file access
- `GoogleCalendarService` - Calendar event sync
- `GmailService` - Gmail integration
- `DriveSyncService` - Background Drive sync

**AI Services**
- `GeminiClient` - Google Gemini API client
- `OpenAIClient` - OpenAI API client (GPT-5 Nano)
- `OpenAIRealtimeClient` - Real-time OpenAI streaming

### Utilities

**Query & Search**
- `SmartQueryParser` - AI-powered natural language queries
- `MaterialQueryParser` - Material lookup for voice commands
- `SubjectDetectionService` - Automatic subject detection

**Performance & Monitoring**
- `PerformanceMonitor` - App performance tracking
- `VoiceAnalytics` - Voice command analytics
- `VoiceCommandCache` - LRU cache for commands
- `CircuitBreaker` - API resilience patterns

**Accessibility**
- `AccessibilityAudit` - Accessibility compliance
- `OneHandedOptimization` - One-handed use optimization
- `TouchTargetHelpers` - Touch target utilities
- `LocalizationManager` - Multi-language support

## Architecture Principles

### SwiftData Integration

All models use SwiftData for persistence with proper relationship handling:

```swift
@Model
final class Material {
    var id = UUID()
    var title: String

    @Relationship(deleteRule: .cascade, inverse: \Flashcard.material)
    var flashcards: [Flashcard]?
}
```

### Async/Await Patterns

All async operations use Swift concurrency:

```swift
func generateFlashcards(from text: String) async throws -> [Flashcard] {
    // Async implementation
}
```

### Actor Isolation

Services use `@MainActor` for UI-safe operations:

```swift
@MainActor
final class MaterialProcessingPipeline {
    static let shared = MaterialProcessingPipeline()
}
```

### Error Handling

Comprehensive error types with localized descriptions:

```swift
enum MaterialProcessingError: LocalizedError {
    case summaryFailed(Error)
    case mindMapFailed(Error)

    var errorDescription: String? {
        // Localized error messages
    }
}
```

## Performance Considerations

### Parallel Processing

Material processing uses structured concurrency for parallel operations:

```swift
try await withThrowingTaskGroup(of: Void.self) { group in
    group.addTask { try await generateSummary() }
    group.addTask { try await generateFlashcards() }
    try await group.waitForAll()
}
```

### Caching Strategies

- Voice command cache (LRU, max 50 items)
- API response caching with circuit breakers
- SwiftData query optimization

### Rate Limiting

API clients implement rate limiting:

```swift
private let rateLimiter = RateLimiter(requestsPerMinute: 60)
try await rateLimiter.waitIfNeeded()
```

## Testing

### Unit Tests

Services provide testable interfaces:

```swift
// Configure with test model context
FlashcardGenerationService.shared.configure(modelContext: testContext)
```

### Mock Data

Use preview containers for SwiftUI previews:

```swift
@MainActor
let previewContainer: ModelContainer = {
    let container = try! ModelContainer(
        for: Material.self,
        configurations: ModelConfiguration(isStoredInMemoryOnly: true)
    )
    return container
}()
```

## Support

For questions, issues, or contributions:
- GitHub Issues: [MirrorBuddy Issues](https://github.com/...)
- Documentation: This API reference
- Code examples: See [EXAMPLES.md](EXAMPLES.md)

## Version

**API Version**: 1.0
**Last Updated**: 2025-10-19
**Compatibility**: iOS 17.0+, Swift 6.0+
