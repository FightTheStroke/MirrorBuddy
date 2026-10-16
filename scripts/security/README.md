# Temporary development-only dependency exception

Roberto D'Angelo approved **only GHSA-vfj7-8cjw-p6xm in braces@3.0.3** on
October 16, 2026 for the two ESLint/knip development chains recorded in
`braces-exception.json`. It expires at **2026-10-24T00:00:00+02:00**
(end of October 23, Europe/Rome). This is risk acceptance, not a patch or a clean audit.
No other advisory, version, path, production dependency, or critical finding is accepted.

`node scripts/release-audit.mjs [private-evidence-directory]` runs native
`pnpm audit --audit-level=high --json` without ignores or threshold changes.
When the exact finding is present, it also requires a fresh production audit, the exact
two development chains from `pnpm why braces --json`, and a readable completed application
build. It checks production NFT traces, resolves their dependency paths, scans the prepared
standalone tree for braces/micromatch (including Next's compiled micromatch), and binds
the current build bytes. Missing, changed, invalid, expired, or unreadable evidence fails.
The pre-release audit runs after building and preparing standalone; release-brutal audits
after its build/browser preparation. The native release gate audits again after its tests.
An approval cannot rely on absence evidence from a build superseded later in the same gate.

Pre-release, release-gate/native evidence, and release-brutal share this evaluator.
Success with the exception explicitly prints `PASSED WITH APPROVED EXCEPTION`, raw counts,
the original audit exit code, and expiry. If the finding disappears, it reports
`exception not needed` instead. Low/moderate findings remain reported, not waived.

Raw `audit.json` is untouched. Private `audit.context.json` records the original exit code,
approval content/hash, production report/exit, native dependency graph/exit, and runtime
absence inventory. Native receipts hash both reports, record the raw exit separately from
the evaluated gate exit, and recheck approval and current build on collection.
Without an explicit directory, evidence goes to a private per-run directory beneath
`~/.roberdan-os/private/mirrorbuddy/`; directories are 0700 and reports 0600.
Do not copy native reports into a worktree or publish them.

After expiry, upgrade/remove the affected development dependency or obtain a new explicit
reviewed decision. Never fabricate a patched braces version, lower the audit threshold,
rewrite raw vulnerability counts, or reuse a failing raw report without its bound context.
