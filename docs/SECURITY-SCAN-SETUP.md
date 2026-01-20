# Security Scan Setup

## Overview

MirrorBuddy uses two security scanning tools:

1. **npm audit** - Scans package dependencies for known vulnerabilities
2. **OWASP ZAP** - Passive security scan of the running application

Both tools are integrated in `/scripts/security-scan.sh`.

## Quick Start

```bash
# Run both npm audit and ZAP (if available)
./scripts/security-scan.sh

# Run npm audit only
./scripts/security-scan.sh --no-zap

# Run ZAP only (requires ZAP installed and app running)
./scripts/security-scan.sh --no-audit
```

## npm Audit

**What it does**: Scans `package.json` and `package-lock.json` for known vulnerabilities in dependencies.

**Requirements**: Node.js/npm (already installed)

**How it works**:

- Queries npm security database
- Generates JSON report in `.security-reports/audit-report.json`
- Fails (exit code 1) if HIGH or CRITICAL vulnerabilities found
- Works offline after initial setup

**Example output**:

```
Running npm audit...
✓ npm audit passed
```

## OWASP ZAP Setup

OWASP ZAP is optional but recommended for production-level security scanning.

### Installation (One-time Setup)

#### Option 1: Docker (Recommended)

```bash
# Install Docker: https://docs.docker.com/install/
# Then pull OWASP ZAP image:
docker pull owasp/zap2docker-stable
```

**Verification**:

```bash
docker image ls | grep zap
# Should show: owasp/zap2docker-stable
```

#### Option 2: Local Installation

Download from: https://www.zaproxy.org/download/

### Running ZAP Scan

**Prerequisites**:

- Docker installed and OWASP ZAP image pulled
- Dev server running on localhost:3000 (`npm run dev`)
- Port 3000 accessible

**Steps**:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run security scan
./scripts/security-scan.sh
```

**What ZAP does**:

- Performs passive security scan (no exploitation)
- Analyzes:
  - HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
  - Form submissions
  - Links and navigation
  - JavaScript code quality
- Generates reports:
  - `.security-reports/zap-report.json` - Machine-readable
  - `.security-reports/zap-baseline.html` - Human-readable (browser)

### Understanding ZAP Reports

**Risk Codes**:

- 0 = Informational
- 1 = Low
- 2 = Medium
- 3 = High

**The script fails if**: Medium or High risk alerts found

**View detailed report**:

```bash
open .security-reports/zap-baseline.html  # macOS
xdg-open .security-reports/zap-baseline.html  # Linux
start .security-reports/zap-baseline.html  # Windows
```

## CI/CD Integration

Add to `.github/workflows/security.yml`:

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: npm audit (dependencies)
        run: ./scripts/security-scan.sh --no-zap

      - name: Upload audit report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: .security-reports/
```

## Troubleshooting

### "Docker not found"

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### "ZAP image not found"

```bash
docker pull owasp/zap2docker-stable
```

### "localhost:3000 not accessible"

```bash
# Make sure dev server is running
npm run dev

# Test connectivity
nc -z localhost 3000 && echo "Port open" || echo "Port closed"
```

### npm audit fails with many vulnerabilities

```bash
# Check which packages have issues
npm audit --json | jq '.vulnerabilities'

# Try to fix automatically
npm audit fix

# If still issues, review manually
npm audit --parseable
```

## Requirements Met

- **F-18**: Security scanning automated in scripts ✓
- **F-30**: OWASP Top 10 detection via ZAP passive scan ✓
- **F-31**: Baseline enforcement (exit code 1 on issues) ✓

## References

- npm audit: https://docs.npmjs.com/cli/v10/commands/npm-audit
- OWASP ZAP: https://www.zaproxy.org/
- ZAP Documentation: https://www.zaproxy.org/docs/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
