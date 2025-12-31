# ADR 0013: Platform Support Handled by Coach

## Status

Accepted

## Date

2025-12-31

## Context

Issue #16 required implementing technical support for platform features (configuration help, troubleshooting, feature discovery). The original design proposed a separate "Support Assistant" character named "Guido" to handle these requests.

However, this approach had several problems:

1. **Character Fragmentation**: Adding a 4th character type (`support_assistant`) broke the clean Triangle of Support architecture (Maestro/Coach/Buddy)
2. **Redundant UX**: Students would need to navigate to a separate "support chat" instead of naturally asking their preferred coach
3. **Maintenance Overhead**: A separate character meant separate prompt engineering, voice configuration, and UI components
4. **User Confusion**: "Who do I ask about this?" becomes harder with more character types

## Decision

**The Coach role is extended to include platform knowledge**, rather than creating a separate support assistant.

### Implementation

1. **Centralized Knowledge Base**: Created `/src/data/app-knowledge-base.ts` containing:
   - All platform features with paths and descriptions
   - Troubleshooting guides
   - Feature usage instructions
   - Version info (updated each release)

2. **Coach Integration**: All 5 coaches (Melissa, Roberto, Chiara, Andrea, Favij) receive `PLATFORM_KNOWLEDGE` injected into their system prompts

3. **Intent Detection**: Added `tech_support` intent type that routes to `coach` (not a separate character)

4. **Cleanup**: Removed:
   - `support_assistant` from `CharacterType`
   - `SupportChat` component and `/src/components/support/` directory
   - `Guido` character from `/src/data/support-assistant.ts`

### Routing Logic

```
Student asks: "Come funziona la voce?"
     |
     v
Intent Detection: type = 'tech_support'
     |
     v
Character Router: characterType = 'coach'
     |
     v
Uses student's preferred coach (from settings)
     |
     v
Coach responds using PLATFORM_KNOWLEDGE
```

## Consequences

### Positive

- **Simpler Architecture**: Triangle of Support remains clean (Maestro/Coach/Buddy)
- **Natural UX**: Students ask their familiar coach, no context switch
- **Single Source of Truth**: One knowledge base updated per release
- **Consistent Voice**: Coach's personality is maintained while answering platform questions
- **Less Code**: No separate components, routes, or character definitions

### Negative

- **Coach Prompt Length**: Adding PLATFORM_KNOWLEDGE increases prompt size (~2KB)
- **Knowledge Updates Required**: Must update `app-knowledge-base.ts` with each release

### Neutral

- **Intent Detection Accuracy**: Must ensure `tech_support` patterns don't false-positive on academic questions about technology/computer science

## Files Changed

| File | Change |
|------|--------|
| `src/data/app-knowledge-base.ts` | Created - centralized platform documentation |
| `src/data/support-teachers.ts` | Added PLATFORM_KNOWLEDGE to all 5 coaches |
| `src/lib/ai/intent-detection.ts` | Added `tech_support` intent type |
| `src/lib/ai/character-router.ts` | Added `tech_support` case routing to coach |
| `src/lib/ai/handoff-manager.ts` | Added `tech_support` to intent map |
| `src/types/index.ts` | Removed `support_assistant` from CharacterType |
| `src/components/settings/settings-view.tsx` | Updated UI to explain coach handles support |

## Files Deleted

| File | Reason |
|------|--------|
| `src/data/support-assistant.ts` | Guido character no longer needed |
| `src/components/support/support-chat.tsx` | Dedicated support chat no longer needed |
| `src/components/support/index.ts` | Export file for deleted component |

## Related

- Issue #16
- ADR 0003: Triangle of Support Architecture
- `/src/data/app-knowledge-base.ts`
