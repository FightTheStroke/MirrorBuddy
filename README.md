# MirrorBuddy 🎓✨

**Your AI Learning Companion - Insegnante di Sostegno Personale**

MirrorBuddy is more than a study app — it's a complete AI-powered learning companion designed to be a personal tutor, friend, and support system for students, especially those with learning differences like dyslexia.

---

## 🌟 Vision & Mission

### Vision
Transform learning for every student by providing an empathetic, patient, and always-available AI tutor that makes education accessible, engaging, and personalized.

### Mission
**MirrorBuddy è un vero e proprio insegnante di sostegno** - a dedicated support teacher powered by AI that:

- 📚 **Organizes all study materials** from Google Drive, Gmail, and Calendar
- 🗣️ **Speaks and listens** in natural Italian conversations
- 🧠 **Creates visual mind maps** from any document or lesson
- 📸 **Helps with homework** using camera and AI vision
- 🎯 **Encourages reading and learning** even when things are difficult
- 💬 **Is always there** - not just for homework, but as a friend to talk to about anything

---

## 🚀 **Project Status**

**Current Phase**: ✅ Core Features Implemented - Active Development  
**Last Updated**: October 15, 2025  
**Target Launch**: Q1 2026  

### Recently Completed ✅
- **"Aggiornami" One-Button Sync** (October 2025)
- **Multi-Format Document Support** with OCR (October 2025)
- **Document Scanner** with VisionKit (October 2025)
- **OpenDyslexic Font Integration** (October 2025)
- **Unified API Keys Management** (October 2025)

---

## ✨ Implemented Features

### 🔄 One-Button Sync ("Aggiornami")
Press one big button to:
- ✅ Sync new documents from Google Drive (PDFs + images)
- ✅ Check emails from teachers for assignments
- ✅ Import calendar events and deadlines
- ✅ Auto-generate mind maps for new materials
- ✅ Get a summary: "3 new documents, 2 tasks, 3 mind maps created"

**Implementation**: `UpdateManager.swift` + `UpdateButtonView.swift`  
**Status**: ✅ **Fully Implemented** (October 15, 2025)

### 📸 Multi-Format Document Support
- ✅ Import PDFs, images (PNG, JPG, HEIC) from Google Drive
- ✅ Import from local file system
- ✅ **Automatic OCR** with Vision framework
- ✅ Extract text from images, even handwritten notes
- ✅ Italian + English text recognition
- ✅ All materials ready for mind map generation

**Implementation**: `OCRService.swift` + `MaterialImportView.swift`  
**Status**: ✅ **Fully Implemented** (October 15, 2025)

### 📷 Document Scanner
- ✅ Scan paper documents with camera
- ✅ Auto-crop and enhance quality (VisionKit)
- ✅ Multi-page scanning in one session
- ✅ Automatic OCR after scanning
- ✅ Save as Material for instant study

**Implementation**: `DocumentScannerView.swift`  
**Status**: ✅ **Fully Implemented** (October 15, 2025)

### 🔤 Accessibility: OpenDyslexic Font
- ✅ OpenDyslexic font integrated (all variants)
- ✅ Applied as default throughout the app
- ✅ Large, readable text (minimum 18pt)
- ✅ Optimized for dyslexic users

**Implementation**: `Font+OpenDyslexic.swift`  
**Status**: ✅ **Fully Implemented** (October 15, 2025)

### 🔐 Unified API Keys Management
- ✅ Single `APIKeys-Info.plist` for all credentials
- ✅ OpenAI, Anthropic, Google OAuth all in one file
- ✅ Protected by `.gitignore`
- ✅ Easy setup with `.example` template

**Files**: `APIKeys-Info.plist`, `APIKeysConfig.swift`, `GoogleOAuthConfig.swift`  
**Status**: ✅ **Fully Implemented** (October 15, 2025)

### 🗣️ Voice Conversation (Italian)
- ✅ Natural conversations in Italian
- ✅ Real-time audio with OpenAI Realtime API
- ✅ Patient, empathetic tone
- ✅ "Aiutami con questo esercizio" triggers help

**Status**: ✅ **Implemented**

### 📬 Google Integrations
- ✅ Google Drive file sync
- ✅ Gmail assignment extraction
- ✅ Calendar event import
- ✅ OAuth 2.0 authentication
- ✅ Background sync scheduling

**Status**: ✅ **Implemented**

---

## 🚧 In Development

### 🧠 Improved Mind Maps (Phase 2)
- [ ] Mobile-optimized layout (vertical scrolling)
- [ ] Large fonts (18pt minimum)
- [ ] Tap to expand/collapse nodes
- [ ] Pinch to zoom
- [ ] Color-coded by subject
- [ ] Breadcrumb navigation

**Priority**: HIGH - Next Sprint

### 🎙️ Extended Voice Recording (Phase 2)
- [ ] 6-hour continuous recording for classroom lessons
- [ ] Background recording (screen can lock)
- [ ] Auto-save every 30 minutes
- [ ] Compression (AAC format, ~500MB for 6h)
- [ ] Upload to Google Drive for backup

**Priority**: HIGH - Phase 2

### 📝 Auto-Transcription (Phase 2)
- [ ] Whisper API integration (Italian)
- [ ] Process in chunks (30 min intervals)
- [ ] Subject detection from keywords
- [ ] Link transcripts to materials
- [ ] Manual subject correction option

**Priority**: HIGH - Phase 2

---

## 🔮 Planned Features

### 📸 Screen Capture + GPT-4 Vision (Phase 3)
- [ ] Capture homework from screen/camera
- [ ] GPT-4 Vision analysis of math problems, diagrams
- [ ] Voice-guided step-by-step solutions
- [ ] iPad Pencil annotations support

### 🗺️ Mind Maps from Lesson Transcripts (Phase 3)
- [ ] Auto-generate mind maps from recorded lessons
- [ ] Extract key concepts, definitions, examples
- [ ] Visual hierarchy with color coding
- [ ] Review assistant: "Cosa ho imparato oggi?"

### 🎯 Personalized Learning Path (Phase 3)
- [ ] Track progress over time
- [ ] Identify strengths and challenges
- [ ] Suggest review topics
- [ ] Adaptive difficulty

---

## 📋 Technical Stack

### Frontend
- **SwiftUI** - Modern iOS UI framework
- **SwiftData** - Local persistence + iCloud sync (CloudKit)
- **Vision Framework** - OCR for images
- **VisionKit** - Document scanning
- **AVFoundation** - Audio recording
- **PDFKit** - PDF rendering

### AI Services
- **OpenAI API**:
  - GPT-4/GPT-4o for summaries and explanations
  - Whisper for audio transcription
  - Realtime API for voice conversations
  - Vision API for image analysis
- **Anthropic Claude** (optional):
  - Alternative to GPT-4 for text generation
- **Google APIs**:
  - Drive API for document sync
  - Gmail API for assignment extraction
  - Calendar API for event management

### Backend
- **CloudKit** - iCloud sync across devices
- **Background Tasks** - Scheduled syncing
- **Keychain** - Secure token storage

---

## 🔧 Setup & Installation

### Prerequisites
- **Xcode 15+**
- **iOS 17+** / **iPadOS 17+**
- **Apple Developer Account** (for CloudKit)
- **Google Cloud Project** (for Drive/Gmail/Calendar)
- **OpenAI API key** (required)
- **Anthropic API key** (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/MirrorBuddy.git
   cd MirrorBuddy
   ```

2. **Setup API Keys** (IMPORTANT)
   ```bash
   # Copy example file
   cp MirrorBuddy/Resources/APIKeys-Info.plist.example \
      MirrorBuddy/Resources/APIKeys-Info.plist
   ```

   Edit `APIKeys-Info.plist` with your keys:
   ```xml
   <key>OPENAI_API_KEY</key>
   <string>sk-proj-YOUR_OPENAI_KEY</string>
   
   <key>GOOGLE_CLIENT_ID</key>
   <string>YOUR_CLIENT_ID.apps.googleusercontent.com</string>
   
   <key>GOOGLE_REVERSED_CLIENT_ID</key>
   <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
   ```

   **Where to get keys**:
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/account/keys
   - Google OAuth: See [docs/GOOGLE_SETUP_COMPLETE.md](docs/GOOGLE_SETUP_COMPLETE.md)

3. **Configure Google OAuth**

   Follow the step-by-step guide: **[docs/GOOGLE_SETUP_COMPLETE.md](docs/GOOGLE_SETUP_COMPLETE.md)**

4. **Build and Run**
   ```bash
   open MirrorBuddy.xcodeproj
   # Select your device or simulator
   # Press Cmd+R to build and run
   ```

5. **Test "Aggiornami" Button**
   - Launch app
   - Go to Settings → Connect Google Drive
   - Sign in with Google
   - Return to Dashboard
   - Press big "Aggiornami" button
   - Watch automatic sync in action!

---

## 📖 Documentation

### **Essential Guides**
- **[docs/GOOGLE_SETUP_COMPLETE.md](docs/GOOGLE_SETUP_COMPLETE.md)** - Complete Google OAuth setup
- **[docs/API_KEYS_SETUP.md](docs/API_KEYS_SETUP.md)** - OpenAI, Anthropic, Gemini keys
- **[GOOGLE_API_SETUP.md](GOOGLE_API_SETUP.md)** - Fix 403 API errors

### **Architecture & Planning**
- **[Docs/FINAL_BRIEFING.md](Docs/FINAL_BRIEFING.md)** - Project summary & action plan
- **[Docs/STACK_FINAL.md](Docs/STACK_FINAL.md)** - Technology stack
- **[Docs/ADR/](Docs/ADR/)** - Architectural Decision Records
- **[.taskmaster/docs/new-features-prd.txt](.taskmaster/docs/new-features-prd.txt)** - Product Requirements

### **Development**
- **[Docs/NEXT_STEPS.md](Docs/NEXT_STEPS.md)** - Development roadmap
- **[Docs/ExecutionPlan.md](Docs/ExecutionPlan.md)** - Backlog & tracking

---

## 🎯 Core Philosophy

### 🧠 Accessibility First
- **OpenDyslexic font** by default
- Large, readable text (minimum 18pt)
- High contrast colors
- Simple, child-friendly UI
- Voice-first interaction option
- One-handed operation support

### 💙 Empathetic Design

All interactions follow these principles:

✅ **Patient**: "Va bene Mario, prendiamola con calma. Guardiamo questo esercizio insieme."

✅ **Encouraging**: "Bravo Mario! L'hai capito perfettamente. Vuoi provare il prossimo?"

✅ **Understanding**: "Capisco che può essere difficile. Facciamo un passo alla volta."

✅ **Supportive**: "Hai già fatto progressi! Ricordi quando trovavi anche questo difficile?"

✅ **Conversational**: Can discuss any topic, not just school subjects

✅ **Reading Encouragement**: Suggests books, reads together

❌ **Never**:
- ❌ "Devi finire questo compito" → ✅ "Mario, quando vuoi possiamo lavorare insieme su questo compito"
- ❌ "Errore: risposta sbagliata" → ✅ "Va bene Mario, proviamo insieme in un altro modo"
- ❌ Rushing, pressuring, or judging

### 🔐 Privacy & Security
- **Local-first** - All data stays on device or in your iCloud
- **No analytics** - We don't track or collect usage data
- **API keys secured** - Stored locally in ignored files
- **Credentials protected** - Comprehensive `.gitignore`
- **Open source** - Transparent about what we do with your data

---

## 🛠️ File Structure

```
MirrorBuddy/
├── App/
│   └── MirrorBuddyApp.swift           # App entry point
├── Core/
│   ├── API/                            # AI service clients
│   │   └── OpenAI/
│   ├── Config/                         # Configuration
│   │   └── APIKeysConfig.swift         # Loads from plist
│   ├── Extensions/
│   │   └── Font+OpenDyslexic.swift     # Font extensions
│   ├── Services/
│   │   ├── UpdateManager.swift         # "Aggiornami" orchestrator
│   │   ├── OCRService.swift            # Image text extraction
│   │   ├── GoogleOAuthService.swift    # OAuth flow
│   │   ├── GmailService.swift          # Email sync
│   │   └── GoogleCalendarService.swift # Calendar sync
│   └── Models/                         # SwiftData models
├── Features/
│   ├── Dashboard/
│   │   └── Views/
│   │       ├── MainTabView.swift       # Main UI
│   │       └── UpdateButtonView.swift  # "Aggiornami" button
│   ├── Materials/
│   │   └── Views/
│   │       ├── MaterialImportView.swift    # Import UI
│   │       └── DocumentScannerView.swift   # Scanner
│   ├── Settings/                       # Settings screens
│   └── Voice/                          # Voice coach
├── Resources/
│   ├── Fonts/
│   │   └── OpenDyslexic-*.otf          # Dyslexia-friendly fonts
│   └── APIKeys-Info.plist              # ⚠️ NOT in Git (your keys)
└── docs/                               # Documentation
    ├── GOOGLE_SETUP_COMPLETE.md
    └── API_KEYS_SETUP.md
```

---

## 🚀 Development Roadmap

### ✅ Phase 1 - Foundation (COMPLETED)
- [x] SwiftUI + SwiftData + CloudKit setup
- [x] Google Drive/Gmail/Calendar integration
- [x] OAuth 2.0 authentication
- [x] "Aggiornami" one-button sync
- [x] Multi-format document support (PDFs + images)
- [x] OCR with Vision framework
- [x] Document scanner with VisionKit
- [x] OpenDyslexic font integration
- [x] Unified API keys management
- [x] Voice conversation (Italian)

### 🚧 Phase 2 - Advanced Features (IN PROGRESS)
- [ ] Improved mind maps (mobile-optimized)
- [ ] Extended voice recording (6 hours)
- [ ] Auto-transcription with Whisper
- [ ] Subject detection from transcripts
- [ ] Lesson summaries

### 🔮 Phase 3 - Vision & Intelligence (PLANNED)
- [ ] Screen capture + GPT-4 Vision
- [ ] Live homework help with camera
- [ ] Mind maps from lesson transcripts
- [ ] Review assistant and quiz generation

### 🎯 Phase 4 - Personalization (FUTURE)
- [ ] Personalized learning paths
- [ ] Progress tracking over time
- [ ] Reading recommendations
- [ ] Adaptive difficulty

---

## 💰 Estimated Costs

### Monthly Operating Costs (per active user)
- **OpenAI APIs**: $50-150/month
  - GPT-4: ~$0.03 per 1K tokens
  - Whisper: ~$0.006 per minute
  - Realtime API: ~$0.06 per minute
- **Anthropic (optional)**: $20-50/month
- **Google APIs**: $0 (free tier sufficient)
- **Apple CloudKit**: $0 (free with Apple ID)

**Total**: ~$70-200/month per heavy user

### Development
- Solo developer: 18-24 weeks (part-time)
- With AI agents (Cursor, Claude Code): 6-8 weeks

---

## 🤝 Contributing

We welcome contributions that align with our mission to make learning accessible!

### Priority Areas
1. ✅ Improving mind map visualization for mobile
2. 🎙️ Extending voice recording capacity
3. 🔤 Enhancing OCR accuracy for Italian handwriting
4. 💬 Adding more empathetic voice responses
5. ♿ UI/UX improvements for accessibility

### Guidelines
- Follow Swift style guide
- Maintain accessibility standards
- Test on real devices
- Write patient, clear error messages
- Use OpenDyslexic font for new UI elements
- Document AI prompts and interactions

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- **OpenDyslexic** - Font for improved dyslexic readability
- **OpenAI** - GPT-4, Whisper, Realtime API
- **Anthropic** - Claude for AI capabilities
- **Apple** - Vision Framework, VisionKit, CloudKit
- **Google** - Drive, Gmail, Calendar APIs

---

## 💬 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/your-org/MirrorBuddy/issues)
- **Documentation**: [docs/](docs/)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/MirrorBuddy/discussions)

---

**MirrorBuddy** - Your personal AI learning companion 🎓✨

*"Learning should be accessible, engaging, and empathetic for every student."*

---

**Last Updated**: October 15, 2025
