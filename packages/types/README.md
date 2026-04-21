# @mirrorbuddy/types

Shared TypeScript types for the MirrorBuddy workspace. Runtime-free;
imports nothing from Node, React, Next.js, Prisma, or any other runtime
dependency.

## Scope

This package is the single source of truth for domain contract types
that cross package boundaries. If a type is consumed by only one
package (`apps/web`), keep it local to that package. If it's shared
— or will be shared once W3 extraction completes — it belongs here.

**Allowed**: pure TypeScript `type`, `interface`, `enum`, union, and
constant-literal exports.

**Not allowed**: runtime imports (`import { ... } from 'react'`,
`from '@prisma/client'`, etc.). The `exports` map in `package.json`
points directly at source TS files; a runtime import would leak into
consumers' bundles.

## Exported modules

| Module | Types |
|---|---|
| `user` | `Curriculum`, `SchoolLevel`, `StudentProfile`, `Theme`, `AIProvider`, `Settings` |
| `content` | `Subject`, `Maestro`, `MaestroVoice` |
| `education` | `Question`, `Quiz`, `Flashcard`, `FlashcardDeck`, `Homework`, `CardState`, `Rating`, `QuestionType`, `QuizResult`, `HomeworkStep` |
| `gamification` | `MasteryTier`, `SubjectMastery`, `Streak`, `Achievement`, `Progress`, `Season`, `SeasonName`, `SeasonHistory`, `Grade`, `GradeType` |
| `learning-path` | `TopicStatus`, `TopicStepType`, `TopicDifficulty`, `TopicStep`, `LearningPathTopic`, `StepContent`, `OverviewContent`, `MindmapContent`, `FlashcardContent`, `QuizContent` |

(Subsequent batches add: adaptive-difficulty, audio, conversation,
parent, parent-dashboard, tier-types, unified-chat-view, and
characters/greeting/voice/tier-definition/tier-subscription/
unified-chat-config-factory once their app-layer dependencies are
refactored out.)

## Usage

```ts
// Preferred: import from the package
import type { Curriculum, Settings, Flashcard } from '@mirrorbuddy/types';

// Also works during W1b transition — src/types/*.ts shims re-export
// everything from @mirrorbuddy/types so legacy @/types paths keep
// resolving.
import type { Flashcard } from '@/types/education';
```

## Adding a new type

1. Decide: is it shared (cross-package) or app-local? If app-local,
   keep it in `apps/web/src/` (or `src/` during W1b). If shared,
   continue.
2. Add the file under `packages/types/src/<domain>.ts`. No runtime
   imports — only `type`, `interface`, `enum`, string-literal unions.
3. Update `packages/types/src/index.ts` to re-export the new module
   with `export * from './<domain>';`.
4. If an existing file in `apps/web/src/types/<domain>.ts` already
   exists with the same content, replace its contents with the shim
   `export * from '@mirrorbuddy/types';` to preserve `@/types/<domain>`
   import paths throughout the app.
5. Run `pnpm install` (regenerates pnpm-lock.yaml) then
   `pnpm run ci:summary` to verify lint + typecheck + build pass.

## Testing

Runtime-free packages don't need runtime tests. When a type needs
structural verification, add `tsd` / `expect-type` assertions
alongside the module (e.g. `src/education.type-tests.ts`). These are
picked up by `tsc --noEmit` as part of the standard typecheck.

## Versioning

Internal package — not published to npm. Version in `package.json`
tracks contract-breaking changes so consumers can spot them during
code review; bump the minor on additive changes and the major on
removals or rename-in-place. No formal changelog yet — rely on git
history via `git log packages/types/`.

## Relationship to `apps/web/src/types/`

During the W1b transition the original `src/types/*.ts` files live on
as **shims** containing only `export * from '@mirrorbuddy/types';`.
This keeps all `@/types/<name>` import paths resolving while consumers
gradually switch to the package import. Once every consumer uses
`@mirrorbuddy/types` directly, the shims can be deleted in a single
PR (planned for the W2 app-move wave).
