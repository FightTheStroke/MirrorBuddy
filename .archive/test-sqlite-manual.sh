#!/bin/bash

# Manual SQLite Search Test Script
# Usage: ./test-sqlite-manual.sh
# Prerequisites: Dev server running on http://localhost:3000

set -e

BASE_URL="http://localhost:3000"
TEST_USER="test-user-$(date +%s)"
TEST_TOOL="test-tool-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}SQLite Search Manual Verification${NC}"
echo -e "${CYAN}============================================================${NC}"

# Step 1: Check database type
echo -e "\n${CYAN}Step 1: Checking database configuration...${NC}"
if [ -z "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓ DATABASE_URL not set (defaults to SQLite)${NC}"
elif [[ "$DATABASE_URL" == file:* ]] || [[ "$DATABASE_URL" == *".db"* ]]; then
    echo -e "${GREEN}✓ DATABASE_URL points to SQLite: $DATABASE_URL${NC}"
elif [[ "$DATABASE_URL" == postgres* ]]; then
    echo -e "${YELLOW}⚠ WARNING: DATABASE_URL points to PostgreSQL: $DATABASE_URL${NC}"
    echo -e "${YELLOW}  This test is for SQLite verification. Consider unsetting DATABASE_URL.${NC}"
else
    echo -e "${YELLOW}⚠ DATABASE_URL: $DATABASE_URL (type unknown)${NC}"
fi

# Step 2: Create test material
echo -e "\n${CYAN}Step 2: Creating test material...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/materials" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER\",
    \"toolId\": \"$TEST_TOOL\",
    \"toolType\": \"mindmap\",
    \"title\": \"Photosynthesis Study Guide\",
    \"subject\": \"Biology\",
    \"preview\": \"Learn about how plants convert sunlight into energy\",
    \"content\": {
      \"nodes\": [
        {\"id\": \"1\", \"label\": \"Photosynthesis\"},
        {\"id\": \"2\", \"label\": \"Chlorophyll\"},
        {\"id\": \"3\", \"label\": \"Sunlight\"},
        {\"id\": \"4\", \"label\": \"Carbon Dioxide\"},
        {\"id\": \"5\", \"label\": \"Oxygen\"}
      ],
      \"edges\": [
        {\"from\": \"1\", \"to\": \"2\"},
        {\"from\": \"1\", \"to\": \"3\"},
        {\"from\": \"1\", \"to\": \"4\"},
        {\"from\": \"1\", \"to\": \"5\"}
      ]
    }
  }")

if echo "$CREATE_RESPONSE" | grep -q "\"success\":true"; then
    MATERIAL_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓ Material created successfully${NC}"
    echo -e "${BLUE}  Material ID: $MATERIAL_ID${NC}"
    SEARCHABLE_TEXT=$(echo "$CREATE_RESPONSE" | grep -o '"searchableText":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}  SearchableText: ${SEARCHABLE_TEXT:0:60}...${NC}"
else
    echo -e "${RED}✗ Failed to create material${NC}"
    echo -e "${RED}Response: $CREATE_RESPONSE${NC}"
    exit 1
fi

# Step 3: Test search queries
echo -e "\n${CYAN}Step 3: Testing search queries...${NC}"

run_search_test() {
    local query="$1"
    local description="$2"

    echo -e "\n${BLUE}Testing: $description (query: \"$query\")${NC}"

    SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/materials?userId=$TEST_USER&search=$(echo "$query" | jq -sRr @uri)")

    FOUND_COUNT=$(echo "$SEARCH_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

    if [ "$FOUND_COUNT" -gt 0 ]; then
        echo -e "${GREEN}  ✓ Found $FOUND_COUNT material(s)${NC}"

        # Check if our specific material is in results
        if echo "$SEARCH_RESPONSE" | grep -q "$MATERIAL_ID"; then
            echo -e "${GREEN}  ✓ Test material found in results${NC}"
        else
            echo -e "${YELLOW}  ⚠ Test material not found in results (but other materials matched)${NC}"
        fi
    else
        echo -e "${RED}  ✗ No materials found${NC}"
        return 1
    fi
}

# Run various search tests
run_search_test "photosynthesis" "Exact match (title)"
run_search_test "biology" "Subject match"
run_search_test "chlorophyll" "Content match"
run_search_test "plants" "Preview match"
run_search_test "photo" "Partial match"
run_search_test "PHOTOSYNTHESIS" "Case-insensitive match"
run_search_test "sunlight energy" "Multi-word search"

# Step 4: Cleanup
echo -e "\n${CYAN}Step 4: Cleaning up test data...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/materials?toolId=$TEST_TOOL")

if echo "$DELETE_RESPONSE" | grep -q "\"success\":true"; then
    echo -e "${GREEN}✓ Test material deleted${NC}"
else
    echo -e "${YELLOW}⚠ Could not delete test material${NC}"
    echo -e "${YELLOW}Response: $DELETE_RESPONSE${NC}"
fi

# Summary
echo -e "\n${CYAN}============================================================${NC}"
echo -e "${GREEN}✓ SQLite search verification completed${NC}"
echo -e "${CYAN}============================================================${NC}"

echo -e "\n${YELLOW}NOTE: Check server logs to confirm SQLite queries were used.${NC}"
echo -e "${YELLOW}      Look for LIKE operators, not PostgreSQL full-text search.${NC}"

echo -e "\n${BLUE}Expected log patterns:${NC}"
echo -e "${BLUE}  ✓ LIKE '%query%' COLLATE NOCASE${NC}"
echo -e "${BLUE}  ✗ websearch_to_tsquery (indicates PostgreSQL)${NC}"
echo -e "${BLUE}  ✗ searchableTextVector @@ (indicates PostgreSQL)${NC}"
