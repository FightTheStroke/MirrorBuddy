# Plan 125: Technical Perfection — Running Notes

## W1: Mobile (Capacitor Native Shell)

- Decision: Capacitor over Expo/React Native for maximum code reuse (same Next.js codebase)
- Pattern: media-bridge abstraction for native/web camera+mic (single API surface)
- Pattern: capacitor-push.ts detects environment and routes to native or web push
- Insight: Capacitor webDir needs to point to Next.js standalone output (out/)
