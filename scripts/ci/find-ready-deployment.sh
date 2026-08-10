#!/usr/bin/env bash
#
# Print the URL of the most recent Vercel deployment that is actually Ready.
#
# Two traps live here, both of which have bitten production:
#
# 1. Only a Ready deployment can be promoted. Promotion used to take the newest
#    deployment whatever its state: on 2026-08-08 it chose a Canceled one,
#    promoted it and reported success while production silently stayed on the
#    previous build. Canceled deployments are *normal* for this project —
#    vercel.json sets `ignoreCommand: exit 0`, so Vercel never builds from git
#    and every push leaves an immediately-canceled deployment at the top of the
#    list. Only CI produces real builds.
#
# 2. When stdout is not a TTY, `vercel list` prints *only bare URLs* to stdout
#    and sends the table — status and environment included — to stderr. Piping
#    it with `2>/dev/null` and grepping for a status therefore matches nothing
#    and silently filters nothing. Status has to come from `vercel inspect`.
#
# Usage: find-ready-deployment.sh [token] <scope-arg>
# An empty token falls back to the CLI's own credentials, so the script can be
# run locally against the real project to verify a change to it.
# Prints the chosen URL on stdout; progress goes to stderr so callers can
# capture the URL cleanly. Exits 1 when no Ready deployment exists.

set -euo pipefail

token="${1:-}"
scope="${2:?scope argument required}"

# Deliberately a plain string, not an array: an empty array expanded under
# `set -u` aborts on bash 3.2, and the resulting failure looks identical to
# "no Ready deployment found" — the very outcome this script exists to report
# accurately. The token never contains whitespace, so word splitting is safe.
auth=""
[ -n "$token" ] && auth="--token=$token"

candidates=$(vercel list $auth "$scope" --meta gitSource=main 2>/dev/null |
  grep '^https://' | head -10 || true)

if [ -z "$candidates" ]; then
  candidates=$(vercel list $auth "$scope" 2>/dev/null |
    grep '^https://' | head -10 || true)
fi

for cand in $candidates; do
  state=$(vercel inspect "$cand" $auth "$scope" 2>&1 |
    grep -E "^[[:space:]]+status" | head -1 | awk '{print $NF}' || true)
  echo "  $cand -> ${state:-unknown}" >&2
  if [ "$state" = "Ready" ]; then
    echo "$cand"
    exit 0
  fi
done

echo "::error::No Ready deployment to promote." >&2
echo "If the last merge changed no application code (a version-only or chore" >&2
echo "release), CI produces no build and there is genuinely nothing to" >&2
echo "promote — that is the expected outcome, not a bug." >&2
echo "Otherwise pass the staging deployment URL manually." >&2
exit 1
