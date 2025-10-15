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

### Changed

### Fixed

### Removed

## [Previous Changes]

See git commit history for changes prior to this changelog.
