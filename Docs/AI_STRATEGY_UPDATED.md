# MirrorBuddy - AI Strategy (Updated October 2025)
**Date**: 2025-10-12
**Status**: Updated with latest models

---

## 🎯 Available AI Models (Oct 2025)

### OpenAI GPT-5 Family (Released Aug 2025)

| Model | Input | Output | Context | Best For |
|-------|-------|--------|---------|----------|
| **GPT-5** | $1.25/1M | $10/1M | 272K | Complex reasoning, advanced coding |
| **GPT-5 mini** | $0.25/1M | $2/1M | 272K | General tasks, good quality/cost ratio |
| **GPT-5 nano** | $0.05/1M | $0.40/1M | 272K | Simple tasks, bulk operations |
| **GPT-5 Realtime** | TBD | TBD | - | Voice conversation (bidirectional) |

**Key Features**:
- 74.9% SWE-bench Verified (coding)
- 45% fewer hallucinations than GPT-4o
- 80% fewer hallucinations when reasoning
- Multimodal (text + image input)
- Reasoning effort parameter

### Anthropic Claude 4 Family (Sonnet 4.5 - Sep 2025)

| Model | Input | Output | Context | Best For |
|-------|-------|--------|---------|----------|
| **Sonnet 4.5** | $3/1M | $15/1M | 200K+ | Coding, agents, structured output |
| **Opus 4** | ~$15/1M | ~$75/1M | 200K+ | Most complex tasks (if needed) |
| **Haiku 4** | ~$0.25/1M | ~$1.25/1M | 200K+ | Fast, cost-efficient tasks |

**Key Features**:
- 77.2% SWE-bench (**Best coding model**)
- 30-hour autonomous agent capability
- Cross-conversation memory
- 90% cost savings with prompt caching
- Parallel tool calling
- Excellent instruction following

### Google Gemini 2.5 Pro

| Model | Input | Output | Context | Best For |
|-------|-------|--------|---------|----------|
| **Gemini 2.5 Pro** | $1.25/1M | $5/1M | 2M | Long documents, Google integration |
| **Gemini 2.5 Flash** | $0.075/1M | $0.30/1M | 1M | Fast, cost-efficient reasoning |

**Key Features**:
- **Native Google Drive/Gmail integration**
- Deep Research across Google Workspace
- Summarize entire folders automatically
- 2M context window (Pro)
- State-of-the-art reasoning

### Google NotebookLM (Free/Included)

**Key Features**:
- ✅ **Audio Overviews** (AI hosts discuss content)
- ✅ **Video Overviews** (visual presentations)
- ✅ **Learning Guide** (personalized tutoring)
- ✅ **Auto-generate**: Flashcards, quizzes, study guides
- ✅ 80+ languages support
- ✅ Supports: PDFs, audio, YouTube, handwritten notes
- ✅ **FREE** (included with Google account)

---

## 💰 Cost Optimization Strategy

### Pricing Comparison (per 1M tokens)

| Task Type | Best Model | Input Cost | Output Cost | Est. Monthly |
|-----------|-----------|------------|-------------|--------------|
| **Simple Q&A** | GPT-5 nano | $0.05 | $0.40 | $5-10 |
| **General tasks** | GPT-5 mini | $0.25 | $2.00 | $15-25 |
| **Voice conversation** | GPT-5 Realtime | TBD | TBD | $30-50 |
| **Coding/agents** | Claude Sonnet 4.5 | $3.00 | $15.00 | $20-40 |
| **Mind maps** | Claude Sonnet 4.5 (cached) | $0.30 | $15.00 | $10-15 |
| **Google Drive** | Gemini 2.5 Pro | $1.25 | $5.00 | $10-20 |
| **Study materials** | NotebookLM | FREE | FREE | $0 |

**Estimated Total**: $90-160/month (vs. $70-200 previous estimate)

---

## 🎯 Optimal Model Assignment (Updated)

### 1. Material Processing & Summarization

**Primary**: **NotebookLM** (FREE!)
- Upload PDFs/materials from Google Drive
- Auto-generate study guides, summaries, flashcards
- Create Audio Overviews (AI discusses content)
- Learning Guide for personalized tutoring

**Fallback**: **Gemini 2.5 Flash** ($0.075/$0.30)
- If NotebookLM limitations hit
- Native Google Drive integration
- Fast and cheap

**Why**: NotebookLM is FREE and specifically designed for educational content. Perfect for Mario!

---

### 2. Voice Conversation (Study Coach)

**Primary**: **GPT-5 Realtime API**
- Real-time bidirectional conversation
- Low latency (<1s)
- Natural interruptions
- Best voice experience

**Fallback**: **Apple Speech Framework** (offline)
- On-device, works offline
- Basic Q&A with Apple Intelligence

**Why**: GPT-5 Realtime is still the best for natural voice interaction.

---

### 3. Vision (Homework Help - Camera)

**Primary**: **GPT-5 mini** ($0.25/$2)
- 60% cheaper than GPT-4o
- Good vision capabilities
- Multimodal (text + image)

**Upgrade if needed**: **GPT-5** ($1.25/$10)
- Only for very complex problems
- Better reasoning

**Why**: GPT-5 mini is excellent quality/cost ratio for vision tasks.

---

### 4. Mind Map Generation

**Primary**: **Claude Sonnet 4.5** with Prompt Caching ($0.30/$15)
- Best at structured output (JSON)
- 90% cost savings with caching
- Excellent instruction following

**Implementation**:
```
System prompt (cached): "You are a mind map generator for students
with dyslexia. Always use simple language, visual hierarchies..."

User prompt: "Create mind map for this text: [material]"
```

**Why**: With caching, extremely cost-effective. Best structured output.

---

### 5. Task Breakdown & Planning

**Primary**: **Claude Sonnet 4.5** ($3/$15)
- Excellent planning and decomposition
- 77.2% SWE-bench (best reasoning)
- Can work autonomously for hours

**Fallback**: **GPT-5 mini** ($0.25/$2)
- Good enough for simpler tasks
- Much cheaper

**Why**: Claude excels at breaking down complex assignments into steps.

---

### 6. Math Problem Solving

**Step 1**: **GPT-5 mini** vision ($0.25/$2) → extract equation
**Step 2**: **GPT-5 nano** ($0.05/$0.40) → solve if simple
**Step 3**: **GPT-5** ($1.25/$10) → solve if complex
**Step 4**: **GPT-5 Realtime** → explain vocally step-by-step

**Why**: Multi-stage approach optimizes costs while maintaining quality.

---

### 7. Google Drive/Calendar/Gmail Integration

**Primary**: **Gemini 2.5 Pro** ($1.25/$5)
- Native Google Workspace integration
- Deep Research across Drive/Gmail
- Summarize entire folders
- Parse emails for assignments

**Why**: Built-in Google integration is much simpler than using APIs manually.

---

### 8. Text Simplification (On-device)

**Primary**: **Apple Intelligence** (FREE, local)
- Fast, works offline
- Privacy-friendly
- Good for simple rewriting

**Fallback**: **GPT-5 nano** ($0.05/$0.40)
- Only when more quality needed

**Why**: On-device is instant and free.

---

### 9. Coaching Personality & Motivation

**Primary**: **GPT-5 Realtime** (voice)
- Maintains consistent personality
- Natural, encouraging tone
- Real-time emotional support

**Text-based**: **GPT-5 mini** ($0.25/$2)
- For written encouragement
- Progress updates

**Why**: Voice personality is critical for engagement.

---

## 🚀 Revolutionary Use of NotebookLM

### How MirrorBuddy Uses NotebookLM

1. **Material Upload Automation**
   - When teacher uploads to Google Drive
   - MirrorBuddy auto-adds to NotebookLM notebook
   - NotebookLM processes in background

2. **Auto-Generate Study Content**
   - **Audio Overview**: "Listen to AI discuss this chapter"
   - **Video Overview**: Visual presentation of key concepts
   - **Study Guide**: Auto-generated from materials
   - **Flashcards**: For spaced repetition
   - **Quiz**: Test understanding

3. **Learning Guide Integration**
   - Mario asks questions via MirrorBuddy
   - NotebookLM provides personalized tutoring
   - Adapts to his comprehension level

4. **Multi-Format Support**
   - PDFs from teachers
   - Handwritten notes (scanned)
   - Class recordings (audio)
   - YouTube educational videos

### Example Flow

```
1. Teacher uploads "Capitolo_5_Fisica.pdf" to Google Drive
2. MirrorBuddy detects new file
3. Uploads to NotebookLM notebook "Fisica - Mario"
4. NotebookLM auto-generates:
   - 10-minute Audio Overview (Italian)
   - Study guide with key concepts
   - 15 flashcards
   - 5-question quiz
5. MirrorBuddy UI shows:
   - "New material: Physics Chapter 5"
   - [Listen to AI Discussion] (Audio Overview)
   - [Watch Video] (Video Overview)
   - [Study Guide] [Flashcards] [Quiz]
6. Mario: "I don't understand friction"
7. NotebookLM Learning Guide explains with examples
```

**Cost**: $0 (NotebookLM is FREE!)

---

## 📊 Cost Optimization Techniques

### 1. Tiered Model Selection
```swift
func selectModel(for taskComplexity: TaskComplexity) -> AIModel {
    switch taskComplexity {
    case .simple:
        return .gpt5Nano // $0.05/$0.40
    case .medium:
        return .gpt5Mini // $0.25/$2.00
    case .complex:
        return .gpt5 // $1.25/$10.00
    case .coding:
        return .claudeSonnet45 // $3/$15 (but best quality)
    case .free:
        return .notebookLM // FREE!
    }
}
```

### 2. Prompt Caching (Claude)
- Cache system prompts (Mario's profile, coaching style)
- 90% cost savings on repeated contexts
- Example: Mind map generation system prompt cached

```swift
// Cached once (full price)
System: "You're a mind map generator for Mario (dyslexia, limited working memory)..."

// Subsequent calls (10% price!)
User: "Create mind map for this new chapter"
```

### 3. Local-First with Cloud Enhancement
```
Simple task? → Apple Intelligence (FREE, local)
Complex task? → Cloud AI (GPT-5 mini/nano)
Critical task? → Best model (GPT-5 or Claude Sonnet 4.5)
```

### 4. Batch Processing
- Process multiple materials overnight (cheaper batch rates)
- Generate all flashcards at once
- Use NotebookLM for bulk material processing (FREE)

### 5. Smart Caching
- Cache AI-generated mind maps locally
- Cache simplified texts
- Cache flashcards and study guides
- Only regenerate if source material changes

---

## 🎯 Updated Architecture Diagram

```
┌─────────────────────────────────────────────┐
│       MirrorBuddy (Swift/SwiftUI)           │
│                                             │
│  [Material Manager] [Voice Coach] [Tasks]  │
│  [Mind Maps] [Camera] [Gamification]       │
│                                             │
│         SwiftData + CloudKit                │
└────────────┬────────────────────────────────┘
             │
    ┌────────┼────────┬────────────┬──────────┐
    │        │        │            │          │
┌───▼───┐ ┌─▼──┐ ┌───▼────┐ ┌─────▼─────┐ ┌─▼─────┐
│ GPT-5 │ │GPT5│ │ Claude │ │  Gemini   │ │Notebok│
│  Full │ │mini│ │Sonnet  │ │  2.5 Pro  │ │  LM   │
│       │ │nano│ │  4.5   │ │           │ │ (FREE)│
└───┬───┘ └─┬──┘ └───┬────┘ └─────┬─────┘ └─┬─────┘
    │       │        │            │          │
    │       │        │            │          │
    │ Voice │Vision  │Mind Maps   │Google    │Study
    │ Chat  │Help    │Coding      │Drive     │Content
    │       │        │Planning    │Calendar  │Audio
    │       │        │            │Gmail     │Video
    └───────┴────────┴────────────┴──────────┴───────┘
                             │
                    ┌────────▼─────────┐
                    │ Google Workspace │
                    │ Drive/Cal/Gmail  │
                    └──────────────────┘
```

---

## 🔥 Key Insights & Recommendations

### 1. ✅ Use NotebookLM Extensively (FREE!)
**Impact**: Eliminates 30-40% of planned AI costs

NotebookLM can handle:
- Material summarization
- Study guide generation
- Audio/Video Overviews
- Flashcards and quizzes
- Personalized tutoring

**Action**: Build NotebookLM integration FIRST (Phase 1)

---

### 2. ✅ GPT-5 nano for Simple Tasks
**Impact**: 20x cheaper than GPT-5 ($0.05 vs $1.25 input)

Use for:
- Simple Q&A
- Text classification
- Basic summarization
- Status updates

**Action**: Implement smart model selection based on task complexity

---

### 3. ✅ Claude Sonnet 4.5 with Caching
**Impact**: 90% cost reduction on repeated prompts

Use for:
- Mind map generation (cached system prompt)
- Task breakdown (cached instructions)
- Subject-specific coaching (cached personality)

**Action**: Design prompts for maximum cache reuse

---

### 4. ✅ Gemini for Google Integration
**Impact**: Simpler integration, fewer API calls

Use for:
- Google Drive folder monitoring
- Email parsing for assignments
- Calendar sync and smart reminders
- Deep Research across workspace

**Action**: Use Gemini as "Google Workspace coordinator"

---

### 5. ✅ GPT-5 mini as Workhorse
**Impact**: Best quality/cost ratio for most tasks

Use for:
- Vision (homework help)
- General conversation
- Text processing
- Material transformation

**Action**: Default to GPT-5 mini, upgrade to full GPT-5 only when needed

---

## 📋 Implementation Priorities

### Phase 1: Foundation (FREE/Cheap)
1. **NotebookLM Integration** (FREE)
   - Auto-upload materials
   - Generate study content
   - Audio/Video Overviews
2. **Apple Intelligence** (FREE)
   - Text simplification
   - Basic Q&A offline
3. **GPT-5 nano** ($0.05/$0.40)
   - Simple tasks
   - Text classification

**Estimated Cost Phase 1**: $5-15/month

### Phase 2: Core Features (Moderate)
4. **GPT-5 mini** ($0.25/$2)
   - Vision for homework
   - General conversation
5. **Gemini 2.5 Pro** ($1.25/$5)
   - Google Workspace integration
6. **Claude Sonnet 4.5 (cached)** ($0.30/$15)
   - Mind map generation

**Estimated Cost Phase 2**: $40-70/month

### Phase 3: Premium Features (Expensive)
7. **GPT-5 Realtime**
   - Voice conversation
8. **GPT-5 full** ($1.25/$10)
   - Complex reasoning only
9. **Claude Sonnet 4.5 uncached** ($3/$15)
   - Agent-based features

**Estimated Cost Phase 3**: $90-160/month

---

## 🎯 Decision Matrix

| Feature | Free Option | Budget Option | Premium Option | Recommended |
|---------|-------------|---------------|----------------|-------------|
| **Material Summaries** | NotebookLM | Gemini 2.5 Flash | GPT-5 | **NotebookLM** |
| **Audio Lessons** | NotebookLM | - | GPT-5 Realtime | **NotebookLM** |
| **Flashcards** | NotebookLM | GPT-5 nano | GPT-5 mini | **NotebookLM** |
| **Voice Chat** | Apple Speech | - | GPT-5 Realtime | **GPT-5 Realtime** |
| **Vision (Homework)** | - | GPT-5 mini | GPT-5 | **GPT-5 mini** |
| **Mind Maps** | - | Claude cached | Claude uncached | **Claude cached** |
| **Google Drive** | Gemini 2.5 Flash | Gemini 2.5 Pro | - | **Gemini 2.5 Pro** |
| **Task Planning** | GPT-5 nano | GPT-5 mini | Claude Sonnet 4.5 | **GPT-5 mini** |
| **Text Simplify** | Apple Intelligence | GPT-5 nano | GPT-5 mini | **Apple Intelligence** |

---

## ✅ Final Recommendations

### Immediate Actions

1. **Setup NotebookLM** → Biggest cost saver, perfect for Mario
2. **Get Gemini 2.5 Pro API** → Google integration is gold
3. **Use GPT-5 mini** → Best workhorse model
4. **Implement Claude caching** → 90% savings on mind maps
5. **Reserve GPT-5 full** → Only for truly complex tasks

### Cost Targets

- **Month 1 (prototyping)**: $30-50
- **Month 2-3 (development)**: $60-100
- **Steady state (Mario using)**: $90-160/month

### Quality Metrics

- NotebookLM Audio Overviews quality: Monitor Mario's engagement
- GPT-5 mini vision accuracy: >90% on homework help
- Claude mind map usefulness: Mario's feedback
- Gemini Google integration: Reliability and speed

---

**This strategy balances COST, QUALITY, and SIMPLICITY perfectly for Mario's needs.**

**Last Updated**: 2025-10-12
