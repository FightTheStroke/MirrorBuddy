# Maestri Rules - MirrorBuddy

## 22 AI Characters: 20 Maestri + 2 Amici

Data: `src/data/maestri/` | Types: `src/data/maestri/types.ts`

## Two Character Types

| Type    | Tools | Teaching | XP                            | Character Immersion |
| ------- | ----- | -------- | ----------------------------- | ------------------- |
| Maestro | Yes   | Yes      | Earns XP                      | Variable (dial)     |
| Amico   | None  | No       | excludeFromGamification: true | 100% always         |

## Formal vs Informal Address (ADR 0064)

- **Formal (Lei)**: Pre-1900 figures -> Add to `FORMAL_PROFESSORS` in `src/lib/greeting/templates/index.ts`
- **Informal (tu)**: Modern figures -> No action (default)

## Adding New Maestro (7 steps)

1. Create knowledge file: `src/data/maestri/{name}-knowledge.ts` (max 200 lines)
2. Create maestro file: `src/data/maestri/{name}.ts` with `getGreeting()`
3. Export from `src/data/maestri/index.ts`
4. Add avatar: `public/maestri/{name}.png`
5. Add subject mapping to `SUBJECT_NAMES` if new subject
6. Set formality: historical -> `FORMAL_PROFESSORS`, modern -> skip
7. Test: `npm run test:unit -- formality && npm run test`

## Character Intensity Dial (ADR 0031)

Full character (greetings) | Reduced (complex concepts) | Override (student stuck 3x)

## Safety: `import { SAFETY_GUIDELINES } from './safety-guidelines'`

## Full reference: `@docs/claude/adding-maestri.md`
