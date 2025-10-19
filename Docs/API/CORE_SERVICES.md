# Core Services API Documentation

## Material Processing Services

### MaterialProcessingPipeline

Parallel material processing pipeline coordinator that orchestrates summary generation, mind mapping, flashcard creation, and image generation.

**Import**: `import MirrorBuddy`

#### Public Interface

##### `processMaterial(_:options:progressHandler:)`

Process a single material through the complete pipeline with parallel execution.

**Signature**:
```swift
func processMaterial(
    _ material: Material,
    options: ProcessingOptions,
    progressHandler: @escaping (ProcessingProgress) -> Void
) async throws
```

**Parameters**:
- `material`: Material to process
- `options`: Processing configuration (steps to enable, fail-fast mode, priority)
- `progressHandler`: Closure called with progress updates

**Throws**:
- `MaterialProcessingError.summaryFailed(Error)` - Summary generation failed
- `MaterialProcessingError.mindMapFailed(Error)` - Mind map generation failed
- `MaterialProcessingError.imagesFailed(Error)` - Image generation failed
- `MaterialProcessingError.flashcardsFailed(Error)` - Flashcard generation failed

**Example**:
```swift
let material = Material(title: "Calculus Basics")
try await MaterialProcessingPipeline.shared.processMaterial(
    material,
    options: ProcessingOptions(
        enabledSteps: [.summary, .mindMap, .flashcards],
        failFast: false
    ),
    progressHandler: { progress in
        print("Step: \(progress.currentStep.displayName)")
        print("Progress: \(progress.percentComplete * 100)%")
    }
)
```

##### `processMaterials(_:options:progressHandler:)`

Process multiple materials with controlled concurrency (max 3 concurrent operations).

**Signature**:
```swift
func processMaterials(
    _ materials: [Material],
    options: ProcessingOptions,
    progressHandler: @escaping (BatchProgress) -> Void
) async throws
```

**Parameters**:
- `materials`: Array of materials to process
- `options`: Processing configuration
- `progressHandler`: Closure called with batch progress updates

**Example**:
```swift
try await MaterialProcessingPipeline.shared.processMaterials(
    allMaterials,
    options: ProcessingOptions(enabledSteps: [.summary, .mindMap]),
    progressHandler: { progress in
        print("Completed: \(progress.completed)/\(progress.total)")
        print("Failed: \(progress.failed)")
    }
)
```

##### `scheduleBackgroundProcessing(for:)`

Schedule background processing for pending materials.

**Signature**:
```swift
func scheduleBackgroundProcessing(for materials: [Material])
```

**Example**:
```swift
MaterialProcessingPipeline.shared.scheduleBackgroundProcessing(for: pendingMaterials)
```

##### `cancelAllProcessing()`

Cancel all active and queued processing operations.

**Signature**:
```swift
func cancelAllProcessing()
```

#### Supporting Types

```swift
struct ProcessingOptions {
    var enabledSteps: Set<ProcessingStep>
    var failFast: Bool
    var priority: Priority

    enum Priority {
        case low, normal, high
    }
}

enum ProcessingStep: CaseIterable {
    case summary
    case mindMap
    case images
    case flashcards
    case explanations
}

struct ProcessingProgress {
    let currentStep: ProcessingStep
    let stepStatus: StepStatus  // .pending, .inProgress, .completed, .failed
    let completedSteps: Int
    let totalSteps: Int
    var percentComplete: Double
}
```

---

## Learning Services

### FlashcardGenerationService

AI-powered flashcard generation using GPT-5 Nano with spaced repetition support (SM-2 algorithm).

#### Public Interface

##### `generateFlashcards(from:materialID:subject:targetCount:)`

Generate flashcards from study material text.

**Signature**:
```swift
func generateFlashcards(
    from text: String,
    materialID: UUID,
    subject: Subject? = nil,
    targetCount: Int? = nil
) async throws -> [Flashcard]
```

**Parameters**:
- `text`: Material content text (minimum 50 words)
- `materialID`: ID of parent material
- `subject`: Subject for context-specific flashcard generation
- `targetCount`: Target number of flashcards (default: ~5 per 1000 words)

**Returns**: Array of generated flashcards (stored in SwiftData automatically)

**Throws**:
- `FlashcardGenerationError.contentTooShort` - Text < 50 words
- `FlashcardGenerationError.noClientAvailable` - API client not configured
- `FlashcardGenerationError.invalidResponse` - Invalid API response

**Example**:
```swift
let flashcards = try await FlashcardGenerationService.shared.generateFlashcards(
    from: material.textContent ?? "",
    materialID: material.id,
    subject: .matematica,
    targetCount: 15
)
print("Generated \(flashcards.count) flashcards")
```

##### `getFlashcards(for:)`

Retrieve all flashcards for a material.

**Signature**:
```swift
func getFlashcards(for materialID: UUID) throws -> [Flashcard]
```

##### `getDueFlashcards(for:)`

Get flashcards due for review (based on SM-2 algorithm).

**Signature**:
```swift
func getDueFlashcards(for materialID: UUID) throws -> [Flashcard]
```

**Example**:
```swift
let dueCards = try FlashcardGenerationService.shared.getDueFlashcards(for: material.id)
print("\(dueCards.count) cards due for review")
```

##### `getStatistics(for:)`

Get flashcard learning statistics.

**Signature**:
```swift
func getStatistics(for materialID: UUID) throws -> FlashcardStatistics
```

**Returns**:
```swift
struct FlashcardStatistics {
    let total: Int
    let reviewed: Int
    let due: Int
    let mastered: Int  // repetitions >= 3, easeFactor >= 2.5
    let averageEaseFactor: Double
    var reviewProgress: Double  // reviewed / total
    var masteryProgress: Double  // mastered / total
}
```

---

## Voice Services

### UnifiedVoiceManager

Unified voice interaction orchestrator with smart intent detection (command vs. conversation).

#### Public Interface

##### `startListening(completion:)`

Start listening for voice input with automatic intent detection.

**Signature**:
```swift
func startListening(completion: @escaping (VoiceResult) -> Void)
```

**Parameters**:
- `completion`: Closure called with recognition result

**Result**:
```swift
enum VoiceResult {
    case command(VoiceCommandResult)
    case conversation(String)
    case error(String)
    case suggestions([VoiceCommand], originalText: String)
    case requiresConfirmation(VoiceCommand)
}
```

**Example**:
```swift
UnifiedVoiceManager.shared.startListening { result in
    switch result {
    case .command(.success(let command)):
        print("Executed: \(command.name)")
    case .conversation(let text):
        // Start AI conversation with pre-filled text
        print("Conversation: \(text)")
    case .error(let message):
        print("Error: \(message)")
    case .suggestions(let commands, let original):
        print("Did you mean: \(commands.map { $0.name })?")
    }
}
```

##### `stopListening()`

Stop voice input listening.

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

**Example**:
```swift
UnifiedVoiceManager.shared.updateContext(
    VoiceContext(
        currentScreen: "MaterialDetail",
        activeMaterial: materialID.uuidString,
        recentCommands: ["show summary", "create flashcards"]
    )
)
```

##### `detectIntentWithConfidence(from:context:)`

Detect intent from text with confidence scoring.

**Signature**:
```swift
func detectIntentWithConfidence(from text: String, context: VoiceContext) -> IntentResult
```

**Returns**:
```swift
struct IntentResult {
    let intent: VoiceIntent  // .command or .conversation
    let confidence: Double   // 0.0 - 1.0
    let reason: String      // Explanation for debugging
}
```

**Example**:
```swift
let result = UnifiedVoiceManager.shared.detectIntentWithConfidence(
    from: "show my math materials",
    context: VoiceContext(currentScreen: "Dashboard")
)
print("Intent: \(result.intent), Confidence: \(result.confidence)")
```

#### Performance Features

- **LRU Cache**: Frequently used commands cached (max 50 items)
- **Analytics**: Automatic latency tracking (recognition, intent, execution, total)
- **Fuzzy Matching**: Similarity-based command matching with threshold
- **Command Suggestions**: Levenshtein distance-based disambiguation

---

### StudyCoachPersonality

AI study coach with personalized personality and encouragement.

#### Public Interface

##### `generateResponse(to:context:)`

Generate coach response to student input.

**Signature**:
```swift
func generateResponse(
    to input: String,
    context: CoachContext
) async throws -> String
```

**Example**:
```swift
let response = try await StudyCoachPersonality.shared.generateResponse(
    to: "I don't understand derivatives",
    context: CoachContext(
        subject: "Math",
        recentProgress: 0.65,
        strugglingAreas: ["calculus"]
    )
)
```

---

## Analysis Services

### OCRService

Optical character recognition for extracting text from images.

#### Public Interface

##### `recognizeText(in:)`

Extract text from image data.

**Signature**:
```swift
func recognizeText(in imageData: Data) async throws -> String
```

**Example**:
```swift
let extractedText = try await OCRService.shared.recognizeText(in: imageData)
```

---

### VisionAnalysisService

AI-powered image analysis using Gemini Vision.

#### Public Interface

##### `analyzeImage(_:prompt:)`

Analyze image with custom prompt.

**Signature**:
```swift
func analyzeImage(
    _ imageData: Data,
    prompt: String
) async throws -> String
```

**Example**:
```swift
let analysis = try await VisionAnalysisService.shared.analyzeImage(
    imageData,
    prompt: "Identify mathematical equations in this image"
)
```

---

### HandwritingRecognitionService

Convert handwritten notes to text.

#### Public Interface

##### `recognizeHandwriting(in:)`

Extract handwritten text from image.

**Signature**:
```swift
func recognizeHandwriting(in imageData: Data) async throws -> String
```

---

## Summary Generation Services

### SummaryGenerationService

AI-powered summary generation for study materials.

#### Public Interface

##### `generateSummary(for:)`

Generate concise summary from text content.

**Signature**:
```swift
func generateSummary(for text: String) async throws -> String
```

**Example**:
```swift
let summary = try await SummaryGenerationService.shared.generateSummary(
    for: material.textContent ?? ""
)
material.summary = summary
```

---

## Mind Map Services

### MindMapGenerationService

Create structured mind maps from material content.

#### Public Interface

##### `generateMindMap(from:materialID:)`

Generate mind map structure from content.

**Signature**:
```swift
func generateMindMap(from text: String, materialID: UUID) async throws -> MindMap
```

**Returns**: MindMap with hierarchical node structure

---

### MindMapImageGenerationService

Generate visual representations of mind maps.

#### Public Interface

##### `generateImages(for:)`

Generate images for mind map nodes.

**Signature**:
```swift
func generateImages(for nodes: [MindMapNode]) async throws -> [String: Data]
```

**Returns**: Dictionary mapping node IDs to image data

---

## Accessibility Services

### DyslexiaFriendlyTextService

Text rendering optimization for dyslexic users.

#### Public Interface

##### `processText(_:)`

Process text for dyslexia-friendly rendering.

**Signature**:
```swift
func processText(_ text: String) -> ProcessedText
```

---

### TextToSpeechService

Text-to-speech output service.

#### Public Interface

##### `speak(_:language:rate:)`

Speak text aloud with customizable settings.

**Signature**:
```swift
func speak(
    _ text: String,
    language: String = "it-IT",
    rate: Float = 0.5
) async throws
```

**Example**:
```swift
try await TextToSpeechService.shared.speak(
    material.summary ?? "",
    language: "it-IT",
    rate: 0.5
)
```

---

## Performance Monitoring

### PerformanceMonitor

App-wide performance tracking and metrics.

#### Public Interface

##### `trackOperation(_:duration:)`

Track operation performance.

**Signature**:
```swift
func trackOperation(_ name: String, duration: TimeInterval)
```

##### `getMetrics()`

Get collected performance metrics.

**Signature**:
```swift
func getMetrics() -> [PerformanceMetric]
```

---

For complete usage examples, see [EXAMPLES.md](EXAMPLES.md).
