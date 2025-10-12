# ADR-XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded
**Deciders**: [List who made the decision]
**Agent**: [Agent ID if applicable]

---

## Context

[Describe the context and problem statement. What forces are at play?]

### Current Situation
- What is the current state?
- What problem are we trying to solve?
- What constraints exist?

### Requirements
- What must the solution achieve?
- What are the success criteria?

---

## Decision Drivers

- **Mario-First**: How does this serve Mario's learning needs?
- **Accessibility**: Impact on voice-first, one-handed operation, dyslexia support
- **Simplicity**: Architectural complexity vs alternatives
- **Cost**: API costs, development time, maintenance burden
- **Performance**: Speed, memory, battery impact
- **Privacy**: Data handling, on-device vs cloud
- **Quality**: Testability, maintainability

---

## Considered Options

### Option A: [Name]
**Description**: [Brief description]

**Pros**:
- ✅ Advantage 1
- ✅ Advantage 2

**Cons**:
- ❌ Disadvantage 1
- ❌ Disadvantage 2

**Cost**: [API costs, development time]
**Complexity**: [Low/Medium/High]

### Option B: [Name]
**Description**: [Brief description]

**Pros**:
- ✅ Advantage 1
- ✅ Advantage 2

**Cons**:
- ❌ Disadvantage 1
- ❌ Disadvantage 2

**Cost**: [API costs, development time]
**Complexity**: [Low/Medium/High]

### Option C: [Name] (if applicable)
...

---

## Decision Outcome

**Chosen Option**: Option [X] - [Name]

### Rationale
[Explain why this option was chosen. Reference decision drivers.]

### Implementation Details
```swift
// Example code or pseudocode showing how this will be implemented
```

### Migration Path (if replacing existing solution)
1. Step 1
2. Step 2
3. Step 3

---

## Consequences

### Positive
- ✅ Benefit 1
- ✅ Benefit 2

### Negative
- ⚠️ Trade-off 1
- ⚠️ Trade-off 2

### Neutral
- ℹ️ Change 1
- ℹ️ Change 2

---

## Validation

### Tests Required
- [ ] Unit tests for [component]
- [ ] Integration tests for [feature]
- [ ] Performance tests (target: [metric])
- [ ] Accessibility tests (VoiceOver)

### Success Metrics
- Metric 1: [target value]
- Metric 2: [target value]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

---

## Follow-up

### Immediate Actions
- [ ] Action 1 (assigned to: [agent/person])
- [ ] Action 2

### Future Considerations
- Consider [alternative] if [condition]
- Monitor [metric] and revisit if threshold exceeded

---

## References

- [Link to related ADRs]
- [Link to technical documentation]
- [Link to user research]
- [API documentation]

---

## Notes

[Any additional context, discussions, or considerations]
