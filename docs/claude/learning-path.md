# Learning Path

> Progressive learning paths with FSRS spaced repetition and adaptive difficulty

## Quick Reference

| Key        | Value                                             |
| ---------- | ------------------------------------------------- |
| Path       | `src/lib/learning-path/`, `src/lib/education/`    |
| ADRs       | 0041 (Adaptive Difficulty), FSRS docs             |
| Algorithm  | FSRS (Free Spaced Repetition Scheduler)           |
| DB Tables  | `LearningPath`, `PathStep`, Flashcard FSRS fields |
| Components | Topic analyzer, material linker, progress manager |

## Architecture

MirrorBuddy's learning path system combines **progressive topic breakdown** with **FSRS spaced repetition** and **adaptive difficulty**. When a student requests to learn a subject, the system analyzes topic into subtopics, generates materials (flashcards, quizzes, summaries), links materials to path steps with FSRS scheduling, adapts difficulty based on multi-signal detection (frustration, quiz scores, response time), and tracks progress with mastery scoring.

FSRS (the same algorithm Duolingo uses) determines when each flashcard should be reviewed based on stability, difficulty, and review history.

## FSRS Core

| Concept            | Description                                    |
| ------------------ | ---------------------------------------------- |
| **Stability**      | How long memory lasts (1.0 = 1 day half-life)  |
| **Difficulty**     | How hard to remember (0.3 default, 0-1 scale)  |
| **Retrievability** | Probability of recall (0-1, exponential decay) |
| **Quality**        | Review rating: 1=Again, 2=Hard, 3=Good, 4=Easy |

```typescript
import { createCard, reviewCard, isDue } from "@/lib/education";

// Create new flashcard
const fsrs = createCard(); // { stability: 1.0, difficulty: 0.3, ... }

// After review (student rated "Good")
const updated = reviewCard(fsrs, 3); // Quality 3 = Good
// updated.nextReview: Date (when to show again)

// Check if due
const needsReview = isDue(updated); // true if nextReview <= now
```

## Adaptive Difficulty

The adaptive engine uses **exponential moving average (EMA)** to smooth signals and prevent oscillation:

| Signal          | Source                               | Threshold | Action                                  |
| --------------- | ------------------------------------ | --------- | --------------------------------------- |
| Frustration     | Text patterns ("è troppo difficile") | > 0.6     | Reduce difficulty                       |
| Repeat requests | "non ho capito", "ripeti"            | > 0.5     | Reduce difficulty                       |
| Questions       | Interrogative patterns               | > 0.4     | Increase difficulty (if no frustration) |
| Response time   | System measurement                   | > 20s     | Reduce difficulty                       |
| Quiz score      | Quiz results                         | < 60%     | Reduce difficulty                       |

```typescript
import { updateDifficultyProfile } from "@/lib/education";

// Detect frustration from user message
await updateDifficultyProfile(userId, {
  signal: "frustration",
  value: 0.8, // High frustration
});

// System adjusts difficulty using EMA (α=0.3)
// newValue = 0.3 * 0.8 + 0.7 * oldValue
```

## Control Modes

| Mode      | Max Adjustment | Behavior                             |
| --------- | -------------- | ------------------------------------ |
| Manual    | 0              | Suggestions only, asks confirmation  |
| Guided    | ±0.5           | Small adjustments with notifications |
| Balanced  | ±1.0           | Adapts while maintaining stability   |
| Automatic | ±1.5           | Full real-time adaptation            |

## Usage

```typescript
import { generateLearningPath, getPathProgress } from "@/lib/learning-path";

// Generate path with subtopics, flashcards, quizzes
const path = await generateLearningPath({
  userId,
  topic: "Frazioni",
  subject: "mathematics",
  targetLevel: 3,
  maestroId: "melissa",
});

// Track progress (completedSteps, masteryScore, dueFlashcards)
const progress = await getPathProgress(pathId);
```

## See Also

ADR 0041 (Adaptive Difficulty), FSRS_QUICK_START.md, FSRS_IMPLEMENTATION.md
