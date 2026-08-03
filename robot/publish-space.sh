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

SPACE="${1:-Roberdan/mirrorbuddy}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

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
git clone -q "https://huggingface.co/spaces/$SPACE" "$WORK/repo"
cd "$WORK/repo"
# Mirror the staged tree exactly, so a file removed here disappears from the store.
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R "$STAGE"/. .
git add -A
if git diff --cached --quiet; then
  echo "✓ Nothing to publish — the Space already matches this working tree."
  exit 0
fi
git commit -q -m "Publish MirrorBuddy for Reachy Mini"
git push -q origin HEAD

echo "✓ Published: https://huggingface.co/spaces/$SPACE"
echo "  It appears in the robot's app store under the reachy_mini tag."
