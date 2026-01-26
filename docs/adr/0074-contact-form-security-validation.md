# ADR 0074: Contact Form Security and Validation Patterns

## Status

Accepted

## Date

2026-01-25

## Context

During implementation of B2B contact forms (Plan #77, PR #182), multiple security and validation issues were identified by automated code review tools (GitHub Copilot, Vercel VADE, GitHub Advanced Security). This ADR documents all issues and their solutions to prevent recurrence.

## Problems Identified

### 1. XSS Vulnerability in Email Templates

**Issue**: User input interpolated directly into HTML email templates without escaping.

**Attack Vector**: Malicious user submits `<script>alert('XSS')</script>` as name, which gets rendered in admin notification emails.

**Solution**: Created `escapeHtml()` utility function:

```typescript
// src/app/api/contact/helpers.ts
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
```

All user input in email templates must pass through `escapeHtml()`.

### 2. CSRF Protection Clarification

**Initial Issue**: Contact form used plain `fetch()` instead of `csrfFetch()`.

**Analysis**: Per [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), CSRF attacks exploit **authenticated sessions**. The contact form:

- Does NOT require authentication
- Does NOT create or use session cookies
- Is a truly public endpoint

**Conclusion**: CSRF token validation is **not required** for public endpoints without sessions. The appropriate protections are:

1. **Rate limiting** (implemented) - Prevents spam/abuse
2. **Input validation** (implemented) - Prevents injection attacks
3. **Honeypot fields** (optional) - Bot detection

**Current Implementation**:

```typescript
// Client: Uses csrfFetch() for consistency (harmless but not required)
import { csrfFetch } from "@/lib/auth/csrf-client";
const response = await csrfFetch("/api/contact", { ... });

// Server: NO requireCSRF() needed - rate limiting is the protection
export async function POST(request: NextRequest) {
  const rateLimitResult = await checkRateLimitAsync(`contact:form:${clientId}`, ...);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }
  // ... validation and processing
}
```

**When CSRF IS Required**: See ADR 0075 for the complete CSRF policy. In summary:

- Authenticated endpoints (user session) → `requireCSRF()` + `csrfFetch()` required
- Public endpoints (no session) → Rate limiting, no CSRF needed
- Cron jobs → `CRON_SECRET` header validation

### 3. ReDoS Vulnerability in Email Regex

**Issue**: Complex email regex with overlapping character classes caused exponential backtracking.

**Bad Pattern**:

```regex
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

**Problem**: The `[a-zA-Z0-9._%+-]+` pattern has `.` which overlaps with the domain part, causing backtracking on malicious input like `!@!.........`.

**Good Pattern**:

```regex
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Why Safe**: No overlapping character classes, no nested quantifiers. Combined with length limit (254 chars) provides adequate protection.

### 4. Missing Type Validation

**Issue**: API didn't validate `body.type` against allowed values before processing.

**Attack Vector**: Attacker sends `type: "admin"` to bypass validation logic.

**Solution**:

```typescript
const validTypes = ["general", "schools", "enterprise"] as const;
if (!validTypes.includes(body.type)) {
  return NextResponse.json(
    { success: false, message: "Invalid contact type" },
    { status: 400 },
  );
}
```

### 5. Missing Field Length Validation

**Issue**: No limits on string field lengths could cause database bloat or denial of service.

**Solution**: Define max lengths and validate:

```typescript
const maxLengths = {
  name: 100,
  email: 254,
  subject: 200,
  message: 5000,
  role: 100,
  schoolName: 200,
  company: 200,
  specificNeeds: 2000,
} as const;

for (const [field, maxLen] of Object.entries(maxLengths)) {
  const value = body[field];
  if (typeof value === "string" && value.length > maxLen) {
    return NextResponse.json(
      { success: false, message: `Field ${field} exceeds maximum length` },
      { status: 400 },
    );
  }
}
```

### 6. Missing Enum Validation

**Issue**: Form select fields not validated server-side, allowing injection of arbitrary values.

**Solution**: Define valid values and validate:

```typescript
const VALID_SCHOOL_ROLES = ["dirigente", "docente", "segreteria", "altro"];
const VALID_SCHOOL_TYPES = [
  "primaria",
  "secondaria-i",
  "secondaria-ii",
  "università",
];
const VALID_STUDENT_COUNTS = ["100", "100-500", "500-1000", "1000+"];
const VALID_SECTORS = [
  "technology",
  "finance",
  "manufacturing",
  "healthcare",
  "retail",
  "other",
];
const VALID_EMPLOYEE_COUNTS = ["under-50", "50-200", "200-1000", "over-1000"];
const VALID_TOPICS = [
  "leadership",
  "ai-innovation",
  "soft-skills",
  "onboarding",
  "compliance",
  "other",
];

// Validate in type-specific sections
if (!VALID_SCHOOL_ROLES.includes(body.role)) {
  return NextResponse.json(
    { success: false, message: "Invalid role value" },
    { status: 400 },
  );
}
```

### 7. API Response Field Mismatch

**Issue**: API returns `{ message: "..." }` but frontend looked for `data.error`.

**Solution**: Standardize API responses:

- Success: `{ success: true, message: "...", id: "..." }`
- Error: `{ success: false, message: "..." }`

Frontend must check `data.message`, not `data.error`.

### 8. Missing Input Trimming

**Issue**: Whitespace not trimmed from inputs, causing data quality issues.

**Solution**: Trim all text inputs before submission:

```typescript
body: JSON.stringify({
  name: formData.name.trim(),
  email: formData.email.trim().toLowerCase(),
  subject: formData.subject.trim(),
  message: formData.message.trim(),
});
```

### 9. Missing Accessibility (Arrow Key Navigation)

**Issue**: Segmented toggle (tab-like control) didn't support arrow key navigation per ARIA practices.

**Solution**:

```typescript
} else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
  e.preventDefault();
  const currentIndex = options.findIndex((opt) => opt.id === value);
  const newIndex =
    e.key === "ArrowRight"
      ? (currentIndex + 1) % options.length
      : (currentIndex - 1 + options.length) % options.length;
  onChange(options[newIndex].id);
  const buttons = containerRef.current?.querySelectorAll("button");
  buttons?.[newIndex]?.focus();
}
```

### 10. Missing SEO Metadata

**Issue**: Contact pages missing Next.js metadata exports for SEO.

**Solution**: Export metadata from layout or page:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contattaci | MirrorBuddy",
  description: "Contatta MirrorBuddy per qualsiasi domanda...",
};
```

## Deferred Items (Acceptable Risk)

### Database Constraints

**Issue**: Prisma schema lacks `@db.VarChar(length)` constraints.

**Decision**: Deferred. API-level validation is sufficient. DB migration risk not justified for contact form.

### Email Index

**Issue**: No index on ContactRequest.email field.

**Decision**: Deferred. Low query volume. Can add if needed for duplicate detection.

### Rate Limiting

**Issue**: No rate limiting on contact endpoint.

**Decision**: ✅ **Implemented**. Contact endpoint now has rate limiting (5 requests/hour per client IP).

## Decision

1. **All user input in HTML must be escaped** - Use `escapeHtml()` for all HTML contexts
2. **CSRF protection based on endpoint type** (updated per OWASP):
   - Authenticated endpoints → `requireCSRF()` + `csrfFetch()` required
   - Public endpoints (no session) → Rate limiting instead, CSRF optional
   - See ADR 0075 for complete policy
3. **All regex must be ReDoS-safe** - Use simple patterns, no nested quantifiers
4. **All API inputs must be validated** - Type, length, and enum validation required
5. **All text inputs must be trimmed** - Both client and server-side
6. **All interactive controls must support keyboard navigation** - ARIA patterns required
7. **All pages must have metadata** - SEO compliance required
8. **Public endpoints must have rate limiting** - Primary protection against abuse

## Consequences

### Positive

- Contact forms are secure against XSS, CSRF, ReDoS attacks
- Input validation prevents data quality and DoS issues
- Consistent patterns for future form implementations
- Accessibility compliance maintained

### Negative

- More validation code to maintain
- Enum values must stay synchronized between frontend and backend

## Checklist for Future Forms

### All Forms (Public or Authenticated)

- [ ] Escape all user input in HTML (emails, rendered output)
- [ ] Validate type/category field against allowed values
- [ ] Add max length validation for all string fields
- [ ] Validate enum/select values server-side
- [ ] Trim whitespace from text inputs
- [ ] Use simple regex patterns (no nested quantifiers)
- [ ] Add keyboard navigation (Enter, Space, Arrow keys)
- [ ] Export page metadata for SEO
- [ ] Standardize API response format (`success`, `message`)

### Authenticated Forms (User Session Required)

- [ ] Use `csrfFetch()` for client submissions
- [ ] Add `requireCSRF()` check in API route (before `validateAuth()`)
- [ ] Use `validateAuth()` for user identification

### Public Forms (No Authentication)

- [ ] Add rate limiting (e.g., 5 requests/hour per IP)
- [ ] Consider honeypot fields for bot detection
- [ ] `csrfFetch()` optional (harmless but not required)

### 11. Incomplete URL Sanitization (CodeQL)

**Issue**: URL substring check `url.includes("supabase.com")` could be bypassed.

**Attack Vector**: URLs like `supabase.com.evil.com` or `evil.com?redirect=supabase.com` would match incorrectly.

**Solution**: Extract hostname from PostgreSQL connection string, then check domain:

```typescript
// Extract host from PostgreSQL URL: postgresql://user:pass@HOST:port/db
const hostMatch = testDbUrl.match(/@([^:/?#]+)/);
const dbHost = hostMatch ? hostMatch[1].toLowerCase() : "";
const isSupabaseHost =
  dbHost.endsWith("supabase.com") ||
  dbHost.endsWith("supabase.co") ||
  dbHost === "supabase.com" ||
  dbHost === "supabase.co";
```

**Rule**: Never use simple `includes()` for security-critical URL checks. Always parse and validate the specific URL component (host, path, query).

## References

- OWASP XSS Prevention Cheat Sheet
- OWASP CSRF Prevention Cheat Sheet
- OWASP Input Validation Cheat Sheet
- ReDoS patterns: https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- CodeQL js/incomplete-url-substring-sanitization
