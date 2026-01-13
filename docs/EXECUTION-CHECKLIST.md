# Execution Checklist for MirrorBuddy PRs

**Purpose:** Ensure every PR meets MirrorBuddy's quality, accessibility, and process standards.

**MANDATORY:** All PRs must complete this checklist. PRs without a completed checklist will be rejected without review.

---

## 1. Pre-Implementation Checklist

**Complete BEFORE writing any code:**

- [ ] **Execution plan exists and is approved**
  - Plan document created (in `docs/plans/` or as an issue)
  - Plan reviewed and approved by maintainer
  - Approval date and approver documented

- [ ] **Scope is clearly defined**
  - Every change to be made is explicitly listed in the plan
  - No ambiguity about what will and won't be changed
  - Edge cases and error scenarios identified

- [ ] **Pattern files identified**
  - Found existing similar code to follow as patterns
  - Understand the project's conventions for this type of change
  - Read relevant ADRs if architectural changes involved

- [ ] **Dependencies verified**
  - All required tools and packages available
  - Database schema changes planned (if needed)
  - No new dependencies added without justification

- [ ] **Test strategy defined**
  - Know what tests need to be written
  - Understand how to verify the change works
  - Manual test scenarios documented

---

## 2. Implementation Guidelines

**Follow these principles during development:**

### Code Quality

- [ ] **TypeScript strict mode compliance**
  - No `any` types without justification
  - All types explicitly defined
  - No `@ts-ignore` or `@ts-expect-error` without documented reason

- [ ] **Follow existing patterns**
  - Match the style and structure of similar existing code
  - Use established utilities and helpers
  - Don't reinvent wheels that already exist in the codebase

- [ ] **Path aliases used correctly**
  - `@/lib/...` for library code
  - `@/components/...` for React components
  - `@/app/...` for Next.js app routes
  - Never use relative paths that go up more than one level

- [ ] **Error handling implemented**
  - All async operations have try/catch
  - User-facing errors have helpful messages
  - Backend errors logged with context
  - No silent failures

### Accessibility (CRITICAL)

**MirrorBuddy was born for inclusion. Every change MUST be accessible.**

- [ ] **Keyboard navigation**
  - All interactive elements reachable by Tab
  - Focus indicators visible (WCAG 2.1 AA)
  - Logical tab order maintained
  - No keyboard traps

- [ ] **Screen reader support**
  - Semantic HTML used (`<button>`, `<nav>`, `<main>`, etc.)
  - ARIA labels provided where needed
  - Dynamic content changes announced
  - Images have alt text

- [ ] **Visual accessibility**
  - Color contrast meets WCAG AA (4.5:1 for text)
  - Information not conveyed by color alone
  - Text resizable to 200% without breaking layout
  - Focus indicators have 3:1 contrast

- [ ] **DSA profile support**
  - Consider impact on 7 profiles: dyslexia, dyscalculia, dysgraphia, dysorthography, ADHD, dyspraxia, stuttering
  - Use accessibility utilities from `src/lib/accessibility/`
  - Test with relevant profile settings if UI change

### Data Handling

- [ ] **NO localStorage for user data** (ADR 0015)
  - User data ONLY via Zustand stores + REST APIs
  - localStorage ONLY for non-sensitive UI preferences
  - Session data properly managed server-side

- [ ] **Prisma for all database operations**
  - No raw SQL queries without justification
  - Transactions used where data consistency critical
  - Connection pooling respected (no connection leaks)

- [ ] **GDPR compliance** (ADR 0008)
  - Check consent before processing user data
  - Parent consent checked for student data
  - Data retention policies followed

### AI Provider Usage

- [ ] **Azure OpenAI as primary** (`src/lib/ai/providers.ts`)
  - Voice features MUST use Azure OpenAI
  - Ollama only as fallback for text-only
  - API keys from environment variables
  - Proper error handling for AI failures

---

## 3. Verification Steps

**Run ALL of these commands before committing:**

### Automated Checks

```bash
# TypeScript type checking
npm run typecheck
# Expected: No errors, all types resolve

# ESLint
npm run lint
# Expected: Zero warnings, zero errors

# Production build
npm run build
# Expected: Build succeeds without errors

# Playwright E2E tests (if applicable)
npm run test
# Expected: All tests pass
```

### Manual Verification

- [ ] **Feature works in development**
  - `npm run dev` and test all changes manually
  - Test happy path and error scenarios
  - Verify error messages are user-friendly

- [ ] **Database changes applied** (if applicable)
  ```bash
  npx prisma generate
  npx prisma db push
  ```

- [ ] **Accessibility tested**
  - Navigate with keyboard only (no mouse)
  - Test with screen reader (VoiceOver/NVDA)
  - Check contrast with DevTools or axe extension
  - Resize text to 200% and verify layout

- [ ] **Browser compatibility**
  - Test in Chrome/Edge (primary)
  - Test in Firefox (secondary)
  - Test in Safari if UI change (macOS/iOS)

- [ ] **Responsive design** (if UI change)
  - Mobile viewport (375px width minimum)
  - Tablet viewport (768px)
  - Desktop viewport (1280px+)

---

## 4. Documentation Requirements

**Update documentation for any user-facing or architectural changes:**

- [ ] **CHANGELOG.md updated**
  - Entry added under "Unreleased" section
  - Format: `- [Category] Description (#PR or #Issue)`
  - Categories: Added, Changed, Deprecated, Removed, Fixed, Security

- [ ] **Code comments added**
  - Complex logic explained (the "why", not the "what")
  - Public functions have JSDoc comments
  - TODOs include context and issue references
  - All comments in English

- [ ] **Type definitions updated** (`src/types/index.ts`)
  - New types added for new data structures
  - Existing types updated if data shape changed
  - JSDoc comments for exported types

- [ ] **ADR created** (if architectural decision made)
  - File created in `docs/adr/`
  - Format follows existing ADR template
  - Context, decision, and consequences documented

- [ ] **Claude docs updated** (if complex feature)
  - Create new file in `@docs/claude/` if needed
  - Update `CLAUDE.md` to reference new doc
  - Include usage examples and gotchas

---

## 5. PR Submission Checklist

**Before opening the Pull Request:**

- [ ] **All verification steps passed**
  - Every command in section 3 completed successfully
  - Manual testing completed and documented
  - No known bugs or issues remain

- [ ] **Commits follow conventions**
  - Conventional Commits format: `type: description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Reference issue if exists: `feat: add dark mode (#123)`

- [ ] **Branch named correctly**
  - Format: `feature/feature-name` or `fix/bug-name`
  - Descriptive but concise
  - No uppercase letters or special characters

- [ ] **PR template filled completely**
  - Plan reference provided
  - Every change explicitly listed
  - Changes NOT made section filled out
  - Verification evidence provided
  - All declarations completed honestly

- [ ] **No scope creep**
  - Only changes from approved plan included
  - No "while I was here" changes
  - No refactoring unrelated to the task
  - No formatting changes in unrelated files

- [ ] **Clean git history**
  - No merge commits (rebase if needed)
  - No "fix typo" or "oops" commits (squash if needed)
  - Each commit represents a logical unit
  - Commit messages are clear and descriptive

---

## 6. Prohibited Patterns

**These patterns will result in immediate PR rejection:**

### Code Patterns

- ❌ **`console.log` or `console.error` in production code**
  - Use logger from `src/lib/logger.ts` instead
  - Exception: Development-only debug utilities clearly marked

- ❌ **`any` type without justification**
  - Use proper types or `unknown` with type guards
  - Add comment explaining why if truly unavoidable

- ❌ **Suppressing TypeScript errors without documentation**
  - `@ts-ignore`, `@ts-expect-error` require comment with issue link
  - Must have plan to remove in the future

- ❌ **Direct DOM manipulation in React components**
  - Use refs and React patterns instead
  - Exception: Third-party library integration (document why)

- ❌ **Inline styles for non-dynamic values**
  - Use Tailwind classes or CSS modules
  - Inline styles only for truly dynamic values (calculations, API data)

- ❌ **localStorage for user data**
  - Violates ADR 0015
  - Use Zustand + REST APIs for user data

- ❌ **Raw SQL queries without justification**
  - Use Prisma ORM for all database operations
  - Raw SQL only if Prisma cannot express the query (document why)

### Process Patterns

- ❌ **Code written before plan approved**
  - Execution plan must be approved BEFORE implementation starts
  - Saves time by avoiding rework

- ❌ **PR opened with failing checks**
  - All verification steps must pass locally first
  - CI failures waste reviewer time

- ❌ **Incomplete PR template**
  - Template sections marked "TODO" or "N/A" without explanation
  - Unclear or vague descriptions

- ❌ **Undeclared AI assistance**
  - Must declare if Copilot/Claude/other AI used
  - AI-generated code must be reviewed line-by-line

- ❌ **Changes outside approved scope**
  - "While I was here" changes
  - Unplanned refactoring
  - Formatting changes in unrelated files

### Accessibility Patterns

- ❌ **`<div>` used instead of semantic HTML**
  - Use `<button>`, `<nav>`, `<article>`, `<section>`, etc.
  - Divs only for pure layout containers

- ❌ **Click handlers on non-interactive elements**
  - Use `<button>` for clickable elements
  - Ensure keyboard accessibility if custom element needed

- ❌ **Missing alt text on images**
  - All `<img>` tags must have `alt` attribute
  - Decorative images use `alt=""`

- ❌ **Color as only indicator**
  - Error states need icons, not just red text
  - Success states need icons, not just green text

- ❌ **Missing focus indicators**
  - All interactive elements must show focus state
  - Never `outline: none` without replacement

---

## 7. Workaround Declaration

**If your PR contains ANY workarounds, bypasses, or temporary fixes:**

- [ ] **Each workaround documented in PR template table**
  - Location (file:line)
  - Justification (why needed)
  - Removal plan (when/how to fix properly)

- [ ] **Issue created for removal** (if not fixed immediately)
  - Reference issue in workaround comment
  - Issue added to project backlog

- [ ] **Workaround is truly necessary**
  - Cannot be solved properly within scope
  - Does not compromise security or data integrity
  - Does not violate accessibility requirements

**Goal: Zero workarounds. If you need one, you must justify it.**

---

## 8. AI Assistance Declaration

**If you used Copilot, Claude, ChatGPT, or any AI assistance:**

- [ ] **AI assistance declared in PR template**
  - Tool names listed
  - Extent of usage described

- [ ] **Every AI suggestion individually reviewed**
  - Not blindly accepted
  - Verified against project patterns
  - Checked for scope creep

- [ ] **AI-generated code meets project standards**
  - Follows TypeScript strict mode
  - Includes proper error handling
  - Meets accessibility requirements
  - No prohibited patterns

---

## 9. Final Author Declaration

**Before submitting, honestly confirm:**

- [ ] **I have completed every item in this checklist**
- [ ] **Every change in my PR is explicitly listed in the PR description**
- [ ] **Every change corresponds to the approved execution plan**
- [ ] **No changes were made outside the approved scope**
- [ ] **All verification commands passed on my machine**
- [ ] **I have tested the changes manually**
- [ ] **I take personal responsibility for the accuracy of this submission**

---

## For Reviewers

**Before approving any PR, verify:**

1. [ ] Execution plan exists and was approved BEFORE implementation
2. [ ] Every change in the diff is listed in "Changes Made"
3. [ ] No changes exist that are not in the execution plan
4. [ ] CI pipeline passes (all checks green)
5. [ ] No prohibited patterns present (see section 6)
6. [ ] PR template completely filled out
7. [ ] Checklist declarations appear truthful
8. [ ] Accessibility requirements met (if UI change)

**A PR without a completed checklist is automatically invalid.**

---

## Questions?

- **Process questions**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Technical questions**: Check `CLAUDE.md` and `@docs/claude/`
- **Accessibility questions**: See `src/lib/accessibility/` and WCAG 2.1 AA guidelines
- **Contact**: roberdan@fightthestroke.org

---

**Remember: This checklist exists to maintain quality and ensure MirrorBuddy remains accessible and reliable for all students. Thank you for your thoroughness!**
