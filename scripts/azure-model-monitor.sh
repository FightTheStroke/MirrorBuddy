#!/bin/bash
# ============================================================================
# Azure OpenAI Model Monitor
# Checks for new/removed models on the Azure OpenAI resource using API key.
# No service principal required.
#
# Usage:
#   ./scripts/azure-model-monitor.sh                    # Check for changes
#   ./scripts/azure-model-monitor.sh --update-baseline  # Update baseline after review
#
# Required env vars: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_FILE="${SCRIPT_DIR}/azure-models-baseline.json"
API_VERSION="2024-10-21"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Validate env vars
if [ -z "${AZURE_OPENAI_ENDPOINT:-}" ] || [ -z "${AZURE_OPENAI_API_KEY:-}" ]; then
	echo -e "${RED}Error: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set${NC}"
	exit 1
fi

# Validate baseline exists
if [ ! -f "$BASELINE_FILE" ]; then
	echo -e "${RED}Error: Baseline file not found at ${BASELINE_FILE}${NC}"
	exit 1
fi

# Fetch current models from Azure
fetch_models() {
	local endpoint="${AZURE_OPENAI_ENDPOINT%/}"
	curl -s "${endpoint}/openai/models?api-version=${API_VERSION}" \
		-H "api-key: ${AZURE_OPENAI_API_KEY}" |
		jq -r '[.data[] | .id] | unique | sort | .[]'
}

# Main check
main() {
	echo -e "${BLUE}Azure OpenAI Model Monitor${NC}"
	echo "========================================="

	# Fetch current
	local current
	current=$(fetch_models)
	if [ -z "$current" ]; then
		echo -e "${RED}Error: Failed to fetch models from Azure${NC}"
		exit 1
	fi

	# Load baseline
	local baseline
	baseline=$(jq -r '.models[]' "$BASELINE_FILE" | sort -u)

	# Compute diffs
	local new_models removed_models
	new_models=$(comm -13 <(echo "$baseline") <(echo "$current"))
	removed_models=$(comm -23 <(echo "$baseline") <(echo "$current"))

	local current_count baseline_count
	current_count=$(echo "$current" | wc -l | tr -d ' ')
	baseline_count=$(echo "$baseline" | wc -l | tr -d ' ')

	echo -e "Baseline: ${baseline_count} models ($(jq -r '.generated' "$BASELINE_FILE"))"
	echo -e "Current:  ${current_count} models"
	echo ""

	local has_changes=false

	# New models
	if [ -n "$new_models" ]; then
		has_changes=true
		local new_count
		new_count=$(echo "$new_models" | wc -l | tr -d ' ')
		echo -e "${GREEN}+++ ${new_count} NEW models available:${NC}"

		# Categorize new models
		echo "$new_models" | while IFS= read -r model; do
			local tag=""
			case "$model" in
			*realtime* | *audio*) tag=" [VOICE/AUDIO]" ;;
			*tts*) tag=" [TTS]" ;;
			*transcribe* | *whisper*) tag=" [TRANSCRIPTION]" ;;
			*embedding*) tag=" [EMBEDDING]" ;;
			gpt-5* | gpt-4.* | gpt-4o*) tag=" [CHAT]" ;;
			o1* | o3* | o4*) tag=" [REASONING]" ;;
			*sora*) tag=" [VIDEO]" ;;
			esac
			echo -e "  ${GREEN}+ ${model}${YELLOW}${tag}${NC}"
		done
		echo ""
	fi

	# Removed models
	if [ -n "$removed_models" ]; then
		has_changes=true
		local removed_count
		removed_count=$(echo "$removed_models" | wc -l | tr -d ' ')
		echo -e "${RED}--- ${removed_count} models REMOVED:${NC}"
		echo "$removed_models" | while IFS= read -r model; do
			echo -e "  ${RED}- ${model}${NC}"
		done
		echo ""
	fi

	if [ "$has_changes" = false ]; then
		echo -e "${GREEN}No changes detected. All models match baseline.${NC}"
		exit 0
	fi

	# Generate GitHub-flavored issue body for CI
	if [ "${CI:-false}" = "true" ] || [ "${GITHUB_OUTPUT:-}" != "" ]; then
		generate_issue_body "$new_models" "$removed_models"
	fi

	# Update baseline if requested
	if [ "${1:-}" = "--update-baseline" ]; then
		echo "$current" | jq -Rs --arg date "$(date +%Y-%m-%d)" '
			split("\n") | map(select(length > 0)) |
			{
				generated: $date,
				region: "swedencentral",
				resource: "aoai-virtualbpm-prod",
				models: .,
				relevant_categories: {
					realtime_voice: [.[] | select(test("realtime|gpt-audio"))],
					tts: [.[] | select(test("tts"))],
					transcription: [.[] | select(test("transcribe|whisper"))],
					chat: [.[] | select(test("^gpt-(4\\.|4o|5)") and (test("realtime|audio|tts|transcribe|canvas|codex|vision") | not))],
					reasoning: [.[] | select(test("^o[1-9]"))]
				}
			}' >"$BASELINE_FILE"
		echo -e "${GREEN}Baseline updated to $(date +%Y-%m-%d)${NC}"
	else
		echo -e "${YELLOW}Run with --update-baseline to update the baseline file${NC}"
	fi

	exit 1
}

# Generate issue body for GitHub Actions
generate_issue_body() {
	local new_models="$1"
	local removed_models="$2"
	local body=""

	body="## Azure OpenAI Model Changes Detected\n\n"
	body+="**Resource**: aoai-virtualbpm-prod (swedencentral)\n"
	body+="**Date**: $(date +%Y-%m-%d)\n\n"

	if [ -n "$new_models" ]; then
		body+="### New Models Available\n\n"
		echo "$new_models" | while IFS= read -r model; do
			local tag=""
			case "$model" in
			*realtime* | *audio*) tag=" **[VOICE/AUDIO]**" ;;
			*tts*) tag=" **[TTS]**" ;;
			*transcribe* | *whisper*) tag=" **[TRANSCRIPTION]**" ;;
			*embedding*) tag=" **[EMBEDDING]**" ;;
			gpt-5* | gpt-4.* | gpt-4o*) tag=" **[CHAT]**" ;;
			o1* | o3* | o4*) tag=" **[REASONING]**" ;;
			*sora*) tag=" **[VIDEO]**" ;;
			esac
			echo "- \`${model}\`${tag}"
		done
		body+="\n"
	fi

	if [ -n "$removed_models" ]; then
		body+="### Models Removed\n\n"
		echo "$removed_models" | while IFS= read -r model; do
			echo "- ~~\`${model}\`~~"
		done
		body+="\n"
	fi

	body+="### Action Required\n\n"
	body+="- [ ] Review new models for potential adoption\n"
	body+="- [ ] Check if any removed models are currently deployed\n"
	body+="- [ ] Update baseline: \`./scripts/azure-model-monitor.sh --update-baseline\`\n"

	# Write to GITHUB_OUTPUT if available
	if [ -n "${GITHUB_OUTPUT:-}" ]; then
		{
			echo "has_changes=true"
			echo "issue_body<<ISSUE_EOF"
			echo -e "$body"
			echo "ISSUE_EOF"
		} >>"$GITHUB_OUTPUT"
	fi
}

main "$@"
