#!/usr/bin/env bash
# Publish MirrorBuddy to the Reachy Mini app store.
#
# The store is simply Hugging Face Spaces tagged `reachy_mini` +
# `reachy_mini_python_app`: the robot's daemon lists them and installs the Python
# package straight from the Space. So publishing means assembling a Space that is
# the package plus a landing page, and pushing it.
#
# This is a script rather than a one-off command so the next release is a rerun,
# not an archaeology exercise.
#
# Usage:  ./publish-space.sh [hf-user/space-name]
# Needs:  hf auth login   (a write or fine-grained token with Spaces access)

set -euo pipefail

# --check compares the published Space with this working tree and changes nothing.
# CI uses it to fail loudly when the app store is serving an older MirrorBuddy than
# the one we released, which is how the store silently fell three versions behind.
CHECK_ONLY=0
if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=1
  shift
fi

SPACE="${1:-Roberdan/mirrorbuddy}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

local_version() { sed -n 's/^version = "\(.*\)"/\1/p' "$HERE/pyproject.toml" | head -1; }
published_version() {
  curl -sf -m 30 "https://huggingface.co/spaces/$SPACE/raw/main/pyproject.toml" 2>/dev/null |
    sed -n 's/^version = "\(.*\)"/\1/p' | head -1
}

if [ "$CHECK_ONLY" = "1" ]; then
  HAVE="$(local_version)"
  THERE="$(published_version || true)"
  echo "  repository: ${HAVE:-unknown}"
  echo "  app store:  ${THERE:-not published}"
  if [ "$HAVE" = "$THERE" ]; then
    echo "✓ The app store is serving the version in this repository."
    exit 0
  fi
  echo "✗ The robots would install ${THERE:-nothing}, not $HAVE." >&2
  echo "  Publish with: HF_TOKEN=<write token> ./robot/publish-space.sh" >&2
  echo "  In CI this means the HF_TOKEN secret is missing or the publish step failed." >&2
  exit 1
fi

echo "→ Staging the Space in $STAGE"
cp -R "$HERE/reachy_mini_mirrorbuddy" "$STAGE/"
cp "$HERE/pyproject.toml" "$STAGE/"
cp "$HERE/space/index.html" "$STAGE/"
cp "$HERE/space/style.css" "$STAGE/"

# The published package must never carry the robot's local secrets or caches.
rm -rf "$STAGE/reachy_mini_mirrorbuddy/__pycache__" "$STAGE/reachy_mini_mirrorbuddy/.env"
if find "$STAGE" -name '.env' -o -name '*.key' | grep -q .; then
  echo "✗ Refusing to publish: secret-looking files found in the staged Space" >&2
  exit 1
fi

# The Space README carries the store front-matter (title, tags, description).
# It lives beside this script so it stays reviewable in git.
cp "$HERE/space/README.md" "$STAGE/README.md"

# Push over git rather than `hf upload`: the CLI re-runs repo creation on every
# upload, which fails with 402 on a free account even when the Space already exists.
echo "→ Pushing to https://huggingface.co/spaces/$SPACE"
WORK="$(mktemp -d)"
trap 'rm -rf "$STAGE" "$WORK"' EXIT
# On a laptop the stored Hugging Face credential is used; in CI there is no
# interactive login, so HF_TOKEN is injected. It is kept out of the log and out of
# the committed remote by never echoing the URL and by clearing the remote after.
REMOTE="https://huggingface.co/spaces/$SPACE"
if [ -n "${HF_TOKEN:-}" ]; then
  REMOTE="https://user:${HF_TOKEN}@huggingface.co/spaces/$SPACE"
fi
git clone -q "$REMOTE" "$WORK/repo" 2>/dev/null || {
  echo "✗ Could not reach the Space. Check HF_TOKEN, or run: hf auth login" >&2
  exit 1
}
cd "$WORK/repo"
git config user.email "bot@mirrorbuddy.org"
git config user.name "MirrorBuddy release"
# Mirror the staged tree exactly, so a file removed here disappears from the store.
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R "$STAGE"/. .
git add -A
if git diff --cached --quiet; then
  echo "✓ Nothing to publish — the Space already matches this working tree."
  exit 0
fi
git commit -q -m "Publish MirrorBuddy for Reachy Mini"
git push -q origin HEAD 2>/dev/null || {
  echo "✗ Push refused. The token needs write access to $SPACE." >&2
  exit 1
}
git remote set-url origin "https://huggingface.co/spaces/$SPACE"

echo "✓ Published: https://huggingface.co/spaces/$SPACE"
echo "  It appears in the robot's app store under the reachy_mini tag."
