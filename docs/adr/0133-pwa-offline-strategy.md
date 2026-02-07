# ADR-0133: PWA Offline Strategy with Native Service Worker

**Status:** Accepted
**Date:** 2026-02-07
**Context:** Plan 125 WF-Documentation

## Decision

Implement offline-first PWA using native Service Worker API (no external library) with three distinct caching strategies: NetworkFirst for pages, CacheFirst for static assets, and NetworkOnly for API calls. Fallback to cached versions and offline.html for degraded experience.

## Rationale

- Native Service Worker API avoids external dependency (Workbox) complexity
- Tiered caching strategy optimizes for different content types
- NetworkFirst for pages ensures freshness while providing cached fallback
- CacheFirst for static assets leverages CDN/long-term caching
- NetworkOnly for API prevents stale data serving (critical for real-time features)
- Offline.html provides user feedback when network unavailable
- Multi-language offline.html with auto-detect improves accessibility

## Implementation

### Service Worker Registration

```javascript
// public/service-worker.js
const CACHE_VERSION = "v1-" + Date.now();

// Cache names by strategy
const CACHES_CONFIG = {
  pages: `pages-${CACHE_VERSION}`,
  assets: `assets-${CACHE_VERSION}`,
};

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHES_CONFIG.assets).then((cache) => {
      return cache.addAll([
        "/_next/static/**",
        "/icons/**",
        "/images/**",
        "/offline.html",
      ]);
    }),
  );
});
```

### Caching Strategies

**NetworkFirst (Pages):**

- Fetch from network first
- Fall back to cache if network fails
- Fall back to offline.html if neither available
- Update cache with fresh response

**CacheFirst (Static Assets):**

- Check cache first
- Fetch from network only if not in cache
- Cache new resources automatically
- Applies to `/_next/static`, `/icons`, `/images`

**NetworkOnly (API):**

- Always attempt network fetch
- Fail fast if offline
- No caching layer
- Returns error to client for graceful handling

### Multi-Language Offline Page

```html
<!-- /public/offline.html (auto-detect via Accept-Language) -->
<html>
  <head>
    <script>
      const lang = navigator.language.split("-")[0];
      const messages = {
        en: "You appear to be offline.",
        it: "Sei attualmente offline.",
        es: "Pareces estar sin conexión.",
      };
      document.body.textContent = messages[lang] || messages.en;
    </script>
  </head>
</html>
```

### Lifecycle Management

- Install: Pre-cache critical assets (icons, offline.html)
- Activate: Clean old cache versions on new deployment
- Fetch: Route requests to appropriate strategy handler
- Background Sync: Retry failed API calls when online (optional enhancement)

## Key Patterns

- Service Worker registered in next.config.js with `next-pwa` or custom registration
- Cache keys versioned to enable clean cache purge on deployment
- Offline.html in public root (accessible without routing)
- API calls intentionally bypass cache (NetworkOnly prevents stale mutations)
- Error boundaries catch offline errors for graceful UI feedback

## Consequences

- Full offline experience for cached pages and assets
- Users can navigate MirrorBuddy features when offline
- Data mutations fail fast, preventing confusion (no false success)
- Requires testing on low-bandwidth/offline simulators
- Cache size grows over time (set quota monitoring in place)
- Browser storage limits apply per domain (~50MB)
