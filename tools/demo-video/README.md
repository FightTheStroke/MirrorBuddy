# Demo video pipeline («Ci sono»)

Rebuilds the ~83 s Italian demo film of MirrorBuddy from the **real local app**. When the UI
changes, re-run the captures and the build instead of re-editing by hand.

Code only. **No media lives in this repository** — see "Private assets" below.

## Rules this pipeline keeps

- **Local only.** Captures run against a local dev server (`:3100`) and a throwaway local
  Postgres (`127.0.0.1:5544`). `capture/playwright.demo.config.ts` refuses any other database.
  Never point it at production or staging.
- **Fictional student.** `capture/sofia.ts` creates a demo user ("Sofia"); no real student data.
- **Real UI, mocked model.** The Maestro's replies are mocked at the network layer
  (`**/api/chat`); everything rendered is the real app.
- **Declared on screen.** Labels say "App reale · dialogo dimostrativo", that the voices are
  synthetic, that the robot 3D shots are a reconstruction and that Maestri are AI characters.
- **Names are never changed.** If the voice model mispronounces a product name, rewrite the
  line so the name is shown on screen instead of spoken.
- No music unless a licensed track is supplied.

## Layout

| Path                    | What                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `capture/`              | Playwright captures, frame-stepped at 24 fps (`take.ts`). Fixtures from `apps/web/e2e/fixtures`. |
| `assemble/lines.json`   | Narration and dialogue lines, voice casting and delivery notes.                                  |
| `assemble/rt-voice.mjs` | Speaks each line with the Azure realtime voice model, N takes, checks each with transcription.   |
| `assemble/overlays.mjs` | Renders bezels, captions, labels and end card as PNG layers.                                     |
| `assemble/build.py`     | Shot list, voice cues and the ffmpeg assembly.                                                   |

## Private assets (never commit)

Put these under a work directory (`DEMO_WORK`, default `tools/demo-video/work/`, ignored):

- `rep/clean5.mp4` — the real robot clip with original audio. **It contains a minor's voice;
  keep it private and exclude any segment where a name is spoken.**
- `film/segments/room_plate.png`, `film/logo-brain.png`
- `spot/lib/robot_*.mp4` (3D robot shots), `spot/sfx/*.wav`

## Run

```bash
export DEMO_WORK=/path/to/private/work
# 1. captures (app on :3100, scratch DB on :5544)
TEST_DATABASE_URL=postgresql://demo@127.0.0.1:5544/mirrorbuddy_demo \
DATABASE_URL=postgresql://demo@127.0.0.1:5544/mirrorbuddy_demo \
  npx playwright test --workers=1 -c tools/demo-video/capture/playwright.demo.config.ts
# 2. voices (key read at run time, never stored)
MB_AOAI_HOST=<resource>.openai.azure.com MB_AOAI_KEY=... \
  node tools/demo-video/assemble/rt-voice.mjs tools/demo-video/assemble/lines.json "$DEMO_WORK/spot3/voice2/takes" \
  | tee -a "$DEMO_WORK/spot3/voice2/report.txt"
# 3. build (add --plan to print the timing only)
python3 tools/demo-video/assemble/build.py
```

Output lands in `$DEMO_OUT` (default `$DEMO_WORK/out`). Optional `PW_CHROMIUM_PATH` points at a
specific Chromium build.

Before showing the film publicly, re-check every on-screen claim against the shipped app.
