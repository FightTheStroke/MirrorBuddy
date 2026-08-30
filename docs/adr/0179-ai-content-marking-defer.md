# ADR 0179: Machine-readable marking of AI-generated content — DEFER (Article 50(2))

**Status**: ACCEPTED — DEFER decided; marking-approach selection pending (due 30 Sep 2026)
**Date**: 2026-08-30
**Issue**: —
**Deciders**: Roberdan (product/risk owner), qualified legal counsel (Art. 50(2) scope)
**Related**: `docs/compliance/AI-POLICY.md` §5.1, `docs/compliance/AI-ACT-REMEDIATION-TRACKER.md` (P2-1), `docs/adr/0140-compliance-audit-remediation.md` (AIDisclosureBadge), `docs/adr/0167-buddy-avatar-phase2.md` (Art. 50(4)), `docs/plans/PLAN-mirrorbuddy-execution-2026-07-05.md` (C15), Reg. (EU) 2024/1689 Art. 50

---

## Context

Article 50(2) of the EU AI Act requires providers of AI systems that generate
synthetic audio, image, video or text to mark that output, in a
**machine-readable** format, as artificially generated or manipulated. This is
distinct from the Article 50(1)/(9) duty to **inform the user** that they are
interacting with an AI, which MirrorBuddy already meets via the transparency
banner and the `AIDisclosureBadge` (ADR 0140).

MirrorBuddy's generative surface is narrow:

- It produces **conversational text** and **synthetic-voice (TTS) audio** only.
- The voice is openly declared as synthetic and does not impersonate a real,
  identifiable person.
- It generates **no images and no video**.

Article 50(2) and Recital 133 are primarily aimed at deepfake-style synthetic
media — image, video, audio that impersonates real people. Whether the
machine-readable marking duty extends to plain conversational text and declared
synthetic voice, in this context, is legally uncertain. Implementing provenance
marking (C2PA-style manifests, or marks embedded in exported artefacts) on
conversational text and TTS audio carries a real engineering cost for an
uncertain compliance benefit while no synthetic media is in scope.

The engineering posture and roadmap were decided in the 2026-07-05 execution
plan (§C15); this ADR relocates that decision to the ADR record and states its
reopen triggers explicitly, so the DEFER is not an unconditional
"we are compliant".

---

## Options

### A — Implement machine-readable marking now

Add C2PA-style provenance or metadata marking to generated text and TTS audio
before any legal clarification.

**Pros**: maximally conservative; nothing outstanding if counsel later says
50(2) applies.
**Cons**: high engineering cost; marking scheme for conversational text is
immature and non-standardised; benefit uncertain while no synthetic media is
generated; likely re-work once the standard and the legal scope settle.

### B — DEFER, with explicit reopen triggers (chosen)

Rely on the existing human-readable disclosure for Article 50(1)/(9). Do not
implement machine-readable marking yet. Put the scope question to qualified
legal counsel and re-open on defined triggers.

**Pros**: proportionate to the current (text + declared TTS) surface;
reversible; keeps the decision visible and time-bound rather than silently
dropped.
**Cons**: if counsel concludes 50(2) applies to text/audio, marking must be
built under time pressure before launch.

### C — Do nothing, no roadmap

Treat the human-readable disclosure as sufficient and close the question.

**Pros**: zero cost.
**Cons**: violates ADR 0136 (honesty over optimism); an unconditional
compliance claim on an open legal question; no trigger to revisit when the
product adds media generation.

---

## Decision

> **Option B — DEFER, with reopen triggers.**
>
> Machine-readable marking of AI-generated content is not implemented now. The
> Article 50(1)/(9) information duty is met by the transparency banner and
> `AIDisclosureBadge`. The scope of Article 50(2) for conversational text and
> declared synthetic voice is referred to qualified legal counsel.
>
> **Marking-approach selection is due by 30 September 2026** (owner: Roberdan),
> choosing among: (a) the existing visible disclosure is sufficient for
> conversational text/audio; (b) marking in the metadata of exported artefacts
> (PDF/audio); (c) C2PA-style provenance.
>
> **Reopen triggers:**
>
> 1. the product adds image or video generation; or
> 2. a qualified legal opinion concludes that Article 50(2) machine-readable
>    marking is required for conversational text and/or declared synthetic
>    voice.
>
> **Review milestone:** M3, or the first generative-media feature — whichever
> is earlier.

---

## Consequences

- `AI-POLICY.md` §5.1 records this posture (added 2026-08-30) and points back to
  this ADR and to tracker item P2-1.
- The sign-off task `260703-224313` remains blocked on the legal opinion for
  Article 50(2) scope, alongside the other AI Act legal gates.
- If a reopen trigger fires, this ADR is superseded by a new ADR that selects
  the marking approach and sets an implementation milestone; the plan and
  `AI-POLICY.md` are updated in the same change.
- No code change results from this ADR. It is documentation plus roadmap and is
  fully reversible.

---

## References

- Regulation (EU) 2024/1689, Article 50(1), (2), (9) and Recital 133
- `docs/compliance/AI-POLICY.md` §5.1 — machine-readable marking posture
- `docs/compliance/AI-ACT-REMEDIATION-TRACKER.md` — P2-1 (watermark / Art. 50(2)), owner and 30 Sep 2026 date
- `docs/adr/0140-compliance-audit-remediation.md` — `AIDisclosureBadge` (Art. 50(1)/(9) human-readable disclosure)
- `docs/adr/0167-buddy-avatar-phase2.md` — Article 50(4) deception/masking analysis for the Buddy avatar
- `docs/plans/PLAN-mirrorbuddy-execution-2026-07-05.md` §C15 — original DEFER decision and reopen triggers
- C2PA (Coalition for Content Provenance and Authenticity) — content provenance standard
