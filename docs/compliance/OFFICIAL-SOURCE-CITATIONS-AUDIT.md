# Official Source Citations Audit

**Review date**: 14 September 2026
**Status**: Two factual citation corrections approved and applied; broader legal assertions remain unverified. Not a compliance certification.
**Origin**: Plan 90 multi-country documentation; release-repair source review.

## What the checker establishes

`scripts/compliance-audit-source-verification.ts` checks country documents,
implementation file presence, `apps/web/messages/{it,en,fr,de,es}/{compliance,consent}.json`,
and ADR 0100 (`0090` concerns memory, not multi-country compliance).

Its URL check compares HTTPS origins, not arbitrary substrings: a lookalike such as
`https://www.garanteprivacy.it.example.org` is not an authority citation.
This is an **offline citation-presence check**. It does not verify mailbox validity,
telephone numbers, runtime implementation, translations' legal accuracy, or live compliance.
A website citation must never be reported as proof that all authority contact details are correct.

The existing country-wide source inventory remains advisory. It asks for some
cross-domain sources even in unrelated documents; missing inventory entries are
still reported as warnings, not suppressed or filled with irrelevant links.
Any change to that inventory requires a separate document-by-document review.

## Primary sources read for the disputed authority criteria

| Document / role           | Official source                                                                                                                                                                                                    | What was established                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Italy privacy and cookies | [Garante authority](https://www.garanteprivacy.it/home/autorita)                                                                                                                                                   | Identifies the independent data protection authority, its statutory basis, and official website. The two documents now cite this page.                                              |
| Italy accessibility       | [AgID accessibility and usability](https://www.agid.gov.it/it/ambiti-intervento/accessibilita-usabilita)                                                                                                           | AgID describes monitoring under Law 4/2004 and digital-service supervision under Legislative Decree 82/2022. Requiring the Garante instead was the wrong domain criterion.          |
| Spain accessibility       | [Public-administration accessibility portal](https://administracionelectronica.gob.es/pae_Home/pae_Estrategias/pae_Accesibilidad.html), [BOE: RD 1112/2018](https://www.boe.es/buscar/act.php?id=BOE-A-2018-12699) | The official portal supplies public-sector accessibility resources; the decree governs public-sector sites/apps and monitoring. OAW's portal is relevant, not an AEPD privacy link. |
| France accessibility      | [DINUM RGAA scope](https://accessibilite.numerique.gouv.fr/obligations/champ-application/)                                                                                                                         | Identifies Article 47 of Law 2005-102 as the accessibility basis. DINUM is the RGAA reference publisher; the checker does not certify it as the sole enforcement authority.         |
| Germany accessibility     | [BFIT-Bund](https://www.bfit-bund.de/DE/Home/home_node.html)                                                                                                                                                       | The official page identifies the federal IT accessibility monitoring body. BFIT-Bund is distinct from the privacy regulator BfDI.                                                   |

For the four disputed accessibility documents, the mandatory website-presence
criterion now selects the subject's body (AgID, OAW, DINUM, BFIT-Bund).
It is still a blocking check if that body's website is absent. A data-protection
regulator's link does not substitute for an accessibility-body link.
The UK and AI-regulatory-contact criteria were not reinterpreted in this review.

## Factual corrections and remaining review

1. **Italy cookie guidance identification corrected.** The document previously called the
   10 June 2021 guidance “Provvedimento 229/2021”. Its cited document,
   [Garante docweb 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876),
   identifies **register no. 231 of 10 June 2021**. The release coordinator
   approved correcting the identifier and primary-source link only. Obligations,
   consent terms, and sanctions were not changed. The checker still rejects the
   old incorrect reference.
2. **France accessibility law citation corrected.** “Law 78-17 Article 47” was
   replaced with DINUM's **Law 2005-102, Article 47**, dated 11 February 2005,
   under the same factual-correction approval. Applicability, authority
   responsibilities, and sanctions remain unchanged and require legal review;
   the native checker still rejects the old incorrect reference.
3. **Broader assertions remain unproven.** The country accessibility documents
   assert blanket educational-platform applicability, identical fine ranges,
   and verified compliance while also listing an accessibility statement as
   not yet created. This review did not establish those claims or rerun
   accessibility acceptance tests. They must not be used as release approval.
4. **Contact details are not independently certified.** For example, the current
   Garante authority page publishes `protocollo@gpdp.it`, while the documents
   use `garante@gpdp.it`. Website verification alone cannot establish the latter
   address's current validity; it has not been silently replaced.

The previous January audit's “Complete” status and country percentages did not
represent the current files. They are superseded by these findings, not by a
new blanket compliance claim.

## Verification and repair are separate

Run from the workspace root with the project's installed Node/tsx:

```bash
pnpm exec tsx scripts/compliance-audit-source-verification.ts
```

The command reads documentation only. Reintroducing either incorrect statutory
reference fails the audit; inventory warnings are printed separately. Source links
are editorial corrections, not approval to change consent rules, applicability,
retention, penalties, enforcement assignments, or a compliance declaration.
The independent release/legal reviewer owns acceptance after the release
owner approves and implements the substantive corrections.
