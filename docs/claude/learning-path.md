# Learning Path

## What it is and why it matters

**Problem**: A student uploads a 50-page PDF about the French Revolution. Where do they start? What should they study first? How do they know if they understood it?

**Solution**: Learning Path takes that PDF and automatically transforms it into a **guided study journey**:

1. **AI Analysis**: Reads the PDF and identifies 3-5 main topics (e.g., "Causes of the Revolution", "The Storming of the Bastille", "The Terror", "Napoleon")

2. **Pedagogical ordering**: Arranges them from simplest to most complex, like a teacher would

3. **Progressive unlocking**: Student starts with the first topic. Only when they complete it, the second one unlocks. Like a video game.

4. **For each topic**:
   - **Overview**: Summary + visual map
   - **Mind map**: To visualize concepts
   - **Flashcards**: To memorize key points
   - **Final quiz**: To verify understanding (must pass to unlock the next topic)

5. **Progress tracking**: Student always sees where they are (e.g., "2/4 topics completed - 50%")

**Where to find it**:
- From Zaino → "Percorsi" filter
- From Study Kit → "Genera Percorso" button

**Practical example**:
> Mario uploads a History PDF. The AI creates a path with 4 stages. Mario starts with the first one ("The Causes"), reads the overview, studies the flashcards, takes the quiz (85%). Stage completed! "The Storming of the Bastille" unlocks. Mario continues until he completes the entire path.

---

## Technical Documentation

AI-powered progressive learning paths that transform PDF study materials into structured, gamified learning journeys with automatic topic extraction, progress tracking, and adaptive content.

## Key Files

| Area | Files |
|------|-------|
| Types | `src/types/learning-path.ts` |
| Library | `src/lib/learning-path/*.ts` |
| Components | `src/components/education/learning-path/*.tsx` |
| API Routes | `src/app/api/learning-path/**/*.ts` |
| Tests | `src/lib/learning-path/__tests__/*.test.ts` |

## Architecture

### Library Modules

| Module | File | Purpose |
|--------|------|---------|
| topic-analyzer | `topic-analyzer.ts` | AI-powered topic extraction from PDF content |
| path-generator | `path-generator.ts` | Creates learning path with topics and steps |
| progress-manager | `progress-manager.ts` | Handles topic completion and unlocking |
| material-linker | `material-linker.ts` | Links existing materials to topics |
| topic-material-generator | `topic-material-generator.ts` | Generates overview, mindmap, flashcards |
| final-quiz-generator | `final-quiz-generator.ts` | Creates topic completion quiz |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| LearningPathView | `learning-path-view.tsx` | Full path display with progress |
| TopicDetail | `topic-detail.tsx` | Expandable topic with steps |
| VisualOverview | `visual-overview.tsx` | Mermaid SVG flowchart |
| LearningPathsList | `learning-paths-list.tsx` | User's paths listing |
| TopicCard | `learning-path-view.tsx` | Individual topic card |

## Topic Analysis

```typescript
// AI extracts 2-5 macro-topics from PDF content
const result = await analyzeTopics(pdfText, title, subject);

// Returns:
{
  documentTitle: string;
  topics: IdentifiedTopic[];  // 2-5 topics
  suggestedOrder: string[];   // Pedagogical order
  totalEstimatedMinutes: number;
}

// Each topic:
{
  id: string;
  title: string;
  description: string;
  keyConcepts: string[];      // 3-5 concepts
  estimatedDifficulty: 'basic' | 'intermediate' | 'advanced';
  order: number;
  estimatedMinutes: number;
  textExcerpt: string;
}
```

## Progressive Unlock System

```typescript
// Topic statuses
type TopicStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

// First topic starts unlocked, rest are locked
// Complete topic → unlock next in order
// Path complete when all topics completed

// Complete a topic (with transaction for atomicity)
const result = await completeTopic(topicId, quizScore);
// Returns: { topicId, newStatus, quizScore, unlockedNext, nextTopicId, pathProgress, pathCompleted }
```

## Topic Steps

Each topic has 4 internal steps:

| Step | Type | Content |
|------|------|---------|
| 1 | overview | Text summary + Mermaid diagram |
| 2 | mindmap | Auto-generated concept map |
| 3 | flashcard | Key concepts as cards |
| 4 | quiz | Assessment questions |

```typescript
type TopicStepType = 'overview' | 'mindmap' | 'flashcard' | 'quiz';

type StepContent =
  | OverviewContent   // { text, mermaidCode? }
  | MindmapContent    // { nodes, svgData? }
  | FlashcardContent  // { cards: {front, back}[] }
  | QuizContent;      // { questions: {...}[] }
```

## API Endpoints

```
# Learning Paths
GET  /api/learning-path              # List user's paths
POST /api/learning-path              # Create path with topics
POST /api/learning-path/generate     # Generate from study kit

# Single Path
GET    /api/learning-path/[id]       # Get path details
DELETE /api/learning-path/[id]       # Delete path

# Topics
GET   /api/learning-path/[id]/topics/[topicId]              # Get topic with steps
PATCH /api/learning-path/[id]/topics/[topicId]              # Update status/score

# Attempts
GET  /api/learning-path/[id]/topics/[topicId]/attempts      # List attempts
POST /api/learning-path/[id]/topics/[topicId]/attempts      # Record attempt
```

## Database Models

```prisma
model LearningPath {
  id              String   @id @default(cuid())
  userId          String
  title           String
  subject         String?
  sourceStudyKitId String?
  totalTopics     Int      @default(0)
  completedTopics Int      @default(0)
  progressPercent Int      @default(0)
  status          String   @default("ready")  // ready|in_progress|completed
  visualOverview  String?  @db.Text           // Mermaid SVG
  topics          LearningPathTopic[]

  @@index([userId, status])
}

model LearningPathTopic {
  id               String   @id @default(cuid())
  pathId           String
  order            Int
  title            String
  description      String?  @db.Text
  keyConcepts      String   @db.Text          // JSON array
  difficulty       String   @default("intermediate")
  status           String   @default("locked")
  estimatedMinutes Int?
  quizScore        Int?
  steps            TopicStep[]
  attempts         TopicAttempt[]
  path             LearningPath @relation(...)
}

model TopicStep {
  id          String   @id @default(cuid())
  topicId     String
  order       Int
  type        String   // overview|mindmap|flashcard|quiz
  title       String
  content     String   @db.Text  // JSON
  isCompleted Boolean  @default(false)
}

model TopicAttempt {
  id        String   @id @default(cuid())
  topicId   String
  score     Int
  passed    Boolean
  answers   String   @db.Text  // JSON
}
```

## Visual Overview (Mermaid)

```typescript
// SVG is sanitized with DOMPurify before rendering
import DOMPurify from 'dompurify';

const sanitizedSvg = DOMPurify.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
});
containerRef.current.innerHTML = sanitizedSvg;
```

## Integration Points

- **StudyKitViewer**: "Genera Percorso" button triggers path generation
- **Zaino**: "Percorsi" filter shows learning paths
- **Gamification**: Path completion awards MirrorBucks

## Test Coverage

- **topic-analyzer.test.ts**: 10 tests
- **path-generator.test.ts**: 9 tests
- **progress-manager.test.ts**: 10 tests
- **material-linker.test.ts**: 9 tests
- **topic-material-generator.test.ts**: 10 tests
- **final-quiz-generator.test.ts**: 9 tests
- **visual-overview.test.ts**: 10 tests
- **Total**: 70+ unit tests
