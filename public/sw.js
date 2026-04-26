// ============================================================================
// SERVICE WORKER - PWA Push Notifications (ADR-0014) + Offline Support
// Handles push notifications when app is closed/background
// Provides offline caching for static assets and pages
// ============================================================================

const SW_VERSION = "1.0.0";
const STATIC_CACHE_V1 = "mirrorbuddy-static-v1";
const PAGE_CACHE_V1 = "mirrorbuddy-pages-v1";
const PRECACHE_ASSETS = ["/offline.html"];

// Install event - precache offline page
self.addEventListener("install", (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  event.waitUntil(
    caches
      .open(STATIC_CACHE_V1)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean old caches and claim clients
self.addEventListener("activate", (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  const validCaches = [STATIC_CACHE_V1, PAGE_CACHE_V1];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !validCaches.includes(cacheName))
            .map((cacheName) => {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Push event - show notification
self.addEventListener("push", (event) => {
  console.log(`[SW ${SW_VERSION}] Push received`);

  if (!event.data) {
    console.warn("[SW] Push event but no data");
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error("[SW] Failed to parse push data:", e);
    return;
  }

  const {
    title = "MirrorBuddy",
    body = "",
    icon = "/icons/notification.png",
    badge = "/icons/badge.png",
    tag,
    data: notificationData = {},
    requireInteraction = false,
    actions = [],
  } = data;

  const options = {
    body,
    icon,
    badge,
    tag: tag || `mirrorbuddy-${Date.now()}`,
    data: notificationData,
    requireInteraction,
    actions,
    // Vibrate pattern for mobile (short-long-short)
    vibrate: [100, 50, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click - open app or focus existing window
self.addEventListener("notificationclick", (event) => {
  console.log(
    `[SW ${SW_VERSION}] Notification clicked:`,
    event.notification.tag,
  );

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            // Navigate to the specific URL if provided
            if (event.notification.data?.url) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        // App not open - open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Notification close - track dismissal (optional analytics)
self.addEventListener("notificationclose", (event) => {
  console.log(
    `[SW ${SW_VERSION}] Notification dismissed:`,
    event.notification.tag,
  );

  // Could send analytics here if needed
  // But we keep it simple for privacy
});

// Handle push subscription change (browser may rotate keys)
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log(`[SW ${SW_VERSION}] Push subscription changed`);

  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.VAPID_PUBLIC_KEY,
      })
      .then((subscription) => {
        // Re-register with server
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
      .catch((err) => {
        console.error("[SW] Failed to re-subscribe:", err);
      }),
  );
});

// Fetch event - handle caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API routes: NetworkOnly (never cache API calls)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets (_next/static, icons, images): CacheFirst
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE_V1).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // Pages: NetworkFirst with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PAGE_CACHE_V1).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline.html")),
        ),
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

console.log(`[SW ${SW_VERSION}] Service Worker loaded`);
