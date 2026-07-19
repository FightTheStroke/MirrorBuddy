# MirrorBuddy on Reachy Mini 🤖

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
| `azure_realtime.py` | Azure OpenAI Realtime WebSocket client |
| `audio_io.py` | Robot mic ↔ speaker bridge (resampling, playback, barge-in) |
| `movements.py` | Safe expressive antenna motion driven by speech energy |
| `settings_ui.py` | Minimal in-app settings page (creds + Maestro/DSA selection) |
| `main.py` | App entry point wiring everything together |

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
