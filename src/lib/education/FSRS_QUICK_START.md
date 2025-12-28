# FSRS Quick Start Guide

5-minute guide to get started with FSRS in your Convergio web app.

## Installation

Already installed! FSRS is part of the education library at:
`/Users/roberdan/GitHub/ConvergioWeb/web/src/lib/education/`

## 1. Import

```typescript
import {
  createCard,
  reviewCard,
  isDue,
  getDueCards,
  calculateStats,
  type FSRSCard,
  type Quality,
} from '@/lib/education';
```

## 2. Create Cards

```typescript
interface MyFlashcard {
  id: string;
  question: string;
  answer: string;
  fsrs: FSRSCard;  // FSRS state
}

const card: MyFlashcard = {
  id: uuid(),
  question: "What is 2 + 2?",
  answer: "4",
  fsrs: createCard(),  // Initialize FSRS state
};
```

## 3. Show Due Cards

```typescript
function StudySession({ cards }: { cards: MyFlashcard[] }) {
  // Get cards that need review
  const dueCards = cards.filter(c => isDue(c.fsrs));

  if (dueCards.length === 0) {
    return <p>All caught up! 🎉</p>;
  }

  return (
    <div>
      <p>{dueCards.length} cards to review</p>
      {/* Show first due card */}
    </div>
  );
}
```

## 4. Handle Reviews

```typescript
function handleReview(card: MyFlashcard, quality: Quality) {
  // Quality: 1=Again, 2=Hard, 3=Good, 4=Easy
  const updatedFsrs = reviewCard(card.fsrs, quality);

  // Update your state/database
  updateCard(card.id, { fsrs: updatedFsrs });
}
```

## 5. Complete Example

```typescript
'use client';

import { useState } from 'react';
import { createCard, reviewCard, isDue, type FSRSCard, type Quality } from '@/lib/education';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  fsrs: FSRSCard;
}

export default function FlashcardApp() {
  const [cards, setCards] = useState<Flashcard[]>([
    {
      id: '1',
      question: 'Capital of France?',
      answer: 'Paris',
      fsrs: createCard(),
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const dueCards = cards.filter(c => isDue(c.fsrs));
  const currentCard = dueCards[currentIndex];

  const handleQuality = (quality: Quality) => {
    const updated = reviewCard(currentCard.fsrs, quality);

    setCards(prev => prev.map(c =>
      c.id === currentCard.id ? { ...c, fsrs: updated } : c
    ));

    setCurrentIndex(currentIndex + 1);
    setShowAnswer(false);
  };

  if (!currentCard) {
    return <div>All done! 🎉</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">{currentCard.question}</h2>

      {showAnswer ? (
        <>
          <p className="text-lg mb-4">{currentCard.answer}</p>
          <div className="flex gap-2">
            <button onClick={() => handleQuality(1)} className="px-4 py-2 bg-red-500 text-white rounded">
              Again
            </button>
            <button onClick={() => handleQuality(2)} className="px-4 py-2 bg-orange-500 text-white rounded">
              Hard
            </button>
            <button onClick={() => handleQuality(3)} className="px-4 py-2 bg-green-500 text-white rounded">
              Good
            </button>
            <button onClick={() => handleQuality(4)} className="px-4 py-2 bg-blue-500 text-white rounded">
              Easy
            </button>
          </div>
        </>
      ) : (
        <button onClick={() => setShowAnswer(true)} className="px-6 py-3 bg-blue-600 text-white rounded">
          Show Answer
        </button>
      )}
    </div>
  );
}
```

## 6. Database Schema

Add these columns to your flashcards table:

```sql
ALTER TABLE flashcards ADD COLUMN stability REAL NOT NULL DEFAULT 1.0;
ALTER TABLE flashcards ADD COLUMN difficulty REAL NOT NULL DEFAULT 0.3;
ALTER TABLE flashcards ADD COLUMN last_review TIMESTAMP;
ALTER TABLE flashcards ADD COLUMN next_review TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE flashcards ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
ALTER TABLE flashcards ADD COLUMN reps INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_flashcards_next_review ON flashcards(user_id, next_review);
```

## 7. API Routes (Next.js)

```typescript
// app/api/flashcards/[id]/review/route.ts
import { reviewCard } from '@/lib/education';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { quality } = await req.json();
  const card = await db.getCard(params.id);

  const fsrs = {
    stability: card.stability,
    difficulty: card.difficulty,
    lastReview: card.lastReview,
    nextReview: card.nextReview,
    lapses: card.lapses,
    reps: card.reps,
  };

  const updated = reviewCard(fsrs, quality);

  await db.updateCard(params.id, {
    stability: updated.stability,
    difficulty: updated.difficulty,
    lastReview: updated.lastReview,
    nextReview: updated.nextReview,
    lapses: updated.lapses,
    reps: updated.reps,
  });

  return Response.json({ success: true, card: updated });
}
```

## 8. Common Patterns

### Get cards due today
```typescript
const dueToday = cards.filter(c => isDue(c.fsrs));
```

### Get next N due cards
```typescript
const next20 = getDueCards(cards.map(c => c.fsrs), 20);
```

### Show statistics
```typescript
const stats = calculateStats(cards.map(c => c.fsrs));
console.log(`Due: ${stats.cardsDue}, Retention: ${stats.predictedRetention}`);
```

### Predict future retention
```typescript
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const retention = predictRetention(card.fsrs, tomorrow);
console.log(`${(retention * 100).toFixed(0)}% retention tomorrow`);
```

## Quality Rating Guide

| Rating | When to use | Example |
|--------|-------------|---------|
| 1 (Again) | Completely forgot | "I had no idea" |
| 2 (Hard) | Struggled to remember | "Took me a while..." |
| 3 (Good) | Remembered correctly | "Got it right" |
| 4 (Easy) | Very easy to remember | "Instant recall" |

## Testing

Run the demo to see it in action:
```bash
cd /Users/roberdan/GitHub/ConvergioWeb/web
npx tsx src/lib/education/fsrs-demo.ts
```

## Need More?

- **Full API Reference**: See `README.md` in this directory
- **Example Components**: Check `example-flashcard.tsx`
- **Implementation Details**: Read `FSRS_IMPLEMENTATION.md`
- **C Reference**: `/Users/roberdan/GitHub/ConvergioCLI/src/education/fsrs.c`

## Tips

1. **Be Honest**: Rate cards honestly for best results
2. **Regular Reviews**: Review when `isDue()` returns true
3. **Don't Overload**: Limit to 20-30 new cards per day
4. **Track Progress**: Use `calculateStats()` to monitor improvement
5. **Persist State**: Always save FSRS state after reviews

## That's it! 🚀

You now have a production-ready spaced repetition system powered by the same algorithm Duolingo uses.

Happy learning! 📚
