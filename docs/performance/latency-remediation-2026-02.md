# Latency remediation — February 2026

Origin: consistent user feedback that MirrorBuddy feels slow to answer, on both
the web app and the Reachy Mini robot. This document records what was measured,
what turned out to be a defect, what turned out to be intentional design, and
what was deliberately not changed.

## Verdicts

| #   | Finding                                                                                                                                               | Verdict                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tool-keyword matching used `String.includes`, so `contesto`, `generale`, `cartella`, `creatività` were misrouted to the slower non-streaming endpoint | **Defect inside an intentional design.** Routing to non-streaming is documented in ADR 0034; the substring matching was not. Fixed.                                                                                                                                                   |
| 2   | The same question was embedded up to three times per request, and independent lookups ran serially                                                    | **Defect.** No ADR justifies it. `findSimilarMaterials` / `findRelatedConcepts` already accepted an optional pre-computed vector that was never passed. Fixed.                                                                                                                        |
| 3   | Accessibility profiles add 700–2500 ms of silence detection before the model is asked anything                                                        | **Intentional (ADR 0069, Accepted 2026-01-23).** The ADR explicitly accepts "Increased response latency" as the cost of not interrupting a student who needs time. Values unchanged. The real gap was that ADR 0069 promises a user-facing toggle that was never exposed — now added. |
| 4   | The robot waits for a short utterance to be transcribed before answering                                                                              | **Intentional (ADR 0170).** A stop word ("basta") must produce zero spoken reply. Rebalanced rather than weakened — see below.                                                                                                                                                        |
| 5   | "The infrastructure is fine"                                                                                                                          | **Refuted.** `/api/health` and `GET /api/chat/stream` do not touch the chat path, so they prove nothing about chat latency. This is why instrumentation was added.                                                                                                                    |

## What changed

| Commit     | Change                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| `50bc3386` | Tool keywords match whole words, not substrings                          |
| `96539547` | The student's question is embedded once per request                      |
| `46b3f756` | Independent pre-model lookups run in parallel on the streaming route     |
| `2b68cf84` | Tier-aware history compression now also applies to the streaming route   |
| `f079e5e7` | Robot: speculative answering with a playback gate                        |
| `1a4c1fa3` | Time-to-first-token and per-phase instrumentation                        |
| `07623c88` | The adaptive-VAD ("extra speaking time") toggle is reachable by students |

### Robot: speculative response with a playback gate

Previously, an utterance shorter than `_FAST_PATH_MIN_SPEECH_S` (1.8 s) caused the
robot to wait for the full transcript before even asking the model, because that
transcript is what distinguishes a question from a stop word.

Now the model is asked immediately on `speech_stopped`. For short utterances the
output audio is **held**, not played. When the transcript arrives:

- `SPEAK` → the buffer is released and played in order;
- `IGNORE` / hushed / `WAKE` → the buffer is discarded and the in-flight response cancelled;
- `END` → the gate is cleared (the response was already cancelled);
- `REST` / `PAUSE` → the stop path also clears the gate.

Net latency becomes `max(model_start, transcript)` instead of
`transcript + model_start`, while the safety guarantee is unchanged: nothing is
heard before the transcript has cleared the turn. Pinned by
`robot/tests/test_speculative_response.py` (8 tests).

## Azure investigation — no changes made

Verified with the `az` CLI against subscription `virtual-bpm-prod`
(`8015083b-adad-42ff-922d-feaed61c5d62`).

- Resource `aoai-virtualbpm-prod`, resource group `rg-virtualbpm-prod`,
  location **swedencentral**, SKU S0.
- Three-region split: app **Frankfurt** (`fra1`), AI **Sweden Central**,
  database **Ireland** (`aws-1-eu-west-1.pooler.supabase.com`).
- Production deployments (via `vercel env pull`):
  `AZURE_OPENAI_CHAT_DEPLOYMENT=gpt4o-mini-deployment`,
  `AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small`, realtime resolves
  to `gpt-realtime-2.1`. These are correct.
- **The local `.env.production.local` is stale** (it still names `ada-002` and
  `gpt-4o-realtime`). Always use `vercel env pull` before reasoning about
  production configuration.

### Time-to-first-token benchmark

| Deployment                        | TTFT (avg) |
| --------------------------------- | ---------- |
| `gpt5.3-chat`                     | 888 ms     |
| `gpt4o-mini-deployment` (current) | 1020 ms    |
| `gpt-5.2-edu`                     | 2710 ms    |

**A model migration is not the win.** The ~130 ms difference does not justify the
regression risk of changing the model students talk to. No deployment change was
made.

Corollary: ADR 0034's stated target of "first visible content in 100–200 ms" was
never physically achievable — the model alone takes ~900 ms before its first
token. See the correction note appended to that ADR.

### `semantic_vad` rejected

Azure's realtime API accepts `turn_detection.type: "semantic_vad"` but, as of
February 2026, does not honour it — it silently falls back to `server_vad`.
Adopting it would have looked like a change while changing nothing.

## Deliberately not done

- **`buildAllContexts` in `apps/web/src/app/api/chat/context-builders.ts` was
  left serial.** Its injectors interleave rather than purely append (memory uses
  `enhanceSystemPrompt`), so the fragments are not cleanly separable without a
  large, risky refactor of a file already over the 250-line budget. The streaming
  path — what students experience for ordinary messages — is now parallel.
- **The accessibility VAD delays were not reduced.** They are the documented
  intent of ADR 0069. The robot's values were already halved manually in
  `ff29359b`; the web values were left alone pending real evidence, which the new
  instrumentation now makes collectable.

## Still unmeasured

- No authenticated production chat POST has been timed end-to-end. Every
  millisecond figure above that is not from the TTFT benchmark is a code-based
  estimate. `RequestTimeline`
  (`apps/web/src/app/api/chat/stream/timings.ts`) now emits a
  `Chat stream timing` log line per request so this can be answered with data.
- The share of real messages that hit the non-streaming path is unknown.
- Whether the students who complained had an accessibility profile active is unknown.
- The real distribution of children's utterance durations at the robot is
  unknown, so 1.8 s remains an assumption.
- ADR 0069 cites no clinical study and its manual validation checklist is
  unticked.

## Operational gap — closed

The robot test suite used to run in **no** CI workflow, which meant the P7 safety
guarantee — that a stop word is never spoken over — was protected only by a
developer remembering to run pytest locally.

A `Robot Tests` job now runs in `ci.yml`, on every push to `main` and on any pull
request touching `robot/**`. `robot/pyproject.toml` declares a `test` extra and
sets `asyncio_mode = "auto"`, so CI and a laptop run the suite identically with
`pip install -e ".[test]" && pytest tests/ -q`.

Remaining decision: the job is not in the repository's required status checks, so
a red result is visible but not blocking. Making it required is a branch-protection
change and is left as an explicit human decision.

## Review follow-up (PR #734)

Automated review found two real races opened by the speculative path, both fixed
before merge:

1. **Barge-in before the answer exists.** Asking for the answer immediately opens
   a window where the request is in flight but `response.created` has not
   returned, so `_responding` is still false. `speech_started` therefore skipped
   the cancel, and the late `response.created` cleared `_suppress` and played the
   abandoned answer over the new turn. `speech_started` now cancels when
   `_fast_requested` is set as well, and a cancel issued against an unconfirmed
   response is remembered (`_cancelled_unconfirmed`) so `response.created` cancels
   it again instead of treating it as wanted. The flag is cleared when the server
   refuses the request outright, so a refusal can never silence the next answer.
2. **Held audio surviving a reconnect.** `_reset_session_state` cleared the other
   response flags but left `_gated` / `_gated_audio` intact, so buffered bytes
   from a dead session could be released into the new one. The session reset now
   clears the gate.

Covered by 5 additional tests in `robot/tests/test_speculative_response.py`
(13 total).
