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

### Changed

### Fixed

### Removed

## [Previous Changes]

See git commit history for changes prior to this changelog.
