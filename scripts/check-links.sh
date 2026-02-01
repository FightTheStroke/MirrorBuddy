#!/bin/bash
# =============================================================================
# LINK CHECKER - Detect broken relative links in markdown files
# Usage: ./scripts/check-links.sh [file1.md file2.md ...]
#
# Scans markdown files for relative links and checks if target files exist.
# Ignores: external URLs, images, mailto links, same-file anchors
# Exit: 0 if all links valid, 1 if broken links found
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Image extensions to skip
IMAGE_EXTS="png|jpg|jpeg|svg|webp|ico|gif"

# Temporary files
FINDINGS=$(mktemp)
LINKS_TEMP=$(mktemp)
trap 'rm -f "$FINDINGS" "$LINKS_TEMP"' EXIT

# Function to normalize path (portable for macOS and Linux)
normalize_path() {
	local path="$1"
	# Use Python for portable path normalization
	python3 -c "import os; print(os.path.normpath('$path'))" 2>/dev/null || echo "$path"
}

# Get list of markdown files
if [ $# -gt 0 ]; then
	# Files passed as arguments
	MD_FILES=()
	for arg in "$@"; do
		MD_FILES+=("$arg")
	done
else
	# Find all .md files, excluding node_modules, .next, .git
	MD_FILES=()
	while IFS= read -r file; do
		MD_FILES+=("$file")
	done < <(find . -type f -name "*.md" \
		! -path "*/node_modules/*" \
		! -path "*/.next/*" \
		! -path "*/.git/*" \
		! -path "*/docs-archive/*" \
		2>/dev/null || true)
fi

# Counters
FILES_CHECKED=0
CLEAN_FILES=0

# Process each markdown file
for md_file in "${MD_FILES[@]}"; do
	# Skip if file doesn't exist or isn't readable
	[ ! -f "$md_file" ] && continue

	FILES_CHECKED=$((FILES_CHECKED + 1))
	FILE_CLEAN=true

	# Get directory of the markdown file for resolving relative paths
	md_dir=$(dirname "$md_file")

	# Read file and process line by line
	line_num=0
	while IFS= read -r line; do
		line_num=$((line_num + 1))

		# Skip lines without links
		if ! echo "$line" | grep -q '\[.*\](.*)'; then
			continue
		fi

		# Extract all links from this line using grep and sed
		echo "$line" | grep -oE '\[[^]]*\]\([^)]+\)' >"$LINKS_TEMP" || true

		while IFS= read -r link_match; do
			# Extract path from [text](path)
			path=$(echo "$link_match" | sed -E 's/.*\(([^)]+)\)/\1/')

			# Skip external URLs (http:// or https://)
			if echo "$path" | grep -qE '^https?://'; then
				continue
			fi

			# Skip mailto: links
			if echo "$path" | grep -qE '^mailto:'; then
				continue
			fi

			# Skip same-file anchors (just #section)
			if echo "$path" | grep -qE '^#[^/]*$'; then
				continue
			fi

			# Skip images by extension
			if echo "$path" | grep -qiE '\.('"$IMAGE_EXTS"')($|#)'; then
				continue
			fi

			# Strip anchor (#section) from path for existence check
			target_path="${path%%#*}"

			# Skip if path is empty after removing anchor
			if [ -z "$target_path" ]; then
				continue
			fi

			# Resolve relative path
			# If path starts with /, it's absolute from repo root
			if [[ "$target_path" == /* ]]; then
				resolved_path="${target_path#/}"
			else
				# Relative to the markdown file's directory
				resolved_path="$md_dir/$target_path"
			fi

			# Normalize path (resolve .. and .)
			resolved_path=$(normalize_path "$resolved_path")

			# Check if target exists
			if [ ! -e "$resolved_path" ]; then
				echo "BROKEN: $md_file:$line_num -> $target_path (not found)" >>"$FINDINGS"
				FILE_CLEAN=false
			fi
		done <"$LINKS_TEMP"
	done <"$md_file"

	# Count clean files
	if [ "$FILE_CLEAN" = true ]; then
		CLEAN_FILES=$((CLEAN_FILES + 1))
	fi
done

# Count broken links
BROKEN_COUNT=$(wc -l <"$FINDINGS" | tr -d ' ')

# Output results
if [ -s "$FINDINGS" ]; then
	# Show broken links
	cat "$FINDINGS"
	echo ""
fi

# Summary
if [ "$FILES_CHECKED" -eq 0 ]; then
	echo "Link check: no markdown files found"
	exit 0
fi

if [ "$BROKEN_COUNT" -eq 0 ]; then
	echo -e "${GREEN}Link check: all links valid in $FILES_CHECKED files${NC}"
	exit 0
else
	echo -e "${RED}Link check: $BROKEN_COUNT broken links found in $FILES_CHECKED files ($CLEAN_FILES clean)${NC}"
	exit 1
fi
