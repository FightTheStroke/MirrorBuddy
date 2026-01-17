# License & IP Strategy

## A.1 Current License

- **License:** Apache License 2.0
- **Rationale:** Product proof mode, maximum transparency, institutional trust
- **Positioning:** Open-core intentional, not naive

Apache 2.0 chosen for:
- Patent protection (critical for AI/ML)
- Educational institution trust
- Alignment with AI industry standards (TensorFlow, PyTorch, Kubernetes)

See [ADR 0023](docs/adr/0023-apache-2-license.md) for full rationale.

## A.2 Why NOT Commons Clause Today

Commons Clause:
- Prohibits commercial use explicitly
- Crystallizes business decision before product validation
- Creates friction with grants, universities, foundations

In this phase, Commons Clause **reduces optionality** without increasing valuation.

## A.3 Where Value Lives (NOT Open-Core)

Even if technically expressed as code/config, these are **not part of open-core**:

- Real decision prompts (decision tables)
- Operational thresholds (GO/NO-GO values)
- Metrics calibrated on real data
- Parametric cost model
- Controlled degradation logic
- Labeled eval datasets
- Operational runbooks and incident management

These constitute the **MirrorBuddy system**, not just the repository.

## A.4 License Revision Strategy

**Now:** Apache 2.0 (open-core)

**Revision triggers:**
- MirrorBuddy v1 released
- Runtime metrics stable
- Monetization started (Pro / enterprise / licensing)

**Post-trigger options (one only):**
1. Apache 2.0 + Commons Clause (education-first)
2. Dual Licensing (Apache 2.0 + Commercial License) for MirrorBuddy Pro

Choice depends on **validated monetization model**, not hypotheses.

## A.5 VC/Partner Statement

> "MirrorBuddy is Apache 2.0 today because we are in product proof mode.
> The competitive advantage is not the repository, but the governed system around it.
> Commercial licensing will be introduced once monetization starts."

---

*This document is part of the Definition of Done for v1.*
