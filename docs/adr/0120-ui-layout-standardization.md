# ADR 0120: UI Layout Standardization

**Status**: Accepted
**Date**: 2026-02-05
**Context**: Plan 119 - UI Fixes 10 Bugs

## Decision

**Slot-Based Chat Layout Architecture**: Adopted SharedChatLayout component with slot-based composition (header, footer, children, rightPanel). This pattern provides maximum flexibility for chat interfaces without prescribing specific implementations. The layout handles fixed header/footer positioning with scrollable message containers, and responsive breakpoints that show rightPanel on desktop or MobileVoiceOverlay on mobile.

**Viewport Height Strategy**: Implemented h-dvh (dynamic viewport height) with h-screen fallback for true full-height layouts. Mobile Safari's collapsing address bar caused layout issues with traditional vh units; dvh solves this by accounting for browser chrome changes. The fallback ensures compatibility with older browsers that don't support dvh.

**Mobile Voice Ergonomics**: Replaced sidebar-based voice panel with MobileVoiceOverlay using bottom-sheet pattern. Bottom sheets are more natural on mobile (thumb-reachable) and include body scroll lock to prevent background scrolling during voice sessions. Voice panel state managed via Zustand store (useVoiceStore) for consistency across components.

**Webcam Layout Fix**: Changed webcam container from aspect-video (fixed 16:9 ratio) to w-full h-full. The fixed aspect ratio pushed capture controls off viewport on devices with non-standard camera ratios. Full width/height allows the camera stream to fill available space naturally while keeping controls visible.

**Simplified Tool Flow**: Redesigned Astuccio (toolbox) to go directly from tool selection → professor selection, skipping the intermediate subject selection step. Users selecting a tool already know their subject, reducing cognitive load from 3 steps to 2. Implemented URL-based activation via ?tool= query param, enabling direct deep linking to tools and auto-activation on page mount.

**Auth Redirect Strategy**: Standardized on router.replace for authentication redirects instead of router.push. Push kept login pages in browser history, causing back-button loops. Replace removes the login page from history stack, providing expected post-login navigation behavior.

**Consent Banner Redesign**: Moved consent interface from fullscreen modal to slim bottom banner with fixed positioning. Maintains GDPR compliance (explicit consent required) while being less intrusive and providing one-click acceptance flow. Consent state persisted via mirrorbuddy-consent cookie.

## Consequences

### Positive

- **Unified chat experience**: SharedChatLayout provides consistent structure across MaestroSession and CharacterChatView
- **Mobile Safari support**: h-dvh eliminates layout shifting when address bar collapses
- **Better mobile voice UX**: Bottom-sheet pattern is thumb-reachable and more natural than sidebar
- **Viewport-safe webcam**: Controls always visible regardless of device camera aspect ratio
- **Reduced friction**: Tool flow simplified from 3 clicks to 2, improving user efficiency
- **No auth loops**: router.replace prevents back-button returning to login page
- **Non-blocking consent**: Slim banner allows browsing while making privacy choice visible
- **Deep linking**: ?tool= param enables shareable tool activation URLs

### Negative

- **Migration effort**: Required refactoring MaestroSession and CharacterChatView to adopt SharedChatLayout
- **Slot pattern discipline**: Developers must understand slot-based composition vs props-heavy components
- **Browser compatibility**: h-dvh not supported in browsers pre-2023 (mitigated by h-screen fallback)
- **Query param fragility**: ?tool= state can be lost on page refresh (acceptable for tool selection use case)

### Risks

- **Layout regressions**: Changes to SharedChatLayout affect all chat interfaces; requires E2E testing
- **Scroll lock bugs**: Body scroll lock on MobileVoiceOverlay must properly cleanup on unmount
- **Deep link breakage**: ?tool= param handling must validate tool existence before auto-activation
- **Consent dismissal**: Users might click Accept too quickly; mitigated by clear banner copy

## Implementation Notes

**Components Modified**:

- SharedChatLayout: New slot-based layout component with header/footer/children/rightPanel slots
- MobileVoiceOverlay: New bottom-sheet component with scroll lock and voice controls
- MaestroSession: Refactored to use SharedChatLayout
- CharacterChatView: Refactored to use SharedChatLayout
- ToolMaestroSelectionDialog: Removed SubjectSelectionStep, shows professor cards directly
- UnifiedConsentWall: Repositioned to bottom with fixed positioning
- Login page: Redesigned with Card component and LogoBrain branding

**Patterns Established**:

- Slot-based layouts preferred over prop-heavy components for flexibility
- router.replace standard for auth redirects, router.push for navigation
- Query params for shareable state (enables deep linking)
- h-dvh with h-screen fallback for full-height layouts
- Bottom-sheet pattern for mobile-first overlays

**Verification**:

- E2E tests pass for chat flows on desktop and mobile viewports
- Webcam controls visible in Chrome/Safari/Firefox across devices
- Auth redirect no longer creates back-button loop
- ?tool= param triggers tool selection dialog with correct tool pre-selected

## References

- Plan 119 running notes: `docs/adr/plan-ui-fixes-notes.md`
- Related ADRs:
  - ADR 0015: Database-First Architecture (database persistence patterns)
  - ADR 0016: Component Modularization (component structure principles)
  - ADR 0066: Multi-Language i18n Architecture (i18n workflow for new UI text)
