# MirrorBuddy Future Enhancements

> **Purpose**: Track deferred TODO/FIXME items as potential future enhancements
> **Source**: Task 120.3 - TODO/FIXME debt audit (October 18, 2025)
> **Status**: Deferred to future milestones

---

## Critical TODOs - COMPLETED ✅

These were addressed in Task 120:

1. **GoogleDriveDownloadService** - Token refresh implementation
   - ✅ Implemented automatic token refresh on 401 errors
   - ✅ Retry logic after successful refresh
   - Commit: TBD

2. **AppVoiceCommandHandler** - TTS integration
   - ✅ Search field focus via NotificationCenter
   - ✅ Screen reading via TTS service
   - ✅ Text-to-speech integration for accessibility
   - Commit: TBD

---

## Medium Priority Enhancements

### UI Placeholders and Interactive Features

#### TasksView - SwiftData Integration
**Files**: `MirrorBuddy/Features/Tasks/Views/TasksView.swift:10, 11`

**Current**: Placeholder UI with static data

**Enhancement**:
- Implement "Add Task" button functionality
- Connect to SwiftData persistence layer
- Sync with Google Calendar tasks
- Enable task editing and completion tracking

**Estimated Effort**: 3-5 hours
**Dependencies**: None
**Priority**: Medium

---

#### CameraView - Photo Library Integration
**File**: `MirrorBuddy/Features/Camera/CameraView.swift:13`

**Current**: Camera capture only

**Enhancement**:
- Add photo picker/recent photos access
- Allow importing existing images for OCR
- Photo library browser UI
- Multiple photo selection

**Estimated Effort**: 2-3 hours
**Dependencies**: Photo library permissions
**Priority**: Medium

---

#### SubjectDashboardView - Material Actions
**File**: `MirrorBuddy/Features/Dashboard/SubjectDashboardView.swift:14, 15`

**Current**: View-only material cards

**Enhancement**:
- "Add Material" button implementation
- Material creation workflow (PDF upload, photo capture, text input)
- Subject assignment during creation
- Quick-add shortcuts

**Estimated Effort**: 4-6 hours
**Dependencies**: Material processing pipeline
**Priority**: Medium

---

## Low Priority Enhancements

### Architecture Improvements

#### MaterialProcessingPipeline - Sendable Refactoring
**File**: `MirrorBuddy/Core/Services/MaterialProcessingPipeline.swift:1`

**Current**: FlashcardGenerationService returns non-Sendable SwiftData models

**Enhancement**:
- Refactor to return Sendable types (IDs instead of model instances)
- Improve Swift 6 concurrency safety
- Reduce data races in async contexts
- Better actor isolation

**Estimated Effort**: 6-8 hours
**Dependencies**: Requires careful refactoring across service boundaries
**Priority**: Low (works currently, improvement for Swift 6 strict mode)

**Rationale**: Current implementation works but could benefit from stricter Sendable conformance for better concurrency safety.

---

### Analytics and Feedback

#### FeedbackService - Backend Integration
**Files**: `MirrorBuddy/Core/Services/FeedbackService.swift:3, 4, 5`

**Current**: In-memory feedback storage only

**Enhancement Options**:
1. **Backend API Integration**
   - RESTful API for feedback submission
   - Server-side feedback aggregation
   - Admin dashboard for review

2. **Analytics Integration**
   - Firebase Analytics
   - Mixpanel events
   - User behavior tracking
   - A/B testing infrastructure

3. **Persistent Storage**
   - Core Data or file system
   - Local feedback queue
   - Retry failed submissions

**Estimated Effort**: 8-12 hours (depending on option)
**Dependencies**: Backend infrastructure, privacy policy updates
**Priority**: Low

**Considerations**:
- GDPR compliance required
- User consent mechanisms
- Data retention policies
- Anonymous vs identified feedback

---

## Future Feature Development

### FlashcardStudyView - Spaced Repetition System
**File**: `MirrorBuddy/Features/Flashcards/FlashcardStudyView.swift:12`

**Current**: Basic flashcard display and flipping

**Enhancement**: Full spaced repetition system (SRS)
- **Algorithm**: Implement SM-2 or Leitner system
- **Scheduling**: Optimal review intervals based on performance
- **Progress Tracking**: Success rates, retention curves
- **Animations**: Smooth card flips, swipe gestures
- **Statistics**: Study session analytics, mastery levels

**Estimated Effort**: 12-16 hours
**Dependencies**: User progress data model, analytics
**Priority**: Medium-High (valuable for neurodiverse learners)

**Reference Implementations**:
- Anki's SM-2 algorithm
- SuperMemo research
- Duolingo's SRS approach

---

### VoiceSettingsView - Debug and Testing Features
**Files**: `MirrorBuddy/Features/Voice/Views/VoiceSettingsView.swift:16, 17, 18`

**Current**: Basic voice configuration UI

**Enhancement**: Advanced debugging and testing tools
1. **Voice Sample Playback**
   - Test current TTS settings
   - Preview voice/rate/pitch combinations
   - A/B comparison of voices

2. **Audio Debug Logs**
   - Real-time audio pipeline monitoring
   - Microphone input levels
   - Audio quality metrics
   - Latency measurements

3. **API Connection Testing**
   - OpenAI Realtime API health check
   - Network diagnostics
   - WebSocket connection status
   - Error simulation for testing

**Estimated Effort**: 6-8 hours
**Dependencies**: Development/debug build configuration
**Priority**: Low (developer tools, not end-user features)

**Note**: These should be gated behind a "Developer Mode" toggle and excluded from production builds.

---

## Implementation Roadmap

### Phase 1: User-Facing Features (Q1 2026)
1. TasksView SwiftData integration
2. CameraView photo library
3. SubjectDashboardView material actions

### Phase 2: Learning Enhancements (Q2 2026)
1. Flashcard spaced repetition system
2. Study session analytics
3. Progress tracking improvements

### Phase 3: Backend & Analytics (Q3 2026)
1. Feedback service backend integration
2. Analytics platform setup
3. User behavior insights

### Phase 4: Architecture Improvements (Q4 2026)
1. Sendable refactoring for Swift 6
2. Performance optimization
3. Technical debt reduction

### Phase 5: Developer Tools (As needed)
1. Voice settings debug features
2. Testing utilities
3. Diagnostic tools

---

## Tracking and Management

### Adding New Enhancements

When new TODO/FIXME items are created:

1. Document in code with clear context:
   ```swift
   // TODO: [Feature Name] - [Description]
   // Priority: [Low/Medium/High]
   // Estimated: [X hours]
   // Dependencies: [List any blockers]
   ```

2. Add to this document in appropriate section
3. Update quarterly roadmap if high priority
4. Track in GitHub Issues with labels:
   - `enhancement`
   - `future-work`
   - `priority-low|medium|high`

### Review Cadence

- **Quarterly**: Review deferred items, promote to active backlog if priorities change
- **Before Major Releases**: Evaluate if any enhancements should be included
- **After User Feedback**: Adjust priorities based on actual user needs

---

## Closed/Won't-Do Items

_(None currently)_

---

**Last Updated**: October 18, 2025
**Maintained By**: MirrorBuddy Development Team
**Review Frequency**: Quarterly or before major releases
