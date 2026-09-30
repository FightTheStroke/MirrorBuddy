# ADR 0182: GPT-6.1 Sol as the single model for every tier and feature

**Status**: Accepted
**Date**: 2026-09-30
**References**: ADR 0073 (per-feature models), ADR 0155 (model benchmarks), issue #1203

## Context

Production chatted on `gpt-5.6-terra` for every tier, but the tool models
(PDF, mind maps, quiz, flashcards, summary, formula, chart, homework, webcam)
still differed by plan: Trial resolved to `gpt-5-mini` (`gpt-5-edu-mini`),
Base and Pro to the retired `gpt-4o-mini` alias. Trial and Base are where a
student forms the first impression, so the product owner decided nothing
should be rationed by plan. GPT-6 (Sol, Luna) and GPT-6.1 Sol became
available in the Azure EU data zone.

## Evaluation (2026-09-30)

Standalone harness (no DB writes) reusing the Research Lab fixtures: 3 real
Maestro prompts × 5 synthetic DSA students × 4 turns, TutorBench rubric scored
blind by two judges (`gpt-6-astra`, `gpt-5.6-sol`); the real study-kit
generator prompts on two documents; six safety probes (crisis, homework
cheating, jailbreak, sexual content, PII, bullying).

| Model         | Tutoring | Tools | JSON ok | Safety | p50 latency | Price $/1M (in/out) |
| ------------- | -------- | ----- | ------- | ------ | ----------- | ------------------- |
| gpt-6.1-sol   | 75.0     | 95.6  | 6/6     | 6/6    | 3.3 s       | 2 / 10              |
| gpt-6-sol     | 73.1     | 95.1  | 6/6     | 5/6    | 2.3 s       | 2 / 10              |
| gpt-6-luna    | 71.2     | 93.8  | 6/6     | 5/6    | 2.3 s       | 0.10 / 0.50         |
| gpt-5.6-terra | 70.0     | 92.4  | 6/6     | 6/6    | 3.3 s       | 2 / 12              |
| gpt-4.1-mini  | 58.1     | 90.4  | 6/6     | 5/6    | 4.0 s       | 0.40 / 1.60         |
| gpt-5-mini    | 51.6     | 90.3  | 6/6     | 1/6    | 9.1 s       | 0.25 / 2            |

Prices are public list prices; the EU data zone carries a surcharge.

## Decision

- `gpt-6.1-sol` is the only model for chat and every tool feature, on every
  tier (`tier-seed.ts` and `tier-fallbacks.ts` share one model set;
  `DEFAULT_CHAT_MODEL_EDU` / `_PRO` are no longer read).
- It is served by `mb-gpt-61-sol`, a DataZoneStandard (EU-only) deployment,
  which keeps student prompts inside the EU. Override with
  `AZURE_OPENAI_GPT61_SOL_DEPLOYMENT`.
- `gpt-5.6-terra` stays deployed and mapped as a one-click rollback.
- Voice is unchanged (`gpt-realtime-2.1`, global selection per ADR 0169).
  `gpt-live-1` (full-duplex) needs a new session protocol and has no EU
  deployment yet; revisit as a prototype.

## Consequences

- Trial students get the same tutor and tools as paying users; Trial tool cost
  rises versus `gpt-5-mini`, chat cost falls versus Terra.
- Production tier rows must be updated (admin tier editor or targeted update)
  since seeds do not re-run against live data.
