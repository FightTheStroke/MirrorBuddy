# ADR-0133: PWA Offline Strategy

## Status

Accepted

## Context

MirrorBuddy is a PWA used by students who may have unreliable internet.
We need offline support without adding Workbox as a dependency.

## Decision

Use a native Service Worker with three caching strategies:

- **Pages (navigate requests)**: NetworkFirst with offline fallback chain
- **Static assets** (`_next/static/`, `/icons/`, `/images/`): CacheFirst
- **API calls** (`/api/`): NetworkOnly (never cache)
- **Default**: Network with cache fallback

Additional:

- `offline.html`: Multi-language static page with auto-detect (en, it, fr, de, es)
- SW registration in app providers for immediate activation
- Cache versioning via named caches
- Old cache cleanup on SW activate

## Consequences

- No Workbox dependency (smaller SW, no build step)
- Students see cached pages offline instead of browser error
- Cache invalidation requires SW version bump
