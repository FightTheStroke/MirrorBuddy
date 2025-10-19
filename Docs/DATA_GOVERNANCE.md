# MirrorBuddy Data Governance & Privacy Policy

**Last Updated**: 2025-10-19

## Overview

MirrorBuddy is committed to protecting user privacy and maintaining transparent data practices, especially for our primary users: students and their guardians.

## Data Collection

### Personal Information (PII)

**We Collect**:
- Student's first name (optional, for personalization)
- Guardian email (optional, for weekly digest)
- Voice recordings (only with guardian consent)
- Study session data (subjects, time, performance)

**We DO NOT Collect**:
- Full names or addresses
- Social security numbers
- Payment information (app is free)
- Biometric data beyond voice (no face recognition)

### Data Sources

| Data Type | Source | Retention | Purpose |
|-----------|--------|-----------|---------|
| Study Sessions | SwiftData local storage | Indefinite (user device) | Progress tracking |
| Voice Recordings | Local device (opt-in) | Until user deletes | Lesson transcription |
| API Interactions | Cloud services | Transient (not stored) | Real-time processing |
| Analytics | OS-level (anonymized) | 90 days | App improvement |

## Data Flows

### Voice Recording Flow
```
1. Guardian enables recording (GuardianConsent.allowRecording = true)
2. Student starts lesson recording → LessonRecordingService
3. Audio stored locally on device → /Documents/Recordings/
4. Segmented for transcription → WhisperTranscriptionService
5. Transcripts stored locally → LessonRecording.transcript
6. Original audio can be deleted by user
```

### Export Flow
```
1. User requests export → Check GuardianConsent.allowExport
2. If allowed, generate PDF/Markdown → ExportService
3. Save to Files app or share via system share sheet
4. No data sent to MirrorBuddy servers
```

### Third-Party Services

| Service | Purpose | Data Shared | Retention |
|---------|---------|-------------|-----------|
| OpenAI Whisper API | Speech-to-text | Audio segments (temporary) | Not retained |
| Anthropic Claude API | Content generation | Text prompts (no PII) | Not retained |
| Google Drive API | Material import | OAuth tokens only | Until revoked |

**All API calls**:
- Use TLS/HTTPS encryption
- Do not include student names
- Are logged locally for audit (StructuredAuditLogger)

## Guardian Controls

### Consent Toggles

Located in: **Settings → Guardian Controls** (PIN-protected)

- ☐ **Allow Lesson Recording**: Enable/disable voice recording
- ☐ **Allow Data Export**: Enable/disable PDF/Markdown exports
- ☐ **Allow Third-Party Sharing**: Enable/disable LMS integrations
- ☑ **Allow Analytics**: Anonymous usage stats (recommended)
- ☑ **Allow Persona Adjustment**: Let student customize coach tone

**Default**: All disabled except Analytics and Persona

### Privacy Indicators

Real-time indicators appear when:
- 🔴 **Recording Active**: Red microphone icon
- 📤 **Exporting Data**: Blue upload icon
- 📊 **Analytics Running**: Gray chart icon (always on if enabled)

Users can tap indicators to see details and quick-toggle consent.

## Offline Capabilities

### Features Available Offline

✅ **Full Functionality**:
- Flashcard review
- Study timer
- Progress tracking
- Mind map viewing (cached)
- Task management

⚠️ **Limited Functionality**:
- Material import (cached Drive files only)
- Voice transcription (requires internet)
- AI content generation (requires internet)

❌ **Requires Internet**:
- Live lesson recording transcription
- Weekly digest delivery
- LMS sync
- Material downloads

### Offline Data Sync

When offline:
- All user data stored locally in SwiftData
- Changes queued for sync when online
- No data loss during offline periods
- Privacy indicators show "Offline Mode"

## Data Retention & Deletion

### User-Controlled Deletion

Users can delete:
- Individual lesson recordings (swipe-to-delete)
- Study sessions (bulk delete in settings)
- All app data (Settings → Delete All Data)

### Automatic Cleanup

- Failed transcription attempts: 7 days
- Temporary audio segments: 24 hours
- Audit logs: 90 days (local only)
- Cached API responses: 30 days

### Account Deletion

To delete all MirrorBuddy data:
1. Settings → Privacy → Delete All Data
2. Confirm with guardian PIN
3. All local data wiped immediately
4. No server-side data (nothing to delete)

## Audit Logging

### What We Log (Locally)

```json
{
  "timestamp": "2025-10-19T10:30:00Z",
  "eventType": "voice_command",
  "userId": "abc123xy", // Truncated for privacy
  "metadata": {
    "command": "start flashcards"
  },
  "success": true
}
```

**Logged Events**:
- Voice commands (command text, not audio)
- API calls (endpoint, duration, success/failure)
- Consent changes (setting, new value)
- Data exports (format, record count)
- Errors (type, severity, no PII)

**NOT Logged**:
- Message content
- Study material content
- Actual voice audio
- Student answers to questions

### Log Access

- Guardians: View in Settings → Privacy → Audit Log
- Logs stored locally only
- Can be exported for review (CSV format)
- Automatically purged after 90 days

## Compliance

### Children's Privacy (COPPA)

MirrorBuddy is designed for students 10+ with guardian oversight:
- ✅ Guardian consent required for data collection
- ✅ No advertising or tracking
- ✅ No social features or user-generated content sharing
- ✅ Transparent data practices

### GDPR Compliance

For EU users:
- ✅ Right to access (export all data)
- ✅ Right to deletion (delete all data)
- ✅ Right to portability (PDF/Markdown export)
- ✅ Right to restrict processing (consent toggles)
- ✅ Privacy by design (local-first architecture)

## Security Measures

- **Local-First Storage**: All data on user device by default
- **TLS Encryption**: All API calls use HTTPS
- **PIN Protection**: Guardian settings locked behind PIN
- **No Passwords**: Using system authentication only
- **Regular Audits**: Quarterly security reviews

## Updates to This Policy

- Policy version tracked in this document
- Users notified of material changes via in-app banner
- 30-day notice before changes take effect
- Guardian re-consent required for expanded data collection

## Contact

For privacy questions or data deletion requests:
- Email: privacy@mirrorbuddy.app (placeholder)
- In-app: Settings → Help → Privacy Support

---

**Policy Version**: 1.0
**Effective Date**: 2025-10-19
**Next Review**: 2026-01-19
