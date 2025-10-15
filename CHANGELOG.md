# Changelog

All notable changes to MirrorBuddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Subtask 91.4: Extended Voice Recording UI** (2025-10-15)
  - Created ExtendedVoiceRecordingView for classroom lesson recording
  - Start/Stop recording button with visual feedback
  - Pause/Resume controls during active recording
  - Elapsed time display with monospaced digits
  - Recording status indicator with pulse animation
  - Battery level indicator with color-coded warnings
  - Full VoiceOver accessibility support for all controls
  - Italian localization for all UI strings
  - Light and dark mode support
  - Preview states: Idle, Recording, Paused, Low Battery
  - Files: Features/Voice/Views/ExtendedVoiceRecordingView.swift

- **Subtask 91.5: Extended Recording Session Management** (2025-10-15)
  - Implemented file merging system using AVComposition for auto-saved segments
  - Automatic segment merging on recording stop (exports to single .m4a file)
  - Backup segment tracking and cleanup after successful merge
  - Memory warning monitoring with automatic save trigger
  - Recording statistics tracking (duration, file size, segment count, quality)
  - Completion notifications in Italian with formatted duration
  - Abandoned session cleanup (removes backups older than 7 days on init)
  - RecordingStats struct with formatted helpers (fileSizeMB, formattedDuration, formattedFileSize)
  - Error recovery for interrupted recordings
  - Files: Core/Services/ExtendedVoiceRecordingService.swift (extended)

- **Subtask 98.1: Redesigned Navigation Structure for Children** (2025-10-15)
  - Simplified main tab bar from 5 tabs to 4 tabs (removed Settings tab)
  - Updated "Voice" tab label to Italian "Voce" for consistency
  - Increased icon size to 28pt (from default) for better child visibility
  - Enhanced label fonts to headline weight for improved readability
  - Configured UITabBarAppearance with larger touch targets for child-friendly interaction
  - Applied custom tab bar item appearance with color-coded selection states
  - Set consistent font sizing (12pt medium/semibold) for tab labels
  - Files: Features/Dashboard/Views/MainTabView.swift:15-95

- **Subtask 98.2: Optimized Touch Targets and Feedback Systems** (2025-10-15)
  - Created comprehensive TouchTargetStyle system with reusable button styles
  - Implemented ChildFriendlyButtonStyle with 48px minimum (recommended for children)
  - Added IconButtonStyle for consistent icon button sizing (48px minimum)
  - Created PrimaryActionButtonStyle for prominent CTAs (56px minimum height)
  - Implemented CardButtonStyle for large tappable card components
  - Added ForgivingTouchAreaModifier for small visual elements needing larger tap areas
  - Created TouchTargetModifier to ensure minimum size compliance
  - Implemented HapticFeedback utility for standardized haptic responses (light, medium, heavy, success, error, warning, selection)
  - Applied touch target standards to QuickActionCard components
  - Updated all toolbar icon buttons with proper touch targets (48px minimum)
  - Added comprehensive accessibility labels and hints to all interactive elements
  - Integrated sensory feedback (.sensoryFeedback) for all button presses
  - Included scale animations (0.92-0.97) with spring physics for visual feedback
  - Created comprehensive developer guide (docs/TOUCH_TARGET_GUIDE.md) with:
    - Touch target size standards (44px minimum, 48px recommended, 56px large, 64px extra large)
    - Button style usage examples and best practices
    - Haptic feedback guidelines with use case matrix
    - Visual feedback animation standards
    - Forgiving touch area implementation patterns
    - Accessibility compliance checklist (WCAG 2.1 Level AA/AAA)
    - Testing procedures (manual, automated, child testing)
    - Quick reference guide for common patterns
  - Files:
    - Core/UI/TouchTargetStyle.swift (NEW, 421 lines)
    - docs/TOUCH_TARGET_GUIDE.md (NEW, comprehensive guide)
    - Features/Dashboard/Views/MainTabView.swift (updated buttons)

- **Subtask 98.3: Child-Friendly Color System and Accessibility** (2025-10-15)
  - Created comprehensive ColorSystem.swift with semantic color palette
  - Implemented child-friendly primary colors (blue #007AFF, purple #AF52DE, green #34C759, orange #FF9500, red #FF3B30)
  - Added vibrant subject colors for material categorization (Math, Science, Language, History, Art, Music, PE, General)
  - Included neutral colors for text and backgrounds with high contrast ratios
  - Created gradient color pairs for visual interest
  - Implemented color blind safe palette (blue-orange pairs for universal distinction)
  - Added contrast ratio calculation utilities (WCAG 2.1 formula)
  - Implemented WCAG compliance checking (AA/AAA levels for normal/large text)
  - Created accessibleTextColor utility for automatic black/white text selection
  - All primary colors meet WCAG AA contrast requirements (4.5:1 minimum on white)
  - Text colors provide 10:1-15:1 contrast ratios for exceptional readability
  - Semantic UI state colors (selected, hover, pressed, disabled states)
  - Created COLOR_SYSTEM_GUIDE.md with usage guidelines and testing procedures
  - Files:
    - Core/UI/ColorSystem.swift (NEW, comprehensive color system with accessibility)
    - Docs/COLOR_SYSTEM_GUIDE.md (NEW, developer guide)

- **Subtask 98.4: Personalization Features and Empathetic Content Guidelines** (2025-10-15)
  - Created comprehensive CONTENT_STYLE_GUIDE.md for child-friendly voice and tone
  - Implemented EncouragementService for age-appropriate feedback messages
  - Established core principles: encouraging, growth-focused, simple language, celebrating effort
  - Defined voice (warm, patient, empowering) and adaptive tone for different contexts
  - Created age-appropriate vocabulary guidelines (6-10 years)
  - Documented sentence structure best practices (short, one idea, active voice)
  - Established success message categories (immediate, milestones, completion)
  - Implemented encouragement messages for struggling, breaks, and welcome back
  - Created child-friendly error messages (input, system, network errors)
  - Added contextual messages (time-based greetings, progress tracking, achievements)
  - Implemented streak tracking with escalating enthusiasm
  - Subject-specific encouragement messages for all school subjects
  - Empty state messaging with actionable advice
  - EncouragementBanner SwiftUI component for displaying messages
  - UI copy standards (button labels, empty states, loading states)
  - VoiceOver accessibility guidelines for content
  - Content templates (welcome, daily greeting, achievement, struggle support)
  - Writing checklist for content quality assurance
  - Files:
    - Docs/CONTENT_STYLE_GUIDE.md (NEW, comprehensive empathetic content guidelines)
    - Core/Services/EncouragementService.swift (NEW, encouragement message system)

- **Subtask 98.5: User Testing Framework and Feedback Collection** (2025-10-15)
  - Created comprehensive USER_TESTING_GUIDE.md for conducting child user testing
  - Implemented FeedbackService for in-app feedback collection and usability tracking
  - Established ethical testing guidelines (consent, comfort, no pressure)
  - Defined recruitment criteria (ages 6-10, DSA representation, diversity)
  - Created 45-minute testing protocol (welcome, first impressions, tasks, exploration, interview)
  - Designed 5 core testing tasks (navigate, import, voice, tasks, customize)
  - Developed observation checklist (touch targets, navigation, content, visual, engagement)
  - Created feedback questions for children and parents
  - Established quantitative metrics (completion rate, task time, error rate, accuracy)
  - Defined severity rating system (Critical/High/Medium/Low)
  - Documented refinement process (prioritize, quick wins, iterate, document)
  - Created success criteria (80%+ completion, <20% errors, 70%+ positive)
  - Implemented UserFeedback model with feedback types (bug, suggestion, compliment, usability, accessibility)
  - Created UsabilityEvent tracking (task completion, touch misses, navigation, errors)
  - Built FeedbackView SwiftUI component for easy feedback submission
  - Added withFeedbackButton view modifier for any screen
  - Implemented local feedback storage with pending sync capability
  - Created usability event logging for analytics integration
  - Files:
    - Docs/USER_TESTING_GUIDE.md (NEW, comprehensive child testing protocols)
    - Core/Services/FeedbackService.swift (NEW, feedback and usability tracking)

- **Subtask 93.1: Audio Segmentation for Whisper API** (2025-10-15)
  - Created AudioSegmentationService for splitting long recordings into 30-minute chunks
  - Implemented AVAssetExportSession-based time range export for segment creation
  - Added 30-second overlap between segments for better transcription continuity
  - Created AudioSegment model tracking index, start/end time, duration, file URL
  - Handles recordings shorter than 30 minutes (returns single segment with original file)
  - Exports segments to temporary directory with session ID tracking
  - Implemented cleanup methods for temporary chunk files after transcription
  - Created SegmentationStats for tracking segmentation metrics (count, duration, file size)
  - Extracts session ID from recording filename (e.g., "lesson_UUID_merged.m4a")
  - Added formatted duration and file size helpers for UI display
  - Comprehensive error handling with SegmentationError enum
  - Logger integration for debugging segmentation process
  - NOTE: Uses iOS 17-compatible AVFoundation APIs (iOS 18 async/await methods available for future optimization)
  - Files:
    - Core/Services/AudioSegmentationService.swift (NEW, 384 lines)

- **Subtask 93.2: Whisper API Audio Optimization** (2025-10-15)
  - Created WhisperAudioOptimizer for validating and optimizing audio chunks for Whisper API
  - Validates audio format against Whisper-supported formats (M4A, MP3, WAV, WebM, FLAC, OGG)
  - Checks file size compliance with Whisper 25 MB limit
  - Analyzes audio properties (sample rate, channel count, format) using AVFoundation
  - Implements intelligent optimization decision logic (only re-exports if needed)
  - Re-exports audio with optimal Whisper settings (16kHz sample rate, mono, AAC M4A)
  - Created OptimizedAudioSegment model tracking optimization results and statistics
  - Batch optimization support for multiple segments
  - Validation methods to ensure all segments meet Whisper API requirements
  - Comprehensive cleanup methods for optimized temporary files
  - OptimizationStats tracking (total/optimized size, reduction percentage)
  - Formatted helpers for file size, settings summary, reduction metrics
  - Logger integration for debugging optimization process
  - Comprehensive error handling with OptimizationError enum
  - Supports both optimization and pass-through (when already optimal)
  - Files:
    - Core/Services/WhisperAudioOptimizer.swift (NEW, 417 lines)

- **Subtask 93.3: Whisper API Transcription Integration** (2025-10-15)
  - Created WhisperTranscriptionService for OpenAI Whisper API integration
  - Implements OpenAI Whisper API v1 audio transcription endpoint
  - Multipart form data HTTP request construction for audio file upload
  - API key management (environment variable, programmatic setting, keychain ready)
  - Single segment and batch transcription support
  - Robust error handling with retry logic (3 attempts, exponential backoff)
  - Rate limiting (max 3 concurrent requests) to avoid API throttling
  - Request timeout configuration (60 seconds per request)
  - Italian language support (language: "it" parameter)
  - Verbose JSON response format for detailed transcription metadata
  - TranscriptionResult model with segment index, text, timestamps, metadata
  - WhisperAPIResponse decoder for Whisper verbose_json format
  - Batch transcription progress callbacks
  - BatchTranscriptionStats for tracking success rate, duration, word count
  - Formatted timestamp helpers (HH:MM:SS format)
  - Comprehensive error classification (retryable vs non-retryable)
  - Error types: missingAPIKey, badRequest, authenticationFailed, rateLimitExceeded, serverError
  - Logger integration for debugging API calls and responses
  - Supports optional prompt parameter for improved transcription accuracy
  - Files:
    - Core/Services/WhisperTranscriptionService.swift (NEW, 428 lines)

### Changed

### Fixed

### Removed

## [Previous Changes]

See git commit history for changes prior to this changelog.
