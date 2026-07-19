# ADR 0170: Reachy Mini as MirrorBuddy's Physical Embodiment + Device Pairing

| Field          | Value                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| Status         | **PROPOSED**                                                                              |
| Date           | 2026-07-19                                                                                |
| Branch         | feat/reachy-mini-mirrorbuddy · feat/reachy-mini-mirrorbuddy-pairing                       |
| Related ADRs   | ADR 0169 (Azure Realtime 2.1 Cedar), ADR 0122 (Realtime Vision), ADR 0126 (Unified Camera), ADR 0008 (Parent GDPR consent), ADR 0104 (i18n wrapper key) |
| Related Issues | Reachy Mini embodiment, device pairing                                                     |

## Context

MirrorBuddy is a screen-based Italian tutor for children with DSA (dyslexia,
dyscalculia) and additional needs. The product owner's own son (dyslexia,
dyscalculia, cerebral palsy) benefits from a **voice-first, screen-free** modality:
a physical desk companion is less fatiguing and more engaging than a browser.

Hugging Face's **Reachy Mini** (a small, affordable desktop robot: RPi CM4,
`reachy_mini` runtime, head/antenna motors, mic array, speaker, camera) is a
natural body for the existing tutor. The question: how do we give MirrorBuddy a
physical form **without forking the product**, and how does the robot know
**which child** is using it, safely?

### Constraints

- **No screen.** Every interaction — switching professor/subject, invoking
  features, reading homework — must be reachable **by voice alone**.
- **Reuse, don't fork.** The robot must reuse MirrorBuddy's identity: Azure
  OpenAI Realtime voices (ADR 0169), the 26 Maestri personas, DSA profiles.
- **Accessibility is non-negotiable.** For a child with cerebral palsy, an
  insistent robot causes stress. A stop word ("basta") must silence it
  **immediately and deterministically**, never "after the current sentence".
- **Privacy / GDPR (ADR 0008).** The robot must never hold the child's
  credentials; a parent must be able to revoke its access at any time.
- **No web-app regression.** The embodiment must not destabilise production
  MirrorBuddy.

## Decision Drivers

1. Voice-only completeness (no feature stranded behind a screen).
2. Identity reuse (same voice/personas/profiles as the web tutor).
3. Deterministic, local safety (stop word cannot depend on the LLM).
4. Privacy-safe personalisation (who is the logged-in child?).
5. Minimal blast radius on the production web app.

## Considered Options

### A — Robot streams to the existing web app (thin client)

The robot is a dumb mic/speaker/camera piped into the web session.

**Pros:** zero robot-side logic; automatic feature parity.
**Cons:** requires a live browser session + login on-device; latency of a full
web round-trip; no local, deterministic stop (safety depends on the cloud);
couples robot uptime to web deploys. **Rejected** on safety + latency.

### B — Separate robot app that reuses MirrorBuddy's building blocks (**chosen**)

A self-contained app under `robot/` (`reachy_mini_mirrorbuddy`) that:

- Connects **directly** to Azure OpenAI Realtime (speech-to-speech, WebRTC) with
  the same voices and persona prompts as the web app.
- Runs a **local controller** mapping turn-taking to head/antenna motion, with a
  calmer amplitude while speaking so movement does not distract the student.
- Uses the camera on an **explicit** `look_at_homework` request only (single
  frame, never streamed, nothing persisted) — consistent with ADR 0122/0126.
- Enforces a **hard local interrupt** on stop words ("basta/zitto/fermati/
  aspetta/pausa") via `audio.clear_player()`, with **no auto-resume**.
- Exposes everything by voice tools (switch professor/subject, look at homework).

**Pros:** low latency; safety is local and deterministic; robot survives web
deploys; no web-app changes for the embodiment itself.
**Cons:** a second (small) codebase to maintain; feature parity is manual.
**Chosen** — safety and latency dominate.

### C — Fork MirrorBuddy for the robot

**Rejected** outright: duplicates 26 personas, DSA logic, and voice config;
guarantees drift.

## Decision — Device Pairing

To personalise without credentials, the robot **pairs** with the logged-in
child's account via a short-lived code exchanged for a scoped token:

1. **Web** (`Settings → Integrations → RobotPairingCard`): the parent generates a
   **6-digit, single-use code** (10-min TTL). Issued by `POST /api/devices/pair-code`.
2. **Robot** settings page: the parent types the code; the robot calls
   `POST /api/devices/pair` and receives a **device token** (only the SHA-256
   hash is stored server-side). The token lives in the robot's local `.env`.
3. On boot the robot calls `GET /api/devices/me` (Bearer token) to fetch a
   **non-sensitive learning profile** (name, preferred buddy/coach, school/grade
   level, age, language, subjects, accessibility flags) — **never** email/password.
4. The parent can **revoke** any device from the same card (`DELETE /api/devices/:id`).

The child's credentials never leave the computer; the robot only ever holds a
revocable token and a learning profile.

### Security model (reviewed — see Consequences)

- Codes are 6-digit, single-use, 10-min TTL.
- **Atomic redeem**: a single guarded `updateMany` (unredeemed + unrevoked +
  unexpired) claims the code, closing the double-redeem (TOCTOU) race.
- **Rate limiting**: per-IP **and** a global brute-force ceiling
  (`DEVICE_PAIR_GLOBAL`, 100/15 min) that is deployment-independent.
- **Only hashes stored**: `sha256(code)` and `sha256(token)`; plaintext is
  returned once and never persisted.
- `listDevices` returns only `pairedAt != null` rows (no phantom devices).

## Consequences

### Positive

- MirrorBuddy gains a physical, voice-first embodiment reusing its whole tutor
  stack; the web app is untouched by the embodiment (robot app is additive).
- Children are personalised on the robot without any credential exposure;
  parents retain revocation control (GDPR-aligned, ADR 0008).
- Safety (stop word) and vision (homework) are handled locally and privately.

### Negative / Costs

- A second codebase (`robot/`) to keep in feature-parity with the web tutor.
- New web surface: `RobotDevice` Prisma model + 5 `/api/devices/*` routes + a
  settings card + 15 new i18n keys × 5 locales.

### Security review outcome (@luca) — no critical findings

Hardening above was applied post-review. Two follow-ups are tracked as roadmap
(non-blocking):

- **H2** — the robot's local settings server binds to the LAN. Mitigation:
  run the robot on a trusted home network, or restrict to loopback + a PIN.
- **L3** — device tokens are revocable but not yet TTL-rotated; `lastSeenAt` is
  recorded to enable future idle-expiry.

### Accessibility

The deterministic stop word is an accessibility requirement, not a nicety: it
must be enforced by a local audio interrupt, independent of the model, so a
distressed child is always obeyed instantly.

## Testing

- Web: 25 unit tests (device service + 5 routes) + `RobotPairingCard` render/flow
  tests; i18n parity 5/5 locales.
- Robot: pure-logic device-profile tests; validated live on hardware
  (voice, professor switching, vision, movement, deterministic stop).

## Open Questions

1. Should the settings-server bind (H2) be hardened to loopback+PIN before GA,
   or is "trusted home network" acceptable for the pilot?
2. Should device tokens gain an idle TTL (L3) now, or after field data on
   `lastSeenAt`?
3. Publishing to the Hugging Face Reachy Mini app store — packaging cadence and
   who owns the listing.
