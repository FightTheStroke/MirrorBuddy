# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - MirrorBuddy v2.0

> **Branch**: `MirrorBuddy` | **GitHub Issues**: #19-#31, #44 closed

### Added

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
- Updated CLAUDE.md with MirrorBuddy architecture
- Updated E2E tests for new features

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
