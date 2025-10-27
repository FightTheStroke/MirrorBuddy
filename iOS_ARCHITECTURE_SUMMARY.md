# iOS Architecture Summary - Visual Overview

## App Flow Diagram

```
MirrorBuddyApp (Entry Point)
├── SwiftData Container Setup
├── CloudKit Sync Configuration
├── Localization Setup
└── MainTabView (Tab-Based Navigation)
    │
    ├── Tab 0: DashboardView (Materiali)
    │   ├── TodayCard
    │   ├── QuickActionsSection
    │   │   ├── StudyTimerCard
    │   │   ├── Import from Drive
    │   │   └── Document Scanner
    │   ├── MaterialsSection (by Subject)
    │   │   └── MaterialCardView
    │   └── ContextBannerView
    │
    ├── Tab 1: StudyView (Studia)
    │   ├── Flashcard Section
    │   │   └── FlashcardStudyView (with flip)
    │   └── Mind Map Section
    │       └── InteractiveMindMapView (Canvas)
    │
    ├── Tab 2: TasksView (Compiti)
    │   ├── Calendar Events (Google Calendar)
    │   ├── Teacher Emails (Gmail)
    │   └── Personal Tasks (SwiftData)
    │
    ├── Tab 3: VoiceView (Voce)
    │   └── Start Conversation Button
    │       └── VoiceConversationView (Fullscreen)
    │
    └── SmartVoiceButton (Floating, Persistent)
        ├── Voice Commands Handler
        └── Conversation Launcher

## Data Flow Architecture

```
UI Layer (SwiftUI Views)
    ↓
ViewModel Layer (MVVM Pattern)
    ↓
Service Layer (Singletons)
    ├── GmailService
    ├── GoogleCalendarService
    ├── GoogleDriveClient
    ├── OpenAI/Gemini Clients
    └── Processing Pipeline
    ↓
SwiftData Models (Local Storage)
    ├── Material
    ├── Flashcard
    ├── MindMap
    ├── Task
    ├── VoiceConversation
    └── StudySession
    ↓
CloudKit (Remote Sync)
```

## Voice Interaction Flow

```
User Action
    ↓
SmartVoiceButton or Voice Tab
    ↓
VoiceConversationViewModel
    ├── Load Context (Subject/Material)
    ├── Setup Recording
    └── Initialize Message History
    ↓
User Speaks → Audio Captured
    ↓
OpenAI Realtime API
    ├── Transcription
    └── Audio Streaming
    ↓
Context + Transcription → AI Coach
    ├── Gemini API OR
    └── OpenAI API
    ↓
AI Response Generated
    ↓
Text-to-Speech
    ├── AVSpeechSynthesizer OR
    └── Custom TTS
    ↓
Audio Played + Text Displayed
    ↓
Conversation Saved (VoiceConversation)
```

## Document Processing Pipeline

```
MaterialImportView
    ↓
File Selection
├── Google Drive Files (Browse & Select)
└── Local Files (File Picker)
    ↓
Download/Copy Files
    ├── GoogleDriveDownloadService OR
    └── FileManager
    ↓
Create Material Entity
    ↓
OCR (if image)
    ↓
MaterialProcessingPipeline.shared
    ├── Step 1: Mind Map Generation
    ├── Step 2: Flashcard Extraction
    └── Progress Callback
    ↓
Update Material Status
    ├── .processing → .completed OR
    └── .processing → .failed
    ↓
Send Notification
    └── NotificationManager
```

## State Management Pattern

```
Environment Objects (App-wide)
├── AppVoiceCommandHandler
│   ├── showMaterials
│   ├── showStudy (+ studyMode)
│   ├── showTasks
│   ├── selectedMaterialID
│   ├── showSettings
│   ├── showProfile
│   ├── showHelp
│   └── showMaterialImport
│
├── LocalizationManager
│   └── currentLanguage
│
├── CloudKitSyncMonitor
│   └── syncStatus
│
├── OfflineManager
│   └── isOnline

@Query (Local SwiftData)
├── @Query var materials: [Material]
├── @Query var tasks: [Task]
├── @Query var subjects: [SubjectEntity]
└── @Query var conversations: [VoiceConversation]

StateObject (Service Lifecycle)
├── StudyTimerService
├── VoiceConversationViewModel
└── GoogleDriveAuthViewModel
```

## Sheet Navigation Structure

```
MainTabView
└── activeSheet: MainTabSheet
    ├── .materialImport → MaterialImportView
    ├── .settings → SettingsView
    ├── .profile → ProfileView
    └── .help → VoiceCommandHelpView

DashboardView
├── showingImport → MaterialImportView
├── selectedMaterial → MaterialDetailView
├── showingStreakHistory → StreakHistoryView
├── showingGoalSettings → GoalSettingsView
└── showingScanner → DocumentScannerView

StudyView
└── selectedMaterial
    ├── FlashcardStudyView OR
    └── InteractiveMindMapView

TasksView
└── showingSyncSheet → EmailCalendarSyncView
```

## Material Priority Scoring Algorithm

```
Deadline Proximity (100 pts max)
├── Overdue: 100 pts
├── Due Today: 90 pts
├── Due Tomorrow: 70 pts
├── Due in 3 days: 50 pts
├── Due this week: 30 pts
└── Future: 10 pts

Study Assets Ready (40 pts max)
├── Has Mind Map: 20 pts
└── Has Flashcards: 20 pts

Recent Activity (20 pts max)
├── Studied today: 20 pts
└── Studied yesterday: 10 pts

New Material (15 pts)
└── Never accessed + processing complete: 15 pts

Processing Status (5 pts)
└── Processing complete: 5 pts

TOTAL: Sort by score descending, return top 3
```

## Subject-Specific Features

```
Dashboard (Generic)
├── All materials display
└── Generic tools

Subject Modes (Specialized)
├── Mathematics
│   ├── Calculator
│   ├── Graph Renderer
│   ├── Formula Library
│   ├── Problem Solver
│   └── Practice Generator
│
├── Science
│   ├── Experiment Simulator
│   ├── Diagram Annotator
│   ├── Physics Demo
│   ├── Formula Explainer
│   ├── Lab Report Template
│   └── Unit Converter
│
├── History
│   ├── Timeline Viewer
│   ├── Character Profiles
│   ├── Date Memorization
│   ├── Era Summaries
│   └── Historical Maps
│
├── Italian
│   ├── Vocabulary Builder
│   ├── Grammar Helper
│   ├── Conjugation Tables
│   ├── Reading Assistant
│   ├── Literature Summarizer
│   └── Audio Reader
│
└── Language (Generic)
    ├── Grammar Checker
    ├── Pronunciation Coach
    └── Translation Helper
```

## Accessibility & Localization

```
Localization
├── Italian (Primary)
├── English (Fallback)
└── Environment Key: localizationManager

Accessibility
├── VoiceOver Labels (all interactive elements)
├── Touch Targets (48pt+ minimum)
├── Dyslexia Support
│   ├── OpenDyslexic Font
│   ├── Reading Aids
│   └── Toggle in Settings
├── Haptic Feedback
├── Audio Cues
└── One-Handed Layout Optimization
```

## Background Services

```
On App Launch
├── PerformanceMonitor.startAppLaunch()
├── BackgroundSyncManager.registerBackgroundTasks()
├── BackgroundTaskScheduler.registerBackgroundTasks()
├── BackgroundSyncService.register()
├── OfflineManager.startMonitoring()
├── NotificationManager.requestAuthorization()
├── DriveSyncService.configure()
├── GmailService.configure()
├── GoogleCalendarService.configure()
└── UpdateManager.configure()

Periodic/Background Tasks
├── Material Sync (Task 72)
├── Gmail Sync (on demand + background)
├── Google Calendar Sync (on demand + background)
└── CloudKit Sync (automatic)
```

## Performance Optimizations

```
Rendering
├── Canvas (Mind Maps) - lightweight
├── Lazy Loading (Materials)
└── List Virtualization (Task/Email lists)

Memory Management
├── @StateObject for service lifecycle
├── Automatic cleanup on view disappear
└── Memory baseline tracking

Network
├── Offline caching
├── Background sync queuing
├── Batch processing
└── Compression (Google Drive)

Battery
├── Background task scheduling
├── Adaptive sync intervals
├── FPS monitoring disabled (expensive)
└── Battery status logging
```

## Security & Authentication

```
OAuth Flow (Google)
├── GoogleWorkspaceClient handles tokens
├── Keychain storage (native iOS)
├── Token refresh on expiry
└── Scope limiting per service

API Keys
├── Onboarding configuration
├── Environment-based loading
├── Secure storage
└── Service-specific scoping

Data Protection
├── Guardian consent tracking
├── LMS consent management
├── Data usage permissions
├── Email/calendar access scoped
└── Material ownership validation
```

## Feature Maturity Matrix

```
Complete & Tested
├── Material Import (Google Drive + Local)
├── Flashcard Display (Basic)
├── Mind Map Visualization
├── Study Statistics
├── Study Timer
├── Voice Conversation
├── Voice Commands
├── Settings Management
├── Offline Mode
└── CloudKit Sync

Partially Complete
├── Tasks (UI present, creation TODO)
├── Spaced Repetition (marked TODO)
├── Lesson Recording (capture only)
└── Curiosity Recommendations

In Progress / Future
├── Collaborative Features
├── Social Sharing
├── Gamification Elements
└── Advanced Analytics
```

## Critical UI Components Mapping

```
Main Tab Bar (Tab Height: ~100pt for accessibility)
├── Materiali (Icon: books.vertical)
├── Studia (Icon: brain.head.profile)
├── Compiti (Icon: checklist)
└── Voce (Icon: waveform)

SmartVoiceButton
├── Position: Bottom-right
├── Safe area aware
├── Keyboard-aware
├── 56pt diameter (standard)
├── Haptic feedback enabled
└── Shadow with 8pt radius

Dashboard Quick Actions
├── Card width: 120pt
├── Card height: 100pt
└── Horizontal scroll

Material Cards
├── Width: 160pt
├── Height: 200pt
├── Subject color coding
└── Thumbnail display

Today Card
├── Full width (minus padding)
├── Priority algorithm calculated
└── Tap for streak history

Context Banner
├── Height: Variable (2 lines)
├── Subject color indicator
└── Material reference
```

---

## Key Takeaways for UI Rebuild

1. **Navigation** is tab-based with sheet overlays - keep this structure
2. **Voice** is first-class - SmartVoiceButton is critical
3. **Data** flows through SwiftData/CloudKit - don't change this
4. **Services** are singleton pattern - maintain for consistency
5. **Accessibility** is built-in - preserve in new UI
6. **Offline** mode is supported - must remain functional
7. **Subject specialization** is important - maintain structure
8. **Study tracking** is granular - preserve data collection

