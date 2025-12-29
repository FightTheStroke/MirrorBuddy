# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Barge-in**: Users can now interrupt the Maestro while speaking for natural conversation flow
- **Enhanced voice personalities**: Cicerone and Erodoto have detailed speaking style, pacing, and emotional instructions

### Changed
- **Voice mapping**: 6 maestri updated to gender-appropriate voices
  - Mozart: shimmer → sage (masculine)
  - Erodoto: ballad → echo (authoritative historian)
  - Cicerone: ballad → echo (oratorical)
  - Manzoni: coral → sage (refined)
  - Leonardo: coral → alloy (versatile polymath)
  - Ippocrate: coral → sage (wise physician)
- **VAD sensitivity**: threshold 0.5 → 0.4 (captures softer voices)
- **Turn-taking speed**: silence_duration_ms 500 → 400 (faster response)

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

### [1.0.0] - Planned
- [ ] Parent/teacher dashboard
- [ ] Multi-language support
- [ ] Study companion feature (from MirrorBuddy integration)
- [ ] Mobile-optimized UI
- [ ] Offline mode

---

*This project is part of [FightTheStroke](https://fightthestroke.org)'s mission to support children with learning differences.*
