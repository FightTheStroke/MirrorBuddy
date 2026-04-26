# UI Components — MirrorBuddy

React components. Server-first (Next 16 App Router). See root + `.claude/rules/accessibility.md`, `.claude/rules/i18n.md`.

## Server vs Client

- Default: server component (no `"use client"`, no hooks, no event handlers).
- `"use client"` ONLY when: state/hooks/browser APIs/event handlers required.
- Server fetches data, client renders interactivity.

## i18n (MANDATORY — ESLint enforces)

```tsx
// Client
import { useTranslations } from 'next-intl';
const t = useTranslations('ns');

// Server
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('ns');
```

- NO hardcoded user-facing text (italian/english/etc.) — ESLint `no-hardcoded-italian` blocks.
- camelCase keys only (ADR 0091).
- Add keys IT first → `npx tsx scripts/i18n-sync-namespaces.ts --add-missing` → `npm run i18n:check`.
- Namespace wrapper key (ADR 0104): JSON MUST wrap content under filename key.

## Accessibility (WCAG 2.1 AA — 7 DSA profiles)

- Contrast 4.5:1 normal / 3:1 large.
- Visible focus indicators.
- Full keyboard nav (Tab/Enter/Escape).
- Respect `prefers-reduced-motion`.
- TTS-friendly content order.
- Test with `useAccessibilityStore` profiles.

## State

- `Zustand` stores under `@/lib/stores/`. NO localStorage.
- Server state via REST + SWR/fetch in server components.

## Forms / Dialogs

- `<Dialog>` (NOT `window.confirm`/`alert`) for destructive ops.
- `toast()` from sonner for feedback.
- Zod + react-hook-form for validation.

## CSP

Inline scripts must use nonces (see `src/components/providers.tsx`). "Caricamento..." stuck = CSP violation.

## File layout

- `kebab-case.tsx` filenames, PascalCase exports.
- Co-locate tests: `component.test.tsx` next to `component.tsx`.
