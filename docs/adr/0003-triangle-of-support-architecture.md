# ADR 0003: Triangle of Support Architecture

## Status
Accepted

## Date
2025-12-30

## Context

MirrorBuddy is an AI-powered educational platform for students with learning differences (dyslexia, ADHD, autism, cerebral palsy). The original architecture had 17 "Maestri" (historical figure tutors) that provided subject-specific tutoring.

However, students with learning differences need more than content expertise:

| Student Need | Required Support Type |
|--------------|----------------------|
| "Explain fractions" | Academic content (Maestro) |
| "I can't concentrate" | Study method coaching |
| "I feel stupid" | Emotional peer support |
| "Nobody understands me" | Peer validation |

### The ManifestoEdu Vision

The ManifestoEdu.md document (our "North Star") defines three pillars of support:
1. **Vertical (Content)**: Subject matter experts (Maestri)
2. **Vertical (Method)**: Learning coaches who build autonomy
3. **Horizontal (Peer)**: Students who "mirror" the learner's experiences

### Options Considered

#### Option 1: Enhanced Maestri Only
Add method coaching and emotional support to existing Maestri.

**Pros:**
- Simple implementation
- No new characters to create

**Cons:**
- Role confusion (is Archimedes teaching math or coaching focus?)
- Historical figures giving therapy feels inappropriate
- Maestri are "vertical" by nature - they teach down, not alongside

#### Option 2: Single AI Companion
One AI character that adapts to all needs.

**Pros:**
- Consistent relationship
- Simpler UX

**Cons:**
- No role differentiation
- Child psychology research shows different needs require different relationships
- "Jack of all trades" dilutes expertise

#### Option 3: Triangle of Support (Chosen)
Three distinct character types, each optimized for their role.

**Pros:**
- Clear role boundaries
- Developmentally appropriate relationships
- Matches real-world support structures (teacher, tutor, peer)
- Enables character switching based on detected needs

**Cons:**
- More complex implementation
- Requires intent detection
- Handoff complexity

## Decision

Implement a **Triangle of Support** architecture with three character types:

### 1. Maestri (17 Historical Figures)
- **Role**: Subject matter experts
- **Relationship**: Vertical (teacher → student)
- **Focus**: Content mastery, subject-specific tutoring
- **Example**: Archimede for mathematics, Dante for Italian literature

### 2. Coach (Melissa/Davide)
- **Role**: Learning method specialists (Docente di Sostegno)
- **Relationship**: Vertical (coach → student)
- **Focus**: Building AUTONOMY, not doing work for student
- **Characteristics**: Young adult (27), professional but approachable
- **Gender choice**: Students can choose Melissa (female) or Davide (male)

### 3. Buddy (Mario/Maria)
- **Role**: Peer support companion (MirrorBuddy)
- **Relationship**: Horizontal (peer ↔ peer)
- **Focus**: Emotional validation, "you're not alone"
- **Characteristics**: 1 year older than student, SAME learning differences
- **Key feature**: "Mirroring" - buddy has same difficulties as student

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIANGLE OF SUPPORT                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      MAESTRI (17)                           │
│                    Subject Experts                          │
│              "Vertical" - Content Teaching                  │
│                                                             │
│         ┌───────────────┬───────────────┐                   │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│      COACH            COACH          BUDDY                  │
│    (Melissa)         (Davide)    (Mario/Maria)              │
│   Learning Method   Learning Method  Peer Support           │
│   "Vertical"        "Vertical"      "Horizontal"            │
│   Autonomy-focused  Calm/Reassuring  Emotional Connection   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Character Routing

Intent detection (`src/lib/ai/intent-detection.ts`) classifies student messages:

| Intent | Routes To | Reason |
|--------|-----------|--------|
| `academic_help` + subject | Maestro | Subject-specific content |
| `academic_help` no subject | Coach | Identify subject first |
| `method_help` | Coach | Study organization |
| `tool_request` | Maestro/Coach | Depending on subject |
| `emotional_support` | Buddy | Peer validation |
| `crisis` | Buddy | With adult referral built-in |
| `general_chat` | Coach | Neutral starting point |

### Handoff Protocol

Characters can suggest handoffs to each other:

```typescript
// Maestro detecting frustration
"Vedo che ti stai frustrando un po'. Vuoi fare una pausa con Mario?"

// Coach detecting academic need
"Per le equazioni di secondo grado, Archimede è il migliore!"

// Buddy detecting academic need
"Non sono bravissimo in matematica... chiediamo a Melissa?"
```

Handoffs are tracked to maintain conversation context across transitions.

### Buddy Mirroring System

The Buddy dynamically mirrors the student's profile:

```typescript
interface BuddyProfile {
  id: 'mario' | 'maria';
  name: string;
  gender: 'male' | 'female';
  ageOffset: 1; // Always 1 year older
  getSystemPrompt: (student: StudentProfile) => string;
  // System prompt includes: same learning differences, similar struggles
}
```

Example: If student has ADHD and dyslexia, Mario says:
> "Anch'io ho l'ADHD e la dislessia! Le lettere si confondono un sacco, vero?"

## Consequences

### Positive
- Clear role boundaries prevent confusion
- Emotional support separated from academic pressure
- Buddy mirroring creates immediate connection
- Intent-based routing feels natural to students
- Matches real-world support structures

### Negative
- More complex codebase (3 character types vs 1)
- Intent detection can be wrong
- Handoffs can feel jarring if not smooth
- Two implementations per gender (4 coach/buddy total)

### Risks
- Students may try to "hack" the router to avoid work
- Buddy relationship could become dependency (mitigated by autonomy focus)
- Intent detection failures could frustrate students

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/ai/character-router.ts` | Main routing logic |
| `src/lib/ai/intent-detection.ts` | Intent classification |
| `src/lib/ai/handoff-manager.ts` | Character transition handling |
| `src/data/support-teachers/` | Coach definitions (modular structure) |
| `src/data/buddy-profiles/` | Buddy definitions (modular structure) |

## References
- ManifestoEdu.md - Vision document
- GitHub Issue #24 - Melissa/Davide implementation
- GitHub Issue #29 - Mario/Maria implementation
- Related ADRs: #0004 (Safety Guardrails)
