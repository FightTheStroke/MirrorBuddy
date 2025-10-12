# MirrorBuddy - Discussion Points
**Date**: 2025-10-12
**Purpose**: Key questions to align on before starting development

---

## 🎯 Strategic Questions

### 1. Primary Device & Starting Point
**Question**: Which device should we optimize for first?

**Options**:
- **A. iPad** (Best for study desk, Apple Pencil support, larger screen)
- **B. iPhone** (Most portable, always with Mario)
- **C. Mac** (Research and long reading sessions)

**Consideration**: We'll support all three eventually, but starting with one helps us focus.

**Suggested**: Start with **iPad** (most suited for homework and studying)

---

### 2. Subject Priorities
**Question**: Which subjects are most urgent/challenging for Mario?

**Rank by priority** (1 = most urgent):
- [ ] Mathematics (equations, problem solving)
- [ ] Italian (reading comprehension, writing)
- [ ] Physics (concepts, real-world examples)
- [ ] History (memorization, timelines)
- [ ] English/Foreign Languages
- [ ] Science (other subjects)

**Why it matters**: Subject-specific modes in Phase 7 should be prioritized based on Mario's needs.

**Suggested approach**: Build generic features first (Phases 1-6), but keep priority subjects in mind for examples and testing.

---

### 3. Voice Personality & Tone
**Question**: What personality should the AI coach have?

**Options**:
- **A. Friendly Peer** ("I struggled with this too, let's figure it out together")
- **B. Patient Tutor** ("Take your time, you're doing great")
- **C. Enthusiastic Coach** ("Nice work! Let's keep going!")
- **D. Playful Companion** ("This is like a puzzle—let's solve it!")
- **E. Mix** (adapts based on context)

**Consideration**: Voice personality is crucial for engagement and stress reduction.

**Suggested**: **Mix with emphasis on Friendly Peer** - makes Mario feel understood, not patronized

**Test prompts**:
```
System: You're Mario's study buddy. He has dyslexia and limited working memory,
but he's smart and capable. Talk like a friend who's a year ahead in school—
encouraging, patient, never condescending. Make learning fun without being childish.

Example tone:
❌ "Let's solve this equation! First, we need to understand what X represents..."
✅ "Okay, so this equation is basically asking 'what number makes this true?'
    Let's break it down step by step, no rush."
```

---

### 4. Gamification Style
**Question**: How "gamified" should the experience be?

**Spectrum**:
1. **Subtle** (simple progress bars, occasional badges)
2. **Moderate** (XP, levels, achievements, but integrated into clean UI)
3. **Fortnite-Inspired** (battle pass, seasons, flashy animations, emotes)

**Consideration**: Mario loves Fortnite, but too much gamification can be distracting.

**Suggested**: **Moderate with Fortnite accents**
- Use Fortnite-style visual language (cards, progress bars, level-up animations)
- Include some Fortnite references (Victory Royale for completing hard tasks)
- But keep it clean and not distracting from learning
- Make rewards optional to view (don't interrupt flow)

---

### 5. Privacy & Data Boundaries
**Question**: What data is Mario comfortable sending to AI services?

**Scenarios to consider**:
- **Study materials**: PDFs/images from teachers → OK to send to AI?
- **Voice conversations**: Recorded temporarily for AI processing → OK?
- **Homework content**: Math problems, essays → OK to send to AI?
- **Personal calendar**: Assignment due dates → OK to sync?
- **Email content**: Teacher emails → OK to parse?
- **Progress data**: XP, time spent studying → OK to store in iCloud?

**Suggested approach**:
- ✅ Use Apple Intelligence (on-device) for privacy-sensitive content when possible
- ✅ Clear transparency: show what's being sent where
- ✅ Option to use "Private Mode" (only on-device AI, limited features)
- ✅ No data sold or used for training (use OpenAI/Claude with data retention policies)
- ✅ Parent dashboard to review what's being shared

---

### 6. Parent Involvement
**Question**: Should Roberto have a dashboard or progress view?

**Options**:
- **A. No parent view** (Mario's private space, builds independence)
- **B. Weekly summary email** (high-level progress, no details)
- **C. Parent dashboard** (see time spent, subjects studied, achievements)
- **D. Collaborative mode** (Roberto can leave notes, encouragement)

**Consideration**: Balance Mario's independence with parental awareness.

**Suggested**: **B + optional C** (weekly email by default, dashboard if Roberto wants to check in)

---

### 7. Internet Dependency
**Question**: How should the app behave without internet?

**Scenarios**:
- Mario is on a train/car studying
- School WiFi is down
- Traveling without data

**Proposed offline capabilities**:
- ✅ View cached materials (PDFs, notes)
- ✅ Explore saved mind maps
- ✅ Basic text-to-speech (Apple TTS)
- ✅ Simple Q&A with Apple Intelligence
- ✅ View tasks and calendar (cached)
- ❌ Advanced AI features (mind map generation, complex problem solving)
- ❌ Sync new materials from Google Drive
- ❌ Real-time voice conversation (OpenAI Realtime)

**Suggested**: Clear offline indicator, graceful degradation, queue requests for when online

---

### 8. Notification Strategy
**Question**: How should the app notify Mario about tasks and deadlines?

**Considerations**:
- Mario has limited working memory (needs reminders)
- But anxiety-inducing notifications can be counterproductive

**Suggested strategy**:
- ✅ **No surprise deadlines**: Show upcoming tasks days in advance
- ✅ **Gentle reminders**: "Want to work on your history assignment?" vs "History homework due tomorrow!"
- ✅ **Time-based prompts**: Suggest study times based on Mario's patterns
- ✅ **Celebration notifications**: "You completed 3 tasks today! 🎉"
- ❌ **No pressure**: Never "You're behind!" or "Only 2 hours left!"

**Notification types**:
- Morning: "Here's what's on your plate today" (opt-in)
- During study time: Only if Mario asks ("Should I switch topics?")
- Evening: "Great work today!" (if he studied)
- Never: Late-night deadline panic notifications

---

### 9. Material Organization
**Question**: How should Google Drive materials be categorized?

**Options**:
- **A. Auto-detect by folder name** (e.g., folder "Matematica" → Math subject)
- **B. Manual categorization** (Mario assigns each material to a subject)
- **C. AI categorization** (analyze filename/content to guess subject)
- **D. Hybrid** (AI suggests, Mario approves)

**Suggested**: **D (Hybrid)** - AI categorizes, Mario can correct easily

**Implementation**:
```
New file detected: "Verifica_Geometria_Cap5.pdf"
AI suggestion: Mathematics > Geometry
UI: [Math] [Geometry] [Change]
```

---

### 10. Hand-off Between Devices
**Question**: How should studying flow across devices?

**Scenarios**:
- Start homework on iPad (study desk)
- Continue on iPhone (school bus)
- Finish on Mac (research mode)

**Proposed behavior**:
- ✅ CloudKit syncs progress instantly
- ✅ "Continue where you left off" card on each device
- ✅ Conversation history accessible everywhere
- ✅ Mind maps sync and adjust to screen size
- ✅ "Currently studying on iPad" indicator (prevent conflicts)

**Suggested**: Seamless continuity, inspired by Apple's Handoff feature

---

## 🔥 Critical Decisions Needed Before Starting

### Must Decide Now (Phase 0):
1. ✅ **Primary device** (iPad recommended)
2. ✅ **Voice personality** (Friendly peer recommended)
3. ❓ **Google Drive folder structure** (need to see Mario's current setup)

### Can Decide During Development:
4. Subject priorities (can adjust as we build)
5. Gamification intensity (easy to tune)
6. Parent dashboard features (can add later)
7. Notification strategy (start conservative, iterate)

### Can Decide Later (Phase 6+):
8. Material organization details
9. Multi-device handoff polish
10. Advanced privacy controls

---

## 📋 Action Items

### For Roberto:
- [ ] Review planning documents (PLANNING.md, EXECUTIVE_SUMMARY.md, ADR-001)
- [ ] Answer critical questions above (especially device priority, voice personality)
- [ ] Share Mario's Google Drive folder structure (screenshot or description)
- [ ] Discuss with Mario: What makes learning fun? What stresses him out?
- [ ] Approve/modify technology choices (OpenAI + Claude + Apple Intelligence)

### For Developer (Next Steps):
- [ ] Get API keys (OpenAI, Anthropic, Google Cloud)
- [ ] Setup Xcode project structure (SwiftData, CloudKit)
- [ ] Create basic design system (colors, fonts, components)
- [ ] Prototype OpenAI Realtime voice interaction
- [ ] Test GPT-4V with sample textbook image
- [ ] Test Claude mind map generation with sample text

---

## 💬 How to Provide Feedback

**Option 1**: Add comments directly to this file
```markdown
### 1. Primary Device
**Roberto's answer**: iPad, but iPhone is also important because he always has it.
**Additional context**: iPad for homework desk, iPhone for quick questions during school.
```

**Option 2**: Create a new file `Docs/FEEDBACK.md`

**Option 3**: Discuss in person and update documents together

---

## 🎯 Next Meeting Agenda

1. Review architecture and tech stack (ADR-001)
2. Answer critical questions (device, personality, privacy)
3. Show Mario mockups/demos (voice interaction, mind map examples)
4. Get Mario's input: What would make this exciting to use?
5. Prioritize subjects for initial development
6. Approve Phase 0 start

---

**Last Updated**: 2025-10-12
