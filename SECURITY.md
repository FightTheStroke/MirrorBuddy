# Security Policy

## 🔒 Reporting a Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to:
**roberdan@fightthestroke.org**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within **48 hours** and work with you to address the issue.

---

## 🛡️ Security Best Practices

### API Keys and Secrets

**NEVER commit API keys or secrets to the repository.**

#### What NOT to commit:
- ❌ API keys (OpenAI, Anthropic, Google, etc.)
- ❌ OAuth client secrets
- ❌ Private keys or certificates
- ❌ Passwords or authentication tokens
- ❌ Database credentials
- ❌ `.env` files with real values
- ❌ Files named `APIKeys.swift` (without `.example`)

#### Files that MUST be in `.gitignore`:
```
.env
.env.local
.mcp.json
**/APIKeys.swift
**/Config/APIKeys.swift
**/*APIKeys*.swift
**/*Secrets*.swift
**/*credentials*.json
**/*keys*.json
```

#### Safe practices:
✅ Use `.env.example` and `APIKeys.swift.example` as templates
✅ Store real keys in `.env` or `APIKeys.swift` (gitignored)
✅ Use environment variables for CI/CD
✅ Rotate keys immediately if exposed
✅ Use separate keys for development/production

### Configuration Setup

1. **Copy example files**:
   ```bash
   cp .env.example .env
   cp Config/APIKeys.swift.example Config/APIKeys.swift
   ```

2. **Add your keys**:
   Edit `.env` and `APIKeys.swift` with your actual API keys

3. **Verify gitignore**:
   ```bash
   git status
   # Should NOT show .env or APIKeys.swift
   ```

4. **Test before committing**:
   ```bash
   git add -A
   git status
   # Double-check no sensitive files are staged
   ```

---

## 🔍 Checking for Exposed Secrets

### Before Committing

Run this command to check for potential secrets:
```bash
git diff --cached | grep -E "(sk-|AIza|AKIA|ghp_|gho_|sk-ant-)"
```

If anything matches, **DO NOT COMMIT**. Remove the secrets first.

### Scanning Repository

Check if secrets were accidentally committed:
```bash
# Search for API key patterns
git log --all --full-history -S "sk-" --pretty=format:"%h %s"

# Check current files
grep -rE "(sk-|AIza|AKIA|ghp_|sk-ant-)" --include="*.swift" --include="*.json" .
```

### If Secrets Were Committed

**Immediate action required:**

1. **Revoke the exposed keys immediately**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - Google: https://console.cloud.google.com/apis/credentials

2. **Remove from git history**:
   ```bash
   # Use git filter-repo (recommended)
   git filter-repo --path 'path/to/secret/file' --invert-paths

   # Or use BFG Repo-Cleaner
   bfg --delete-files APIKeys.swift
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force push** (if already pushed):
   ```bash
   git push origin --force --all
   ```

4. **Notify team** about key rotation

---

## 🔐 CloudKit Security

### Container Configuration

- Use **private database** for user data
- Never store API keys in CloudKit
- Implement proper access controls
- Test sync with test accounts first

### Data Encryption

- CloudKit encrypts data at rest
- Use end-to-end encryption for sensitive fields
- Implement app-level encryption for extra security

---

## 🌐 API Security

### Rate Limiting

- OpenAI Client implements 60 req/min limit
- Automatic retry with exponential backoff
- Monitor usage to prevent abuse

### Error Handling

- Never expose API keys in error messages
- Log errors securely without sensitive data
- Use localized error messages for users

### Network Security

- All API calls use HTTPS
- Implement certificate pinning for production
- Validate SSL certificates

---

## 👥 User Privacy

### Data Collection

We collect minimal data:
- Study materials (stored in CloudKit)
- Usage statistics (anonymous)
- Voice recordings (processed, not stored)

### GDPR Compliance

- Right to access data
- Right to delete data
- Data portability
- Transparent privacy policy

### Data Retention

- CloudKit: User controls via iCloud settings
- Local cache: Cleared on app uninstall
- API calls: Not logged permanently

---

## 🔧 Development Security

### Dependencies

- Regularly update Swift packages
- Review dependency security advisories
- Use only trusted libraries
- Pin versions in production

### Code Review

- All PRs require review
- Check for security issues
- Validate input handling
- Test error scenarios

### Testing

- Test authentication flows
- Test rate limiting
- Test error handling
- Test with malformed inputs

---

## 📱 App Security

### Local Storage

- SwiftData encrypts database
- Use Keychain for sensitive data
- Never store keys in UserDefaults
- Clear cache on logout

### Authentication

- Google OAuth for workspace integration
- Validate tokens on each request
- Implement token refresh
- Handle expiration gracefully

### Accessibility vs Security

While prioritizing accessibility:
- VoiceOver doesn't read sensitive data
- Screen recordings show placeholders
- Screenshot prevention for sensitive screens

---

## 🚨 Incident Response

### If Security Issue Discovered

1. **Assess severity** (Critical, High, Medium, Low)
2. **Contain impact** (revoke keys, disable features)
3. **Fix vulnerability** (code patch, configuration)
4. **Notify affected users** (if applicable)
5. **Document incident** (for future prevention)
6. **Post-mortem review** (what went wrong, how to prevent)

### Security Updates

We release security updates as soon as possible:
- Critical: Within 24 hours
- High: Within 1 week
- Medium: Next release
- Low: Backlog

---

## 📚 Resources

### Security Tools

- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent secrets from being committed
- [truffleHog](https://github.com/trufflesecurity/trufflehog) - Find secrets in git history
- [gitleaks](https://github.com/gitleaks/gitleaks) - Detect hardcoded secrets

### Security Guides

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [Apple Security Guide](https://support.apple.com/guide/security/welcome/web)
- [Swift Security Best Practices](https://swift.org/documentation/security/)

---

## ✅ Security Checklist

Before every release:

- [ ] No API keys in code
- [ ] All secrets in gitignore
- [ ] Dependencies updated
- [ ] Security scan completed
- [ ] Authentication tested
- [ ] Error handling reviewed
- [ ] Rate limiting verified
- [ ] Encryption enabled
- [ ] Privacy policy updated
- [ ] Incident response plan ready

---

## 📄 License

This security policy is part of MirrorBuddy and follows the same BSL 1.1 license.

---

**Last Updated**: October 12, 2025
**Next Review**: January 12, 2026
