# Knowledge Base & Documentation Optimization Plan

**Date**: 2026-01-01
**Status**: In Progress

---

## Objectives

1. **Optimize app-knowledge-base.ts** - Lazy retrieval instead of full injection
2. **Create ARCHITECTURE.md** - Complete feature inventory
3. **Update app-release-manager** - ConvergioEdu-specific checks

---

## Phase 1: Discovery (Parallel)

- [ ] Inventory all features from codebase
- [ ] Collect all ADRs summaries
- [ ] Map component structure
- [ ] Identify all AI integrations

## Phase 2: Optimize Knowledge Base

- [ ] Create feature index for quick lookup
- [ ] Implement lazy retrieval function
- [ ] Reduce prompt size from ~4k to ~500 tokens base
- [ ] Test with coach integration

## Phase 3: Create ARCHITECTURE.md

- [ ] Document all 17 Maestri
- [ ] Document Triangle of Support (Coach/Buddy)
- [ ] Document all tools (flashcards, mindmaps, quizzes, demos)
- [ ] Document gamification (XP, streaks, Pomodoro)
- [ ] Document accessibility (7 profiles)
- [ ] Document audio (voice API, ambient audio)
- [ ] Document GDPR/parent dashboard
- [ ] Document state management (Zustand + REST)
- [ ] Document AI providers (Azure/Ollama)

## Phase 4: Update Release Manager

- [ ] Add WCAG 2.1 AA checks
- [ ] Add GDPR compliance for minors
- [ ] Add AI safety guardrails validation
- [ ] Add E2E educational flows
- [ ] Add voice API integration tests

## Phase 5: Verification

- [ ] Run lint + typecheck
- [ ] Test knowledge base retrieval
- [ ] Verify documentation accuracy

---

## Checkpoints

| Phase | Status |
|-------|--------|
| Discovery | ✅ |
| Knowledge Base | ✅ |
| Architecture Doc | ✅ |
| Release Manager | ✅ |
| Verification | ✅ |

---

## Completed Changes

### 1. app-knowledge-base-v2.ts (NEW)
- Compact index (~200 tokens vs ~4k tokens)
- Lazy retrieval via `getRelevantKnowledge(query)`
- Category detection from keywords
- 17 categories with focused content

### 2. support-teachers.ts (UPDATED)
- Now imports from `app-knowledge-base-v2.ts`
- Uses `generateCompactIndexPrompt()` instead of full dump
- ~95% reduction in base prompt size

### 3. docs/ARCHITECTURE.md (NEW)
- Complete feature inventory
- All 17 Maestri, 5 Coaches, 5 Buddies documented
- All 18 ADRs summarized
- State management, database schema, API routes
- Safety guardrails, accessibility, audio system

### 4. app-release-manager v3.0.0 (UPDATED)
- Added Wave 3: ConvergioEdu-specific checks
  - Task J: WCAG 2.1 AA Accessibility
  - Task K: GDPR Compliance (Minors)
  - Task L: AI Safety Guardrails
  - Task M: Educational Content Quality
  - Task N: E2E Educational Flows
- Updated description to reflect ConvergioEdu focus
