# @mirrorbuddy/education

Educational domain logic for MirrorBuddy.

## Current scope

- **FSRS** (Free Spaced Repetition Scheduler) — pure math for flashcard
  review scheduling. Zero runtime deps; all functions pure.

## Coming

- **Maestri** (`src/data/maestri/`) — 26 historical mentor character
  definitions. Blocked on `packages/greeting` extraction (29 files
  import `generateMaestroGreeting` from `@/lib/greeting`).

## Usage

```ts
import {
  createCard,
  reviewCard,
  getDueCards,
  calculateStats,
  type Quality,
  type FSRSCard,
} from '@mirrorbuddy/education/fsrs';
// or from the root barrel:
import { createCard } from '@mirrorbuddy/education';
```
