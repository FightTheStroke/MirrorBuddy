# Data Governance SOP — Knowledge Base Sources (IP & Copyright)

**Status**: Active | Last Updated: 17 August 2026 | Next Review: 17 February 2027
**Owner**: Roberdan (product / IP risk owner, FightTheStroke)
**Closes**: AI-Act remediation tracker item **P2-3**

---

## Executive Summary

MirrorBuddy's 27 Maestri answer from a **retrieval-augmented knowledge base** built from
32 didactic files in `apps/web/src/data/maestri/*-knowledge.ts`. Those files are the only
corpus indexed into pgvector for RAG (`scripts/seed-maestri-knowledge-vectors.ts`).

This SOP defines where that content may come from, what may be copied, what must be
rewritten, how provenance is recorded, and who reviews it.

**Key principle**: the knowledge base carries **facts and our own expression of them**.
It does not carry third-party expression. Facts are not copyrightable; the sentences that
convey them are.

---

## 1. Scope

**In scope** — the RAG corpus and everything that feeds it:

| Artefact                                              | Role                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web/src/data/maestri/*-knowledge.ts` (32 files) | Authored didactic content; the only corpus seeded into pgvector |
| `apps/web/src/data/maestri/mini-kb/`                  | Identity extract (bio, style, quotes) used in prompt build      |
| `scripts/extract-mini-kb.ts`                          | Splits identity from didactic bulk                              |
| `scripts/seed-maestri-knowledge-vectors.ts`           | Chunks and embeds the didactic bulk                             |

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

| Class                                                                       | Examples in current corpus                                                                                                                                   | What may be taken                                                                      | What may not                                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **A — Public domain**                                                       | Euclid's _Elements_, Plato, Homer, Shakespeare, Hippocratic corpus, Nightingale 1858, Noether 1918                                                           | Anything, including verbatim passages, with the edition/translation named              | Passing off a **modern translation** as public domain — the translation is not       |
| **B — Open licence with conditions**                                        | Wikipedia (CC BY-SA 4.0), Stanford Encyclopedia of Philosophy, MacTutor                                                                                      | Facts, dates, structure of a topic                                                     | Copying sentences or distinctive phrasing — CC BY-SA would infect our Apache-2.0     |
| **C — Proprietary / all rights reserved**                                   | IMDB, El País, Netflix interviews, Britannica, Grove Music Online, Treccani, biographies (Herrera, Hodges, Wulf, Dick)                                       | Facts only, re-expressed by us; short quotation with attribution where it is the point | Reproducing passages, tables, or a source's selection and arrangement                |
| **D — Living persons, in-copyright works, and characters used as personas** | Álex Pina; _Amici Miei_ (1975, Conte Mascetti); Sabino Cassese; TED experts (Anderson/Gallo/Duarte/Reynolds); Thich Nhat Hanh (d. 2022); paralympic athletes | Biographical fact and publicly reported statements                                     | Implying endorsement; trademark use; reproducing an author's or character's dialogue |

Class D carries risk **beyond copyright** — personality and image rights, trademark, and
misrepresentation. It is the class that most needs a human decision, not a rule.

---

## 4. Authoring rules (binding)

1. **Write it yourself.** A knowledge file states facts in MirrorBuddy's own words. Never
   paste a source's sentences, not even "temporarily".
2. **Quotation is deliberate and short.** A quotation is allowed when the _wording itself_
   is the teaching object (a famous line, an aphorism). It must be attributed inline, kept
   to what the point requires, and never used to substitute for our own explanation.
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

| #   | Finding                                                                                                                                                                                                                                                                                                                                                     | Action                                                                                 | Owner    | Due         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- | ----------- |
| G-1 | `loto-knowledge.ts` has **no `Sources:` header**, and its content rests on Thich Nhat Hanh (d. 2022 — works in copyright, Plum Village is a trademark). Class D, unsigned.                                                                                                                                                                                  | Add provenance header; confirm the text is our own expression; obtain class-D sign-off | Roberdan | 15 Sep 2026 |
| G-2 | `Source class:` and `Sign-off:` absent from all 32 files (introduced by this SOP).                                                                                                                                                                                                                                                                          | Backfill headers across the corpus                                                     | Roberdan | 15 Sep 2026 |
| G-3 | Class D Maestri (`alex-pina`, `amici-miei`, `chris`, `cassese`, `simone`, `loto`) have never had a recorded IP sign-off.                                                                                                                                                                                                                                    | One review pass, decision recorded per Maestro                                         | Roberdan | 15 Sep 2026 |
| G-4 | Wikipedia (CC BY-SA) is named as a source in ~10 files; no verification that no phrasing was carried over.                                                                                                                                                                                                                                                  | Spot-check those files against the rule in §4.4                                        | Roberdan | 15 Sep 2026 |
| G-5 | No automated check prevents seeding a file without provenance.                                                                                                                                                                                                                                                                                              | Consider a lint rule or a guard in `seed-maestri-knowledge-vectors.ts`                 | Roberdan | 31 Oct 2026 |
| G-6 | `extract-mini-kb.ts` and `seed-maestri-knowledge-vectors.ts` still resolve `../src/data/maestri`, a **pre-monorepo path that no longer exists** (the files moved to `apps/web/src/data/maestri`). The seeding pipeline described in §2 cannot run as written. Found while auditing, not fixed here — it needs its own verification against a live database. | Repoint the scripts and confirm a seed run end-to-end                                  | Roberdan | 30 Sep 2026 |

G-6 is an operational break, not an IP one; the rest are **documentation and review gaps, not known infringements**: the corpus is
authored in-house and every file but one names its references.

---

## 7. Review cadence

- **Per PR**: any change under `apps/web/src/data/maestri/` requires a provenance header
  that satisfies §5; class D changes require sign-off in the PR.
- **Every 6 months**: re-run the audit in §6 (header coverage, class D roster, source
  classification drift). Next: **17 February 2027**.
- **On trigger**: a new Maestro, a new source type, or any proposal to ingest an external
  corpus.

---

## 8. Related documents

- `AI-ACT-REMEDIATION-TRACKER.md` — item P2-3 (this SOP), P2-1 (watermarking)
- `docs/adr/0031-embedded-knowledge-base-for-character-maestri.md` — why the KB is embedded
- `docs/adr/0033-rag-semantic-search.md` — retrieval architecture
- `LICENSE-STRATEGY.md` — Apache-2.0 rationale and where value lives
- `DATA-FLOW-MAPPING.md`, `SERVICE-INVENTORY.md` — processors and model providers
