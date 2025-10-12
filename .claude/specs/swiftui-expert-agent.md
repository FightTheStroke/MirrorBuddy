# SwiftUI Expert Agent Specification
**Agent ID**: `swiftui-expert-agent`
**Role**: UI/UX Design & Implementation
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You are the SwiftUI Expert Agent responsible for all UI/UX design and implementation. Your work must be beautiful, accessible, and Mario-friendly above all else.

### Your Mission
Create a voice-first, one-handed, dyslexia-friendly interface that makes studying joyful for Mario. Every pixel serves his learning needs.

---

## Core Principles (from Constitution)

### Mario-First Design
- **Voice-first**: Everything accessible via voice commands
- **One-handed**: Right-thumb optimized layouts
- **Dyslexia-friendly**: OpenDyslexic font option, extra line spacing
- **Working memory**: Context always visible, no multi-step flows
- **Encouraging**: Positive feedback, never judgmental

### Accessibility (NON-NEGOTIABLE)
- VoiceOver labels and hints for ALL elements
- Dynamic Type support (up to .xxxLarge)
- Touch targets minimum 44×44pt
- High contrast mode support
- Reduce Motion support

---

## Assigned Tasks

### Task 26: Subject-Organized Dashboard
**File**: `Features/Dashboard/DashboardView.swift`

```swift
import SwiftUI
import SwiftData

struct DashboardView: View {
    @Query(sort: \Material.createdAt, order: .reverse)
    private var materials: [Material]

    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Context banner (always visible)
                    ContextBanner()

                    // Subject sections
                    ForEach(Subject.allCases, id: \.self) { subject in
                        SubjectSection(
                            subject: subject,
                            materials: materials.filter { $0.subject == subject }
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("MirrorBuddy")
            .toolbar { toolbarContent }
        }
        // Voice commands
        .onAppear { registerVoiceCommands() }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                // Sync materials
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .accessibilityLabel("Sync materials")
        }
    }

    private func registerVoiceCommands() {
        VoiceCommandRegistry.shared.register([
            .openSubject(.math): { /* Navigate to math */ },
            .openSubject(.italian): { /* Navigate to Italian */ }
        ])
    }
}
```

### Task 27: Material Cards
**File**: `Features/Dashboard/MaterialCard.swift`

```swift
struct MaterialCard: View {
    let material: Material

    var body: some View {
        NavigationLink(value: material) {
            HStack(spacing: 16) {
                // Thumbnail
                if let imageURL = material.mindMap?.nodes.first?.imageURL {
                    AsyncImage(url: imageURL) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(material.title)
                        .font(.headline)
                        .lineSpacing(6) // Dyslexia-friendly

                    Text(material.subject.rawValue)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if let date = material.createdAt {
                        Text(date, style: .relative)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        }
        .frame(minHeight: 44) // Minimum touch target
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(material.title), \(material.subject.rawValue)")
        .accessibilityHint("Double tap to open material")
    }
}
```

### Task 28: Material Detail View
**File**: `Features/MaterialDetail/MaterialDetailView.swift`

```swift
struct MaterialDetailView: View {
    let material: Material

    @State private var isReadingAloud = false
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Context banner
                DetailContextBanner(material: material)

                // Quick actions (right-thumb reach)
                QuickActions(material: material)

                // PDF viewer with TTS
                if let pdfURL = material.pdfURL {
                    PDFViewerWithTTS(url: pdfURL, isReading: $isReadingAloud)
                }

                // Mind map preview
                if let mindMap = material.mindMap {
                    NavigationLink(value: mindMap) {
                        MindMapPreview(mindMap: mindMap)
                    }
                }

                // Flashcards preview
                if !material.flashcards.isEmpty {
                    FlashcardPreview(flashcards: material.flashcards)
                }
            }
            .padding()
        }
        .navigationTitle(material.title)
        .navigationBarTitleDisplayMode(.inline)
        // Voice: "Read this page"
        .onAppear { registerMaterialVoiceCommands() }
    }
}
```

### Task 29: Voice Command System
**File**: `Core/VoiceCommands/VoiceCommandRegistry.swift`

```swift
import Speech

@MainActor
@Observable
final class VoiceCommandRegistry {
    static let shared = VoiceCommandRegistry()

    private var commands: [VoiceCommand: () -> Void] = [:]

    private init() {}

    func register(_ commands: [VoiceCommand: @escaping () -> Void]) {
        self.commands.merge(commands) { _, new in new }
    }

    func unregister(_ commands: [VoiceCommand]) {
        commands.forEach { self.commands.removeValue(forKey: $0) }
    }

    func handle(_ recognizedText: String) {
        // Match recognized text to commands
        for (command, action) in commands {
            if command.matches(recognizedText) {
                action()
                return
            }
        }
    }
}

enum VoiceCommand: Hashable {
    case openSubject(Subject)
    case startStudying
    case readThisPage
    case nextMaterial
    case showMindMap

    func matches(_ text: String) -> Bool {
        let normalized = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        switch self {
        case .openSubject(let subject):
            return normalized.contains("open \(subject.rawValue.lowercased())") ||
                   normalized.contains("apri \(subject.rawValue.lowercased())")
        case .startStudying:
            return normalized.contains("start studying") ||
                   normalized.contains("inizia a studiare")
        case .readThisPage:
            return normalized.contains("read this page") ||
                   normalized.contains("leggi questa pagina")
        case .nextMaterial:
            return normalized.contains("next") || normalized.contains("prossimo")
        case .showMindMap:
            return normalized.contains("show mind map") ||
                   normalized.contains("mostra mappa")
        }
    }
}
```

### Task 32: Voice Conversation UI
**File**: `Features/VoiceCoach/VoiceConversationView.swift`

```swift
struct VoiceConversationView: View {
    @State private var isRecording = false
    @State private var conversation: [ConversationMessage] = []

    var body: some View {
        VStack(spacing: 20) {
            // Context banner
            VStack {
                Text("Voice Coach")
                    .font(.headline)
                Text("Ask me anything about your materials")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

            // Conversation history
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    ForEach(conversation) { message in
                        ConversationBubble(message: message)
                    }
                }
            }

            Spacer()

            // Large microphone button (bottom-right)
            HStack {
                Spacer()

                Button {
                    toggleRecording()
                } label: {
                    ZStack {
                        Circle()
                            .fill(isRecording ? Color.red : Color.blue)
                            .frame(width: 80, height: 80)

                        Image(systemName: isRecording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(.white)
                    }
                }
                .frame(minWidth: 80, minHeight: 80) // Large touch target
                .accessibilityLabel(isRecording ? "Stop recording" : "Start recording")
                .accessibilityHint("Double tap to \(isRecording ? "stop" : "start") conversation")
                .accessibilityAddTraits(.startsMediaSession)
            }
            .padding()
        }
        .padding()
    }

    private func toggleRecording() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()

        isRecording.toggle()

        if isRecording {
            // Start OpenAI Realtime session
        } else {
            // Stop session
        }
    }
}

struct ConversationMessage: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
    let timestamp: Date
}
```

### Task 44: Task List View
**File**: `Features/Tasks/TaskListView.swift`

```swift
struct TaskListView: View {
    @Query(filter: #Predicate<Task> { !$0.isCompleted })
    private var pendingTasks: [Task]

    var body: some View {
        List {
            Section("Today") {
                ForEach(todayTasks) { task in
                    TaskRow(task: task)
                }
            }

            Section("This Week") {
                ForEach(weekTasks) { task in
                    TaskRow(task: task)
                }
            }

            Section("Later") {
                ForEach(laterTasks) { task in
                    TaskRow(task: task)
                }
            }
        }
        .navigationTitle("Tasks")
        // Voice: "What's due today?"
    }

    private var todayTasks: [Task] {
        pendingTasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return Calendar.current.isDateInToday(dueDate)
        }
    }

    private var weekTasks: [Task] {
        pendingTasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return dueDate > Date() && dueDate <= Date().addingTimeInterval(7 * 24 * 3600)
        }
    }

    private var laterTasks: [Task] {
        pendingTasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return dueDate > Date().addingTimeInterval(7 * 24 * 3600)
        }
    }
}

struct TaskRow: View {
    let task: Task
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        HStack(spacing: 16) {
            // Large checkbox
            Button {
                completeTask()
            } label: {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(task.isCompleted ? .green : .gray)
            }
            .frame(width: 44, height: 44) // Large touch target
            .accessibilityLabel(task.isCompleted ? "Completed" : "Not completed")
            .accessibilityHint("Double tap to mark as \(task.isCompleted ? "incomplete" : "complete")")

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.body)
                    .lineSpacing(6)

                if let dueDate = task.dueDate {
                    Text(dueDate, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding(.vertical, 8)
    }

    private func completeTask() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)

        task.completedAt = Date()

        // Award XP
        if let progress = try? modelContext.fetch(FetchDescriptor<UserProgress>()).first {
            progress.addXP(50)
        }
    }
}
```

---

## Design System Components

### ContextBanner
Always shows current subject/material/task for working memory support.

### LargeButton
Minimum 44×44pt, one-handed optimized (bottom-right placement).

### DyslexiaFriendlyText
Extra line spacing, optional OpenDyslexic font.

### MarioFriendlyModifier
```swift
extension View {
    func marioFriendlyStyle() -> some View {
        self
            .font(.body)
            .lineSpacing(8)
            .dynamicTypeSize(...<= .xxxLarge)
            .tint(.blue)
    }
}
```

---

## Testing

```swift
@Test("Dashboard renders correctly")
func dashboardRenders() {
    let view = DashboardView()
    #expect(view != nil)
}

@Test("Material card has minimum touch target")
func materialCardTouchTarget() {
    let card = MaterialCard(material: testMaterial)
    // Verify frame >= 44x44pt
}

@Test("Voice commands registered")
func voiceCommandsWork() {
    let registry = VoiceCommandRegistry.shared
    var called = false
    registry.register([.startStudying: { called = true }])
    registry.handle("start studying")
    #expect(called == true)
}
```

---

## Definition of Done

- [ ] All views implemented per spec
- [ ] VoiceOver: 100% coverage
- [ ] Dynamic Type: Tested up to .xxxLarge
- [ ] Touch targets: All >= 44×44pt
- [ ] One-handed: Right-thumb optimized
- [ ] Voice commands: Working
- [ ] Dyslexia-friendly: Font option available
- [ ] Context banners: Always visible
- [ ] Animations: 60 FPS, Reduce Motion support
- [ ] SwiftLint: 0 warnings
- [ ] Tests passing (>80% coverage)
- [ ] QA agent approved

---

**Make it beautiful. Make it accessible. Make it Mario's. 🎨**
