# MirrorBuddy Quality Assurance Checklist

> **Purpose**: Repeatable manual QA scenarios for validating critical user workflows, resilience, and accessibility features before release.

**Last Updated**: October 18, 2025
**Test Coverage**: Core workflows, offline resilience, voice commands, accessibility, performance under stress

---

## Test Environment Setup

### Required Test Devices
- ✅ iPhone 14/15 Pro (iOS 17.0+)
- ✅ iPad 13 (iOS 17.0+)
- ✅ iOS Simulator (various screen sizes)
- ✅ Physical devices with notches and different safe areas

### Required Test Accounts
- ✅ Google account with Drive/Gmail/Calendar access
- ✅ OpenAI API key configured
- ✅ Test materials: sample PDFs, images, handwritten notes

### Network Configurations to Test
- ✅ Stable WiFi connection
- ✅ Cellular data only (4G/5G)
- ✅ Intermittent connection (simulate with Network Link Conditioner)
- ✅ Completely offline (Airplane mode)

---

## 1. Online/Offline Resilience Tests

### 1.1 Network State Transitions
**Objective**: Verify app handles network changes gracefully without crashes

| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Offline Startup** | 1. Enable Airplane mode<br>2. Launch app<br>3. Attempt to use features | • App launches successfully<br>• Shows offline indicator<br>• Local features work (reading cached materials)<br>• Network features show helpful messages | ⬜ |
| **Mid-Session Network Loss** | 1. Start voice conversation<br>2. Enable Airplane mode during conversation<br>3. Attempt to continue | • Voice conversation ends gracefully<br>• User sees clear error message<br>• App doesn't crash<br>• Can retry when online | ⬜ |
| **Network Restoration** | 1. Use app offline<br>2. Re-enable network<br>3. Trigger sync (Aggiornami button) | • App detects network return<br>• Auto-syncs pending changes<br>• Shows sync progress<br>• Completes successfully | ⬜ |
| **Drive Sync Offline** | 1. Tap "Aggiornami"<br>2. No network available | • Shows clear offline message<br>• Doesn't crash<br>• Suggests trying again when online | ⬜ |

### 1.2 Circuit Breaker Behavior
**Objective**: Verify circuit breaker prevents cascading failures

| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **API Failures** | 1. Configure mock server to return 500 errors<br>2. Trigger API calls<br>3. Observe retry behavior | • Retries with exponential backoff<br>• Circuit opens after threshold<br>• Falls back to cache if available | ⬜ |
| **Rate Limit Handling** | 1. Trigger many API calls quickly<br>2. Simulate 429 rate limit response | • Respects rate limits<br>• Shows user-friendly message<br>• Queues requests appropriately | ⬜ |

---

## 2. Backgrounding and App Lifecycle

### 2.1 Background Transitions
**Objective**: Ensure app state is preserved correctly

| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Voice Recording Background** | 1. Start extended voice recording (6-hour mode)<br>2. Background app (home button)<br>3. Wait 5 minutes<br>4. Return to app | • Recording continues in background<br>• Time counter accurate<br>• Battery warning shown if low<br>• Can pause/stop after returning | ⬜ |
| **Material Processing Background** | 1. Import large PDF<br>2. Start processing<br>3. Background app immediately<br>4. Return after 30 seconds | • Processing continues<br>• Progress indicator updates<br>• Notification when complete<br>• Can view results | ⬜ |
| **Voice Conversation Background** | 1. Start OpenAI Realtime conversation<br>2. Background app<br>3. Return within 10 seconds | • Conversation ends gracefully<br>• Shows clear "session ended" message<br>• Can restart easily | ⬜ |

### 2.2 App Termination and Recovery
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Force Quit During Sync** | 1. Trigger "Aggiornami" sync<br>2. Force quit app mid-sync<br>3. Relaunch app | • No data corruption<br>• Sync state recovers<br>• Can retry sync successfully | ⬜ |
| **State Restoration** | 1. Navigate to material detail view<br>2. Interact with mind map<br>3. Force quit<br>4. Relaunch | • Returns to last viewed screen<br>• Material/mind map state preserved<br>• No crashes | ⬜ |

---

## 3. Low Storage and Resource Constraints

### 3.1 Storage Edge Cases
**Objective**: Handle low storage gracefully

| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Low Storage Warning** | 1. Fill device storage to <500MB<br>2. Attempt to download materials<br>3. Attempt voice recording | • Shows clear low storage warning<br>• Prevents download/recording<br>• Suggests cleaning up space<br>• Doesn't crash | ⬜ |
| **Cache Management** | 1. Use app extensively (cache builds up)<br>2. Check storage usage<br>3. Clear app cache if needed | • Cache doesn't grow unbounded<br>• Old cached items purged automatically<br>• Cache clearing works | ⬜ |

### 3.2 Memory Pressure
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Large Mind Map Rendering** | 1. Generate mind map with 100+ nodes<br>2. Zoom/pan aggressively<br>3. Monitor memory usage | • Renders smoothly without crashes<br>• Memory usage stays reasonable<br>• No memory warnings | ⬜ |
| **Multi-hour Audio Processing** | 1. Record 3+ hour voice session<br>2. Trigger Whisper transcription<br>3. Process all segments | • Processes in chunks<br>• Doesn't cause memory crash<br>• Progress shown accurately<br>• Completes successfully | ⬜ |

---

## 4. Voice Command and Conversation Tests

### 4.1 Voice Command Regression Tests
**Objective**: Ensure voice commands work reliably

| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Basic Commands** | 1. Say "Aggiornami"<br>2. Say "Mostra materiali"<br>3. Say "Nuova conversazione" | • Each command recognized<br>• Correct action triggered<br>• Visual feedback shown<br>• Accessibility announced | ⬜ |
| **Noisy Environment** | 1. Play background noise<br>2. Issue voice commands<br>3. Vary noise levels | • Commands still recognized<br>• Handles ambiguity gracefully<br>• Shows confidence indicator | ⬜ |
| **Interruptions** | 1. Start speaking command<br>2. Stop mid-word<br>3. Start new command | • Cancels previous incomplete command<br>• Responds to new command<br>• No stuck state | ⬜ |

### 4.2 OpenAI Realtime Conversation
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Long Conversation** | 1. Start voice conversation<br>2. Exchange 10+ turns<br>3. Vary topics (homework, study tips) | • Context maintained across turns<br>• Response latency <3s<br>• Empathetic tone preserved<br>• No audio glitches | ⬜ |
| **Connection Drop During Conversation** | 1. Start conversation<br>2. Disable network mid-turn<br>3. Wait for timeout<br>4. Re-enable network | • Shows "connection lost" message<br>• Offers to restart<br>• Previous context saved<br>• Can resume | ⬜ |
| **Multilingual Switching** | 1. Start conversation in Italian<br>2. Ask question in English<br>3. Return to Italian | • Handles language switch<br>• Responds in appropriate language<br>• Context not lost | ⬜ |

---

## 5. Google Workspace Integration Tests

### 5.1 OAuth and Authentication
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Initial OAuth Flow** | 1. Tap "Connect Drive" in Settings<br>2. Complete Google OAuth<br>3. Grant permissions | • OAuth flow completes<br>• Tokens stored securely<br>• Drive accessible immediately | ⬜ |
| **Token Refresh** | 1. Wait for token to expire (force if possible)<br>2. Trigger Drive sync | • Token refreshes automatically<br>• No user intervention needed<br>• Sync proceeds normally | ⬜ |
| **Logout and Re-auth** | 1. Sign out from Google<br>2. Try to access Drive features<br>3. Re-authenticate | • Prompts for re-authentication<br>• Previous data preserved<br>• New auth succeeds | ⬜ |

### 5.2 Drive Sync ("Aggiornami" Button)
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Full Sync** | 1. Tap "Aggiornami"<br>2. Wait for completion<br>3. Verify materials imported | • Shows progress for Drive/Gmail/Calendar<br>• All new materials appear<br>• Tasks extracted from Gmail<br>• Calendar events visible | ⬜ |
| **Incremental Sync** | 1. Run full sync<br>2. Add new file to Drive<br>3. Tap "Aggiornami" again | • Only syncs new/changed files<br>• Faster than full sync<br>• No duplicates created | ⬜ |
| **Large File Handling** | 1. Add 50MB+ PDF to Drive<br>2. Trigger sync | • Downloads in background<br>• Shows progress<br>• Doesn't block UI<br>• Completes or shows clear error | ⬜ |

---

## 6. Material Processing Pipeline

### 6.1 Document Import and OCR
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **PDF Import** | 1. Import multi-page PDF<br>2. Wait for processing | • Extracts text correctly<br>• Generates summary<br>• Creates mind map<br>• Status shows "completed" | ⬜ |
| **Image/Photo OCR** | 1. Take photo of handwritten notes<br>2. Trigger OCR processing | • OCR extracts text<br>• Renders dyslexia-friendly version<br>• Creates flashcards if possible | ⬜ |
| **Corrupted File** | 1. Import invalid/corrupted PDF<br>2. Observe behavior | • Shows "processing failed" status<br>• Clear error message<br>• Doesn't crash app<br>• Allows retry or removal | ⬜ |

### 6.2 AI Processing (Flashcards, Mind Maps, Summaries)
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Flashcard Generation** | 1. Import study material<br>2. Wait for flashcard generation<br>3. Review flashcards | • Generates relevant Q&A pairs<br>• Italian language correct<br>• Can edit/delete cards | ⬜ |
| **Mind Map Generation** | 1. Import complex material<br>2. Wait for mind map<br>3. Interact with map | • Hierarchical structure clear<br>• Nodes labeled correctly<br>• Zoomable and pannable<br>• Touch targets ≥44pt | ⬜ |
| **Summary Quality** | 1. Import long document<br>2. Review generated summary | • Summary concise and accurate<br>• Dyslexia-friendly rendering<br>• Can read aloud (TTS) | ⬜ |

---

## 7. Accessibility and Neurodiverse Design

### 7.1 VoiceOver and Screen Readers
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Full VoiceOver Navigation** | 1. Enable VoiceOver<br>2. Navigate entire app<br>3. Perform key actions | • All elements have labels<br>• Buttons describe actions<br>• Context is clear<br>• No navigation traps | ⬜ |
| **Material Card Accessibility** | 1. Enable VoiceOver<br>2. Navigate material cards<br>3. Open material detail | • Card labels include title, subject, date, status<br>• Hints describe actions<br>• Touch targets large enough | ⬜ |
| **Voice Conversation Accessibility** | 1. Enable VoiceOver<br>2. Start voice conversation<br>3. Monitor announcements | • Announces conversation status<br>• Announces responses<br>• Clear start/stop actions | ⬜ |

### 7.2 Dynamic Type and Visual Accessibility
| Test Case | Steps | expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Extra Large Text** | 1. Set Dynamic Type to xxxLarge<br>2. Navigate app<br>3. Check all screens | • Text scales appropriately<br>• No truncation or overlap<br>• Layout adjusts correctly | ⬜ |
| **OpenDyslexic Font** | 1. Enable OpenDyslexic in settings<br>2. View various content types | • Font applied consistently<br>• Readable at all sizes<br>• No rendering glitches | ⬜ |
| **Dark Mode** | 1. Toggle system dark mode<br>2. Check all screens | • Colors adapt correctly<br>• Contrast sufficient<br>• No white flashes<br>• Icons appropriate for theme | ⬜ |

### 7.3 Touch Target and Motor Accessibility
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Touch Target Sizes** | 1. Navigate with pointer control<br>2. Attempt to tap small elements<br>3. Verify sizes ≥44×44pt | • All interactive elements ≥44pt<br>• Adequate spacing between targets<br>• Easy to tap without precision | ⬜ |
| **One-Handed Optimization** | 1. Enable one-handed mode if available<br>2. Navigate with thumb only | • Bottom navigation accessible<br>• Important actions within reach<br>• Can complete core tasks | ⬜ |

---

## 8. Performance Under Stress

### 8.1 Heavy Load Scenarios
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **100+ Materials** | 1. Import/generate 100+ materials<br>2. Navigate dashboard<br>3. Search materials | • Scrolling smooth (60fps)<br>• Search results fast (<1s)<br>• No lag opening materials | ⬜ |
| **Rapid Screen Transitions** | 1. Navigate between screens rapidly<br>2. Switch tabs frequently<br>3. Open/close modals quickly | • No crashes<br>• Transitions smooth<br>• Memory stable | ⬜ |
| **Simultaneous Operations** | 1. Start voice recording<br>2. Trigger Drive sync<br>3. Open material for processing | • Operations don't block each other<br>• Progress shown for each<br>• Can cancel individual operations | ⬜ |

### 8.2 Extended Usage Sessions
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **2+ Hour Session** | 1. Use app continuously for 2+ hours<br>2. Perform varied tasks<br>3. Monitor battery/memory | • No memory leaks<br>• Performance stays consistent<br>• Battery drain reasonable<br>• No overheating | ⬜ |
| **6-Hour Voice Recording** | 1. Start extended recording mode<br>2. Let run for full 6 hours<br>3. Process audio | • Recording completes<br>• File segmentation works<br>• Transcription succeeds<br>• Timeline accurate | ⬜ |

---

## 9. Data Integrity and Persistence

### 9.1 SwiftData/CloudKit Sync
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Cross-Device Sync** | 1. Create material on iPhone<br>2. Open app on iPad<br>3. Verify material appears | • Data syncs via CloudKit<br>• Appears on both devices<br>• No conflicts or duplicates | ⬜ |
| **Offline Edits** | 1. Go offline<br>2. Edit materials<br>3. Go online<br>4. Verify sync | • Edits saved locally<br>• Syncs when online<br>• Merge conflicts handled | ⬜ |

### 9.2 Data Corruption Prevention
| Test Case | Steps | Expected Behavior | Pass/Fail |
|-----------|-------|-------------------|-----------|
| **Crash During Write** | 1. Modify data<br>2. Force crash mid-operation<br>3. Relaunch | • No data corruption<br>• Recovers gracefully<br>• Lost changes minimal | ⬜ |
| **Invalid Data Handling** | 1. Inject invalid data via debug<br>2. Open app<br>3. Attempt to access | • Invalid data skipped/cleaned<br>• App doesn't crash<br>• User notified if needed | ⬜ |

---

## 10. Regression Tests (Critical Bug Prevention)

| Test Case | Regression Reference | Steps | Expected Behavior | Pass/Fail |
|-----------|---------------------|-------|-------------------|-----------|
| **iOS 18 API Availability** | MaterialCardView.swift | 1. Run on iOS 17 device<br>2. View materials with various states | • No crashes from unavailable APIs<br>• Fallback UI works | ⬜ |
| **Fallback Error Handling** | Fallback.swift:28,40 | 1. Trigger primary API failure<br>2. Verify fallback behavior | • Fallback executes correctly<br>• Errors typed properly<br>• No scope issues | ⬜ |
| **Preview Rendering** | MaterialCardView, ExtendedVoiceRecordingView | 1. Open Xcode<br>2. View previews for affected files | • All previews render<br>• No type ambiguity errors | ⬜ |
| **SwiftLint Baseline** | All files | 1. Run `swiftlint lint`<br>2. Check violation count | • ≤400 violations (baseline)<br>• No new force_unwrapping<br>• Pre-commit hook passes | ⬜ |

---

## Release Criteria

Before releasing a new version, the following must pass:

### Critical (Must Pass)
- ✅ All "Critical Bug Prevention" regression tests pass
- ✅ No crashes during 30-minute exploratory session
- ✅ Voice commands work reliably (90%+ success rate)
- ✅ Offline/online transitions graceful (no data loss)
- ✅ VoiceOver navigation complete without traps

### High Priority (Should Pass)
- ✅ Material processing succeeds for common file types
- ✅ Drive sync completes without errors for typical accounts
- ✅ Performance acceptable on target devices (iPhone 14+)
- ✅ Memory usage stable over 1-hour session

### Medium Priority (Nice to Have)
- ✅ All accessibility tests pass
- ✅ Dark mode rendering correct
- ✅ Extended voice recording works for multi-hour sessions

---

## Test Execution Log

| Date | Tester | Device | Build | Pass Rate | Critical Issues | Notes |
|------|--------|--------|-------|-----------|-----------------|-------|
| YYYY-MM-DD | Name | iPhone 14 | vX.Y.Z | 95% | None | Example row |

---

## Reporting Issues

When a test fails, document:
1. **Test Case ID** (e.g., "1.1 - Offline Startup")
2. **Device and iOS Version**
3. **Build Number**
4. **Steps to Reproduce**
5. **Expected vs Actual Behavior**
6. **Screenshots/Logs** if applicable
7. **Severity**: Critical / High / Medium / Low

File issues in GitHub with label `qa-failure` and link to this checklist.

---

**Maintained by**: MirrorBuddy Development Team
**Review Frequency**: Before each release + after major feature additions
**Version**: 1.0
