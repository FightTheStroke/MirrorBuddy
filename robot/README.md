---
title: MirrorBuddy on Reachy Mini
emoji: 🤖
license: apache-2.0
tags:
  - reachy-mini
  - reachy_mini_app
  - education
  - accessibility
  - tutoring
  - azure-openai
  - realtime
short_description: A MirrorBuddy tutor with eyes, ears, mouth and movement — for kids with DSA.
thumbnail: https://huggingface.co/blog/assets/reachy-mini/thumbnail.jpg
---

<!--
Hugging Face app-store card (front-matter above). Reachy Mini discovers this app via the
[project.entry-points.reachy_mini_apps] group in pyproject.toml.
-->

# MirrorBuddy on Reachy Mini 🤖

[![Reachy Mini](https://huggingface.co/blog/assets/reachy-mini/thumbnail.jpg)](https://www.reachy-mini.org/)

> 🛒 **Get the robot:** [Reachy Mini](https://www.reachy-mini.org/buy.html) by Hugging Face &
> Pollen Robotics — **Lite $299** (USB-tethered) or **Wireless $449** (on-board compute).
> See the [Hugging Face announcement](https://huggingface.co/blog/reachy-mini).

The **physical embodiment of MirrorBuddy**: a Reachy Mini robot that becomes a
MirrorBuddy Maestro with a body —

- 👁️ **eyes** — the robot camera
- 👂 **ears** — the robot microphone
- 👄 **mouth** — the robot speaker
- 🤸 **movements** — head wobble (speech-synced) + expressive antennas

It reuses **MirrorBuddy's brain** end-to-end, so the robot stays 1:1 aligned with the
web app at [mirrorbuddy.org](https://mirrorbuddy.org):

- **Personas** — the 26 Maestri are fetched live from MirrorBuddy's public
  `GET /api/maestri?locale=it` endpoint (same names, voices, system prompts, greetings).
- **Voice + conversation** — Azure OpenAI **Realtime** (speech-to-speech), the same
  provider and the same 8 voices (`alloy, ash, ballad, coral, echo, sage, shimmer, verse`).
- **Child-safety** — the professor-constitution guardrails are prepended to every session.
- **Accessibility (DSA)** — 8 profiles tune the turn-detection so the robot waits
  patiently for children who speak more slowly (motor / cerebral palsy, dyslexia…).

## How it works

```
robot mic ─▶ AudioIO ─▶ Azure Realtime WS ─▶ AudioIO ─▶ robot speaker
                            ▲     │                          │
              MirrorBuddy Maestro │ instructions        speech energy
              (persona + voice)   ▼                          ▼
                          safety + DSA + embodiment      antenna motion
```

The Maestro persona (`prompt_builder`) + child-safety (`safety`) + DSA VAD tuning
(`dsa`) are assembled into the realtime `session.update`, then microphone audio and
model speech stream over a single Azure Realtime WebSocket (`azure_realtime`).

## Modules

| File | Responsibility |
| --- | --- |
| `config.py` | Environment / `.env` configuration + WS URL (GA vs Preview) |
| `mirrorbuddy_client.py` | Fetch + pick a Maestro from MirrorBuddy's public API |
| `prompt_builder.py` | Assemble the realtime `instructions` (persona + safety + embodiment) |
| `safety.py` | Child-safety guardrails (aligned with MirrorBuddy) |
| `dsa.py` | Accessibility → server-VAD turn-detection tuning |
| `azure_realtime.py` | Azure OpenAI Realtime WebSocket client (audio + tools + vision) |
| `rt_messages.py` | Pure builders for the realtime protocol messages |
| `audio_io.py` | Robot mic ↔ speaker bridge (resampling, playback, barge-in) |
| `movements.py` | Expressive full-body motion + daemon face-follow while listening |
| `camera.py` | On-demand JPEG capture + daemon head/face tracking helpers |
| `tools.py` | Voice tool schemas (list/change professor, look at homework, friend/study) + resolver |
| `session_flow.py` | Pure stop / end / wake decisions for the live loop (accessibility-critical) |
| `controller.py` | Tool dispatch, live professor switching, vision, sleep/wake |
| `settings_ui.py` | Minimal in-app settings page (creds + Maestro/DSA selection) |
| `main.py` | App entry point wiring everything together |

## Everything by voice (no screen)

Buddy is voice-only, so the model drives the robot through realtime **tools**:

- **Change professor / subject** — say e.g. *«voglio matematica»* or *«chiama Galileo»*.
  `call_professor` resolves the Maestro and reconnects the session with the new
  **persona + voice**; the new professor greets. All 26 MirrorBuddy Maestri are available.
- **Look at homework** — say e.g. *«guarda questo compito»*. `look_at_homework` captures
  one camera frame and the model reads the exercise and helps step by step.
- **Who is here** — `list_professors` enumerates the available Maestri and their subjects.
- **Just a friend (not school)** — say e.g. *«non voglio fare i compiti»* or *«parliamo un
  po'»*. Buddy switches to **friend mode** (`talk_as_friend`): the peer‑companion Buddy of
  MirrorBuddy's Support Triangle — a warm coetaneo you can talk to about anything, not a
  tutor. Say *«torniamo ai compiti»* (`back_to_study`) to go back to studying.

## Ending a session & interrupting (accessibility‑critical)

Insistence is stressful for the child, so these are handled **deterministically and
locally** — never left to the model:

- **Stop / rest now** — say *«basta»*, *«zitto»*, *«fermati»*, *«aspetta»*, *«pausa»*.
  Buddy goes silent immediately (local audio flush + turn cancel), settles into a calm
  **rest position** and **stays parked** — no fidgeting, no talking — until you call it back.
  A stop is a full stop, not a brief pause that resumes on the next sound.
- **We're done for today** — say *«abbiamo finito»*, *«a domani»*, *«buonanotte»*,
  *«vai a dormire»*. Buddy says **one** short goodbye, then rests the same way.
- **Wake it back up** — while resting, say its name *«Buddy»* (or *«svegliati»*, *«ci sei?»*).
  Buddy wakes with a small gesture, greets again and asks what you'd like to do.

These intents are detected in `session_flow.py`/`rt_messages.py` and enforced in
`azure_realtime.py`, so they work even if the model would rather keep talking.

## Pair with the child's MirrorBuddy profile

The robot can bind to the **logged-in child's MirrorBuddy account** so it starts
personalised for that child (name, preferred professor, accessibility settings, locale)
instead of a generic default:

1. In MirrorBuddy on the child's computer, open **Settings → Integrations → "Collega un
   robot"** and tap **Genera codice** (a 6-digit code, valid 10 minutes).
2. On the robot's settings page, under **"Profilo del bambino"**, type that code.
3. The robot redeems it at `POST /api/devices/pair`, stores only a scoped **device token**
   in its local `.env`, and fetches the child's profile from `GET /api/devices/me`.

**Privacy by design:** the child's password never leaves their computer — the robot only
ever holds a revocable device token and a non-sensitive learning profile. A parent can
**unpair** the robot at any time from the same settings page. If the robot is not paired,
it falls back to the local `.env` configuration.

**Security model.** The redeem endpoint is protected by per-IP **and** a global
brute-force ceiling; codes are 6-digit, single-use, expire in 10 minutes, and are claimed
atomically (no double-redeem). Two hardening follow-ups are tracked on the roadmap: (1) the
robot's local settings server binds to the LAN — run the robot on a trusted home network or
restrict it to loopback + a PIN; (2) device tokens are revocable but do not yet auto-rotate
on a TTL (`lastSeenAt` is recorded for future idle-expiry).

## Eyes: face-follow & privacy

While listening, the robot **follows the student's face** (daemon head tracking); when
Buddy speaks, the head hands over to the audio wobbler for lip-sync-like motion.

Privacy by design: the camera **never streams** and captures a frame **only** on an
explicit `look_at_homework` request, always preceded by a spoken *"I'm going to look…"*.
Nothing (audio or images) is persisted to disk. Face-follow and the camera can be turned
off with `MIRRORBUDDY_FOLLOW_FACE=false` / `MIRRORBUDDY_ENABLE_CAMERA=false`.

## Configuration

Copy `.env.example` to the app instance `.env` and fill in the Azure credentials
(the same Azure resource MirrorBuddy uses). Nothing sensitive is committed. You can
also enter everything from the in-app settings page.

Required:

- `AZURE_OPENAI_REALTIME_ENDPOINT`
- `AZURE_OPENAI_REALTIME_API_KEY`
- `AZURE_OPENAI_REALTIME_DEPLOYMENT` (e.g. `gpt-realtime`)

Useful optional:

- `MIRRORBUDDY_MAESTRO_ID` — which professor to embody (empty = first Italian tutor)
- `MIRRORBUDDY_DSA_PROFILE` — `cerebral` (default), `dyslexia`, `adhd`, …
- `MIRRORBUDDY_STUDENT_NAME` — personalises the greeting (e.g. `Mario`)
- `MIRRORBUDDY_DEVICE_TOKEN` — set automatically when you pair (see *Pair with the
  child's MirrorBuddy profile* above); overrides the fields above with the live profile

### Publishing to the Reachy Mini app store

No secrets are baked into the package — the Azure credentials and the device token live
only in the **instance `.env`**, entered by the user on the in-app settings page. So the
package can be published to the Hugging Face Hub as-is: it self-declares under the
`reachy_mini_apps` entry-point group and carries the app-card front-matter at the top of
this README (title, emoji, tags, thumbnail).

## Install on the robot

```bash
# on the Reachy Mini (ssh pollen@<robot-ip>)
uv pip install --python /path/to/mini_daemon /path/to/robot   # installs this package
# then set the instance .env and start it from the Reachy Mini dashboard,
# or run directly:
python -m reachy_mini_mirrorbuddy.main --debug
```

The app registers under the `reachy_mini_apps` entry-point group as
`reachy_mini_mirrorbuddy`, so the Reachy Mini daemon discovers it automatically.

## Roadmap

- **Vision** — the camera hardware is available; sending frames to the realtime model
  (so Buddy can actually *see* homework you show it) is the next enhancement.
- **Emotion → richer movement** — map transcript sentiment to head gestures.