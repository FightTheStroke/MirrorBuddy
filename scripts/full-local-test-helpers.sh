#!/usr/bin/env bash
# =============================================================================
# FULL LOCAL TEST HELPERS
# Helper functions for full-local-test.sh orchestrator
# =============================================================================

# Generate basic HTML report
generate_basic_report() {
  local report_file=$1
  shift
  local results=("$@")

  cat > "$report_file" <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>MirrorBuddy Test Report</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #1a73e8; }
    .pass { color: #137333; }
    .fail { color: #c5221f; }
    .warn { color: #ea8600; }
    .skip { color: #5f6368; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px; margin: 4px 0; border-left: 4px solid #e8eaed; }
  </style>
</head>
<body>
  <h1>MirrorBuddy Test Report</h1>
  <p>Generated: $(date)</p>
  <h2>Results</h2>
  <ul>
EOF

  for result in "${results[@]}"; do
    if [[ $result == ✓* ]]; then
      echo "    <li class=\"pass\">$result</li>" >> "$report_file"
    elif [[ $result == ✗* ]]; then
      echo "    <li class=\"fail\">$result</li>" >> "$report_file"
    elif [[ $result == ⚠* ]]; then
      echo "    <li class=\"warn\">$result</li>" >> "$report_file"
    else
      echo "    <li class=\"skip\">$result</li>" >> "$report_file"
    fi
  done

  cat >> "$report_file" <<EOF
  </ul>
</body>
</html>
EOF
}

# Run test phase with logging
run_test_phase() {
  local phase_name=$1
  local test_command=$2
  local log_file=$3
  local pass_message=$4
  local fail_message=$5

  if eval "$test_command" > "$log_file" 2>&1; then
    echo -e "${GREEN}✓ $pass_message${NC}"
    return 0
  else
    echo -e "${RED}✗ $fail_message${NC}"
    cat "$log_file" | tail -30
    return 1
  fi
}

# Check if file or test exists
check_test_exists() {
  local test_path=$1
  [ -f "$test_path" ]
}

# Print result with color
print_result() {
  local result=$1

  if [[ $result == ✓* ]]; then
    echo -e "${GREEN}$result${NC}"
  elif [[ $result == ✗* ]]; then
    echo -e "${RED}$result${NC}"
  elif [[ $result == ⚠* ]]; then
    echo -e "${YELLOW}$result${NC}"
  else
    echo -e "${CYAN}$result${NC}"
  fi
}

# Run E2E test phase
run_e2e_test() {
  local phase=$1
  local test_file=$2
  local log_file=$3
  local test_name=$4

  echo -e "${BLUE}[$phase] $test_name...${NC}"

  if [ -f "$ROOT_DIR/$test_file" ]; then
    if npx playwright test "$test_file" > "$log_file" 2>&1; then
      echo -e "${GREEN}✓ $test_name passed${NC}"
      RESULTS+=("✓ $test_name")
      return 0
    else
      echo -e "${RED}✗ $test_name failed${NC}"
      cat "$log_file" | tail -30
      RESULTS+=("✗ $test_name")
      return 1
    fi
  else
    echo -e "${YELLOW}⚠ $test_name test not found (may be in development)${NC}"
    RESULTS+=("- $test_name (not found)")
    return 0
  fi
}

# Run optional script phase
run_optional_script() {
  local phase=$1
  local script_path=$2
  local log_file=$3
  local phase_name=$4

  echo -e "${BLUE}[$phase] $phase_name...${NC}"

  if [ -f "$script_path" ]; then
    if "$script_path" > "$log_file" 2>&1; then
      echo -e "${GREEN}✓ $phase_name validated${NC}"
      RESULTS+=("✓ $phase_name")
      return 0
    else
      echo -e "${YELLOW}⚠ $phase_name issues${NC}"
      cat "$log_file" | tail -20
      WARNINGS=$((WARNINGS + 1))
      RESULTS+=("⚠ $phase_name")
      return 0
    fi
  else
    echo -e "${YELLOW}⚠ $phase_name script not found (optional)${NC}"
    RESULTS+=("- $phase_name (skipped)")
    return 0
  fi
}
