# MirrorBuddy

**Personalized AI Learning Companion for Students with Special Needs**

MirrorBuddy is a multimodal educational app designed to help students like Mario—who face challenges with dyslexia, dyscalculia, dysgraphia, limited working memory, and physical disabilities—succeed in their studies through voice-first interaction, adaptive learning support, and gamification.

---

## 🚀 **[➡️ FINAL BRIEFING](Docs/FINAL_BRIEFING.md)** ⭐⭐⭐

**First time here?** Read the **[FINAL_BRIEFING](Docs/FINAL_BRIEFING.md)** for complete summary and action plan!

Alternative: [START_HERE guide](Docs/START_HERE.md) for navigation

---

## 🎯 Project Status

**Current Phase**: ✅ ALL DECISIONS COMPLETE - Ready for Agent-Driven Development
**Planning Date**: 2025-10-12
**Target Launch**: Q1 2026 (6-8 weeks with agents!)
**Final Stack**: [STACK_FINAL.md](Docs/STACK_FINAL.md)
**Knowledge Updated**: October 12, 2025 (iOS 26, macOS 26, GPT-5, Gemini 2.5)

---

## 📚 Documentation (Read in This Order)

### **Essential Reading** (45 minutes) ⭐⭐⭐
1. **[STACK FINAL](Docs/STACK_FINAL.md)** ⭐⭐⭐ - Final approved technology stack (10 min)
2. **[FINAL BRIEFING](Docs/FINAL_BRIEFING.md)** ⭐⭐⭐ - Complete summary & action plan (10 min)
3. **[CRITICAL DECISIONS](Docs/CRITICAL_DECISIONS.md)** ⭐⭐ - 7 decisions completed (15 min)
4. **[AGENT-DRIVEN DEVELOPMENT](Docs/AGENT_DRIVEN_DEVELOPMENT.md)** ⭐⭐ - AI agents development plan (20 min)

### **Quick Start** (1 hour)
4. **[START HERE](Docs/START_HERE.md)** - Navigation guide
5. **[EXECUTIVE SUMMARY](Docs/EXECUTIVE_SUMMARY.md)** - Project overview

### **Deep Dive** (3 hours)
6. **[Full Planning Document](Docs/PLANNING.md)** - Complete features & roadmap
7. **[AI Strategy (Updated)](Docs/AI_STRATEGY_UPDATED.md)** - GPT-5, Claude, Gemini analysis
8. **[Voice & Mind Maps Strategy](Docs/VOICE_AND_MINDMAPS_STRATEGY.md)** - Technical details

### **Reference**
9. **[Architecture Decision Records](Docs/ADR/)** - Technical decisions
   - [ADR-001: Technology Stack](Docs/ADR/001-technology-stack-and-architecture.md)
10. **[Discussion Points](Docs/DISCUSSION_POINTS.md)** - Questions for alignment
11. **[Next Steps](Docs/NEXT_STEPS.md)** - Operational guide
12. **[Execution Plan](Docs/ExecutionPlan.md)** - Backlog & tracking

---

## 🚀 Quick Start

### Prerequisites
- Xcode 16+ (for iOS 26/macOS 26 development)
- Apple Developer Account
- API Keys:
  - OpenAI API (GPT-4V + Realtime)
  - Anthropic API (Claude 3.5 Sonnet)
  - Google Cloud (Drive, Calendar, Gmail APIs)

### Setup
```bash
# Clone the repository
git clone https://github.com/[username]/MirrorBuddyV2.git
cd MirrorBuddyV2

# Open in Xcode
open MirrorBuddy.xcodeproj

# Configure API keys (see Configuration section)
```

---

## 🛠️ Technology Stack

### Platform
- **iOS 26+** (iPhone, iPad)
- **macOS 26+** (Mac)
- **Language**: Swift 6+
- **UI Framework**: SwiftUI
- **Storage**: SwiftData + CloudKit

### AI Services
- **OpenAI** (GPT-4V + Realtime API) - Voice conversation, vision
- **Anthropic** (Claude 3.5 Sonnet) - Mind maps, document processing
- **Apple Intelligence** - On-device processing, offline mode

### Integrations
- Google Drive API
- Google Calendar API
- Gmail API

---

## ✨ Core Features

### 🎤 Voice-First Interaction
- Real-time voice conversation with AI coach
- Natural interruptions and clarifications
- Patient, encouraging personality

### 👁️ Vision Capabilities
- Analyze textbook pages via camera
- Handwriting recognition (Apple Pencil)
- Step-by-step problem solving

### 🗺️ Adaptive Mind Maps
- Auto-generated from study materials
- Simplified for comprehension
- Interactive exploration

### 📚 Material Management
- Auto-sync from Google Drive
- Text-to-speech for all content
- Subject-organized dashboard

### 🎮 Gamification
- XP and leveling system
- Fortnite-inspired rewards
- Achievement badges
- Progress tracking

### ♿ Accessibility
- One-handed operation
- Dyslexia-friendly design
- Minimal working memory load
- Offline mode for core features

---

## 🗓️ Development Roadmap

| Phase | Timeline | Focus |
|-------|----------|-------|
| **Phase 0** | Weeks 1-2 | Foundation & Setup |
| **Phase 1** | Weeks 3-4 | Material Management |
| **Phase 2** | Weeks 5-6 | Voice Coach |
| **Phase 3** | Weeks 7-8 | Vision Capabilities |
| **Phase 4** | Weeks 9-10 | Mind Maps |
| **Phase 5** | Weeks 11-12 | Task Management |
| **Phase 6** | Weeks 13-14 | Gamification |
| **Phase 7** | Weeks 15-16 | Subject-Specific Modes |
| **Phase 8** | Weeks 17-18 | Polish & Launch |

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   SwiftUI Apps (iOS/macOS)      │
│   ┌───────────────────────────┐ │
│   │  Features                 │ │
│   │  - Materials              │ │
│   │  - Study Coach            │ │
│   │  - Mind Maps              │ │
│   │  - Tasks                  │ │
│   │  - Gamification           │ │
│   └───────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │  Core Services            │ │
│   │  - AI Coordinator         │ │
│   │  - Google Integration     │ │
│   │  - SwiftData Stack        │ │
│   └───────────────────────────┘ │
└─────────────────┬───────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
    ┌───▼───┐ ┌──▼──┐ ┌───▼────┐
    │OpenAI │ │Claude│ │Apple AI│
    └───┬───┘ └──┬──┘ └───┬────┘
        │        │        │
        └────────┼────────┘
                 │
        ┌────────▼────────┐
        │ Google Services │
        │ Drive/Cal/Gmail │
        └─────────────────┘
```

---

## 💰 Cost Estimation

### Monthly Operating Costs
- OpenAI APIs: $50-150
- Claude API: $20-50
- Google APIs: $0 (free tier)
- **Total**: $70-200/month

### Development
- Solo developer: 18-24 weeks part-time

---

## 🧑‍💻 Development Guidelines

### Code Style
- Follow Swift naming conventions
- Use SwiftUI best practices
- Prioritize readability over cleverness
- Document complex AI interactions

### AI Prompts
- Store prompts in dedicated files (versioned)
- Include Mario's profile in context
- Test across multiple scenarios
- Monitor token usage

### Accessibility
- VoiceOver support for all UI
- Dynamic Type support
- High contrast modes
- Test with accessibility tools

### Testing
- Unit tests for core logic
- Integration tests for AI interactions
- Real-world testing with Mario (most important!)

---

## 🔐 Configuration

### API Keys Setup

1. Copy `Config/APIKeys.example.swift` to `Config/APIKeys.swift`
2. Add your keys:
```swift
enum APIKeys {
    static let openAI = "sk-..."
    static let anthropic = "sk-ant-..."
    static let googleClientID = "..."
}
```
3. Add `APIKeys.swift` to `.gitignore` (already configured)

### Google OAuth Setup

1. Create project in Google Cloud Console
2. Enable Drive, Calendar, and Gmail APIs
3. Configure OAuth consent screen
4. Add URL types in Xcode project settings

---

## 📖 Key Principles

1. **Voice First**: Every feature accessible via voice
2. **Patient & Encouraging**: Never judgmental, always supportive
3. **Simple & Clear**: Minimize cognitive load
4. **Offline Grace**: Core features work without internet
5. **Privacy Focused**: Local processing when possible
6. **Fail Gracefully**: Clear errors, easy recovery

---

## 🤝 Contributing

This is a personal project for Mario's educational needs. If you're building something similar:

1. Check out our planning docs for inspiration
2. Our ADRs explain architectural decisions
3. Feel free to adapt patterns to your use case

---

## 📝 License

TBD - Personal/Educational project

---

## 🙏 Acknowledgments

Built with love for Mario, who inspires us to make technology more accessible and learning more joyful.

Special thanks to:
- OpenAI for GPT-4V and Realtime API
- Anthropic for Claude 3.5 Sonnet
- Apple for Foundation Models and accessibility APIs

---

## 📞 Contact

For questions or feedback: [contact info]

---

**Last Updated**: 2025-10-12
