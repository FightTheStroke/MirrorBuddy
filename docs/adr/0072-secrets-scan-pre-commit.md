# ADR 0072: Secrets Scan Pre-Commit Hook

## Status

Accepted

## Context

Sensitive data (API keys, tokens, personal identifiers, production URLs) can accidentally be committed to the repository. Once in git history, secrets are difficult to remove and may be exposed even after deletion.

Previous incidents:

- `scripts/sync-databases.sh` contained personal username in connection string
- Risk of hardcoded Sentry DSN, Vercel project IDs, or API keys in source

## Decision

Implement `scripts/secrets-scan.sh` as a pre-commit gate with two severity levels:

### Critical (Blocking)

These patterns **block commit**:

| Pattern                 | Example                               |
| ----------------------- | ------------------------------------- |
| Resend API keys         | `re_xxxxxxxxxxxx`                     |
| Sentry DSN with key     | `https://abc123@org.ingest.sentry.io` |
| Vercel project/team IDs | `prj_xxx`, `team_xxx`                 |
| Private keys            | `-----BEGIN PRIVATE KEY-----`         |
| JWT tokens              | `eyJhbGciOiJ...`                      |
| Database passwords      | `postgres://user:pass@host`           |
| Personal usernames      | `postgresql://roberdan@`              |

### Warnings (Non-blocking)

These are **logged but don't block**:

| Pattern                     | Rationale                        |
| --------------------------- | -------------------------------- |
| Hardcoded Grafana/prod URLs | May be intentional fallbacks     |
| Personal emails in tests    | Test fixtures need real-ish data |
| `.only()` in tests          | Caught by CI anyway              |

## Integration Points

1. **Pre-commit hook** (`.husky/pre-commit`): First check, fast feedback
2. **Release gate** (`release-brutal.sh`): Security phase, blocks release
3. **App release manager**: Documented in check categories

## Usage

```bash
# Normal mode (critical = blocking)
./scripts/secrets-scan.sh

# Strict mode (warnings = blocking)
./scripts/secrets-scan.sh --strict

# With fix suggestions
./scripts/secrets-scan.sh --fix

# JSON output for CI
./scripts/secrets-scan.sh --json
```

## Consequences

### Positive

- Prevents accidental secret commits before they enter history
- Fast feedback loop (runs in ~2s)
- Two-tier severity prevents false positive fatigue
- Integrated with existing release workflow

### Negative

- Requires `rg` (ripgrep) installed
- May need pattern updates as new services are added
- Developers must understand critical vs warning distinction

## Alternatives Considered

1. **git-secrets**: AWS-focused, harder to customize
2. **truffleHog**: Entropy-based, too many false positives
3. **detect-secrets**: Python dependency, slower

Custom bash script chosen for simplicity, speed, and MirrorBuddy-specific patterns.

## References

- Script: `scripts/secrets-scan.sh`
- Pre-commit: `.husky/pre-commit`
- Release gate: `scripts/release-brutal.sh` (Phase 6: Security)
