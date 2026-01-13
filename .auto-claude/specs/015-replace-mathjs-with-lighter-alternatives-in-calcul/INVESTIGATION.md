# Investigation: Replace mathjs with lighter alternatives in Calculator

**Date:** 2026-01-13
**Task ID:** 015-replace-mathjs-with-lighter-alternatives-in-calcul
**Status:** Investigation Complete - Spec Misspecified

---

## Executive Summary

**Finding:** The original spec is misspecified. It assumes calculator components (`calculator-scientific.tsx` and `calculator-simple.tsx`) exist and use mathjs library, but investigation reveals:

1. ✅ **Confirmed:** NO calculator components exist in the codebase
2. ✅ **Confirmed:** mathjs is NOT a dependency in package.json
3. ⚠️ **Discovered:** Euclide maestro lists "Calculator" in tools array but it's not implemented
4. ⚠️ **Discovered:** Euclide's system prompt describes Calculator tool functionality (lines 145-149) but no implementation exists

**Conclusion:** This is not a refactoring task (replacing mathjs), but rather a **new feature implementation task** (building Calculator tool from scratch with a lightweight library).

---

## Investigation Details

### 1. Component Search Results

**Search Pattern:** `**/calculator*.{ts,tsx}`
**Result:** No files found

**Expected files (per spec):**
- `src/components/tools/calculator-scientific.tsx` - ❌ Does not exist
- `src/components/tools/calculator-simple.tsx` - ❌ Does not exist

**Actual calculator-related files:**
- None found

### 2. Dependency Analysis

**Command:** `grep -i "mathjs" package.json`
**Result:** mathjs NOT found in package.json

**Math-related dependencies found:**
- `katex` - Used for LaTeX formula rendering (formula-renderer.tsx)
- No expression evaluation libraries present

**Math operations in codebase:**
- Native JavaScript `Math` object used in `src/lib/education/accessibility/dyscalculia.ts`
- KaTeX for rendering formulas (not evaluation) in `src/components/tools/formula-renderer.tsx`

### 3. Tool Type Analysis

**File:** `src/types/tools/tool-types.ts`

**Implemented tool types (lines 8-22):**
```typescript
export type ToolType =
  | 'mindmap'
  | 'quiz'
  | 'flashcard'
  | 'demo'
  | 'search'
  | 'diagram'
  | 'timeline'
  | 'summary'
  | 'formula'
  | 'chart'
  | 'webcam'
  | 'pdf'
  | 'homework'
  | 'study-kit';
```

**Result:** 'calculator' is **NOT** in the ToolType union

### 4. Tool Handlers Inventory

**Directory:** `src/lib/tools/handlers/`

**Existing handlers:**
- archive-handler.ts
- demo-handler.ts
- diagram-handler.ts
- flashcard-handler.ts
- mindmap-handler.ts
- quiz-handler.ts
- search-handler.ts
- study-kit-handler.ts
- summary-handler.ts
- timeline-handler.ts

**Result:** No calculator-handler.ts exists

### 5. Tool Renderers Inventory

**Directory:** `src/components/tools/`

**Existing renderers:**
- chart-renderer.tsx
- diagram-renderer.tsx
- formula-renderer.tsx
- summary-renderer.tsx

**Result:** No calculator-renderer.tsx exists

### 6. Euclide Maestro Analysis

**File:** `src/data/maestri/euclide.ts`

**Euclide's tools array (line 11):**
```typescript
tools: ["Task","Read","Write","WebSearch","MindMap","Quiz","Flashcards","Audio","Calculator","Graph","Formula","Geometry","HtmlInteractive"]
```

**Key Finding:** "Calculator" is listed but not implemented

**System Prompt Excerpt (lines 145-149):**
```
### Calculator (Calcolatrice Visuale)
- Shows every step with colors
- Blocks for place value
- Fraction visualizer (pizza slices)
- Speaks calculations if TTS enabled
```

**System Prompt Note (line 31):**
```
- **No Calculator Dependency**: Build understanding, not button-pressing
```

**Analysis:**
- Calculator tool is **described in detail** in Euclide's system prompt
- Calculator is **listed** in Euclide's tools array
- Calculator **functionality is NOT implemented** in the codebase
- This suggests Calculator is a **planned feature** that hasn't been built yet

### 7. Educational Accessibility Requirements

**File:** `src/lib/education/accessibility/dyscalculia.ts`

**Key findings:**
- Uses native JavaScript Math object for calculations
- No dependency on external math libraries
- Implements color-coded number formatting for dyscalculia support
- Provides visual place value representations

**Relevance:** Any Calculator tool implementation should integrate these dyscalculia-specific features.

---

## Spec Validation

### Original Spec Claims vs Reality

| Spec Claim | Reality | Status |
|------------|---------|--------|
| "calculator components import mathjs" | No calculator components exist | ❌ False |
| "~170KB minified impact" | mathjs not a dependency | ❌ False |
| "Only 5-6 functions used" | No mathjs usage found | ❌ False |
| "calculator-scientific.tsx exists" | File does not exist | ❌ False |
| "calculator-simple.tsx exists" | File does not exist | ❌ False |

### Spec Status Note

From `spec.md` line 12:
> *This spec was created from ideation and is pending detailed specification.*

**Interpretation:** This spec was created from ideation without codebase verification, resulting in incorrect assumptions.

---

## Why Calculator Appears in Euclide's Tools

### Hypothesis: Planned Feature vs Implemented Feature

**Evidence for "planned but not implemented":**

1. **Detailed specification** in system prompt (145-149) suggests intentional design
2. **Listed in tools array** alongside implemented tools (MindMap, Quiz, Formula)
3. **Educational rationale** aligns with dyscalculia support goals
4. **No implementation** found in any codebase layer (types, handlers, renderers)

**Conclusion:** Calculator tool is likely a **planned feature** that was designed but never implemented. Euclide's tools array includes the aspirational tool list.

### Similar Cases in Maestro Profiles

**Other potentially unimplemented tools in Euclide's list:**
- "Graph" - Not found in ToolType union (chart exists, but Graph for function plotting is different)
- "Geometry" - Not found in ToolType union
- "HtmlInteractive" - Possibly maps to 'demo' tool type

**Recommendation:** Audit all maestro tool arrays to identify planned vs implemented tools.

---

## Recommended Next Steps

### Option A: Build Calculator Tool (Recommended)

**Rationale:**
1. Calculator is clearly needed for Euclide's math education mission
2. Dyscalculia support requires visual, step-by-step calculation aids
3. Educational value is high (understanding not just computation)
4. Aligns with existing accessibility features

**Implementation approach:**
1. Use **lightweight expression evaluator** instead of mathjs
2. Recommended libraries:
   - `expr-eval` (~12KB minified) - Full-featured, well-maintained
   - `math-expression-evaluator` (~8KB minified) - Smaller, basic functionality
   - Native approach - Custom parser with Math object (0KB, more work)

3. Feature set:
   - Basic arithmetic: +, -, *, /, ^
   - Constants: pi, e
   - Functions: sin, cos, tan, sqrt, log, abs
   - Safe expression evaluation (no eval())
   - Step-by-step visual breakdown for dyscalculia

4. Integration points:
   - Add 'calculator' to ToolType union
   - Create calculator-handler.ts following quiz-handler.ts pattern
   - Create calculator-renderer.tsx with accessibility features
   - Add calculator schema to tool-schemas.ts
   - Integrate with dyscalculia.ts color-coding system

**Estimated impact:**
- Bundle size: +12KB (expr-eval) vs +170KB (mathjs) = 158KB savings vs hypothetical
- Development time: ~1-2 days
- Files to create: 4-5 new files
- Files to modify: 3-4 existing files

### Option B: Update Spec to "Build Calculator Tool"

**If Option A is approved**, rename/update spec:
- From: "Replace mathjs with lighter alternatives"
- To: "Implement Calculator tool with lightweight expression evaluator"
- Update acceptance criteria to reflect new feature development
- Remove references to non-existent components

### Option C: Close Spec as Invalid

**If Calculator tool is not needed**:
1. Remove "Calculator" from Euclide's tools array
2. Remove Calculator description from system prompt
3. Close this spec as "misspecified - components don't exist"
4. Mark as "not needed" or "deferred to future roadmap"

### Option D: Mark Calculator as Future Feature

**If Calculator is planned but not prioritized**:
1. Create placeholder types/interfaces for future implementation
2. Document Calculator requirements in design docs
3. Keep in Euclide's tools array with "coming soon" notation
4. Close this spec and create proper feature spec when prioritized

---

## Technical Proposal (If Option A Selected)

### Library Recommendation: expr-eval

**Why expr-eval:**
- ✅ Small bundle size: ~12KB minified
- ✅ Safe evaluation (no eval())
- ✅ Supports constants (Math.PI, Math.E)
- ✅ Supports functions (sin, cos, sqrt, etc.)
- ✅ Expression parsing and AST access
- ✅ Well-maintained (active development)
- ✅ TypeScript support via @types/expr-eval

**Installation:**
```bash
npm install expr-eval
npm install --save-dev @types/expr-eval
```

### Architecture Design

**1. Type Definitions** (`src/types/tools/calculator-types.ts`):
```typescript
export interface CalculatorRequest {
  expression: string;
  mode?: 'simple' | 'scientific';
  showSteps?: boolean; // For dyscalculia support
}

export interface CalculatorStep {
  description: string;
  expression: string;
  result: number | string;
}

export interface CalculatorResult {
  expression: string;
  result: number;
  steps?: CalculatorStep[];
  variables?: Record<string, number>;
}
```

**2. Handler** (`src/lib/tools/handlers/calculator-handler.ts`):
- Pattern: Follow quiz-handler.ts structure
- Use expr-eval's Parser class
- Implement step-by-step breakdown for dyscalculia
- Emit SSE events for real-time updates
- Error handling for invalid expressions

**3. Renderer** (`src/components/tools/calculator-renderer.tsx`):
- Visual calculator interface (keypad for mobile)
- Step-by-step visualization with color coding
- Integration with dyscalculia.ts formatting
- Accessibility: ARIA labels, keyboard navigation
- Framer Motion animations for result transitions

**4. Integration Points:**
- Add 'calculator' to ToolType union in tool-types.ts
- Export handler in handlers/index.ts
- Add schema to tool-schemas.ts (CHAT_TOOL_DEFINITIONS)
- Add case in tool-result-display.tsx ToolContent component

### Sample Implementation

**Calculator Handler (simplified):**
```typescript
import { Parser } from 'expr-eval';

export async function executeCalculator(
  request: CalculatorRequest,
  context: ToolContext,
  emitEvent: (event: ToolEvent) => void
): Promise<ToolExecutionResult> {
  const parser = new Parser();

  try {
    const result = parser.evaluate(request.expression);

    const calculatorResult: CalculatorResult = {
      expression: request.expression,
      result,
      steps: request.showSteps ? generateSteps(request.expression) : undefined
    };

    return {
      success: true,
      toolId: generateId(),
      toolType: 'calculator',
      data: calculatorResult
    };
  } catch (error) {
    return {
      success: false,
      toolId: generateId(),
      toolType: 'calculator',
      error: 'Invalid expression'
    };
  }
}
```

---

## Bundle Size Analysis

### Current State
- **mathjs:** NOT present in bundle (0KB)
- **Math operations:** Native JavaScript Math object (0KB)

### Proposed State (If Calculator Built)
- **expr-eval:** ~12KB minified
- **calculator-handler.ts:** ~2KB
- **calculator-renderer.tsx:** ~5KB
- **Total impact:** ~19KB

### Comparison to Original Spec Assumption
- **Hypothetical mathjs:** ~170KB
- **Proposed expr-eval:** ~12KB
- **Savings:** 158KB (93% smaller)

**Conclusion:** Even though mathjs isn't currently used, building Calculator with expr-eval validates the spec's core concern about bundle size optimization.

---

## Risk Assessment

### Risks of Building Calculator Tool

1. **Scope creep:** Calculator could expand beyond basic expression evaluation
   - Mitigation: Start with MVP (expression evaluation only)

2. **Accessibility complexity:** Dyscalculia features require careful UX design
   - Mitigation: Leverage existing dyscalculia.ts utilities

3. **Security:** Expression evaluation has injection risks
   - Mitigation: expr-eval is safe (no eval()), validate inputs

4. **Maintenance:** Another tool to maintain and test
   - Mitigation: Follow established tool patterns, add to test suite

### Risks of Not Building Calculator Tool

1. **Euclide's promise unfulfilled:** System prompt describes Calculator features
2. **Student confusion:** Euclide mentions calculator in conversations but can't deliver
3. **Dyscalculia support gap:** Calculator is specifically designed for this need
4. **Competitive disadvantage:** Math tutoring platform without calculator

---

## Implementation Checklist (If Approved)

### Phase 1: Investigation Complete ✅
- [x] Confirm calculator components don't exist
- [x] Confirm mathjs not a dependency
- [x] Analyze Euclide's tools array
- [x] Document findings in INVESTIGATION.md

### Phase 2: Decision (CURRENT)
- [ ] Stakeholder review of INVESTIGATION.md
- [ ] Decision: Build Calculator, Update Spec, Close Spec, or Defer
- [ ] If building: Approve expr-eval library choice
- [ ] If building: Review architecture proposal

### Phase 3: Implementation (BLOCKED until Phase 2)
- [ ] Add calculator to ToolType union
- [ ] Install expr-eval
- [ ] Create calculator-types.ts
- [ ] Create calculator-handler.ts
- [ ] Create calculator-renderer.tsx
- [ ] Add calculator schema
- [ ] Integrate in tool-result-display.tsx

### Phase 4: Testing (BLOCKED until Phase 3)
- [ ] Unit tests for calculator-handler
- [ ] Manual testing with Euclide
- [ ] Accessibility testing (dyscalculia features)
- [ ] Bundle size verification
- [ ] E2E tests for calculator tool

---

## Questions for Stakeholders

1. **Priority:** Is Calculator tool needed for MVP or can it be deferred?
2. **Scope:** Should MVP include only expression evaluation, or also graphing/step-by-step?
3. **Library:** Approve expr-eval (~12KB) or prefer lighter alternative?
4. **Timeline:** When should Calculator tool be delivered if approved?
5. **Other tools:** Should we audit other unimplemented tools in maestro profiles (Graph, Geometry)?

---

## Conclusion

The spec "Replace mathjs with lighter alternatives in Calculator" is **misspecified** because:
1. Calculator components don't exist
2. mathjs is not a dependency
3. This is a new feature, not a refactoring task

**However**, the **core insight is valuable**: Calculator tool is needed for Euclide, and using a lightweight library (expr-eval ~12KB) instead of mathjs (~170KB) will save 158KB bundle size.

**Recommendation:** Proceed with **Option A - Build Calculator Tool** using expr-eval, treating this as a new feature implementation rather than a refactoring task. Update spec title and acceptance criteria to reflect this.

---

**Investigation completed by:** Claude (Auto-Claude System)
**Next action:** Await stakeholder decision on Options A-D
