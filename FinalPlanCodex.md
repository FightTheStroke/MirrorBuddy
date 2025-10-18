# FinalPlanCodex · MirrorBuddy Roadmap to Mario’s Ideal Tutor

> Goal: Transform the current prototype into a voice-first, empathetic learning coach that truly offsets Mario’s working-memory limits, keeps him organised, and nurtures curiosity.

---

## Phase 0 · Baseline Reliability & Hardening (Week 1)
Lock down technical debt and make every existing flow dependable before layering new magic.

### 0.1 Resilience & Concurrency Fixes
- **Rewrite resilience stack as actors**: refactor `ResilientAPICall` / circuit breaker state into actors to eliminate data races highlighted by Gemini & Copilot.
- **Uncomment & fix fallback tests**: restore all `FallbackTests` / concurrency tests, ensure they pass under Swift 6 strict concurrency.
- **Retry policies audit**: confirm exponential backoff, failover to alternative models, and cancellation behaviour work on real network glitches.

### 0.2 Codebase Hygiene
- **Target correction**: drop deployment target to iOS/iPadOS 17 (or current stable) so builds run on real devices.
- **SwiftLint zero warnings**: resolve the ~30 warnings (complexity, whitespace, separators) and enable lint in CI.
- **API key security**: move secrets from plist/environment to `KeychainManager` or `.xcconfig` + keychain loading; document the workflow.
- **Resolve critical TODO/FIXME**: create issues for every TODO; implement or hide UI for incomplete features (study views, search focus, TTS screen reading).

### 0.3 Baseline Testing & Performance
- **Test suite expansion**: add first-wave unit tests for voice view model, UpdateManager, StudyView; restore commented tests.
- **Smoke performance tests**: quick harnesses for Drive sync (100 files), Whisper transcription (1h audio), mind map rendering (50 nodes) to surface bottlenecks.
- **Manual regression**: run scripted QA scenarios (online/offline, backgrounding, low storage) and log issues.

Deliverable: a stable prototype with green tests, zero lint debt, safe key handling, and core resilience proven.

---

## Phase 1 · Cognitive Offloading & Daily Structure (Weeks 2–3)
Build the scaffolding that neutralises working-memory gaps and executive-function overload.

### 1.1 “Today” Companion
- **Today card** on dashboard summarising:
  - 1–3 recommended tasks (deadline + quick voice action buttons).
  - One encouragement or reflection from previous day.
  - Quick progress meter.
- **Aggiornami enhancements**:
  - After sync, auto-populate Today card.
  - Provide spoken summary (“Mario, ho trovato 2 nuovi materiali di matematica. Vuoi ascoltarli o creare una mappa?”).

### 1.2 Context-aware Suggestions
- **Intent engine**: track Mario’s current subject, time available, mood (derived from voice sentiment) to suggest next step.
- **Proactive prompts**: if idle for N minutes, speak “Vuoi ripassare l’esercizio di ieri? Ho preparato 3 flashcard.”
- **Working-memory checkpoints**: during study flows, repeat key information and offer quick recaps on request (“Ricapitolami”).

### 1.3 Simplified Task Management
- **Natural-language capture**: voice command “Ricordami di…” pushes straight into Tasks with subject inference.
- **Quick plan**: end-of-day voice dialog summarizing what’s done and scheduling tomorrow automatically.

Deliverable: Mario can open MirrorBuddy, say “Aggiornami” and receive a voiced plan plus small prompts guiding the next action without scanning lists; parents/teachers can trust that nothing slips through due to the resilience improvements.

---

## Phase 2 · Deep Study Experiences (Weeks 4–6)
Create immersive, multi-sensory sessions tailored to neurodiverse learning styles.

### 2.1 Guided Flashcard Coach
- **Session scripting**: voice steps (warm-up, practice, celebrate).
- **Pace modulation**: adjust explanation depth based on his responses (“Capito” vs “Spiegamelo”). Monitor hesitation/incorrect answers to slow down.
- **Gamified progression**: embed micro-achievements mid-session (spark animations, XP bursts).

### 2.2 Interactive Mind Maps 2.0
- **Touch + Voice exploration**: swipe/zoom + commands like “ingrandisci nodo Forze”.
- **Narrated walkthroughs**: when Mario selects “Spiegami”, MirrorBuddy narrates the branch in simple Italian.
- **Note capture**: voice note per node (“Aggiungi esempio: spingere una porta”) saved in map metadata.

### 2.3 Lesson Memory
- **Ambient recorder UI**: one-tap “Registra lezione”, show live cues, automatic segmentation every 15 min.
- **Whisper pipeline**: chunk upload & transcription, with summary + mind map auto-generated per segment.
- **Review companion**: voice prompts “Ripassiamo il punto difficile della lezione di oggi” with targeted questions.

Deliverable: Mario can attend class with MirrorBuddy, later receive multimodal explanations, and practice through structured, encouraging sessions; extended recordings respect storage limits and whisper throughput thanks to Phase 0 performance groundwork.

---

## Phase 3 · Curiosity & Motivation Loop (Weeks 7–9)
Keep Mario excited and emotionally supported.

### 3.1 Emotion-Aware Coaching
- **Sentiment detection**: analyze voice swings to trigger supportive messages or “break time” suggestions.
- **Persona tuning**: allow selection between playful vs calm coaching styles (Fortnite analogies vs soft guidance).
- **Reflection journal**: after sessions, ask “Cosa ti è piaciuto?”; store short notes, resurface wins to parents/teachers.

### 3.2 Adaptive Challenges
- **Curiosity prompts**: when completing a topic, suggest “Vuoi vedere un video curioso?” with content from safe sources.
- **Weekly quests**: micro goals (“Completa 3 mappe mentali questa settimana”) with badges and celebratory voice messages.
- **Parent/teacher digest**: weekly summary email (or voice note) highlighting achievements, struggles, recommended actions.

### 3.3 Community & Sharing (optional prototype)
- **Shareable mind maps / recaps**: export to PDF/Notion for teacher feedback.
- **Coaching hand-off**: allow parent to record supportive messages MirrorBuddy can replay.

Deliverable: MirrorBuddy nudges Mario toward exploratory learning, celebrates effort, and keeps guardians in the loop, while maintaining privacy via configurable controls.

---

## Phase 4 · Platform Strengthening (Weeks 10–12)
Ensure the foundation scales and meets privacy/production requirements.

### 4.1 Trust, Compliance & Ops
- **Consent & guardianship**: parental dashboards with toggles for recording, sharing, and coach persona.
- **Data governance**: document PII flows, enforce encryption at rest, automated key rotation, privacy dashboard (where data lives).
- **Audit logging & observability**: structured logs for voice commands, plan suggestions, API errors; integrate with privacy-safe analytics for health signals.
- **Offline matrix**: codify exactly what works offline (study summaries, cached maps, recordings) and surface clear UI states.

### 4.2 Productivity Suite Integrations
- **LMS connectors** (Canvas/Google Classroom) for assignments.
- **Notion/Obsidian exports**: for advanced users wanting persistent knowledge bases.
- **Push notifications**: gentle reminders (“Tra 10 minuti facciamo l’esercizio di fisica insieme?”).

### 4.3 Performance, QA & Deployment Readiness
- Automated UI tests simulating voice commands via text/voice injection on devices.
- Accessibility audit (VoiceOver, Dynamic Type, Switch Control, Reduce Motion).
- Stress/performance suites (Drive sync 500 files, whisper 6h recording, mind map 150 nodes).
- Crash/metrics tooling (privacy-safe) to monitor latency, API fallback usage, storage consumption.
- App Store readiness: localisation, App Privacy labels, release engineering pipeline.

Deliverable: system ready for broader family/pilot deployments with privacy controls, integration hooks, exhaustive tests, and deployment playbooks.

---

## Ongoing Practices
- **Weekly research shadowing**: observe Mario (or representative students) using the app; feed findings into backlog.
- **Story/UX reviews with educators**: vet scripts and tone to keep empathy authentic.
- **Telemetry (opt-in)**: capture anonymized feature usage to prioritize improvements without violating privacy.
- **Taskmaster alignment**: ensure tasks reflect real state (no 100% complete when placeholders remain).

---

### High-Level Timeline Overview

| Phase | Focus | Duration |
| --- | --- | --- |
| 0 | Reliability polish | Week 1 |
| 1 | Working-memory scaffolding | Weeks 2–3 |
| 2 | Immersive study experiences | Weeks 4–6 |
| 3 | Curiosity & motivation | Weeks 7–9 |
| 4 | Platform readiness | Weeks 10–12 |

> This schedule assumes one full-time senior Swift developer + part-time AI prompt designer/educator and a UX writer. Adjust as resourcing changes.

---

**Vision reminder:** MirrorBuddy should feel like the patient tutor Mario always needed—available instantly, anticipating the next step, turning small victories into big confidence. This plan evolves the current app into that reality. Let's build it. 💙
- **Technical debt watch**: keep lint/test dashboards green; enforce actor-based patterns for new async code.
- **Security reviews**: quarterly audit of key storage, OAuth scopes, logging.
