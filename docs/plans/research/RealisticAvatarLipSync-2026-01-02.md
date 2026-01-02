# Research: Realistic Avatar Lip-Sync for Maestri

**Date:** 2026-01-02
**Status:** Research Complete - Not Implemented
**Goal:** Evaluate tools for realistic talking avatars synchronized with speech (simulating video calls with Socrate, Leonardo, etc.)

---

## Context

ConvergioEdu uses **Azure OpenAI Realtime** for voice (WebSocket bidirectional audio stream). Any avatar solution must work with real-time audio output, not pre-generated TTS with timestamps.

---

## Options Evaluated

### 1. Real-Time Browser-Based (3D Stylized)

| Tool | Type | Cost | Integration |
|------|------|------|-------------|
| **[TalkingHead + HeadAudio](https://github.com/met4citizen/TalkingHead)** | WebGL 3D | Free | HeadAudio does viseme detection from audio stream - works with Azure Realtime |
| **[Wawa-Lipsync](https://wawasensei.dev/tuto/real-time-lipsync-web)** | React Three Fiber | Free | Same approach, optimized for R3F |

**Pros:** Zero backend, real-time (<16ms latency), works with any audio source
**Cons:** 3D stylized avatars, not photorealistic

**Architecture:**
```
Azure OpenAI Realtime (WebSocket)
         ↓ audio output stream
    Web Audio API (AudioContext)
         ↓
    HeadAudio / Wawa-Lipsync
         ↓ viseme data (per frame)
    3D Avatar (Ready Player Me)
         ↓
    WebGL Rendering (Three.js)
```

---

### 2. Photorealistic Batch Generation (Offline)

| Tool | Type | Cost | Requirements |
|------|------|------|--------------|
| **[Duix.Avatar (ex-HeyGem)](https://github.com/duixcom/Duix-Avatar)** | Video synthesis | Free (self-hosted) | NVIDIA GPU (RTX 4070+), 100GB+ storage, Docker |
| **[MuseTalk 1.5](https://github.com/TMElyralab/MuseTalk)** | Video synthesis | Free (MIT) | NVIDIA V100/RTX 3090+ for 30fps |
| **[V-Express](https://github.com/AlibabaAI/V-Express)** (Tencent) | Video synthesis | Free | GPU required |

**Pros:** Photorealistic output, clone appearance from 10s video
**Cons:** Not real-time, requires GPU infrastructure, batch processing only

**Use cases:** Pre-rendered intro videos, session summaries, FAQ responses

---

### 3. Photorealistic Real-Time (SaaS)

| Service | Latency | Free Tier | Pricing |
|---------|---------|-----------|---------|
| **[Duix.com](https://duix.com)** | 200ms TTFB | Unlimited (stock avatars) | See below |
| **[D-ID](https://d-id.com)** | ~500ms | Limited | ~$5.90/min |
| **[HeyGen](https://heygen.com)** | ~500ms | Limited | $99/mo (100 min) |
| **[Synthesia](https://synthesia.io)** | N/A (batch) | None | $22/mo base |

#### Duix.com Pricing (January 2026)

| Plan | Price | Minutes/mo | Custom Avatars |
|------|-------|------------|----------------|
| Free | $0 | Unlimited* | 0 |
| Starter | $29/mo | 150 | 0 |
| Creator | $59/mo | 300 | 3 |
| Scale | $399/mo | 3,000 | 7 |
| Growth | $799/mo | 6,500 | 10 |
| Business | $1,999/mo | 20,000 | 20 |
| Enterprise | $4,999/mo | 60,000 | 50 |

*Free tier uses stock avatars only, not custom Maestri faces

**Integration:** JavaScript/Android/iOS SDKs available. Unknown if supports BYOLLM (bring your own LLM) - may require using their AI backend.

---

### 4. Other Notable Tools

| Tool | Description | Link |
|------|-------------|------|
| **NVIDIA Audio2Face** | Open-sourced Oct 2025, ARKit blendshapes output, emotion detection | [GitHub](https://github.com/NVIDIA/Audio2Face-3D) |
| **NVIDIA Audio2Face NIM** | Microservice version, 30fps, containerized | [NVIDIA NIM](https://build.nvidia.com/nvidia/audio2face-3d) |
| **InfiniteTalk / LongCat** | Unlimited-length video generation (Dec 2025) | [GitHub](https://github.com/MeiGen-AI/InfiniteTalk) |

---

## Recommendation for ConvergioEdu

### Phase 1: MVP (No additional cost)
- Use **TalkingHead + HeadAudio** for real-time lip-sync
- Create stylized 3D avatars of Maestri with Ready Player Me
- Integrate with existing `use-voice-session.ts`

### Phase 2: Hybrid (Medium investment)
- **Duix.Avatar** self-hosted for pre-rendered content (intro videos, summaries)
- Keep 3D avatars for live conversation
- Smooth transition: pre-rendered video → 3D avatar when conversation starts

### Phase 3: Full Photorealism (Higher cost)
- **Duix.com Creator** ($59/mo) for custom Maestri avatars
- 300 min/mo = ~10 min/day average
- Or self-host GPU server for MuseTalk (one-time ~$1500 RTX 4090 or cloud GPU)

---

## Open Questions

1. Does Duix.com support BYOLLM (Azure OpenAI) or forces their AI backend?
2. Can we pipe Azure Realtime audio output → Duix streaming API?
3. Quality comparison: Duix vs MuseTalk for Italian speakers?

---

## Sources

- [TalkingHead GitHub](https://github.com/met4citizen/TalkingHead)
- [Wawa-Lipsync Tutorial](https://wawasensei.dev/tuto/real-time-lipsync-web)
- [Duix.Avatar GitHub](https://github.com/duixcom/Duix-Avatar)
- [Duix.com Pricing](https://www.duix.com/pricing)
- [MuseTalk GitHub](https://github.com/TMElyralab/MuseTalk)
- [NVIDIA Audio2Face Blog](https://developer.nvidia.com/blog/nvidia-open-sources-audio2face-animation-model)
- [Best Open Source Lip-Sync Models 2025](https://www.pixazo.ai/blog/best-open-source-lip-sync-models)
- [HeyGen Alternatives (Hugging Face)](https://huggingface.co/blog/francesca-petracci/heygen-alternatives)
