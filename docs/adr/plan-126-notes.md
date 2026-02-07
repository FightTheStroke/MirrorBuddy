# Plan 126 — Production-Ready-Deploy Running Notes

## W2-User-Features

- Decision: PasswordResetToken stored separately from User to avoid schema bloat and support token rotation
- Pattern: Token generation uses secure random string with expiration window (typically 24h)
- Learning: i18n for password reset requires locale param in email service; Resend supports template variables
- Pattern: PWA offline cache strategy must differentiate: pages (NetworkFirst), assets (CacheFirst), API (NetworkOnly)
- Issue: Service Worker registration timing — resolved by deferring registration until app hydration complete
- Decision: offline.html as fallback page better than returning cached error; improves UX for degraded network

## W1-Mobile-Build

- Decision: Separate next.config.mobile.ts for Capacitor builds instead of modifying main config
- Issue: webDir:"out" vs output:"standalone" mismatch — resolved with dual-config approach
- Pattern: Mobile builds use static export, web deployment uses standalone server
