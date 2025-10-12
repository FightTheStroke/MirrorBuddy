# MirrorBuddy - Execution Plan & Backlog

**Project Start Date**: 2025-10-12 11:38:53

---

## 📋 Initial Request

**Date**: 2025-10-12 11:38:53
**Type**: RICHIESTA

**Request**:
Voglio fare una applicazione mac/iphone/ipad che aiuti mio figlio Mario nello studiare e nel fare i compiti. Importante da sapere che Mario ha dislessia, discalculia, disgrafia e soprattutto, dato che ha avuto un ictus alla nascita, ha una emiplegia lato sinistro (per cui ha difficoltà nel muovere la mano sinistra) e ha pochissima memoria di lavoro nel suo cervello.

Gli insegnanti gli mettono i materiali su un Google Drive a cui ha accesso, alcune volte gli fanno delle mappe mentali, ma sono complicate per lui da capire e da memorizzare. L'applicazione deve aiutarlo nello studiare e nel fare i compiti. Lui si trova molto bene nel parlare con ChatGPT a voce e/o facendogli vedere, tramite la webcam i libri. ChatGPT lo aiuta anche nel fare le mappe mentali.

Io voglio che questa applicazione copra tutte le sue esigenze: dal vedere gli ultimi file caricati dai professori per le varie materie, a trasformarli in mappe mentali adattate per lui, all'aiutarlo in maniera multimodale (webcam, voce) a fare i compiti e a studiare, come se fosse un coach adattato a lui, o un compagno con le sue stesse difficoltà ma che è un pò piu avanti per cui lo capisce e lo può aiutare dandogli fiducia, con pazienza e senza stressarlo, ma anzi rendendo ogni arogmento divertente ed ingaggiante e simpatico, come se fosse un gioco. A Mario piace molto Fortnite per cui un meccanismo di rewarding simile ai livelli può funzionare, così come altre tecniche di gamification.

L'applicazione deve anche poter accedere al calendario su google calendar, e alle mail su gmail per aiutarlo a stare al passo con le attività ed i compiti. In pratica questa app deve essere un vero e proprio docente di sostegno dedicato a mario. Deve essere multimodale e adattata a qualsiasi materia, per esempio per matematica sulla versione per ipad deve aiutarlo a risolvere equazioni scritte con l'ipad a penna, per fisica deve fargli esempi concreti della vita quotidiana, per italiano deve aiutarlo a leggere testi, riassumerli, farglieli capire e aiutare a ricordare. Tieni conto che per lui è tutto difficile, dal leggere allo scrivere al ricordare, al capire.

Come tecnologie vorrei poter sfruttare appieno le funzionalità di Apple Intelligence in locale (siamo al 12 ottobre 2025) e sfruttare gli ultimi sistemi agentici di OpenAI (GPT Realtime, Agent Platform) oppure Anthropic (Claude Agent SDK) o Microsoft Agentic Platform. Per ora mi basta che funzioni per lui, non mi serve scalabilità, sicurezza o altro per cui teniamo l'architettura piu semplice possibile.

**Status**: ✅ Planning completed

**Deliverables**:
- [x] Technology analysis
- [x] Architecture design (ADR-001)
- [x] Complete planning document (PLANNING.md)
- [x] Executive summary (EXECUTIVE_SUMMARY.md)
- [x] Discussion points for alignment (DISCUSSION_POINTS.md)
- [x] Next steps guide (NEXT_STEPS.md)
- [x] Project README.md

---

## 🎯 Backlog (To Do)

### Immediate Actions (Before Development)
- [ ] **Roberto**: Review all planning documents
- [ ] **Roberto**: Answer critical questions in DISCUSSION_POINTS.md
- [ ] **Roberto + Mario**: Discuss app concept, get Mario's input on features
- [ ] **Roberto**: Share Google Drive folder structure
- [ ] **Roberto**: Setup API accounts (OpenAI, Anthropic, Google Cloud)
- [ ] **Roberto**: Configure API keys in project
- [ ] **Roberto**: Approve architecture and technology choices

### Phase 0: Foundation (Weeks 1-2)
- [ ] Create SwiftData models (Material, MindMap, Task, UserProgress)
- [ ] Setup CloudKit container and sync
- [ ] Define design system (colors, typography, components)
- [ ] Create basic TabView navigation
- [ ] Implement API clients (OpenAI, Claude, Google)
- [ ] Prototype voice interaction (OpenAI Realtime)
- [ ] Prototype vision capabilities (GPT-4V)
- [ ] Prototype mind map generation (Claude)
- [ ] Test Google Drive integration
- [ ] Validation: All prototypes working, within budget

### Phase 1: Material Management (Weeks 3-4)
- [ ] Google Drive integration (monitor folders, download materials)
- [ ] Material list view with subjects
- [ ] Material detail view (PDF viewer)
- [ ] Text-to-Speech for materials (AVSpeechSynthesizer)
- [ ] Basic search and filter
- [ ] Local material cache
- [ ] **Validation with Mario**: Can he browse and listen to materials?

### Phase 2: Voice Coach - Basic (Weeks 5-6)
- [ ] OpenAI Realtime API full integration
- [ ] Voice recording/playback UI
- [ ] Conversation flow and state management
- [ ] Interruption handling
- [ ] Coach personality system prompts
- [ ] Conversation history storage
- [ ] **Validation with Mario**: Can he have natural conversations about homework?

### Phase 3: Vision Capabilities (Weeks 7-8)
- [ ] Camera integration (AVFoundation)
- [ ] GPT-4V image analysis integration
- [ ] Handwriting recognition (Apple Pencil + VisionKit)
- [ ] Screen capture and sharing
- [ ] Image annotation tools
- [ ] Combined vision + voice mode
- [ ] **Validation with Mario**: Can he show textbook pages and get help?

### Phase 4: Mind Maps (Weeks 9-10)
- [ ] Claude API for mind map generation
- [ ] Mind map data model and JSON structure
- [ ] Mind map visualization component (SwiftUI)
- [ ] Interactive navigation (zoom, pan, gestures)
- [ ] Save and organize maps by subject
- [ ] Voice-driven map exploration
- [ ] Mind map templates for different subjects
- [ ] **Validation with Mario**: Does he find maps helpful?

### Phase 5: Task Management (Weeks 11-12)
- [ ] Google Calendar integration
- [ ] Gmail integration (OAuth2)
- [ ] Assignment parser (email content → tasks)
- [ ] Task list view with priorities
- [ ] Smart notifications system
- [ ] "What's next?" recommendation feature
- [ ] Task completion tracking
- [ ] **Validation with Mario**: Does he stay organized better?

### Phase 6: Gamification (Weeks 13-14)
- [ ] XP system implementation
- [ ] Level progression logic
- [ ] Achievement system (badges, milestones)
- [ ] Visual rewards and unlockables
- [ ] Fortnite-inspired UI theme
- [ ] Progress dashboard
- [ ] Celebration animations
- [ ] **Validation with Mario**: Does it motivate him?

### Phase 7: Subject-Specific Modes (Weeks 15-16)
- [ ] Math mode (equation solving, step-by-step)
- [ ] Physics mode (real-world examples, simulations)
- [ ] Italian mode (reading support, summarization)
- [ ] History mode (timelines, storytelling)
- [ ] Mode switching UI
- [ ] Subject-specific prompts and tools
- [ ] **Validation with Mario**: Does each mode help for that subject?

### Phase 8: Polish & Optimization (Weeks 17-18)
- [ ] Performance optimization (app launch, navigation)
- [ ] Offline mode improvements
- [ ] Error handling and recovery flows
- [ ] Extended user testing with Mario (2 weeks)
- [ ] UI/UX refinements based on feedback
- [ ] Accessibility audit (VoiceOver, Dynamic Type, contrast)
- [ ] Documentation (user guide for Mario)
- [ ] Prepare for App Store submission (if desired)

---

## 🔄 Changes & Updates Log

### 2025-10-12 11:38:53 - Initial Planning Complete
**What was done**:
- Analyzed available technologies (Apple Intelligence, OpenAI, Anthropic, Microsoft)
- Designed system architecture (native Swift, multi-AI approach, no backend)
- Defined 6 core feature epics with 23 sub-features
- Created 8-phase development roadmap (18-24 weeks)
- Documented all architectural decisions in ADR-001
- Estimated costs ($70-200/month for APIs)
- Identified risks and mitigation strategies

**Key Decisions**:
1. **Platform**: Native iOS/macOS (SwiftUI + SwiftData + CloudKit)
2. **AI Stack**: OpenAI (GPT-4V + Realtime) + Claude 3.5 + Apple Intelligence
3. **No Backend**: Direct API calls, CloudKit for sync
4. **Voice-First**: OpenAI Realtime as primary interface
5. **Privacy**: On-device processing (Apple Intelligence) when possible
6. **Offline**: Core features work without internet

---

### 2025-10-12 11:49:22 - Advanced Planning & Optimization Complete
**What was done**:
- Updated to latest AI models (GPT-5, Claude Sonnet 4.5, Gemini 2.5 Pro)
- Researched iOS 26/macOS 26 Foundation Models framework
- Analyzed voice technologies (GPT-5 Realtime, Mistral Voxtral, OpenAI Whisper)
- Designed mind map export strategy (Mermaid, XMind, OPML, JSON)
- Explored NotebookLM integration for educational content (FREE!)
- Created "OpenAI First" simplified architecture (per preferenza Roberto)
- Optimized cost strategy with model tiering (GPT-5, mini, nano)
- Documented 7 critical decisions with recommendations

**Updated Technology Stack** (Based on Oct 12, 2025 knowledge):
1. **Primary AI**: OpenAI GPT-5 family (Realtime, mini, nano)
2. **Google Integration**: Gemini 2.5 Pro (native Drive/Calendar/Gmail)
3. **Voice**: GPT-5 Realtime (primary) + Apple Speech (offline)
4. **Educational Content**: NotebookLM (Audio/Video Overviews, FREE!)
5. **Offline**: Apple Intelligence (iOS 26 Foundation Models, 3B params)
6. **Mind Maps**: GPT-5 with multiple export formats

**Key Findings**:
- GPT-5 released August 2025: mini ($0.25/$2), nano ($0.05/$0.40)
- Claude Sonnet 4.5 (Sep 2025): Best coding model (77.2% SWE-bench)
- Mistral Voxtral (Jul 2025): 83% cheaper than Whisper, better for Italian
- NotebookLM: FREE Audio/Video Overviews, 80+ languages
- iOS 26 Foundation Models: 3B on-device model for developers
- Gemini 2.5 Pro: Native Google Workspace integration

**Cost Optimization Achieved**:
- Original estimate: $70-200/month
- Optimized with NotebookLM (FREE): $85-150/month
- Further optimized with GPT-5 nano: Can be as low as $70/month
- With "OpenAI First" approach: $100-150/month (realistic)

**Documents Created**:
1. ✅ PLANNING.md (comprehensive plan)
2. ✅ EXECUTIVE_SUMMARY.md (overview)
3. ✅ ADR-001 (architecture decisions)
4. ✅ DISCUSSION_POINTS.md (10 questions)
5. ✅ NEXT_STEPS.md (operational guide)
6. ✅ ExecutionPlan.md (this file)
7. ✅ README.md (project overview)
8. ✅ AI_STRATEGY_UPDATED.md (latest models analysis)
9. ✅ VOICE_AND_MINDMAPS_STRATEGY.md (technical details)
10. ✅ CRITICAL_DECISIONS.md (key decisions to make)
11. ✅ START_HERE.md (navigation guide)

**Next Actions Required from Roberto**:
1. Read START_HERE.md (navigation guide)
2. Read CRITICAL_DECISIONS.md (7 critical decisions)
3. Read EXECUTIVE_SUMMARY.md (project overview)
4. Answer the 11 open questions in CRITICAL_DECISIONS.md
5. Discuss with Mario to get his input on features
6. Setup API accounts (OpenAI, Google Cloud)
7. Approve "OpenAI First" approach or choose "Best of Breed"
8. Decide on materie prioritarie (Math, Italian, Physics?)
9. Confirm device priority (iPad first?)
10. Approve and start Phase 0

---

## 📝 Notes & Observations

### Key Success Factors
1. **User-Centered Design**: Every decision based on Mario's specific needs
2. **Voice-First**: Reduces cognitive load, typing burden
3. **Patience & Encouragement**: Never judgmental or pressuring
4. **Gamification**: Makes learning fun (Fortnite inspiration)
5. **Simplicity**: No over-engineering, focus on core value

### Potential Challenges
1. **API Costs**: Need to monitor and optimize (caching, Apple Intelligence fallback)
2. **Voice Quality**: Internet dependency for OpenAI Realtime (offline fallback needed)
3. **Material Parsing**: Complex PDFs might not extract cleanly
4. **Gamification Balance**: Too much can distract, too little won't motivate
5. **Working Memory**: UI must minimize context switching and memory load

### Design Philosophy
- **Better a simple app that works** than a complex app that's perfect
- **Ship fast, iterate with Mario's feedback**
- **Use best tools for the job** (multiple AIs, not just one)
- **Privacy matters** (local processing when possible)
- **Accessibility is not optional** (VoiceOver, Dynamic Type, high contrast)

---

## 🎯 Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Planning Complete | 2025-10-12 | ✅ Done |
| Alignment & Approval | 2025-10-15 | ⏳ Pending |
| Phase 0 Start | 2025-10-18 | ⏳ Pending |
| Phase 0 Complete | 2025-11-01 | ⏳ Pending |
| Phase 1 Complete | 2025-11-15 | ⏳ Pending |
| Phase 2 Complete | 2025-11-29 | ⏳ Pending |
| Phase 3 Complete | 2025-12-13 | ⏳ Pending |
| Phase 4 Complete | 2025-12-27 | ⏳ Pending |
| Phase 5 Complete | 2026-01-10 | ⏳ Pending |
| Phase 6 Complete | 2026-01-24 | ⏳ Pending |
| Phase 7 Complete | 2026-02-07 | ⏳ Pending |
| Phase 8 Complete | 2026-02-21 | ⏳ Pending |
| **Launch** | **2026-03-01** | ⏳ Pending |

---

## 📊 Budget Tracking

### Estimated Costs
- **Development**: Solo developer, 18-24 weeks (time investment)
- **APIs (Monthly)**: $70-200/month (OpenAI + Claude)
- **Apple Developer**: $99/year
- **Year 1 Total**: ~$1,000-2,500

### Actual Costs (To Be Tracked)
- Month 1 (Oct 2025): $TBD
- Month 2 (Nov 2025): $TBD
- Month 3 (Dec 2025): $TBD

---

**Last Updated**: 2025-10-12 11:38:53
