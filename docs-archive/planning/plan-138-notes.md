# Plan 138 Running Notes

## W1: Critical Disclosure

- All i18n additions required manual completion for DE/ES locales (executor context limits)
- Audit trail service now 393 lines (was ~285), consider splitting in future
- AI disclosure badge uses AIDisclosureBadge component with compact variant
- Cookie documentation uses camelCase keys (theme, consent, visitorId, csrfToken, simulatedTier)

## W2: Content & UI Fixes

- i18n placeholder detection requires multi-pass verification: task executors translate
  [TRANSLATE] tags reliably but miss subtle single-word placeholders ("Intro", "Sous-titre",
  "Kategorie1") that are valid words but serve as placeholders in context
- Italian locale as ground truth: patterns returning 0 matches in IT but N>0 in other locales
  confirm genuine translation gaps
- Country-specific authorities (CNIL, BfDI, AEPD, Garante) cannot be auto-translated
- DSA profile correction: Dyscalculia replaced with Auditory Impairment across all locales
- Admin safety actions require CSRF-protected POST endpoints with confirmation dialogs
- FR had 33 residual placeholders, DE had 9, ES had 1 after initial translation pass

## W3: Documentation Alignment

- Background agents consistently miss locales (pattern: only complete IT/EN or IT/EN/FR)
  when creating country-specific docs. Requires explicit per-agent locale handoff or
  sequential task breakdown per locale
- Honesty policy critical: multiple docs had false "implemented" claims (e.g., MODEL-CARD
  listing measured metrics instead of placeholder targets, AI-POLICY claiming bias detection
  already deployed). All DRAFT/placeholder docs must be explicitly marked
- Country-specific docs needed real legal references, not placeholders: CNIL contact, BfDI
  office code, AEPD reference numbers now verified against official sources
