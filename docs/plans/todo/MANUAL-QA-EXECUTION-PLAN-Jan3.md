# Manual QA Backlog - EXECUTION-PLAN-Jan3

**Source**: `docs/plans/done/EXECUTION-PLAN-Jan3.md`
**Created**: 3 Gennaio 2026
**Status**: PENDING QA

---

## Overview

This document contains all manual QA items extracted from EXECUTION-PLAN-Jan3.
These items require manual testing with the application running in a full environment.

| Total Items | Priority | Estimated Effort |
|-------------|----------|------------------|
| 10 | Mixed (P0-P1) | ~2 hours |

---

## QA Environment Requirements

Before executing tests, ensure:
- [ ] Application running locally (`npm run dev`)
- [ ] Azure OpenAI credentials configured in `.env`
- [ ] Database connected and seeded
- [ ] Test user account available
- [ ] Browser dev tools ready for logs

---

## QA Checklist

### QA-1: Tool Creation Visibility (BUG 5)

**BUG ID**: BUG 5
**Priority**: P0 (Critical)
**Related Fix**: f13163b (SVGLength Error Fix)

**What to Test**: Tools created by AI appear in the UI

**Preconditions**:
- Application running
- User logged in
- Chat with any Maestro active

**Steps**:
1. Open chat with any Maestro
2. Request: "Crea una mappa mentale sul Sistema Solare"
3. Wait for AI response
4. Observe the tool panel

**Expected Result**:
- Mindmap tool appears in the right panel
- No SVGLength errors in console
- Tool is interactive (expandable nodes)

**Evidence to Collect**:
- [ ] Screenshot of tool appearing
- [ ] Browser console log (no SVG errors)

---

### QA-2: Mindmap Hierarchy (BUG 7)

**BUG ID**: BUG 7
**Priority**: P0 (Critical)
**Related Fix**: SVGLength fix + mindmap-utils.ts

**What to Test**: Mindmap nodes display proper parent-child hierarchy

**Preconditions**:
- Application running
- User logged in

**Steps**:
1. Open chat with any Maestro
2. Request: "Crea una mappa mentale con 3 livelli: Animali → Mammiferi/Rettili → esempi specifici"
3. Wait for mindmap generation
4. Inspect the rendered mindmap

**Expected Result**:
- Root node "Animali" at center/top
- Second level: "Mammiferi", "Rettili" as children
- Third level: specific animals under each category
- Lines connecting parent to children

**Evidence to Collect**:
- [ ] Screenshot of hierarchical mindmap
- [ ] Verify node count matches request

---

### QA-3: Fullscreen on Tool Creation (BUG 8)

**BUG ID**: BUG 8
**Priority**: P0 (Critical)
**Related Code**: conversation-flow.tsx:199-203

**What to Test**: Layout automatically switches to fullscreen when tool is created

**Preconditions**:
- Application running
- User logged in
- NOT in fullscreen mode

**Steps**:
1. Open chat with any Maestro (standard layout)
2. Request: "Genera un quiz di 5 domande sulla storia romana"
3. Wait for tool creation
4. Observe layout change

**Expected Result**:
- Layout switches to focus mode automatically
- Tool occupies main viewport
- Chat moves to sidebar or minimizes
- "Exit fullscreen" button visible

**Evidence to Collect**:
- [ ] Before screenshot (standard layout)
- [ ] After screenshot (focus mode)

---

### QA-4: Conversation Persistence (BUG 11)

**BUG ID**: BUG 11
**Priority**: P0 (Critical)
**Related Code**: conversation-flow-store.ts

**What to Test**: Conversation history persists when switching between characters

**Preconditions**:
- Application running
- User logged in
- Multiple Maestros available

**Steps**:
1. Open chat with Maestro A (e.g., Leonardo)
2. Send 3-4 messages creating a conversation
3. Switch to Maestro B (e.g., Galileo)
4. Send 2 messages with Maestro B
5. Switch back to Maestro A
6. Observe conversation history

**Expected Result**:
- Maestro A conversation shows all 3-4 previous messages
- No data loss
- No mixing of conversations between characters

**Evidence to Collect**:
- [ ] Screenshot of Maestro A conversation before switch
- [ ] Screenshot of Maestro A conversation after returning
- [ ] Console logs showing store state

---

### QA-5: Material Save to Knowledge Hub (BUG 13)

**BUG ID**: BUG 13
**Priority**: P0 (Critical)
**Related Code**: tool-executor.ts, tool-result-display.tsx

**What to Test**: Generated materials save correctly to Knowledge Hub

**Preconditions**:
- Application running
- User logged in
- Knowledge Hub accessible

**Steps**:
1. Generate any tool content (summary, mindmap, flashcards)
2. Click "Salva" button on the tool
3. Wait for save confirmation
4. Navigate to Knowledge Hub / Archivio
5. Search for saved content

**Expected Result**:
- Save confirmation toast appears
- Content appears in Knowledge Hub
- Content is retrievable and viewable

**Evidence to Collect**:
- [ ] Screenshot of save button click
- [ ] Screenshot of confirmation toast
- [ ] Screenshot of content in Knowledge Hub
- [ ] Network tab showing successful API call

**If Fails - Debug Steps**:
1. Check browser console for errors
2. Check Network tab for API response
3. Log AI-generated parameters
4. Verify JSON parsing in tool-executor.ts

---

### QA-6: ESC Key Exits Fullscreen (BUG 15)

**BUG ID**: BUG 15
**Priority**: P1 (High)
**Related Code**: focus-tool-layout.tsx:301-310

**What to Test**: Pressing ESC key exits fullscreen/focus mode

**Preconditions**:
- Application running
- User logged in
- Currently in focus mode (tool active)

**Steps**:
1. Create any tool to enter focus mode
2. Verify focus mode is active
3. Press ESC key
4. Observe layout change

**Expected Result**:
- ESC key triggers exit from focus mode
- Layout returns to standard view
- Tool content preserved (not lost)
- No errors in console

**Evidence to Collect**:
- [ ] Screenshot in focus mode
- [ ] Screenshot after ESC press
- [ ] Console log showing exitFocusMode called

---

### QA-7: PDF Parsing (BUG 19)

**BUG ID**: BUG 19
**Priority**: P0 (Critical)
**Related Code**: study-kit-handler.ts

**What to Test**: PDF files are correctly parsed and text extracted

**Preconditions**:
- Application running
- User logged in
- Sample PDF file ready (with text, not scanned image)

**Steps**:
1. Navigate to Study Kit
2. Upload a PDF file
3. Wait for processing
4. Review extracted content

**Expected Result**:
- PDF upload succeeds
- Text is extracted from PDF
- Page count is correct
- No parsing errors

**Evidence to Collect**:
- [ ] Screenshot of upload interface
- [ ] Screenshot of extracted text
- [ ] Console/network logs showing pdf-parse output

**Test Files**:
- Use a simple text PDF (not scanned)
- Test with multi-page PDF
- Test with PDF containing headers/footers

---

### QA-8: Parent Dashboard Empty State (BUG 21)

**BUG ID**: BUG 21
**Priority**: P1 (High)
**Related Code**: parent-dashboard.tsx

**What to Test**: Empty state displays correctly when no data exists

**Preconditions**:
- Application running
- User logged in with no activity data
- OR new test user account

**Steps**:
1. Navigate to Parent Dashboard
2. Ensure no learning data exists for user
3. Observe dashboard display

**Expected Result**:
- Empty state UI displays
- Friendly message shown (not blank/broken)
- No TypeScript/rendering errors
- Call-to-action to start learning

**Evidence to Collect**:
- [ ] Screenshot of empty state UI
- [ ] Console log (no errors)

---

### QA-9: Summary Tool UI (BUG 26)

**BUG ID**: BUG 26
**Priority**: P0 (Critical)
**Related Code**: SummaryTool, SummaryRenderer

**What to Test**: Summary tool UI functions correctly

**Preconditions**:
- Application running
- User logged in

**Steps**:
1. Request summary from any Maestro: "Riassumi la rivoluzione francese"
2. Wait for summary generation
3. Test "Modifica" (edit) button
4. Test "Esporta PDF" button
5. Test "Converti in mappa" button
6. Test "Genera flashcard" button

**Expected Result**:
- Summary displays correctly formatted
- Edit opens editable view
- Export PDF downloads file
- Convert to map creates mindmap
- Generate flashcard creates flashcard set

**Evidence to Collect**:
- [ ] Screenshot of summary display
- [ ] Screenshot of each button action result
- [ ] Downloaded PDF file

---

### QA-10: Navigation Consistency (BUG 27)

**BUG ID**: BUG 27
**Priority**: P1 (High)
**Related Code**: FullscreenToolLayout, MaestroOverlay

**What to Test**: X buttons and ESC keys behave consistently

**Preconditions**:
- Application running
- User logged in

**Steps**:
1. Open Maestro overlay → click X → verify closes
2. Open Maestro overlay → press ESC → verify closes
3. Enter focus mode → click exit button → verify exits
4. Enter focus mode → press ESC → verify exits
5. Open modal/dialog → click X → verify closes
6. Open modal/dialog → press ESC → verify closes

**Expected Result**:
- All X buttons close their respective UI elements
- ESC key works consistently across all closeable elements
- No orphaned modals/overlays
- Consistent behavior pattern

**Evidence to Collect**:
- [ ] Video recording of navigation test
- [ ] Or series of screenshots showing each close action

---

## QA Execution Log

| Item | Tester | Date | Result | Notes |
|------|--------|------|--------|-------|
| QA-1 | | | | |
| QA-2 | | | | |
| QA-3 | | | | |
| QA-4 | | | | |
| QA-5 | | | | |
| QA-6 | | | | |
| QA-7 | | | | |
| QA-8 | | | | |
| QA-9 | | | | |
| QA-10 | | | | |

---

## Sign-Off

- [ ] All QA items executed
- [ ] All evidence collected
- [ ] Failures documented and triaged
- [ ] QA complete

**QA Completed By**: _______________
**Date**: _______________
**Result**: PASS / FAIL / PARTIAL

---

*This file is the official QA backlog for EXECUTION-PLAN-Jan3.*
*Do not close items without evidence.*
