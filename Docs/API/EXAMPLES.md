# API Usage Examples

Comprehensive code examples for common MirrorBuddy workflows.

## Table of Contents

1. [Material Import and Processing](#material-import-and-processing)
2. [Flashcard Generation and Review](#flashcard-generation-and-review)
3. [Voice Commands](#voice-commands)
4. [Google Workspace Integration](#google-workspace-integration)
5. [AI Conversations](#ai-conversations)
6. [Progress Tracking](#progress-tracking)
7. [SwiftUI Integration](#swiftui-integration)

---

## Material Import and Processing

### Basic Material Creation

```swift
import SwiftData

// Create material
let material = Material(
    title: "Calculus Chapter 1: Limits",
    subject: mathSubject,
    googleDriveFileID: nil
)

// Add text content
material.textContent = """
Limits are fundamental to calculus...
[content here]
"""

// Save to SwiftData
modelContext.insert(material)
try modelContext.save()
```

### Import from PDF

```swift
import SwiftData

// Extract text from PDF
let pdfURL = URL(fileURLWithPath: "/path/to/textbook.pdf")
let extractedText = try await MaterialTextExtractionService.shared.extractText(
    from: pdfURL
)

// Create material
let material = Material(title: pdfURL.deletingPathExtension().lastPathComponent)
material.pdfURL = pdfURL
material.textContent = extractedText
material.processingStatus = .pending

// Auto-detect subject
let subject = try await SubjectDetectionService.shared.detectSubject(
    from: extractedText
)
material.subject = SubjectEntity(from: subject)

// Save
modelContext.insert(material)
try modelContext.save()
```

### Full Processing Pipeline

```swift
// Process material with all features
try await MaterialProcessingPipeline.shared.processMaterial(
    material,
    options: ProcessingOptions(
        enabledSteps: [.summary, .mindMap, .flashcards, .images],
        failFast: false,
        priority: .high
    ),
    progressHandler: { progress in
        print("Step: \(progress.currentStep.displayName)")
        print("Progress: \(Int(progress.percentComplete * 100))%")

        switch progress.stepStatus {
        case .inProgress:
            print("⏳ Processing...")
        case .completed:
            print("✓ Completed")
        case .failed:
            print("✗ Failed")
        case .pending:
            print("⋯ Pending")
        }
    }
)

print("Material processing complete!")
```

### Batch Processing

```swift
// Process multiple materials
let pendingMaterials = allMaterials.filter { $0.needsReprocessing }

try await MaterialProcessingPipeline.shared.processMaterials(
    pendingMaterials,
    options: ProcessingOptions(
        enabledSteps: [.summary, .mindMap],
        failFast: false
    ),
    progressHandler: { progress in
        print("Batch: \(progress.completed)/\(progress.total)")
        print("Failed: \(progress.failed)")

        if !progress.errors.isEmpty {
            print("Errors:")
            for error in progress.errors {
                print("  - \(error.localizedDescription)")
            }
        }
    }
)
```

### Background Processing

```swift
// Schedule low-priority background processing
MaterialProcessingPipeline.shared.scheduleBackgroundProcessing(
    for: pendingMaterials
)

// Processing happens automatically in background
```

---

## Flashcard Generation and Review

### Generate Flashcards

```swift
// Configure service
FlashcardGenerationService.shared.configure(modelContext: modelContext)

// Generate flashcards
let flashcards = try await FlashcardGenerationService.shared.generateFlashcards(
    from: material.textContent ?? "",
    materialID: material.id,
    subject: .matematica,
    targetCount: 15
)

print("Generated \(flashcards.count) flashcards")

// Flashcards are automatically saved to SwiftData
```

### Review Flashcards with SM-2

```swift
// Get due flashcards
let dueCards = try FlashcardGenerationService.shared.getDueFlashcards(
    for: material.id
)

print("\(dueCards.count) cards due for review")

// Present flashcard to user
for flashcard in dueCards {
    print("Q: \(flashcard.question)")

    // User answers (simulate here)
    let userAnswer = getUserAnswer()

    print("A: \(flashcard.answer)")

    // Rate quality (0-5)
    let quality = assessAnswerQuality(userAnswer, correctAnswer: flashcard.answer)

    // Update flashcard using SM-2 algorithm
    flashcard.review(quality: quality)

    print("Next review: \(flashcard.nextReviewDate)")
    print("Interval: \(flashcard.interval) days")
    print("Ease factor: \(String(format: "%.2f", flashcard.easeFactor))")
}

// Save updates
try modelContext.save()
```

### Flashcard Statistics

```swift
let stats = try FlashcardGenerationService.shared.getStatistics(
    for: material.id
)

print("Total flashcards: \(stats.total)")
print("Reviewed: \(stats.reviewed)")
print("Due for review: \(stats.due)")
print("Mastered: \(stats.mastered)")
print("Review progress: \(Int(stats.reviewProgress * 100))%")
print("Mastery progress: \(Int(stats.masteryProgress * 100))%")
print("Average ease factor: \(String(format: "%.2f", stats.averageEaseFactor))")
```

### Custom Flashcard Creation

```swift
// Manual flashcard creation
let flashcard = Flashcard(
    materialID: material.id,
    question: "What is the derivative of sin(x)?",
    answer: "cos(x)",
    explanation: "The derivative of sine is cosine. This is a fundamental trigonometric derivative."
)

modelContext.insert(flashcard)
try modelContext.save()
```

---

## Voice Commands

### Basic Voice Command

```swift
import SwiftUI

struct VoiceButton: View {
    @StateObject private var voiceManager = UnifiedVoiceManager.shared
    @State private var resultMessage = ""

    var body: some View {
        VStack {
            Button {
                voiceManager.startListening { result in
                    handleResult(result)
                }
            } label: {
                HStack {
                    Image(systemName: voiceManager.isListening ? "mic.fill" : "mic")
                    Text(voiceManager.isListening ? "Listening..." : "Tap to Speak")
                }
                .padding()
                .background(voiceManager.isListening ? Color.red : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }

            if !resultMessage.isEmpty {
                Text(resultMessage)
                    .padding()
            }
        }
    }

    private func handleResult(_ result: VoiceResult) {
        switch result {
        case .command(.success(let command)):
            resultMessage = "✓ Executed: \(command.name)"

        case .conversation(let text):
            resultMessage = "💬 Starting conversation: \(text)"

        case .error(let message):
            resultMessage = "✗ Error: \(message)"

        case .suggestions(let commands, let original):
            resultMessage = "Did you mean: \(commands.map { $0.name }.joined(separator: ", "))?"

        case .requiresConfirmation(let command):
            resultMessage = "⚠️ Confirm: \(command.name)?"
        }
    }
}
```

### Context-Aware Voice

```swift
struct MaterialDetailView: View {
    let material: Material

    var body: some View {
        VStack {
            Text(material.title)

            // Voice button with context
            SmartVoiceButton()
        }
        .onAppear {
            // Set voice context for better intent detection
            UnifiedVoiceManager.shared.updateContext(
                VoiceContext(
                    currentScreen: "MaterialDetail",
                    activeMaterial: material.id.uuidString,
                    recentCommands: []
                )
            )
        }
    }
}

// Now voice commands like "show summary" or "create flashcards"
// automatically understand they should apply to this material
```

### Custom Voice Command Registration

```swift
// Register custom command
let customCommand = VoiceCommand(
    name: "Export Mind Map",
    triggers: [
        "export mind map",
        "esporta mappa",
        "save mind map"
    ],
    action: .custom { material in
        // Custom action
        guard let mindMap = material.mindMap else { return }
        try await MindMapExportService.shared.export(mindMap)
    },
    context: .materialDetail,
    description: "Export the current material's mind map"
)

VoiceCommandRegistry.shared.register(command: customCommand)
```

### Voice Analytics

```swift
// Check voice command performance
let avgLatency = VoiceAnalytics.shared.getAverageLatency(
    for: "show materials"
)
print("Average latency: \(Int(avgLatency * 1000))ms")

let successRate = VoiceAnalytics.shared.getSuccessRate()
print("Overall success rate: \(Int(successRate * 100))%")

// Get detailed metrics
let metrics = VoiceAnalytics.shared.getMetrics()
for metric in metrics.suffix(5) {  // Last 5 commands
    print("""
    Command: \(metric.text)
    Total latency: \(Int(metric.totalLatency * 1000))ms
    Success: \(metric.success)
    """)
}
```

---

## Google Workspace Integration

### Google Sign-In

```swift
struct GoogleSignInView: View {
    @State private var isSignedIn = false
    @State private var errorMessage = ""

    var body: some View {
        VStack {
            if isSignedIn {
                Text("✓ Signed in to Google")
                    .foregroundColor(.green)

                Button("Sign Out") {
                    Task {
                        try? await GoogleOAuthService.shared.signOut()
                        isSignedIn = false
                    }
                }
            } else {
                Button("Sign in with Google") {
                    Task {
                        do {
                            try await GoogleOAuthService.shared.signIn()
                            isSignedIn = true
                        } catch {
                            errorMessage = error.localizedDescription
                        }
                    }
                }

                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                }
            }
        }
        .onAppear {
            isSignedIn = GoogleOAuthService.shared.isAuthenticated
        }
    }
}
```

### Import from Google Drive

```swift
// List Drive files
let files = try await GoogleDriveClient.shared.listFiles(inFolder: "myStudyFolder")

print("Found \(files.count) files:")
for file in files {
    print("  - \(file.name) (\(file.mimeType))")
}

// Import specific file
let driveFile = files.first { $0.name.contains("Calculus") }!

let material = try await GoogleDriveDownloadService.shared.downloadAndImport(
    fileID: driveFile.id
)

print("Imported: \(material.title)")

// Start tracking for sync
try DriveFileService.shared.trackFile(driveFile)
```

### Calendar Sync

```swift
// Sync calendar events
let events = try await GoogleCalendarService.shared.syncCalendarEvents()

print("Synced \(events.count) calendar events")

// Events are automatically converted to tasks
@Query(
    filter: #Predicate<Task> { $0.googleCalendarEventID != nil }
)
var calendarTasks: [Task]

print("Calendar tasks: \(calendarTasks.count)")

// Create new calendar event
let eventID = try await GoogleCalendarService.shared.createEvent(
    title: "Study Session: Calculus",
    startDate: Date(),
    endDate: Date().addingTimeInterval(3600),  // 1 hour
    description: "Complete Chapter 3 exercises"
)
print("Created event: \(eventID)")
```

### Gmail Integration

```swift
// Search for homework assignments in Gmail
let messages = try await GmailService.shared.searchMessages(
    query: "subject:homework OR subject:assignment after:2024/10/01"
)

print("Found \(messages.count) homework-related messages")

// Get message content
for message in messages {
    let content = try await GmailService.shared.getMessageContent(message.id)
    print("""
    From: \(content.from)
    Subject: \(content.subject)
    Date: \(content.date)
    Body: \(content.body)
    """)

    // Create task from message
    let task = Task(
        title: content.subject,
        desc: content.body,
        dueDate: extractDueDate(from: content.body) ?? Date()
    )
    modelContext.insert(task)
}

try modelContext.save()
```

---

## AI Conversations

### Start Voice Conversation

```swift
struct ConversationView: View {
    let material: Material
    @State private var conversation: VoiceConversation?
    @State private var messages: [Message] = []
    @State private var inputText = ""

    var body: some View {
        VStack {
            ScrollView {
                ForEach(messages, id: \.id) { message in
                    MessageBubble(message: message)
                }
            }

            HStack {
                TextField("Ask a question...", text: $inputText)
                    .textFieldStyle(.roundedBorder)

                Button("Send") {
                    sendMessage()
                }

                Button {
                    startVoiceInput()
                } label: {
                    Image(systemName: "mic.fill")
                }
            }
            .padding()
        }
        .onAppear {
            startConversation()
        }
    }

    private func startConversation() {
        Task {
            conversation = try await VoiceConversationService.shared.startConversation(
                material: material,
                initialMessage: "Help me understand this material"
            )
        }
    }

    private func sendMessage() {
        guard !inputText.isEmpty, let conv = conversation else { return }

        let userMessage = Message(
            id: UUID().uuidString,
            role: "user",
            content: inputText,
            timestamp: Date()
        )
        messages.append(userMessage)

        Task {
            let response = try await VoiceConversationService.shared.sendMessage(
                inputText,
                conversation: conv
            )

            let aiMessage = Message(
                id: UUID().uuidString,
                role: "assistant",
                content: response,
                timestamp: Date()
            )
            messages.append(aiMessage)

            inputText = ""
        }
    }

    private func startVoiceInput() {
        UnifiedVoiceManager.shared.startListening { result in
            if case .conversation(let text) = result {
                inputText = text
                sendMessage()
            }
        }
    }
}
```

### AI-Powered Homework Help

```swift
// Ask homework question with material context
let client = GeminiClient(configuration: config)

let prompt = """
Material: \(material.title)
Subject: \(material.subject?.name ?? "General")

Student question: How do I solve this derivative: d/dx(x^2 * sin(x))?

Provide a step-by-step explanation suitable for a high school student.
"""

let response = try await client.generateContent(
    prompt: prompt,
    temperature: 0.7,
    systemInstruction: "You are a patient and helpful study coach for high school students."
)

print("AI Response:")
print(response)
```

### Image Analysis for Math

```swift
// Analyze math problem from photo
let imageData = capturedPhoto.jpegData(compressionQuality: 0.8)!

let analysis = try await client.analyzeWithVision(
    text: "Solve this mathematical problem step by step and explain each step",
    imageData: imageData
)

print("Problem solution:")
print(analysis)
```

---

## Progress Tracking

### Study Session Tracking

```swift
// Start study session
let session = StudySession(
    date: Date(),
    durationMinutes: 0,
    subject: "Mathematics",
    flashcardsCompleted: 0,
    accuracy: 0.0
)

modelContext.insert(session)

// Track flashcard reviews
var correct = 0
var total = 0

for flashcard in dueFlashcards {
    // Present flashcard
    let isCorrect = reviewFlashcard(flashcard)

    total += 1
    if isCorrect {
        correct += 1
    }

    session.flashcardsCompleted += 1
    session.accuracy = Double(correct) / Double(total)
}

// End session
let endTime = Date()
session.durationMinutes = Int(endTime.timeIntervalSince(session.date) / 60)

try modelContext.save()

print("""
Session complete!
Duration: \(session.durationMinutes) minutes
Flashcards: \(session.flashcardsCompleted)
Accuracy: \(Int(session.accuracy * 100))%
""")
```

### User Progress

```swift
// Update user progress
let progress = UserProgress()
progress.studyStreak = calculateStreak()
progress.totalStudyMinutes += sessionDuration
progress.flashcardsReviewed += flashcardsCompleted
progress.materialsCompleted += 1
progress.averageScore = calculateAverageScore()
progress.lastStudyDate = Date()

modelContext.insert(progress)
try modelContext.save()

print("""
🔥 Study streak: \(progress.studyStreak) days
⏱️ Total study time: \(progress.totalStudyMinutes) minutes
📚 Materials completed: \(progress.materialsCompleted)
📊 Average score: \(Int(progress.averageScore * 100))%
""")
```

---

## SwiftUI Integration

### Material List with Query

```swift
struct MaterialListView: View {
    @Query(
        filter: #Predicate<Material> { $0.processingStatus == .completed },
        sort: \Material.lastAccessedAt,
        order: .reverse
    )
    private var materials: [Material]

    @State private var selectedSubject: String?

    var filteredMaterials: [Material] {
        guard let subject = selectedSubject else {
            return materials
        }
        return materials.filter { $0.subject?.name == subject }
    }

    var body: some View {
        List {
            ForEach(filteredMaterials) { material in
                NavigationLink(destination: MaterialDetailView(material: material)) {
                    MaterialRow(material: material)
                }
            }
        }
        .navigationTitle("Materials")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu("Filter") {
                    Button("All") { selectedSubject = nil }
                    ForEach(Subject.allCases, id: \.self) { subject in
                        Button(subject.rawValue) {
                            selectedSubject = subject.rawValue
                        }
                    }
                }
            }
        }
    }
}
```

### Material Processing with Progress

```swift
struct ProcessingView: View {
    let material: Material

    @State private var progress: ProcessingProgress?
    @State private var isProcessing = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            if isProcessing {
                ProgressView(value: progress?.percentComplete ?? 0) {
                    Text("Processing: \(progress?.currentStep.displayName ?? "")")
                }
                .padding()
            } else {
                Button("Process Material") {
                    processMateria()
                }
            }

            if let error = errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .padding()
            }
        }
    }

    private func processMaterial() {
        isProcessing = true
        errorMessage = nil

        Task {
            do {
                try await MaterialProcessingPipeline.shared.processMaterial(
                    material,
                    options: ProcessingOptions(
                        enabledSteps: [.summary, .mindMap, .flashcards]
                    ),
                    progressHandler: { prog in
                        DispatchQueue.main.async {
                            progress = prog
                        }
                    }
                )
                isProcessing = false
            } catch {
                errorMessage = error.localizedDescription
                isProcessing = false
            }
        }
    }
}
```

### Flashcard Review Interface

```swift
struct FlashcardReviewView: View {
    let material: Material

    @State private var dueCards: [Flashcard] = []
    @State private var currentIndex = 0
    @State private var showAnswer = false

    var currentCard: Flashcard? {
        guard currentIndex < dueCards.count else { return nil }
        return dueCards[currentIndex]
    }

    var body: some View {
        VStack {
            if let card = currentCard {
                VStack(spacing: 20) {
                    Text("\(currentIndex + 1) / \(dueCards.count)")
                        .font(.caption)

                    Text(card.question)
                        .font(.title2)
                        .multilineTextAlignment(.center)
                        .padding()

                    if showAnswer {
                        Text(card.answer)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .padding()

                        if let explanation = card.explanation {
                            Text(explanation)
                                .font(.caption)
                                .foregroundColor(.gray)
                                .padding()
                        }

                        // Quality buttons
                        HStack {
                            ForEach(0..<6) { quality in
                                Button("\(quality)") {
                                    reviewCard(quality: quality)
                                }
                                .buttonStyle(.borderedProminent)
                            }
                        }
                    } else {
                        Button("Show Answer") {
                            showAnswer = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            } else {
                Text("🎉 All cards reviewed!")
                    .font(.title)
            }
        }
        .onAppear {
            loadDueCards()
        }
    }

    private func loadDueCards() {
        dueCards = (try? FlashcardGenerationService.shared.getDueFlashcards(
            for: material.id
        )) ?? []
    }

    private func reviewCard(quality: Int) {
        guard let card = currentCard else { return }

        card.review(quality: quality)

        // Move to next card
        currentIndex += 1
        showAnswer = false
    }
}
```

---

For more information, see the [API Reference](README.md).
