#!/bin/bash
# ============================================================================
# AUTO-VERSION: Semantic versioning based on Conventional Commits
# Analyzes commits since last tag and determines appropriate version bump
#
# Usage:
#   ./scripts/auto-version.sh           # Dry-run: shows recommended bump
#   ./scripts/auto-version.sh --apply   # Apply the version bump
#   ./scripts/auto-version.sh --json    # Output as JSON (for CI/scripts)
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
APPLY=false
JSON_OUTPUT=false
for arg in "$@"; do
  case $arg in
    --apply) APPLY=true ;;
    --json) JSON_OUTPUT=true ;;
  esac
done

# Get current version from VERSION file or package.json
get_current_version() {
  if [[ -f "VERSION" ]]; then
    cat VERSION | tr -d '\n'
  else
    node -p "require('./package.json').version"
  fi
}

# Get last version tag
get_last_tag() {
  git tag --list 'v*' --sort=-version:refname | head -1
}

# Increment version
increment_version() {
  local version=$1
  local bump_type=$2

  IFS='.' read -r major minor patch <<< "${version#v}"

  case $bump_type in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *) echo "$version" ;;
  esac
}

# Analyze commits and determine bump type
analyze_commits() {
  local last_tag=$1
  local range="${last_tag}..HEAD"

  # If no tag exists, analyze all commits
  if [[ -z "$last_tag" ]]; then
    range="HEAD"
  fi

  local has_breaking=false
  local has_feat=false
  local has_fix=false
  local commit_count=0

  # Arrays to store commits by type
  local breaking_commits=()
  local feat_commits=()
  local fix_commits=()
  local other_commits=()

  # Regex patterns (stored in variables to avoid bash parsing issues)
  local breaking_pattern='BREAKING[[:space:]]CHANGE'
  local breaking_bang='^[a-z]+(\([^)]+\))?!:'
  local feat_pattern='^feat(\([^)]+\))?:'
  local fix_pattern='^fix(\([^)]+\))?:'

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    ((commit_count++))

    # Extract message (skip commit hash at start)
    local msg="${line#* }"

    # Check for BREAKING CHANGE
    if [[ "$msg" =~ $breaking_pattern ]] || [[ "$msg" =~ $breaking_bang ]]; then
      has_breaking=true
      breaking_commits+=("$line")
    # Check for feat: or feat(scope):
    elif [[ "$msg" =~ $feat_pattern ]]; then
      has_feat=true
      feat_commits+=("$line")
    # Check for fix: or fix(scope):
    elif [[ "$msg" =~ $fix_pattern ]]; then
      has_fix=true
      fix_commits+=("$line")
    else
      other_commits+=("$line")
    fi
  done < <(git log "$range" --oneline 2>/dev/null || git log --oneline)

  # Determine bump type (highest wins)
  local bump_type="none"
  if $has_breaking; then
    bump_type="major"
  elif $has_feat; then
    bump_type="minor"
  elif $has_fix; then
    bump_type="patch"
  elif [[ $commit_count -gt 0 ]]; then
    # Non-conventional commits default to patch
    bump_type="patch"
  fi

  # Export results
  echo "$bump_type"
  echo "$commit_count"
  echo "${#breaking_commits[@]}"
  echo "${#feat_commits[@]}"
  echo "${#fix_commits[@]}"
  echo "${#other_commits[@]}"

  # Export commit lists (newline separated)
  printf '%s\n' "${breaking_commits[@]}" | head -5
  echo "---FEAT---"
  printf '%s\n' "${feat_commits[@]}" | head -10
  echo "---FIX---"
  printf '%s\n' "${fix_commits[@]}" | head -10
  echo "---OTHER---"
  printf '%s\n' "${other_commits[@]}" | head -5
}

# Main
main() {
  local current_version=$(get_current_version)
  local last_tag=$(get_last_tag)

  # Parse analysis results
  local analysis=$(analyze_commits "$last_tag")
  local bump_type=$(echo "$analysis" | head -1)
  local commit_count=$(echo "$analysis" | sed -n '2p')
  local breaking_count=$(echo "$analysis" | sed -n '3p')
  local feat_count=$(echo "$analysis" | sed -n '4p')
  local fix_count=$(echo "$analysis" | sed -n '5p')
  local other_count=$(echo "$analysis" | sed -n '6p')

  # Calculate new version
  local new_version=""
  if [[ "$bump_type" != "none" ]]; then
    new_version=$(increment_version "$current_version" "$bump_type")
  fi

  # JSON output for CI
  if $JSON_OUTPUT; then
    cat << EOF
{
  "currentVersion": "$current_version",
  "lastTag": "$last_tag",
  "bumpType": "$bump_type",
  "newVersion": "$new_version",
  "commitCount": $commit_count,
  "breakdown": {
    "breaking": $breaking_count,
    "feat": $feat_count,
    "fix": $fix_count,
    "other": $other_count
  }
}
EOF
    exit 0
  fi

  # Human-readable output
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE} AUTO-VERSION ANALYSIS${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo -e "Current version:  ${GREEN}$current_version${NC}"
  echo -e "Last tag:         ${last_tag:-"(none)"}"
  echo -e "Commits to analyze: $commit_count"
  echo ""

  if [[ $commit_count -eq 0 ]]; then
    echo -e "${YELLOW}No new commits since last tag.${NC}"
    exit 0
  fi

  echo -e "${BLUE}Commit breakdown:${NC}"
  [[ $breaking_count -gt 0 ]] && echo -e "  ${RED}BREAKING:${NC} $breaking_count"
  [[ $feat_count -gt 0 ]] && echo -e "  ${GREEN}feat:${NC}     $feat_count"
  [[ $fix_count -gt 0 ]] && echo -e "  ${YELLOW}fix:${NC}      $fix_count"
  [[ $other_count -gt 0 ]] && echo -e "  other:    $other_count"
  echo ""

  # Show recent commits by type
  echo -e "${BLUE}Recent commits:${NC}"
  local in_section=""
  echo "$analysis" | tail -n +7 | while IFS= read -r line; do
    case "$line" in
      "---FEAT---") in_section="feat" ;;
      "---FIX---") in_section="fix" ;;
      "---OTHER---") in_section="other" ;;
      "")  ;;
      *)
        case "$in_section" in
          "") [[ -n "$line" ]] && echo -e "  ${RED}!${NC} $line" ;;  # breaking
          "feat") echo -e "  ${GREEN}+${NC} $line" ;;
          "fix") echo -e "  ${YELLOW}~${NC} $line" ;;
          "other") echo -e "    $line" ;;
        esac
        ;;
    esac
  done
  echo ""

  # Recommendation
  echo -e "${BLUE}----------------------------------------${NC}"
  if [[ "$bump_type" == "none" ]]; then
    echo -e "Recommendation: ${YELLOW}No version bump needed${NC}"
  else
    echo -e "Recommendation: ${GREEN}$bump_type${NC} bump"
    echo -e "New version:    ${GREEN}$current_version${NC} → ${GREEN}$new_version${NC}"
  fi
  echo -e "${BLUE}----------------------------------------${NC}"
  echo ""

  # Apply if requested
  if $APPLY && [[ "$bump_type" != "none" ]]; then
    echo -e "${YELLOW}Applying version bump...${NC}"

    # Update VERSION file
    echo "$new_version" > VERSION

    # Update package.json
    npm version "$new_version" --no-git-tag-version --allow-same-version

    echo -e "${GREEN}✓ VERSION file updated to $new_version${NC}"
    echo -e "${GREEN}✓ package.json updated to $new_version${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Review CHANGELOG.md"
    echo -e "  2. git add VERSION package.json package-lock.json"
    echo -e "  3. git commit -m \"chore(release): bump version to $new_version\""
    echo -e "  4. git tag -a v$new_version -m \"Release $new_version\""
    echo -e "  5. git push origin main --tags"
  elif [[ "$bump_type" != "none" ]]; then
    echo -e "Run with ${YELLOW}--apply${NC} to apply this version bump:"
    echo -e "  ./scripts/auto-version.sh --apply"
  fi

  echo ""
}

main "$@"
