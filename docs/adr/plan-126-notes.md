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

## W3-Gamification-Security

### Achievements System Architecture

- **Grid Component**: Reusable achievements grid with filtering by rarity/category and infinite scroll pagination
- **Streak Visualization**: Calendar heatmap uses CSS grid with color intensity mapping (0-5 contribution levels)
- **Progress Tracking**: XP/level system stored in UserGamification model with monthly reset for streaks
- **Decision**: Achievement notifications as toast (unobtrusive) rather than modal (interrupts flow)
- **Pattern**: useAchievementChecker hook handles polling via interval, cleans up on unmount to prevent memory leaks

### i18n for Gamification

- **Namespace**: achievements namespace in translation config to scope all achievement-related keys
- **5 Locales**: All achievement names, descriptions, and unlock messages translated (it, en, fr, de, es)
- **Pattern**: useTranslation hook in components with t('achievements.unlock_message') pattern
- **Issue**: Plural forms in achievement names (e.g., "Streak x5", "Streak x10") handled via i18n plural rules per language

### HTML Sanitization Strategy

- **DOMPurify**: npm package for browser sanitization (configurable allowlist for `<b>`, `<i>`, `<strong>`, `<em>`, links)
- **isomorphic-dompurify**: Enables server-side sanitization for Next.js (API routes, SSR rendering)
- **sanitize.ts Wrapper**: Single entry point with consistent defaults: allows formatting tags + links, strips scripts/forms/iframes
- **Decision**: Whitelist over blacklist approach (safer, explicit about what's allowed)
- **Performance**: DOMPurify cached per unique content to avoid repeated sanitization on re-renders

### Mobile Navigation Integration

- **Trophy Icon**: Added to mobile bottom navigation bar with conditional render (show only for Pro+ tiers)
- **Badge Support**: Unachieved count badge on trophy icon (red dot) to prompt engagement
- **Navigation Flow**: Tapping trophy navigates to `/achievements` with smooth page transition
- **Responsive**: Trophy icon maintains consistent spacing with other nav items across device sizes
