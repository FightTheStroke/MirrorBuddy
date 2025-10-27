# iOS Features - Quick Reference Guide

## Files Generated
1. **iOS_FEATURES_INVENTORY.md** - Complete, exhaustive feature documentation
2. **iOS_ARCHITECTURE_SUMMARY.md** - Visual diagrams and architecture patterns
3. **QUICK_REFERENCE_iOS_FEATURES.md** - This file

---

## What Does MirrorBuddy iOS Actually Do?

**Core Purpose:** AI-powered personal study coach for Italian students that:
- Imports study materials (PDFs, images, Google Docs)
- Automatically generates flashcards and mind maps
- Provides voice-based AI coaching
- Tracks study progress and streaks
- Integrates with student calendars and emails
- Offers subject-specific study tools

---

## The 4 Main Tabs (What Users See)

### Tab 1: Materiali (Materials)
**What it shows:**
- List of study materials (PDF documents, images)
- Organized by subject (Math, Science, History, Italian, Language)
- "Today" personalized priorities (top 3 materials to study)
- Quick action cards: Study Timer, Import from Drive, Scan Document
- Update button ("Aggiornami") to sync calendar

**Smart Features:**
- Auto-prioritizes materials based on deadlines
- Shows progress on each material
- Displays study streak (consecutive days)
- Offline support (caches materials when no internet)

### Tab 2: Studia (Study)
**What it shows:**
- List of materials with flashcards available
- List of materials with mind maps available
- Can open flashcards or mind maps from any material

**Smart Features:**
- Flashcards flip between question and answer
- Mind maps are interactive (pan, zoom, tap nodes)
- Tracks which cards you've studied
- Shows progress through deck

### Tab 3: Compiti (Tasks)
**What it shows:**
- Upcoming calendar events (from Google Calendar)
- Unread emails from teachers (from Gmail)
- Personal task list (not fully implemented yet)
- Sync button to refresh email/calendar

**Smart Features:**
- Auto-imported from Google Calendar and Gmail
- Shows deadlines and reminders
- Integrates with personal task management

### Tab 4: Voce (Voice)
**What it shows:**
- Large button to start voice conversation
- Info about what you can ask the AI
- Space for conversation history

**Smart Features:**
- Real-time voice input (you speak)
- AI responds in natural Italian
- Can ask for homework help, explanations, questions
- Adapts conversation to current subject/material

---

## Floating Button (Always Present)

**SmartVoiceButton** - Bottom-right corner
- Tap to start voice conversation anywhere
- Context-aware (knows what subject/material you're on)
- Keyboard-aware (moves up when typing)
- Haptic feedback when pressed

---

## Key Features Explained

### 1. Material Import & Processing
**Flow:**
1. User taps + button or "Importa da Drive"
2. Shows list of PDFs/images from Google Drive (or local files)
3. User selects which files to import
4. System downloads/copies files
5. **Automatic Processing:**
   - OCR for images (extracts text)
   - Generates mind maps (concept visualization)
   - Generates flashcards (Q&A extraction)
6. Sends notification when ready
7. Displays materials in "Materiali" tab

### 2. Voice Conversations
**Flow:**
1. User taps SmartVoiceButton or Voice tab
2. System records audio input
3. Transcription sent to AI (Gemini or OpenAI)
4. AI generates response
5. Text-to-speech converts to audio
6. Audio plays back to user
7. Conversation saved for history

### 3. Study Statistics & Streaks
**Tracked:**
- Study time today (in minutes)
- Study time this week
- Current streak (consecutive days studying)
- Recent study sessions
- What was studied

**Displayed:**
- Today's card shows: streak, completed tasks, upcoming deadlines
- Can tap streak to see detailed history
- Can view all study sessions with details

### 4. Subject-Specific Tools
Each subject has special features:

**Math:**
- Built-in calculator
- Function graphing
- Formula reference
- Problem solver (step-by-step)
- Practice problem generator

**Science:**
- Virtual experiment simulator
- Physics demonstrations
- Formula explainer
- Lab report template
- Unit converter

**History:**
- Timeline viewer
- Historical character profiles
- Date memorization tool
- Era summaries
- Geographic timeline maps

**Italian:**
- Vocabulary builder
- Grammar rules
- Verb conjugation tables
- Reading comprehension help
- Text-to-speech reader

**Languages:**
- Grammar checker
- Pronunciation guidance
- Translation helper

### 5. Study Timer
- Pomodoro-style timer
- Quick action card on Materials tab
- Shows live countdown
- Runs in background
- Configurable duration

### 6. Document Scanner
- Use camera to photograph documents
- Auto-enhance/crop image
- Convert to PDF
- Creates material automatically

### 7. Accessibility Features
- OpenDyslexic font toggle
- Reading aids panel
- VoiceOver support throughout
- Haptic feedback
- Audio cues for confirmations
- Large touch targets (48pt minimum)

---

## Behind the Scenes (What Developers Care About)

### Data Models
Everything stored in SwiftData (local database):
- **Materials** - Study documents
- **Flashcards** - Q&A pairs
- **MindMaps** - Concept diagrams
- **Tasks** - Assignments
- **VoiceConversations** - Chat history
- **StudySession** - Time spent studying
- **UserProgress** - Achievements, streaks

### Services Integrate With:
- **Google Drive** - Import materials
- **Gmail** - Show teacher emails
- **Google Calendar** - Show events
- **Google Gemini** - AI responses
- **OpenAI** - Voice transcription & AI
- **CloudKit** - Cloud sync
- **Notifications** - Alerts when materials ready

### Processing Pipeline
```
User imports PDF/image
    ↓
OCR extracts text
    ↓
AI generates mind map (concept relationships)
    ↓
AI generates flashcards (key Q&A pairs)
    ↓
All saved to SwiftData
    ↓
Notification sent to user
    ↓
Materials appear in app
```

### Voice Architecture
```
User speaks
    ↓
OpenAI Realtime API (transcribes)
    ↓
Transcription + context → AI (Gemini/OpenAI)
    ↓
AI response generated
    ↓
Text-to-speech converts to audio
    ↓
Audio plays + text displays
    ↓
Saved to VoiceConversation model
```

### Navigation
- **Main container:** 4 tabs (never changes)
- **Inside each tab:** Can open sheets (popups)
- **Voice commands:** Can trigger navigation
- **Deep linking:** Can jump to specific materials

### State Management
- Uses Swift's **Environment** pattern
- Voice commands go through **AppVoiceCommandHandler**
- Language changes update all views automatically
- Offline state tracked in **OfflineManager**

---

## What's Fully Working

1. Material import (Google Drive + local files)
2. Document scanner
3. Flashcard display & navigation
4. Mind map visualization (interactive)
5. Voice conversations with AI
6. Voice commands
7. Study timer
8. Study statistics & streaks
9. Settings panel (10 different sections)
10. Google Drive authentication
11. Gmail/Calendar sync
12. Offline mode support
13. CloudKit sync
14. Onboarding flow
15. Subject-specific tools

---

## What's Partially Working or TODO

1. **Tasks** - Email/calendar show, but task creation not implemented
2. **Spaced Repetition** - Flashcards work, but SRS algorithm marked TODO
3. **Lesson Recording** - Can record, but playback/review marked TODO
4. **Curiosity** - Recommendation system exists but incomplete

---

## Critical Numbers for Rebuild

- **255 total Swift files** - Don't try to rebuild without understanding scope
- **20 data models** - Keep these, they hold all user data
- **4 main tabs** - Don't change this navigation structure
- **50+ reusable UI components** - Can be redesigned but must maintain functionality
- **20+ feature modules** - Each with specific purpose

---

## Most Important Files for Understanding

1. `/iOS/App/MirrorBuddyApp.swift` - App entry point & initialization
2. `/iOS/Features/Dashboard/Views/MainTabView.swift` - Tab navigation
3. `/iOS/Features/Dashboard/Views/DashboardView.swift` - Main dashboard
4. `/iOS/Features/Voice/Views/VoiceConversationView.swift` - Voice chat
5. `/iOS/Features/Materials/Views/MaterialImportView.swift` - Import flow
6. `/iOS/Models/Material.swift` - Core data model

---

## UI Rebuild Checklist

If rebuilding the UI, MUST preserve:

- [ ] Tab-based main navigation (4 tabs)
- [ ] SmartVoiceButton floating button (persistent)
- [ ] Material priority calculation algorithm
- [ ] Voice conversation flow (record → transcribe → AI → TTS)
- [ ] Document import pipeline (download → OCR → process → save)
- [ ] SwiftData models (don't change schema)
- [ ] Environment-based state management
- [ ] Service singleton patterns
- [ ] Offline mode functionality
- [ ] CloudKit sync configuration
- [ ] Accessibility features (dyslexia mode, VoiceOver)
- [ ] Subject-specific tool integration

---

## Understanding the Student Experience

### Typical Study Session:
1. Student opens app → Sees "Materiali" tab
2. App shows today's top 3 priorities (deadline-based)
3. Student can:
   - Tap study timer for focused study
   - Open flashcards to quiz themselves
   - Open mind map to review concepts
   - Tap SmartVoiceButton to ask AI for help
4. Study time is tracked automatically
5. Streak increments if they study (daily)

### Homework Help Flow:
1. Student gets homework assignment
2. Can speak to SmartVoiceButton: "Help me with math problems"
3. AI responds with step-by-step explanation
4. Can ask follow-up questions naturally
5. Conversation saved for later review

### Material Import Flow:
1. Teacher shares PDF via Google Drive
2. Student taps "Importa da Drive"
3. Student selects PDF
4. System automatically:
   - Extracts text (OCR if image)
   - Generates mind map
   - Creates flashcards
5. Student gets notification: "Material ready!"
6. Material appears in app immediately

---

## Architecture Philosophy

MirrorBuddy iOS follows these principles:

1. **Voice-First** - SmartVoiceButton always accessible
2. **Offline-Ready** - Works without internet (cached data)
3. **Cloud-Synced** - CloudKit keeps data in sync
4. **Accessible** - Dyslexia support, VoiceOver, large targets
5. **Subject-Aware** - Tools adapt to what's being studied
6. **Progress-Tracked** - Everything measured (streaks, time, sessions)
7. **AI-Enhanced** - Gemini/OpenAI power the coaching

---

## Not Implemented (But Designed For)

- Collaborative study (multiple users)
- Social features (sharing achievements)
- Advanced spaced repetition SRS
- Video tutorials
- Live tutoring (only AI)
- Mobile web app

