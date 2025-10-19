# Unified Voice Model - Task 139.2

> Date: October 19, 2025
> Based on: VOICE_CONTROL_AUDIT.md findings
> Goal: Single, clear voice entry point with smart context detection

## Executive Summary

**Problem**: MirrorBuddy has 5 voice entry points creating confusion and redundancy.

**Solution**: Consolidate to **one smart PersistentVoiceButton** that handles both commands and conversations based on user intent.

**Benefits**:
- Clear single entry point for all voice interactions
- Reduced visual clutter (remove 4 redundant buttons)
- Smart context detection eliminates command/conversation confusion
- Consistent UX across all screens

---

## Unified Voice Model Design

### Single Entry Point: Smart PersistentVoiceButton

**Location**: Bottom-right floating button (global, accessible from all tabs)

**Appearance** (unchanged):
- 80x80pt circular button
- Blue-purple gradient (inactive) → Red gradient (active)
- mic.fill icon (inactive) → stop.fill icon (active)
- Pulsing ring animation when active
- Safe area positioning (Task 113 ✅)

**New Behavior**: Smart Intent Detection

```
User taps button → Mic activates → User speaks

┌─────────────────────────────────────┐
│ User says short command?            │
│ ("vai alla home", "apri materiali") │
└─────────────────────────────────────┘
           │
           ├─ YES → Execute command immediately
           │         Show VoiceCommandFeedbackView
           │         Auto-dismiss after completion
           │
           └─ NO  → Open VoiceConversationView
                    Continue conversation mode
                    ("Spiegami la rivoluzione francese")
```

**Intent Detection Algorithm**:

```swift
enum VoiceIntent {
    case command      // Short navigation/action command
    case conversation // Extended interaction with AI
}

func detectIntent(from spokenText: String) -> VoiceIntent {
    // 1. Check against registered voice commands
    if VoiceCommandRegistry.shared.matches(text: spokenText) {
        return .command
    }

    // 2. Detect command-like patterns
    let commandPrefixes = ["vai", "apri", "mostra", "chiudi", "torna"]
    if commandPrefixes.contains(where: { spokenText.lowercased().starts(with: $0) }) {
        return .command
    }

    // 3. Length heuristic (commands are typically < 10 words)
    let wordCount = spokenText.split(separator: " ").count
    if wordCount <= 10 {
        return .command
    }

    // 4. Question detection (likely conversation)
    if spokenText.contains("?") ||
       spokenText.lowercased().starts(with: "spiegami") ||
       spokenText.lowercased().starts(with: "come") ||
       spokenText.lowercased().starts(with: "perché") {
        return .conversation
    }

    // 5. Default to conversation for complex input
    return .conversation
}
```

**Fallback Mechanism**:
- If command not recognized, offer: "Non ho capito. Vuoi continuare la conversazione?"
- User can tap "Sì" to open VoiceConversationView
- User can tap "No" to retry or cancel

---

## What Gets Removed

### 1. VoiceCommandButton (Left Floating Button)
- **Why**: Redundant with smart PersistentVoiceButton
- **Migration**: Command functionality merged into PersistentVoiceButton
- **File to Modify**: `MirrorBuddy/Features/Dashboard/Views/MainTabView.swift`
  - Remove VoiceCommandButton from lines 130-134
  - Remove help icon (move to Settings)

### 2. VoiceView Tab (Voce Tab)
- **Why**: Redundant - just another way to open VoiceConversationView
- **Migration**:
  - Move conversation history to Settings → "Conversazioni Vocali"
  - Move voice usage tips to onboarding and Today card hints
- **File to Modify**: `MirrorBuddy/Features/Dashboard/Views/MainTabView.swift`
  - Remove VoiceView() tab (lines 81-92)
- **Alternative**: Repurpose tab as "Assistant" with settings + history + analytics

### 3. DashboardView Toolbar Voice Button
- **Why**: Redundant with global PersistentVoiceButton
- **File to Modify**: `MirrorBuddy/Features/Dashboard/Views/DashboardView.swift`
  - Remove toolbar voice button and sheet (line 150)

### 4. HomeworkHelpView Toolbar Voice Button
- **Why**: Redundant with global PersistentVoiceButton
- **File to Modify**: `MirrorBuddy/Features/HomeworkHelp/Views/HomeworkHelpView.swift`
  - Remove toolbar voice button (line 235) and sheet (line 59)

---

## What Gets Enhanced

### 1. Smart PersistentVoiceButton
**New Features**:
- Intent detection (command vs conversation)
- Context awareness (knows which screen user is on)
- First-time hint tooltip
- Haptic feedback for different actions

**File to Modify**: `MirrorBuddy/Features/VoiceCommands/PersistentVoiceButton.swift`

**Implementation**:
```swift
struct SmartVoiceButton: View {
    @State private var isListening = false
    @State private var showConversation = false
    @State private var showFirstTimeHint = false
    @StateObject private var voiceManager = UnifiedVoiceManager.shared

    var body: some View {
        Button {
            handleVoiceButtonTap()
        } label: {
            // Existing button appearance (unchanged)
        }
        .onAppear {
            checkFirstTimeHint()
        }
        .overlay(alignment: .topTrailing) {
            if showFirstTimeHint {
                VoiceButtonHintTooltip()
            }
        }
        .sheet(isPresented: $showConversation) {
            VoiceConversationView()
        }
    }

    private func handleVoiceButtonTap() {
        voiceManager.startListening { result in
            switch result {
            case .command(let commandResult):
                // VoiceCommandFeedbackView shows feedback
                // Auto-dismisses after execution
                break

            case .conversation:
                // Open VoiceConversationView
                showConversation = true

            case .error(let message):
                // Show error with retry option
                voiceManager.showError(message)
            }
        }
    }
}
```

### 2. UnifiedVoiceManager (New Service)
**Purpose**: Orchestrate voice interactions with smart intent detection

**File to Create**: `MirrorBuddy/Core/Services/UnifiedVoiceManager.swift`

**Responsibilities**:
- Microphone access coordination
- Intent detection (command vs conversation)
- Context awareness (current screen, active material, etc.)
- Feedback coordination (VoiceCommandFeedbackView)
- Error handling and fallbacks

**Implementation**:
```swift
@MainActor
final class UnifiedVoiceManager: ObservableObject {
    static let shared = UnifiedVoiceManager()

    @Published var isListening = false
    @Published var recognizedText = ""

    private let commandService = VoiceCommandRecognitionService.shared
    private let conversationService = VoiceConversationService.shared

    enum VoiceResult {
        case command(VoiceCommandResult)
        case conversation
        case error(String)
    }

    func startListening(completion: @escaping (VoiceResult) -> Void) {
        isListening = true

        // Start listening with timeout
        commandService.startListening { [weak self] text in
            guard let self = self else { return }

            self.recognizedText = text
            let intent = self.detectIntent(from: text)

            switch intent {
            case .command:
                self.executeCommand(text) { result in
                    self.isListening = false
                    completion(.command(result))
                }

            case .conversation:
                self.isListening = false
                completion(.conversation)
            }
        } onError: { error in
            self.isListening = false
            completion(.error(error.localizedDescription))
        }
    }

    private func detectIntent(from text: String) -> VoiceIntent {
        // Intent detection algorithm (see above)
    }

    private func executeCommand(_ text: String, completion: @escaping (VoiceCommandResult) -> Void) {
        // Execute via VoiceCommandRegistry
    }
}
```

### 3. Context-Aware Voice Hints
**New Feature**: Smart hints based on current screen

**Examples**:
- **DashboardView TodayCard**: "Ask me about today's priorities" (subtle mic icon)
- **MaterialDetailView**: "Ask me to explain this material" (hint on first visit)
- **Empty states**: "Tap the mic button to add materials by voice"

**File to Modify**: `MirrorBuddy/Features/Dashboard/Components/TodayCard.swift`
```swift
// Add voice hint to TodayCard
HStack {
    Image(systemName: "mic.fill")
        .font(.caption)
        .foregroundStyle(.secondary)

    Text("Ask me about today's priorities")
        .font(.caption)
        .foregroundStyle(.secondary)
}
.opacity(0.6)
```

### 4. VoiceCommandFeedbackView
**Enhancement**: Works with UnifiedVoiceManager

**No changes needed** - already observes VoiceCommandRecognitionService

---

## Onboarding & Discovery (Task 139.4)

### First-Time Voice Hint

**Trigger**: User completes onboarding, sees dashboard for first time

**Appearance**: Tooltip pointing to PersistentVoiceButton
```
┌──────────────────────────────────┐
│ 👋 Tap here to talk to me!       │
│ I can help with homework,        │
│ navigate the app, and more.      │
└──────────────────────────────────┘
           ↓
        [Voice Button]
```

**Implementation**: `VoiceButtonHintTooltip.swift`
```swift
struct VoiceButtonHintTooltip: View {
    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack {
                Image(systemName: "hand.wave.fill")
                    .foregroundStyle(.yellow)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Tap here to talk to me!")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text("I can help with homework, navigate the app, and more.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .shadow(radius: 4)

            // Arrow pointing to button
            Image(systemName: "arrowtriangle.down.fill")
                .foregroundStyle(.blue)
                .offset(x: -40)
        }
        .offset(y: -100)
    }
}
```

**Dismissal**:
- User taps voice button once
- Or after 10 seconds of inactivity
- Never show again (UserDefaults flag)

### Voice Commands Help

**Access**: Settings → "Voice Commands" (moved from VoiceCommandButton's "?" icon)

**Content**: VoiceCommandHelpView (unchanged)

### Empty State Hints

Add voice prompts to empty states:
- **No materials**: "Say 'Aggiungi materiale' or tap + to get started"
- **No tasks**: "Say 'Crea compito' to add a task by voice"
- **No conversations**: "Tap the mic button to start chatting"

---

## Migration Strategy

### Phase 1: Implement UnifiedVoiceManager
1. Create `UnifiedVoiceManager.swift` service
2. Implement intent detection algorithm
3. Add unit tests for intent classification
4. Hook into existing VoiceCommandRecognitionService

### Phase 2: Enhance PersistentVoiceButton
1. Update PersistentVoiceButton to use UnifiedVoiceManager
2. Add first-time hint tooltip
3. Add context awareness
4. Test intent detection flow

### Phase 3: Remove Redundant Buttons
1. Remove VoiceCommandButton from MainTabView
2. Remove toolbar buttons from DashboardView and HomeworkHelpView
3. Remove or repurpose VoiceView tab
4. Update navigation patterns

### Phase 4: Add Onboarding Hints
1. Create VoiceButtonHintTooltip component
2. Add contextual hints to TodayCard, empty states
3. Move voice commands help to Settings
4. Add usage analytics

### Phase 5: Testing & Polish
1. Test with Mario (user testing)
2. Measure discoverability metrics
3. Adjust intent detection thresholds
4. Add accessibility improvements

---

## Technical Architecture

### Before (Current):
```
┌─────────────────────────────────────────┐
│ MainTabView                             │
├─────────────────────────────────────────┤
│ • VoiceCommandButton (commands only)    │
│ • PersistentVoiceButton (conversation)  │
│ • VoiceCommandFeedbackView (overlay)    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DashboardView                           │
├─────────────────────────────────────────┤
│ • Toolbar voice button → Conversation   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ VoiceView Tab                           │
├─────────────────────────────────────────┤
│ • "Inizia Conversazione" → Conversation │
└─────────────────────────────────────────┘
```

### After (Unified):
```
┌─────────────────────────────────────────┐
│ MainTabView                             │
├─────────────────────────────────────────┤
│ • SmartVoiceButton (commands + convo)   │
│ • VoiceCommandFeedbackView (overlay)    │
│ • VoiceButtonHintTooltip (first-time)   │
└─────────────────────────────────────────┘
           ↓
    UnifiedVoiceManager
           ↓
    ┌─────┴─────┐
    ↓           ↓
Commands    Conversation
```

---

## User Flow Examples

### Scenario 1: User Says "Vai alla home"
1. User taps SmartVoiceButton
2. Mic activates, user speaks "vai alla home"
3. UnifiedVoiceManager detects intent = `.command`
4. Executes command via VoiceCommandRegistry
5. VoiceCommandFeedbackView shows "Comando eseguito" (green checkmark)
6. Navigates to dashboard tab
7. Auto-dismisses feedback after 2 seconds

### Scenario 2: User Says "Spiegami la rivoluzione francese"
1. User taps SmartVoiceButton
2. Mic activates, user speaks "spiegami la rivoluzione francese"
3. UnifiedVoiceManager detects intent = `.conversation`
4. Opens VoiceConversationView in sheet
5. Pre-fills conversation with "spiegami la rivoluzione francese"
6. AI responds with explanation
7. User continues conversation

### Scenario 3: User Says Unrecognized Command
1. User taps SmartVoiceButton
2. Mic activates, user speaks "fai una pizza"
3. UnifiedVoiceManager detects intent = `.command` (starts with "fai")
4. Command not found in registry
5. Shows error: "Non ho capito. Vuoi continuare la conversazione?"
6. User taps "Sì" → Opens VoiceConversationView
7. Or user taps "No" → Returns to screen

---

## Success Metrics

### Discoverability
- **Target**: 80% of new users discover voice button in first session
- **Measure**: Track first voice interaction timing

### Clarity
- **Target**: <10% users confused about voice functionality
- **Measure**: Survey + analytics (command vs conversation ratio)

### Engagement
- **Target**: 50% increase in voice feature usage
- **Measure**: Daily voice interactions per user

### Accuracy
- **Target**: 90% intent detection accuracy
- **Measure**: Log misclassifications, adjust thresholds

---

## Files to Create

1. `MirrorBuddy/Core/Services/UnifiedVoiceManager.swift` - Smart voice orchestration
2. `MirrorBuddy/Features/VoiceCommands/SmartVoiceButton.swift` - Enhanced persistent button
3. `MirrorBuddy/Features/VoiceCommands/VoiceButtonHintTooltip.swift` - First-time hint
4. `MirrorBuddyTests/UnifiedVoiceManagerTests.swift` - Intent detection tests

## Files to Modify

1. `MirrorBuddy/Features/Dashboard/Views/MainTabView.swift`
   - Remove VoiceCommandButton
   - Replace PersistentVoiceButton with SmartVoiceButton
   - Remove VoiceView tab (or repurpose)

2. `MirrorBuddy/Features/Dashboard/Views/DashboardView.swift`
   - Remove toolbar voice button

3. `MirrorBuddy/Features/HomeworkHelp/Views/HomeworkHelpView.swift`
   - Remove toolbar voice button

4. `MirrorBuddy/Features/Dashboard/Components/TodayCard.swift`
   - Add voice hint: "Ask me about today's priorities"

## Files to Remove/Archive

1. `MirrorBuddy/Features/Voice/Views/VoiceView.swift` (if tab removed)
   - Alternative: Repurpose as "Assistant Settings" with history + analytics

---

**Status**: Unified voice model defined - ready for Task 139.3 (Implementation)
**Next Step**: Implement UnifiedVoiceManager and SmartVoiceButton
**Priority**: High - critical UX improvement for voice feature adoption
