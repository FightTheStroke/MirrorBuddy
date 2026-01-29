# Coaches & Buddies Rules - MirrorBuddy

## Support Triangle

| Role  | Purpose                   | Relationship | Data Location                |
| ----- | ------------------------- | ------------ | ---------------------------- |
| Coach | Learning method, autonomy | Vertical     | `src/data/support-teachers/` |
| Buddy | Emotional support, peer   | Horizontal   | `src/data/buddy-profiles/`   |

## Coaches (6): Melissa, Roberto, Chiara, Andrea, Favij, Laura

## Buddies (6): Mario, Noemi, Enea, Bruno, Sofia, Marta

## Adding New Coach/Buddy - ALL 8 locations required

1. Create data file in respective directory (include `getGreeting()` - ADR 0064)
2. Export from index file (import, type, map, array, exports)
3. Settings UI: `character-settings-data.ts`
4. Settings types: `character-settings.tsx`
5. Home constants: `home-constants.ts`
6. Store types: `settings-types.ts`
7. Chat view: `character-chat-view.tsx`
8. Avatar: `public/avatars/{name}.webp`

Coaches/buddies always use informal (tu) - no FORMAL_PROFESSORS update.

## Verification

```bash
npm run test:unit -- character-consistency
npm run typecheck && npm run build
```

## Full reference: `@docs/claude/coaches.md` | `@docs/claude/buddies.md`
