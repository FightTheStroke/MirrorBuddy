# MirrorBuddy - Immediate Next Steps
**Date**: 2025-10-12
**Status**: Ready to Begin Phase 0

---

## 🎯 Quick Start Checklist

### ✅ Completed
- [x] Project planning and feature definition
- [x] Technology stack selection
- [x] Architecture design
- [x] Development roadmap (8 phases)
- [x] Documentation (PLANNING.md, ADR-001, EXECUTIVE_SUMMARY.md)

### 🔄 This Week (Review & Setup)

#### Step 1: Review & Align (1-2 hours)
- [ ] Read [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) (quick overview)
- [ ] Review [DISCUSSION_POINTS.md](DISCUSSION_POINTS.md)
- [ ] Answer critical questions:
  - Primary device? (iPad recommended)
  - Voice personality? (Friendly peer recommended)
  - Privacy boundaries?
- [ ] Show documents to Mario, get his input

#### Step 2: API Setup (1 hour)
- [ ] Create OpenAI account, get API key
  - Go to: https://platform.openai.com/api-keys
  - Enable GPT-4V and Realtime API access
  - Set billing limit ($100/month to start)
- [ ] Create Anthropic account, get API key
  - Go to: https://console.anthropic.com/
  - Generate API key
  - Note: Claude 3.5 Sonnet
- [ ] Setup Google Cloud Project
  - Create project: https://console.cloud.google.com/
  - Enable APIs: Drive, Calendar, Gmail
  - Create OAuth 2.0 credentials
  - Download JSON credentials

#### Step 3: Environment Setup (30 min)
- [ ] Ensure Xcode 16+ installed (iOS 26 SDK)
- [ ] Install Command Line Tools: `xcode-select --install`
- [ ] Configure API keys (see below)
- [ ] Test build: `open MirrorBuddy.xcodeproj`

---

## 🔑 API Keys Configuration

### Create API Keys File
```bash
cd /Users/roberdan/GitHub/MirrorBuddyV2
mkdir -p MirrorBuddy/Config
touch MirrorBuddy/Config/APIKeys.swift
```

### Add to `.gitignore`
```bash
echo "MirrorBuddy/Config/APIKeys.swift" >> .gitignore
```

### Template (APIKeys.swift)
```swift
//
//  APIKeys.swift
//  MirrorBuddy
//
//  IMPORTANT: This file is git-ignored. Never commit API keys!
//

import Foundation

enum APIKeys {
    // OpenAI (GPT-4V + Realtime API)
    static let openAI = "sk-proj-..." // Replace with your key

    // Anthropic (Claude 3.5 Sonnet)
    static let anthropic = "sk-ant-..." // Replace with your key

    // Google OAuth 2.0
    static let googleClientID = "xxx.apps.googleusercontent.com"
    static let googleClientSecret = "GOCSPX-..."

    // Optional: Different keys for development vs production
    static var environment: Environment { .development }

    enum Environment {
        case development
        case production
    }
}
```

---

## 🏗️ Phase 0: Foundation (Weeks 1-2)

### Week 1: Project Structure & Design System

#### Day 1-2: Project Setup
- [ ] Create SwiftData models
  ```swift
  // Material.swift
  // MindMap.swift
  // Task.swift
  // UserProgress.swift
  ```
- [ ] Setup CloudKit container
- [ ] Configure app groups (for widget support later)
- [ ] Create basic folder structure (see below)

#### Day 3-4: Design System
- [ ] Define color palette
  - Primary: Fortnite-inspired blues/purples
  - Accessible: High contrast modes
  - Dyslexia-friendly: Warm backgrounds, clear text
- [ ] Typography
  - Default: San Francisco (system font)
  - Optional: OpenDyslexic font
  - Dynamic Type support
- [ ] Create reusable components
  - `VoiceButton` (large, accessible)
  - `SubjectCard` (material categories)
  - `ProgressBar` (XP/level tracking)
  - `MindMapNode` (visual hierarchy)

#### Day 5: Basic Navigation
- [ ] Create TabView structure
  - Home (dashboard)
  - Materials (library)
  - Study Coach (voice/vision)
  - Tasks (calendar)
  - Progress (gamification)
- [ ] Implement navigation state management
- [ ] Add VoiceOver labels to all buttons

### Week 2: API Clients & Prototypes

#### Day 1-2: API Clients
- [ ] Create `OpenAIClient.swift`
  - GPT-4V image analysis endpoint
  - Realtime API WebSocket connection
  - Token usage tracking
- [ ] Create `ClaudeClient.swift`
  - Messages API (Claude 3.5 Sonnet)
  - Streaming support
  - Structured output (JSON mode)
- [ ] Create `AICoordinator.swift`
  - Route requests to appropriate AI
  - Fallback logic
  - Cost tracking

#### Day 3-4: Voice Prototype
- [ ] OpenAI Realtime API integration
- [ ] Test real-time voice conversation
- [ ] Measure latency and quality
- [ ] Test interruption handling
- [ ] **Validation**: Can Mario have a natural conversation?

#### Day 5: Vision Prototype
- [ ] Camera integration (AVFoundation)
- [ ] Capture image, send to GPT-4V
- [ ] Display extracted text/explanation
- [ ] **Validation**: Can it read Mario's textbooks?

---

## 📁 Recommended Folder Structure

```
MirrorBuddy/
├── App/
│   ├── MirrorBuddyApp.swift          # App entry point
│   └── RootView.swift                # Root navigation
│
├── Features/
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   └── DashboardViewModel.swift
│   ├── Materials/
│   │   ├── MaterialsListView.swift
│   │   ├── MaterialDetailView.swift
│   │   └── MaterialsViewModel.swift
│   ├── StudyCoach/
│   │   ├── StudyCoachView.swift
│   │   ├── VoiceInteractionView.swift
│   │   ├── CameraView.swift
│   │   └── StudyCoachViewModel.swift
│   ├── MindMaps/
│   │   ├── MindMapView.swift
│   │   ├── MindMapNode.swift
│   │   └── MindMapViewModel.swift
│   ├── Tasks/
│   │   ├── TasksListView.swift
│   │   ├── TaskDetailView.swift
│   │   └── TasksViewModel.swift
│   └── Gamification/
│       ├── ProgressView.swift
│       ├── AchievementsView.swift
│       └── GamificationViewModel.swift
│
├── Core/
│   ├── AI/
│   │   ├── OpenAIClient.swift        # GPT-4V + Realtime
│   │   ├── ClaudeClient.swift        # Claude 3.5 Sonnet
│   │   ├── AICoordinator.swift       # Route requests
│   │   └── Prompts/
│   │       ├── CoachingPrompts.swift
│   │       ├── MindMapPrompts.swift
│   │       └── SubjectPrompts.swift
│   ├── Data/
│   │   ├── Models/
│   │   │   ├── Material.swift
│   │   │   ├── MindMap.swift
│   │   │   ├── Task.swift
│   │   │   ├── UserProgress.swift
│   │   │   └── Subject.swift
│   │   ├── SwiftDataStack.swift
│   │   └── CloudKitSync.swift
│   ├── Google/
│   │   ├── DriveService.swift        # Google Drive API
│   │   ├── CalendarService.swift     # Calendar API
│   │   ├── GmailService.swift        # Gmail API
│   │   └── GoogleAuthManager.swift   # OAuth 2.0
│   ├── Accessibility/
│   │   ├── VoiceOverHelper.swift
│   │   ├── DyslexiaFont.swift
│   │   └── OneHandedLayout.swift
│   └── Utilities/
│       ├── Logger.swift
│       ├── ErrorHandler.swift
│       ├── DateFormatter+Extensions.swift
│       └── String+Extensions.swift
│
├── UI/
│   ├── Components/
│   │   ├── VoiceButton.swift
│   │   ├── SubjectCard.swift
│   │   ├── ProgressBar.swift
│   │   ├── MaterialCard.swift
│   │   └── AchievementBadge.swift
│   ├── Themes/
│   │   ├── Colors.swift
│   │   ├── Typography.swift
│   │   └── Spacing.swift
│   └── Modifiers/
│       ├── AccessibilityModifiers.swift
│       └── CardStyle.swift
│
├── Resources/
│   ├── Assets.xcassets/
│   │   ├── Colors/
│   │   ├── Icons/
│   │   └── Images/
│   ├── Sounds/
│   │   ├── LevelUp.mp3
│   │   ├── Achievement.mp3
│   │   └── Encouragement.mp3
│   └── Localizations/
│       ├── en.lproj/
│       └── it.lproj/
│
├── Config/
│   ├── APIKeys.swift                 # Git-ignored
│   └── AppConfig.swift               # App settings
│
└── Tests/
    ├── MirrorBuddyTests/
    └── MirrorBuddyUITests/
```

---

## 🧪 Validation Tests (End of Phase 0)

### Must Pass Before Phase 1:
1. **Voice Quality Test**
   - Record 5-minute conversation with OpenAI Realtime
   - Measure: Latency <1s, intelligibility >95%
   - Test: Mario can interrupt naturally

2. **Vision Accuracy Test**
   - Show 10 textbook pages to GPT-4V
   - Measure: Text extraction accuracy >90%
   - Test: Handles handwritten notes (Apple Pencil)

3. **Mind Map Generation Test**
   - Give Claude 5 different texts (various subjects)
   - Measure: Generated maps are comprehensible
   - Test: Mario can understand the visual structure

4. **Google Integration Test**
   - Connect to Google Drive, list folders
   - Fetch last 10 uploaded files
   - Parse Calendar for next week's assignments

5. **Performance Test**
   - App launches in <2 seconds
   - Voice button responds instantly
   - No lag when navigating

---

## 💰 Budget Setup

### OpenAI Billing
1. Go to: https://platform.openai.com/settings/organization/billing
2. Set monthly limit: $100 (increase later if needed)
3. Add payment method
4. Enable email alerts at $75

### Anthropic Billing
1. Go to: https://console.anthropic.com/settings/billing
2. Add payment method
3. Monitor usage in console

### Expected Costs (Testing Phase)
- Week 1-2: $20-50 (lots of prototyping)
- After: $70-200/month (normal usage)

---

## 📊 Success Criteria (End of Phase 0)

- [ ] Project compiles and runs on simulator + real device
- [ ] Voice conversation works (OpenAI Realtime)
- [ ] Camera can capture and analyze images (GPT-4V)
- [ ] Mind map generation prototype works (Claude)
- [ ] Google Drive lists Mario's materials
- [ ] Basic navigation feels smooth and accessible
- [ ] Design system components are reusable
- [ ] API costs are within budget

---

## 🚀 After Phase 0

If all validations pass:
- ✅ **Proceed to Phase 1** (Material Management)
- ✅ **Weekly check-ins** with Mario for feedback
- ✅ **Track costs** and adjust as needed

If issues arise:
- 🔄 **Iterate on prototypes** until quality is acceptable
- 🔄 **Adjust AI models** if performance/cost is problematic
- 🔄 **Revisit architecture** if major blockers found

---

## 📞 Questions?

**Technical**: Review [ADR-001](ADR/001-technology-stack-and-architecture.md)
**Features**: Review [PLANNING.md](PLANNING.md)
**Quick Overview**: Review [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)
**Decisions Needed**: Review [DISCUSSION_POINTS.md](DISCUSSION_POINTS.md)

---

**Ready to start building? Let's make learning fun for Mario! 🚀**

**Last Updated**: 2025-10-12
