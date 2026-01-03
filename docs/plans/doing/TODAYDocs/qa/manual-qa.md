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
- [ ] Mindmap appears in tool panel
- [ ] No SVGLength error in console
- [ ] Tool is interactive (expandable nodes)

---

## [ ] QA-2: Mindmap Hierarchy (BUG 7)

**Procedure**:
1. Open chat with any Maestro
2. Request: "Create a mind map with 3 levels: Animals -> Mammals/Reptiles -> specific examples"

**Verify**:
- [ ] Root node "Animals" at center
- [ ] Second level: "Mammals", "Reptiles" as children
- [ ] Third level: specific animals under each category
- [ ] Lines connecting parent to children

---

## [ ] QA-3: Fullscreen on Tool Creation (BUG 8)

**Procedure**:
1. Open chat in standard layout
2. Request: "Generate a 5-question quiz on Roman history"
3. Wait for tool creation

**Verify**:
- [ ] Layout automatically changes to focus mode
- [ ] Tool occupies main viewport
- [ ] "Exit fullscreen" button visible

---

## [ ] QA-4: Conversation Persistence (BUG 11)

**Procedure**:
1. Chat with Maestro A (e.g., Leonardo) - send 3-4 messages
2. Switch to Maestro B (e.g., Galileo) - send 2 messages
3. Return to Maestro A

**Verify**:
- [ ] Maestro A conversation shows all previous messages
- [ ] No mixing between conversations

---

## [ ] QA-5: Material Save (BUG 13)

**Procedure**:
1. Generate a tool (summary, map, flashcard)
2. Click "Save"
3. Go to Knowledge Hub / Archive

**Verify**:
- [ ] Save confirmation toast
- [ ] Content appears in Archive
- [ ] Content retrievable and viewable

---

## [ ] QA-6: ESC Key Exits Fullscreen (BUG 15)

**Procedure**:
1. Create a tool to enter focus mode
2. Verify focus mode active
3. Press ESC

**Verify**:
- [ ] ESC exits focus mode
- [ ] Layout returns to standard
- [ ] Tool content preserved

---

## [ ] QA-7: PDF Parsing (BUG 19)

**Procedure**:
1. Go to Study Kit
2. Upload a PDF (with text, not scan)
3. Wait for processing

**Verify**:
- [ ] Upload succeeds
- [ ] Text extracted correctly
- [ ] Page count correct
- [ ] No parsing errors

---

## [ ] QA-8: Parent Dashboard Empty State (BUG 21)

**Procedure**:
1. Go to Parent Dashboard
2. With user without activity data

**Verify**:
- [ ] Empty state UI displayed
- [ ] Friendly message (not blank/broken page)
- [ ] Call-to-action to get started

---

## [ ] QA-9: Summary Tool UI (BUG 26)

**Procedure**:
1. Request summary: "Summarize the French Revolution"
2. Wait for generation
3. Test all buttons

**Verify**:
- [ ] Summary formatted correctly
- [ ] "Edit" opens editable view
- [ ] "Export PDF" downloads file
- [ ] "Convert to map" creates mindmap
- [ ] "Generate flashcards" creates flashcard set

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
- [ ] All X buttons close
- [ ] ESC works consistently everywhere
- [ ] No orphan modals/overlays

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
