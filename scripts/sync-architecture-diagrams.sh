#!/bin/bash
# Compatibility entry point: never fabricate architectural coverage from ADR titles.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Automatic ADR insertion retired. Review diagram relationships and version metadata explicitly."
exec bash "$SCRIPT_DIR/check-architecture-diagrams.sh"
