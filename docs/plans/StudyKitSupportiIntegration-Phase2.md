# Phase 2: Study Kit UI Harmonization

**Parent**: [Main Tracker](./StudyKitSupportiIntegration-Main.md)
**Focus**: Align Study Kit styling with MirrorBuddy design system

---

## CURRENT ISSUES

1. **Hardcoded colors**: blue-50, green-50, purple-50, orange-50 in feature cards
2. **Custom heading styles**: Not using design tokens
3. **Tabs styling**: Default shadcn, not themed
4. **Quiz renderer**: Different from main quiz styling

---

## EXECUTION TRACKER

| Status | ID | Task | Assignee | Files |
|:------:|-----|------|----------|-------|
| ⬜ | T-07 | Replace hardcoded colors with CSS variables | CLAUDE 2 | `src/components/study-kit/StudyKitView.tsx` |
| ⬜ | T-08 | Update headings to use design tokens | CLAUDE 2 | `src/components/study-kit/StudyKitViewer.tsx` |
| ⬜ | T-09 | Theme TabsList with accent colors | CLAUDE 2 | `src/components/study-kit/StudyKitViewer.tsx` |
| ⬜ | T-10 | Align QuizRenderer with main quiz styling | CLAUDE 2 | `src/components/education/knowledge-hub/renderers/quiz-renderer.tsx` |
| ⬜ | T-11 | Update StudyKitList card styling | CLAUDE 2 | `src/components/study-kit/StudyKitList.tsx` |
| ⬜ | T-12 | Replace upload area styling | CLAUDE 2 | `src/components/study-kit/StudyKitUpload.tsx` |
| ⬜ | T-13 | Add responsive breakpoints consistency | CLAUDE 2 | All SK components |

---

## DETAILED SPECIFICATIONS

### T-07: Replace Hardcoded Colors

Current (StudyKitView.tsx lines 94-108):
```tsx
<div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
```

Replace with design tokens:
```tsx
<div className="bg-primary/10 dark:bg-primary/20 border border-primary/30">
```

Or use consistent slate for all cards:
```tsx
<div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
```

### T-08: Heading Design Tokens

Current:
```tsx
<h2 className="text-2xl font-bold text-slate-900 dark:text-white">
```

Use consistent heading class from design system or keep but ensure matches Supporti/Archive headings.

### T-09: Theme Tabs

Add variant prop or custom className:
```tsx
<TabsList className="bg-muted/50 p-1 rounded-lg">
  <TabsTrigger
    value="summary"
    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
  >
```

### T-10: Quiz Renderer Alignment

Compare `quiz-renderer.tsx` with main `/education/quiz` page:
- Match button styles
- Match progress indicator
- Match answer option styling
- Match feedback colors

### T-11: Card Styling Consistency

StudyKitList cards should match archive GridView cards:
- Same rounded corners (rounded-lg vs rounded-xl)
- Same shadow (shadow-sm)
- Same hover states

---

## CHECKPOINT LOG

| Timestamp | Agent | Task | Status | Notes |
|-----------|-------|------|--------|-------|
| - | - | - | - | Awaiting Phase 1 completion |

---

## VERIFICATION

After Phase 2:
1. Open Study Kit page
2. Compare visually with /supporti
3. Toggle dark mode - verify consistency
4. Check responsive behavior at sm/md/lg breakpoints

**Command**: `npm run lint && npm run typecheck && npm run build`
