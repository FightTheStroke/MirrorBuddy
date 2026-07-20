# MirrorBuddy on Reachy Mini — the robot tutor

MirrorBuddy is normally a tutor you use on a screen. With a **Reachy Mini** robot
it gets a **body**: the same tutor, the same voice and the same teachers, but with
eyes that follow the child, ears that listen, a voice that speaks and expressive
movement — used entirely **by voice, with no screen**.

This page explains the feature for everyone, **including families who don't have a
robot yet**. If you already have one, jump to [Pairing](#pairing-with-a-childs-profile).

![Reachy Mini](https://huggingface.co/blog/assets/reachy-mini/thumbnail.jpg)

## What is Reachy Mini?

[Reachy Mini](https://huggingface.co/blog/reachy-mini) is a small, affordable
desktop robot from Hugging Face (Raspberry Pi CM4, moving head and antennas, a
microphone array, a speaker and a camera). MirrorBuddy runs as an app **on the
robot** and turns it into a physical study companion.

- **Buy it:** <https://www.reachy-mini.org/buy.html> — Reachy Mini **Lite** from
  about **$299**, **Wireless** from about **$449**.
- Announcement & specs: <https://huggingface.co/blog/reachy-mini>

You do **not** need a robot to use MirrorBuddy — the web tutor at mirrorbuddy.org
is complete on its own. The robot is an optional, delightful add-on.

## What the robot can do

| Capability          | What it means for the child                                             |
| ------------------- | ----------------------------------------------------------------------- |
| 👀 **Eyes**         | The camera-driven head **follows the student's face** while listening.  |
| 👂 **Ears / 🗣 Voice** | Real-time speech-to-speech (Azure OpenAI Realtime) — same voices as web. |
| 📷 **Homework camera** | On request, it **looks at the homework** on the desk and helps.      |
| 🤸 **Movement**     | Expressive head/antenna motion adapted to each teacher's style.         |
| ✋ **Instant stop** | Say **"basta"** and it goes silent **immediately** — on-device, no stress. |
| 🌙 **Sleep & wake** | Say **"dormi"** to rest; call **"Buddy"** to wake it back up.            |
| 🎓 **All 26 Maestri** | Switch professor or subject **by voice**; no screen required.         |

Everything is voice-first: there is no on-robot UI to read. The child talks; Buddy
answers, moves, and can look at what's on the table.

## Pairing with a child's profile

Because there's no screen, the robot needs to know **which child** it's helping —
without ever handling the child's password. It does this with a short pairing code.

1. On the child's computer, open **Settings → Integrations → "Collega un robot"**
   and tap **Genera codice** (a 6-digit code, valid 10 minutes).
2. On the robot's settings page, under **"Profilo del bambino"**, type that code.
3. The robot exchanges the code for a scoped **device token** and boots already
   personalised: the child's name, preferred teacher, language and accessibility
   settings.

A parent can **unpair** the robot at any time from the same settings card.

### Privacy by design

- The child's **password and email never leave the computer**. The robot only
  ever holds a **revocable device token** and a **non-sensitive learning profile**
  (name, preferred buddy/coach, school/grade level, age, language, subjects,
  accessibility flags).
- The camera **never streams**: it grabs a **single frame** only on an explicit
  *"look at my homework"* request, always announced out loud, and **nothing is
  persisted** to disk.
- See [ADR 0170](adr/0170-reachy-mini-robot-embodiment.md) for the full
architecture and security model, and [ADR 0008](adr/0008-parent-dashboard-gdpr.md)
  for the parental-consent model.

### Safety: stop, sleep and wake

For a child with additional needs, an insistent robot is stressful. Saying
**"basta", "zitto", "fermati", "aspetta"** or **"pausa"** triggers a **hard local
audio interrupt** — the robot stops speaking instantly and does **not**
auto-resume. It even cuts itself off **the moment the child talks over it**
(**instant on-device barge-in**): the Reachy Mini mic is echo-cancelled in
hardware, so playback is flushed on the robot without waiting for the server.
The sensitivity of this "basta" detection is adjustable from the robot's
settings page (**"Sensibilità basta"**), or via `MIRRORBUDDY_BARGE_RMS` /
`MIRRORBUDDY_BARGE_FRAMES`.

Saying **"dormi" / "riposati"** sends Buddy straight into a calm **rest
position** where it stays parked — no fidgeting, no talking. The ending phrases
**"a domani" / "buonanotte" / "abbiamo finito"** let it say **one** short goodbye
first, then it rests the same way. While resting it ignores everything **except
its name**: say **"Buddy"** and it wakes with a small gesture and greets again.

All of this is enforced on the robot itself, independently of the AI model, so
the child is always obeyed immediately.

## Configuring the app

The web-side pairing UI lives in **Settings → Integrations**. The robot-side
configuration (Azure endpoint, camera on/off, face-follow, frame saving for
debugging, API base URL and the device token) is documented in the robot app's
own README:

- Robot app README (install, modules, env vars): [`robot/README.md`](../robot/README.md)
- Example environment: [`robot/.env.example`](../robot/.env.example)

Key toggles: `MIRRORBUDDY_ENABLE_CAMERA`, `MIRRORBUDDY_FOLLOW_FACE`,
`MIRRORBUDDY_DEVICE_TOKEN`, `MIRRORBUDDY_API_BASE`, `MIRRORBUDDY_BARGE_RMS`,
`MIRRORBUDDY_BARGE_FRAMES`.

## Publishing to the Reachy Mini app store

The robot README ships with Hugging Face app-store front-matter (title, emoji,
tags, thumbnail) so the app can be listed on the Reachy Mini store. See
[`robot/README.md`](../robot/README.md) → *Publishing to the Reachy Mini app store*.

## Localisation

All user-facing pairing copy is localised in the 5 supported locales
(it/en/fr/de/es) under `apps/web/messages/*/settings.json` → `settings.robotPairing`.
