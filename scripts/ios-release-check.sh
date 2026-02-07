#!/usr/bin/env bash
set -euo pipefail

# iOS Release Check - 8 validation checks for iOS release readiness
# Exit 0: all blocking checks pass | Exit 1: any blocking check fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IS_MACOS=false
[[ "$(uname)" == "Darwin" ]] && IS_MACOS=true
declare -a CHECK_RESULTS=()

run_check() {
  local name="$1" blocking="$2"; shift 2
  if output=$("$@" 2>&1); then
    CHECK_RESULTS+=("$name|PASS|$blocking|$output")
  else
    CHECK_RESULTS+=("$name|FAIL|$blocking|$output")
  fi
}

skip_check() {
  CHECK_RESULTS+=("$1|SKIP|false|$2")
}

check_mobile_web_build() {
  cd "$PROJECT_ROOT"
  if npm run build:mobile:web > /tmp/mobile-build.log 2>&1; then
    tail -5 /tmp/mobile-build.log; return 0
  else
    tail -5 /tmp/mobile-build.log; return 1
  fi
}

check_capacitor_sync() {
  cd "$PROJECT_ROOT"
  if npx cap sync ios > /tmp/cap-sync.log 2>&1; then
    tail -3 /tmp/cap-sync.log; return 0
  else
    tail -3 /tmp/cap-sync.log; return 1
  fi
}

check_match_certificates() {
  [[ -z "${MATCH_GIT_URL:-}" ]] && echo "MATCH_GIT_URL not set" && return 1
  [[ -z "${MATCH_PASSWORD:-}" ]] && echo "MATCH_PASSWORD not set" && return 1
  if $IS_MACOS; then
    local identities
    identities=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "valid identities found" || echo "0")
    local count
    count=$(security find-identity -v -p codesigning 2>/dev/null | head -n -1 | grep -c ")" || echo "0")
    [[ "$count" -eq 0 ]] && echo "ENV vars set but no signing identities in keychain" && return 1
    echo "ENV vars set + $count signing identity(ies) in keychain"; return 0
  fi
  echo "MATCH_GIT_URL and MATCH_PASSWORD configured (identity check skipped - not macOS)"; return 0
}

check_info_plist_version() {
  cd "$PROJECT_ROOT"
  local pkg_ver plist_path="ios/App/App/Info.plist" plist_ver=""
  pkg_ver=$(node -pe "require('./package.json').version")
  [[ ! -f "$plist_path" ]] && echo "Info.plist not found" && return 1
  if command -v plutil &>/dev/null; then
    plist_ver=$(plutil -extract CFBundleShortVersionString raw "$plist_path" 2>/dev/null || echo "")
  else
    plist_ver=$(grep -A1 "CFBundleShortVersionString" "$plist_path" | grep "<string>" | sed 's/.*<string>\(.*\)<\/string>.*/\1/' || echo "")
  fi
  [[ -z "$plist_ver" ]] && echo "Could not extract version from Info.plist" && return 1
  [[ "$pkg_ver" != "$plist_ver" ]] && echo "Version mismatch: package.json=$pkg_ver, Info.plist=$plist_ver" && return 1
  echo "Version match: $pkg_ver"; return 0
}

check_provisioning_profiles() {
  $IS_MACOS || return 0
  local profiles_dir="$HOME/Library/MobileDevice/Provisioning Profiles"
  [[ ! -d "$profiles_dir" ]] && echo "Provisioning Profiles directory not found" && return 1
  local count=$(ls "$profiles_dir"/*.mobileprovision 2>/dev/null | grep -c . || echo 0)
  [[ $count -eq 0 ]] && echo "No provisioning profiles found" && return 1
  echo "Found $count provisioning profile(s)"; return 0
}

check_xcode_cli_tools() {
  $IS_MACOS || return 0
  if xcode_path=$(xcode-select -p 2>&1); then
    echo "Xcode CLI tools at: $xcode_path"; return 0
  else
    echo "Xcode command line tools not installed"; return 1
  fi
}

check_cocoapods() {
  $IS_MACOS || return 0
  if pod_version=$(pod --version 2>&1); then
    echo "CocoaPods version: $pod_version"; return 0
  else
    echo "CocoaPods not installed"; return 1
  fi
}

check_ios_compile() {
  $IS_MACOS || return 0
  cd "$PROJECT_ROOT/ios/App"
  [[ ! -f "App.xcworkspace" ]] && echo "App.xcworkspace not found" && return 1
  if xcodebuild -workspace App.xcworkspace -scheme App -destination 'generic/platform=iOS' build -dry-run > /tmp/xcode-dry-run.log 2>&1; then
    tail -5 /tmp/xcode-dry-run.log; return 0
  else
    tail -5 /tmp/xcode-dry-run.log; return 1
  fi
}

main() {
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  >&2 echo "Running iOS Release Checks..."

  >&2 echo "[1/8] Mobile Web Build..."
  run_check "mobile-web-build" "true" check_mobile_web_build

  >&2 echo "[2/8] Capacitor Sync..."
  run_check "capacitor-sync" "true" check_capacitor_sync

  >&2 echo "[3/8] Match Certificates..."
  run_check "match-certificates" "true" check_match_certificates

  >&2 echo "[4/8] Info.plist Version..."
  run_check "info-plist-version" "true" check_info_plist_version

  >&2 echo "[5/8] Provisioning Profiles..."
  if $IS_MACOS; then
    run_check "provisioning-profiles" "false" check_provisioning_profiles
  else
    skip_check "provisioning-profiles" "macOS only - skipped on Linux"
  fi

  >&2 echo "[6/8] Xcode CLI Tools..."
  if $IS_MACOS; then
    run_check "xcode-cli-tools" "false" check_xcode_cli_tools
  else
    skip_check "xcode-cli-tools" "macOS only - skipped on Linux"
  fi

  >&2 echo "[7/8] CocoaPods..."
  if $IS_MACOS; then
    run_check "cocoapods" "false" check_cocoapods
  else
    skip_check "cocoapods" "macOS only - skipped on Linux"
  fi

  >&2 echo "[8/8] iOS Compile Dry Run..."
  if $IS_MACOS; then
    run_check "ios-compile" "false" check_ios_compile
  else
    skip_check "ios-compile" "macOS only - skipped on Linux"
  fi

  local json_checks="" total=0 pass=0 fail=0 skip=0 blocking_fail=false

  for result in "${CHECK_RESULTS[@]}"; do
    IFS='|' read -r name status blocking detail <<< "$result"
    detail=$(echo "$detail" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    [[ -n "$json_checks" ]] && json_checks+=","
    json_checks+=$(printf '\n    {"name": "%s", "status": "%s", "detail": "%s"}' "$name" "$status" "$detail")
    total=$((total + 1))
    case "$status" in
      PASS) pass=$((pass + 1)) ;;
      FAIL) fail=$((fail + 1)); [[ "$blocking" == "true" ]] && blocking_fail=true ;;
      SKIP) skip=$((skip + 1)) ;;
    esac
  done

  local result="PASS"
  $blocking_fail && result="FAIL"

  cat <<EOF
{
  "timestamp": "$timestamp",
  "checks": [$json_checks
  ],
  "summary": {
    "total": $total,
    "pass": $pass,
    "fail": $fail,
    "skip": $skip
  },
  "result": "$result"
}
EOF

  >&2 echo ""
  >&2 echo "================================"
  >&2 echo "iOS Release Check Summary"
  >&2 echo "================================"
  >&2 echo "Total: $total | Pass: $pass | Fail: $fail | Skip: $skip"
  >&2 echo "================================"

  if [[ "$result" == "PASS" ]]; then
    >&2 echo "All blocking checks passed"
    exit 0
  else
    >&2 echo "One or more blocking checks failed"
    exit 1
  fi
}

main "$@"
