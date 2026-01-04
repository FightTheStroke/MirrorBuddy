# MirrorBuddy Features

> Comprehensive guide to all MirrorBuddy features

---

## Built for Every Mind

| Condition | Adaptations |
|-----------|-------------|
| **Dyslexia** | OpenDyslexic font, extra spacing, text-to-speech, visual learning |
| **Dyscalculia** | Step-by-step breakdowns, visual numbers |
| **ADHD** | Reduced distractions, focus mode, breaks, gamification |
| **Autism** | Predictable layouts, sensory-friendly colors |
| **Cerebral Palsy** | Large targets, keyboard nav, voice control |

WCAG 2.1 AA compliant.

---

## Getting Started

**Onboarding:** Welcome → Core Principles → Meet the Maestri → Ready to Learn (appears once, reset in Settings)

---

## Voice Sessions

Talk to your Maestro naturally through voice conversation.

**Features:** Unified voice+chat layout, real-time Azure OpenAI Realtime API, automatic transcription (🔊 indicator), voice-to-voice responses, interrupt anytime, session evaluation with grades/XP, parent diary integration (GDPR), device selection, visual waveform.

**Usage:** Select Maestro → Start Voice Session → Allow mic → Talk naturally → End for evaluation and XP.

**Technical:** GPT-4o Realtime Preview, WebRTC audio, server-side VAD, automatic turn detection, 15min token (renewable).

---

## Mind Maps

**Features:** Auto-generated from conversations, interactive (expand/collapse/zoom/pan), voice commands, multi-format export (PNG/SVG/Markdown/FreeMind/XMind/JSON), import support, MarkMap powered.

**Create:** Ask Maestro "create mind map about [topic]" → interact with nodes → export → save to Materials.

**Voice:** "Aggiungi nodo su X", "Espandi concetto di X", "Collega A a B", "Rimuovi nodo X", "Esporta mappa".

---

## FSRS Flashcards

**Features:** FSRS algorithm (better than Anki's SM-2), optimal review timing, difficulty tracking per card, auto-generated from sessions, progress analytics.

**How FSRS Works:** Initial learning (short intervals) → Memory modeling (learns retention) → Optimal scheduling → Difficulty adjustment (struggles appear more).

**Review:** Flashcards → Due cards → Recall → Reveal → Rate (Again/Hard/Good/Easy) → Algorithm schedules next.

**Analytics:** Total learned, due today, retention rate, study streak.

---

## Quizzes

**Features:** Multiple choice + open-ended, instant feedback with explanations, adaptive difficulty, generated from flashcards/conversations, mastery gates.

**Types:** Multiple Choice (quick checks) | Open-Ended (deep understanding) | True/False (verification) | Fill-in-the-Blank (vocabulary/formulas)

**Process:** Quizzes → Select subject (or auto-choose weak areas) → Answer → Instant feedback → Score + improvements → Earn XP/badges.

---

## Homework Help

**Features:** Photo capture via webcam, countdown timer (0/3/5/10s), AI analysis, step-by-step guidance (no direct answers), works offline.

**Usage:** Homework Help → Capture (webcam) → Position + countdown → Capture → Select Maestro → Receive guidance.

**Philosophy (maieutic method):** Guide you to find answers yourself, not give them directly. Questions help you think.

---

## Gamification

**XP:** Lesson 50 | Quiz 100 | Flashcards 10/card | Voice 200 | Mind map 75 | Daily login 25

**Levels:** 1-10 Beginner (0-5K) | 11-25 Apprentice (5K-25K) | 26-50 Scholar (25K-100K) | 51+ Master (100K+)

**Badges:** First Steps (onboarding) | Conversation Starter (first voice) | Mind Mapper (5 maps) | Quiz Master (10 perfect quizzes) | Streak Legend (30 days) | Subject Expert

**Streaks:** 10min/day study, bonus XP for long streaks, "Streak Freeze" recovery (earned).

**Leaderboards:** Weekly, subject-specific, opt-in only (privacy first).

---

## Pomodoro Timer

**Features:** Configurable intervals (default 25/5/15min), visual countdown, break reminders, XP rewards, header widget.

**Usage:** Click icon → Configure (Work 25, Short break 5, Long break 15, 4 pomodoros until long) → Start → Focus → Break → Earn XP.

**Why:** Effective for ADHD - short bursts prevent overwhelm, regular breaks maintain focus, visual timer provides structure.

---

## Progress Tracking

**Dashboard:** Subject mastery (% per topic), session history, time tracking, weak areas (auto-identified), XP/level.

**Subject Mastery:** Based on lessons completed, quiz scores, flashcard retention, voice engagement.

**Session History:** Maestro, duration, topics, key learnings, XP earned.

**Analytics:** Best study times, preferred Maestri, topic distribution, retention rates.

**Parent Dashboard (GDPR, dual consent):** Session summaries, progress reports, study time, areas needing attention. No conversation content.

---

## The MirrorBuddy Ecosystem

MirrorBuddy is part of a larger vision:

| Project | Description |
|---------|-------------|
| [**convergio-cli**](https://github.com/Roberdan/convergio-cli) | CLI with 50+ specialized AI agents |
| [**MyMirrorBuddy**](https://github.com/Roberdan/MyMirrorBuddy) | Native macOS/iOS app |
| [**MirrorBuddy**](https://github.com/Roberdan/MirrorBuddy) | Core framework |

---

For setup instructions, see [SETUP.md](SETUP.md).
For technical architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).
For the Support Triangle (Maestri, Coaches, Buddies), see main [README.md](README.md).
