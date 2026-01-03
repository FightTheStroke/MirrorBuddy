# Phase 4: Cross-cutting Concerns

**Parent**: [Main Tracker](./StudyKitSupportiIntegration-Main.md)
**Focus**: Accessibility, Demo functionality, final polish

---

## CURRENT ISSUES

1. **Demo button**: Shows "non disponibile" when no code
2. **Accessibility settings**: May not apply to SK/Supporti
3. **Dark mode**: Verify all components respect theme
4. **Typography**: Ensure design tokens used consistently

---

## EXECUTION TRACKER

| Status | ID | Task | Assignee | Files |
|:------:|-----|------|----------|-------|
| ⬜ | T-19 | Fix Demo button when code exists | CLAUDE 3 | `src/components/education/knowledge-hub/renderers/demo-renderer.tsx` |
| ⬜ | T-20 | Verify accessibility settings apply to SK | CLAUDE 3 | `src/components/study-kit/*.tsx` |
| ⬜ | T-21 | Verify accessibility settings apply to Supporti | CLAUDE 3 | `src/app/supporti/components/*.tsx` |
| ⬜ | T-22 | Final visual QA and polish | CLAUDE 3 | All modified files |

---

## DETAILED SPECIFICATIONS

### T-19: Demo Button Fix

Current logic in demo-renderer.tsx:
```typescript
const demoCode = useMemo(() => buildDemoCode(demoData, accessibilityCSS), [demoData, accessibilityCSS]);
const hasCode = !!demoCode;
```

Issues to check:
1. Is `demoData.code` populated by Study Kit generator?
2. Does `buildDemoCode` return null for valid STEM demos?
3. Add logging to debug why demos show "non disponibile"

If SK generates demos differently, update buildDemoCode to handle SK format:
```typescript
function buildDemoCode(data: DemoData, accessibilityCSS: string): string | null {
  // Handle Study Kit format
  if (data.html || data.code) {
    return `
      <style>${accessibilityCSS}${data.css || ''}</style>
      ${data.html || data.code}
      <script>${data.js || ''}</script>
    `;
  }
  return null;
}
```

### T-20 & T-21: Accessibility Verification

Check that these CSS classes apply correctly:
- `.dyslexia-font` - Font family change
- `.dyslexia-spacing` - Letter spacing
- `.large-text` - Font size increase
- `.high-contrast` - Color adjustments
- `.reduced-motion` - Animation disabling

Test by:
1. Enable dyslexia font in settings
2. Navigate to /study-kit
3. Verify font changes
4. Navigate to /supporti
5. Verify font changes

### T-22: Final Visual QA

Checklist:
- [ ] SK page matches Supporti styling
- [ ] Supporti matches main app navigation
- [ ] Dark mode works in both sections
- [ ] Responsive layout works at all breakpoints
- [ ] No hardcoded colors remain
- [ ] All buttons use consistent variants
- [ ] Loading states match

---

## CHECKPOINT LOG

| Timestamp | Agent | Task | Status | Notes |
|-----------|-------|------|--------|-------|
| - | - | - | - | Awaiting Phase 3 completion |

---

## VERIFICATION

After Phase 4:
1. Full E2E test: Upload PDF -> Generate SK -> View in Supporti
2. Toggle all accessibility settings
3. Toggle dark mode
4. Test on mobile viewport
5. Run Lighthouse accessibility audit

**Final Command**: `npm run lint && npm run typecheck && npm run build && npm run test`

---

## THOR VALIDATION GATE

After Phase 4, invoke thor-quality-assurance-guardian to verify:
- All 11 functional requirements pass
- Build/lint/typecheck clean
- No regressions in existing functionality
