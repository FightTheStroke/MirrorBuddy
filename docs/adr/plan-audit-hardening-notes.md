# Plan 144 — Audit Hardening Notes

Running notes for audit-hardening plan execution.

## W1 — XSS Print/Export Hardening

- **Vulnerability**: `document.write()` in summary PDF export and mindmap print
  used raw template interpolation for user/AI content (topic, title, content, keyPoints).
- **Affected files**:
  - `src/components/tools/auto-save-wrappers.tsx`
  - `src/components/tools/tool-result-display/auto-save-wrappers.tsx`
  - `src/components/tools/markmap/hooks/use-export.ts`
- **Fix**: Import `escapeHtml()` from `@/lib/tools/accessible-print/helpers`
  and wrap all interpolated fields.
- **Already covered**: `accessible-print/renderers.ts` already escapes all
  content fields (20 call sites). `accessible-print.ts` escapes title.
- **Tests**: Added `escaping.test.ts` with 5 integration tests verifying
  XSS payload escaping across mindmap, flashcard, summary, quiz renderers.

## W2 — Visitor ID Validation Hardening

- **Issue**: Simple truthiness check on visitorId cookie — any non-empty string
  accepted, including malformed values.
- **Affected files**:
  - `src/app/api/tools/events/route.ts`
  - `src/app/api/tools/stream/modify/route.ts`
- **Fix**: Import `validateVisitorId()` from `@/lib/auth/cookie-constants`
  which validates UUID v4 format. Returns 400 on invalid format.
- **Pattern**: `rawVisitorId` → `validateVisitorId(rawVisitorId)` → null check.

## W3 — Documentation Alignment

- **Tier.md**: Updated Trial from 10/mo to 10/day, Base from Unlimited to 50/day
  chat + 30 min/day voice. Aligned with `prisma/seed-tiers.ts`.
- **i18n paths**: Replaced `public/locales/` → `messages/{locale}/` in README,
  RUNBOOK, I18N-RUNBOOK. Reflects next-intl namespace structure (ADR 0082).
- **Proxy refs**: Replaced `middleware.ts` → `src/proxy.ts` in ARCHITECTURE.md
  and feature-flags/README.md. Aligns with ADR 0066.
- **ADR 0080**: Added Section 9 "XSS Print/Export Hardening" documenting
  vulnerability, affected files, fix, and pattern established.

## W4 — Performance & Storage Review

- **mathjs lazy-load**: Removed top-level `import { evaluate } from 'mathjs'`
  in both calculator components. Now uses `await import('mathjs')` on demand.
  Scientific calculator caches module via `useRef` to avoid re-importing.
- **localStorage review**: `mirrorbuddy-trial-session-id` in localStorage is
  intentional — trial verification needs persistence across tabs/reloads during
  email verification. Server validates independently. Added clarifying comment.
