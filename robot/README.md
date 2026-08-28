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

[![Reachy Mini](https://huggingface.co/blog/assets/reachy-mini/thumbnail.jpg)](https://reachymini.net/)

> 🛒 **Get the robot:** [Reachy Mini](https://pollen-robotics.com/reachy-mini/) by Hugging Face &
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

- **Personas** — the 32 Maestri are fetched live from MirrorBuddy's public
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

| File                    | Responsibility                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `config.py`             | Environment / `.env` configuration + WS URL (GA vs Preview)                                       |
| `mirrorbuddy_client.py` | Fetch + pick a Maestro from MirrorBuddy's public API                                              |
| `prompt_builder.py`     | Assemble the realtime `instructions` (persona + safety + embodiment)                              |
| `safety.py`             | Child-safety guardrails (aligned with MirrorBuddy)                                                |
| `dsa.py`                | Accessibility → server-VAD turn-detection tuning                                                  |
| `azure_realtime.py`     | Azure OpenAI Realtime WebSocket client (audio + tools + vision)                                   |
| `rt_messages.py`        | Pure builders for the realtime protocol messages                                                  |
| `audio_io.py`           | Robot mic ↔ speaker bridge (resampling, playback, barge-in)                                       |
| `movements.py`          | Expressive full-body motion + daemon face-follow while listening                                  |
| `camera.py`             | On-demand JPEG capture + daemon head/face tracking helpers                                        |
| `body_actions.py`       | Named, clamped gestures any Maestro can play (antennas, peekaboo, nod, bow)                       |
| `body_control.py`       | Gesture dispatch + sustained postures, mixed into `Movements`                                     |
| `people.py`             | Who is in the room right now — session-only, never written to disk                                |
| `tools.py`              | Voice tool schemas (professors, homework, friend/study, who is here, meditation, body) + resolver |
| `session_flow.py`       | Pure stop / end / wake decisions for the live loop (accessibility-critical)                       |
| `controller.py`         | Tool dispatch, live professor switching, vision, sleep/wake                                       |
| `settings_ui.py`        | Minimal in-app settings page (creds + Maestro/DSA selection)                                      |
| `main.py`               | App entry point wiring everything together                                                        |

## Everything by voice (no screen)

Buddy is voice-only, so the model drives the robot through realtime **tools**:

- **Change professor / subject** — say e.g. _«voglio matematica»_ or _«chiama Galileo»_.
  `call_professor` resolves the Maestro and reconnects the session with the new
  **persona + voice**; the new professor greets. All 27 MirrorBuddy Maestri are available.
  The roster is written into the system prompt, so Buddy knows exactly who exists and
  never claims a professor is unavailable when they are — that is what made
  _«passami Fratello Loto»_ fail before the roster was injected.
- **Move the body** — say e.g. _«abbassa le antenne»_, _«nasconditi»_, _«facciamo cucù»_.
  `move_body` plays a real gesture: `antenne_giu`, `antenne_su`, `nascondi`, `cucu`,
  `annuisci`, `scuoti`, `guarda_intorno`, `festeggia`, `inchino`, `riposo`. Every Maestro
  and coach can use it, both on request and on its own initiative — celebrating a right
  answer, or playing peekaboo. **Antennas stay where you put them** (they are a bias the
  idle animation honours, not a one-shot pose); head gestures are one-shot, because the
  head is shared with the face tracker. All poses are clamped well inside the arms' reach,
  and every action returns to neutral even if the hardware refuses a frame.
- **Look at homework** — say e.g. _«guarda questo compito»_. `look_at_homework` captures
  one camera frame and the model reads the exercise and helps step by step.
- **Who is here** — `list_professors` enumerates the available Maestri and their subjects.
- **Just a friend (not school)** — say e.g. _«non voglio fare i compiti»_ or _«parliamo un
  po'»_. Buddy switches to **friend mode** (`talk_as_friend`): the peer‑companion Buddy of
  MirrorBuddy's Support Triangle — a warm coetaneo you can talk to about anything, not a
  tutor. Say _«torniamo ai compiti»_ (`back_to_study`) to go back to studying.

## More than one person at the table

The robot sits on a kitchen table, so a friend, a sibling or a parent sits down and
starts talking. Buddy is built for that:

- **It asks.** A new voice is greeted and asked its name; `remember_person` stores it
  for the rest of the session, so the friend is addressed as themselves, not as the
  paired child. `who_is_here` lets Buddy recall the room when it is unsure.
- **Guests are first-class.** They can ask questions and call a professor like the
  paired child. The safety guardrails apply to everyone equally.
- **Names are used sparingly.** At the greeting, when singling someone out, when
  calling attention — not at the start of every sentence, which is the tic the earlier
  "call him by name" instruction produced.
- **Never invented.** A name only exists if a human said it out loud. Encrypted blobs
  (`pii:…`), digits and sentence-length strings are refused rather than spoken.

**Nothing is persisted.** The roster lives in memory for one power cycle: a friend's
name is a third child's personal data, and keeping it past the power switch is a
consent decision their parents never made. Turn the robot off, the room empties.

There is no voice or face recognition, deliberately — Buddy knows who is speaking only
because someone told it.

## Ending a session & interrupting (accessibility‑critical)

Insistence is stressful for the child, so these are handled **deterministically and
locally** — never left to the model:

- **Pause** — _«aspetta»_, _«basta»_, _«fermati»_, _«un attimo»_, _«pausa»_. Buddy stops
  the sentence it is saying **immediately and says nothing back** (local audio flush + turn
  cancel, and the server is configured **not** to auto-reply). It stays awake: the next
  thing you say is answered normally. These words are everyday Italian — _«aspetta che
  scrivo»_ must not cost you the wake word.
- **Rest** — the deliberate _«zitto»_, _«silenzio»_, _«taci»_, _«dormi»_, _«vai a dormire»_,
  _«riposati»_, _«spegniti»_. Buddy goes silent, settles into a calm **rest position** and
  **stays parked** — no fidgeting, no talking — until you call it back **by name**
  (_«Buddy»_). A rest is a full stop, never a reply.
- **Goodbye** — _«abbiamo finito»_, _«a domani»_, _«ci vediamo»_ at the end of a sentence:
  a short farewell, then rest. Mid-sentence (_«ci vediamo dopo pranzo»_) it is just talk.
- **Instant on-device barge-in** — the moment the child speaks _over_ Buddy, playback is
  cut on the robot itself, without waiting for the server. The Reachy Mini mic array is
  echo-cancelled in hardware, so voice energy on the mic while Buddy is speaking is a real
  nearby voice (not the robot hearing itself) — `audio_io.py` flushes the speaker and the
  realtime client drops any in-flight audio right away. Sensitivity is configurable from
  the robot's **settings page** ("Sensibilità basta") — or via `MIRRORBUDDY_BARGE_RMS`
  (default `0.045`, lower = more sensitive) and `MIRRORBUDDY_BARGE_FRAMES` (default `3`).
- **We're done for today** — say _«abbiamo finito»_, _«a domani»_, _«buonanotte»_,
  _«ci vediamo»_. Buddy says **one** short goodbye, then rests the same way.
- **Wake it back up** — while resting it ignores everything **except its name**: say
  _«Buddy»_ and it wakes with a small gesture, greets again and asks what you'd like to do.
  Nothing else brings it back, so a rest really lasts until you call it.

These intents are detected in `session_flow.py`/`rt_messages.py` and enforced in
`azure_realtime.py`, so they work even if the model would rather keep talking.

## Staying alive (session resilience)

Azure Realtime hard-closes **every** session at 60 minutes (`session_expired`),
and home Wi-Fi drops. Either event closes the WebSocket, and the app used to end
right there: the robot went silent for good, deaf even to its wake word, and only
a manual restart brought it back.

The session loop now treats a closed socket as a **reconnect, not an exit** — it
comes back within a second, with an exponential backoff (max 30s) if Azure is
genuinely unreachable. The resumed session is **silent**: no second greeting in
the middle of homework. Per-session state (in-flight response, audio suppression)
is reset, while what the child asked for — _rest_ after «zitto» — is preserved.
Only closing the app really stops it.

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
explicit `look_at_homework` request, always preceded by a spoken _"I'm going to look…"_.
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
- `MIRRORBUDDY_DEVICE_TOKEN` — set automatically when you pair (see _Pair with the
  child's MirrorBuddy profile_ above); overrides the fields above with the live profile
- `MIRRORBUDDY_AUTO_UPDATE` — `true` by default: the robot takes published updates on
  its own, in the background, and runs them from the next start. Set to `0` to pin it.

### Credentials and updates take care of themselves

Once the robot is paired, nobody has to touch the hardware again:

- **Voice credentials** are fetched from MirrorBuddy at every start
  (`GET /api/devices/realtime-credentials`, authenticated with the device token). Rotate
  the Azure key on the server and the robot picks it up on its next start. The key is
  never written to the robot's disk. The local `AZURE_OPENAI_REALTIME_*` values remain a
  fallback for an unpaired robot or an unreachable backend — a child is never left with a
  mute robot because a network call failed.
- **App updates** are checked in the background at every start and applied silently; the
  new version runs from the following start. The check never delays a session.

### Publishing to the Reachy Mini app store

No secrets are baked into the package — the Azure credentials and the device token live
only in the robot's own config file (see _Where the configuration lives_), entered by the
user on the in-app settings page. So the package can be published to the Hugging Face Hub
as-is: it self-declares under the `reachy_mini_apps` entry-point group and carries the
app-card front-matter at the top of this README (title, emoji, tags, thumbnail).

**CI publishes it, as part of going live.** The `🤖 Publish to Robot App Store` job runs
right after the website is promoted to production, on the same push to `main` — so the
robots and mirrorbuddy.org always carry the same release, and "we shipped" never again
means "we shipped for the website". It then verifies the store really serves that version.
Publishing by hand was the reason the store once fell three releases behind while everyone
assumed robots were current. The job needs an `HF_TOKEN` repository secret with write
access to the Space. To publish manually:

```bash
./robot/publish-space.sh          # publish this working tree
./robot/publish-space.sh --check  # only compare, change nothing
```

## Install on the robot

**Install it from the app store, not from a folder.** Both work, but only a
store install is ever offered an update: an app installed from a local path has no
Space behind it, so the daemon skips it in `check-updates` for ever. A robot in a
family's home that never updates is the failure mode this project cannot afford.

On the robot dashboard: _Apps → MirrorBuddy → Install_. Or over the daemon API:

```bash
curl -X POST http://<robot>:8000/api/apps/install -H 'Content-Type: application/json' \
  -d '{"name":"reachy_mini_mirrorbuddy","source_kind":"hf_space",
       "url":"https://huggingface.co/spaces/Roberdan/mirrorbuddy",
       "extra":{"id":"Roberdan/mirrorbuddy"}}'
```

For development on the unit, a local install still works:

```bash
# on the Reachy Mini (ssh pollen@<robot-ip>)
uv pip install --python /path/to/mini_daemon /path/to/robot
python -m reachy_mini_mirrorbuddy.main --debug
```

The app registers under the `reachy_mini_apps` entry-point group as
`reachy_mini_mirrorbuddy`, so the Reachy Mini daemon discovers it automatically.

### Where the configuration lives

`~/.config/mirrorbuddy/.env` on the robot — **outside** the installed package, on
purpose. It used to live inside the package folder, which an app update replaces:
every update therefore erased the Azure key and the pairing token, and the robot
came back mute until an adult retyped them. A robot configured before this change
is migrated automatically the first time the new version starts.

Override the location with `MIRRORBUDDY_CONFIG_DIR`.

### Staying up to date

Robots update themselves at boot. `mirrorbuddy-autostart` asks the daemon whether a
newer version is published in the app store and installs it before MirrorBuddy
starts, so a family gets fixes without opening anything. Two things make that safe:

- the configuration lives outside the package, so an install cannot erase it;
- the updater never fails the boot — no network, a slow store or a refused install
  are logged and stepped over, and the robot starts on the version it already has.

An update must never be the reason a child has no robot today.

### Checking a robot in the field

```bash
./robot/tools/robot-doctor.sh <robot-host>
```

Answers in one screen: is it running, can it still see the app store, is it
tracked for updates, and which version the store would give it. It exists because
the previous failure was silent — the robot worked, it had simply stopped being
updated months earlier.

## Roadmap

- **Vision** — the camera hardware is available; sending frames to the realtime model
  (so Buddy can actually _see_ homework you show it) is the next enhancement.
- **Emotion → richer movement** — map transcript sentiment to head gestures.
