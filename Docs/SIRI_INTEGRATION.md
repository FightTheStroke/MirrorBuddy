# Siri Integration for MirrorBuddy

## Overview

MirrorBuddy integrates with Siri using **App Intents** (iOS 16+) to provide true voice-first interaction. Instead of implementing a custom wake word that drains battery, we leverage Apple's optimized Siri system.

## How It Works

### User Experience

```
User: "Hey Siri, parla con MirrorBuddy"
Siri: [Opens MirrorBuddy app]
App: → Auto-starts in passive listening mode (VAD active)
User: [Speaks naturally] "Spiega questa frazione..."
App: → VAD detects speech, conversation proceeds
```

### Supported Phrases

#### General Conversation
- "Hey Siri, parla con MirrorBuddy"
- "Hey Siri, aiutami con MirrorBuddy"
- "Hey Siri, inizia conversazione con MirrorBuddy"
- "Hey Siri, apri MirrorBuddy e parla"

#### Subject-Specific
- "Hey Siri, aiutami con la matematica" → Opens MirrorBuddy in math mode
- "Hey Siri, spiegami l'italiano" → Opens MirrorBuddy in Italian mode
- "Hey Siri, parla di scienze con MirrorBuddy" → Opens in science mode

Supported subjects:
- Matematica
- Italiano
- Inglese
- Scienze
- Storia
- Geografia
- Arte
- Musica

## Implementation Details

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Siri (iOS)                        │
│         "Hey Siri, parla con MirrorBuddy"          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          StartConversationIntent                    │
│  (App Intents Framework, iOS 16+)                  │
│  - subject: String? (optional)                     │
│  - topic: String? (optional)                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼ (Posts Notification)
┌─────────────────────────────────────────────────────┐
│      VoiceConversationViewModel                     │
│  - setupSiriIntentListener()                       │
│  - handleSiriIntent()                              │
│  - Auto-starts conversation with VAD               │
└─────────────────────────────────────────────────────┘
```

### Key Components

1. **StartConversationIntent.swift**
   - Defines the Siri intent
   - Accepts optional parameters (subject, topic)
   - Posts notification to app when invoked

2. **AppShortcutsProvider.swift**
   - Provides suggested Siri phrases
   - Appears in iOS Settings → Siri & Search → MirrorBuddy
   - Users can create custom shortcuts

3. **VoiceConversationViewModel**
   - Listens for intent notifications
   - Extracts parameters (subject, topic)
   - Auto-starts conversation in passive listening mode

## Benefits vs. Custom Wake Word

| Feature | Custom Wake Word | Siri Integration |
|---------|------------------|------------------|
| **Battery Usage** | 🔴 High (continuous mic) | 🟢 Zero (Siri handles) |
| **Privacy** | 🟡 Requires mic permission | 🟢 Siri on-device (iOS 17+) |
| **Recording Indicator** | 🔴 Always visible | 🟢 Only when active |
| **Works when app closed** | 🔴 No | 🟢 Yes |
| **User familiarity** | 🟡 New pattern | 🟢 Already know Siri |
| **Setup complexity** | 🟡 Complex | 🟢 Simple |
| **iOS native** | 🔴 Custom implementation | 🟢 Apple-optimized |

## Setup Instructions

### For Developers

1. **Ensure iOS 16+ deployment target** (already set in MirrorBuddy)
2. **No additional entitlements needed** - App Intents work automatically
3. **Test in Simulator or Device**:
   ```bash
   # In Xcode
   1. Build and run MirrorBuddy
   2. Open Settings → Siri & Search → MirrorBuddy
   3. Verify shortcuts are available
   4. Test: "Hey Siri, parla con MirrorBuddy"
   ```

### For End Users

1. **Open Settings** → **Siri & Search** → **MirrorBuddy**
2. View **Suggested Shortcuts**:
   - "Parla con MirrorBuddy"
   - "Aiutami con la matematica"
   - etc.
3. Tap **+** to add to Siri
4. (Optional) Record custom phrase

**Or just say:**
"Hey Siri, parla con MirrorBuddy" — **it works immediately!**

## Custom Shortcuts (Advanced)

Users can create personalized shortcuts:

1. Open **Shortcuts app**
2. Create new shortcut
3. Add **"Parla con MirrorBuddy"** action
4. Set parameters:
   - Subject: "matematica"
   - Topic: "frazioni"
5. Record custom phrase: "Hey Siri, aiutami con le frazioni"

## Technical Notes

### iOS Version Requirements
- **iOS 16+**: Basic App Intents support
- **iOS 17+**: On-device Siri processing (better privacy)
- **iOS 18+**: Enhanced Siri integration

### Notification Flow
```swift
1. Siri invokes StartConversationIntent
2. Intent posts Notification.Name.startVoiceConversation
3. VoiceConversationViewModel receives notification
4. Extracts userInfo: subject, topic, autoStart
5. Updates context (currentSubject, currentMaterial)
6. Calls startConversation() after 300ms delay
7. App enters passive listening mode with VAD
8. User speaks naturally without additional touch
```

### Debugging

Enable intent logging:
```swift
// In VoiceConversationViewModel
logger.info("Received Siri intent to start conversation")
logger.debug("Siri intent: subject set to \(subject)")
```

View logs in Console.app:
```
Filter: subsystem:com.mirrorbuddy category:VoiceConversation
```

## Future Enhancements

### Potential Additions
1. **More granular intents**:
   - "Hey Siri, quiz me on Italian verbs"
   - "Hey Siri, show my study progress"
   - "Hey Siri, create a flashcard set"

2. **Widget integration**:
   - Quick action widget button
   - Voice conversation history widget

3. **Handoff support**:
   - Start on iPhone, continue on iPad
   - Seamless device switching

4. **Focus mode integration**:
   - Auto-enable Study focus when conversation starts
   - Disable notifications during sessions

## Comparison with README Mission

README states:
> "Voice-first & interrupt friendly — Speak naturally, interrupt mid-sentence, pick up the thread minutes later."

**Now implemented:**
- ✅ Voice-first: "Hey Siri, parla con MirrorBuddy" → no touch needed
- ✅ Interrupt friendly: Barge-in support during AI responses
- ✅ Speak naturally: VAD handles pauses and turn-taking
- ✅ Pick up thread: Re-invoke via Siri anytime

**Perfect alignment with voice-first mission!**

## References

- [Apple App Intents Documentation](https://developer.apple.com/documentation/appintents)
- [App Shortcuts Overview](https://developer.apple.com/documentation/appintents/app-shortcuts)
- [Siri Integration Best Practices](https://developer.apple.com/design/human-interface-guidelines/siri)

---

**Last Updated:** October 20, 2025
**iOS Version:** 16.0+
**Status:** Production Ready ✅
