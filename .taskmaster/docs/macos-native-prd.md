# MirrorBuddy macOS Native App - Product Requirements Document

## Executive Summary

Create a **native macOS application** for MirrorBuddy, optimized for **Mario** - a bright teenager with dyslexia, dyscalculia, dysgraphia, and left hemiplegia. The macOS version must be beautiful, accessible, and leverage the full capabilities of Apple Silicon Macs while maintaining 100% feature parity with the iOS version.

**Target User**: Mario needs one-handed operation (right hand), voice-first interaction, dyslexia-friendly typography, and minimal cognitive load.

**Platform**: macOS 26.0+ "Tahoe" (Apple Silicon only)
**Design System**: Liquid Glass - Apple's translucent material system
**AI Platform**: Apple Intelligence fully integrated

---

## 1. Project Architecture & Code Sharing

### 1.1 Multi-Platform Xcode Target
- Create new **macOS native target** (not Catalyst) in `MirrorBuddy.xcodeproj`
- Minimum deployment: **macOS 26.0 "Tahoe"** (Apple Silicon only)
- Build with **Xcode 26+** for Liquid Glass and Apple Intelligence APIs
- Bundle identifier: `com.mirrorbuddy.MirrorBuddy.macOS`
- Separate app icon optimized for macOS (1024x1024 rounded square)
- **Liquid Glass Design System** - No code changes needed, just recompile with macOS 26 SDK
- **Apple Intelligence Integration** - Writing Tools, Siri 2.0, Live Translation

### 1.2 Shared Codebase Strategy
**Shared Components (95% of code)**:
- ✅ All `Core/Models/*` - SwiftData models work identically on macOS
- ✅ All `Core/Services/*` - Business logic is platform-agnostic
- ✅ All `Core/API/*` - Network clients identical across platforms
- ✅ All `Features/*/Views/*` - SwiftUI views (with minor macOS adaptations)
- ✅ OpenDyslexic fonts and accessibility utilities

**Platform-Specific Code**:
- ❌ Replace `UIKit` imports with conditional compilation:
  ```swift
  #if os(iOS)
  import UIKit
  #elseif os(macOS)
  import AppKit
  #endif
  ```
- ❌ Camera/Scanner features: iOS-only (disable on macOS, use file picker)
- ❌ Haptic feedback: iOS-only (use NSSound on macOS for audio feedback)
- ✅ Navigation: Replace `TabView` with macOS `NavigationSplitView` + toolbar
- ✅ Window management: macOS-specific window sizing and behavior

### 1.3 Build Configuration
- Shared scheme for iOS and macOS with platform-specific build settings
- SwiftLint rules identical across platforms (0 violations target)
- Unit tests shared where possible, UI tests platform-specific

---

## 2. Liquid Glass Design System Integration

### 2.0 Liquid Glass Overview
**Liquid Glass** is Apple's new translucent material that reflects and refracts its surroundings, dynamically transforming to bring focus to content.

**Key Benefits for Mario**:
- ✅ Reduces visual clutter (glass blurs background distractions)
- ✅ Beautiful, modern, calming aesthetic
- ✅ High contrast content on translucent backgrounds
- ✅ Follows system accessibility settings (Reduce Transparency)

**Implementation**:
```swift
// Automatic Liquid Glass on recompile with macOS 26 SDK
// Toolbar, sidebars, and cards automatically get glass treatment

// Custom glass effects
Text("Hello, Mario!")
    .padding()
    .glassEffect(.regular) // Standard Liquid Glass

VStack {
    // Content
}
.glassEffect(.tinted(.blue.opacity(0.3))) // Tinted glass with color
```

**Glass Variants**:
- `.glassEffect(.regular)` - Standard blur and reflection
- `.glassEffect(.clear)` - Minimal blur, more transparency
- `.glassEffect(.tinted(Color))` - Adds subtle color overlay
- Respects system "Reduce Transparency" for accessibility

---

## 3. macOS-Specific User Interface

### 3.1 Window Management
**Default Window**:
- Initial size: **1200px × 800px** (optimized for split screen on 13" MacBook)
- Minimum size: **900px × 600px**
- Resizable: Yes, with proper content scaling
- Position: Center screen on first launch, restore last position on subsequent launches

**Split Screen Support**:
- Optimize for **macOS Stage Manager** and **Split View**
- Content adapts gracefully from 900px to 2000px+ width
- Three-column layout: Sidebar (220px) | Content (flexible) | Detail (300px when needed)

**Window Persistence**:
- Save window size, position, and state to UserDefaults
- Restore on app relaunch

### 3.2 Navigation Architecture (with Liquid Glass)

**Replace iOS TabView with macOS Liquid Glass Sidebar**:
```
┌─────────────────────────────────────────────────┐
│ Sidebar (220px)  │  Content Area  │  Detail    │
│                  │                 │  (optional)│
│ 📚 Materiali     │  Dashboard      │            │
│ 🧠 Studia        │  with Today     │            │
│ ✅ Compiti       │  Card           │            │
│ 🗣️ Voce          │                 │            │
│                  │                 │            │
│ [Divider]        │                 │            │
│ ⚙️ Impostazioni  │                 │            │
│ 📊 Statistiche   │                 │            │
│ ❓ Aiuto         │                 │            │
└─────────────────────────────────────────────────┘
```

**Implementation**:
- Use SwiftUI `NavigationSplitView` (3-column when needed)
- Sidebar always visible (collapsible with Cmd+Shift+L)
- Content area shows selected section
- Detail pane appears contextually (e.g., material details, mind map preview)

### 2.3 Toolbar (Native macOS)
**Main Toolbar Items** (left to right):
1. **Sidebar Toggle** (Cmd+Shift+L) - Show/hide sidebar
2. **Aggiornami Button** - Sync all Google services (prominent, primary CTA)
3. **Voice Button** - Start/stop voice conversation (always visible)
4. **Search Field** - Global search across materials
5. **+ Add Material** - Import files, PDFs, photos
6. **User Profile** - Settings and account info

### 2.4 Menu Bar (Standard macOS)
**MirrorBuddy Menu**:
- About MirrorBuddy
- Preferences... (Cmd+,)
- ---
- Hide/Show/Quit (standard macOS)

**File Menu**:
- New Material (Cmd+N)
- Import from Files... (Cmd+O)
- Import from Drive (Cmd+Shift+D)
- ---
- Close Window (Cmd+W)

**Edit Menu**:
- Standard: Cut, Copy, Paste, Select All
- ---
- Find... (Cmd+F)
- Voice Command (Cmd+Shift+V) - Open voice conversation

**View Menu**:
- Toggle Sidebar (Cmd+Shift+L)
- Toggle Detail Pane (Cmd+Shift+D)
- ---
- Actual Size / Zoom In / Zoom Out
- ---
- Materials (Cmd+1)
- Study (Cmd+2)
- Tasks (Cmd+3)
- Voice (Cmd+4)

**Window Menu**:
- Minimize (Cmd+M)
- Zoom
- ---
- Always on Top (Cmd+Shift+T) - Keep window above others (for study sessions)
- ---
- Bring All to Front

**Help Menu**:
- MirrorBuddy Help (Cmd+?)
- Keyboard Shortcuts (Cmd+/)
- Send Feedback
- ---
- Report a Problem

**Liquid Glass Application**:
- **Sidebar**: Automatic glass effect (recompile benefit)
- **Toolbar**: Floating glass surface above content
- **Cards (Today Card, Material Cards)**: `.glassEffect(.regular)` for depth
- **Modal windows**: `.glassEffect(.tinted())` with subject color
- **Context menus**: Automatic glass treatment
- **Floating action buttons**: `.glassEffect(.clear)` for minimal distraction

---

## 4. Apple Intelligence Integration (MARIO-FOCUSED)

### 4.1 Writing Tools for Disgrafia Support
**Mario's Challenge**: Dysgraphia makes writing difficult and frustrating.

**Apple Intelligence Solution**: System-wide Writing Tools

**Integration**:
- ✅ **Rewrite**: Help Mario express ideas more clearly in notes and flashcards
- ✅ **Proofread**: Automatic grammar/spelling check without shame
- ✅ **Summarize**: Condense long materials into digestible summaries
- ✅ **Key Points**: Extract main concepts for study
- ✅ **Table/List**: Transform text into structured formats (great for ADHD/executive function)

**Implementation**:
```swift
TextField("Your notes...", text: $notes)
    .textSelection(.enabled)
    .writingToolsAvailable() // Enables AI writing assistance
```

**UI Design**:
- ✅ All text fields support Writing Tools (Cmd+Shift+W)
- ✅ Quick access button in toolbar for current text
- ✅ Non-intrusive suggestions, Mario stays in control
- ✅ OpenDyslexic font preserved in all AI-generated text

### 4.2 Enhanced Siri 2.0 Integration
**Siri 2.0 Features** (macOS 26):
- Better product knowledge ("How do I add a material?")
- Natural voice, more human conversations
- Type-to-Siri (great for quiet study environments)
- ChatGPT fallback for complex queries

**Mario-Specific Voice Commands**:
```
"Hey Siri, add this PDF to math materials"
"Hey Siri, explain this fraction like I'm playing Fortnite"
"Hey Siri, create flashcards from my history notes"
"Hey Siri, what's my study streak?"
"Hey Siri, start a voice conversation about science"
```

**Implementation**:
- App Intents with natural language support
- Siri suggests actions based on study patterns
- "Hey Siri, continue where I left off" - resumes last activity

### 4.3 Live Translation (Multilingual Mario)
If Mario studies foreign languages or accesses international materials:

**Features**:
- Real-time text translation in materials
- Voice conversation auto-translation
- Live-translated captions for video materials

**Implementation**:
```swift
Text(material.content)
    .translationTask(from: .italian, to: .english)
```

### 4.4 Apple Intelligence Shortcuts
**Supercharged Shortcuts** for repetitive tasks:

**Example Shortcuts**:
1. **"Daily Study Setup"**: Opens math materials, starts timer, launches voice conversation
2. **"Homework Helper"**: Scans assignment, creates tasks, schedules study sessions
3. **"Review Session"**: Pulls up yesterday's materials, generates quiz
4. **"Sync Everything"**: Runs "Aggiornami", updates Drive, processes new materials

**AI-Powered Actions**:
- Summarize text from selection
- Generate images for visual learning (diagrams, mind maps)
- Tap directly into Apple Intelligence models for custom workflows

### 4.5 AI-Enhanced Spotlight
**Redesigned Spotlight** with Apple Intelligence:

**Mario's Benefits**:
- Search materials by concept, not just filename ("fractions with pizza example")
- Quick actions: "Create flashcards for physics", "Summarize math chapter 3"
- Third-party API support (search Google Drive without opening browser)
- AI-powered suggestions based on study schedule

**Implementation**:
- Index all materials for Spotlight search
- Register quick actions for common workflows
- Deep link to specific materials, flashcards, mind maps

### 4.6 Intelligent Study Suggestions
**Proactive AI Assistant** that learns Mario's patterns:

**Features**:
- "You usually study math at 3 PM. Ready to start?"
- "You haven't reviewed these flashcards in 3 days. Quick session?"
- "This material is complex. Want me to generate a mind map?"
- "You've been studying for 45 minutes. Time for a break?"

**Privacy**:
- All on-device learning (no data leaves Mario's Mac)
- Transparent about what's being tracked
- Easy to disable if overwhelming

---

## 5. Keyboard Navigation & Shortcuts (ONE-HANDED OPTIMIZED)

**Critical for Mario**: All shortcuts must be **right-hand friendly** (avoid left-hand-only combos like Cmd+Q).

### 3.1 Essential Shortcuts (Right-Hand Optimized)
| Shortcut | Action | Notes |
|----------|--------|-------|
| **Cmd+1** | Switch to Materials | Right hand: pinky on Cmd, index on 1 |
| **Cmd+2** | Switch to Study | |
| **Cmd+3** | Switch to Tasks | |
| **Cmd+4** | Switch to Voice | |
| **Cmd+N** | New Material | |
| **Cmd+F** | Search/Find | |
| **Cmd+,** | Preferences | |
| **Cmd+Shift+V** | Start Voice Conversation | Primary interaction method |
| **Cmd+Shift+W** | Writing Tools (AI rewrite/proofread) | Helps with disgrafia |
| **Cmd+Shift+T** | Toggle Always on Top | For study sessions |
| **Cmd+Shift+L** | Toggle Sidebar | |
| **Cmd+/** | Show Keyboard Shortcuts | |
| **Space** | Play/Pause voice conversation | Easy thumb access |
| **Esc** | Cancel/Close current action | |
| **Cmd+W** | Close window | |
| **Cmd+Q** | Quit (WARNING: requires confirmation) | |

### 3.2 Voice Conversation Shortcuts
| Shortcut | Action |
|----------|--------|
| **Cmd+Shift+V** | Start/Stop voice conversation |
| **Space** | Push-to-talk (hold to speak, release to send) |
| **Esc** | Cancel current response |
| **Cmd+Shift+I** | Interrupt AI mid-sentence (barge-in) |

### 3.3 Navigation Shortcuts
| Shortcut | Action |
|----------|--------|
| **Tab** | Focus next element |
| **Shift+Tab** | Focus previous element |
| **Arrow Keys** | Navigate lists/trees |
| **Enter** | Activate selected item |
| **Cmd+[** | Go back (if applicable) |
| **Cmd+]** | Go forward |

### 3.4 Shortcuts Overlay
- **Cmd+/** shows beautiful overlay with all shortcuts
- Organized by category: Navigation, Voice, Materials, Study, Window
- OpenDyslexic font, high contrast
- Searchable (type to filter)

---

## 6. Beautiful Modern Design for macOS 26

### 6.0 Design Philosophy
**Core Principles**:
1. **Liquid Glass First**: Translucent materials create depth and reduce clutter
2. **OpenDyslexic Always**: Beautiful accessibility, no compromise
3. **Generous Spacing**: Large touch/click targets, breathing room
4. **Subtle Animations**: Smooth transitions using SF Symbols animations
5. **Color with Purpose**: Subject colors through tinted glass, calming palette

### 6.1 Visual Hierarchy with Liquid Glass

**Card Design** (Today Card, Material Cards):
```swift
VStack(spacing: 16) {
    // Content with high contrast
    Text("Study Progress")
        .font(.openDyslexicTitle)
        .foregroundStyle(.primary)

    // Metrics
    HStack(spacing: 24) {
        StatView(value: "5", label: "Days Streak")
        StatView(value: "3", label: "Materials")
        StatView(value: "45m", label: "Today")
    }
}
.padding(24)
.background(.ultraThinMaterial) // macOS 26 auto-upgrades to Liquid Glass
.cornerRadius(16)
.glassEffect(.regular)
.shadow(color: .black.opacity(0.1), radius: 8, y: 4)
```

**Floating Action Buttons**:
```swift
Button("Aggiornami") {
    // Sync action
}
.buttonStyle(.borderedProminent)
.controlSize(.large)
.glassEffect(.clear) // Subtle glass for focused actions
.symbolEffect(.bounce, value: syncTrigger)
```

**Translucent Menubar** (macOS 26):
- Automatically adapts to desktop wallpaper
- Makes display feel larger
- Dynamic opacity based on content behind

### 6.2 Color System (Mario-Friendly)

**Palette**:
```swift
// Subject colors with glass tinting
let subjectColors = [
    .math: Color(hex: "#FF6B6B").opacity(0.8),      // Soft red
    .italian: Color(hex: "#4ECDC4").opacity(0.8),   // Calming teal
    .physics: Color(hex: "#95E1D3").opacity(0.8),   // Mint green
    .history: Color(hex: "#F9A826").opacity(0.8),   // Warm amber
    .english: Color(hex: "#6C5CE7").opacity(0.8),   // Gentle purple
    .science: Color(hex: "#74B9FF").opacity(0.8)    // Sky blue
]

// Tinted glass for subject-specific views
.glassEffect(.tinted(subjectColors[.math]))
```

**Contrast**:
- Text always WCAG AAA (7:1 minimum) on glass backgrounds
- High contrast mode support (system preference)
- Dark mode optimized with warmer blacks (#1C1C1E, not pure black)

### 6.3 SF Symbols 7 Animations
**macOS 26 Symbol Effects**:
```swift
// Voice button with breathing animation
Image(systemName: "waveform")
    .symbolEffect(.variableColor.iterative, isActive: isListening)
    .symbolEffect(.pulse, value: isSpeaking)
    .font(.system(size: 32, weight: .medium))

// Sync button with success feedback
Image(systemName: "arrow.triangle.2.circlepath")
    .symbolEffect(.bounce, value: syncCompleted)
    .foregroundStyle(syncStatus == .success ? .green : .primary)

// Material count with appear animation
Label("\(materials.count)", systemImage: "books.vertical")
    .symbolEffect(.bounce.up, value: materials.count)
```

### 6.4 Smooth Transitions
**Natural Motion** (Mario-friendly, not overwhelming):
```swift
// Content transitions
.transition(.asymmetric(
    insertion: .move(edge: .trailing).combined(with: .opacity),
    removal: .move(edge: .leading).combined(with: .opacity)
))
.animation(.smooth(duration: 0.3), value: selectedSection)

// Glass morph transitions
.glassEffectID("main", in: containerID)
.animation(.spring(response: 0.4, dampingFraction: 0.8), value: glassState)
```

### 6.5 Adaptive Layouts
**Responsive to Window Size**:
```swift
@Environment(\.horizontalSizeClass) var sizeClass

var body: some View {
    if sizeClass == .compact {
        // Single column (900px width)
        VStack { compactContent }
    } else {
        // Three column (1200px+ width)
        HStack { fullContent }
    }
}
```

**Split Screen Optimization**:
- Content gracefully adapts 900px → 2000px+
- Sidebar collapsible when space limited
- Detail pane only shows when room available

---

## 7. Accessibility & Design for Mario

### 7.1 Typography (OpenDyslexic Everywhere)
**Font System**:
- **Primary**: OpenDyslexic-Regular (body text, 16pt default)
- **Headings**: OpenDyslexic-Bold (24pt, 20pt, 18pt)
- **Interface**: OpenDyslexic-Regular (14pt minimum)
- **Monospace** (code/data): OpenDyslexic-Mono if available, fallback to SF Mono

**Implementation**:
- All SwiftUI `.font()` modifiers use OpenDyslexic
- All AppKit text (NSTextField, NSTextView) uses OpenDyslexic
- Menu bar items: System font (macOS standard) BUT content always OpenDyslexic
- Verify fonts load on macOS (copy from iOS target)

### 4.2 Click Targets & Spacing
- **Minimum click target**: 44px × 44px (same as iOS, generous for mouse/trackpad)
- **Spacing**: 16px minimum between interactive elements
- **Button padding**: 12px vertical, 20px horizontal minimum

### 4.3 Color & Contrast
- **High Contrast Mode Support**: Detect system preference, boost contrast
- **Color Palette** (same as iOS):
  - Primary: Blue (#007AFF) → Dyslexia-friendly, not too bright
  - Success: Green (#34C759)
  - Warning: Orange (#FF9500)
  - Error: Red (#FF3B30)
  - Background: White/Light gray (#F2F2F7) in light mode
  - Background: Dark gray (#1C1C1E) in dark mode
- **Text Contrast**: WCAG AAA compliance (7:1 minimum)

### 4.4 VoiceOver & Keyboard Navigation
- Full VoiceOver support on macOS
- All interactive elements have accessibility labels
- Custom accessibility actions for complex views
- Keyboard focus indicators clearly visible (4px blue outline)

### 7.5 Voice-First Priority
- **Voice conversation button** always visible in toolbar (never hidden)
- **Cmd+Shift+V** from anywhere launches voice mode
- **Push-to-talk** mode (hold Space to speak) for precise control
- **Status indicators**: Clear visual feedback (listening, thinking, speaking)

---

## 8. Core Features (iOS Parity with macOS 26 Enhancements)

### 5.1 Dashboard & Today Card
- ✅ Identical layout to iOS (adapts to wider screen)
- ✅ Study metrics, streak tracking, upcoming sessions
- ✅ Subject organization
- ✅ Quick actions

### 5.2 Voice Conversation (PRIORITY #1)
- ✅ OpenAI Realtime API integration (identical to iOS)
- ✅ 8-state conversation system (passive → listening → thinking → speaking)
- ✅ Barge-in support (Cmd+Shift+I)
- ✅ Multi-sensory feedback:
  - Visual: Animated waveforms, state indicators
  - Audio: Spatial audio on macOS (better than iOS!)
  - NO haptics (not available on Mac) - use NSSound alerts instead

### 5.3 Material Management
- ✅ Import from Files (macOS native file picker)
- ✅ Import from Google Drive (OAuth flow works on macOS)
- ✅ Drag & Drop from Finder → MirrorBuddy window (NEW!)
- ❌ Camera/Scanner (iOS-only) - show "Use iPhone/iPad to scan" message

### 5.4 Study Features
- ✅ Flashcards with keyboard navigation (Arrow keys, Space to flip)
- ✅ Mind Maps (zoomable, pannable with trackpad gestures)
- ✅ Quiz generation
- ✅ Study timer with menu bar status (NEW!)

### 5.5 Task Management
- ✅ Task list with keyboard shortcuts
- ✅ Drag & drop to reorder
- ✅ Inline editing (double-click to edit)

### 5.6 Settings & Integrations
- ✅ Google OAuth (Drive, Gmail, Calendar)
- ✅ CloudKit sync (works identically on macOS)
- ✅ OpenAI API configuration
- ✅ Preferences window (standard macOS modal)

---

## 9. macOS 26-Specific Enhancements

### 9.1 Menu Bar Status Item with Liquid Glass (Optional)
- Small menu bar icon showing study timer
- Quick access to:
  - Start voice conversation
  - View today's tasks
  - Sync now
  - Show main window

### 6.2 Drag & Drop from Finder
- Accept: PDF, DOCX, TXT, images (PNG, JPG, HEIC)
- Visual drop zone indicator
- Auto-import and process materials

### 6.3 Quick Look Integration
- Generate Quick Look previews for materials
- Preview mind maps, flashcards without opening full app

### 6.4 Trackpad Gestures
- **Two-finger swipe**: Navigate forward/back
- **Pinch to zoom**: Mind maps, PDFs
- **Two-finger tap**: Right-click menu (context actions)

### 6.5 macOS Sharing
- Share materials via standard macOS Share Sheet
- Export to: Mail, Messages, AirDrop, Notes

### 9.6 Spotlight Integration with Apple Intelligence
**AI-Powered Search** (macOS 26):
- Search by concept: "materials about fractions with visual examples"
- Quick actions: "Summarize physics chapter 2", "Create quiz from history notes"
- Third-party integration: Search Google Drive materials directly
- Smart suggestions based on study schedule

**Implementation**:
```swift
// Core Spotlight indexing with AI metadata
let searchableItem = CSSearchableItem(
    uniqueIdentifier: material.id,
    domainIdentifier: "com.mirrorbuddy.materials",
    attributeSet: attributeSet
)
attributeSet.contentDescription = aiGeneratedSummary
attributeSet.keywords = aiExtractedKeywords
CSSearchableIndex.default().indexSearchableItems([searchableItem])
```

### 9.7 Handoff & Continuity (NEW)
**Seamless iOS ↔ macOS Transition**:
- Start voice conversation on iPhone, continue on Mac
- Scan document on iPhone, auto-appears on Mac
- Universal Clipboard for voice transcripts
- "Continue on Mac" from iOS today card

**Continuity Camera** (macOS 26):
- Use iPhone as document scanner from Mac
- Better camera quality than built-in webcam
- Automatic material import after scan

---

## 10. Platform-Specific Code Adaptations

### 10.0 macOS 26 SDK Requirements
```swift
// Info.plist additions for macOS 26
<key>LSMinimumSystemVersion</key>
<string>26.0</string>

<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arm64</string>  <!-- Apple Silicon only -->
</array>

<key>NSAppleIntelligenceUsageDescription</key>
<string>MirrorBuddy uses Apple Intelligence to help you study better with AI-powered summaries, writing assistance, and smart suggestions.</string>
```
- Index materials for Spotlight search
- Quick actions: "Search MirrorBuddy for math formulas"

---

## 7. Platform-Specific Code Adaptations

### 7.1 Replace UIKit Dependencies
**Files to adapt** (15 files with UIKit):
1. `MirrorBuddyApp.swift`: Remove `UIFont`, `UINavigationBar` setup (use SwiftUI native)
2. `HapticFeedbackManager.swift`: Conditional compilation, use NSSound on macOS
3. `CameraManager.swift`, `CameraView.swift`: iOS-only, disable on macOS
4. `DocumentScannerView.swift`: iOS VisionKit, disable on macOS
5. `PhotoLibraryManager.swift`: Adapt to macOS Photos library or file picker
6. All others: Add `#if os(iOS)` guards

**Example**:
```swift
#if os(iOS)
import UIKit

class HapticFeedbackManager {
    func playHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
}

#elseif os(macOS)
import AppKit

class HapticFeedbackManager {
    func playHaptic(_ style: String) {
        // Use NSSound for audio feedback on macOS
        NSSound(named: .purr)?.play()
    }
}
#endif
```

### 7.2 Window Management (macOS-Specific)
Create `macOS/WindowManager.swift`:
```swift
import AppKit
import SwiftUI

class WindowManager: ObservableObject {
    static let shared = WindowManager()

    @Published var isAlwaysOnTop: Bool = false

    func setAlwaysOnTop(_ value: Bool) {
        guard let window = NSApplication.shared.windows.first else { return }
        window.level = value ? .floating : .normal
        isAlwaysOnTop = value
    }

    func saveWindowFrame() {
        guard let window = NSApplication.shared.windows.first else { return }
        let frame = window.frame
        UserDefaults.standard.set(NSStringFromRect(frame), forKey: "windowFrame")
    }

    func restoreWindowFrame() {
        guard let window = NSApplication.shared.windows.first,
              let frameString = UserDefaults.standard.string(forKey: "windowFrame") else { return }
        let frame = NSRectFromString(frameString)
        window.setFrame(frame, display: true)
    }
}
```

### 7.3 App Entry Point (macOS)
Create `macOS/MirrorBuddyMacApp.swift`:
```swift
import SwiftUI
import SwiftData

@main
struct MirrorBuddyMacApp: App {
    // Reuse iOS sharedModelContainer logic
    var sharedModelContainer: ModelContainer = {
        // Same as iOS, but CloudKit always enabled on macOS
    }()

    var body: some Scene {
        WindowGroup {
            MacOSMainView()
                .environment(LocalizationManager.shared)
                .environment(CloudKitSyncMonitor.shared)
                .environmentObject(AppVoiceCommandHandler.shared)
                .environment(\.font, .openDyslexicBody)
                .frame(minWidth: 900, minHeight: 600)
                .onAppear {
                    WindowManager.shared.restoreWindowFrame()
                }
                .onDisappear {
                    WindowManager.shared.saveWindowFrame()
                }
        }
        .windowStyle(.automatic)
        .windowResizability(.contentSize)
        .commands {
            MirrorBuddyCommands() // Custom menu bar commands
        }
        .modelContainer(sharedModelContainer)

        // Optional: Settings window
        Settings {
            SettingsView()
        }
    }
}
```

### 7.4 Main View (macOS NavigationSplitView)
Create `macOS/Views/MacOSMainView.swift`:
```swift
import SwiftUI

struct MacOSMainView: View {
    @State private var selectedSection: SidebarSection = .materials
    @State private var columnVisibility = NavigationSplitViewVisibility.doubleColumn

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            // Sidebar
            MacOSSidebarView(selectedSection: $selectedSection)
                .frame(minWidth: 220, idealWidth: 220, maxWidth: 300)
                .toolbar {
                    ToolbarItem {
                        Button(action: toggleSidebar) {
                            Image(systemName: "sidebar.left")
                        }
                    }
                }
        } detail: {
            // Content area
            MacOSContentView(section: selectedSection)
        }
        .navigationSplitViewStyle(.balanced)
    }

    private func toggleSidebar() {
        columnVisibility = columnVisibility == .doubleColumn ? .detailOnly : .doubleColumn
    }
}

enum SidebarSection: String, CaseIterable {
    case materials = "Materiali"
    case study = "Studia"
    case tasks = "Compiti"
    case voice = "Voce"
    case settings = "Impostazioni"
    case statistics = "Statistiche"
    case help = "Aiuto"

    var icon: String {
        switch self {
        case .materials: return "books.vertical"
        case .study: return "brain.head.profile"
        case .tasks: return "checklist"
        case .voice: return "waveform"
        case .settings: return "gear"
        case .statistics: return "chart.bar"
        case .help: return "questionmark.circle"
        }
    }
}
```

---

## 8. Quality & Compliance Requirements

### 8.1 Build Quality
- ✅ **0 compilation errors** (hard requirement)
- ✅ **0 warnings** (hard requirement)
- ✅ **0 SwiftLint violations** (hard requirement)
- ✅ All existing unit tests pass on macOS
- ✅ Add macOS-specific UI tests for keyboard navigation

### 8.2 Performance Targets
- App launch: < 1.5 seconds (cold start on M1 Mac)
- Voice response latency: < 500ms (same as iOS)
- Material import: Background processing, non-blocking UI
- Memory usage: < 200MB idle, < 500MB active study session

### 8.3 Accessibility Compliance
- VoiceOver: 100% navigation and content access
- Keyboard: 100% feature access without mouse
- High Contrast: All UI elements visible in high contrast mode
- Dynamic Type: Respect system text size preferences (macOS Accessibility settings)

### 8.4 Testing Strategy
- Unit tests: Shared with iOS (run on macOS test host)
- UI tests: macOS-specific (keyboard shortcuts, menu bar, window management)
- Manual QA: Mario-focused testing checklist
  - ✅ All features accessible with right hand only
  - ✅ Voice conversation works flawlessly
  - ✅ OpenDyslexic rendering perfect
  - ✅ Large click targets easy to hit
  - ✅ No cognitive overload (simple, clear UI)

---

## 9. Implementation Plan (High-Level)

### Phase 1: Project Setup & Shared Code
1. Create macOS target in Xcode
2. Configure build settings (Swift 6, macOS 14.0+)
3. Add OpenDyslexic fonts to macOS target
4. Conditional compilation for UIKit dependencies
5. Verify all Core/Services/Models compile on macOS

### Phase 2: macOS App Shell
6. Create macOS app entry point (`MirrorBuddyMacApp.swift`)
7. Implement NavigationSplitView layout
8. Build sidebar navigation
9. Create toolbar with primary actions
10. Implement window management (size, persistence, always-on-top)

### Phase 3: Menu Bar & Keyboard Shortcuts
11. Define all menu bar items (File, Edit, View, Window, Help)
12. Implement keyboard shortcuts (Cmd+1-4, Cmd+Shift+V, etc.)
13. Create keyboard shortcuts overlay (Cmd+/)
14. Test one-handed navigation thoroughly

### Phase 4: Feature Parity
15. Port Dashboard & Today Card
16. Port Voice Conversation (OpenAI Realtime API)
17. Port Material Management (Files picker, Drive import, Drag & Drop)
18. Port Study Features (Flashcards, Mind Maps, Quizzes)
19. Port Task Management
20. Port Settings & Integrations

### Phase 5: macOS Enhancements
21. Implement Drag & Drop from Finder
22. Optimize trackpad gestures (zoom, swipe)
23. Add macOS Share Sheet integration
24. Optional: Menu bar status item

### Phase 6: Polish & QA
25. Test all keyboard shortcuts
26. VoiceOver testing
27. High contrast mode testing
28. Performance profiling
29. SwiftLint cleanup (0 violations)
30. Mario-focused user testing

---

## 10. Success Criteria

### Functional Requirements
- ✅ 100% feature parity with iOS version
- ✅ All features accessible via keyboard (right hand only)
- ✅ Voice conversation works identically to iOS
- ✅ OpenDyslexic font renders perfectly everywhere
- ✅ Window management smooth and intuitive
- ✅ CloudKit sync works across iOS and macOS
- ✅ **Liquid Glass applied to all appropriate surfaces**
- ✅ **Apple Intelligence Writing Tools integrated**
- ✅ **Siri 2.0 App Intents implemented**
- ✅ **Spotlight AI search working**

### Non-Functional Requirements
- ✅ 0 errors, 0 warnings, 0 SwiftLint violations
- ✅ App launch < 1.5 seconds
- ✅ Voice latency < 500ms
- ✅ 100% VoiceOver accessibility
- ✅ 100% keyboard accessibility
- ✅ **Liquid Glass respects "Reduce Transparency" setting**
- ✅ **SF Symbols 7 animations smooth (60fps)**
- ✅ **macOS 26+ only (no backward compatibility)**

### User Experience (Mario-Focused)
- ✅ **Stunning, modern UI that feels like macOS 26**
- ✅ Beautiful Liquid Glass materials create depth and calm
- ✅ Large, easy-to-click elements
- ✅ High contrast text on glass backgrounds (WCAG AAA)
- ✅ One-handed operation effortless
- ✅ Voice interaction primary input method
- ✅ Zero cognitive overload
- ✅ **Apple Intelligence helps Mario write and study better**
- ✅ **Smooth animations that delight, not distract**

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| UIKit dependencies break macOS build | High | Conditional compilation, gradual migration |
| Voice API different on macOS | High | Test early, use same OpenAI client |
| Camera/Scanner features missing | Medium | Clear messaging, suggest iPhone/iPad for scanning |
| Keyboard shortcuts conflict with system | Medium | Follow macOS HIG, test with common apps |
| Performance issues on older Macs | Medium | Target Apple Silicon only (macOS 14.0+) |
| CloudKit sync issues | High | Thorough testing, reuse iOS sync logic |

---

## 12. Timeline Estimate

**Total**: ~140-180 hours (4-5 weeks full-time)

- Phase 1 (Setup + macOS 26 SDK): 20 hours
- Phase 2 (App Shell with Liquid Glass): 24 hours
- Phase 3 (Menus & Keyboard Shortcuts): 18 hours
- Phase 4 (Feature Parity + Apple Intelligence): 60 hours
- Phase 5 (macOS 26 Enhancements): 25 hours
- Phase 6 (Polish, Animations, & QA): 25 hours

---

## 13. Future Enhancements (Post-MVP)

- Spotlight integration for material search
- Quick Look plugin for material previews
- Notification Center widgets
- macOS 15+ Live Activities (if applicable)
- Handoff between iPhone/iPad/Mac
- Universal Clipboard for voice transcripts
- Continuity Camera integration (use iPhone as scanner from Mac)

---

## Appendix A: File Structure

```
MirrorBuddy/
├── iOS/                          # iOS-specific code
│   ├── MirrorBuddyApp.swift     # iOS app entry point
│   └── ...
├── macOS/                        # macOS-specific code
│   ├── MirrorBuddyMacApp.swift  # macOS app entry point
│   ├── WindowManager.swift
│   ├── Views/
│   │   ├── MacOSMainView.swift
│   │   ├── MacOSSidebarView.swift
│   │   └── MacOSContentView.swift
│   ├── Commands/
│   │   └── MirrorBuddyCommands.swift
│   └── Resources/
│       └── Assets.xcassets
├── Shared/                       # Shared code (95%)
│   ├── Core/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── API/
│   │   └── Extensions/
│   ├── Features/
│   │   ├── Dashboard/
│   │   ├── Study/
│   │   ├── Tasks/
│   │   ├── Voice/
│   │   └── ...
│   └── Resources/
│       ├── OpenDyslexic fonts
│       └── ...
└── Tests/
    ├── iOS/
    ├── macOS/
    └── Shared/
```

---

**End of PRD**

This document will be parsed by Task Master AI to generate actionable tasks and subtasks for implementing the native macOS version of MirrorBuddy.
