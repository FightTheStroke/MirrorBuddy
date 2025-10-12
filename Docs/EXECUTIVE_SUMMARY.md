# MirrorBuddy - Executive Summary
**Date**: 2025-10-12
**Target User**: Mario (student with dyslexia, dyscalculia, dysgraphia, left hemiplegia, limited working memory)
**Timeline**: 5-6 months
**Budget**: $70-200/month (APIs)

---

## What is MirrorBuddy?

A **personalized AI learning companion** that helps Mario study, complete homework, and stay organized. It's like having a dedicated support teacher who:
- Understands his specific challenges
- Makes learning fun through gamification (Fortnite-style rewards)
- Communicates primarily through **voice and vision** (minimal typing)
- Adapts to any subject (Math, Physics, Italian, History, etc.)
- Connects to his Google Drive, Calendar, and Gmail

---

## Core Value Propositions

1. **Voice-First Multimodal Interaction**
   - Talk naturally with AI (like ChatGPT voice mode)
   - Show textbook pages or homework via camera
   - Write with Apple Pencil, AI helps solve problems

2. **Adaptive Learning Support**
   - Auto-generates simplified mind maps
   - Breaks complex concepts into digestible pieces
   - Explains concepts with real-world examples
   - Patient, encouraging, never judgmental

3. **Material & Task Management**
   - Auto-syncs materials from Google Drive
   - Converts PDFs to accessible formats (audio, simplified text)
   - Tracks assignments from Calendar and email
   - Shows "What should I work on now?"

4. **Gamification**
   - XP and leveling system
   - Fortnite-inspired rewards and themes
   - Achievements for mastering topics
   - Visual progress tracking

5. **Accessibility-First Design**
   - One-handed operation (right thumb optimized)
   - Dyslexia-friendly fonts and layouts
   - Minimal working memory requirements
   - Works offline for core features

---

## Technology Stack

### Platform
- **Native iOS/iPadOS/macOS** (Swift + SwiftUI)
- Cross-device sync via iCloud (CloudKit)
- SwiftData for local storage

### AI Strategy (Multi-Model Approach)
1. **OpenAI GPT-4V + Realtime API** (Primary)
   - Real-time voice conversation
   - Vision for homework help (analyze textbook photos)
   - Best for: Study coaching, math problem solving

2. **Claude 3.5 Sonnet** (Specialized Tasks)
   - Mind map generation
   - Document processing and summarization
   - Task breakdown and planning

3. **Apple Intelligence** (Local/Offline)
   - Text simplification (on-device)
   - Basic Q&A without internet
   - Privacy-sensitive operations

### Integrations
- Google Drive API (material sync)
- Google Calendar API (assignment tracking)
- Gmail API (parse teacher emails)

### Why No Backend?
- Single user (Mario) doesn't need server infrastructure
- CloudKit provides free cross-device sync
- Direct API calls from iOS app (simpler, cheaper, faster to build)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│        iPhone / iPad / Mac Apps             │
│              (SwiftUI)                      │
│                                             │
│  [Material Viewer] [Voice Coach] [Tasks]   │
│  [Mind Maps] [Camera] [Gamification]       │
│                                             │
│         SwiftData (Local Storage)          │
│         CloudKit (iCloud Sync)             │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
│  OpenAI   │ │ Claude │ │  Apple   │
│  GPT-4V + │ │  3.5   │ │   AI     │
│ Realtime  │ │ Sonnet │ │ (Local)  │
└─────┬─────┘ └───┬────┘ └────┬─────┘
      │            │            │
      └────────────┼────────────┘
                   │
      ┌────────────▼────────────┐
      │    Google Services      │
      │  Drive / Calendar / Gmail│
      └─────────────────────────┘
```

---

## Key Features (8 Phases)

### Phase 1: Material Management (Weeks 3-4)
- Browse materials from Google Drive by subject
- PDF viewer with text-to-speech
- "What's New" dashboard

### Phase 2: Voice Coach (Weeks 5-6)
- Real-time voice conversation with AI
- Natural interruptions and guidance
- Encouraging, patient personality

### Phase 3: Vision Capabilities (Weeks 7-8)
- Camera integration for textbook pages
- Handwriting recognition (iPad + Pencil)
- Combined vision + voice explanations

### Phase 4: Mind Maps (Weeks 9-10)
- Auto-generate visual mind maps
- Interactive exploration (zoom, navigate)
- Voice-driven mind map walkthrough

### Phase 5: Task Management (Weeks 11-12)
- Sync Calendar assignments
- Parse teacher emails for deadlines
- Smart "What's next?" recommendations

### Phase 6: Gamification (Weeks 13-14)
- XP and leveling system
- Fortnite-style UI and rewards
- Achievement badges

### Phase 7: Subject-Specific Modes (Weeks 15-16)
- Math mode: equation solving step-by-step
- Physics mode: real-world examples
- Italian mode: reading support, summarization

### Phase 8: Polish (Weeks 17-18)
- Performance optimization
- Accessibility audit
- User testing with Mario

---

## Development Timeline

```
Months 1-2: Foundation + Materials + Voice
Months 3-4: Vision + Mind Maps + Tasks
Months 5-6: Gamification + Subject Modes + Polish
```

**Realistic Total**: 5-6 months (part-time development)

---

## Cost Breakdown

### Monthly Operating Costs
- **OpenAI APIs**: $50-150/month (based on usage)
- **Claude API**: $20-50/month
- **Google APIs**: $0 (free tier)
- **Total**: $70-200/month

### One-Time Costs
- **Apple Developer Account**: $99/year
- **iCloud Storage**: Included in family plan

### Development
- Solo developer: 18-24 weeks part-time

**Year 1 Total**: ~$1,000-2,500 (reasonable for such a critical tool)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API costs spike | Implement caching, use Apple Intelligence for simple tasks, monitor usage |
| Voice recognition fails | Fallback to typed input, use multiple AI providers |
| Google API rate limits | Local caching, batch operations |
| Mario finds UI too complex | Continuous user testing, iterative simplification |
| Privacy concerns | On-device processing when possible, transparent data usage |

---

## Success Criteria

1. **Daily Usage**: Mario uses app 30-60 min/day for studying
2. **Homework Completion**: >90% of assignments completed with app's help
3. **Stress Reduction**: Mario reports feeling less stressed about schoolwork
4. **Voice Interaction**: >95% of voice commands understood correctly
5. **Parent Satisfaction**: Roberto sees improved academic performance and confidence

---

## Why This Approach?

### ✅ Advantages

1. **Simple Architecture**: No backend complexity, faster development
2. **Best AI for Each Task**: Multi-model strategy ensures optimal results
3. **Native Experience**: Superior performance and Apple Intelligence integration
4. **Privacy-Friendly**: Local processing when possible
5. **Cost-Effective**: Only pay for what you use, no hosting
6. **Maintainable**: Clear structure, single codebase for all Apple devices
7. **Future-Proof**: Easy to swap AI providers as tech improves

### ⚠️ Tradeoffs

1. **Internet Required**: Advanced AI features need connectivity (but offline mode for basics)
2. **API Dependency**: Reliance on OpenAI/Claude (but redundancy mitigates risk)
3. **iOS-Only**: No Android (not a concern for Mario)

---

## Next Steps

1. ✅ **Review this plan** with Roberto
2. **Get feedback from Mario** (show mockups, explain voice features)
3. **Prototype voice interaction** (validate OpenAI Realtime quality)
4. **Test GPT-4V vision** (can it read textbooks accurately?)
5. **Begin Phase 0** (project setup, design system)
6. **Start Phase 1** (Material management)

---

## Questions for Discussion

1. **Subject priorities**: Which subjects should we focus on first? (Math? Italian?)
2. **Device priority**: Start with iPad (study desk) or iPhone (portable)?
3. **Gamification style**: How Fortnite-like should the UI be?
4. **Voice personality**: What tone? (Friendly peer? Patient tutor?)
5. **Privacy boundaries**: What data is Mario comfortable sending to AI?
6. **Parent dashboard**: Should Roberto have a progress view?

---

## References

- **Full Planning Document**: `Docs/PLANNING.md`
- **Architecture Decision Record**: `Docs/ADR/001-technology-stack-and-architecture.md`
- **Project Repository**: Current directory

---

## Contact & Collaboration

This is a living document. As we build and test with Mario, we'll refine features, priorities, and approaches based on real feedback.

**Philosophy**: Build fast, test with Mario, iterate quickly. Perfect is the enemy of good—ship something useful, then improve.
