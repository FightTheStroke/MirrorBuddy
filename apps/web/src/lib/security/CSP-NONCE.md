# CSP Nonce Implementation

## Overview

MirrorBuddy implements Content Security Policy (CSP) with nonces to protect against XSS attacks while allowing necessary inline scripts.

## How It Works

1. **Proxy** (`src/proxy.ts`): Generates a unique nonce per request and adds it to the CSP header
2. **Layout** (`src/app/layout.tsx`): Retrieves the nonce and passes it through the React tree
3. **Next.js Hydration**: Automatically applies nonce to framework scripts based on CSP header
4. **Custom Scripts**: Use `NonceScript` component for any custom scripts

## CSP Validation Tests

Run `npm run test:unit -- csp-validation` to validate:

- Domain protocols (all domains must have explicit https://, wss://, etc.)
- Required CSP directives (default-src, script-src with nonce, etc.)
- Third-party provider nonce compliance (ThemeProvider, etc.)
- Dynamic script loading patterns (strict-dynamic support)

## Usage

### For Custom Scripts in Server Components

```typescript
import { getNonce } from '@/lib/security/csp-nonce';
import { NonceScript } from '@/components/nonce-script';

export default async function MyPage() {
  const nonce = await getNonce();

  return (
    <div>
      {/* External script */}
      <NonceScript
        src="https://example.com/script.js"
        nonce={nonce}
        strategy="afterInteractive"
      />

      {/* Inline script */}
      <NonceScript nonce={nonce}>
        {`console.log('This script has a nonce');`}
      </NonceScript>
    </div>
  );
}
```

### For Client Components

Since client components can't call `getNonce()` directly, pass the nonce as a prop from a parent Server Component:

```typescript
// page.tsx (Server Component)
import { getNonce } from '@/lib/security/csp-nonce';
import { MyClientComponent } from './my-client-component';

export default async function Page() {
  const nonce = await getNonce();
  return <MyClientComponent nonce={nonce} />;
}

// my-client-component.tsx (Client Component)
'use client';
import { NonceScript } from '@/components/nonce-script';

export function MyClientComponent({ nonce }: { nonce?: string }) {
  return (
    <NonceScript src="/my-script.js" nonce={nonce} />
  );
}
```

## Next.js Hydration Scripts

Next.js automatically adds nonces to its hydration scripts when:

1. CSP header includes `'nonce-{value}'`
2. The nonce is available in the response

Our middleware and layout configuration ensure this happens automatically.

## CSP Policy

Current policy (from `src/proxy.ts`):

- `script-src 'self' 'nonce-{random}' 'strict-dynamic' 'unsafe-inline'` - Nonce-gated scripts + legacy fallback
- `'strict-dynamic'` - Scripts loaded by approved scripts are automatically trusted
- `'unsafe-inline'` is ignored by modern browsers when a nonce is present

## Security Notes

- Nonces are cryptographically random (16 bytes, base64-encoded)
- New nonce generated per request
- Nonces prevent XSS even if attacker injects HTML
- `'strict-dynamic'` allows dynamically loaded scripts without listing all CDNs

## Common Pitfalls (IMPORTANT)

### 1. Third-Party Providers That Inject Scripts

**Problem**: Libraries like `next-themes` (ThemeProvider) inject inline scripts for theme detection.
If they don't receive the nonce, CSP blocks them and breaks the page.

**Solution**: Always pass `nonce` prop to providers that inject scripts:

```tsx
// CORRECT
<ThemeProvider nonce={nonce}>

// WRONG - will break in production
<ThemeProvider>
```

### 2. Domain Protocol Bugs in CSP Header

**Problem**: Interpolating multiple domains can miss protocols:

```typescript
// BUG: Second domain missing https://
const domains = "*.a.io *.b.io";
`connect-src https://${domains}`;
// Result: "connect-src https://*.a.io *.b.io" ← broken!
```

**Solution**: Explicitly write each domain with its protocol:

```typescript
"connect-src https://*.a.io https://*.b.io";
```

### 3. Dynamic Script Loading

Components like `CodeRunner` and `GooglePicker` use `document.createElement('script')`.
These work because of `'strict-dynamic'` in the CSP. If you remove strict-dynamic, they will break.

## Pre-Commit Checklist

Before committing CSP-related changes:

1. Run `npm run test:unit -- csp-validation`
2. Test the production build locally: `npm run build && npm start`
3. Check browser console for CSP violations
4. Verify theme switching works (ThemeProvider test)
