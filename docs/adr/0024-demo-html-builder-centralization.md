# ADR 0024: Demo HTML Builder Centralization

## Status
Accepted (Implemented 2026-01-03)

## Date
2026-01-03

## Context

Demo tools (interactive HTML/CSS/JS simulations) are rendered in multiple places throughout the application:
- Chat messages (`ToolResultDisplay` → `DemoSandbox`)
- Knowledge Hub (`DemoRenderer` → `HTMLPreview`)
- Study Kit viewer (`StudyKitViewer` → `HTMLPreview`)
- Tool Panel (`ToolPanel` → `DemoSandbox`)

Each renderer was independently building HTML documents with:
- Different viewport meta tags
- Inconsistent CSS reset and responsive styles
- Varying JavaScript execution strategies
- Different iframe sandbox permissions
- No guarantee of cross-frame compatibility

### Problems

1. **Inconsistent behavior**: Demos might work in chat but fail in Knowledge Hub due to different HTML structure
2. **Responsive issues**: Some renderers lacked proper viewport configuration, causing zoom/scale problems
3. **JavaScript execution**: Different strategies (DOMContentLoaded, immediate execution, setTimeout) led to race conditions
4. **Security inconsistencies**: Sandbox permissions varied across renderers
5. **Maintenance burden**: Bug fixes and improvements needed to be applied in multiple places

### User Impact

- Demos might not work correctly at different zoom levels or screen resolutions
- JavaScript animations and interactions could fail inconsistently
- Poor experience when viewing the same demo in different contexts

## Decision

Create a **shared HTML builder utility** (`src/lib/tools/demo-html-builder.ts`) that ensures consistent demo rendering across all contexts.

### Core Principles

1. **Single source of truth**: One function builds all demo HTML
2. **Universal compatibility**: Works in any iframe, at any zoom/resolution
3. **Complete permissions**: Full sandbox permissions for interactive demos
4. **Robust execution**: Multiple strategies ensure JavaScript always runs

### Architecture

#### 1. Shared HTML Builder

```typescript
// src/lib/tools/demo-html-builder.ts
export function buildDemoHTML(demoData: DemoData): string {
  // Handles both full HTML code and html/css/js parts
  // Ensures proper viewport, responsive CSS, script execution
}

export function getDemoSandboxPermissions(): string {
  // Consistent sandbox permissions everywhere
}

export function getDemoAllowPermissions(): string {
  // Consistent allow attribute everywhere
}
```

#### 2. HTML Structure

Every demo HTML includes:
- **Proper DOCTYPE**: `<!DOCTYPE html>`
- **Viewport meta**: `width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes`
- **Responsive CSS**: Media queries for mobile (≤768px), desktop, and 4K (≥1920px)
- **CSS Reset**: Box-sizing, margin/padding normalization
- **Scalable elements**: Canvas and SVG scale properly
- **JavaScript execution**: DOMContentLoaded + immediate + timeout fallback

#### 3. Sandbox Permissions

Consistent permissions across all iframes:
```
allow-scripts allow-same-origin allow-forms allow-popups 
allow-modals allow-pointer-lock allow-downloads 
allow-top-navigation allow-top-navigation-by-user-activation 
allow-popups-to-escape-sandbox
```

#### 4. Updated Components

All demo renderers now use the shared builder:
- `DemoSandbox` (chat, tool panel)
- `HTMLPreview` (knowledge hub, study kit)
- `DemoRenderer` (knowledge hub with KaTeX support)
- `StudyKitViewer` (study kit viewer)

## Implementation

### Files Created
- `src/lib/tools/demo-html-builder.ts` - Shared utility

### Files Modified
- `src/components/tools/demo-sandbox.tsx` - Uses `buildDemoHTML()`
- `src/components/education/html-preview.tsx` - Uses shared builder
- `src/components/education/knowledge-hub/renderers/demo-renderer.tsx` - Uses shared builder
- `src/components/study-kit/StudyKitViewer.tsx` - Uses shared builder

### Key Features

1. **Responsive Design**
   ```css
   @media (max-width: 768px) { /* Mobile */ }
   @media (min-width: 1920px) { /* 4K */ }
   ```

2. **JavaScript Execution**
   ```javascript
   // Multiple strategies ensure execution
   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', executeDemoScript);
   } else {
     executeDemoScript();
   }
   setTimeout(executeDemoScript, 100); // Fallback
   ```

3. **Error Handling**
   - Try-catch blocks around script execution
   - Visual error messages in demo if execution fails

## Consequences

### Positive
- **Consistent behavior**: Demos work identically everywhere
- **Responsive**: Proper scaling at all resolutions and zoom levels
- **Reliable**: Multiple JavaScript execution strategies prevent failures
- **Maintainable**: Single place to fix bugs or add features
- **Secure**: Consistent sandbox permissions across all contexts

### Negative
- **Additional abstraction**: One more layer between components and HTML
- **Bundle size**: ~2KB for the utility (minimal impact)

### Mitigations
- Utility is tree-shakeable (ES modules)
- No external dependencies
- Simple, focused API

## Testing

Demos should be tested in:
- Chat messages (inline)
- Knowledge Hub (preview + fullscreen)
- Study Kit viewer
- Tool Panel
- At different zoom levels (50%, 100%, 200%)
- At different resolutions (mobile, tablet, desktop, 4K)
- With JavaScript animations and interactions

## References

- ADR 0009: Tool Execution Architecture (demo tool definition)
- ADR 0022: Knowledge Hub Architecture (demo renderer in hub)
- Issue: Demo tool not working correctly in all contexts
- Implementation: `src/lib/tools/demo-html-builder.ts`
