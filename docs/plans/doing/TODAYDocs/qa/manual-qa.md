# Manual QA Execution Plan

**Owner**: Roberto
**Status**: Pending
**Blocks**: PR #106 merge, all subsequent waves

---

## Overview

These items have fixes applied but require **manual testing** for confirmation.

Complete reference: `docs/plans/todo/MANUAL-QA-EXECUTION-PLAN-Jan3.md`

---

## [ ] QA-1: Tool Creation Visibility (BUG 5)

**Procedure**:
1. Open chat with any Maestro
2. Request: "Create a mind map about the Solar System"
3. Wait for AI response

**Verify**:
- [ ] Mindmap appears in tool panel - SI
- [ ] No SVGLength error in console - SI
- [ ] Tool is interactive (expandable nodes) - NO

---

## [ ] QA-2: Mindmap Hierarchy (BUG 7)

**Procedure**:
1. Open chat with any Maestro
2. Request: "Create a mind map with 3 levels: Animals -> Mammals/Reptiles -> specific examples"

**Verify**:
- [ ] Root node "Animals" at center - NO
- [ ] Second level: "Mammals", "Reptiles" as children - NO
- [ ] Third level: specific animals under each category - NO
- [ ] Lines connecting parent to children - NO

---

## [ ] QA-3: Fullscreen on Tool Creation (BUG 8)

**Procedure**:
1. Open chat in standard layout
2. Request: "Generate a 5-question quiz on Roman history"
3. Wait for tool creation

**Verify**:
- [ ] Layout automatically changes to focus mode - NO
- [ ] Tool occupies main viewport - NO
- [ ] "Exit fullscreen" button visible - NO

---

## [ ] QA-4: Conversation Persistence (BUG 11)

**Procedure**:
1. Chat with Maestro A (e.g., Leonardo) - send 3-4 messages
2. Switch to Maestro B (e.g., Galileo) - send 2 messages
3. Return to Maestro A

**Verify**:
- [ ] Maestro A conversation shows all previous messages - NO + error: ## Error Type
Console Error

## Error Message
[ERROR] 17:15:28 Failed to save material {}


    at <unknown> (src/lib/client-error-logger.ts:129:31)
    at log (src/lib/logger.ts:49:22)
    at saveMaterialToAPI (src/lib/hooks/use-saved-materials.ts:171:17)

## Code Frame
  127 |     });
  128 |
> 129 |     originalConsoleError.apply(console, args);
      |                               ^
  130 |   };
  131 |
  132 |   // Intercept console.warn

Next.js version: 16.1.1 (Turbopack)

- [ ] No mixing between conversations - Non testabile

---

## [ ] QA-5: Material Save (BUG 13)

**Procedure**:
1. Generate a tool (summary, map, flashcard)
2. Click "Save"
3. Go to Knowledge Hub / Archive

**Verify**:
- [ ] Save confirmation toast - NO e no bottone salva
- [ ] Content appears in Archive - A VOLTE SI A VOLTE NO
- [ ] Content retrievable and viewable - NON SEMPRE

Ecco errori:
## Error Type
Console Error

## Error Message
[ERROR] 17:15:28 Failed to save material {}


    at <unknown> (src/lib/client-error-logger.ts:129:31)
    at log (src/lib/logger.ts:49:22)
    at saveMaterialToAPI (src/lib/hooks/use-saved-materials.ts:171:17)

## Code Frame
  127 |     });
  128 |
> 129 |     originalConsoleError.apply(console, args);
      |                               ^
  130 |   };
  131 |
  132 |   // Intercept console.warn

Next.js version: 16.1.1 (Turbopack)

E 
## Error Type
Runtime SecurityError

## Error Message
Sandbox access violation: Blocked a frame at "http://localhost:3000" from accessing a cross-origin frame.  The frame being accessed is sandboxed and lacks the "allow-same-origin" flag.


    at HTMLPreview.useEffect (src/components/education/html-preview.tsx:65:65)
    at DemoRenderer (src/components/education/knowledge-hub/renderers/demo-renderer.tsx:169:15)
    at renderContent (src/components/education/archive/material-viewer.tsx:113:11)
    at MaterialViewer (src/components/education/archive/material-viewer.tsx:178:12)
    at ArchiveView (src/components/education/archive-view.tsx:432:11)
    at Home (src/app/page.tsx:415:41)

## Code Frame
  63 |     if (iframeRef.current && view === 'preview') {
  64 |       const iframe = iframeRef.current;
> 65 |       const doc = iframe.contentDocument || iframe.contentWindow?.document;
     |                                                                 ^
  66 |       if (doc) {
  67 |         doc.open();
  68 |         doc.write(sanitizedCode);

Next.js version: 16.1.1 (Turbopack)

Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).---

## [ ] QA-6: ESC Key Exits Fullscreen (BUG 15)

**Procedure**:
1. Create a tool to enter focus mode
2. Verify focus mode active
3. Press ESC

**Verify**:
- [ ] ESC exits focus mode - SI
- [ ] Layout returns to standard - SI
- [ ] Tool content preserved - SI

---

## [ ] QA-7: PDF Parsing (BUG 19)

**Procedure**:
1. Go to Study Kit
2. Upload a PDF (with text, not scan)
3. Wait for processing

**Verify**:
- [ ] Upload succeeds - SI
- [ ] Text extracted correctly - NO Error: Failed to parse PDF
- [ ] Page count correct - NO Error: Failed to parse PDF
- [ ] No parsing errors - NO Error: Failed to parse PDF

---

## [ ] QA-8: Parent Dashboard Empty State (BUG 21)

**Procedure**:
1. Go to Parent Dashboard
2. With user without activity data

**Verify**:
- [ ] Empty state UI displayed - SI
- [ ] Friendly message (not blank/broken page) - SI ma fa cagare
- [ ] Call-to-action to get started - SI MA NON FUNZIONA No conversation insights found. The student needs to interact with Maestri first.

---

## [ ] QA-9: Summary Tool UI (BUG 26)

**Procedure**:
1. Request summary: "Summarize the French Revolution"
2. Wait for generation
3. Test all buttons

**Verify**:
- [ ] Summary formatted correctly - SI
- [ ] "Edit" opens editable view - SI, ma voglio anche un mini editor markdown tipo con colori, bold, font size etc. Semplice ma completo e a testo libero, non solo strutturato come ora 
- [ ] "Export PDF" downloads file - NO, non c'è export to PDF
- [ ] "Convert to map" creates mindmap - NO opzione non presente
- [ ] "Generate flashcards" creates flashcard set - NO opzione non presente
!!! e il riassunto non è stato salvato nel folder dei riassunti!!!

---

## [ ] QA-10: Navigation Consistency (BUG 27)

**Procedure**:
1. Maestro overlay -> X -> verify closes
2. Maestro overlay -> ESC -> verify closes
3. Focus mode -> exit button -> verify exits
4. Focus mode -> ESC -> verify exits
5. Modal/dialog -> X -> verify closes
6. Modal/dialog -> ESC -> verify closes

**Verify**:
- [ ] All X buttons close - OK
- [ ] ESC works consistently everywhere - NO
- [ ] No orphan modals/overlays - ci sono molte inconsistente: pagina dei genitori, full screen, etc.

---

## Summary Table

| QA Item | Bug # | Status | Result | Notes |
|---------|-------|--------|--------|-------|
| QA-1 | BUG 5 | [ ] | | |
| QA-2 | BUG 7 | [ ] | | |
| QA-3 | BUG 8 | [ ] | | |
| QA-4 | BUG 11 | [ ] | | |
| QA-5 | BUG 13 | [ ] | | |
| QA-6 | BUG 15 | [ ] | | |
| QA-7 | BUG 19 | [ ] | | |
| QA-8 | BUG 21 | [ ] | | |
| QA-9 | BUG 26 | [ ] | | |
| QA-10 | BUG 27 | [ ] | | |

---

## Completion Criteria

- [ ] All 10 QA items tested
- [ ] Results documented in table above
- [ ] If ALL PASS: Approve PR #106 merge
- [ ] If ANY FAIL: Create issue for each failed item

---

*Parent document: [TODAY.md](../TODAY.md)*
*Created: 3 January 2026*
