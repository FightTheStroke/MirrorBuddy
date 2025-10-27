# MirrorBuddy iOS - Complete Features Inventory

**Generated:** 2025-10-26
**Total Swift Files:** 255
**Architecture:** SwiftUI + SwiftData

---

## 1. MAIN NAVIGATION STRUCTURE

### Tab-Based Architecture (MainTabView.swift)
The app uses a 4-tab main navigation structure:

**Tab 0: Materiali (Materials/Dashboard)**
- Shows learning materials organized by subject
- Quick action cards for common tasks
- Study priorities based on deadlines
- Integration with Google Drive import
- Document scanner
- Study timer
- Today's card with personalized priorities
- Material cards in horizontal scrolling lists

**Tab 1: Studia (Study)**
- Flashcard study mode
- Mind map visualization
- Material-based organization
- Voice command integration for mode selection

**Tab 2: Compiti (Tasks)**
- Personal task list
- Calendar events from Google Calendar
- Teacher emails from Gmail
- Email/calendar sync functionality
- Task management interface

**Tab 3: Voce (Voice)**
- Voice assistant entry point
- Conversation launcher
- Information about voice capabilities

### Floating Voice Button
- SmartVoiceButton (persistent, context-aware)
- Located bottom-right of screen
- Handles both voice commands and conversations
- Safe positioning for landscape/portrait

---

## 2. FEATURE MODULES & VIEWS

### A. DASHBOARD FEATURES (iOS/Features/Dashboard/)

#### Main Views:
1. **DashboardView.swift** - Primary materials hub
   - Material list grouped by subject
   - Today's priorities calculation
   - Quick actions section
   - Material import button
   - Sync status indicator
   - Connection status banner
   - Offline mode support

2. **MainTabView.swift** - Tab coordinator
   - Tab management
   - Sheet presentation (consolidated)
   - Voice command routing
   - Floating voice button container

3. **StudyStatisticsView.swift** - Study metrics
   - Today's study time
   - Weekly study time
   - Current streak display
   - Recent sessions list
   - Session insights navigation

4. **StudyInsightsView.swift** - Detailed statistics
   - Historical study data
   - Study session breakdown
   - Learning progress over time

5. **StudyTimerView.swift** - Pomodoro-style timer
   - Start/pause/stop controls
   - Configurable duration
   - Background operation

#### Components:
- **TodayCard** - Personalized daily priorities
- **StreakHistoryView** - Study streak visualization
- **GoalSettingsView** - Study goal configuration
- **UpdateButtonView** - "Aggiornami" sync button

---

### B. MATERIALS MANAGEMENT (iOS/Features/Materials/)

#### Views:
1. **MaterialImportView.swift** - Material import interface
   - Google Drive file browser
   - Local file system import
   - Multiple file selection
   - Progress tracking during download/import
   - OCR for images
   - Automatic processing pipeline trigger

2. **MaterialDetailView.swift** - Material detail screen
   - Full material information
   - Subject assignment
   - Associated study assets (flashcards, mind maps)
   - Edit/delete functionality
   - PDF viewer integration

3. **DocumentScannerView.swift** - Document scanning
   - Camera-based document capture
   - Auto-enhancement/cropping
   - PDF generation
   - Automatic material creation

4. **MaterialCardView.swift** - Material card component
   - Thumbnail display
   - Subject color coding
   - Card styling for horizontal scrolls

---

### C. STUDY FEATURES

#### C1. FLASHCARDS (iOS/Features/Flashcards/)

**FlashcardStudyView.swift**
- Card flip animation
- Question/answer display
- Progress indicator
- Navigation between cards
- No spaced repetition (marked as TODO)

**FlashcardReviewView.swift**
- Review existing flashcards
- Mastery tracking

**ReviewScheduleView.swift**
- Scheduling next reviews
- SRS algorithm integration

**FlashcardCoach/**
- **GuidedFlashcardView.swift** - AI-guided practice
- **GuidedFlashcardService.swift** - Coaching logic
- **FlashcardCoachScript.swift** - Coaching prompts

---

#### C2. MIND MAPS (iOS/Features/MindMaps/)

**InteractiveMindMapView.swift** - Canvas-based rendering
- 2D node-and-branch visualization
- Canvas rendering for performance
- Pan and zoom gestures
- Double-tap for expansion
- Single-tap for selection
- Node detail overlay
- Breadcrumb navigation
- Text-to-speech for nodes

**MindMapExportView.swift**
- Export mind maps (formats unclear)
- Sharing functionality

**Supporting Files:**
- MindMapTheme.swift - Color/styling system
- MindMapModels.swift (v2) - Alternative implementation

**MindMap2/**
- InteractiveMindMapView2.swift - Newer version
- MindMapModels.swift - Enhanced data models

---

#### C3. STUDY VIEW (iOS/Features/Study/)

**StudyView.swift**
- List-based navigation
- Flashcard section with material listing
- Mind map section with material listing
- Study mode support (flashcards/mindMap/general)
- Voice command integration for auto-selection

---

### D. VOICE & CONVERSATION (iOS/Features/Voice/)

#### Main Views:
1. **VoiceView.swift** - Voice tab entry
   - Conversation launcher button
   - Info box about voice capabilities
   - Large primary action

2. **VoiceConversationView.swift** - Main conversation interface
   - Adaptive iPad/iPhone layouts
   - Message thread display
   - Voice input/output controls
   - Context banner (subject, material)
   - Session state tracking
   - Conversation history management
   - Settings access

3. **ConversationListView.swift**
   - Previous conversations browser
   - Conversation history management
   - Conversation selection/loading

4. **ExtendedVoiceRecordingView.swift**
   - Long-form voice recording
   - Visual recording feedback
   - Duration display

5. **BreathingAnimationView.swift**
   - Visual feedback during recording
   - Animated breathing indicator

6. **VoiceSettingsView.swift**
   - Voice parameter configuration
   - Input/output settings
   - Gesture customization

#### Voice Command Components:
- **SmartVoiceButton.swift** - Persistent floating button
  - Context-aware functionality
  - Keyboard awareness
  - Safe area positioning
  - Landscape support
  - Haptic feedback

- **PersistentVoiceButton.swift** - Background voice access
  - Always-available voice entry

- **VoiceCommandFeedbackView.swift** - Global feedback
  - Command recognition visual feedback
  - Execution status display
  - Toast-style notifications

- **VoiceIndicatorView.swift** - Recording indicator
  - Waveform visualization
  - Recording status

---

### E. TASKS MANAGEMENT (iOS/Features/Tasks/)

**TasksView.swift** - Task listing interface
- Calendar events section (from Google Calendar)
- Teacher emails section (from Gmail)
- Personal tasks section (SwiftData-based)
- Sync button for Gmail/Calendar
- Pull-to-refresh functionality
- Future enhancement: Add task UI

**TaskDetailView.swift**
- Task information display
- Completion status toggle
- Due date management

**TaskListView.swift**
- Alternative task view (potentially deprecated)

**EmailCalendarSyncView.swift**
- Gmail and Calendar authentication
- Sync configuration
- Service integration setup

---

### F. SETTINGS (iOS/Features/Settings/)

1. **SettingsView.swift** - Main settings hub
   - Google Drive section
   - Coach personality settings
   - Weekly digest settings
   - Subject management
   - LMS integration
   - Guardian consent
   - Alias management

2. **GoogleDriveAuthView.swift**
   - Drive authentication flow
   - OAuth token management
   - Account status display

3. **GoogleOAuthConfigView.swift**
   - OAuth credentials entry
   - API key configuration
   - Service setup

4. **CoachPersonaSettingsView.swift**
   - Coach tone selection
   - Teaching style preferences
   - Personality customization

5. **WeeklyDigestSettingsView.swift**
   - Digest frequency configuration
   - Recipients management
   - Progress summary preferences

6. **SubjectSettingsView.swift**
   - Subject management
   - Custom subject creation
   - Subject organization

7. **GuardianConsentSettingsView.swift**
   - Parental consent management
   - Data sharing permissions
   - Contact information

8. **LMSIntegrationView.swift**
   - Learning Management System setup
   - Canvas/Moodle/Blackboard integration

9. **AliasManagementView.swift**
   - Material name aliases
   - Fuzzy matching configuration

10. **DyslexiaSettingsView.swift**
    - OpenDyslexic font toggle
    - Dyslexia-friendly UI options
    - Reading aids configuration

---

### G. VOICE COMMANDS (iOS/Features/VoiceCommands/)

- **PersistentVoiceButton.swift** - Always-visible voice entry
- **SmartVoiceButton.swift** - Context-aware floating button
- **VoiceCommandFeedbackView.swift** - Recognition/execution feedback
- **VoiceIndicatorView.swift** - Recording visual feedback

---

### H. TEXT-TO-SPEECH (iOS/Features/TextToSpeech/)

1. **TTSIntegration.swift** - Core TTS service
2. **TTSControlsView.swift** - Playback controls
3. **TTSSettingsView.swift** - TTS configuration
   - Voice selection
   - Speech rate
   - Pitch adjustment

---

### I. SUBJECT-SPECIFIC MODES

#### Mathematics (iOS/Features/SubjectModes/Math/)
- **MathCalculatorView.swift** - Built-in calculator
- **MathGraphRenderer.swift** - Function graphing
- **FormulaLibrary.swift** - Formula reference
- **MathMindMapTemplate.swift** - Subject-specific mind map layout
- **MathProblemSolver.swift** - Step-by-step problem solving
- **MathPracticeGenerator.swift** - Problem generation
- **MathModeService.swift** - Subject service

#### Science (iOS/Features/SubjectModes/Science/)
- **ExperimentSimulator.swift** - Virtual lab simulations
- **DiagramAnnotationView.swift** - Labeled diagram viewer
- **PhysicsDemo.swift** - Physics demonstrations
- **FormulaExplainer.swift** - Science formula explanations
- **LabReportTemplate.swift** - Lab report generator
- **UnitConverter.swift** - Unit conversion tool
- **ScienceMindMapTemplate.swift** - Subject-specific layout

#### History (iOS/Features/SubjectModes/History/)
- **HistoricalMapView.swift** - Geographic timeline
- **HistoryTimelineView.swift** - Event timeline
- **CharacterProfileView.swift** - Historical figures
- **DateMemorizationTool.swift** - Date memorization
- **EraSummaryGenerator.swift** - Period summaries
- **HistoryEventMapper.swift** - Event visualization
- **HistoryMindMapTemplate.swift** - Subject-specific layout

#### Language (iOS/Features/SubjectModes/Language/)
- **GrammarChecker.swift** - Grammar correction
- **PronunciationCoach.swift** - Pronunciation guidance
- **TranslationHelper.swift** - Translation assistance

#### Italian (iOS/Features/SubjectModes/Italian/)
- **ItalianVocabularyBuilder.swift** - Vocabulary learning
- **ItalianGrammarHelper.swift** - Grammar rules
- **ItalianConjugationTables.swift** - Verb conjugation
- **ItalianReadingAssistant.swift** - Reading comprehension
- **ItalianLiteratureSummarizer.swift** - Text summarization
- **ItalianAudioReader.swift** - Text-to-speech reader
- **ItalianMindMapTemplate.swift** - Subject-specific layout

---

### J. OTHER MAJOR FEATURES

#### Camera (iOS/Features/Camera/)
- **CameraView.swift** - Camera interface
- **PhotoMarkupView.swift** - Image annotation

#### Accessibility (iOS/Features/Accessibility/)
- **ReadingAidsView.swift** - Reading assistance tools

#### Onboarding (iOS/Features/Onboarding/)
- **OnboardingView.swift** - Initial setup flow
- **OnboardingVoiceTutorialView.swift** - Voice feature intro
- **OnboardingVoiceFirstTutorialView.swift** - Advanced voice tutorial
- **OnboardingSampleMaterialView.swift** - Sample material setup
- **OnboardingPermissionsView.swift** - Permission requests
- **OnboardingGoogleAccountView.swift** - Google account setup
- **OnboardingAPIKeysView.swift** - API key configuration
- **OnboardingProgressIndicator.swift** - Multi-step progress
- **OnboardingModels.swift** - Onboarding data models

#### Help & Documentation (iOS/Features/Help/)
- **VoiceCommandHelpView.swift** - Voice command guide

#### Curiosity/Recommendations (iOS/Features/Curiosity/)
- **CuriosityRecommendationsView.swift** - Adaptive content recommendations

#### Proactive Coaching (iOS/Features/ProactiveCoaching/)
- **ProactiveCoachingService.swift** - Core coaching engine
- **ProactiveCoachingView.swift** - Coaching UI
- **IdleDetector.swift** - Idle time detection
- **ContextTracker.swift** - Study context tracking
- **WorkingMemoryCheckpoint.swift** - Learning state checkpoints
- **ProactivePrompt.swift** - Coaching prompt generation
- **ProactiveCoachingStrings.swift** - Localized strings

#### Profile (iOS/Features/Profile/)
- **ProfileView.swift** - User profile display

#### Quests (iOS/Features/Quests/)
- **WeeklyQuestsView.swift** - Weekly challenge/quest display
- **QuestRewardCelebrationView.swift** - Reward celebration

#### Lesson Recording (iOS/Features/LessonRecording/)
- **LessonRecordingView.swift** - Record lesson/lecture audio
- **LessonRecordingsListView.swift** - Recorded lessons list
- **LessonReviewView.swift** - Playback and review

#### Task Capture (iOS/Features/TaskCapture/)
- **TaskCaptureView.swift** - Voice task creation
- **TaskCaptureService.swift** - Task parsing service
- **NaturalLanguageTaskParser.swift** - NLP task extraction

#### Today (iOS/Features/Today/)
- **TodayCardView.swift** - Daily summary card
- **TodayModel.swift** - Daily data model

#### Context (iOS/Features/Context/)
- **ContextBannerView.swift** - Subject/material context display

#### Error Handling (iOS/Features/ErrorHandling/)
- **ErrorBannerView.swift** - Error notifications

#### Homework Help (iOS/Features/HomeworkHelp/)
- **HomeworkHelpView.swift** - Homework assistance interface

---

## 3. DATA MODELS (iOS/Models/)

### Core Models:
1. **Material.swift** - Study material entity
   - Title, description
   - PDF URL, extracted text
   - Subject relationship
   - Processing status
   - Google Drive file tracking
   - Last accessed date
   - Study assets (flashcards, mind maps)

2. **SubjectEntity.swift** - Subject/course entity
   - Display name
   - Localization keys
   - Icon and color
   - Subject-specific settings

3. **Flashcard.swift** - Flashcard entity
   - Question, answer
   - Difficulty level
   - Review schedule
   - Mastery status

4. **MindMap.swift** - Mind map entity
   - Root node reference
   - Theme configuration
   - Expansion state tracking

5. **Task.swift** - Task/assignment entity
   - Title, description
   - Due date
   - Completion status
   - Priority
   - Subject relationship

6. **VoiceConversation.swift** - Conversation history
   - Messages
   - Timestamps
   - Context (subject, material)
   - Metadata

7. **VoiceMessage.swift** - Individual messages
   - Content, role
   - Timestamp
   - Transcription

8. **Transcript.swift** - Voice transcription records
   - Audio, transcribed text
   - Confidence score
   - Timestamp

9. **StudySession.swift** - Study session records
   - Duration, date
   - Subject
   - Session type (flashcard, mind map, etc.)

10. **UserProgress.swift** - User achievement tracking
    - Study streak
    - Total study time
    - Subjects progress
    - Quests completed

11. **CoachPersona.swift** - Coach personality profile
    - Tone settings
    - Teaching style
    - Communication preferences

12. **LessonRecording.swift** - Recorded lessons
    - Audio file reference
    - Transcription
    - Metadata

13. **CuriosityContent.swift** - Recommendation content
    - Content item
    - Recommendation reason
    - Engagement metrics

14. **WeeklyQuest.swift** - Weekly challenges
    - Quest definition
    - Progress tracking
    - Rewards

15. **MaterialAlias.swift** - Fuzzy matching aliases
    - Alternate material names
    - Fuzzy match configuration

16. **GuardianConsent.swift** - Parental consent records
    - Consent status
    - Data usage permissions
    - Contact information

17. **LMSConsent.swift** - LMS integration consent

18. **TrackedDriveFile.swift** - Google Drive sync tracking
    - File ID, hash
    - Last sync date
    - Sync status

19. **VoiceSessionState.swift** - Voice session metadata
    - Session ID
    - Context information
    - Performance metrics

20. **QueryResult.swift** - Voice command results
    - Result data
    - Confidence score

---

## 4. CORE SERVICES & UTILITIES

### A. API/Network (iOS/Core/API/)

**Google Workspace Integration:**
- **GoogleWorkspaceClient.swift** - Main API client
- **GoogleWorkspaceConfiguration.swift** - Configuration
- **GoogleAPIModels.swift** - Data models
- **GoogleAPIError.swift** - Error handling

**Google Drive:**
- **GoogleDriveClient.swift** - Drive file operations

**Google Gemini AI:**
- **GeminiClient.swift** - Gemini API integration
- **GeminiConfiguration.swift** - Settings
- **GeminiModels.swift** - Response models
- **GeminiError.swift** - Error types

**OpenAI/Realtime:**
- **OpenAIClient.swift** - Chat API
- **OpenAIRealtimeClient.swift** - Realtime audio API
- **OpenAIConfiguration.swift** - Settings
- **ChatCompletionModels.swift** - Request/response models
- **OpenAIError.swift** - Error handling

### B. Core Services (iOS/Core/Services/ & iOS/Services/)

**Query Parsing & Material Matching:**
- **MaterialAliasService.swift** - Fuzzy material name matching
- **FuzzyMatcher.swift** - Fuzzy matching algorithm
- **TemporalParser.swift** - Natural language date parsing
- **QueryTelemetry.swift** - Query analytics

**Intents & Shortcuts:**
- **AppShortcutsProvider.swift** - Siri shortcuts integration
- **StartConversationIntent.swift** - Start conversation intent

### C. UI Core (iOS/Core/UI/)

- **ColorSystem.swift** - Centralized color palette
- **TouchTargetStyle.swift** - Accessibility touch targets

### D. Utilities (iOS/Core/Utilities/)

- **AccessibilityAudit.swift** - Accessibility compliance checking
- **AccessibilityVoiceCommandLabels.swift** - Voice labels
- **AudioCuesManager.swift** - Audio feedback management
- **HapticFeedbackManager.swift** - Haptic feedback
- **ImageProcessor.swift** - Image handling
- **LocalizationManager.swift** - Multi-language support
- **OneHandedOptimization.swift** - One-handed UI layout
- **TouchTargetHelpers.swift** - Touch target utilities

### E. UI Components (iOS/Core/Views/)

- **OfflineIndicator.swift** - Offline status indicator
- **SyncStatusView.swift** - Sync status display

---

## 5. DOCUMENT UPLOAD & PROCESSING FLOWS

### Import Flow:
1. **User initiates import** → MaterialImportView
2. **Choose source:**
   - Google Drive (file listing via GoogleDriveClient)
   - Local file system (UIDocumentPickerViewController)
3. **Select files** → Multiple selection support
4. **Download/copy files** → GoogleDriveDownloadService or FileManager
5. **Create Material entity** → SwiftData model
6. **OCR processing** (if image) → OCRService
7. **Trigger processing pipeline** → MaterialProcessingPipeline.shared
   - Steps: Mind maps, Flashcards
   - Configurable: enabledSteps, failFast, priority
8. **Save material** → modelContext.save()
9. **Send notification** → NotificationManager

### Processing Options:
```swift
ProcessingOptions(
  enabledSteps: [.mindMap, .flashcards],
  failFast: false,
  priority: .normal
)
```

### Supported File Types:
- PDFs (application/pdf)
- Google Docs (application/vnd.google-apps.document)
- Images: PNG, JPEG, HEIC (image/*)

---

## 6. VOICE INTERACTION FLOWS

### A. Voice Conversation Flow:
1. **Tap SmartVoiceButton** or **Voice Tab → "Inizia Conversazione"**
2. **Initialize VoiceConversationViewModel**
   - Load context (subject, material)
   - Setup Siri intent listener
3. **Show VoiceConversationView**
   - Adaptive layout (iPad vs iPhone)
   - Display conversation history
   - Show context banner (subject/material)
4. **User speaks:**
   - VoiceInput captured
   - Transcription via OpenAI Realtime
   - Sent to AI coach (Gemini or OpenAI)
5. **AI Response:**
   - Generated by LLM
   - Text-to-speech conversion
   - Played back to user
6. **Save conversation** → SwiftData (VoiceConversation entity)

### B. Voice Commands:
1. **Available triggers:**
   - SmartVoiceButton press
   - Siri integration (StartConversationIntent)
   - Voice command recognition
2. **Commands routed via:**
   - AppVoiceCommandHandler (EnvironmentObject)
3. **Command categories:**
   - Navigation (showMaterials, showStudy, showTasks)
   - Sheet triggers (showSettings, showProfile, showHelp, showMaterialImport)
   - Study mode (flashcards, mindMap, general)
   - Material selection (selectedMaterialID)

### C. Voice Feedback:
- **VoiceCommandFeedbackView** - Global overlay
- **VoiceIndicatorView** - Recording visualization
- **BreathingAnimationView** - Visual feedback during recording
- **Haptic & audio cues** - Confirmation feedback

### D. Proactive Coaching:
- **IdleDetector** - Monitors inactivity
- **ContextTracker** - Tracks study context
- **WorkingMemoryCheckpoint** - Assesses learning state
- **ProactiveCoachingService** - Triggers coaching prompts
- **ProactiveCoachingView** - Displays coaching suggestions

---

## 7. STUDY & FLASHCARD FEATURES

### Flashcard System:
- **Basic cards:** Question ↔ Answer flip
- **Progress tracking:** Current card progress display
- **Review scheduling:** ReviewScheduleView (SRS algorithm mentioned)
- **Guided coaching:** GuidedFlashcardView with AI coaching

### Study Statistics:
- **Today's metrics:** Duration, session count
- **Weekly metrics:** Total study time, session count
- **Streak tracking:** Current consecutive days
- **Study insights:** Detailed session history with breakdown
- **Session recording:** StudySession entities logged

### Study Timer:
- **Pomodoro-style:** Configurable duration
- **Quick access:** Dashboard quick action card
- **Background operation:** Continues when app backgrounded
- **Status indicator:** Shows in quick action when running

### Study Modes (via voice commands):
- **Flashcards mode:** Auto-selects first material with flashcards
- **Mind map mode:** Auto-selects first material with mind map
- **General mode:** Shows material list

---

## 8. DASHBOARD & STATISTICS

### Dashboard Components:

**Today Card (TodayCard.swift):**
- Personalized priorities (top 3 materials)
- Study streak display
- Completed tasks today count
- Upcoming deadline count
- Priority scoring algorithm:
  - Deadline proximity (100 pts max)
  - Study assets ready (40 pts max)
  - Recent activity (20 pts max)
  - New materials (15 pts)
  - Processing completion (5 pts)

**Quick Actions Section:**
- Study timer card (with live duration when active)
- Import from Google Drive
- Document scanner
- [Formerly: Voice lesson - now SmartVoiceButton]

**Materials Section:**
- Grouped by subject
- Horizontal scrolling card lists
- Material card with thumbnail, title, subject
- Offline indicator (when no internet)

**Update Button:**
- "Aggiornami" primary button
- Triggers sync with Google Calendar
- Refreshes dashboard data

### Statistics Views:

**StudyStatisticsView:**
- Today stats card
- This week stats card
- Current streak card
- Recent sessions list (3 most recent)
- Link to detailed insights

**StudyInsightsView:**
- All study sessions
- Session breakdown by subject/type
- Historical trend analysis
- Detailed metrics

---

## 9. NAVIGATION ARCHITECTURE

### URL/Deep Linking:
- Not explicitly visible in codebase
- NavigationStack used for linear navigation
- NavigationLink for view transitions

### Sheet Presentations:
**MainTabView consolidated sheets:**
- `.materialImport` - MaterialImportView
- `.settings` - SettingsView
- `.profile` - ProfileView
- `.help` - VoiceCommandHelpView

**DashboardView sheets:**
- `showingImport` - MaterialImportView
- `selectedMaterial` - MaterialDetailView
- `showingStreakHistory` - StreakHistoryView
- `showingGoalSettings` - GoalSettingsView
- `showingScanner` - DocumentScannerView

**StudyView sheets:**
- `selectedMaterial` - FlashcardStudyView or InteractiveMindMapView

### Voice Command Navigation:
Routes via AppVoiceCommandHandler EnvironmentObject:
```
showMaterials → selectedTab = 0 (Dashboard)
showStudy → selectedTab = 1 (Study) + studyMode
showTasks → selectedTab = 2 (Tasks)
showSettings → activeSheet = .settings
showProfile → activeSheet = .profile
showHelp → activeSheet = .help
showMaterialImport → activeSheet = .materialImport
selectedMaterialID → MaterialQueryParser.findMaterial()
```

---

## 10. KEY ARCHITECTURAL PATTERNS

### 1. MVVM (Model-View-ViewModel)
Used in complex features:
- VoiceConversationViewModel
- InteractiveMindMapViewModel
- GoogleDriveAuthViewModel

### 2. SwiftData Integration
- @Query macros for data fetching
- @Environment(\.modelContext) for operations
- Automatic change tracking

### 3. Environment Objects
- AppVoiceCommandHandler (voice command routing)
- LocalizationManager (language settings)
- CloudKitSyncMonitor (sync status)
- OfflineManager (connectivity)

### 4. Service Pattern
- Singleton services (GmailService, GoogleCalendarService, etc.)
- Configured with modelContext on app launch
- Observable objects for state management

### 5. Dependency Injection
- Environment for lightweight dependencies
- StateObject for service lifecycle
- EnvironmentObject for shared state

### 6. Observable/StateObject Pattern
- StudyTimerService
- Various view model services
- Backend synchronization services

### 7. Canvas Rendering
- InteractiveMindMapView uses Canvas for performance
- Custom drawing for mind map nodes/connections
- Gesture recognition (pan, zoom, tap)

---

## 11. FEATURE COMPLETENESS STATUS

### Fully Implemented:
- Tab navigation
- Material import (Google Drive + local files)
- Document scanner
- Material organization by subject
- Flashcard system (basic)
- Mind map visualization
- Study timer
- Study statistics
- Voice conversation
- Voice commands
- Settings panel
- Google Drive integration
- Gmail/Calendar sync (TasksView)
- Onboarding flow
- Accessibility features (dyslexia mode)
- Proactive coaching
- Subject-specific tools (Math, Science, History, Italian, Language)

### Partially Implemented:
- Tasks (email/calendar shown, creation marked TODO)
- Spaced repetition (marked as TODO)
- Study session deep analytics
- Lesson recording playback
- Curiosity recommendations

### Future Enhancements Noted:
- TasksView SwiftData integration
- Lesson recording features
- Advanced task creation UI
- Additional subject modes

---

## 12. LOCALIZATION & INTERNATIONALIZATION

### Supported Strings Structure:
- Italian primary strings
- English fallback for UI components
- Localization keys used throughout:
  - `dashboard.title`
  - `materials.empty.title`
  - `subject.matematica`
  - `Materiali`, `Studia`, `Compiti`, `Voce` (Italian tab names)

### Accessibility:
- VoiceOver labels throughout
- Touch target sizing (child-friendly: 48pt minimum)
- Haptic feedback
- Audio cues
- Dyslexia-friendly font (OpenDyslexic)
- Reading aids available

---

## 13. OFFLINE & SYNC CAPABILITIES

### Offline Support:
- OfflineManager monitors connectivity
- Materials cache displayed when offline
- "Showing cached materials" indicator
- Import blocked when offline
- Sync deferred until online

### Background Sync:
- BackgroundSyncManager
- BackgroundTaskScheduler
- Scheduled material sync (Task 72)
- Gmail/Calendar sync queued
- Update notifications sent when material ready (Task 138.4)

### CloudKit Integration:
- Enabled on real devices
- Disabled on simulator (no provisioning profile)
- Configured as private database: `iCloud.com.mirrorbuddy.MirrorBuddy`

---

## 14. PERFORMANCE & MONITORING

### Performance Monitoring:
- PerformanceMonitor (started on app launch)
- Memory baseline tracking
- Battery status logging
- FPS monitoring (disabled - causes degradation)
- App launch completion tracking

### Optimization Techniques:
- Canvas rendering for mind maps (not heavyweight UIView)
- Lazy loading of materials
- Pull-to-refresh for manual updates
- Background task scheduling
- Memory management with @StateObject lifecycle

---

## 15. SECURITY & AUTHENTICATION

### Google OAuth:
- GoogleWorkspaceClient handles authentication
- OAuth tokens stored securely (native iOS keychain)
- User email tracking for Drive sync

### API Keys:
- OpenAI, Gemini, and Google APIs configurable
- Onboarding step for key setup
- Stored in app configuration

### Data Protection:
- Guardian consent tracking
- LMS consent management
- Data usage permissions
- Email/calendar access scoped

---

## SUMMARY STATISTICS

- **Total Feature Modules:** 20+
- **Total View Files:** ~130 view files
- **Total Service/Model Files:** ~125 files
- **UI Components:** 50+ reusable components
- **Data Models:** 20 SwiftData entities
- **Third-party Integrations:** Google (Drive, Gmail, Calendar, Gemini), OpenAI
- **Supported Subjects:** 5+ with specialized tools
- **Languages:** Italian primary, English fallback
- **Accessibility Features:** Dyslexia mode, VoiceOver, touch targets, audio cues

---

## REBUILD CONSIDERATIONS

Before rebuilding the UI:

1. **Data Model Preservation**
   - Keep SwiftData schema (Material, Flashcard, MindMap, Task, StudySession, etc.)
   - Maintain CloudKit sync configuration

2. **Feature Preservation**
   - All 4 main tabs with their content
   - Voice command architecture
   - Settings and personalization
   - Study tracking and statistics

3. **Integration Points**
   - Google APIs (Drive, Gmail, Calendar, Gemini)
   - OpenAI Realtime for voice
   - Background sync services
   - Notification system

4. **Architecture Decisions**
   - Keep tab-based navigation (main structure)
   - Maintain SwiftUI + SwiftData stack
   - Preserve Environment/EnvironmentObject injection patterns
   - Keep service singleton pattern

5. **Critical UI Patterns**
   - SmartVoiceButton placement and functionality
   - Dashboard priority calculation algorithm
   - Material filtering and sorting
   - Study timer integration
   - Voice conversation adaptive layouts

