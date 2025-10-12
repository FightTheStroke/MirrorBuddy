# ADR-001: Technology Stack and Architecture

**Date**: 2025-10-12
**Status**: Proposed
**Deciders**: Roberto (Developer), Mario (Primary User)
**Context**: Initial architectural decisions for MirrorBuddy

---

## Context and Problem Statement

We need to build a multimodal learning companion app (MirrorBuddy) for Mario, who has specific learning needs (dyslexia, dyscalculia, dysgraphia, left hemiplegia, limited working memory). The app must:

- Provide voice-first multimodal interaction (voice, vision, text)
- Integrate with Google services (Drive, Calendar, Gmail)
- Generate adaptive mind maps
- Work across iPhone, iPad, and Mac
- Be maintainable by a solo developer
- Keep costs reasonable (<$200/month)
- Prioritize simplicity over scalability

What technology stack and architecture should we use?

---

## Decision Drivers

1. **Accessibility**: Must support Mario's specific needs (one-handed, voice-first, dyslexia-friendly)
2. **Apple Intelligence**: Leverage on-device AI for privacy and offline capability
3. **Multimodal AI**: Best-in-class voice and vision capabilities
4. **Simplicity**: Solo developer, no need for complex infrastructure
5. **Cross-platform**: Native feel on all Apple devices
6. **Cost**: Keep API costs under $200/month
7. **Maintainability**: Clear, simple architecture

---

## Considered Options

### Option 1: Native Swift + Multiple AI APIs (CHOSEN)
- **Platform**: Native iOS/macOS (SwiftUI)
- **AI**: OpenAI (GPT-4V + Realtime) + Claude 3.5 + Apple Intelligence
- **Storage**: SwiftData + CloudKit
- **Architecture**: Simple direct API calls, no backend

### Option 2: React Native + Single AI Provider
- **Platform**: React Native for cross-platform
- **AI**: Only OpenAI or only Claude
- **Storage**: React Native AsyncStorage + cloud service
- **Architecture**: Unified AI provider

### Option 3: Native Swift + Agent Framework Backend
- **Platform**: Native iOS/macOS (SwiftUI)
- **AI**: Microsoft Agent Framework or similar
- **Storage**: SwiftData + PostgreSQL backend
- **Architecture**: Complex agent orchestration layer

---

## Decision Outcome

**Chosen option**: Option 1 - Native Swift + Multiple AI APIs

### Rationale

#### 1. Native Swift/SwiftUI
**Chosen because**:
- ✅ Best Apple Intelligence integration (Foundation Models Framework)
- ✅ Native performance and feel
- ✅ Superior accessibility (VoiceOver, Dynamic Type)
- ✅ One codebase for iOS/macOS with SwiftUI
- ✅ Excellent camera/audio APIs (AVFoundation)
- ✅ SwiftData for elegant local storage
- ✅ CloudKit for free cross-device sync

**Rejected React Native because**:
- ❌ Limited Apple Intelligence access
- ❌ Worse performance for real-time voice/video
- ❌ Additional abstraction layer complicates debugging
- ❌ Limited access to latest iOS features

#### 2. Multi-AI Approach
**Chosen because**:
- ✅ Best tool for each job:
  - OpenAI Realtime: Best real-time voice conversation
  - GPT-4V: Best vision understanding for homework help
  - Claude 3.5: Best structured output (mind maps, task breakdown)
  - Apple Intelligence: Fast local processing, offline fallback
- ✅ Redundancy: If one API is down, others can compensate
- ✅ Cost optimization: Use cheaper/local AI when sufficient
- ✅ Future flexibility: Easy to add/remove providers

**Rejected single AI provider because**:
- ❌ No single provider excels at all tasks
- ❌ OpenAI Realtime is unique for voice conversation
- ❌ Claude is superior for structured generation
- ❌ Single point of failure

#### 3. No Backend Server
**Chosen because**:
- ✅ Simpler architecture (fewer moving parts)
- ✅ No hosting costs
- ✅ No deployment/DevOps overhead
- ✅ Faster development
- ✅ CloudKit handles sync for free
- ✅ Single user doesn't need server-side logic

**Rejected backend server because**:
- ❌ Unnecessary complexity for 1 user
- ❌ Additional costs (hosting, database)
- ❌ Maintenance overhead
- ❌ Not required for any core feature

#### 4. SwiftData + CloudKit Storage
**Chosen because**:
- ✅ Native Swift API (no ORM complexity)
- ✅ Type-safe models
- ✅ Automatic CloudKit sync
- ✅ Offline-first by design
- ✅ Free (included in Apple Developer account)
- ✅ Excellent Xcode integration

**Rejected alternatives**:
- ❌ Core Data: More complex, legacy API
- ❌ Realm: Third-party dependency, sync costs
- ❌ Firebase: Not needed, adds Google dependency beyond APIs

---

## Architecture Decisions

### AD-1: AI Model Assignment Strategy

| Use Case | Primary AI | Fallback | Rationale |
|----------|-----------|----------|-----------|
| Voice conversation | OpenAI Realtime | Apple Intelligence | Real-time voice is killer feature, no latency |
| Vision (homework) | GPT-4V | Claude Vision | Industry-leading image understanding |
| Mind maps | Claude 3.5 | GPT-4 | Best at structured output, JSON generation |
| Text simplification | Apple Intelligence | Claude | Fast, local, private, works offline |
| Task breakdown | Claude 3.5 | GPT-4 | Superior planning and decomposition |
| Math solving | GPT-4V + Realtime | Claude | Vision to parse + voice to explain |
| Material processing | Claude 3.5 | GPT-4 | Long context, document analysis |
| Coaching persona | OpenAI Realtime | GPT-4 | Best at maintaining consistent personality |

**Implementation**: Simple Swift coordinator class that routes requests based on task type. No complex agent framework needed.

### AD-2: Google Integration Approach

**Decision**: Use official Google iOS SDKs with OAuth2

**Options considered**:
- ✅ Official SDKs: Well-maintained, secure, native iOS support
- ❌ REST APIs directly: More work, have to handle auth ourselves
- ❌ Third-party wrappers: Additional dependency, not needed

**Integration points**:
1. **Google Drive**: Monitor specific folders, download new materials
2. **Google Calendar**: Sync assignments, display upcoming due dates
3. **Gmail**: Parse teacher emails for assignments, extract due dates

**Auth**: OAuth2 with keychain storage, automatic refresh

### AD-3: Offline Strategy

**Decision**: Offline-first with cloud enhancement

**Local capabilities** (work without internet):
- Browse cached materials
- View saved mind maps
- Voice interaction with Apple Intelligence
- Basic text-to-speech
- Progress tracking and gamification

**Requires internet**:
- New material sync from Google Drive
- Advanced AI features (OpenAI, Claude)
- Calendar/email sync
- Mind map generation

**Implementation**:
- SwiftData stores everything locally
- CloudKit syncs across devices
- Background URLSession for material downloads
- Graceful degradation when offline

### AD-4: Voice Architecture

**Decision**: Dual voice system (OpenAI Realtime + Apple Speech)

**OpenAI Realtime** (primary):
- Real-time bidirectional conversation
- Natural interruptions
- Emotion/tone detection
- Context-aware responses
- WebSocket connection
- Used for: Study coaching, homework help

**Apple Speech Framework** (fallback/supplement):
- On-device speech recognition
- Text-to-speech for material reading
- Works offline
- Used for: Material narration, offline mode, privacy-sensitive

**Why both?**:
- OpenAI Realtime is superior for conversation but requires internet
- Apple Speech provides offline capability and privacy
- Can fall back seamlessly if API is down

### AD-5: Mind Map Implementation

**Decision**: Claude for generation, native SwiftUI for rendering

**Generation**: Claude 3.5 Sonnet
- Prompt: "Generate adaptive mind map as structured JSON"
- Input: Material text + Mario's comprehension level
- Output: Hierarchical JSON with nodes, connections, visual hints

**Rendering**: Custom SwiftUI components
- Force-directed graph layout (D3-like in Swift)
- Interactive zoom/pan with gestures
- Voice-driven navigation
- Accessibility support (VoiceOver describes structure)

**Storage**: JSON in SwiftData, quick to load and render

**Why not WebView?**:
- Native feels better, better performance
- Full control over accessibility
- Gesture handling more intuitive
- Offline rendering

### AD-6: Camera/Vision Pipeline

**Decision**: AVFoundation → GPT-4V → Response

**Flow**:
1. User points camera at textbook/homework
2. AVFoundation captures high-quality image
3. Optional: VisionKit for text detection (quick preview)
4. Send to GPT-4V with context prompt
5. Display extracted content + AI explanation
6. Save to history for review

**iPad Apple Pencil**:
- PencilKit for handwriting capture
- VisionKit for on-device text recognition (fast feedback)
- Send to GPT-4V for understanding and solving
- Show solution step-by-step

---

## Consequences

### Positive

1. **Fast development**: Simple architecture, fewer abstractions
2. **Native experience**: Best possible UX on Apple devices
3. **Flexible AI**: Use best model for each task
4. **Low cost**: No backend hosting, only API costs
5. **Privacy-friendly**: Local processing where possible
6. **Offline capable**: Core features work without internet
7. **Maintainable**: Single codebase, clear responsibilities
8. **Future-proof**: Easy to swap AI providers as technology evolves

### Negative

1. **API dependency**: Core features require internet
2. **Cost variability**: Usage-based pricing could spike
3. **Multiple APIs**: More integration points to maintain
4. **iOS-only**: No Android/web version (not a concern for this project)
5. **API rate limits**: Need to implement request throttling

### Mitigation Strategies

1. **API costs**: Implement aggressive caching, use Apple Intelligence for simple tasks
2. **Rate limits**: Request queuing, exponential backoff, user feedback
3. **API downtime**: Graceful fallbacks, offline mode, clear error messages
4. **Cost spikes**: Monthly monitoring, usage analytics, alerts at $150

---

## Implementation Notes

### Project Structure
```
MirrorBuddy/
├── App/
│   ├── MirrorBuddyApp.swift
│   └── RootView.swift
├── Features/
│   ├── Materials/
│   ├── StudyCoach/
│   ├── MindMaps/
│   ├── Tasks/
│   └── Gamification/
├── Core/
│   ├── AI/
│   │   ├── OpenAIClient.swift
│   │   ├── ClaudeClient.swift
│   │   └── AICoordinator.swift
│   ├── Data/
│   │   ├── Models/
│   │   └── SwiftDataStack.swift
│   ├── Google/
│   │   ├── DriveService.swift
│   │   ├── CalendarService.swift
│   │   └── GmailService.swift
│   └── Utilities/
├── UI/
│   ├── Components/
│   ├── Themes/
│   └── Accessibility/
└── Resources/
    ├── Assets.xcassets
    └── Localizations/
```

### Key Dependencies
- **OpenAI Swift SDK** (or custom client)
- **Anthropic Swift SDK** (or custom client)
- **GoogleSignIn-iOS**
- **GoogleAPIClientForREST** (Drive, Calendar, Gmail)
- No other third-party dependencies (keep it simple)

### Configuration
- API keys in Xcode build settings (not in code)
- Environment-specific configs (Debug/Release)
- Feature flags for gradual rollout

---

## Related Decisions

- ADR-002: Design System and Accessibility (TBD)
- ADR-003: Gamification System (TBD)
- ADR-004: Privacy and Data Handling (TBD)

---

## References

- [Apple Intelligence Documentation](https://developer.apple.com/documentation/apple-intelligence)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Claude API Documentation](https://docs.anthropic.com/)
- [SwiftData Documentation](https://developer.apple.com/documentation/swiftdata)
- [Google APIs for iOS](https://developers.google.com/ios)

---

## Approval

**Status**: ✅ Proposed - Ready for review with Roberto and Mario

**Next Steps**:
1. Review this ADR together
2. Validate assumptions with quick prototypes:
   - OpenAI Realtime voice quality test
   - GPT-4V homework image test
   - Claude mind map generation test
3. Approve and move to "Accepted" status
4. Begin Phase 0 implementation
