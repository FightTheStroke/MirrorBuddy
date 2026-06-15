# Expert Questionnaire — E07: UX Practitioner (WCAG 2.1 AA)

> **Expert code**: E07
> **Specialty**: UX design, WCAG 2.1 AA audit, accessible design systems, keyboard navigation, screen reader testing, inclusive design patterns.
> **Platform surface reviewed**: MirrorBuddy intention-based home screen (feat/ux-simplification-intention-based), handoff banner, subject picker, focus order.
> **Run data referenced**: pilot3 (2026-06-11), pass2 (2026-06-11)

---

## Section 1 — Finding quality as WCAG evidence

| Question                                                                                                                                  | Your response |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1.1 Are the findings phrased as observable UI problems rather than aesthetic taste?                                                       |               |
| 1.2 Which findings map to specific WCAG 2.1 AA success criteria, and which are UX best practice rather than hard WCAG failures?           |               |
| 1.3 Finding FG-05 (skip link after content, Tab 7/23): this is described as a WCAG 2.4.1 violation. Do you agree with the classification? |               |
| 1.4 Finding FG-07 (non-interactive element styled as input): which WCAG criterion does this violate, if any?                              |               |

---

## Section 2 — Keyboard, focus, and reduced-motion

| Question                                                                                                                                                                                  | Your response |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 2.1 Does the method respect keyboard, focus, and reduced-motion concerns in its instrumentation (focus trace JSON, screenshot artefacts)?                                                 |               |
| 2.2 The tab order on the landing has documented issues (skip link late, duplicates, non-interactive elements). Is this severity consistent with a WCAG AA audit outcome you would expect? |               |
| 2.3 Finding FG-06 (duplicate focus stops): what is the most likely root cause (dual render, aria-hidden failure, display:none oversight), and is S2 the right severity?                   |               |

---

## Section 3 — Positive findings as regression guards

| Question                                                                                                                                                    | Your response |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 3.1 Are the positive findings (Tab 1 = homework, emoji+text pairs, text always beside icon) strong enough to serve as regression guards in automated tests? |               |
| 3.2 How would you write an automated accessibility check to protect "Tab 1 lands on the primary intent card"?                                               |               |
| 3.3 Which positive findings are most at risk of regression in future UI changes?                                                                            |               |

---

## Section 4 — Priority for regression tests

| Question                                                                                                                                                                                                  | Your response |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 4.1 Which findings would you prioritise for regression test coverage from a WCAG audit perspective?                                                                                                       |               |
| 4.2 The proposed regression set covers: i18n check (FG-14), rewards navigation (FG-13), text-resize (FG-03/FG-17), home nav control (FG-16). Is this set sufficient for WCAG 2.1 AA compliance assurance? |               |
| 4.3 Is the report actionable enough for an engineering team to translate directly into WCAG acceptance criteria?                                                                                          |               |

---

## Section 5 — DEC-08 naming decision (accessibility angle)

| Question                                                                                                                                                                 | Your response |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 5.1 Does adding "Sono Buddy —" to the handoff banner affect any WCAG 2.1 criterion (e.g., 1.3.1 Info and Relationships, 2.4.6 Headings and Labels, 3.1.5 Reading Level)? |               |
| 5.2 From a WCAG perspective, should "Buddy" be wrapped in a `<span>` with a distinct accessible name, or is inline text sufficient?                                      |               |
| 5.3 Does the current handoff banner role (`role="status"`) remain appropriate if narrator attribution text is added?                                                     |               |

---

## Section 6 — Open additions

| Question                                                                                                                                             | Your response |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 6.1 Are there WCAG 2.1 AA violations visible in the screenshots that are not covered by the findings above?                                          |               |
| 6.2 What is the most commonly overlooked WCAG criterion in mobile-first educational products in your audit experience? Is it present in MirrorBuddy? |               |
| 6.3 Any additional recommendations for accessibility testing strategy?                                                                               |               |

---

_Questionnaire version: 1.0 · Protocol: `docs/focus-group/expert-validation/protocol.md` · Expert code: E07_
