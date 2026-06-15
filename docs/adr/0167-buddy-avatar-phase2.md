# ADR 0167: Buddy Identity Unification — Phase 2

| Field          | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Status         | **PROPOSED**                                                             |
| Date           | 2026-06-13                                                               |
| Decision ID    | DEC-08                                                                   |
| Branch         | feat/ux-simplification-intention-based                                   |
| Related ADRs   | ADR 0064 (professor formality/transparency), ADR 0003 (character system) |
| Related Issues | UX-01, UX-07                                                             |

## Context

Wave 5 of the ux-simplification branch (PR #430) introduced an intent-based home screen where the student is presented with three intent cards ("Fare i compiti", "Studiare", "Mettiti alla prova") rather than the 26-Maestri grid. The Maestro is selected automatically from the child's chosen subject — the student never picks a professor by name.

**Phase 1 outcome (current state):** A handoff banner (`MaestroSessionHandoff`) appears at the top of each session that was opened via an intent card. The banner uses an implicit first-person narrator:

> _"Ti ho portato dal Prof. {name} per {intent}."_
> i18n key: `chat.intentHandoff.headline` (file: `apps/web/messages/*/chat.json`)

The `{name}` is the Maestro's display name; the professor's identity is fully disclosed per EU AI Act requirements and ADR 0064. The speaker of "Ti ho portato" is implicit — it is the app/platform, effectively "MirrorBuddy", but no named character persona is displayed.

**Open question (DEC-08):** Should the implicit narrator be given an explicit named identity in the handoff banner, and if so, how? This is "phase 2" of Buddy identity unification.

### Current implementation details

| Component                         | Location                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Handoff banner                    | `apps/web/src/components/maestros/maestro-session-handoff.tsx`                                                                     |
| i18n key (headline, no subject)   | `chat.intentHandoff.headline` = `"Ti ho portato dal Prof. {name} per {intent}."`                                                   |
| i18n key (headline, with subject) | `chat.intentHandoff.headlineSubject` = `"Ti ho portato dal Prof. {name} per {subject}."`                                           |
| Intent hint key                   | `chat.intentHandoff.contextHint` = `"Ho già scritto la domanda per te: premi invio quando sei pronto, oppure cambiala come vuoi."` |
| Narrator                          | **Implicit** — no named character; the "I" (ho portato) is never identified                                                        |

The "Buddy" label appears only in code comments and the component JSDoc ("single 'Buddy' avatar", "Buddy ti ha portato dal Prof X") but **never in rendered UI copy**.

### Constraints

- **EU AI Act / ADR 0064**: The in-session professor identity must be disclosed. Children must know they are talking to an AI. Any named narrator persona must not mask or replace the professor's disclosed identity.
- **No deceptive masking**: A "Buddy" persona that causes the child to believe the companion is human would be impermissible. A clearly labelled AI companion is acceptable.
- **Buddy ≠ Maestro**: The peer-buddy characters (`src/data/buddy-profiles/`) are a separate character category (peer learning companions). A new "narrator Buddy" persona should not be confused with them.

## Decision Drivers

1. **Child orientation**: Does the implicit narrator confuse children about who is speaking in the banner?
2. **Transparency cost**: Does naming the narrator add cognitive load or obscure the professor disclosure?
3. **Implementation cost**: Only i18n key changes are needed for a soft-alias; zero architecture or prompt changes.
4. **AI Act compliance**: The professor identity must remain the primary disclosure.
5. **Regression risk**: Changing `chat.intentHandoff.headline` affects 5 locale files and has an active unit test (`maestro-session-handoff.test.tsx`).

## Considered Options

### Option A — Status Quo: Anonymous Narrator (no change)

The current implicit "Ti ho portato dal Prof. {name}..." is kept as-is. The "I" is the app/platform. No named character is introduced.

**Pros:**

- Zero implementation cost.
- No risk of confusing the Buddy brand with the professor.
- Professor disclosure is the headline; there is no competing identity.
- Consistent with the rest of the UX where the home screen copy uses first-person app voice ("Scegli da dove partire: ci penso io a guidarti.").

**Cons:**

- Children may wonder who "Ti ho portato" refers to; the narrator is faceless.
- If a companion identity is desirable for emotional safety (familiar "friend" handing off to a new teacher), this option does not provide it.

---

### Option B — Soft-Alias: Name the Banner Narrator "Buddy"

Add the narrator's name ("Buddy") to the handoff copy, while keeping the professor name fully disclosed as the primary identity:

> _"Sono Buddy — ti ho portato dal Prof. {name} per {intent}."_

Or equivalently:

> _"Il tuo compagno Buddy ti ha portato dal Prof. {name} per {intent}."_

**Implementation scope (i18n only):**

- Update `chat.intentHandoff.headline` and `chat.intentHandoff.headlineSubject` in all 5 locale files (`it`, `en`, `fr`, `de`, `es`).
- Optionally add `chat.intentHandoff.buddyName` as a standalone key to keep the name localizable/configurable.
- No changes to `maestro-session-handoff.tsx`, `home-intent-chooser.tsx`, or any system prompt.

**Pros:**

- Provides a recognisable companion identity that emotionally bridges the "arriving at a teacher" moment.
- Requires no architecture change, no prompt change, no new component.
- Professor disclosure is unambiguous: the name in the banner is still the professor's, "Buddy" only identifies the narrator.
- Buddy is clearly an app feature, not a human.

**Cons:**

- Introduces a third named persona category (app-narrator Buddy, distinct from professor Maestri and peer-buddy characters).
- "Buddy" is not yet defined in any visible UI character sheet — children who encounter it for the first time in the banner may not know who it is.
- Requires coordination across 5 locale files and may need copywriter/translator review for non-IT locales.
- Runs counter to the existing comment in `home-intent-chooser.tsx` that says students see a "single 'Buddy' avatar" — but that avatar is currently entirely visual (no name is spoken).

---

### Option C — Full Character Merge: Buddy as Primary AI Face

Make "Buddy" the single displayed AI persona for the home screen. The professor's identity becomes secondary ("Buddy in modalità Matematica" / "Buddy as Prof. Darwin"). The professor Maestro name is surfaced only as a subtitle or tooltip.

**Pros:**

- Maximum simplicity for the child: one trusted companion, not 26 different AI professors.
- Consistent "Buddy" brand across the whole home ↔ session experience.

**Cons:**

- **Violates EU AI Act Article 50(4) and ADR 0064** if professor identity is demoted below a visible primary disclosure. The system prompt still makes the AI act as, say, Galileo — hiding that from the child would be deceptive masking.
- Requires component changes (session header, TTS greeting prompt injection), system prompt changes, and new character data. Very high implementation cost.
- Focus group finding FG-10 suggests children prefer direct orientation ("Professor X") over abstract persona layering.

---

## Decision

> **[PENDING — no decision made]**
>
> This ADR is PROPOSED. A human reviewer (Roberto / Product Owner) must select an option. The product and compliance implications of Option B require explicit approval before any i18n key changes are shipped.
>
> If Option B is selected, the soft-alias code change is strictly limited to 5 locale JSON files. No component, architecture, or prompt changes are permitted as part of this decision.
>
> If Option C is ever reconsidered in the future, a new ADR must be filed and a full compliance review (EU AI Act Art. 50, GDPR, COPPA) must be conducted.

## Consequences

### If Option A (status quo):

- No code changes required.
- The comment "single 'Buddy' avatar" in `home-intent-chooser.tsx` should be updated to "single implicit narrator" to remove the misleading persona label.

### If Option B (soft-alias):

- Update `chat.intentHandoff.headline` and `chat.intentHandoff.headlineSubject` in all 5 locale files.
- Run `npx tsx scripts/i18n-sync-namespaces.ts --add-missing` and `npm run i18n:check` after changes.
- Update unit test in `maestro-session-handoff.test.tsx` to assert the "Buddy" name is present.
- Document "Buddy = the app's narrator persona" in the character system overview (ADR 0003 addendum).

### If Option C:

- Do not implement without a new full-compliance ADR.

## Open Questions

1. **Focus group evidence**: None of the simulated sessions (pilot3, pass2) raised the implicit narrator as a confusing element. Should we wait for a pass with an explicit probe for narrator identification before deciding?
2. **Character system consistency**: The peer-buddy characters (Mario, Noemi, Bruno…) already use the term "buddy". Adding a narrator "Buddy" could cause naming collision. Does this need a character taxonomy update (ADR 0003)?
3. **Localisation**: "Buddy" as a proper name is meaningful in English but opaque in Italian to young users. Would "Guida" or "Amico" be more appropriate for the Italian locale?
