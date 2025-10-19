# MirrorBuddy Offline Capabilities Matrix

## Feature Availability

| Feature | Offline Support | Notes |
|---------|----------------|-------|
| **Study & Review** | | |
| Flashcard Review | ✅ Full | All cards cached locally |
| Study Timer | ✅ Full | No internet required |
| Progress Tracking | ✅ Full | Stored in SwiftData |
| Task Management | ✅ Full | Local task list |
| **Content** | | |
| View Downloaded Materials | ✅ Full | Cached PDFs, images |
| View Mind Maps | ✅ Full | Cached visualizations |
| Material Search | ⚠️ Limited | Local cache only |
| **AI Features** | | |
| Voice Commands (Navigation) | ✅ Full | Local speech recognition |
| Voice Transcription | ❌ Online Only | Requires Whisper API |
| AI Content Generation | ❌ Online Only | Requires Claude/GPT API |
| Mind Map Generation | ❌ Online Only | Requires AI processing |
| **Import/Export** | | |
| Google Drive Sync | ❌ Online Only | Requires internet |
| Gmail Material Import | ❌ Online Only | Requires internet |
| PDF Export | ✅ Full | Local file generation |
| Markdown Export | ✅ Full | Local file generation |
| **Recording** | | |
| Voice Recording | ✅ Full | Saved locally |
| Transcription Processing | ❌ Online Only | Queued until online |
| **Other** | | |
| Weekly Digest Delivery | ❌ Online Only | Email requires internet |
| LMS Integration | ❌ Online Only | Requires API access |
| Settings Sync | ✅ Full | Local preferences |

## Offline Behavior

### When Connection Lost

1. **Automatic Offline Mode**
   - App detects network loss
   - Shows offline indicator (cloud icon with slash)
   - Disables online-only features gracefully

2. **Data Queuing**
   - Transcription requests queued
   - Export attempts saved for retry
   - Progress continues locally

3. **UI Adaptation**
   - Online-only buttons grayed out
   - Helpful tooltips: "Available when online"
   - No error dialogs (graceful degradation)

### When Connection Restored

1. **Automatic Sync**
   - Queued transcriptions processed
   - Material metadata refreshed
   - Weekly digest sent (if scheduled)

2. **User Notification**
   - Toast: "Back online - syncing data..."
   - Progress indicator during sync
   - Success confirmation

## Offline-First Design

MirrorBuddy prioritizes **local-first functionality**:

- ✅ Core study features work 100% offline
- ✅ No "sign in required" gates
- ✅ Data saved locally in real-time
- ✅ Graceful degradation for cloud features

Only **enhancement features** require internet:
- AI-powered content generation
- Third-party integrations (Drive, Gmail, LMS)
- Voice transcription (heavy AI processing)

## Developer Guidelines

When adding new features, follow offline-first principles:

```swift
// ✅ GOOD: Check connectivity, degrade gracefully
func generateMindMap() async {
    guard NetworkMonitor.shared.isConnected else {
        showOfflineMessage("Mind maps require internet")
        return
    }
    // ... API call
}

// ❌ BAD: Crash or hang without connectivity
func generateMindMap() async {
    let result = try await api.generate() // Throws error offline
}
```

### Offline Checklist

- [ ] Feature works without internet? → SwiftData storage
- [ ] Requires API? → Check `NetworkMonitor.isConnected`
- [ ] Show offline state clearly → Disabled button + tooltip
- [ ] Queue for retry? → Use `OfflineQueueService`
- [ ] Document in this file → Update matrix above
