# Feature Flags — census (D-58)

Source of truth: `apps/web/src/lib/feature-flags/types.ts` (`KnownFeatureFlag`), defaults in
`feature-flags-service.ts` (server, DB-backed) and `client.ts` (client-safe, in-memory mirror).

Verified by grep across `apps/web/src` for each flag's real consumers (excluding its own
definition/default/test files) on 2026-07-06. A flag with zero real consumer files is dead —
remove it, don't leave it defined for a feature that no longer checks it.

| Flag                                   | Real consumer(s)                                                                              | Status                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| `voice_realtime`                       | 8 files across `lib/hooks/voice-session/`, voice components                                   | live                   |
| `voice_realtime_15`                    | 3 files, ADR 0165 rollout stack                                                               | live                   |
| `voice_realtime_2`                     | 2 files, ADR 0165 preview stack                                                               | live                   |
| `voice_realtime_whisper_transcription` | 1 file, ADR 0165                                                                              | live                   |
| `voice_realtime_translate`             | 1 file, ADR 0165 (degraded — Azure endpoint pending)                                          | live                   |
| `rag_enabled`                          | 2 files                                                                                       | live                   |
| `flashcards`                           | many (FSRS UI) — high match count includes unrelated word matches, spot-checked real usage    | live                   |
| `mindmap`                              | many (mind map generation) — same caveat                                                      | live                   |
| `quiz`                                 | many (quiz generation) — same caveat                                                          | live                   |
| `pomodoro`                             | Pomodoro timer UI                                                                             | live                   |
| `gamification`                         | XP/achievements system                                                                        | live                   |
| `parent_dashboard`                     | `lib/degradation/degradation-service.ts`                                                      | live                   |
| `pdf_export`                           | `lib/degradation/degradation-service.ts`                                                      | live                   |
| `ambient_audio`                        | 4 files, background audio                                                                     | live                   |
| `voice_ga_protocol`                    | 11 files                                                                                      | live                   |
| `voice_full_prompt`                    | `lib/hooks/voice-session/voice-prompt-builder.ts`, `session-config.ts`                        | live                   |
| `voice_transcript_safety`              | 3 files, `lib/hooks/voice-session/{event-handlers,safety-intervention,transcript-safety}.ts`  | live                   |
| `voice_calling_overlay`                | `components/voice/CallingOverlay.tsx`                                                         | live                   |
| `tts_audio_15`                         | `app/api/tts/route.ts`                                                                        | live                   |
| `chat_unified_view`                    | 5 files                                                                                       | live                   |
| `consent_unified_model`                | `lib/consent/consent-service.ts`                                                              | live                   |
| ~~`coming_soon_overlay`~~              | **zero** — defined + tested (2 dedicated test files) but never checked by any component/route | **removed 2026-07-06** |

## Removed: `coming_soon_overlay`

Registered per Plan 157/T0-03 ("Coming Soon Overlay") but no `ComingSoonOverlay`-style component
was ever built to check it — the flag existed only in its own definition and test suite. The
waitlist feature itself (`app/[locale]/waitlist/*`, `lib/waitlist/waitlist-service.ts`,
`app/api/waitlist/signup/route.ts`) is live and unrelated to this flag; removing the flag does
not touch the waitlist feature. Historical docs (`docs/adr/0158-coming-soon-waitlist.md`,
`docs/claude/waitlist.md`) left as-is — they document the feature's history, not this flag's
current code state. If a coming-soon gate is needed again, register a fresh flag rather than
reviving this one.

## Maintenance

When adding a flag: add it to `KnownFeatureFlag`, its default in both `feature-flags-service.ts`
and `client.ts`, and add a row here naming its real consumer. When a flag's last consumer is
removed, remove the flag in the same PR — don't leave orphaned entries for a future census.
