#!/bin/bash
# Agent Initialization Script
# Usage: ./scripts/agent-init.sh <agent-id>

set -e

AGENT_ID=$1

if [ -z "$AGENT_ID" ]; then
    echo "❌ Error: Agent ID required"
    echo "Usage: ./scripts/agent-init.sh <agent-id>"
    echo ""
    echo "Available agents:"
    echo "  - foundation-agent"
    echo "  - swiftui-expert-agent"
    echo "  - swiftdata-agent"
    echo "  - api-integration-agent"
    echo "  - voice-agent"
    echo "  - vision-agent"
    echo "  - mindmap-agent"
    echo "  - automation-agent"
    echo "  - test-agent"
    echo "  - accessibility-agent"
    echo "  - qa-agent"
    exit 1
fi

echo "🤖 Initializing agent: $AGENT_ID"
echo ""

# Check if agent spec exists
SPEC_FILE=".claude/specs/$AGENT_ID.md"
if [ ! -f "$SPEC_FILE" ]; then
    echo "❌ Error: Agent spec not found: $SPEC_FILE"
    exit 1
fi

echo "✅ Agent spec found: $SPEC_FILE"
echo ""

# Read agent spec
echo "📄 Agent Specification:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
head -n 20 "$SPEC_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get agent tasks from Task Master
echo "📋 Fetching assigned tasks..."
echo ""

# Check constitution
echo "📖 Constitution reminder:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -A 5 "## Core Mission" .claude/constitution.md || true
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ Agent $AGENT_ID initialized!"
echo ""
echo "Next steps:"
echo "1. Read the agent spec: $SPEC_FILE"
echo "2. Read the constitution: .claude/constitution.md"
echo "3. Check assigned tasks: tm get-tasks --status pending"
echo "4. Start working on first task"
echo ""
echo "Remember: Mario-first, accessibility, simplicity, quality, privacy! 🚀"
