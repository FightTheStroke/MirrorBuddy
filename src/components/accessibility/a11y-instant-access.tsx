"use client";

/**
 * A11y Instant Access - Client-Only Wrapper
 * Container component combining the floating button and quick settings panel
 *
 * IMPORTANT: This component must be rendered inside LocaleProvider
 * (i.e., under [locale]/layout.tsx) because it uses useTranslations.
 * Do NOT render this in the root Providers component.
 *
 * Note: Rendered client-only to prevent hydration mismatch with server rendering
 */

import dynamic from "next/dynamic";

// Client-only import to prevent SSR hydration mismatch
const A11yInstantAccessClient = dynamic(
  () => import("./a11y-instant-access-client"),
  { ssr: false },
);

export function A11yInstantAccess() {
  return <A11yInstantAccessClient />;
}
