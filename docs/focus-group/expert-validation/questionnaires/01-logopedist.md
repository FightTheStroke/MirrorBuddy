# Expert Questionnaire — E01: Logopedist / Speech-Language Pathologist

> **Expert code**: E01
> **Specialty**: Speech-language pathology — reading, writing, language processing, dyslexia (DSA), developmental language disorder.
> **Platform surface reviewed**: MirrorBuddy intention-based home screen (feat/ux-simplification-intention-based), handoff banner, subject picker, in-session chat interface.
> **Run data referenced**: pilot3 (2026-06-11), pass2 (2026-06-11)

---

## Section 1 — Synthetic persona review

You are reviewing the following synthetic persona used in the simulated focus-group runs. Please assess its clinical plausibility.

**Persona P1 — Marco (age 9, dyslexia + ADHD, Trial tier)**

> Marco ha una diagnosi di dislessia evolutiva e ADHD. Legge lentamente e fa fatica con le parole lunghe o poco comuni. Le emoji e i simboli visivi lo aiutano a navigare senza leggere tutto. Ha una soglia di attenzione breve; preferisce toccare/esplorare piuttosto che leggere le istruzioni. Usa lo smartphone con gesture fluide. Il testo a grandezza standard gli risulta faticoso; il TTS (sintesi vocale) è un supporto chiave. Ha 9 anni.

| Question                                                                                                                                  | Your response |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1.1 Does persona P1 (Marco, 9, dyslexia+ADHD) behave in ways consistent with your clinical experience?                                    |               |
| 1.2 Is the co-occurrence of dyslexia and ADHD at age 9 clinically plausible as described?                                                 |               |
| 1.3 Is the navigation strategy ("emoji anchor, skip text") consistent with how children with dyslexia compensate in digital environments? |               |
| 1.4 Is the reliance on TTS as a "key support" realistic for a 9-year-old with this profile in Italy (school TTS adoption rates)?          |               |
| 1.5 Any aspects of the persona description that are inaccurate, over-simplified, or stereotyped?                                          |               |

---

## Section 2 — Finding review: readability and language

For each finding below, rate clinical plausibility (1–4), indicate severity agreement (S1/S2/S3 or adjust), and add comments.

**Plausibility scale**: 1 = Implausible · 2 = Possible but unlikely · 3 = Plausible, consistent with clinical experience · 4 = Highly plausible, commonly observed.

**Finding FG-10 — Vocabulary outside a 9-year-old's register**

> Simulated quote [SIMULATO]: _«"Richiedi Accesso", "Prova 10/10" — non capiti da Marco, 9 anni.»_
> Severity proposed: S2 (significant friction on the Trial user path).
> Copy in question: "Fare i compiti", "Studiare", "Mettiti alla prova", "Richiedi Accesso", "Prova 10/10".

| Question                                                                                                                                   | Your response |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 2.1 Is the copy "Fare i compiti / Studiare / Mettiti alla prova" at an appropriate reading level for age 8–9 with dyslexia?                |               |
| 2.2 Plausibility (1–4): would a 9-year-old with dyslexia+ADHD likely not understand "Richiedi Accesso" as a UI label?                      |               |
| 2.3 Plausibility (1–4): would "Prova 10/10" be confusing to a 9-year-old with this profile?                                                |               |
| 2.4 Severity agreement for FG-10: is S2 appropriate, or would you rate it differently?                                                     |               |
| 2.5 From your clinical experience, what is the typical reading age gap for a 9-year-old with dyslexia in Italy (MTDI/BDA reference norms)? |               |
| 2.6 Are there other UI terms visible in the screenshots that you would flag as above-register for this age group?                          |               |

**Finding FG-15 — "Sbloccarlo" out of register (pass2)**

> Simulated quote [SIMULATO]: _«"Sbloccarlo". È lunga, è una parola da grandi. Non so bene cosa vuol dire... forse aprire?»_
> Severity proposed: S3 (minor, on the lock-dialog path).

| Question                                                                                                     | Your response |
| ------------------------------------------------------------------------------------------------------------ | ------------- |
| 2.7 Plausibility (1–4): is confusion around "sbloccarlo" consistent with your clinical experience for age 9? |               |
| 2.8 Would you rate this S3 (minor) or higher for a child with dyslexia+ADHD?                                 |               |
| 2.9 What alternative term would you suggest ("apri"? "togli il lucchetto"? "chiedi aiuto"?)?                 |               |

---

## Section 3 — Text display and TTS

**Finding FG-03 / FG-17 — Subject names truncated at 130% text size**

> Evidence: pixel-verified. Subject names truncate ("Chimic", "Tedesc", "Spagn") when the device text-scaling is set to 130%; the TTS speaker icon overlaps the last letter.
> Severity proposed: S2 (affects the subject-picker navigation path for users who rely on large text).

| Question                                                                                                                                       | Your response |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 3.1 Are the S1/S2 findings on text legibility and subject-picker scanning realistic for the dyslexia profile?                                  |               |
| 3.2 Plausibility (1–4): would truncated subject names create a meaningful navigation barrier for a child relying on text to identify subjects? |               |
| 3.3 Does the emoji + text pairing reduce or increase scanning effort for a child who reads slowly?                                             |               |
| 3.4 Is TTS for subject names a meaningful compensatory strategy for your patients with dyslexia?                                               |               |
| 3.5 If the TTS icon visually occludes the last letters of a subject name, would this impair TTS activation for a dyslexic child?               |               |
| 3.6 Severity agreement: S2 or different?                                                                                                       |               |
| 3.7 From your practice, what text size / zoom level do children with dyslexia most commonly use on tablets/smartphones in Italy?               |               |

---

## Section 4 — Handoff banner language

The current handoff banner reads:

> _"Ti ho portato dal Prof. {name} per {intent}."_ (e.g., "Ti ho portato dal Prof. Darwin per i compiti.")

The context hint (when a pre-filled question exists) reads:

> _"Ho già scritto la domanda per te: premi invio quando sei pronto, oppure cambiala come vuoi."_

| Question                                                                                                                             | Your response |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 4.1 Is the banner sentence construction accessible to a 9-year-old with dyslexia (sentence length, subordinates, register)?          |               |
| 4.2 Is the context hint sentence appropriate for age 9 with dyslexia+ADHD in terms of length and vocabulary?                         |               |
| 4.3 Which layout choice most helps or harms a child who reads slowly — and does the current banner layout match your recommendation? |               |
| 4.4 Would you recommend structural changes (shorter sentences, plainer words, bullet points)?                                        |               |
| 4.5 Does naming the AI professor as "Prof. Darwin" (a historical figure) pose any comprehension risk for this age/profile?           |               |

---

## Section 5 — DEC-08 naming decision (for expert awareness)

An open architectural decision (DEC-08) concerns whether the handoff banner narrator should be given the name "Buddy" (e.g., _"Sono Buddy — ti ho portato dal Prof. Darwin per i compiti."_).

| Question                                                                                                                | Your response |
| ----------------------------------------------------------------------------------------------------------------------- | ------------- |
| 5.1 Does adding a narrator name ("Sono Buddy") reduce or increase cognitive load for a child with dyslexia+ADHD?        |               |
| 5.2 Is an English word ("Buddy") used as a proper name in Italian UI appropriate for this age group and literacy level? |               |
| 5.3 Any other language considerations for the naming decision?                                                          |               |

---

## Section 6 — Open additions

| Question                                                                                                                                                                                          | Your response |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 6.1 Are there readability or language barriers visible in the screenshots **not** covered by the findings above?                                                                                  |               |
| 6.2 From your clinical practice, what is the most common digital accessibility failure you observe for children with dyslexia when using educational apps in Italy? Is it present in MirrorBuddy? |               |
| 6.3 Any additional recommendations for the copywriting / UX writing strategy for this age group and profile?                                                                                      |               |

---

_Questionnaire version: 1.0 · Protocol: `docs/focus-group/expert-validation/protocol.md` · Expert code: E01_
