# MirrorBuddy Rules

Modular rules auto-loaded on every Claude session.

## Active Rules

| File | Purpose |
|------|---------|
| accessibility.md | 7 DSA profiles, WCAG 2.1 AA, store patterns |
| api-patterns.md | Next.js API routes, Prisma, error handling |
| maestri.md | 17 AI tutors, data structure, voice integration |

## Usage

These rules are automatically loaded. Reference in conversation:
- "Follow the accessibility rules for this component"
- "Use the API pattern for this new endpoint"
- "Add a new maestro following the maestri rules"

## On-Demand Docs

For detailed documentation, use `@docs/claude/<name>.md`:
- `@docs/claude/voice-api.md` - Voice system details
- `@docs/claude/pdf-generator.md` - PDF export
- `@docs/claude/learning-path.md` - Learning path system
