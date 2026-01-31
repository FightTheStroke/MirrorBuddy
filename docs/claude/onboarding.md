# Onboarding

> Voice-first onboarding flow with Coach Melissa for new student registration

## Quick Reference

| Key   | Value                                                           |
| ----- | --------------------------------------------------------------- |
| Path  | `src/components/onboarding/`, `src/lib/voice/onboarding-tools/` |
| Store | `src/lib/stores/onboarding-store.ts`                            |
| API   | `GET /api/onboarding`, `POST /api/onboarding`                   |
| Entry | `/welcome` page                                                 |
| Voice | Coach Melissa via Azure Realtime API                            |

## Architecture

The onboarding flow is voice-first: Coach Melissa guides students through registration via real-time voice conversation. The system uses Azure OpenAI function calling to extract student data (name, age, school level, learning differences) during natural conversation. A text fallback form is available when Azure is unavailable.

State is managed via Zustand (`useOnboardingStore`) and persisted to the database via `/api/onboarding`. The store hydrates from the API on mount (`hydrateFromApi`). A single voice connection persists across all onboarding steps -- the parent page creates the session and passes a `VoiceSessionHandle` to `VoiceOnboardingPanel`.

Melissa uses `far_field` noise reduction to prevent echo loops when audio plays through laptop speakers, allowing barge-in without disabling it entirely.

## Onboarding Steps

| Step          | Key          | Description                              |
| ------------- | ------------ | ---------------------------------------- |
| 1. Welcome    | `welcome`    | Melissa intro, asks student name         |
| 2. Info       | `info`       | Optional: age, school level, DSA profile |
| 3. Principles | `principles` | MirrorBuddy core values                  |
| 4. Maestri    | `maestri`    | Carousel of available AI tutors          |
| 5. Ready      | `ready`      | Final CTA to start learning              |

## Collected Data

```typescript
interface OnboardingData {
  name: string; // Required (step 1)
  age?: number; // Optional (step 2)
  schoolLevel?: "elementare" | "media" | "superiore";
  learningDifferences?: string[]; // DSA profile selection
  gender?: "male" | "female" | "other";
}
```

## Key Files

| File                                                   | Purpose                              |
| ------------------------------------------------------ | ------------------------------------ |
| `src/components/onboarding/voice-onboarding-panel.tsx` | Main voice panel component           |
| `src/lib/voice/onboarding-tools/tool-definitions.ts`   | Melissa's function-calling tools     |
| `src/lib/voice/onboarding-tools/prompt-generator.ts`   | Melissa's system prompt              |
| `src/lib/voice/onboarding-tools/tool-handlers.ts`      | Tool execution (set name, age, etc.) |
| `src/lib/stores/onboarding-store.ts`                   | Zustand state + API hydration        |
| `src/lib/stores/onboarding-types.ts`                   | Step types + ordering                |
| `src/components/onboarding/onboarding-transcript.tsx`  | Voice transcript display             |

## Code Patterns

```typescript
// Store usage
import { useOnboardingStore } from "@/lib/stores/onboarding-store";

const { currentStep, data, nextStep, updateData, completeOnboarding } =
  useOnboardingStore();

// Hydrate from DB on mount
useEffect(() => {
  useOnboardingStore.getState().hydrateFromApi();
}, []);

// Voice tools (Melissa extracts data via function calling)
import {
  ONBOARDING_TOOLS,
  executeOnboardingTool,
} from "@/lib/voice/onboarding-tools";
// Tools: set_student_name, set_student_age, set_school_level, set_learning_differences
```

## Replay Mode

Completed users can replay onboarding via Settings. `startReplay()` resets `currentStep` to `welcome` while keeping `hasCompletedOnboarding: true` and setting `isReplayMode: true`.

## See Also

- `docs/claude/voice-api.md` -- Azure Realtime API details
- `.claude/rules/accessibility.md` -- 7 DSA profiles available during onboarding
- `.claude/rules/cookies.md` -- `mirrorbuddy-onboarding` localStorage key for wall bypass
