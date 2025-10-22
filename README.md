# MirrorBuddy · The Empathic Learning OS

*An aspirational platform that transforms AI into a neurodiverse-ready co-teacher, study partner, and homework hero.*

---

## Why MirrorBuddy exists

Traditional learning tools were designed for “average” students with full executive function, two free hands, perfect reading fluency, and unlimited patience. That student rarely exists.

MirrorBuddy is a moonshot to build the first **voice-first, multimodal learning operating system** that:

- treats every learner like a whole human, not a checklist of deficits,
- understands context across voice, vision, and documents,
- adapts language, pacing, and encouragement to neurodiverse needs,
- stays with a student through school, homework, and life skills.

Think of it as **a 1:1 support teacher, speech therapist, note taker, and gaming buddy rolled into one persistent AI companion.**

---

## Who we serve (and why the market cares)

We started with Mario, a bright teenager navigating dyslexia, dyscalculia, dysgraphia, and left hemiplegia. Very quickly, the use cases expanded:

| Persona | Pain Point | Why MirrorBuddy matters |
| --- | --- | --- |
| **Neurodiverse learners (K‑12)** | Reading fatigue, working-memory overload, executive function deficits | Natural-language voice guidance, visual mind maps, one-button syncing eliminate context juggling |
| **Inclusive classrooms & resource teachers** | High caseload, limited prep time, inconsistent accommodations | Auto-generated summaries, task digestion, lesson capture, and dashboards scale support without burning out staff |
| **Homeschool cooperatives** | Parents juggling curricula, assessments, and individualized plans | Unified workspace blends Google Drive assets, voice coaching, and progress overviews |
| **University disability centers** | Access services struggle to keep up with demand | Always-on coach provides note expansion, reading support, and conversational check-ins |
| **Adult upskillers & career changers** | Need patient learning companion beyond school | Voice-first coaching and just-in-time summaries make self-study sustainable |

The global assistive education technology sector is accelerating (various analyst reports project double-digit CAGR toward the end of the decade), driven by mandates for inclusive classrooms, rising diagnoses, and post-pandemic comfort with remote support. MirrorBuddy aims to be the **experience layer** stitching together the fractured tooling in that market.

---

## Product promise

MirrorBuddy focuses on five pillars:

1. **Voice-first & interrupt friendly** — Use Siri to start ("Hey Siri, parla con MirrorBuddy"), speak naturally ("Explain this fraction like Fortnite"), interrupt mid-sentence with automatic barge-in, pick up the thread minutes later. Zero-touch conversation flow with server-side Voice Activity Detection.
2. **Multimodal cognition** — Camera, PDFs, emails, mind maps, and voice recordings collapse into a shared context graph.
3. **Emotionally safe coaching** — Tone calibrated for encouragement, neurodiverse pacing, and shame-free retries.
4. **Autopilot organization** — One button ("Aggiornami") corrals Drive files, Gmail assignments, Calendar events, plus auto-summaries.
5. **Trust-by-design** — On-device personalization, CloudKit sync, robust transparency around API usage; no data hoarding.

We are building toward **an "OS layer" that constantly knows what the learner is working on, senses overwhelm, and offers the next best action through voice or visuals.**

### Key Features (v0.9.0)

#### Voice-First Conversation (NEW)
- **Siri Integration**: Start with "Hey Siri, parla con MirrorBuddy" - no touch needed
- **Always-On Listening**: Server-side Voice Activity Detection for natural conversation flow
- **Automatic Barge-In**: Interrupt AI mid-sentence, response cancels instantly
- **Multi-Sensory Feedback**: Haptic patterns, audio cues, and calming breathing animations
- **8 Conversation States**: Clear visual/tactile/audio feedback (passive → listening → thinking → speaking)
- **OpenAI Realtime API**: Low-latency bidirectional audio streaming (300-500ms)
- **Context-Aware**: Automatically loads subject/material context from your study session
- **Subject-Specific Shortcuts**: "Hey Siri, aiutami con la matematica" opens in math mode
- **Offline Fallback**: Automatic switch to Apple Speech when network unavailable

#### Voice Commands (Legacy)
- **SmartVoiceButton**: Quick commands for navigation and control
- **Command Recognition**: Automatic distinction between commands ("vai alla home") and conversations
- **Natural Language**: Speak naturally in Italian with context-aware responses
- **Hands-free Navigation**: Voice commands for all major app functions

#### Dashboard & Today Card
- **Daily Overview**: Study metrics, streak tracking, and goal progress at a glance
- **Study Streak**: Visual indicators and encouragement for consistent learning
- **Upcoming Sessions**: Quick view of scheduled study activities
- **Subject Organization**: Materials organized by school subject
- **Quick Actions**: One-tap access to common tasks

#### Material Processing
- **Auto-Processing**: Automatic keyword extraction and metadata generation on import
- **Smart Classification**: Bloom's taxonomy level assignment (Remember, Understand, Apply, Analyze, Evaluate, Create)
- **Concurrent Pipeline**: Fast, parallel processing of multiple materials
- **Keyword Extraction**: AI-powered topic and concept identification
- **Metadata Enrichment**: Automatic difficulty, topic, and subject tagging

#### Accessibility & Inclusive Design
- **OpenDyslexic Font**: Dyslexia-friendly typography as default
- **Large Touch Targets**: 48px+ minimum size for child-friendly interaction
- **High Contrast**: WCAG AA/AAA compliant color system
- **VoiceOver Support**: Full screen reader compatibility
- **Dynamic Type**: Respects system text size preferences
- **One-Handed Mode**: Optimized for single-hand use

#### Data & Sync
- **CloudKit Integration**: Seamless sync across devices
- **Google Workspace**: Drive, Gmail, and Calendar integration
- **SwiftData Models**: Local-first with cloud backup
- **Background Sync**: Automatic updates without user intervention
- **Offline Support**: Core features work without internet

---

## Current build snapshot (October 19, 2025)

The repository already includes a functional SwiftUI app with the following maturity levels:

| Capability | Status | Notes |
| --- | --- | --- |
| **Voice-First Conversation** | Production | Siri-activated real-time conversation with VAD, barge-in, multi-sensory feedback. OpenAI Realtime API with 300-500ms latency. 8-state system with haptic/audio/visual cues. Always-on listening mode. |
| **Voice Commands** | Beta | SmartVoiceButton with intent detection, automatic command vs conversation routing. Quick navigation commands. |
| **Dashboard & Analytics** | Beta | Today Card with study metrics, streak tracking, daily goals, upcoming sessions. Material organization by subject. |
| **One-Button Sync** | Alpha | `UpdateManager` orchestrates Google Drive, Gmail, Calendar ingestion with background tasks and CloudKit sync. |
| **Material Processing** | Beta | Auto-keyword extraction, metadata generation, Bloom's taxonomy classification, concurrent processing pipeline. |
| **Document pipeline** | Alpha | VisionKit scanner, OCR service, dyslexia-friendly text rendering, mind map generation seeds. |
| **Accessibility shell** | Beta | OpenDyslexic defaults, 48px+ touch targets, safe area positioning, context banner, VoiceOver support, Dynamic Type. |
| **Test Coverage** | Alpha | ~40% coverage with unit tests for core services, UpdateManager, voice conversation, and study views. |
| **Data layer** | Beta | SwiftData models for materials, mind maps, flashcards, voice transcripts, CloudKit sync container. |

### Build Status

- **Build**: ✅ Passing (0 errors, 56 warnings)
- **Tests**: ✅ Compiling successfully
- **Swift**: 6.0 with concurrency support
- **iOS**: 17.0+ deployment target
- **macOS**: 26.0+ "Tahoe" native app ✨ NEW!
- **SwiftLint**: ✅ 0 violations (100% clean - 950 → 0)
- **Test Coverage**: ~40% (target: 60%)

See `Docs/PROJECT_STATUS.md`, `Docs/TMQAReport.md`, and `.taskmaster/tasks/tasks.json` for detailed status and QA findings.

---

## 🍎 macOS Native App (NEW!)

MirrorBuddy is now available as a **native macOS 26 "Tahoe" application** with stunning Liquid Glass UI and full Apple Intelligence integration!

### Platform: macOS 26.0+ "Tahoe" (Apple Silicon only)

**What's Special**:
- ✨ **Liquid Glass Design** - Beautiful translucent UI that reduces visual clutter
- 🤖 **Apple Intelligence** - Writing Tools (Cmd+Shift+W), Siri 2.0, AI-powered Spotlight
- ⌨️ **One-Handed Optimized** - All keyboard shortcuts work with right hand only (critical for Mario)
- 🪟 **Native macOS** - Full menu bar, window management, trackpad gestures
- 🔄 **Perfect Sync** - CloudKit keeps iOS and macOS in perfect harmony
- ♿️ **Accessibility First** - Same OpenDyslexic fonts, VoiceOver support, WCAG AAA compliance

### Key macOS Features

#### Liquid Glass UI (macOS 26)
- Translucent sidebar that blurs desktop background
- Floating toolbar with glass materials
- Subject-colored tinted glass for context
- Respects system "Reduce Transparency" setting

#### Apple Intelligence Integration
- **Writing Tools** (Cmd+Shift+W) - Helps Mario with dysgraphia
  - Rewrite, Proofread, Summarize, Key Points
  - Works in all text fields
- **Siri 2.0** - Natural language commands
  - "Hey Siri, add this PDF to math materials"
  - "Hey Siri, explain fractions like Fortnite"
- **AI Spotlight** - Search materials by concept
  - "materials about fractions with visual examples"
  - Quick actions: "Summarize physics chapter 2"

#### Keyboard Shortcuts (Right-Hand Friendly)
| Shortcut | Action |
|----------|--------|
| **Cmd+1-4** | Navigate sections (Materials/Study/Tasks/Voice) |
| **Cmd+Shift+V** | Voice Conversation (PRIMARY) |
| **Cmd+Shift+W** | Writing Tools AI |
| **Cmd+Shift+T** | Always on Top (for study sessions) |
| **Cmd+/** | Show All Shortcuts |

#### Window Management
- Default 1200×800 (perfect for split screen)
- Position/size persistence across launches
- Always on Top mode (Cmd+Shift+T)
- Resizable 900px → 2000px+

### Getting Started (macOS)

**Prerequisites**:
- Mac with Apple Silicon (M1/M2/M3/M4)
- macOS 15.0+ (ideally macOS 26 Tahoe for Liquid Glass)
- Xcode 16.0+ (for macOS 26 SDK)
- Apple Developer Account

**Setup Guide**: See comprehensive walkthrough in [`Docs/MACOS_SETUP_GUIDE.md`](Docs/MACOS_SETUP_GUIDE.md)

**Quick Start**:
1. Open `MirrorBuddy.xcodeproj` in Xcode 16+
2. Create macOS target (File → New → Target → macOS → App)
3. Add files from `MirrorBuddy/macOS/` to target
4. Add shared code (Core/, Features/) to both iOS and macOS targets
5. Build and Run! (Cmd+R)

**Architecture**: 95% code shared with iOS, 5% macOS-specific (window management, menu bar, glass effects)

**Documentation**:
- [macOS Native PRD](.taskmaster/docs/macos-native-prd.md) - Complete product requirements (1,019 lines)
- [macOS Setup Guide](Docs/MACOS_SETUP_GUIDE.md) - Step-by-step Xcode configuration (498 lines)

---

## Near-term roadmap

1. **Voice Autonomy**
   - Apple Speech offline fallback & seamless network handover
   - Context-aware command parsing (“Show me the math map for today”)
   - Tone modulation based on frustration signals
2. **Mind Map 2.0**
   - Mobile-first zoomable flow
   - Voice navigation through nodes (“Jump to the physics example”)
   - Export bridges into classroom tools (Google Classroom, Notability)
3. **Lesson Memory**
   - 6-hour ambient recording with Whisper chunking
   - Automatic timeline + mind map synthesis
   - “Replay the part where the teacher explained parabolas”
4. **Progress Intelligence**
   - Working-memory aware planner
   - Micro achievements (“Two focused sprints today!”)
   - Parent/teacher digest with encouraging framing

The public roadmap lives in `Docs/ExecutionPlan.md` and is mirrored into `.taskmaster`.

---

## Market & ecosystem signals

- **Inclusive education mandates** (US IDEA, EU accessibility directives) are pushing schools to adopt tech that works for diverse cognitive profiles. Districts now budget specifically for AI-assisted accommodations.
- **Assistive EdTech spend** is accelerating as neurodiversity diagnoses rise (ADHD, dyslexia, autism spectrum). Tools that couple academic support with emotional scaffolding are in demand for both K‑12 and higher education.
- **Parents and homeschool networks** are increasingly tech-forward, searching for AI copilots that can collaborate with their family’s Google Drive/Calendar stack and reduce planning overhead.
- **Wellness & mental health** cross over: many learners want an empathetic voice that celebrates progress and regulates pace to reduce anxiety.

MirrorBuddy aspires to be the connective tissue in this ecosystem—an extensible client orchestrating best-in-class AI providers, campus systems, and human caregivers.

---

## Use case vignettes (future-facing)

- **Night-before-exam triage**: Mario snaps a photo of a physics worksheet. MirrorBuddy extracts the diagram, explains it with Fortnite analogies, and generates a voice-guided walkthrough he can replay on the bus.
- **Inclusive classroom station**: A resource teacher runs MirrorBuddy on an iPad at the support desk. Students drop off PDFs or voice questions; the system prepares simplified mind maps and suggests conversation starters.
- **Parent review loop**: After homework, MirrorBuddy summarizes what Mario tackled, highlights sticking points with recommended games or videos, and nudges his parent (“Celebrate the geometry win!”).
- **Workplace upskilling**: An adult learner feeds onboarding manuals into MirrorBuddy, which turns them into bite-sized flashcards, mock Q&A sessions, and daily voice check-ins.

---

## Product architecture (high level)

```
┌────────────────────────────────────────────────────────────┐
│                      MirrorBuddy Client                     │
│                                                            │
│  SwiftUI experience · Voice-first shell · Dyslexia design  │
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Voice Layer  │←→│ Context Stack │←→│ Assistive Views │  │
│  └──────────────┘   └──────────────┘   └────────────────┘  │
│         │                    │                    │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
┌─────────▼───────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│ OpenAI Realtime │  │ CloudKit + Swift │  │ Google Workspace │
│ GPT-5 / Whisper │  │ Data graph       │  │ Drive · Gmail    │
└─────────┬───────┘  └─────────┬────────┘  └────────┬────────┘
          │                    │                    │
      (Future) Anthropic · Apple Intelligence · LMS APIs
```

Key components (see `/MirrorBuddy/Core`):
- `OpenAIRealtimeClient` — websocket streaming with audio & text delta handling
- `AudioPipelineManager` — microphone capture, playback queue, diagnostics
- `VoiceConversationService` — SwiftData persistence for transcripts
- `UpdateManager` — sync orchestration across Drive/Gmail/Calendar
- `ContextBannerView` + `VoiceCommandRegistry` — scaffolding for working-memory support and hands-free navigation

---

## Getting started (developer preview)

> **Prerequisites**
> - **macOS 14.0+** (Development requires macOS 15 + Xcode 16 beta or newer with Swift 6 concurrency support)
> - **iOS/iPadOS 17.0+** (minimum deployment target)
> - Apple Developer account with CloudKit entitlements
>
> - Google Cloud project (Drive, Gmail, Calendar APIs enabled & OAuth consent)
> - OpenAI API key (Realtime + Chat), optional Anthropic key
> - Update `com.mirrorbuddy.MirrorBuddy` bundle ID if you do not control this domain
>
> **Verified Devices:**
> - iPhone 15 Pro, iPhone 14, iPad 13
> - iOS Simulator (iOS 17.0+)
> - Deployment targets: iOS 17.0, macOS 14.0

```bash
git clone https://github.com/your-org/MirrorBuddy.git
cd MirrorBuddy

# Copy credential template
cp MirrorBuddy/Resources/APIKeys-Info.plist.example \
   MirrorBuddy/Resources/APIKeys-Info.plist

# Fill in API keys, OAuth identifiers, and set permitted URL schemes.
```

1. Enable CloudKit in the Xcode target (`Signing & Capabilities → + Capability → iCloud`).
2. Register background tasks used by `UpdateManager` (`BGTaskSchedulerPermittedIdentifiers` already listed in `Info.plist`; ensure your bundle ID matches).
3. Create an OAuth client, download `GoogleService-Info.plist`, and follow `Docs/GOOGLE_SETUP_COMPLETE.md`.
4. Open `MirrorBuddy.xcodeproj`, select a device, run (`⌘R`). On first launch:
   - Grant microphone, camera, photo library permissions.
   - Sign into Google via Settings → Integrations → “Connect Drive”.
   - Tap **Aggiornami** to trigger the multi-service sync prototype.

See `Docs/GOOGLE_API_SETUP.md`, `Docs/CLOUDKIT_SETUP.md`, and `Docs/ExecutionPlan.md` for deep dives.

---

## Contribution philosophy

MirrorBuddy is early, ambitious, and opinionated. Contributions we value most:

1. **Neurodiversity-first UI** — richer voice command flows, low-cognitive-load layouts, courageously simple copy.
2. **Explainable AI** — translation layers that help students understand *why* an answer is correct.
3. **Safeguards & trust** — audit trails, parent/teacher controls, privacy guardrails.
4. **Context expansion** — connectors to additional ecosystems (Canvas, Notion, Microsoft 365) while honoring privacy.

Please review `Docs/AGENT_DRIVEN_DEVELOPMENT.md` for the tasking model and submit PRs with accessibility considerations documented. New contributors should also read `AGENTS.md` for repository guidelines, tooling expectations, and security practices.

### Quality Assurance and Release Process

Before submitting significant changes or preparing for a release:

1. **Run the QA Checklist**: Execute manual tests from `Docs/QA_CHECKLIST.md` covering:
   - Online/offline resilience
   - Voice command functionality
   - Accessibility compliance (VoiceOver, Dynamic Type, touch targets)
   - Performance under stress
   - Data integrity across devices

2. **SwiftLint Compliance**: Ensure `swiftlint lint` shows ≤400 violations (current baseline). Pre-commit hooks enforce this automatically.

3. **Build Verification**: Confirm build succeeds on both iOS Simulator and physical devices (iPhone 14+, iPad 13).

4. **Regression Testing**: Verify all critical regression tests from the QA checklist pass (Section 10).

**Release Criteria**: All "Critical" items in the QA checklist must pass before tagging a release.

---

## License & acknowledgements

- Licensed under the Business Source License – see [LICENSE](LICENSE).
- Built on top of SwiftUI, SwiftData, CloudKit, Apple Vision/VisionKit, OpenAI’s Realtime/Chat/Whisper APIs, and the OpenDyslexic type family.
- Special thanks to educators, therapists, parents, and learners who have shared the daily frictions we are working to dissolve.

**MirrorBuddy**
*Because every learner deserves an always-on teammate who listens, adapts, and celebrates the journey.*

**Last updated:** October 19, 2025
**Version:** 0.9.0 (Beta)
