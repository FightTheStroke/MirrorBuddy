# ADR 0149: Static vs Dynamic System Prompts by Character Class

Status: Accepted | Date: 15 Feb 2026 | Plan: 148

## Context

MirrorBuddy has three character classes (maestri, coaches, buddies), each with different prompt architecture needs. Maestri require stable, extensive domain knowledge prompts. Coaches need consistent methodology prompts. Buddies must adapt to each student's age and learning differences, making static prompts inadequate.

## Decision

Implement differentiated prompt architecture by character class:

- **Maestri**: Static `systemPrompt` string in data files (`src/data/maestri/{name}.ts`). Prompts are 200-500 lines with embedded domain knowledge, teaching philosophy, and tool usage patterns. Never modified at runtime.
- **Coaches**: Static `systemPrompt` string in data files (`src/data/support-teachers/{name}.ts`). Prompts focus on learning methodology, autonomy development, and referral patterns. Safety guardrails injected via `injectSafetyGuardrails()`.
- **Buddies**: Dynamic `getSystemPrompt(student: ExtendedStudentProfile)` function in data files (`src/data/buddy-profiles/{name}.ts`). Generates personalized prompts reflecting student's age+1, learning differences, and struggle context. Safety guardrails injected with `role: "buddy"`.

## Consequences

- Positive: Buddies provide age-appropriate peer support, coaches maintain consistent methodology, maestri preserve domain expertise without runtime complexity
- Negative: Buddy prompt changes require code deployment (cannot update via admin panel), testing must cover dynamic prompt variations

## Enforcement

- Rule: `grep 'systemPrompt:' src/data/maestri/*.ts src/data/support-teachers/*.ts` (static strings)
- Rule: `grep 'getSystemPrompt:' src/data/buddy-profiles/*.ts` (dynamic functions)
- Check: `npx vitest run -- buddy-profiles` (verifies age offset, learning diffs injection)
- Ref: ADR 0150 (knowledge-base scope), ADR 0003 (Triangle of Support)
