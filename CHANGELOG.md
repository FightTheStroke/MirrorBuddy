# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - MirrorBuddy v2.0

> **Branch**: `MirrorBuddy` | **GitHub Issues**: #19-#31, #44 closed

### Added

#### Conversation-First Tool Creation (Issue #23)
- **Fullscreen Tool Layout** (`src/components/conversation/fullscreen-tool-layout.tsx`): 82/18 split with Maestro overlay
- **Maestro Overlay** (`src/components/tools/maestro-overlay.tsx`): Floating Maestro during tool building
- **Intent Detection** with tool type recognition (mindmap, quiz, flashcard)
- Tools created through natural conversation, not forms

#### Voice Commands for Mindmaps (ADR-0011, Issue #44)
- **useMindmapModifications Hook** (`src/lib/hooks/use-mindmap-modifications.ts`): SSE subscription for real-time mindmap modification events
- **InteractiveMarkMapRenderer** (`src/components/tools/interactive-markmap-renderer.tsx`): Extended renderer with imperative modification API
  - `addNode(concept, parentNode?)` - Add new concept as child
  - `expandNode(node, suggestions?)` - Add multiple children
  - `deleteNode(node)` - Remove node and descendants
  - `focusNode(node)` - Center view with highlight animation
  - `setNodeColor(node, color)` - Change node styling
  - `connectNodes(nodeA, nodeB)` - Create conceptual link
  - `undo()` - Revert last modification
- **LiveMindmap** (`src/components/tools/live-mindmap.tsx`): Wrapper combining renderer + SSE for voice-controlled mindmaps
- Fuzzy node matching for voice command targeting
- D3 animations for smooth visual feedback

#### Multi-User Collaboration (Issue #44)
- **Mindmap Room** (`src/lib/collab/mindmap-room.ts`): Real-time room state with CRDT-like versioning
- **Collab WebSocket** (`src/lib/collab/collab-websocket.ts`): WebSocket connection management
- **Room API** (`src/app/api/collab/rooms/`): Create, join, leave rooms
- Participant cursors and presence indicators
- Conflict resolution via version numbers

#### Import/Export Multi-Format (Issue #44)
- **Mindmap Export** (`src/lib/tools/mindmap-export.ts`): PNG, SVG, Markdown, FreeMind (.mm), XMind, JSON
- **Mindmap Import** (`src/lib/tools/mindmap-import.ts`): Auto-detect format, parse Markdown/FreeMind/XMind/JSON
- Download helper for browser blob saving

#### Tool Execution System (ADR-0009)
- **OpenAI Function Calling**: Maestri can create tools via structured function calls
- **Tool Executor** (`src/lib/tools/tool-executor.ts`): Handler registry pattern
- **Tool Handlers**: mindmap, quiz, demo, search, flashcard
- **Tool Panel** (`src/components/tools/tool-panel.tsx`): UI for tool visualization
- **Tool Persistence**: IndexedDB for binaries, Prisma for metadata

#### Showcase Mode
- **Offline Demo** (`src/app/showcase/`): Full app demo without LLM connection
- **Showcase Button**: Added to AI Provider settings for easy access
- Pre-recorded responses for all features demonstration

#### Pomodoro Timer (Issue #45)
- **PomodoroTimer** (`src/components/education/pomodoro-timer.tsx`): ADHD-friendly focus sessions
- Configurable work/break intervals
- Visual and audio notifications
- Integration with unified header

#### Video Conference Layout
- **Voice Session Layout**: Video-conference style with Maestro fullscreen
- **Fullscreen Mindmaps**: Tool takes 100% during creation
- **Picture-in-Picture**: Maestro avatar overlay during tool building

#### Side-by-Side Voice UI
- **Coach/Buddy Voice**: Separate voice layout for Coach and Buddy characters
- Dual panel design for conversation + character display

#### Unified Maestri Voice Experience (PR #43)
- **MaestroSession** (`src/components/maestros/maestro-session.tsx`): 835-line unified component combining voice and chat
  - Side-by-side layout: chat on left (flex-1), voice panel on right (w-64)
  - Seamless voice/chat switching within same session
  - Voice transcripts appear in chat stream with 🔊 indicator
  - Real-time Azure Realtime API integration
- **VoicePanel** (`src/components/voice/voice-panel.tsx`): Shared voice controls component
  - Extracted from CharacterChatView for reuse
  - Avatar with speaking animation
  - Audio visualizer with input levels
  - Mute/unmute and end call controls
  - Supports both hex colors and Tailwind gradients
- **EvaluationCard** (`src/components/chat/evaluation-card.tsx`): Inline session evaluation
  - Auto-generated at session end (5+ messages or 2+ minutes)
  - Score calculation: engagement, questions asked, duration
  - Grade display (Insufficiente → Eccellente)
  - Parent diary integration with GDPR consent
- **Session Metrics**: XP rewards, question counting, duration tracking
- **LazyMaestroSession**: Code-split wrapper for performance

#### Separate Conversations per Character (ADR-0010)
- Each Maestro/Coach/Buddy maintains independent conversation history
- Context preserved across sessions per character
- Clean handoffs between characters

#### Telemetry System (ADR-0006)
- **TelemetryEvent** model in Prisma schema
- Usage analytics for Grafana integration
- Privacy-respecting event tracking

#### Notification Persistence (ADR-0007)
- **Notification** model with scheduling support
- Server-side triggers for level-up, streak, achievements
- API endpoints for CRUD operations

#### Parent Dashboard GDPR (ADR-0008)
- **Dual Consent**: Parent AND student must approve
- **Data Export**: JSON/PDF portability
- **Right to Erasure**: Deletion request tracking
- **Access Logging**: Audit trail for GDPR compliance

#### Materiali Redesign
- **50/50 Responsive Grid**: Better layout for materials view
- Improved visual hierarchy

#### Audio Device Selection
- **setSinkId Integration**: Choose output audio device
- Device picker in voice settings

#### Onboarding Flow
- **Welcome Page** (`src/app/welcome/`): Multi-step onboarding
- **Onboarding Store**: Track completion state
- Redirect to welcome if not completed
- Meet the Maestri carousel

#### Triangle of Support Architecture (ADR-0003)
- **Melissa & Davide (Learning Coaches)**: New AI characters focused on building student autonomy
  - Melissa: Young, energetic female coach (default)
  - Davide: Calm, reassuring male coach (alternative)
  - Focus on teaching study methods, not doing work for students
- **Mario & Maria (Peer Buddies)**: MirrorBuddy system for emotional peer support
  - Mario: Male peer (default), always 1 year older than student
  - Maria: Female peer (alternative)
  - "Mirroring" system: buddy has same learning differences as student
  - Horizontal relationship (peer-to-peer, not teacher-student)
- **Character Router** (`src/lib/ai/character-router.ts`): Intent-based routing to appropriate character
- **Intent Detection** (`src/lib/ai/intent-detection.ts`): Classifies student messages (academic, method, emotional, crisis)
- **Handoff Manager** (`src/lib/ai/handoff-manager.ts`): Manages transitions between characters

#### Safety Guardrails for Child Protection (ADR-0004)
- **Core Safety Prompts** (`src/lib/safety/safety-prompts.ts`): Injected into ALL character system prompts
- **Content Filter** (`src/lib/safety/content-filter.ts`): Input filtering for profanity and inappropriate content
- **Output Sanitizer** (`src/lib/safety/output-sanitizer.ts`): Response sanitization before delivery
- **Jailbreak Detector** (`src/lib/safety/jailbreak-detector.ts`): Pattern matching for prompt injection attempts
- **Adversarial Test Suite** (`src/lib/safety/__tests__/`): Automated safety testing
- Italian-specific crisis keywords detection with helpline referrals (Telefono Azzurro: 19696)

#### Real-time Tool Canvas (ADR-0005)
- **SSE Streaming** (`src/app/api/tools/stream/route.ts`): Server-Sent Events for real-time updates
- **Tool Events Manager** (`src/lib/realtime/tool-events.ts`): Client registry and event broadcasting
- **Tool State Management** (`src/lib/realtime/tool-state.ts`): Track tool creation progress
- 80/20 layout: 80% tool canvas, 20% Maestro picture-in-picture

#### Student Profile System
- **Profile Generator** (`src/lib/profile/profile-generator.ts`): Synthesizes insights from all Maestri
- **Parent Dashboard** (`src/app/parent-dashboard/page.tsx`): View for parents to see student progress
- Insight collection from Maestri conversations
- Growth-focused language (strengths and "areas of growth", not deficits)

#### Storage Architecture (ADR-0001)
- **Provider-agnostic Storage Service**: Abstract interface for file storage
- **Local Storage Provider**: Development mode using `./uploads/`
- **Azure Blob Provider**: Production mode (deferred implementation)
- Support for: homework photos, mind maps, PDFs, voice recordings

#### Voice Improvements
- **Barge-in**: Users can now interrupt the Maestro while speaking for natural conversation flow
- **Enhanced voice personalities**: Cicerone and Erodoto have detailed speaking style, pacing, and emotional instructions

#### Accessibility
- **7 Accessibility Profiles**: Quick-select presets for Dislessia, ADHD, Autismo, Visivo, Uditivo, Motorio, Paralisi Cerebrale
- **Cerebral Palsy profile**: TTS, large text, keyboard nav, extra spacing

#### Other
- **Notification Service Stub**: Placeholder for future notification system (NOT_IMPLEMENTED, see Issue #14)

### Changed
- **Conversation Flow**: Now routes to appropriate character based on intent
- **Settings UI**: Reorganized Audio/Video settings for better UX
- **Theme System**: Fixed theme detection and added value prop to ThemeProvider
- **Maestri Data**: Split `maestri-full.ts` into per-maestro modules for maintainability
- **Logging**: All `console.*` calls replaced with structured `logger` utility
- **Voice Panel**: Improved layout balance and proportions
- **Voice mapping**: 6 maestri updated to gender-appropriate voices
  - Mozart: shimmer → sage (masculine)
  - Erodoto: ballad → echo (authoritative historian)
  - Cicerone: ballad → echo (oratorical)
  - Manzoni: coral → sage (refined)
  - Leonardo: coral → alloy (versatile polymath)
  - Ippocrate: coral → sage (wise physician)
- **VAD sensitivity**: threshold 0.5 → 0.4 (captures softer voices)
- **Turn-taking speed**: silence_duration_ms 500 → 400 (faster response)

### Fixed
- WCAG 2.1 AA accessibility fixes for conversation-flow component
- Motion animations respect `prefers-reduced-motion`
- Aria-labels on buttons and interactive elements
- Aria-live regions for dynamic content
- **Theme switching** (#4): Light theme now correctly overrides OS dark mode preference
- **Accent colors** (#5): CSS custom properties for accent colors now apply correctly in light mode
- **Language buttons** (#6): Selected language state has clear visual feedback
- **AI Provider status** (#7): Fixed Ollama button closing tag for proper semantic HTML
- **E2E Tests**: Fixed 28 failing Playwright tests
- **Voice Session**: Eliminated empty error objects `{}` in logs
- **Button Nesting**: Resolved hydration error in MaestroCard
- **Homework Camera**: Fixed camera capture and inline subject dialog
- **Showcase Navigation**: Added exit navigation back to main app
- CodeQL security alerts resolved (HTML sanitization, voiceInstructions injection)
- Removed unused imports and lint warnings

### Security
- All 17 Maestri now have safety guardrails injected automatically
- Crisis keyword detection with Italian helpline numbers
- Jailbreak/prompt injection detection and blocking
- Privacy protection: AI will not request personal information
- GDPR-compliant data handling for minors

### Removed
- Deprecated `libretto-view.tsx` component
- Fake history data replaced with real sessionHistory

### Documentation
- **ADR 0001**: Materials Storage Strategy
- **ADR 0002**: MarkMap for Mind Maps
- **ADR 0003**: Triangle of Support Architecture
- **ADR 0004**: Safety Guardrails for Child Protection
- **ADR 0005**: Real-time SSE Architecture
- **ADR 0006**: Telemetry System
- **ADR 0007**: Notification Persistence
- **ADR 0008**: Parent Dashboard GDPR Compliance
- **ADR 0009**: Tool Execution Architecture
- **ADR 0010**: Separate Conversations per Character
- **ADR 0011**: Voice Commands for Mindmap Modifications
- Updated CLAUDE.md with MirrorBuddy architecture, Tool Execution, Voice Commands
- Updated E2E tests for new features
- Added voice support documentation for Coach & Buddy

---

## [1.0.0] - 2025-12-28

### Added

#### AI Maestri (17 Tutors)
- **Euclide** - Mathematics tutor inspired by Euclid of Alexandria
- **Leonardo** - Art tutor inspired by Leonardo da Vinci
- **Darwin** - Science tutor inspired by Charles Darwin
- **Curie** - Chemistry tutor inspired by Marie Curie
- **Feynman** - Physics tutor inspired by Richard Feynman
- **Galileo** - Astronomy tutor inspired by Galileo Galilei
- **Lovelace** - Computer Science tutor inspired by Ada Lovelace
- **Shakespeare** - English tutor inspired by William Shakespeare
- **Mozart** - Music tutor inspired by Wolfgang Amadeus Mozart
- **Socrate** - Philosophy tutor using Socratic method
- **Erodoto** - History tutor inspired by Herodotus
- **Manzoni** - Italian tutor inspired by Alessandro Manzoni
- **Cicerone** - Civic Education tutor inspired by Cicero
- **Humboldt** - Geography tutor inspired by Alexander von Humboldt
- **Ippocrate** - Physical Education tutor inspired by Hippocrates
- **Smith** - Economics tutor inspired by Adam Smith
- **Chris** - Storytelling tutor inspired by Chris Anderson (TED)

#### Voice Features
- Real-time voice sessions with Azure OpenAI Realtime API
- Natural voice-to-voice conversations
- Automatic transcription
- Session recordings for review
- Interrupt-and-respond capability

#### Learning Tools
- Mind maps with MarkMap visualization
- FSRS flashcard system (spaced repetition)
- Adaptive quiz system
- Progress tracking per subject
- Session history

#### Gamification
- XP system for all activities
- Level progression
- Achievement badges
- Daily streaks
- Optional leaderboards

#### Accessibility (WCAG 2.1 AA)
- OpenDyslexic font option for dyslexia
- Reduced motion mode for ADHD
- Predictable layouts for autism
- Large touch targets for motor impairments
- Full keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

#### Technical
- Next.js 16 with App Router
- TypeScript 5 strict mode
- Prisma ORM with SQLite/PostgreSQL
- Zustand state management
- Tailwind CSS 4
- Playwright E2E tests

### Configuration
- Azure OpenAI support (full features including voice)
- Ollama support for local development (text only)
- Azure Cost Management integration (optional)

---

## Roadmap

### Completed in MirrorBuddy v2.0
- [x] Parent/teacher dashboard (`/parent-dashboard`)
- [x] Study companion feature (MirrorBuddy: Mario & Maria)

### Future
- [ ] Multi-language support
- [ ] Mobile-optimized UI
- [ ] Offline mode

---

*This project is part of [FightTheStroke](https://fightthestroke.org)'s mission to support children with learning differences.*
