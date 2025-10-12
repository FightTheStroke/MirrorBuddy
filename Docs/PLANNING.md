# MirrorBuddy - Planning Document
**Date**: 2025-10-12
**Status**: Initial Planning

## Project Vision
MirrorBuddy is a personalized learning companion for Mario, designed to support his unique learning needs (dyslexia, dyscalculia, dysgraphia, left hemiplegia, limited working memory). The app acts as a dedicated support teacher, making learning fun, engaging, and stress-free through multimodal interaction and gamification.

---

## 1. USER PROFILE & NEEDS

### Mario's Profile
- **Age/Level**: Middle/High school student
- **Challenges**:
  - Dyslexia (reading difficulties)
  - Dyscalculia (math difficulties)
  - Dysgraphia (writing difficulties)
  - Left hemiplegia (limited left hand mobility)
  - Limited working memory
- **Strengths**:
  - Responds well to voice interaction (ChatGPT)
  - Visual learning through webcam/screen sharing
  - Enjoys gamification (Fortnite-style rewards)

### Key Requirements
1. **Accessibility**: Voice-first, minimal typing, one-handed operation
2. **Patience**: No time pressure, encouraging tone, stress-free
3. **Simplification**: Complex concepts broken down into digestible pieces
4. **Multimodal**: Voice, vision (camera/screen), text-to-speech
5. **Integration**: Google Drive, Calendar, Gmail
6. **Gamification**: Progress tracking, rewards, achievements
7. **Subject Adaptability**: Math, Physics, Italian, History, etc.

---

## 2. CORE FEATURES

### 2.1 Material Management
**Epic**: "Access and organize learning materials"

- **F1.1**: Google Drive Integration
  - Monitor specific folders for new uploads
  - Auto-download/sync new materials
  - Categorize by subject/due date
  - Show "New Materials" badge/notification

- **F1.2**: Smart Material Dashboard
  - Visual cards for each subject
  - "What's New" section prominently displayed
  - One-tap access to latest materials
  - Auto-prioritization by deadline

- **F1.3**: Material Transformation
  - Auto-convert PDFs/docs to accessible formats
  - Extract text from images (OCR)
  - Generate audio versions (TTS with natural voice)
  - Simplify complex text automatically

### 2.2 Mind Map Generator
**Epic**: "Visual learning through adaptive mind maps"

- **F2.1**: AI-Powered Mind Maps
  - Generate simplified mind maps from materials
  - Adjust complexity based on Mario's comprehension
  - Use colors, icons, and visual hierarchies
  - Interactive zoom/explore functionality

- **F2.2**: Mind Map Customization
  - Voice commands to modify structure
  - Add personal notes/examples
  - Link related concepts across subjects
  - Save favorite map styles

- **F2.3**: Spaced Repetition Integration
  - Highlight areas needing review
  - Progressive disclosure (show more as he masters topics)
  - Track which concepts are understood

### 2.3 Multimodal Study Coach
**Epic**: "Real-time learning companion"

- **F3.1**: Voice Interaction (Primary Interface)
  - Always-on voice assistant
  - Natural conversation flow
  - Interrupt/redirect capabilities
  - Voice commands for all functions

- **F3.2**: Vision Capabilities
  - Camera integration for showing textbook pages
  - Handwriting recognition (iPad with Apple Pencil)
  - Real-world object recognition (Physics examples)
  - Screen sharing for digital materials

- **F3.3**: Personalized Coaching Persona
  - Encouraging, patient, friend-like tone
  - "Fellow student who's just ahead" personality
  - Celebrates small wins
  - Never shows frustration
  - Uses humor and engagement

- **F3.4**: Subject-Specific Modes
  - **Math Mode**: Step-by-step equation solving, visual aids
  - **Physics Mode**: Real-world examples, simulations
  - **Italian Mode**: Read-aloud, summarization, memory aids
  - **History/Science Mode**: Storytelling approach, timelines

### 2.4 Homework & Task Management
**Epic**: "Stay organized and on track"

- **F4.1**: Google Calendar Integration
  - Sync assignments and due dates
  - Smart reminders (not too early to cause anxiety)
  - "What should I work on now?" feature
  - Time estimation for tasks

- **F4.2**: Gmail Integration
  - Parse teacher emails for assignments
  - Highlight important messages
  - Auto-add due dates to calendar
  - Voice summary of new messages

- **F4.3**: Task Breakdown
  - Large assignments split into micro-tasks
  - Progress tracking per sub-task
  - Visual progress bars
  - "Next step" guidance

### 2.5 Gamification & Motivation
**Epic**: "Make learning fun and rewarding"

- **F5.1**: XP & Leveling System
  - Earn XP for completed tasks, study sessions
  - Level progression with visual rewards
  - Fortnite-inspired UI elements
  - Battle Pass concept for semester goals

- **F5.2**: Achievements & Badges
  - Subject-specific achievements
  - Streak tracking (consecutive study days)
  - Special badges for challenging topics
  - Shareable achievements (with parent)

- **F5.3**: Virtual Rewards
  - Unlock themes/avatars
  - Collect companion characters
  - Mini-games as break rewards
  - Customization options

### 2.6 Accessibility Features
**Epic**: "Designed for Mario's specific needs"

- **F6.1**: One-Handed Operation
  - Large touch targets
  - Gesture-based navigation
  - Voice as primary input
  - Right-hand optimized layouts

- **F6.2**: Dyslexia-Friendly Design
  - OpenDyslexic font option
  - Adjustable text size/spacing
  - High contrast modes
  - Minimize text density

- **F6.3**: Working Memory Support
  - Always-visible context (where am I?)
  - Previous steps easily accessible
  - Audio reminders of current task
  - No multi-step memory requirements

---

## 3. TECHNOLOGY STACK ANALYSIS

### 3.1 Apple Intelligence (iOS 26, macOS 26)
**Capabilities**:
- ✅ On-device processing (privacy, works offline)
- ✅ Live Translation (potential for language learning)
- ✅ Visual Intelligence (screenshot analysis)
- ✅ Foundation Models Framework (developer access)
- ✅ Tight OS integration (Siri, Shortcuts, etc.)

**Best Use Cases**:
- Text summarization (on-device, fast)
- Basic Q&A without internet
- System integrations (reminders, calendar)
- Privacy-sensitive operations

**Limitations**:
- Less capable than cloud models for complex reasoning
- Limited multimodal capabilities vs. GPT-4V
- No real-time voice conversation

### 3.2 OpenAI Platform
**GPT-4V (Vision)**:
- ✅ Excellent vision capabilities (analyze textbook pages)
- ✅ Strong reasoning for complex problems
- ✅ Good at explaining concepts simply

**Realtime API**:
- ✅ Bidirectional voice conversation
- ✅ Low latency (<1 second)
- ✅ Natural interruptions
- ✅ Emotion detection in voice

**Best Use Cases**:
- Primary conversational AI
- Vision-based homework help
- Complex reasoning tasks
- Real-time voice coaching

### 3.3 Anthropic Claude
**Claude 3.5 Sonnet**:
- ✅ Excellent reasoning and instruction following
- ✅ Great at structured outputs (mind maps)
- ✅ Strong document analysis
- ✅ Good at adapting tone/style

**Agent SDK**:
- ✅ Context management
- ✅ Tool use (calendar, email, etc.)
- ✅ Memory across sessions

**Best Use Cases**:
- Material processing and transformation
- Mind map generation
- Task breakdown and planning
- Structured learning paths

### 3.4 Microsoft Agent Framework
**Capabilities**:
- ✅ Multi-agent orchestration
- ✅ Graph-based workflows
- ✅ Human-in-the-loop patterns

**Assessment**:
- ❌ Too complex for this project
- ❌ Overhead not justified
- ❌ Python/.NET backend adds complexity

---

## 4. RECOMMENDED ARCHITECTURE

### 4.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    iOS/macOS Apps (SwiftUI)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   iPhone     │  │     iPad     │  │     Mac      │      │
│  │  (Companion) │  │  (Main Study)│  │  (Research)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           │                                  │
│                      SwiftData (Local Storage)              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │   iCloud Sync         │
                │   (Progress, Maps)    │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
  ┌─────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
  │   Apple    │    │   OpenAI    │    │   Claude    │
  │Intelligence│    │  GPT-4V +   │    │  3.5 Sonnet │
  │ (On-device)│    │ Realtime API│    │   (API)     │
  └─────┬──────┘    └──────┬──────┘    └──────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────┴───────────┐
                │   External Services   │
                │  - Google Drive API   │
                │  - Google Calendar    │
                │  - Gmail API          │
                └───────────────────────┘
```

### 4.2 Core Components

#### A. Native App (Swift/SwiftUI)
- **Target**: iOS 26+, macOS 26+
- **Framework**: SwiftUI for cross-platform UI
- **Storage**: SwiftData for local persistence
- **Sync**: CloudKit for cross-device sync
- **Voice**: AVFoundation + Speech Framework
- **Camera**: AVFoundation + VisionKit

#### B. AI Orchestration Layer (Swift)
Simple coordinator that routes requests to appropriate AI:
- **Apple Intelligence**: Quick tasks, offline fallback
- **OpenAI Realtime**: Voice conversations
- **OpenAI GPT-4V**: Vision + complex reasoning
- **Claude API**: Document processing, mind maps

#### C. Google Integration Layer
- **Drive**: Google Drive SDK for iOS
- **Calendar**: Google Calendar API
- **Gmail**: Gmail API with OAuth2

#### D. Local Intelligence
- **Mind Map Cache**: Store generated maps locally
- **Material Index**: Fast search over cached materials
- **Progress Tracking**: All XP, achievements stored locally
- **Offline Mode**: Basic features work without internet

### 4.3 AI Model Assignment

| Feature | Primary AI | Fallback | Reason |
|---------|-----------|----------|--------|
| Voice Conversation | OpenAI Realtime | Apple Intelligence | Real-time voice is killer feature |
| Vision (homework help) | GPT-4V | Claude Vision | Best vision understanding |
| Mind Map Generation | Claude 3.5 | GPT-4 | Structured output excellence |
| Text Simplification | Apple Intelligence | Claude | Fast, local, private |
| Task Breakdown | Claude 3.5 | GPT-4 | Planning and structure |
| Math Problem Solving | GPT-4V + Realtime | Claude | Vision + voice explanation |
| Material Processing | Claude 3.5 | GPT-4 | Document analysis |
| Motivational Coaching | OpenAI Realtime | GPT-4 | Personality/tone |

### 4.4 Data Flow Example: "Help me with this math problem"

1. **User**: Shows iPad camera at math problem
2. **App**: Captures image, sends to GPT-4V
3. **GPT-4V**: Analyzes image, extracts equation
4. **App**: Displays equation in accessible format
5. **App**: Switches to OpenAI Realtime voice
6. **Realtime**: Guides Mario step-by-step vocally
7. **App**: Shows visual aids synchronized with voice
8. **SwiftData**: Saves problem + solution for review
9. **Gamification**: Awards XP for completion
10. **iCloud**: Syncs progress across devices

---

## 5. DEVELOPMENT PHASES

### Phase 0: Foundation (Weeks 1-2)
**Goal**: Setup project structure and basic infrastructure

- [x] Create Xcode project structure
- [ ] Setup SwiftData models
- [ ] Implement basic navigation (TabView)
- [ ] Design system (colors, fonts, components)
- [ ] Accessibility foundation (VoiceOver support)
- [ ] API client setup (OpenAI, Claude)

### Phase 1: Material Management (Weeks 3-4)
**Goal**: Mario can see and access his materials

- [ ] Google Drive integration
- [ ] Material list view with subjects
- [ ] Material detail view (PDF viewer)
- [ ] Text-to-Speech for materials
- [ ] Basic search and filter
- [ ] Local material cache

**Success Criteria**: Mario can browse and read his materials with audio support

### Phase 2: Voice Coach - Basic (Weeks 5-6)
**Goal**: Mario can talk to his AI study buddy

- [ ] OpenAI Realtime API integration
- [ ] Voice recording/playback UI
- [ ] Basic conversation flow
- [ ] Interruption handling
- [ ] Coach personality prompts
- [ ] Conversation history

**Success Criteria**: Mario can have a natural conversation about homework

### Phase 3: Vision Capabilities (Weeks 7-8)
**Goal**: Mario can show materials to the AI

- [ ] Camera integration
- [ ] GPT-4V image analysis
- [ ] Handwriting recognition (Apple Pencil)
- [ ] Screen capture and sharing
- [ ] Image annotation tools
- [ ] Combined vision + voice mode

**Success Criteria**: Mario can show a textbook page and get help

### Phase 4: Mind Maps (Weeks 9-10)
**Goal**: Auto-generated visual learning aids

- [ ] Claude API for mind map generation
- [ ] Mind map visualization component
- [ ] Interactive navigation (zoom, pan)
- [ ] Save and organize maps
- [ ] Voice-driven map exploration
- [ ] Map templates for different subjects

**Success Criteria**: Mario can generate and explore mind maps from materials

### Phase 5: Task Management (Weeks 11-12)
**Goal**: Stay organized with calendar and email

- [ ] Google Calendar integration
- [ ] Gmail integration
- [ ] Assignment parser (email → tasks)
- [ ] Task list view with priorities
- [ ] Smart notifications
- [ ] "What's next?" feature

**Success Criteria**: Mario sees upcoming assignments and knows what to do

### Phase 6: Gamification (Weeks 13-14)
**Goal**: Make it fun and motivating

- [ ] XP system implementation
- [ ] Level progression
- [ ] Achievement system
- [ ] Visual rewards and badges
- [ ] Fortnite-inspired UI theme
- [ ] Progress dashboard

**Success Criteria**: Mario is motivated to use the app regularly

### Phase 7: Subject-Specific Modes (Weeks 15-16)
**Goal**: Specialized support for different subjects

- [ ] Math mode (equation solving)
- [ ] Physics mode (real-world examples)
- [ ] Italian mode (reading support)
- [ ] History mode (timelines, stories)
- [ ] Mode switching UI
- [ ] Subject-specific prompts

**Success Criteria**: App adapts intelligently to different subjects

### Phase 8: Polish & Optimization (Weeks 17-18)
**Goal**: Production-ready experience

- [ ] Performance optimization
- [ ] Offline mode improvements
- [ ] Error handling and recovery
- [ ] User testing with Mario
- [ ] UI/UX refinements
- [ ] Accessibility audit
- [ ] Documentation

**Success Criteria**: App is stable, fast, and delightful to use

---

## 6. TECHNICAL DECISIONS SUMMARY

### ✅ Chosen Technologies

1. **Primary Platform**: Native iOS/iPadOS/macOS apps (Swift/SwiftUI)
   - Reason: Best performance, Apple Intelligence access, native feel

2. **AI Stack**:
   - OpenAI (GPT-4V + Realtime) for voice/vision
   - Claude 3.5 Sonnet for structured tasks
   - Apple Intelligence for local/quick tasks

3. **Storage**: SwiftData + CloudKit
   - Reason: Native, iCloud sync, offline-first

4. **Google Integration**: Official iOS SDKs
   - Reason: Maintained, OAuth2 support, reliable

### ❌ Rejected Options

1. **Microsoft Agent Framework**: Too complex, Python backend
2. **Custom Agent Orchestration**: Not needed, simple routing sufficient
3. **React Native/Flutter**: Worse Apple Intelligence integration
4. **Backend Server**: Unnecessary complexity for single user

---

## 7. KEY DESIGN PRINCIPLES

1. **Voice First**: Every feature accessible by voice
2. **One-Handed**: All primary actions right-thumb accessible
3. **Forgiving**: No destructive actions, easy undo
4. **Patient**: No time limits, no pressure
5. **Clear Context**: Always show "where am I" and "what's next"
6. **Celebrate Wins**: Positive reinforcement everywhere
7. **Offline Grace**: Core features work without internet
8. **Privacy**: Sensitive data processed on-device when possible

---

## 8. SUCCESS METRICS

### Primary Metrics
- Daily usage time (target: 30-60 min/day)
- Homework completion rate (target: >90%)
- User satisfaction (Mario's feedback)
- Stress reduction (qualitative)

### Secondary Metrics
- Voice interaction success rate (>95% understood)
- Mind map generation quality (Mario's rating)
- Material access frequency
- Feature usage distribution

---

## 9. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| API costs too high | High | Implement caching, use Apple Intelligence for simple tasks |
| Voice recognition fails | High | Fallback to OpenAI Whisper, allow text input |
| Material parsing errors | Medium | Manual correction UI, improve over time |
| Gamification feels forced | Medium | User testing, adjustable rewards |
| Google API rate limits | Low | Local caching, batch operations |
| Privacy concerns | Medium | On-device processing when possible, transparent data use |

---

## 10. NEXT STEPS

1. **Create ADR document** for major architectural decisions
2. **Setup Phase 0** development environment
3. **Design mockups** for key screens (with Mario's input)
4. **Implement core navigation** and design system
5. **Prototype voice interaction** to validate OpenAI Realtime
6. **Start Phase 1** (Material Management)

---

## APPENDIX A: Estimated Timeline

- **Phase 0-1**: 4 weeks (Foundation + Materials)
- **Phase 2-3**: 4 weeks (Voice + Vision)
- **Phase 4-5**: 4 weeks (Mind Maps + Tasks)
- **Phase 6-7**: 4 weeks (Gamification + Subject Modes)
- **Phase 8**: 2 weeks (Polish)

**Total**: ~18 weeks (4.5 months)

**Realistic with iterations**: 5-6 months

---

## APPENDIX B: Cost Estimation

### API Costs (Monthly)
- **OpenAI** (GPT-4V + Realtime): $50-150/month (depending on usage)
- **Claude** (API calls): $20-50/month
- **Google APIs**: Free tier likely sufficient
- **Total**: ~$70-200/month

### Development
- Solo developer: 18-24 weeks part-time
- Or: 10-12 weeks full-time

### Infrastructure
- Apple Developer: $99/year
- iCloud storage: Included in family plan
- No backend hosting needed

**Total Year 1**: ~$1,000-2,500
