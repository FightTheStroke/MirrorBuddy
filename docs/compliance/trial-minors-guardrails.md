# Trial Guardrails for Minors (COMP-01)

Status: implemented on `feat/ux-simplification-intention-based` — 2026-06-12
Scope: child-facing Trial surfaces in the web app (`apps/web`).
Related: focus-group run `docs/focus-group/runs/2026-06-11-pilot3` (FG-10),
UX-03 ("ask a grown-up" tier-lock dialog), A11Y-05 (distractionFreeMode).

## 1. Problem

MirrorBuddy's primary users are children 6–14 with learning differences. The
anonymous **Trial** flow rendered adult/commercial surfaces directly in the
child space (the intention-based home):

| Surface                                        | What the child saw                                                                    | Where it led                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `TrialHomeBanner` (home main area)             | quota progress bar, "X/Y", "Richiedi Accesso" CTA                                     | `/invite/request` (PII form)                              |
| `TrialUsageDashboard` (home aside, lg screens) | "Chat Sessions 20%", "X di Y usati", upsell copy, "Richiedi invito per continuare"    | `/invite-request` (dead path; fixed to `/invite/request`) |
| Header trial badge                             | "Prova 7/10" (not understood by a 9-year-old — FG-10)                                 | `/invite/request`                                         |
| Sidebar trial block (top, above child nav)     | usage counters + "Accedi" + "Richiedi Accesso"                                        | `/login`, `/invite/request`                               |
| Trial toasts (`useTrialToasts`)                | promo welcome, 3-left/1-left upsell, exhaustion — each with a "request access" action | `/invite/request`                                         |

`distractionFreeMode` (A11Y-05) hid some of these, but the DEFAULT profile
showed them all: an accessibility setting was acting as the only barrier
between a minor and commercial/data-collecting CTAs.

### What `/invite/request` collects

`apps/web/src/app/[locale]/invite/request/page.tsx` solicits, with no age or
parental check: **name** (free text), **email** (required), **motivation**
(free text, min 20 chars), plus the `mirrorbuddy-visitor-id` cookie value. It
POSTs to `/api/invites/request`. If a child fills it in, the platform collects
a minor's PII without verifiable parental consent.

## 2. Framework references

- **GDPR Art. 8** (+ Italian D.Lgs. 196/2003 as amended, age of digital
  consent in Italy = 14): information-society services offered directly to a
  child require parental consent below the age threshold; data minimization
  (Art. 5(1)(c)) forbids soliciting PII the child journey does not need.
- **COPPA** (if/where applicable): no collection of personal information from
  under-13s without verifiable parental consent; no conditioning of
  participation on disclosing more data than necessary.
- **EU AI Act (2024/1689)**, recital/Art. 5 considerations on exploiting
  vulnerabilities of children; transparency duties toward users.
- **Italian Law 132/2025**: minors under 14 require parental consent for AI
  service access.
- **Unfair commercial practice rules** (UCPD Annex I #28): direct exhortations
  to children to buy, or to persuade adults to buy, are blacklisted. Even a
  free "request invite" CTA aimed at a child is the pattern to avoid.

Guiding principle applied: **commercial/account actions belong to the adult**;
the child gets, at most, a neutral "ask a grown-up" message (existing UX-03
pattern), with no numbers, prices, or data solicitation.

## 3. What changed (code)

| #   | Guardrail                                                                                                                                                                                                                                                                                                      | File(s)                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `TrialHomeBanner` removed from the child home entirely (was suppressed only by distractionFreeMode)                                                                                                                                                                                                            | `src/app/[locale]/page.tsx`                                                                      |
| 2   | `TrialUsageDashboard` renders ONLY next to the parent area (`currentView === 'genitori'`), never beside the child learning flow; its CTA path fixed `/invite-request` → `/invite/request`                                                                                                                      | `src/app/[locale]/page.tsx`, `src/components/trial/trial-usage-dashboard.tsx`                    |
| 3   | Header trial badge ("Prova 7/10" → invite form) removed; `trialStatus` prop dropped from `HomeHeader`                                                                                                                                                                                                          | `src/app/[locale]/home-header.tsx`, `page.tsx`                                                   |
| 4   | Sidebar trial block (counters + "Accedi" + "Richiedi Accesso") moved INSIDE the "Per i grandi" group — adult framing, below child nav                                                                                                                                                                          | `src/app/[locale]/home-sidebar.tsx`                                                              |
| 5   | `useTrialToasts` gains `childSafe` mode, always on for the home: no promo welcome toast, no 3-left/1-left upsell, exhaustion shows "I messaggi di prova per oggi sono finiti / Chiedi a un grande…" with NO action and NO navigation. Telemetry unchanged. `distractionFreeMode` remains an extra layer on top | `src/lib/hooks/use-trial-toasts.ts`, `page.tsx`, `messages/*/auth.json` (`trialToastChildDone*`) |
| 6   | `/invite/request` page now carries an explicit adults-only notice ("Questa pagina è per i grandi: genitori, insegnanti o tutori.") in 5 locales                                                                                                                                                                | `src/app/[locale]/invite/request/page.tsx`, `messages/*/auth.json` (`invite.adultsOnlyNotice`)   |

Regression tests: `src/lib/hooks/__tests__/use-trial-toasts.test.ts`
(childSafe block), `src/app/[locale]/__tests__/home-header.test.tsx`,
`src/app/[locale]/__tests__/home-sidebar.test.tsx`,
`e2e/trial-dashboard.spec.ts` (rewritten as child-space guardrail spec),
`e2e/production-smoke/02-welcome.spec.ts` (trial assertions updated).

Not changed (verified dormant): `LimitReachedModal`, `UpgradePrompt`,
`EmailCapturePrompt`, `BudgetExhaustedBanner`, `TrialOnboarding`,
`TrialHeaderDropdown`, welcome `TrialLimitsBanner` are exported but not
rendered anywhere in the current flow. If any is re-wired, it MUST go through
this guardrail review first.

## 4. Deliberately restrictive choices (hypotheses to validate)

- The home is treated as **always child-facing**: even an adult using the home
  sees no quota banner there (they have the sidebar group + parent area). If
  product wants adult-on-home surfaces back, they need an adult-context signal
  (e.g. parent PIN session), not a default-on banner.
- Sidebar trial block renders only when the sidebar is expanded (collapsed
  rail shows no counters). Less information density for the child; the adult
  can expand.
- The 3-left/1-left warnings were dropped for the child rather than rewritten:
  scarcity pressure on a minor is the pattern to remove, not to rephrase.

## 5. ⚑ DA VALIDARE LEGALMENTE (human/legal sign-off required)

- [ ] ⚑ **`/invite/request` remains publicly reachable by URL** and collects
      name + email + motivation + visitorId with NO age verification or
      parental gate. The adults-only notice added here is informative, not a
      control. Decide: parental gate / age-neutral declaration ("I am a
      parent/guardian") / move behind the parent area. GDPR Art. 8 + Law
      132/2025 likely require more than a notice.
- [ ] ⚑ **Exact COPPA wording** of the adults-only notice and of the child
      limit message ("Chiedi a un grande…") — current copy is a working draft
      in 5 locales, not legally reviewed.
- [ ] ⚑ **Linking `visitorId` (trial usage telemetry) to the submitted email**
      in `/api/invites/request` joins a child's pseudonymous usage data to an
      adult's PII. Confirm lawful basis + retention in the DPIA.
- [ ] ⚑ **Login under "Per i grandi"**: we assume account management is the
      adult's job (Italy: digital consent age 14; the product targets 6–14).
      Confirm policy for 14-year-olds who may self-register.
- [ ] ⚑ **Telemetry toward minors** (`trackBetaCtaShown/Clicked`,
      `trackTrialChat`, `trackTrialLimitHit` on the anonymous visitor):
      confirm it stays within the consent already collected by the trial
      consent gate.
- [ ] ⚑ **DPIA / AI-POLICY update**: this guardrail set should be reflected in
      `docs/compliance/DPIA.md` (child-facing commercial surfaces removed) at
      the next document revision.

## Aggiornamento — grown-up gate implementato (2026-06-12, commit `08f41512`)

Decisione presa (opzione "media"): aggiunto un **GrownUpGate** child-resistant (sfida aritmetica 2 cifre + framing "per i grandi", `@/components/safety/grown-up-gate.tsx`) PRIMA di:

- **`/invite/request`** — il form PII non si renderizza finché un adulto non supera il gate (un bambino non può auto-inviare i propri dati);
- **le viste "Per i grandi"** della home (maestri/calendar/settings/genitori) — gate al primo ingresso per sessione.

Stato "verified" per-sessione (`sessionStorage`, ADR 0015). Test: 3 unit + 2 E2E.

⚠️ **Resta aperto (⚑ #1, issue #431)**: questo è uno **screen UI**, NON un consenso genitoriale verificabile ai sensi di GDPR Art. 8 / COPPA / L. 132/2025. Riduce il rischio (screening intent + barriera), ma la sufficienza legale e l'eventuale necessità di un consenso verificabile (es. verifica email genitore) richiedono **decisione/firma legale**.
