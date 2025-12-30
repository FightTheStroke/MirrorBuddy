# ADR 0001: Use MarkMap for Mind Map Rendering

## Status
Accepted

## Date
2025-12-28

## Context
The educational web application requires mind maps as a fundamental tool for teachers and AI agents. The current implementation uses Mermaid.js for mind map rendering, which has caused persistent issues:

1. **Text truncation**: Labels are cut off (e.g., "Algebr" instead of "Algebra")
2. **Export failures**: SVG-to-image conversion is unreliable
3. **Limited text control**: Mermaid is designed for flowcharts, not mind maps
4. **10+ reported issues**: Users have repeatedly requested fixes

### Requirements
- AI agents must generate mind maps on the fly
- Support zoom, pan, print, and image export
- Dyslexia-friendly font support
- Full text visibility (no truncation)
- Accessibility compliance (WCAG AA)

### Options Considered

| Library | Last Release | Stars | Pros | Cons |
|---------|--------------|-------|------|------|
| **Mermaid.js** | Current | 70K+ | Already integrated | Text truncation, not mindmap-focused |
| **MarkMap** | Dec 2024 | 10K | Markdown input, purpose-built | 1 year without updates |
| **React Flow** | Oct 2025 | 22K+ | Actively maintained, flexible | Requires custom layout implementation |
| **jsMind** | Dec 2024 | 3.6K | Purpose-built, JSON input | 1 year without updates, smaller community |

## Decision
We will replace Mermaid.js with **MarkMap** for mind map rendering.

### Rationale
1. **AI-friendly input**: MarkMap uses Markdown, which AI agents generate naturally
2. **Purpose-built**: Designed specifically for mind maps, not adapted from flowcharts
3. **Implementation speed**: ~2 hours vs 5+ hours for React Flow
4. **Proven stability**: Although not updated in 1 year, the library is feature-complete and stable
5. **MIT License**: Free for commercial use on public repositories

### Input Format Comparison
```markdown
# MarkMap (Markdown - natural for AI)
# Algebra
## Equazioni
### Primo grado
### Secondo grado
```

```javascript
// Mermaid (custom syntax - error-prone)
mindmap
  root((Algebra))
    Equazioni
      Primo grado
      Secondo grado
```

## Consequences

### Positive
- Text truncation issue permanently resolved
- Simpler AI integration (Markdown vs custom syntax)
- Better zoom/pan/collapse built-in
- Easier font customization via CSS
- Cleaner codebase (remove Mermaid hacks)

### Negative
- Migration effort required (~2 hours)
- Library not actively updated (feature-complete, not abandoned)
- Need to update AI tool definitions to output Markdown

### Migration Path
1. Install `markmap-view` and `markmap-lib`
2. Create new `MarkMapRenderer` component
3. Keep old `MindmapRenderer` as fallback during transition
4. Update AI tools to generate Markdown format
5. Remove Mermaid mindmap code after validation

## References
- [MarkMap GitHub](https://github.com/markmap/markmap)
- [MarkMap Documentation](https://markmap.js.org/)
- [React Flow Mind Map Tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow)
- Issue: Mindmap text truncation (reported 10+ times)
