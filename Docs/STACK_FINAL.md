# MirrorBuddy - Final Technology Stack
**Date**: 2025-10-12
**Status**: ✅ APPROVED - Ready for Development
**All Critical Decisions**: COMPLETED

---

## 🎯 Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│              MirrorBuddy iOS/iPadOS/macOS               │
│                   (Swift 6 + SwiftUI)                   │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┼──────────┬────────────┐
        │           │          │            │
  ┌─────▼─────┐┌───▼────┐┌───▼────┐┌──────▼──────┐
  │   Apple   ││ OpenAI ││ Gemini ││ NotebookLM  │
  │Intelligence││  GPT-5 ││ 2.5 Pro││   (FREE)    │
  │  (Local)  ││ Family ││        ││             │
  └───────────┘└────────┘└────────┘└─────────────┘
       70%         25%       5%          FREE
```

---

## 📱 Platform & Core Technologies

### Platform
- **iOS 26+** (iPhone, iPad)
- **macOS 26+** (Mac)
- **Priority**: iPad first, then iPhone, then Mac
- **Deployment**: TestFlight → App Store (optional)

### Development
- **Language**: Swift 6
- **UI Framework**: SwiftUI
- **Concurrency**: async/await, Actors
- **Min Version**: iOS 26.0, macOS 26.0

### Storage & Sync
- **Local**: SwiftData (SQLite-based, @Model)
- **Sync**: CloudKit (iCloud, automatic)
- **Cache**: FileManager + SwiftData
- **Keychain**: Secure credential storage

---

## 🤖 AI Stack (3-Tier Strategy)

### Tier 1: Apple Intelligence (Local, 70% usage) 🟢
**iOS 26 Foundation Models Framework (3B parameters)**

**What it does**:
- Text summarization (quick, on-device)
- Text simplification (for dyslexia)
- Basic Q&A (within provided context)
- Translation (Live Translation)
- Sentiment analysis

**When we use it**:
- ✅ Quick text processing
- ✅ Privacy-sensitive operations
- ✅ Offline mode
- ✅ Material pre-processing before cloud AI
- ✅ Simple rewrites/explanations

**Apple Speech Framework**:
- Text-to-Speech (read materials aloud)
- Speech-to-Text (voice commands, local)
- Works offline
- Italian language excellent

**Apple Vision (VisionKit)**:
- Text detection (OCR)
- Document scanning
- On-device, fast

**Cost**: FREE ✅

---

### Tier 2: OpenAI GPT-5 Family (Cloud, 25% usage) 🔵
**Primary cloud AI provider**

#### GPT-5 Realtime API
**Purpose**: Real-time voice conversation
**Use cases**:
- Study coaching (Mario talks with AI)
- Homework explanations
- Interactive learning
- Q&A sessions

**Why**: Only solution for true real-time bidirectional voice
**Cost**: ~$40-70/month

#### GPT-5 mini
**Purpose**: General tasks, vision
**Use cases**:
- Camera homework help (analyze textbook photos)
- Vision-based problem solving
- General text processing (when Apple Intelligence insufficient)
- Material analysis

**Pricing**: $0.25/1M input, $2/1M output
**Cost**: ~$20-30/month

#### GPT-5 nano
**Purpose**: Simple, cheap tasks
**Use cases**:
- Simple Q&A
- Quick classifications
- Basic text operations

**Pricing**: $0.05/1M input, $0.40/1M output
**Cost**: ~$5-10/month

#### GPT-5 (full model)
**Purpose**: Complex reasoning (sparingly)
**Use cases**:
- Complex mind map generation
- Advanced problem solving
- Multi-step reasoning

**Pricing**: $1.25/1M input, $10/1M output
**Cost**: ~$10-20/month (limited usage)

#### DALL-E 3
**Purpose**: Image generation for mind maps
**Use cases**:
- Visual nodes for mind maps
- Simplified illustrations
- Icons and diagrams

**Pricing**: ~$0.04/image (1024x1024)
**Cost**: ~$5-10/month (100-200 images)

**Total OpenAI**: ~$80-140/month

---

### Tier 3: Google Gemini 2.5 Pro (Cloud, 5% usage) 🟡
**Specialized for Google Workspace integration ONLY**

**Purpose**: Native Google Drive/Calendar/Gmail integration
**Use cases**:
- List files from Google Drive (Mario's school folder)
- Deep Research on folder contents
- Parse teacher emails for assignments
- Extract calendar events (deadlines)
- Summarize multiple documents at once

**Why Gemini**:
- Built-in Google Workspace integration
- "Deep Research" feature perfect for folders
- Better than manual API + OpenAI processing

**Pricing**: $1.25/1M input, $5/1M output
**Cost**: ~$10-20/month (limited usage, only for Google operations)

---

### Bonus: NotebookLM (FREE!) 🎁
**Purpose**: Educational audio content

**Use cases**:
- Audio Overviews (AI hosts discuss materials)
- Video Overviews (visual presentations)
- Study guides auto-generation
- Flashcards
- Learning Guide (personalized tutoring)

**How**: Manual workflow (for MVP)
1. Mario/app uploads PDF to NotebookLM
2. NotebookLM generates audio overview
3. Mario listens directly in NotebookLM or app embeds

**Future**: If NotebookLM releases API, full integration

**Cost**: FREE ✅

---

## 🔌 External Integrations

### Google APIs (Direct, no MCP)
**Authentication**: OAuth 2.0
**Storage**: Tokens in Keychain

#### Google Drive API
- List files in specific folders ("Mario - Scuola")
- Download PDFs, docs
- Monitor for new uploads
- Search capabilities

#### Google Calendar API
- List events (assignments, tests)
- Extract due dates
- Create reminders

#### Gmail API
- Read teacher emails
- Parse for assignments
- Extract attachments
- Search by subject/sender

**Implementation**: Native iOS SDK (GoogleSignIn-iOS, Google API Client)

---

## 🏗️ Architecture Principles

### 1. **No Backend Server** ✅
- iOS app calls APIs directly
- Background Tasks for automation
- CloudKit for sync
- No deploy, no hosting, no maintenance

### 2. **Offline-First with Cloud Enhancement** ✅
```
Offline (no internet):
  - Apple Intelligence (text processing)
  - Apple Speech (TTS/STT)
  - Apple Vision (OCR)
  - Cached materials
  - Saved mind maps
  - Local progress tracking

Online (with internet):
  - OpenAI (voice, vision, mind maps)
  - Gemini (Google sync)
  - NotebookLM (audio overviews)
  - CloudKit sync
  - Fresh material downloads
```

### 3. **Smart Fallback Strategy** ✅
```
Try local first:
  Apple Intelligence → Fast, free, private

If insufficient:
  Cloud AI → Better quality, more capabilities

If old device (no Apple Intelligence):
  Use cloud for everything (GPT-5 nano for simple tasks)
```

### 4. **Automation Without Backend** ✅
```swift
// iOS Background Tasks (native)
BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.mirrorbuddy.sync") { task in
    // Scheduled at 13:00 CET and 18:00 CET
    await performMaterialSync()
    task.setTaskCompleted(success: true)
}

// Google Drive webhook (if available)
// Or polling every sync cycle

async func performMaterialSync() {
    // 1. Check Google Drive for new files (Gemini)
    let newFiles = try await gemini.listNewFiles(since: lastSync)

    // 2. Download PDFs
    for file in newFiles {
        let pdf = try await downloadFile(file)

        // 3. Process in parallel
        async let mindMap = openAI.generateMindMap(pdf)        // GPT-5
        async let images = openAI.generateImages(pdf)          // DALL-E 3
        async let summary = appleAI.summarize(pdf)             // Local
        async let flashcards = openAI.generateFlashcards(pdf)  // GPT-5 nano

        // 4. Save to SwiftData
        let material = Material(
            title: file.name,
            mindMap: await mindMap,
            images: await images,
            summary: await summary,
            flashcards: await flashcards
        )
        modelContext.insert(material)
    }

    // 5. Notify Mario
    await notificationService.send("📚 3 new materials ready!")
}
```

---

## 📊 Cost Breakdown

### Monthly Operating Costs (Steady State)

| Component | Usage | Cost/Month | Notes |
|-----------|-------|------------|-------|
| **OpenAI GPT-5 Realtime** | 30h voice | $40-70 | Real-time conversation |
| **OpenAI GPT-5 mini** | 10M tokens | $20-30 | Vision, general tasks |
| **OpenAI GPT-5 nano** | 20M tokens | $5-10 | Simple Q&A |
| **OpenAI GPT-5 full** | 2M tokens | $10-20 | Complex reasoning |
| **OpenAI DALL-E 3** | 150 images | $5-10 | Mind map images |
| **Gemini 2.5 Pro** | 5M tokens | $10-20 | Google integration |
| **NotebookLM** | Unlimited | $0 | FREE! |
| **Apple Intelligence** | All local | $0 | FREE! |
| **Apple Speech** | All local | $0 | FREE! |
| **CloudKit** | < 1GB | $0 | FREE! (included) |
| **TOTAL** | - | **$90-160** | Realistic for daily use |

### One-Time Costs
- Apple Developer Account: $99/year
- Google Cloud Project: $0 (free tier sufficient)

### Development Costs (Phase 0-8)
- Est. API usage during dev: $270-450 (~18 weeks × $15-25/week)

**Year 1 Total**: ~$1,500-2,300 (APIs + Apple Developer)

---

## 🔒 Security & Privacy

### Data Handling
- **User data encrypted** at rest (SwiftData default)
- **API keys** in Keychain (encrypted)
- **Google OAuth tokens** in Keychain
- **No telemetry** without consent
- **No data sold** to third parties
- **No training data** (OpenAI/Gemini with data retention policies)

### On-Device Processing Priority
1. Try Apple Intelligence first (local, private)
2. Fall back to cloud only when necessary
3. User can see what data is sent where (transparency)

### GDPR Compliance
- Data minimization (only essential data collected)
- Right to access (export via SwiftData)
- Right to deletion (clear all data button)
- Consent for cloud processing (first run)

---

## ♿ Accessibility

### Built-In (iOS Native)
- VoiceOver support (all UI)
- Dynamic Type (adjustable text size)
- High Contrast modes
- Reduce Motion
- AssistiveTouch

### Mario-Specific
- **One-handed operation** (right-thumb optimized)
- **Large touch targets** (min 44×44 pt)
- **Voice-first interface** (everything accessible by voice)
- **Dyslexia-friendly fonts** (OpenDyslexic option)
- **Limited working memory** (always show context, no multi-step requirements)
- **Encouraging feedback** (positive reinforcement, no pressure)

---

## 🧪 Testing Strategy

### Unit Tests
- SwiftData models
- Business logic
- API clients (with mocks)
- Utilities
- **Target**: >80% coverage

### Integration Tests
- API integrations (Google, OpenAI, Gemini)
- Background Tasks
- Sync logic
- Error handling

### UI Tests
- Main user flows
- Accessibility (VoiceOver navigation)
- Voice commands
- Camera integration

### Performance Tests
- App launch time (<2s)
- Voice latency (<1s)
- Mind map rendering (<5s)
- Memory usage (no leaks)

---

## 📱 Device Support & Requirements

### Minimum Requirements
- **iOS**: 26.0+ (released Sept 2025)
- **macOS**: 26.0+ (Tahoe)
- **Devices**:
  - iPad with A12+ (2018+) - **Priority device**
  - iPhone with A12+ (iPhone XS and newer)
  - Mac with Apple Silicon (M1+) or Intel (2018+)

### Apple Intelligence Support
- **Supported**: M-series iPads, M-series Macs, A17+ iPhones
- **Fallback**: Older devices use cloud AI (GPT-5 nano) instead of local

### Recommended
- iPad Pro/Air (M1+) with Apple Pencil
- 64GB+ storage (for cached materials)
- Internet connection (WiFi or cellular)

---

## 🚀 Development Timeline

### Agent-Driven Development (6-8 weeks)
```
Week 1-2: Phase 0-1 (Foundation + Materials)
Week 3-4: Phase 2-3 (Voice + Vision)
Week 5-6: Phase 4-5 (Mind Maps + Tasks)
Week 7-8: Phase 6-8 (Gamification + Polish)
```

### With 3-5 Agents in Parallel
- **Speedup**: 3x vs sequential development
- **Human involvement**: 5-10h/week (decisions, reviews)
- **Agent autonomy**: 90% of implementation

---

## ✅ Why This Stack?

### Simplicity ✅
- No backend server
- No MCP, no n8n, no complex orchestration
- Direct API calls
- iOS native = less code, better UX

### Cost Efficiency ✅
- Apple Intelligence = 70% local (FREE)
- GPT-5 nano for simple tasks (cheapest)
- NotebookLM for audio (FREE)
- CloudKit sync (FREE)
- $90-160/month total (reasonable)

### Performance ✅
- On-device processing = instant
- Native iOS = fast, efficient
- Background Tasks = system-optimized
- CloudKit sync = automatic, reliable

### Mario-First ✅
- Voice-first (OpenAI Realtime best)
- Visual mind maps (GPT-5 + DALL-E)
- Accessible (iOS native accessibility)
- Offline capable (Apple Intelligence)
- Always helpful (multiple AI tiers)

### Developer-Friendly ✅
- Well-documented APIs
- Mature frameworks (SwiftUI, SwiftData)
- Agent-driven development ready
- Clear separation of concerns
- Easy to test and debug

---

## 🎯 Success Metrics

### Technical
- [ ] App launch < 2s
- [ ] Voice latency < 1s
- [ ] Mind map generation < 5s
- [ ] 95%+ API success rate
- [ ] 80%+ test coverage
- [ ] Zero accessibility issues
- [ ] Offline mode functional

### Product
- [ ] Mario uses 30-60 min/day
- [ ] 90%+ homework completion
- [ ] Voice commands 95%+ understood
- [ ] Reduced stress (qualitative)
- [ ] Improved grades (quantitative)

### Development
- [ ] 6-8 weeks timeline
- [ ] < $160/month API costs
- [ ] 3x speedup via agents
- [ ] Zero critical bugs

---

**This stack is APPROVED and READY for agent-driven development! 🚀**

**Last Updated**: 2025-10-12
**Status**: ✅ FINAL - No more changes
