#!/usr/bin/env bash
# Reuse project metadata only; never copy or load another checkout's environment.
resolve_vercel_cwd() {
  local root="${1:-}" common main
  if [[ -z "$root" || ! -d "$root" ]]; then
    echo "A valid repository directory is required" >&2
    return 1
  fi
  if [[ -f "$root/.vercel/project.json" ]] ||
     [[ -n "${VERCEL_PROJECT_ID:-}" && -n "${VERCEL_ORG_ID:-}" ]]; then
    printf '%s\n' "$root"
    return 0
  fi
  if common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
    main="${common%/.git}"
    if [[ "$main" != "$common" && -f "$main/.vercel/project.json" ]]; then
      printf '%s\n' "$main"
      return 0
    fi
  fi
  echo "No Vercel project link or explicit project identity; metadata cannot be verified" >&2
  return 1
}
