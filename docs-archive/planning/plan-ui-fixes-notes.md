# Plan 119: UI Fixes 10 Bugs - Running Notes

## W1: Header-Sidebar

### Decisions

- **Radix DropdownMenu**: Selected for user menu implementation due to built-in accessibility (WCAG 2.1 AA compliant)
- **Hamburger icon**: Replaced chevron with standard hamburger menu for better mobile UX and clearer affordance
- **Header reorganization**: Greeting moved to right side to balance visual weight and improve left-to-right reading flow

### Patterns

- **i18n workflow**: Keys added in Italian first, then synced to all 5 locales using `i18n-sync-namespaces.ts`
- **Component structure**: UserMenuDropdown as standalone component for reusability across authenticated layouts

### Implementation Notes

- Dropdown items: Profile, Change Password, Settings, Logout
- Each item has proper i18n keys in `messages/{locale}/common.json`
- Keyboard navigation fully supported (Tab, Enter, Escape, Arrow keys)

---

## W2: Chat-Layout

### Decisions

- **SharedChatLayout**: Slot-based component architecture for maximum flexibility
  - Slots: header, footer, children (messages), rightPanel (voice/tools)
- **Fixed viewport**: h-dvh with h-screen fallback for true full-height layout on mobile Safari
- **Mobile-first voice**: MobileVoiceOverlay as bottom-sheet instead of sidebar for better mobile ergonomics

### Patterns

- **Slot props**: Accept ReactNode slots rather than prescribing specific components
- **Scroll behavior**: Fixed header/footer with scrollable message container (overflow-y-auto)
- **Responsive breakpoints**: Desktop shows rightPanel, mobile shows MobileVoiceOverlay on toggle

### Issues Resolved

- **MobileVoiceOverlay**: Body scroll lock implemented via useEffect cleanup to prevent background scrolling
- **Layout shift**: Removed min-h-screen from home page to prevent double scrollbar
- **Padding**: Added pt-14 to account for fixed header height

### Implementation Notes

- MaestroSession refactored from custom layout to SharedChatLayout
- CharacterChatView refactored for consistency
- Voice panel state managed via Zustand store (useVoiceStore)

---

## W3: Webcam-Astuccio

### Issues Resolved

- **Webcam viewport**: aspect-video CSS pushed capture button off viewport → replaced with w-full h-full
  - Root cause: Fixed aspect ratio didn't account for device camera constraints
  - Solution: Full width/height allows camera stream to fill available space naturally

### Decisions

- **Simplified tool flow**: Skip subject selection, go directly tool → professor selection → activate tool
  - Reduces cognitive load and clicks (3 steps → 2 steps)
  - Users selecting a tool already know what subject they need
- **URL-based activation**: ?tool= query param enables direct deep linking to tools

### Patterns

- **Query params**: useSearchParams() to read ?tool= on maestro page mount
- **Auto-activation**: If ?tool= present, immediately trigger tool selection dialog with that tool
- **Navigation**: Astuccio uses router.push with query string appended

### Implementation Notes

- ToolMaestroSelectionDialog now shows professor cards directly
- Removed intermediate SubjectSelectionStep component
- Webcam controls fully visible within viewport bounds

---

## W4: Auth-Consent

### Issues Resolved

- **Login redirect loop**: router.push caused back-button to return to login page
  - Root cause: Browser history stack kept login page
  - Solution: router.replace removes login from history

### Decisions

- **Consent banner**: Slim bottom banner instead of fullscreen modal
  - GDPR compliant (requires explicit consent)
  - User-friendly (non-blocking, clear action)
  - One-click acceptance flow
- **Login redesign**: Modern card-based layout with LogoBrain and gradient background
  - Improved brand consistency
  - Better visual hierarchy

### Patterns

- **PUBLIC_PATHS**: Array-based configuration for auth bypass routes
  - /login, /change-password, /invite added
  - Middleware checks against this array before redirecting
- **Router strategy**: Use replace for auth redirects, push for navigation

### Implementation Notes

- UnifiedConsentWall repositioned to bottom with fixed positioning
- Consent state persisted via cookie (mirrorbuddy-consent)
- Login page uses Card from shadcn/ui for modern aesthetic

---

## W5: Data-Integrity

### Verification Performed

- **Admin dashboard audit**: All KPI cards verified to use real Prisma queries
  - Total users: COUNT from User table
  - Active sessions: COUNT from ConversationSession with activeAt filter
  - Subscription metrics: COUNT from UserSubscription with status filter
- **No placeholder data**: Confirmed zero hardcoded/fake numbers

### Decisions

- **Database-first storage**: Zustand + REST pattern for cross-device persistence
  - Client state (Zustand) mirrors server state (PostgreSQL)
  - Sync via API calls on mount and mutation
  - NO localStorage for user data (ADR 0015)

### Patterns

- **Admin data flow**: Server Component → Prisma query → props → Client Component
- **Session persistence**: ConversationSession table as source of truth
- **Cross-device**: User logs in on device B, sees same sessions as device A

### Implementation Notes

- Admin navigation links verified functional
- All routes under /admin/\* properly authenticated via middleware
- No broken links or 404s in admin panel

---

## Key Takeaways

### Technical Patterns Established

1. **Slot-based layouts**: More flexible than prop-heavy components
2. **Router.replace for auth**: Prevents back-button loops
3. **Query params for state**: Enables deep linking and shareable URLs
4. **i18n-first**: Add Italian keys, sync to other locales via script

### UX Improvements

1. **Simplified flows**: Removed unnecessary steps (subject selection)
2. **Consistent layouts**: SharedChatLayout unifies chat experience
3. **Mobile-first voice**: Bottom-sheet more natural than sidebar on mobile
4. **Clear consent**: Slim banner less intrusive than modal

### Quality Standards

1. **Real data only**: No placeholder/fake data in production UI
2. **Database persistence**: Cross-device sync via PostgreSQL
3. **Accessibility**: Radix primitives for WCAG 2.1 AA compliance
4. **i18n coverage**: All 5 locales for every new UI text

---

**Plan Status**: All 5 waves completed
**Last Updated**: 2026-02-05
