# The 273 disconnected files — working brief

**For a fresh agent.** You can act on this file with no other context. It is the
output of a full audit (30 Aug 2026) plus an adversarial pass that overturned or
narrowed 17 of its own 39 verdicts.

## Read this first

`apps/web/src/i18n/routing.ts` sets `localePrefix: "always"` and `src/proxy.ts`
redirects any unprefixed URL before the page renders. That is why a large tree of
files cannot execute in production. The pre-i18n duplicates were deleted
separately (PR #814). **What remains here is different: features that were built,
sometimes finished, and never wired to anything.** 273 files, ~24,700 lines.

Static analysis alone will mislead you. `knip` and an AST graph share one blind
spot — neither sees `fs.readdirSync` discovery, string-configured entry points or
dynamic imports from `instrumentation.ts`. Two tools agreeing is correlated
failure, not confirmation. Always find the runtime consumer before calling
anything dead.

## Hard rules

1. Never work on `main`. One worktree per task under `worktrees/<task-id>`, one
   branch, one PR.
2. `./scripts/ci-summary.sh --full` must be green before you push. `npm run
i18n:check` too if any user-facing string changed.
3. Tests must be mutation-proved: break the behaviour on purpose and show the
   test fails. A test that passes against a broken implementation is worse than
   no test.
4. Never claim done without pasted evidence. "Should work" is not a result.
5. Merging is Roberto's gate — this repository requires an extra approval for
   changes not attributed to a human. Do not use admin privileges to bypass it.
6. Do not touch worktrees you did not create. Several agents work in parallel.
7. Every user-facing string goes through next-intl in all five locales
   (it/en/fr/de/es). Never hardcode text.
8. Accessibility is a correctness requirement, not a polish step. WCAG 2.1 AA,
   seven DSA profiles, `prefers-reduced-motion`, keyboard reachable, 4.5:1
   contrast. Auto-moving text is a defect for these students.

## Verdict table

Cost: **S** under half a day · **M** 1–3 days · **L** more than 3 days.

| Cluster                             | What it gives the student                                              | Verdict   | Cost | Action                                |
| ----------------------------------- | ---------------------------------------------------------------------- | --------- | ---: | ------------------------------------- |
| One-handed typing mode              | Type with only the left or only the right half of the keyboard         | **WIRED** |    S | Done — `feat/one-handed-typing-mode`  |
| Other DSA typing adaptations        | Per-profile typing UI (dyslexia, ADHD, autism, vision, hearing, motor) | SKELETON  |  M–L | Finish persistence + one profile      |
| Maintenance banner                  | Warns before the service is suspended                                  | **READY** |    S | Wire now                              |
| Supporti advanced filters           | Filter materials by subject and maestro                                | NEARLY    |  S–M | Restore filters, not voice search     |
| Study Kit PDF export                | Choose DSA profile and PDF format                                      | NEARLY    |    M | After accessible-PDF check            |
| Safety block explanations           | Why an answer was stopped and what to do instead                       | NEARLY    |    M | After localisation                    |
| ToolCanvas                          | Watch mind maps, quizzes, summaries being built live                   | NEARLY    |  M–L | Decide its host first                 |
| StudyWorkspace                      | One room with chat, voice and tools                                    | SKELETON  |    L | Do not use as host                    |
| Materiali Conversation              | Homework chat with attachments                                         | OBSOLETE  |    S | Delete                                |
| Fullscreen maestro workspace        | Maestro over the tool with chat drawer                                 | OBSOLETE  |    S | Delete                                |
| Character switcher                  | Change maestro mid-session                                             | NEARLY    |    M | Salvage the picker only               |
| Subject confirmation                | Correct the subject detected from a photo                              | OBSOLETE  |    S | Delete                                |
| SVG visual overview                 | Turn notes into an exportable diagram                                  | NEARLY    |    M | Consider inside Supporti              |
| Modular ToolResultDisplay           | Show saved tools without duplicating content                           | NEARLY    |    M | Reconcile with live renderer          |
| Learning-path generators            | Materials, final quiz and progress for a path                          | NEARLY    |    L | Separate initiative                   |
| Mastery / study method              | Measure competence and autonomy                                        | NEARLY    |    L | Unify models first                    |
| Knowledge Hub                       | Visual archive with folders, tags, timeline                            | OBSOLETE  |    L | Keep reusable renderers only          |
| Collaboration                       | Shared map editing with cursors and presence                           | SKELETON  |    L | Keep disconnected                     |
| Success metrics                     | Autonomy and engagement dashboard                                      | SKELETON  |    S | Remove — its numbers are untrue       |
| Duplicate parent dashboard          | Progress and strategies for parents                                    | OBSOLETE  |    S | Delete the duplicate                  |
| Scheduler library                   | Plan sessions and notifications                                        | OBSOLETE  |    S | Delete the parallel library           |
| Adaptive quiz review                | Identify weaknesses, suggest revision                                  | OBSOLETE  |    S | Delete mocks and duplicates           |
| Legacy archive preview              | Preview maps, quizzes, PDFs, images                                    | OBSOLETE  |    S | Delete                                |
| Voice transport monitoring          | Pick and monitor WebRTC/WebSocket                                      | OBSOLETE  |    M | Delete                                |
| Duplicate streaming/context         | Progressive chat and student memory                                    | OBSOLETE  |    M | Keep the live pipelines               |
| Storage-provider abstraction        | Local/server saving via providers                                      | SKELETON  |  M–L | Delete or design properly             |
| Effects, sounds, haptics            | Confetti, sound and vibration feedback                                 | OBSOLETE  |    S | Delete                                |
| Mobile settings fork                | Settings adapted to small screens                                      | OBSOLETE  |    M | Consolidate into responsive view      |
| Legacy mobile shell                 | Mobile header, drawer, trial banner                                    | OBSOLETE  |    S | Delete                                |
| Maestro discovery extras            | Extended cards, suggestions, audio visualisers                         | OBSOLETE  |  S–M | Keep only useful parts                |
| Invite migration UI                 | Move trial data into an invited account                                | SKELETON  |    L | Keep disconnected — security rewrite  |
| Legacy consent/TOS                  | Cookie preferences and terms acceptance                                | OBSOLETE  |  S–M | Consolidate into current flow         |
| Trial/onboarding/session prompts    | Email, upgrade, rating, onboarding transcript                          | OBSOLETE  |  S–M | Delete dormant prompts                |
| Welcome extras                      | Guides, plan comparison, trial limits, voice fallback                  | OBSOLETE  |    S | Delete                                |
| Structured data / SEO               | Localised search results and structured data                           | NEARLY    |    M | Fix domain, roster, prices, languages |
| AI Model Card                       | Declares models, limits, metrics, compliance                           | OBSOLETE  |    S | Do not republish — legal risk         |
| Achievement feedback                | Show newly earned achievements                                         | NEARLY    |    M | Wire to events, not polling           |
| Legacy parent-access / singleton UI | Shortcuts and old isolated layouts                                     | OBSOLETE  |    S | Delete                                |

## Do these first

### 1. One-handed typing mode → TypingView (S) — **WIRED, PR pending**

A student with hemiplegia or limited hand function picks full keyboard, left hand
only, or right hand only. This is the closest thing in the codebase to the reason
Fight the Stroke exists, and it had been sitting unused since January 2026. No
commit ever removed it from the UI: it was never wired in the first place.

- `components/typing/one-handed-mode.tsx:8-94` is complete, localised, uses
  `aria-pressed`.
- `TypingView.tsx:56,206` already passes `currentHandMode` to the keyboard.
- `virtual-keyboard.tsx:94-98` already applies the selection.
- ~~Missing: mount the control and hand it `setHandMode`.~~ Done on branch
  `feat/one-handed-typing-mode`: the control is mounted in the lessons view of
  `TypingView` (live at `/[locale]/astuccio`) and bound to `setHandMode`.

Two things the audit did not catch, found while wiring:

- The Italian strings for `tools.typing.oneHanded` were sync placeholders
  ("Etichetta" / "Descrizione"). Real Italian copy written; en/fr/de/es were
  already correct.
- The three toggles had no group semantics. The grid is now
  `role="group"` + `aria-labelledby` on the section heading, so a screen reader
  announces the choice as one control with three states.

Selection lives in the Zustand store for the session only. It is **not**
persisted, and must not be until the typing API is real — see the trap below:
`app/api/typing/route.ts:103-111` saves nothing.

**Done means:** the control renders next to the level/layout pickers; switching
hand mode visibly changes the keyboard; reachable and operable by keyboard alone;
announced correctly by a screen reader; verified against the cerebral-palsy
profile; a mutation-proved test covers the three modes.

### 2. Maintenance banner → providers (S)

Warns the student before a maintenance window so they do not lose work.
`components/ui/maintenance-banner.tsx` queries `/api/maintenance`, counts down,
is translated and uses `role="banner"`. API, service, admin panel and maintenance
page are all live. `components/providers.tsx:7,204` mounts `StagingBanner` but
never this one.

**Done means:** banner appears when the API reports a window and not otherwise;
it never covers the header or steals focus; its link keeps the current locale;
dismissal persists for the session only; test proves both states.

### 3. Supporti advanced filters (S–M)

`advanced-filters.tsx:19-130` is already accessible: associated labels, 44px
targets, per-option counts, shareable parameters. The live view mounts only
`SearchControls` and `FilterChips` (`zaino-view.tsx:9-10,88-108`).

Note: the wiring was removed deliberately in `b1dc8cb`, so this may have been a
simplification, not an oversight. Confirm intent before restoring.

**Restore subject and maestro only. Do not wire `VoiceSearch`** — it uses Web
Speech, is hardcoded to `it-IT`, and handles a potentially personal voice
transcript.

### 4. Safety block explanations (M)

`lib/safety/ui/` explains why an answer was stopped and suggests an educational
alternative. High trust value. Blocked on localisation: most strings are
hardcoded Italian. Needs five locales, a mapping from real filter outcomes, and a
review so the explanation never teaches a student how to evade the filter.

## Keep disconnected until redesigned

- **Collaboration.** The blocker is not Redis, it is safeguarding: shared editing
  between minors with no controlled invitations and no isolation.
- **Invite migration.** Session-to-account binding and the real data perimeter
  need rewriting, not wiring.
- **VoiceSearch.** Microphone consent, locale, transcript handling.
- **Any new Model Card.** Legal review and verified metrics first.

## Delete outright

Materiali Conversation · StudyWorkspace · fullscreen maestro workspace · subject
confirmation · current success metrics · duplicate parent dashboard · parallel
scheduler library · adaptive quiz mocks and duplicates · legacy archive preview ·
legacy voice transport · duplicate streaming/context · effects and haptics ·
legacy mobile shell · mobile settings fork (after consolidation) · maestro
discovery extras · legacy consent/TOS · dormant trial and onboarding prompts ·
welcome extras · the current AI Model Card · legacy singleton layouts.

Delete in themed batches, typecheck between batches, one PR per theme.

## Traps found the hard way

- **Success metrics would display numbers that are not true.** Do not "finish"
  it. Remove it.
- **Some dormant prompts are dormant on purpose**, for child protection. Absence
  of a consumer is not proof of an oversight — check the history first.
- **ToolCanvas is not an import away.** Its declared host still renders
  `tool-canvas-placeholder.tsx` ("until RT-03 is integrated"), and tool events
  live in an in-memory `Map` (`lib/realtime/tool-events.ts:102`), so multi-
  instance production breaks. Decide the container first. Preserve
  `StudentSummaryEditor`: the student writes the summary and the AI annotates it,
  which is real pedagogical value.
- **Typing persistence is fake.** `app/api/typing/route.ts:103-111` always
  returns `null` and saves nothing; there is no `TypingProgress` Prisma model and
  no `/api/accessibility/sticky-keys`. Any typing work beyond the one-handed
  control needs schema and migration first.

## Prevention — the fix that stops this recurring

Add a CI reachability check with an explicit manifest for dynamic, config-driven
and generator entry points. Fail a pull request that creates a new unreachable
production file, or edits an existing one, unless the manifest documents its
non-static consumer: wire it in, delete it, or declare why it is reachable.

This is the systemic cure. The waste here was not carelessness — it was mirrored
filenames plus repository-wide search returning the live and the dead copy with
identical names, so the same edit landed twice and only counted once.

## Declared limits of this audit

The exact file-by-file membership of the 273 could not be reproduced from the
code with certainty. **Functional coverage is complete; per-file membership is
not 100% reproducible.** Verify a file's status yourself before deleting it.

Audit performed read-only at commit `2540e13d`.
