# Proxy Architecture Rules - MirrorBuddy

## Single Proxy File (Next.js 16)

**CRITICAL**: Only ONE `proxy.ts` file must exist in the project.

### Correct Location

```
src/proxy.ts    ← ONLY valid location (app is in src/)
```

### NEVER Create These

```
proxy.ts        ← ROOT level - FORBIDDEN
middleware.ts   ← Deprecated in Next.js 16
```

### Why This Matters

If TWO proxy.ts files exist, Next.js uses the ROOT one and ignores `src/proxy.ts`. This causes:

- API routes → 307 redirect → `/it/api/*` → 404
- Images → 307 redirect → `/it/*.png` → 404
- Complete application failure

### Export Requirement

```typescript
// CORRECT - Default export required
export default function proxy(request: NextRequest) {
  // ...
}

// WRONG - Named export won't work
export function proxy(request: NextRequest) {
  // ...
}
```

### Pre-Push Verification

The pre-push hook automatically checks:

```bash
# Must return ONLY ./src/proxy.ts
find . -name "proxy.ts" -not -path "./node_modules/*"
```

If root `proxy.ts` exists, push is BLOCKED.

### Path Exclusion Logic

The proxy MUST skip i18n for:

- `/api/*` - API routes
- `/admin/*` - Admin routes
- `/_next/*` - Next.js internals
- `/monitoring` - Sentry tunnel
- Static files (`.png`, `.webp`, `.svg`, etc.)
- `/maestri/*`, `/avatars/*`, `/logo*` - Image directories

### Reference

- ADR 0066: Section 9 - Single Proxy File Location
- Next.js docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
