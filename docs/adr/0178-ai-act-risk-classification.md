# ADR 0178: EU AI Act risk classification (Annex III(3)(b) vs Article 6(3))

**Status**: PROPOSED — awaiting qualified legal review
**Date**: 2026-08-30
**Issue**: —
**Deciders**: Roberdan (product/risk owner, interim signatory), qualified legal counsel
**Related**: `docs/compliance/AI-RISK-CLASSIFICATION.md`, `docs/compliance/AI-ACT-REMEDIATION-TRACKER.md` (P1-1, P1-2), `docs/adr/0062-ai-compliance-framework.md`, `docs/adr/0136-compliance-absolute-charter.md`, Reg. (EU) 2024/1689 Art. 6 and Annex III(3)(b), Italian L. 132/2025

---

## Context

MirrorBuddy is a direct-to-consumer AI tutoring service for minors aged 8–18
with learning differences. Whether it is a **high-risk** AI system under the EU
AI Act, or a **limited-risk** system subject only to the transparency duties of
Article 50, is not settled. The compliance documentation set has historically
carried both readings; ADR 0136 mandates an honest, single posture.

Two elements decide the class, and they pull in opposite directions:

1. **Annex III(3)(b)** covers AI systems "intended to be used to evaluate
   learning outcomes, including when those outcomes are used to steer the
   learning process of natural persons **in education and vocational training
   institutions at all levels**". MirrorBuddy's FSRS scheduling, quizzes and
   adaptive learning paths evaluate performance and steer what is taught next —
   which reads onto "evaluate / steer the learning process".
2. **The institutional nexus.** The enacted text ties the point to use _in
   education and vocational training institutions_. MirrorBuddy is sold
   direct-to-consumer, to parents and guardians, not deployed by or within a
   school. This is an argument that the Annex III(3)(b) trigger is not met.
3. **The Article 6(3) filter.** Even where an Annex III use is in scope, Art.
   6(3) exempts systems that do not pose a significant risk of harm — unless
   the system performs **profiling of natural persons**, which disapplies the
   filter. Performance-based personalisation (FSRS/quiz signals driving content
   selection) may amount to profiling.

Earlier drafts of `AI-RISK-CLASSIFICATION.md` built the qualifying analysis on
the **superseded 2021-draft wording** ("determining or influencing access or
placement within institutions"). Those tables are retained in the doc for
traceability, flagged for legal re-assessment, but they are not the current
legal theory.

A qualified legal opinion is required to conclude the classification. This ADR
records the decision to be made and the interim posture until it is made.

---

## Options

### A — High-risk (Annex III(3)(b) applies; Art. 6(3) filter disapplied)

Treat MirrorBuddy as a high-risk AI system and carry the full Chapter III
obligations (risk management, data governance, technical documentation,
record-keeping, transparency, human oversight, accuracy/robustness, conformity
assessment, CE marking, registration).

**Pros**: most conservative; aligns with the "evaluate/steer learning" +
profiling reading; no re-work if legal counsel confirms high-risk.
**Cons**: heaviest compliance load (notified body / conformity assessment,
CE marking, EU database registration) for a small foundation; may be
disproportionate if the institutional nexus genuinely is not met.

### B — Limited-risk (Annex III(3)(b) not triggered — no institutional nexus)

Treat MirrorBuddy as a limited-risk system: Article 50 transparency duties
only (users informed they interact with AI; synthetic content marked where
50(2) applies).

**Pros**: proportionate to a consumer education aid; far lower compliance cost.
**Cons**: rests entirely on the institutional-nexus argument, which is
untested; a regulator could disagree; profiling may pull the system back into
scope regardless; reputationally weak for a product aimed at vulnerable minors.

### C — Precautionary high-risk, pending legal confirmation (interim posture)

Apply high-risk obligations on a precautionary basis while the classification
question is put to qualified legal counsel. Documentation states the posture is
provisional and identifies the two deciding elements.

**Pros**: honest (ADR 0136); protects users while the question is open; no
under-compliance risk; reversible down to B if counsel confirms limited-risk.
**Cons**: carries the higher compliance cost during the interim; the "final"
answer is still outstanding.

---

## Decision

> **To be confirmed by qualified legal counsel.**
>
> Interim posture: **Option C** — MirrorBuddy is treated, on a precautionary
> basis, as a high-risk AI system under Article 6(2) and Annex III(3)(b), and
> high-risk obligations are applied. The final classification is deferred to a
> qualified legal opinion that weighs (a) the direct-to-consumer deployment
> outside educational institutions and (b) the Article 6(3) filter / profiling
> question. This is the posture already reflected across the compliance
> documentation set.

---

## Consequences

Choosing **A** (or counsel confirming high-risk): the current precautionary
obligations become permanent; engage a notified body / complete the conformity
assessment; affix CE marking; register in the EU database; finalize the
post-market monitoring plan at launch.

Choosing **B** (counsel confirming limited-risk): scale back to Article 50
transparency duties; retain child-safety controls as product policy rather than
regulatory obligation; update every classification doc and this ADR; record the
legal reasoning that supports the institutional-nexus conclusion.

Choosing **C** (status quo until the opinion arrives): no documentation change
beyond keeping the "provisional / pending legal review" framing consistent;
the sign-off task (`260703-224313`) stays blocked on the legal opinion.

Whichever way the opinion goes, `AI-RISK-CLASSIFICATION.md` must then remove or
supersede the retained 2021-draft analysis tables, and the country checklists
in `LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md` must be updated to match.

---

## References

- `docs/compliance/AI-RISK-CLASSIFICATION.md` — full Annex III analysis, with the retained superseded tables flagged for re-assessment
- `docs/compliance/AI-ACT-REMEDIATION-TRACKER.md` — P1-1 (contradictory classification), P1-2 (Annex III wording + the two deciding elements)
- `docs/compliance/AI-ACT-CONFORMITY-ASSESSMENT.md` — Chapter III obligation status (self-assessed)
- Regulation (EU) 2024/1689, Article 6 and Annex III, point 3(b)
- Regulation (EU) 2024/1689, Article 6(3) — the significant-risk filter and its profiling carve-out
- Italian Law 132/2025 — national implementation of the AI Act
- `docs/adr/0136-compliance-absolute-charter.md` — honesty-over-optimism rule for legal documentation
