# ADR-0128: Capacitor Mobile Architecture

**Status:** Accepted
**Date:** 2026-02-06
**Context:** Plan 125 W1-Mobile

## Decision

Use Capacitor (not Expo/React Native) to wrap the existing Next.js app as native iOS/Android.

## Rationale

- Maximum code reuse: same Next.js codebase runs in WebView
- No framework migration: existing React components work unchanged
- Native APIs available via Capacitor plugins (camera, mic, push)
- Smaller team overhead: one codebase, not two

## Architecture

```
Next.js (Web) --> Capacitor WebView --> iOS/Android Native Shell
                      |
                      v
              capacitor.config.ts (webDir: "out/")
              |        |         |
     push-notifications  camera   microphone
     (capacitor-push.ts) (media-bridge.ts)
```

## Key Patterns

- `media-bridge.ts`: Abstraction that detects native vs web and routes to appropriate API
- `capacitor-push.ts`: Environment-aware push notification handler
- Build scripts: `cap:build:ios`, `cap:build:android` in package.json
- `webDir` points to Next.js standalone output

## Trade-offs

- WebView performance slightly lower than true native
- Some native-specific UX patterns not available
- App Store review may be slower for WebView apps
- Accepted because: team is solo founder with AI agents, code reuse is critical

## References

- Plan 125 W1 tasks T1-01 through T1-06
- Capacitor docs: https://capacitorjs.com/
