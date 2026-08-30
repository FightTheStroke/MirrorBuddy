# Data Governance SOP — Knowledge Base Sources (IP & Copyright)

**Status**: Active | Last Updated: 17 August 2026 | Next Review: 17 February 2027
**Owner**: Roberdan (product / IP risk owner, FightTheStroke)
**Closes**: AI-Act remediation tracker item **P2-3**

---

## Executive Summary

MirrorBuddy's 27 Maestri draw on a knowledge base of 32 didactic files in
`apps/web/src/data/maestri/*-knowledge.ts`. Those files are the **intended** RAG corpus:
`maestro-knowledge-retriever.ts` queries pgvector for them under the system user
`SYSTEM_MAESTRO_KB`. Until 18 Aug 2026 no committed script actually wrote them there — see
G-6, a finding of this audit, now resolved. This SOP governs the content of those files
regardless of whether they are served from pgvector or embedded in the prompt.

This SOP defines where that content may come from, what may be copied, what must be
rewritten, how provenance is recorded, and who reviews it.

**Key principle**: the knowledge base carries **facts and our own expression of them**.
It does not carry third-party expression. Facts are not copyrightable; the sentences that
convey them are.

---

## 1. Scope

**In scope** — the RAG corpus and everything that feeds it:

| Artefact                                              | Role                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/web/src/data/maestri/*-knowledge.ts` (32 files) | Authored didactic content; the RAG corpus (seeded into pgvector by `npm run kb:seed` — see G-6) |
| `apps/web/src/data/maestri/mini-kb/`                  | Identity extract (bio, style, quotes) used in prompt build                                      |
| `scripts/extract-mini-kb.ts`                          | Splits identity from didactic bulk                                                              |
| `scripts/seed-maestri-knowledge-vectors.ts`           | Chunks, embeds and persists the didactic bulk into pgvector (`npm run kb:seed`)                 |

**Out of scope**: user-generated content (covered by `DATA-RETENTION-POLICY.md` and
`DPIA.md`), model weights and provider terms (`SERVICE-INVENTORY.md`,
`DATA-FLOW-MAPPING.md`), and the repository's own code licence
(`LICENSE`, Apache-2.0 — see `LICENSE-STRATEGY.md`).

---

## 2. How the corpus is actually built (verified 17 Aug 2026)

The knowledge files are **written by the project**, not scraped. Each is a hand-authored
summary that names its reference material in a header comment, e.g.:

```
/**
 * Álex Pina Knowledge Base
 * Sources: IMDB, Wikipedia ES, Netflix interviews, El País
 */
```

31 of 32 files carry such a header. This SOP makes that informal habit a rule, and fixes
the exception (§6).

---

## 3. Source classification

Every reference used to author a knowledge file falls in one of four classes. The class
determines what may be taken.

| Class                                                                       | Examples in current corpus                                                                                                                                                                                                                            | What may be taken                                                                      | What may not                                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **A — Public domain**                                                       | Euclid's _Elements_, Plato, Homer, Shakespeare, Hippocratic corpus, Nightingale 1858, Noether 1918                                                                                                                                                    | Anything, including verbatim passages, with the edition/translation named              | Passing off a **modern translation** as public domain — the translation is not       |
| **B — Open licence with conditions**                                        | Wikipedia (CC BY-SA 4.0), Stanford Encyclopedia of Philosophy, MacTutor                                                                                                                                                                               | Facts, dates, structure of a topic                                                     | Copying sentences or distinctive phrasing — CC BY-SA would infect our Apache-2.0     |
| **C — Proprietary / all rights reserved**                                   | IMDB, El País, Netflix interviews, Britannica, Grove Music Online, Treccani, biographies (Herrera, Hodges, Wulf, Dick)                                                                                                                                | Facts only, re-expressed by us; short quotation with attribution where it is the point | Reproducing passages, tables, or a source's selection and arrangement                |
| **D — Living persons, in-copyright works, and characters used as personas** | Álex Pina (living); _Amici Miei_ (1975, Conte Mascetti — film in copyright); Antonio Cassese (d. 2011, works in copyright); TED experts (Anderson/Gallo/Duarte/Reynolds — living); Thich Nhat Hanh (d. 2022, works in copyright); paralympic athletes | Biographical fact and publicly reported statements                                     | Implying endorsement; trademark use; reproducing an author's or character's dialogue |

Class D carries risk **beyond copyright** — personality and image rights, trademark, and
misrepresentation. It is the class that most needs a human decision, not a rule.

---

## 4. Authoring rules (binding)

1. **Write it yourself.** A knowledge file states facts in MirrorBuddy's own words. Never
   paste a source's sentences, not even "temporarily".
2. **Quotation is deliberate, short and attributed.** A quotation is allowed when the
   _wording itself_ is the teaching object (a famous line, an aphorism). It must be
   attributed inline, kept to what the point requires, and never used to substitute for
   our own explanation. An unattributed quotation has no defence under art. 70 LdA or the
   EU quotation exception, however short it is. In **class D** files — in-copyright works,
   living persons, characters — a collected list of quotations is forbidden outright and
   is blocked by `knowledge-provenance.test.ts`; this rule was broken by four files until
   the G-4b review in §6.1, so it is now enforced rather than trusted.
3. **Name every source in the file header**, using the format in §5. A file with no
   provenance cannot be seeded.
4. **No Class B expression, ever.** Wikipedia is a starting point for facts, never a
   source of phrasing: CC BY-SA's share-alike is incompatible with redistributing this
   repository under Apache-2.0.
5. **Class D needs sign-off.** Adding, or materially rewriting, a Maestro based on a
   living person, an in-copyright work, or a fictional character requires the IP risk
   owner's explicit approval, recorded in the PR.
6. **No scraping.** Automated ingestion of third-party corpora into the RAG index is
   outside this SOP. Introducing one requires a new ADR, a DPIA delta, and legal review
   before any code is merged.
7. **Attribution survives.** Where a source requires attribution, it stays in the file
   header — the header ships with the repository.

---

## 5. Provenance header format

Every `*-knowledge.ts` file starts with:

```ts
/**
 * <Maestro> Knowledge Base
 * Sources: <named references, comma-separated>
 * Source class: A | B | C | D   (see DATA-GOVERNANCE-SOP.md §3)
 * Sign-off: <required for class D — name + date; otherwise "n/a">
 */
```

The `Sources:` line already exists in 31 of 32 files. `Source class:` and `Sign-off:` are
introduced by this SOP and are backfilled per the roadmap in §6.

---

## 6. Findings from the 17 Aug 2026 audit

**G-1 to G-5 were closed on 18 August 2026.** The findings are kept below as the record of
what was wrong; the resolution of each is in §6.1.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Action                                                                                                                                                                                                         | Owner    | Due                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-1 | `loto-knowledge.ts` has **no `Sources:` header**, and its content rests on Thich Nhat Hanh (d. 2022 — works in copyright, Plum Village is a trademark). Class D, unsigned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Add provenance header; confirm the text is our own expression; obtain class-D sign-off                                                                                                                         | Roberdan | 15 Sep 2026                                                                                                                                                                                                   |
| G-2 | `Source class:` and `Sign-off:` absent from all 32 files (introduced by this SOP).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Backfill headers across the corpus                                                                                                                                                                             | Roberdan | 15 Sep 2026                                                                                                                                                                                                   |
| G-3 | Class D Maestri (`alex-pina`, `amici-miei`, `chris`, `cassese`, `simone`, `loto`) have never had a recorded IP sign-off. Note that class D mixes two different risks: living persons (`alex-pina`, `chris`, `simone`) carry personality and endorsement risk; deceased authors and in-copyright works (`cassese` — Antonio Cassese, d. 2011, not Sabino; `loto` — Thich Nhat Hanh, d. 2022; `amici-miei` — 1975 film) carry copyright and character risk. The sign-off must state which applies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | One review pass, decision recorded per Maestro                                                                                                                                                                 | Roberdan | 15 Sep 2026                                                                                                                                                                                                   |
| G-4 | Wikipedia (CC BY-SA) is named as a source in ~10 files; no verification that no phrasing was carried over.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Spot-check those files against the rule in §4.4                                                                                                                                                                | Roberdan | 15 Sep 2026                                                                                                                                                                                                   |
| G-5 | No automated check prevents seeding a file without provenance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Consider a lint rule or a guard in `seed-maestri-knowledge-vectors.ts`                                                                                                                                         | Roberdan | 31 Oct 2026                                                                                                                                                                                                   |
| G-6 | The seeding pipeline for the corpus this SOP governs was **broken end to end**: nothing in `*-knowledge.ts` ever reached pgvector. The audit originally recorded two defects; verifying it against a live database uncovered five more, each of which alone was enough to keep the index empty. (a) `extract-mini-kb.ts` resolved `../src/data/maestri`, a pre-monorepo path. (b) `seed-maestri-knowledge-vectors.ts` chunked, embedded and **counted**, but never persisted. (c) `StoreEmbeddingInput.sourceType` did not include `'maestro_knowledge'` — the very value the retriever queries — so a correct seeder could not even typecheck. (d) `ContentEmbedding.userId` is a foreign key to `User.id` and the `SYSTEM_MAESTRO_KB` owner row was never created, so every insert violated the constraint. (e) `storeEmbedding` populates the native pgvector column fire-and-forget; a script exits before it lands, and the SQL search function filters `vectorNative IS NOT NULL`, so the rows would have been invisible. (f) `storeEmbedding` anonymised all content, and the PII heuristics rewrite the historical names the didactic content is _about_ («Il metodo Feynman» → «Il metodo [NOME]»), so the corpus would have been corrupted on the way in. (g) `MIN_SIMILARITY` was 0.5, but measured on-topic similarities run 0.30–0.63 (median 0.44), so even a correctly populated index returned nothing for 7 of 8 test questions. Consequence throughout: `maestro-knowledge-retriever.ts` degrades silently to an empty string per ADR 0033, so an unpopulated index was indistinguishable from a working one. | Repoint the extractor, add persistence, widen the source type, create the system owner row, await the native vector, exempt system-authored content from anonymisation, and set the threshold from measurement | Roberdan | ✅ RISOLTO 2026-08-18 — verificato end-to-end contro Postgres locale: 241 chunk, 30 maestri, 0 vettori nativi mancanti; il retriever restituisce contenuto reale e scarta le query fuori tema. Runbook in §8. |

### 6.1 Resolution, 18 August 2026

**G-1, G-2 — provenance headers.** All 32 files now carry `Source class:` and `Sign-off:`
per §5, and `loto-knowledge.ts` names its sources. Classification records the **most
restrictive** class among a file's sources, naming the reference that drives it, because
that is the class that governs what may be taken. Two files are class A, twenty-four are
class C, six are class D. No file is class B: Wikipedia is used for facts only, never as
the governing source of a file.

**G-3 — class D sign-off.** The six class D Maestri (`alex-pina`, `amici-miei`, `cassese`,
`chris`, `loto`, `simone`) now record a sign-off from the IP risk owner dated 18 August 2026. It is recorded for what it is: a **bulk delegation covering the whole roster on the
basis of this audit, not a per-file review**. That distinction is in the header of every
one of those files, so a future reader is not misled into thinking each Maestro was
individually examined.

**G-4 — Wikipedia phrasing.** The eleven files naming Wikipedia were checked sentence by
sentence against the article in the language edition each header names. Eight were clean:
facts taken, expression independent. Three were not, and were rewritten:

| File                      | What was found                                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simone-knowledge.ts`     | The medical-history paragraph followed Wikipedia's selection, order and phrasing; the 2014 paratriathlon sentence was a verbatim compression of a Wikipedia clause; the Polha Varese sentence drew the same three proper nouns from the same sentence. Biography rewritten. |
| `amici-miei-knowledge.ts` | "Architetto impiegato al comune" reproduced Wikipedia's character description word for word; the Sassaroli description reused its structure and choice of attributes. Both rewritten.                                                                                       |
| `cassese-knowledge.ts`    | The academic-career list mirrored Wikipedia's selection and sequence. Bare institutional facts are not expressive, but the arrangement was; rewritten as our own narrative.                                                                                                 |

Limits of that check, stated plainly: it is a targeted spot-check of the sentences most
likely to have been carried over, not an exhaustive comparison, and a few passages could
not be retrieved from the live articles for direct comparison and were judged on the
strongest evidence available. It does not establish that no phrasing anywhere derives
from Wikipedia; it establishes that the passages most at risk were examined and the
derivative ones removed.

**G-4b — reproduction of third-party works.** The G-4 check above asked only
"was phrasing carried over from Wikipedia?". That was the wrong question for the
files that carried the most risk, and the first review of this work rejected it
for exactly that reason. Wikipedia was never the issue for a Maestro built on a
television series: the series was.

Re-run with "does this file reproduce a third party's protected expression?" as
the criterion, five files failed:

| File                                                 | What was reproduced                                                                                                                                                                                                          | Action                                                                                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alex-pina`                                          | A curated list of _La Casa de Papel_ dialogue in Spanish and Italian, the named character roster with in-character descriptions, grammar examples voiced by those characters, and instructions to the model to speak as them | Dialogue and character voicing removed. Facts about Pina and his series kept — naming a work is not taking it. The Spanish itself is ordinary Spanish and stays                                                |
| `amici-miei`                                         | Verbatim dialogue from the 1975 Monicelli film, including the supercazzola lines, plus detailed plot and character relationships                                                                                             | Quotations replaced with an explanation of how the device is built, which is the part that actually teaches Italian syntax. The film's lexicon that entered the Zingarelli dictionary stays: it is now Italian |
| `cassese`                                            | Seven unattributed verbatim quotations from a jurist who died in 2011                                                                                                                                                        | Replaced with his positions in our words                                                                                                                                                                       |
| `simone`                                             | Six unattributed quotations from a living athlete, presented as his voice                                                                                                                                                    | Replaced with the themes he has expressed publicly, in our words                                                                                                                                               |
| `chris`                                              | Brene Brown's "stories are data with a soul" and a line from Chris Anderson's TED book, presented under "Famous Advice" as this Maestro's own                                                                                | Replaced with principles in our words, with the misattribution stated                                                                                                                                          |
| `alex-pina.ts` (persona prompt, outside this corpus) | Series catchphrases as the Maestro's own, in three separate places                                                                                                                                                           | Replaced. Fixing the knowledge file alone would have left the same output reachable                                                                                                                            |

Quotation is not forbidden. Italian law (art. 70 LdA) and the EU InfoSoc
directive allow it when it is short, serves explanation or criticism, and
**names the work it comes from**. What these files did was quote at length
with no attribution at all, which is the one form that has no defence. Where the
quotations were worth keeping, the SOP's answer is to source them properly, not
to launder them into paraphrase; that path is recorded in each file.

**Class C quotation sections, and the translations beside them.** Six class C
files carry quotation sections — `cervantes`, `goethe`, `manzoni`, `moliere`,
`omero`, `shakespeare`. Every one quotes an author whose works are in the public
domain, so quoting them is lawful and is the substance of teaching literature.
The C/D boundary is the right line for the quotations rule, which is why the
guard draws it there.

The originals were not the exposure; the Italian renderings printed next to them
were. A modern translation is its own protected work even when the original is
free, which §3 already said. Five of the six now state that their Italian
renderings are MirrorBuddy's own literal translations rather than an edition's.
`omero` additionally names Monti and Pindemonte as the canonical public-domain
translations to cite when the text itself is needed. `manzoni` needed nothing:
it quotes Italian originals.

**The failure mode worth remembering.** Both rounds of this work failed the same
way, and the second time it was caught by review rather than by me: the section
being edited got fixed while an untouched section a few lines away carried the
identical exposure. `alex-pina.ts` was declared fixed with two of its three
occurrences still live; `simone` had a quotation removed from one section and an
almost identical one left standing two sections below. The discipline this
demands is mechanical — grep the whole file, and then the whole corpus, for the
pattern, and never trust that a fix is complete because the part you were
looking at is clean.

**G-7 — quote attribution has never been verified (PARTIALLY CLOSED).** Sweeping the whole
corpus for quoted strings, rather than only quotation sections, turned up a
different problem from the one this card was closing: quotations attributed to
the wrong person. Two were found incidentally and fixed — the "if you can't
explain it simply" aphorism, which has never been traced to Feynman, and
"Simplicity is the ultimate sophistication", which does not appear in Leonardo's
writings. `chris-knowledge.ts` also presented Brene Brown's "stories are data
with a soul" as its own Maestro's advice.

This is a content-accuracy finding, not an IP one, and **it is not closed**. No
systematic verification of the corpus's quotations has been done; three were
found by accident while looking for something else, which is a poor basis for
assuming the rest are sound. Owner: to be assigned. It should be a pass in its
own right, not folded into an IP review.

The gate on this card widened G-7 by demonstration. Both guards fired on a
heading — `knowledge-provenance.test.ts` looked for a quotations _section_ in a
class D file — so in-character dialogue written into ordinary prose passed
untouched. Proven by mutation: fabricated speaker-attributed dialogue inserted
under `## Stile Comunicativo` in `alex-pina-knowledge.ts`, propagated into the
mini-KB with `npm run kb:extract`, left both guards green and would have shipped
to the model.

**That half is now closed.** `attributed-quotes.ts` reads the full text and
looks for the shape that carries the risk — a quoted string presented as a named
person's or character's own words — in four forms: a verb of speech before the
quote, after it, script form at the start of a line, and an em-dash attribution.
`knowledge-provenance.test.ts` fails the build on any hit in a class D file.
Both mutations go red and name file, line and speaker.

Calibrating it against the corpus decided its shape. A bare quoted-string sweep
returns 64 hits in class D alone, nearly all work titles (`"La Casa de Papel"`),
coined terms (`"la banda"`) and the Maestro's own coaching prompts — flagging
those would have trained everyone to ignore the guard. Requiring an attribution
cuts the whole corpus to 6. Five are public-domain works quoted legitimately
(Manzoni's Don Abbondio and Lucia, Homer's two incipits, Herodotus at
Thermopylae) and sit in class C files, where the rule does not fire — the guard
runs on class D only. The sixth
was the real one: `cassese-knowledge.ts` presenting `"non ancora disillusi"` as
Cassese's own words outside any quotation heading, now rewritten as indirect
speech.

Locale codes and layout markers (`ES:`, `Student:`, `Inizio:`) are excluded by
name in `STRUCTURAL_LABELS`; without that list the script form reads `ES: "el
plan"` as a person quoting Spanish.

**What remains open in G-7 is the accuracy half**, and it is the larger one: no
systematic verification that the corpus's quotations are correctly attributed.
The new guard says nothing about this — it asks whether a quote is presented as
someone's words, never whether they actually said them. The three known
misattributions were all found by accident. Owner: to be assigned.

### 6.2 G-7 accuracy, 30 August 2026 — the card lines (PARTIALLY CLOSED)

**Where the audit had not looked at all.** Every G-7 guard reads the knowledge
corpus. `apps/web/src/data/maestri/quotes.ts` is not in the corpus: it is 168
lines of code, six per maestro, rendered by `QuoteRotator` on every maestro card
in quotation marks, in italics, announced to screen readers as _citazione
motivazionale_. It has no `Citazioni` heading and no `X disse: "…"` form, so
neither `knowledge-provenance` nor `attributed-quotes` could see it. It had
never been reviewed by anything.

**Seven false attributions were live on those cards**, each verified against an
independent source on 30 Aug 2026:

| Maestro     | Line shown                                                                | Actually                                                                                               |
| ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Darwin      | «Non è il più forte che sopravvive, ma il più adattabile»                 | Leon C. Megginson, 1963 — the Darwin Correspondence Project lists it among things Darwin never said    |
| Feynman     | «Se non riesci a spiegarlo in modo semplice, non l'hai capito abbastanza» | Undocumented in his lectures and writings; the traceable root is a remark of Rutherford's              |
| Erodoto     | «La storia è maestra di vita»                                             | Cicero, _De Oratore_ II.36 — four centuries later                                                      |
| Shakespeare | «The pen is mightier than the sword»                                      | Edward Bulwer-Lytton, _Richelieu_, 1839                                                                |
| Shakespeare | «Language is the dress of thought»                                        | Samuel Johnson, _The Rambler_ 60, 1750                                                                 |
| Shakespeare | «All the world's a stage, **and learning is your greatest role**»         | First half genuine (_As You Like It_ II.vii); the second was welded on inside the same quotation marks |
| Ippocrate   | «Fa che il cibo sia la tua medicina»                                      | Absent from the whole Hippocratic Corpus (Cardenas, 2013)                                              |

Two more were live in the corpus itself, and therefore in the model's prompt:
`ippocrate-knowledge.ts` presented the same food/medicine line as a _Famous
Quote_ (as well as `primum non nocere`, a later Latin maxim rather than the
Corpus's «giovare, o almeno non nuocere»), and `mozart-knowledge.ts` gave «the
music is not in the notes, but in the silence between» as Mozart's, when the
idea is Debussy's. Both were corrected in the knowledge file _and_ regenerated
through `npm run kb:extract`, so the correction reached `mini-kb/` — the G-8
lesson applied rather than restated.

**The larger finding is not the seven.** Of the 168 lines, the overwhelming
majority are written by MirrorBuddy, not quoted from anyone — and they were
displayed in quotation marks beneath a real person's face. That is not a
copyright exposure; it is a truthfulness one, in a product used by children who
are learning.

**The fix is structural, not another detector.** A detector looks where a
problem has already appeared, which is precisely how this file escaped three
rounds of review. `quotes.ts` now admits exactly two kinds of entry:

- a bare string — written by MirrorBuddy in that maestro's spirit. `QuoteRotator`
  renders it **without quotation marks** and labels it `fraseDelMaestro`.
- an object `{ text, source }` — a real quotation, which **must** name its work.
  The card renders the source beneath it, labelled `citazioneMotivazionale`.

There is no way to express "reads as a quotation but cites nothing".
`data/maestri/__tests__/quote-attribution.test.ts` enforces the shape and holds
a blocklist of the eight fragments above; it was proved by mutation on 30 Aug
2026 (reinstating the Darwin line fails the build with the true author named).

**What is still open.** This closes the _card lines_. It does not close the
accuracy of the ~5000-line knowledge corpus: only the two mottos named above
were verified there, prompted by a corpus-wide sweep for speaker-attributed
quotations (41 hits, 30 of them structural labels). A quotation embedded in
ordinary prose without an attributing verb remains unverified. Owner of the
remaining corpus sweep: to be assigned.

**Also recorded, not fixed here:** all 168 lines exist only in Italian, in a
five-locale product; a French or German student reads the maestro card in
Italian. The four `QuoteRotator` accessibility labels had the same defect — all
five locale files carried the Italian string — and were translated as part of
this change, because a screen-reader label in the wrong language is an
accessibility failure, not a copy nit.

**G-8 — the removals were not reaching the model (CLOSED).** Every sanitisation
on this card edited `*-knowledge.ts`. But each knowledge file has a second,
committed derivative: `mini-kb/<slug>.ts`, generated by
`scripts/extract-mini-kb.ts`, and it is the mini-KB — not the knowledge file —
that the persona prompt inlines. Nobody re-ran the generator. So after two
rounds of removals, `mini-kb/alex-pina.ts` still carried the series dialogue,
the character-attributed lines and the catchphrases, and was still sending them
to the model. The removals were real in the source of truth and fictional in the
artefact that ships.

Regenerating exposed a second hazard: six mini-KBs — `austen`, `kahlo`, `loto`,
`nightingale`, `noether`, `turing` — are written by hand, in a first-person
voice no section-picking heuristic can produce, and `npm run kb:extract`
overwrote all six without a word. Anyone who fixed an IP problem correctly would
have destroyed them. The extractor now recognises hand-authored files by the
absence of its own generated-by marker and leaves them alone, naming them in its
output.

`mini-kb-sync.test.ts` fails the build when a generated mini-KB no longer matches
what the extractor would produce from its knowledge file, and when the
hand-authored roster changes without being declared. Proven by mutation:
restoring the pre-sanitisation `mini-kb/alex-pina.ts` fails the build with the
instruction to re-run the extractor.

This is the third instance of the failure mode recorded above, and the sharpest:
the fix was correct, complete within the file being looked at, and did not take
effect. **A corpus change is not done when the source file is clean — it is done
when every derived artefact has been regenerated and committed.**

**G-5 — automated check.** `apps/web/src/lib/compliance/__tests__/knowledge-provenance.test.ts`
fails the build when a knowledge file has no sources, no source class, a class D file
carries no named sign-off, the class D roster changes without being declared, or a class D
file collects quotations from its source. Proven by mutation on all four evasions:
removing a `Sources:` line, downgrading a class D sign-off to `n/a`, relabelling a class D
file as class C to dodge the sign-off requirement, and adding a quotations section to a
class D file.

The quotations rule earns its place: it was written after the G-4b review and immediately
found two files — `cassese` and `simone` — that the human review had not flagged.

It does not prove a file is free of reproduced expression. Quotations scattered through
prose under no heading pass it. It removes the specific blind spot that got past a human
audit, and claims nothing more.

The rule the test cannot enforce is §4: that the words are ours. That still rests on
review, which is why the cadence in §7 exists — and G-4b is the evidence that the review
has to ask the right question, not merely be performed.

G-6 was an operational break, not an IP one — but it means the provenance controls in this SOP currently govern content that is not being served from the vector store; the rest are **documentation and review gaps, not known infringements**: the corpus is
authored in-house and every file but one names its references.

**G-9 — content that reached no runtime path (CLOSED).** A knowledge file feeds
the model through two channels and only two: the mini-KB inlined into the persona
prompt, and the didactic text embedded for RAG. Identity sections went to the
first, everything else to the second — and the mini-KB is capped at 50 lines, so
the tail of a long identity section landed in neither. 305 lines across 17 of the
32 Maestri existed in this repository and nowhere in the running system. A
further 71 lines were stranded differently: for the six hand-authored mini-KBs
the generated one is computed and discarded, taking its identity content with it.

The cap stays — it is paid for on every prompt. The overflow is appended to the
didactic text instead, so it is retrieved when relevant rather than carried
always. Committed mini-KBs are byte-identical after regeneration: the prompt did
not change. `knowledge-reachability.test.ts` asserts line by line across the
corpus that nothing falls outside both channels, and reads the _committed_
mini-KB for hand-authored Maestri rather than a recomputed one — the first
version of the guard did recompute it, and passed while Austen's identity facts
were reachable from nowhere.

**G-10 — a Maestro absent from the index, silently (CLOSED).** All six of
`chris`'s sections matched the identity patterns, so his didactic text was empty,
the seeder produced no chunks for him, and the store held 31 distinct sourceIds
for 32 files. Nothing failed: an empty file chunks to an empty list, which is
indistinguishable from a successful no-op, and the retriever returns an empty
string rather than an error. The model answered from the persona prompt alone
and the gap was invisible from the outside.

`chris` now carries didactic content as a consequence of the G-9 fix — his
identity overflow is routed to RAG — so the corpus seeds 32 of 32, 292 chunks
(measured from a clean regeneration on 20 Aug 2026 against `main`; the 291
recorded on 19 Aug was measured on the G-9 branch before the G-7 fix to
`cassese-knowledge.ts` merged, and the 281 before it predated the hand-authored
fix in G-9 — both were counts taken on a branch that was not yet what ships,
which is the recurring error here: measure on `main`). Two controls keep
it that way: `rag-coverage.test.ts` fails the build if any Maestro yields zero
chunks, and the seeder now exits non-zero naming the empty Maestri instead of
reporting success. If a Maestro ever legitimately must not be retrievable, that
decision has to be recorded here and excluded in the test explicitly — not
achieved by silence.

**These two findings are now closed in production as well.** The guards prove
the corpus is seedable; they cannot prove it has been seeded. Embeddings are
written only by an explicit `npm run kb:seed` run, which no workflow performs
automatically, so until the run below the production vector store did not serve
the fixed index.

**Production seed — 20 Aug 2026, 292 chunks across 32 of 32 Maestri**
(`NODE_ENV=production npm run kb:seed -- --yes`, target
`aws-1-eu-west-1.pooler.supabase.com`, 32 771 embedding tokens). Verification
reported 292 rows, 32 Maestri covered and 0 rows with a NULL `vectorNative`.

That run also corrected the record. This section previously stated that
production held a pre-fix index of 31 sourceIds; it did not. The seeder had to
create the `SYSTEM_MAESTRO_KB` owner row, which means no seed had ever persisted
in production and the Maestro RAG store was **empty**, not stale — the runtime
consequence of G-6, whose corpus-side fix could never have reached production on
its own. Retrieval returned nothing for every Maestro, and every answer came
from the persona prompt alone. Assume nothing about the store from a green
suite: only a recorded run like this one is evidence.

Whoever re-seeds should append the date and the resulting chunk count here.

**G-11 — the retriever ranks every Maestro against every other (OPEN).**
`retrieveMaestroKnowledge` asks `searchSimilar` for the top 3 chunks filtered
only by `sourceType`, then discards the ones whose `sourceId` is a different
Maestro. `SearchOptions` does not expose `sourceId` at all, in the SQL function
or in the JS fallback, so a Maestro's own material has to outrank the other 31
before it can be read. Measured against production on 20 Aug 2026 in the most
favourable case — the query lifted verbatim from the Maestro's own chunk — 69
chunks were retrieved where 83 were available (−17%), with 11 of 32 Maestri
degraded and three down to one chunk of three. With an ordinary question the
floor is zero: "spiegami la fisica in modo semplice" returns nothing for
`feynman`. This is the same failure shape as G-10 — content present in the store
and absent from the prompt — one layer further out. Card `260820-122631`.

**G-12 — the pgvector search function is missing in production (OPEN).**
`_prisma_migrations` records `20260117183800_pgvector` as applied on 20 Jan
2026, but `pg_proc` in production holds no `search_similar_embeddings`: every
vector search raises `42883`, logs `Native search failed, falling back to JS`
and scans in JavaScript instead. The fallback reads `take: 1000` rows in no
particular order and computes cosine in memory, so past 1000 rows for a
`userId` + `sourceType` the search silently becomes partial, and no HNSW index
is ever used. This affects all RAG, not only the Maestri corpus, and nothing
detects the gap between a migration recorded as applied and the object it was
supposed to create. Card `260820-122649`.

**G-12 resolved (20 August 2026).** The function was created in production
(seven-argument signature, `hnsw.iterative_scan = strict_order`,
`hnsw.ef_search = 100`), together with the HNSW index on
`ContentEmbedding.vectorNative` and the two supporting indexes that the same
migration had never created either. Native vector search now runs in
production; no probe reports the JS fallback.

The lasting part is the check, not the repair. `scripts/check-migrations-applied.ts`
previously printed "Database schema matches the migrations in the repo" over
exactly this database, because a row in `_prisma_migrations` is a statement
about what was run, not evidence of what exists. It now _calls_
`search_similar_embeddings` — a `pg_proc` lookup would also have passed against
a stale six-argument body — and fails the run when the call raises `42883`. It
runs in the production promotion gate (`promote-to-production.yml`), so a
database that cannot answer a vector search can no longer be promoted to.
`scripts/validate-pre-deploy.ts` performs the same probe and additionally
reports a missing HNSW index as a warning.

Proven in both directions against a real database on 20 August 2026: with the
function dropped, the checker reported `46 applied, 0 pending` and still exited
1; with the migration re-applied it exited 0.

---

## 7. Review cadence

- **Per PR**: any change under `apps/web/src/data/maestri/` requires a provenance header
  that satisfies §5; class D changes require sign-off in the PR.
- **Every 6 months**: re-run the audit in §6 (header coverage, class D roster, source
  classification drift). Next: **17 February 2027**.
- **On trigger**: a new Maestro, a new source type, or any proposal to ingest an external
  corpus.

---

## 8. Seeding runbook

The corpus governed by this SOP only reaches students if it is actually indexed.
The root cause of G-6 was not a single bug but the absence of a runnable, documented
pipeline: neither script had an npm entry point, so nothing ever ran them and no failure
was ever observed.

```bash
# 1. Split identity from didactic bulk (writes .tmp/didactic-content, gitignored).
#    --didactic-only leaves the committed mini-kb files alone; drop it only when you
#    intend to regenerate identity files that maestro definitions import.
npm run kb:extract -- --didactic-only

# 2. Chunk, embed and persist into pgvector.
npm run kb:seed -- --dry-run     # counts chunks, no embeddings, no writes
npm run kb:seed                  # local database
npm run kb:seed -- --maestro=feynman

# Production. NODE_ENV=production is not optional: without it the client rewrites a
# Supabase URL to local PostgreSQL, and the run would report success having written
# nothing to production. The seeder refuses that combination rather than let it pass.
NODE_ENV=production npm run kb:seed -- --yes
```

Requirements: `DATABASE_URL`, plus `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` and
`AZURE_OPENAI_EMBEDDING_DEPLOYMENT`. `npm run kb:seed` reads `.env` if one is present.

Three targeting guards run before anything is written, because a seed run that quietly
writes to the wrong database is worse than one that refuses to start:

1. The **effective** target is resolved the same way `packages/db/src/client.ts` resolves
   it, and both the declared and the effective host are printed.
2. A non-local effective host is refused without `--yes`.
3. `--yes` together with a remote `DATABASE_URL` that would be rewritten to local is
   refused outright — that is the failure mode where production looks seeded and is not.
   The open connection is then confirmed against the approved target before the first
   write.

The run is idempotent per maestro. Every chunk is embedded **before** any row is deleted,
so a provider timeout or rate limit leaves the existing corpus untouched instead of
half-replaced. Rows stored under a `sourceId` that is not a registered maestro are pruned:
the retriever can never return them, and they are the fingerprint of a knowledge file
seeded under its file slug instead of its runtime ID.

It ends with a verification pass that fails the run if no rows were written or if any row
lacks a native vector — the two states that previously produced a silent empty index.

**Slug is not always the maestro ID.** `amici-miei-knowledge.ts` carries the Conte
Mascetti persona, which the runtime serves as `mascetti`; the retriever matches
`sourceId` against the runtime ID, so seeding under the slug stores rows nothing can
retrieve. The mapping lives in `scripts/lib/maestri-kb/corpus.ts` and a unit test fails if
any committed knowledge file resolves to no registered maestro.

**Verified on 18 Aug 2026** against local PostgreSQL 17 + pgvector 0.8.6: 241 chunks
across 30 maestri, 0 rows missing a native vector, retrieval returning real content and
rejecting off-topic queries. Re-verified after review: the 13 Mascetti chunks now land
under `mascetti`, and the stale `amici-miei` rows were pruned automatically.

That run predates G-9 and G-10. Two maestri (`chris`, `simone`) produced zero
didactic chunks then, because every section of their knowledge file matched an
identity pattern in `extract-mini-kb.ts`. It was recorded here as acceptable —
they contribute identity only — which was the wrong call: the identity content
past the mini-KB cap was reaching no runtime path at all, so they were not
contributing it either. Both now carry didactic content, the corpus seeds 32 of
32, and a Maestro producing zero chunks is a build failure rather than a note in
this document. See G-9 and G-10.

## 9. Related documents

- `AI-ACT-REMEDIATION-TRACKER.md` — item P2-3 (this SOP), P2-1 (watermarking)
- `docs/adr/0031-embedded-knowledge-base-for-character-maestri.md` — why the KB is embedded
- `docs/adr/0033-rag-semantic-search.md` — retrieval architecture
- `LICENSE-STRATEGY.md` — Apache-2.0 rationale and where value lives
- `DATA-FLOW-MAPPING.md`, `SERVICE-INVENTORY.md` — processors and model providers
