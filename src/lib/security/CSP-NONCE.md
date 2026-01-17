# CSP Nonce Implementation

## Overview

MirrorBuddy implements Content Security Policy (CSP) with nonces to protect against XSS attacks while allowing necessary inline scripts.

## How It Works

1. **Middleware** (`src/middleware.ts`): Generates a unique nonce per request and adds it to the CSP header
2. **Layout** (`src/app/layout.tsx`): Retrieves the nonce and passes it through the React tree
3. **Next.js Hydration**: Automatically applies nonce to framework scripts based on CSP header
4. **Custom Scripts**: Use `NonceScript` component for any custom scripts

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

Current policy (from `src/middleware.ts`):

- `script-src 'self' 'nonce-{random}' 'strict-dynamic'` - Only allow scripts with nonce or loaded by nonce-approved scripts
- `'strict-dynamic'` - Scripts loaded by approved scripts are automatically trusted
- No `'unsafe-inline'` - Blocks all inline scripts without nonce

## Security Notes

- Nonces are cryptographically random (16 bytes, base64-encoded)
- New nonce generated per request
- Nonces prevent XSS even if attacker injects HTML
- `'strict-dynamic'` allows dynamically loaded scripts without listing all CDNs
