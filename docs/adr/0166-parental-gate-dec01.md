# ADR 0166: Parental Gate level for "Per i grandi" (DEC-01)

**Status**: PROPOSED — awaiting decision by Roberdan
**Date**: 2026-06-13
**Issue**: #432
**Deciders**: Roberdan (product owner), legal counsel
**Related**: `docs/compliance/trial-minors-guardrails.md`, GDPR Art. 8, Italian L. 132/2025, issue #431

---

## Context

MirrorBuddy's `/invite/request` page collects PII from the person requesting
a child's account (name, email, motivation). Users are parents, guardians, or
teachers of children aged 6–14 with learning differences.

Two UI guards are already in place (Wave 1–2):

1. **Arithmetic grown-up gate** (commit `08f41512`): a two-digit mental-maths
   challenge in a modal labelled "Per i grandi". Verified state stored in
   `sessionStorage` per ADR 0015. A child cannot trivially pass it, but it is
   not cryptographically strong.
2. **Guardian self-declaration checkbox** (Wave 2, 2026-06-13): the submitting
   adult must tick "I confirm I am the parent, guardian, or teacher of this
   child" before the submit button activates. The declaration is audit-logged
   server-side; it is **not** stored in the database.

Despite these controls, the page remains publicly reachable by URL, and
neither guard constitutes _verifiable_ parental consent as defined by:

- **GDPR Art. 8** (Italy: digital consent age = 14 per D.Lgs. 196/2003 as
  amended by D.Lgs. 101/2018): information-society services offered to children
  require verifiable parental consent below the threshold.
- **Italian Law 132/2025**: minors under 14 require parental consent for AI
  service access.
- **COPPA** (where applicable): no collection of personal information from
  under-13s without verifiable parental consent.

A product and legal decision is needed on whether the current UI screening is
sufficient or whether a stronger gate must be added before a production launch
targeting Italian schools.

---

## Options

### A — Status quo: arithmetic gate + self-declaration (current)

Keep the existing two-layer UI screening. The arithmetic challenge deters
casual child access; the checkbox creates an auditable declaration trail.

**Pros**: already implemented; zero new infrastructure; fast path to launch.  
**Cons**: not "verifiable" under GDPR Art. 8 / L. 132/2025 / COPPA; a
determined child can search the answer; legal sufficiency uncertain; no proof
the declarer is actually the child's guardian.

### B — Re-auth: require password (authenticated adults only)

Move `/invite/request` behind authentication. Only logged-in users can submit
a request. Eliminates the anonymous invite path entirely.

**Pros**: strong identity signal; no new consent infrastructure needed.  
**Cons**: breaks the trial onboarding funnel (anonymous visitors cannot request
access without first having an account — circular); requires a design change
to the trial acquisition flow.

### C — Guardian email verification with OTP

After the arithmetic gate and self-declaration, send a one-time passcode to
the provided email address. The submitter must enter it before the invite
request is recorded.

**Pros**: verifiable ownership of the email; creates an auditable link between
the declared guardian and a real inbox; aligns with common parental-consent
implementations.  
**Cons**: adds friction and an extra round-trip; email OTP is not equivalent to
COPPA "verifiable parental consent" (which requires a positive identity check);
increases engineering scope (OTP generation, expiry, resend).

### D — PIN / parent-set passcode

Require the "Per i grandi" section to be unlocked with a PIN that an adult sets
during first use, stored (hashed) in the DB against the device/session.

**Pros**: reusable gate for the whole parent area; UX-consistent with existing
"Per i grandi" framing.  
**Cons**: PIN is device-local, not tied to a verified identity; a child who
observes the PIN bypass it; adds a PIN management UI; first-use bootstrapping
problem (who sets the PIN before any account exists?).

---

## Decision

> **To be decided by Roberdan.**
>
> Recommendation pending legal sign-off. Option C (email OTP) appears to offer
> the best balance of implementation complexity vs. legal defensibility, but
> final choice depends on whether legal counsel considers email OTP sufficient
> for GDPR Art. 8 / L. 132/2025 purposes, and on product's tolerance for
> funnel friction.

---

## Consequences

Choosing **A**: fastest launch; accept legal risk; document residual risk in
DPIA; revisit at next DPIA review.

Choosing **B**: redesign trial acquisition funnel; lose anonymous → invite
path; potentially large product impact.

Choosing **C**: ~1–2 sprint implementation; OTP email infra already in place
(Resend); moderate funnel drop expected; best legal defensibility of the low-
friction options.

Choosing **D**: ~1 sprint; strengthens the whole "Per i grandi" area, not just
`/invite/request`; does not satisfy COPPA/L. 132/2025 verified-consent bar on
its own.

All options except A require a **DPIA amendment** before launch.

---

## References

- `docs/compliance/trial-minors-guardrails.md` — COMP-01 guardrail set
- `docs/compliance/DPIA.md` — child-facing data collection section
- GDPR Article 8 — conditions applicable to child's consent
- Italian D.Lgs. 196/2003 (amended by D.Lgs. 101/2018) — age of digital consent
- Italian Law 132/2025 — AI service access for minors under 14
- COPPA 16 CFR Part 312 — verifiable parental consent requirement
- Issue #432 — parental gate level decision
- Issue #431 — COMP-01 implementation
