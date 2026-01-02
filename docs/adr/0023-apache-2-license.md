# ADR 0023: Apache 2.0 License

**Date**: 2026-01-02
**Status**: Accepted
**Deciders**: Roberto D'Angelo

## Context

ConvergioEdu needs an open source license that:
1. Protects users from patent litigation (critical for AI/ML projects)
2. Is trusted by educational institutions and public administration
3. Allows commercial use while maintaining open source commitment
4. Is compatible with the project's mission-driven nature

The project was initially considering MIT license for its simplicity.

## Decision

We adopt **Apache 2.0** as the project license.

## Rationale

### Patent Protection

Apache 2.0 includes an explicit patent grant (Section 3), protecting users from patent litigation by contributors. This is critical for AI/ML projects where:
- Large tech companies hold AI-related patents
- Patent trolls target successful projects
- Educational institutions need legal clarity

MIT license provides no patent protection.

### Institutional Trust

Apache 2.0 is the preferred license for:
- Italian public administration (PA) open source policies
- Educational institutions with legal compliance requirements
- Healthcare and accessibility organizations
- Enterprise adoption

Schools and government entities trust Apache 2.0's clear, comprehensive terms.

### Industry Standard for AI

Apache 2.0 is used by major AI/ML projects:
- TensorFlow (Google)
- PyTorch (Meta)
- Kubernetes (CNCF)
- OpenAI API libraries

This alignment simplifies integration and adoption.

### Contribution Protection

The Contributor License Agreement (CLA) aspect protects both:
- Contributors: clear ownership of their contributions
- Project: ability to maintain and distribute the software

## Alternatives Considered

### MIT License
- **Pros**: Simple, permissive, widely understood
- **Cons**: No patent protection, less institutional trust for AI projects

### GPL v3
- **Pros**: Strong copyleft, patent protection
- **Cons**: Incompatible with some educational uses, discourages commercial adoption

### AGPL v3
- **Pros**: Network copyleft
- **Cons**: Too restrictive for SaaS educational platforms

## Consequences

### Positive
- Patent protection for all users
- Easier adoption by schools and public institutions
- Alignment with AI industry standards
- Clear contributor guidelines

### Negative
- Slightly more complex than MIT
- Requires LICENSE file and attribution in derivative works

### Neutral
- Same permissive nature as MIT for most use cases
- Compatible with most open source licenses

## Implementation

1. Replace LICENSE file with Apache 2.0 text
2. Update README badges and license section
3. Copyright notice: "Copyright 2025 Roberto D'Angelo / FightTheStroke"

## References

- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Choose a License: Apache 2.0](https://choosealicense.com/licenses/apache-2.0/)
- [Google Open Source: Why Apache 2.0](https://opensource.google/documentation/reference/using/apache-license)
