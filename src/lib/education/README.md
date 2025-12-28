# Convergio Education Library

TypeScript implementation of education features for the Convergio Education Pack.

## Modules

### 📚 [Accessibility Adaptations](./ACCESSIBILITY.md)
Runtime adaptations for students with:
- Dyslexia
- Dyscalculia
- ADHD
- Cerebral Palsy
- Autism

See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for full documentation.

### 🃏 FSRS (Free Spaced Repetition Scheduler)

TypeScript implementation of the FSRS-4.5 algorithm for optimal spaced repetition learning, based on Duolingo's 2024 research.

## Overview

FSRS is a modern spaced repetition algorithm that optimizes review scheduling based on:
- **Stability**: How long a memory lasts (days until 90% forgetting probability)
- **Difficulty**: How hard the material is to remember (0.0 = easy, 1.0 = hard)
- **Retrievability**: Current probability of successful recall (0.0 to 1.0)

The algorithm adapts to individual performance, scheduling reviews at optimal intervals to maximize retention while minimizing study time.

## Quick Start

```typescript
import {
  createCard,
  reviewCard,
  isDue,
  getDueCards,
  type Quality,
} from '@/lib/education/fsrs';

// Create a new flashcard
const card = createCard();

// Review the card
const quality: Quality = 3; // 1=again, 2=hard, 3=good, 4=easy
const updatedCard = reviewCard(card, quality);

// Check if review is due
if (isDue(updatedCard)) {
  console.log('Time to review!');
}

// Get all due cards from a collection
const allCards = [card1, card2, card3];
const dueCards = getDueCards(allCards);
```

## API Reference

### Types

#### `FSRSCard`

```typescript
interface FSRSCard {
  stability: number;      // Days until 90% forgetting probability
  difficulty: number;     // 0.0 (easy) to 1.0 (hard)
  lastReview: Date;       // When last reviewed
  nextReview: Date;       // When to review next
  lapses: number;         // Times forgotten
  reps: number;           // Total reviews
}
```

#### `Quality`

```typescript
type Quality = 1 | 2 | 3 | 4;
// 1 = Again (forgot)
// 2 = Hard (difficult to remember)
// 3 = Good (remembered correctly)
// 4 = Easy (very easy to remember)
```

### Core Functions

#### `createCard(): FSRSCard`

Creates a new flashcard with default parameters:
- Initial stability: 1.0 day
- Initial difficulty: 0.3 (moderate)
- Scheduled for immediate review

```typescript
const newCard = createCard();
```

#### `reviewCard(card: FSRSCard, quality: Quality): FSRSCard`

Updates a card after review, applying the FSRS algorithm:

```typescript
const card = createCard();
const updatedCard = reviewCard(card, 3); // Good review

console.log(updatedCard.stability);  // Increased
console.log(updatedCard.nextReview); // Scheduled in future
console.log(updatedCard.reps);       // Incremented
```

#### `calculateRetrievability(card: FSRSCard): number`

Calculates current probability of recall (0.0 to 1.0):

```typescript
const probability = calculateRetrievability(card);
console.log(`${(probability * 100).toFixed(1)}% chance of recall`);
```

#### `isDue(card: FSRSCard): boolean`

Checks if a card should be reviewed now:

```typescript
if (isDue(card)) {
  // Show card for review
}
```

#### `getNextReviewDate(card: FSRSCard): Date`

Returns the scheduled review date:

```typescript
const nextDate = getNextReviewDate(card);
console.log(`Review on ${nextDate.toLocaleDateString()}`);
```

#### `getDueCards(cards: FSRSCard[], limit?: number): FSRSCard[]`

Filters and sorts cards due for review:

```typescript
const dueCards = getDueCards(allCards, 20); // Get up to 20 due cards
```

#### `calculateStats(cards: FSRSCard[]): FSRSStats`

Calculates aggregate statistics:

```typescript
const stats = calculateStats(allCards);
console.log(`Total: ${stats.totalCards}`);
console.log(`Due: ${stats.cardsDue}`);
console.log(`Mastered: ${stats.cardsMastered}`);
console.log(`Avg retention: ${(stats.predictedRetention * 100).toFixed(1)}%`);
```

#### `predictRetention(card: FSRSCard, futureDate: Date): number`

Predicts retention at a future date:

```typescript
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const retention = predictRetention(card, tomorrow);
console.log(`Tomorrow: ${(retention * 100).toFixed(1)}% retention`);
```

## Algorithm Details

### Retrievability Formula

```
R(t) = (1 + t/(9*S))^(-1/w)
```

Where:
- `t` = days elapsed since last review
- `S` = stability (days until 90% forgetting)
- `w` = decay sharpness (0.95)

### Stability Update Formula

For successful recall (quality 2-4):

```
S_new = S * (11^D - 1) * e^(k*(1-R)) * e^(0.2*S) * e^(-0.1*lapses)
```

Then multiply by quality modifier:
- Quality 2 (Hard): × 0.6
- Quality 3 (Good): × 0.85
- Quality 4 (Easy): × 1.3

For failed recall (quality 1):

```
S_new = S * 0.3 * 11^(D-1)
```

### Difficulty Update

```
D_new = D + delta + 0.05*(0.3 - D)
```

Where delta is:
- Quality 1 (Again): +0.1
- Quality 2 (Hard): +0.05
- Quality 3 (Good): -0.03
- Quality 4 (Easy): -0.07

### Next Review Interval

```
t = S * ((1/R_desired)^w - 1) * 9
```

Default desired retention: 90%

## Usage Examples

### Simple Flashcard App

```typescript
import { createCard, reviewCard, isDue } from '@/lib/education/fsrs';

// Create deck
const deck = [
  { id: 1, question: 'What is 2+2?', answer: '4', fsrs: createCard() },
  { id: 2, question: 'Capital of France?', answer: 'Paris', fsrs: createCard() },
];

// Study session
function studySession() {
  const dueCards = deck.filter(card => isDue(card.fsrs));

  dueCards.forEach(card => {
    const quality = askUser(card.question, card.answer); // 1-4
    card.fsrs = reviewCard(card.fsrs, quality);
  });
}
```

### Progress Tracking

```typescript
import { calculateStats } from '@/lib/education/fsrs';

function showProgress() {
  const stats = calculateStats(deck.map(c => c.fsrs));

  console.log('Learning Progress:');
  console.log(`Total Cards: ${stats.totalCards}`);
  console.log(`Due Today: ${stats.cardsDue}`);
  console.log(`Mastered: ${stats.cardsMastered}`);
  console.log(`Avg Stability: ${stats.avgStability.toFixed(1)} days`);
  console.log(`Overall Retention: ${(stats.predictedRetention * 100).toFixed(1)}%`);
}
```

### Study Reminder System

```typescript
import { getDueCards, getNextReviewDate } from '@/lib/education/fsrs';

function scheduleDailyReminder() {
  const dueCards = getDueCards(allCards);

  if (dueCards.length > 0) {
    sendNotification(`You have ${dueCards.length} cards to review!`);
  } else {
    const nextCard = allCards
      .map(c => ({ card: c, date: getNextReviewDate(c) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    scheduleNotification(
      `Next review: ${nextCard.date.toLocaleDateString()}`,
      nextCard.date
    );
  }
}
```

### Spaced Repetition Study Plan

```typescript
import { reviewCard, predictRetention } from '@/lib/education/fsrs';

function optimizeStudyPlan(card: FSRSCard) {
  // Simulate different quality outcomes
  const scenarios = [
    { quality: 1, name: 'Forgot' },
    { quality: 2, name: 'Hard' },
    { quality: 3, name: 'Good' },
    { quality: 4, name: 'Easy' },
  ] as const;

  scenarios.forEach(({ quality, name }) => {
    const updated = reviewCard(card, quality);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const retention = predictRetention(updated, in7Days);

    console.log(`${name}: Next review in ${
      Math.round((updated.nextReview.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    } days, 7-day retention: ${(retention * 100).toFixed(1)}%`);
  });
}
```

## Performance Characteristics

- **Time Complexity**: O(1) for all operations
- **Space Complexity**: O(1) per card
- **Deterministic**: Same inputs always produce same outputs
- **Stateless**: No global state, purely functional

## Algorithm Parameters

```typescript
export const FSRS_CONSTANTS = {
  INITIAL_STABILITY: 1.0,      // 1 day
  INITIAL_DIFFICULTY: 0.3,     // Moderate difficulty
  DESIRED_RETENTION: 0.9,      // 90% target retention
  MIN_STABILITY_DAYS: 0.04,    // 1 hour minimum
  MAX_STABILITY_DAYS: 1095,    // 3 years maximum
};
```

## Best Practices

1. **Regular Reviews**: Review cards when `isDue()` returns true
2. **Honest Ratings**: Use quality ratings honestly for best results
3. **Consistency**: Review at similar times each day for optimal results
4. **Gradual Introduction**: Don't add too many new cards at once
5. **Track Progress**: Use `calculateStats()` to monitor improvement

## Integration with Backend

Store FSRS state in your database:

```typescript
interface StoredCard {
  id: string;
  userId: string;
  front: string;
  back: string;
  // FSRS state
  stability: number;
  difficulty: number;
  lastReview: Date;
  nextReview: Date;
  lapses: number;
  reps: number;
  createdAt: Date;
}
```

Sync on each review:

```typescript
async function handleReview(cardId: string, quality: Quality) {
  const stored = await db.getCard(cardId);
  const fsrsCard: FSRSCard = {
    stability: stored.stability,
    difficulty: stored.difficulty,
    lastReview: stored.lastReview,
    nextReview: stored.nextReview,
    lapses: stored.lapses,
    reps: stored.reps,
  };

  const updated = reviewCard(fsrsCard, quality);

  await db.updateCard(cardId, {
    stability: updated.stability,
    difficulty: updated.difficulty,
    lastReview: updated.lastReview,
    nextReview: updated.nextReview,
    lapses: updated.lapses,
    reps: updated.reps,
  });
}
```

## References

- [FSRS Algorithm Paper](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- [Duolingo's FSRS Implementation](https://blog.duolingo.com/spaced-repetition/)
- C Implementation: `/Users/roberdan/GitHub/ConvergioCLI/src/education/fsrs.c`

## License

MIT License - Copyright (c) 2025 Convergio.io
