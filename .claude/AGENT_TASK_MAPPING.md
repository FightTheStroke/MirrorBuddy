# Agent Task Mapping for MirrorBuddy

This document maps each Task Master task to its specialized agent. Use this to know which slash command to invoke for each task.

## How to Use

```bash
# Find the task you want to work on
task-master show $TASK_ID

# Find the assigned agent below
# Execute the agent command
/$AGENT_NAME $TASK_ID
```

---

## Phase 0: Foundation (Weeks 1-2) - BLOCKS ALL

### Foundation Agent
**Command**: `/foundation-agent $TASK_ID`

| Task ID | Title | Status |
|---------|-------|--------|
| 1 | Setup Xcode Project with Required Configurations | ✅ done |
| 2 | Integrate SwiftLint for Code Quality | ✅ done |
| 3 | Define SwiftData Models for Materials | ✅ done |
| 4 | Define SwiftData Models for Subjects | ✅ done |
| 5 | Define SwiftData Models for MindMaps | ✅ done |
| 6 | Define SwiftData Models for Flashcards | ✅ done |
| 7 | Define SwiftData Models for Tasks | ✅ done |
| 8 | Define SwiftData Models for UserProgress | ✅ done |
| 9 | Setup CloudKit Container and Configuration | ✅ done |
| 10 | Implement CloudKit Sync for SwiftData Models | ✅ done |
| 15 | Implement Secure Keychain Storage for API Keys | ⏳ pending |

---

## Phase 1: Core Features (Weeks 3-6) - CAN RUN IN PARALLEL

### API Integration Agent
**Command**: `/api-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 11 | Create OpenAI API Client Infrastructure | ⏳ pending | 1 |
| 12 | Create Google Gemini API Client | ⏳ pending | 1 |
| 13 | Create Google APIs Client for Workspace Integration | ⏳ pending | 1 |
| 14 | Implement API Error Handling and Retry Logic | ⏳ pending | 11,12,13 |
| 16 | Implement Google Drive OAuth 2.0 Login Flow | ⏳ pending | 13,15 |
| 17 | Implement Google Drive File Listing and Monitoring | ⏳ pending | 13,16 |
| 18 | Implement Google Drive File Download | ⏳ pending | 13,16,17 |
| 19 | Implement PDF Text Extraction with VisionKit | ⏳ pending | 18 |
| 20 | Implement Summary Generation with Apple Intelligence | ⏳ pending | 19 |
| 23 | Implement Flashcard Generation with GPT-5 Nano | ⏳ pending | 6,11,19 |
| 24 | Implement Simplified Explanations Generation with GPT-5 Mini | ⏳ pending | 11,19 |
| 25 | Implement Parallel Material Processing Pipeline | ⏳ pending | 19,20,21,22,23,24 |
| 42 | Implement Google Calendar Integration | ⏳ pending | 7,13,16 |
| 43 | Implement Gmail Integration for Assignment Extraction | ⏳ pending | 7,13,16 |

### SwiftUI Expert Agent
**Command**: `/swiftui-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 26 | Create Subject-Organized Dashboard UI | ⏳ pending | 3,4,82,83 |
| 27 | Implement Material Cards UI Component | ⏳ pending | 26 |
| 28 | Implement Material Detail View | ⏳ pending | 3,5,6,26,82,83 |
| 29 | Implement Voice Command System for Navigation | ⏳ pending | 26,28 |
| 32 | Create Voice Conversation UI | ⏳ pending | 31,82 |
| 44 | Create Task List View | ⏳ pending | 7,42,43,82 |
| 45 | Implement Task Detail and Completion UI | ⏳ pending | 7,8,44 |
| 55 | Create Onboarding Flow | ⏳ pending | 16,29,32,35 |
| 56 | Implement Settings and Preferences UI | ⏳ pending | 10,30,33,82,83 |

### Voice Agent
**Command**: `/voice-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 31 | Implement OpenAI Realtime API Integration | ⏳ pending | 11 |
| 33 | Implement Study Coach Personality and Prompting | ⏳ pending | 31,32 |
| 34 | Implement Audio Pipeline for Voice Conversations | ⏳ pending | 31 |

### Vision Agent
**Command**: `/vision-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 35 | Implement Camera Integration for Homework Help | ⏳ pending | 1 |
| 36 | Implement GPT-5 Vision API Integration | ⏳ pending | 11,35 |
| 37 | Create Combined Vision and Voice Interaction | ⏳ pending | 32,33,35,36 |
| 38 | Implement Handwriting Recognition with Apple Pencil | ⏳ pending | 35,36 |

### Mind Map Agent
**Command**: `/mindmap-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 21 | Implement Mind Map Generation with GPT-5 | ⏳ pending | 5,11,19 |
| 22 | Implement DALL-E 3 Image Generation for Mind Map Nodes | ⏳ pending | 11,21 |
| 39 | Create Interactive Mind Map Renderer | ⏳ pending | 5,22 |
| 40 | Implement Mind Map Voice Navigation | ⏳ pending | 29,39 |
| 41 | Implement Mind Map Export Functionality | ⏳ pending | 39 |

### Automation Agent
**Command**: `/automation-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 30 | Implement Push Notification System | ⏳ pending | 17,18,25 |
| 72 | Implement Background Tasks for Scheduled Syncs | ⏳ pending | 17,18,25 |

### SwiftData Agent
**Command**: `/swiftdata-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 10 | Implement CloudKit Sync (with foundation-agent) | ✅ done | 3-9 |
| - | Custom Queries & Predicates | - | 3-8 |
| - | Migrations & Data Validation | - | 3-8 |

---

## Phase 2: Advanced Features & Gamification (Weeks 7-10)

### Multiple Agents (Task-Specific)

| Task ID | Title | Agent | Dependencies |
|---------|-------|-------|--------------|
| 46 | Implement XP and Leveling System | `/swiftui-agent` | 8 |
| 47 | Implement Achievements and Badges System | `/swiftui-agent` | 8,46 |
| 48 | Implement Daily Challenges System | `/swiftui-agent` | 8,46 |
| 49 | Implement Rewards and Customization System | `/swiftui-agent` | 46,47 |
| 50 | Implement Math Mode Specialized Features | `/voice-agent` | 33,36,37 |
| 51 | Implement Italian Mode Specialized Features | `/voice-agent` | 33,36,37 |
| 52 | Implement History Mode Specialized Features | `/voice-agent` | 33,36,37 |
| 53 | Implement Physics/Science Mode Specialized Features | `/voice-agent` | 33,36,37 |
| 54 | Implement Language Mode Specialized Features | `/voice-agent` | 33,36,37 |
| 57 | Implement Offline Mode Functionality | `/api-agent` | 10,20,39 |
| 58 | Implement Error Handling and Recovery UI | `/swiftui-agent` | 14 |
| 59 | Implement Performance Optimization | `/qa-agent` | 25,31,34,39 |
| 78 | Implement Study Time Tracking | `/swiftui-agent` | 46 |
| 79 | Implement Spaced Repetition System for Flashcards | `/swiftdata-agent` | 6,23 |
| 81 | Design and Implement App Icon | `/swiftui-agent` | 1 |

---

## Phase 3: Accessibility & Testing (Weeks 11-12) - HIGH PRIORITY

### Accessibility Agent
**Command**: `/accessibility-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 60 | Conduct Accessibility Audit | ⏳ pending | 26,28,29,32,35,39,44 |
| 73 | Implement Text-to-Speech for All Content | ⏳ pending | 28 |
| 74 | Implement Dyslexia-Friendly Text Rendering | ⏳ pending | 28 |
| 75 | Implement Context Banner for Working Memory Support | ⏳ pending | 26,28,32,44 |
| 76 | Optimize UI for One-Handed Operation | ⏳ pending | 26,28,32,35,39,44 |
| 77 | Implement Large Touch Targets | ⏳ pending | 26,28,32,35,39,44 |

### Test Agent
**Command**: `/test-agent $TASK_ID`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 61 | Implement Unit Tests for Core Functionality | ⏳ pending | 3-13,25,31,36 |
| 62 | Implement Integration Tests | ⏳ pending | 17,18,25,31,36,42,43 |
| 63 | Implement UI Tests | ⏳ pending | 26,28,32,35,39,44,55,56 |
| 64 | Implement Accessibility Tests | ⏳ pending | 60 |
| 65 | Implement Performance Tests | ⏳ pending | 59 |
| 66 | Conduct Real Device Testing | ⏳ pending | 61-65 |

### QA Agent
**Command**: `/qa-agent [task $TASK_ID]`

| Task ID | Title | Status | Dependencies |
|---------|-------|--------|--------------|
| 67 | Update Project README | ⏳ pending | 1 |
| 68 | Create API Documentation | ⏳ pending | 11-13,25,31,36 |
| 69 | Create User Guide | ⏳ pending | 26,28,32,35,39,44,46-48 |
| 70 | Create Developer Notes | ⏳ pending | 1,61-65 |
| 71 | Create Deployment Guide | ⏳ pending | 1 |
| 80 | Prepare for TestFlight Distribution | ⏳ pending | 60-66 |

---

## Quick Reference: Agent Capabilities

| Agent | Primary Responsibilities | Parallel? | Max Concurrent |
|-------|-------------------------|-----------|----------------|
| **foundation-agent** | Infrastructure, models, CloudKit, API clients | ❌ No | 1 |
| **swiftui-agent** | UI/UX, views, components, voice commands | ✅ Yes | 3 |
| **swiftdata-agent** | Queries, migrations, data validation | ✅ Yes | 2 |
| **api-agent** | External APIs, OAuth, material processing | ✅ Yes | 3 |
| **voice-agent** | Realtime API, audio, Study Coach | ✅ Yes | 1 |
| **vision-agent** | Camera, vision API, handwriting | ✅ Yes | 1 |
| **mindmap-agent** | Mind map generation, DALL-E, rendering | ✅ Yes | 1 |
| **automation-agent** | Background tasks, syncs, notifications | ✅ Yes | 1 |
| **test-agent** | All testing types, coverage | ✅ Yes | 5 |
| **accessibility-agent** | VoiceOver, TTS, Mario optimizations | ✅ Yes | 2 |
| **qa-agent** | Code review, architecture validation | ❌ No | 1 |

---

## Orchestration Examples

### Start Development (Week 1)
```bash
# Foundation MUST complete first
/foundation-agent 15    # Complete remaining foundation task
```

### Parallel Development (Week 3-4)
```bash
# Once foundation done, use orchestrator
/orchestrate

# Or manually launch parallel agents:
/api-agent 16          # Google OAuth
/swiftui-agent 26      # Dashboard UI
/voice-agent 31        # Realtime API
/vision-agent 35       # Camera integration
```

### Polish Phase (Week 11)
```bash
/accessibility-agent 60    # Audit everything
/test-agent 61             # Unit tests
/qa-agent                  # Review all code
```

---

**Use `/orchestrate` for automatic parallel coordination based on this mapping! 🎼**
