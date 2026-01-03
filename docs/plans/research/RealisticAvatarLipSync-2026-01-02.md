# Research: Realistic Avatar Lip-Sync for Maestri

**Date:** 2026-01-02
**Status:** Research Complete - Not Implemented
**Goal:** Evaluate tools for realistic talking avatars synchronized with speech (simulating video calls with Socrate, Leonardo, etc.)

---

## Context

MirrorBuddy uses **Azure OpenAI Realtime** for voice (WebSocket bidirectional audio stream). Any avatar solution must work with real-time audio output, not pre-generated TTS with timestamps.

---

## TOP PICKS - Build Your Own "Duix" (Commercial License OK)

These are the best candidates for building a proprietary avatar system for the Maestri:

| Model | License | Commercial | GPU | Real-Time | Quality | Source |
|-------|---------|------------|-----|-----------|---------|--------|
| **[LatentSync 1.6](https://github.com/bytedance/LatentSync)** | Apache 2.0 | YES | 8-18GB | Near-RT | Excellent | ByteDance |
| **[EchoMimicV2](https://github.com/antgroup/echomimic_v2)** | Apache 2.0 | YES | 16-24GB | No | Excellent | CVPR 2025 |
| **[EchoMimicV3](https://github.com/antgroup/echomimic_v3)** | Apache 2.0 | YES | 24GB+ | No | State-of-art | AAAI 2026 |
| **[MuseTalk 1.5](https://github.com/TMElyralab/MuseTalk)** | MIT | YES | V100/3090 | YES 30fps | Very Good | Tencent |
| **[LivePortrait](https://github.com/KwaiVGI/LivePortrait)** | MIT* | YES* | CUDA | Near-RT | Very Good | Kuaishou |
| **[GeneFace++](https://github.com/yerfor/GeneFacePlusPlus)** | MIT | YES | 3090/A100 | YES 45fps | Excellent | NeRF-based |
| **[SadTalker](https://github.com/OpenTalker/SadTalker)** | Apache 2.0 | YES | Moderate | No | Good | CVPR 2023 |
| **[Hallo2](https://github.com/fudan-generative-vision/hallo2)** | Mixed* | Check | A100 | No | Excellent | ICLR 2025 |

*LivePortrait: MIT code but InsightFace dependency is non-commercial. **Replace with MediaPipe for commercial use.**
*Hallo2: Uses CodeFormer (S-Lab License 1.0) - verify terms before commercial use.

### NOT Commercial (Research Only)

| Model | License | Note |
|-------|---------|------|
| **[FLOAT](https://github.com/deepbrainai-research/float)** | CC BY-NC-ND 4.0 | Contact daniel@deepbrain.io for commercial |

### Best for Real-Time (Live Conversation)

For Azure OpenAI Realtime integration, only these support true real-time:
- **MuseTalk 1.5**: 30fps on V100, single-step inpainting (not diffusion)
- **GeneFace++**: 45-60fps, NeRF-based 3D face model

### Best for Quality (Near-Real-Time with Buffering)

- **LatentSync 1.6**: 512x512 resolution, Apache 2.0, diffusion-based
- **EchoMimicV3**: 1.3B params, competes with 10B+ models, semi-body animation

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

## Recommendation for MirrorBuddy

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

## Build Your Own "MirrorBuddyAvatar"

### Architecture for Real-Time Pipeline

```
Azure OpenAI Realtime (WebSocket)
         ↓ audio chunks (streaming)
    Audio Buffer (500ms)
         ↓
    MuseTalk / GeneFace++ (GPU Server)
         ↓ video frames (30-60fps)
    WebRTC Stream
         ↓
    Browser (video element)
```

**Latency:** ~500-800ms (acceptable for conversation)
**Cost:** GPU server (~$0.50-2/hr cloud or RTX 4090 one-time ~$1500)

### Steps to Build

1. **Generate Maestri faces**: Use Stable Diffusion or licensed images
2. **Fine-tune model**: Train on Maestri faces (10-30s video each)
3. **Deploy GPU server**: RTX 4090 local or cloud (RunPod, Lambda Labs)
4. **Build streaming layer**: WebRTC + FastAPI/Node wrapper
5. **Integrate with frontend**: Connect to `use-voice-session.ts`

### Hardware Requirements

| Model | Min GPU | Recommended | Real-Time |
|-------|---------|-------------|-----------|
| MuseTalk 1.5 | RTX 3090 (24GB) | V100 (32GB) | YES |
| GeneFace++ | RTX 3090 (24GB) | A100 (40GB) | YES |
| LatentSync 1.6 | RTX 3090 (24GB) | A100 (40GB) | Near-RT |
| EchoMimicV3 | RTX 4090 (24GB) | A100 (80GB) | No |

**Mac M3 Max (36GB):** Can run MuseTalk/GeneFace++ with MPS, slower but OK for testing.

---

## Recent Research (2025-2026)

| Paper | Conference | Innovation |
|-------|------------|------------|
| KeyFace | CVPR 2025 | Keyframe-based long sequences via SVD |
| EchoMimicV2 | CVPR 2025 | Semi-body animation |
| EchoMimicV3 | AAAI 2026 | Unified multi-modal, 1.3B params |
| Hallo2 | ICLR 2025 | Long-duration, high-resolution |
| FLOAT | ICCV 2025 | Flow matching, faster than diffusion |
| GaussianSpeech | ICCV 2025 | 3D Gaussian avatars |
| Audio-Driven RT Facial | SIGGRAPH Asia 2025 | <15ms latency, VR-ready |

---

## Open Questions

1. Does Duix.com support BYOLLM (Azure OpenAI) or forces their AI backend?
2. Can we pipe Azure Realtime audio output → Duix streaming API?
3. Quality comparison: Duix vs MuseTalk for Italian speakers?
4. Can MuseTalk run acceptably on Mac M3 Max with MPS?
5. How to generate consistent Maestri faces (Socrate, Leonardo, etc.)?

---

## Sources

### Primary Models (Commercial License OK)
- [LatentSync GitHub](https://github.com/bytedance/LatentSync) - Apache 2.0
- [LatentSync HuggingFace Space](https://huggingface.co/spaces/fffiloni/LatentSync)
- [EchoMimicV2 GitHub](https://github.com/antgroup/echomimic_v2) - Apache 2.0, CVPR 2025
- [EchoMimicV3 GitHub](https://github.com/antgroup/echomimic_v3) - Apache 2.0, AAAI 2026
- [MuseTalk GitHub](https://github.com/TMElyralab/MuseTalk) - MIT
- [LivePortrait GitHub](https://github.com/KwaiVGI/LivePortrait) - MIT (watch InsightFace dep)
- [GeneFace++ GitHub](https://github.com/yerfor/GeneFacePlusPlus) - MIT
- [SadTalker GitHub](https://github.com/OpenTalker/SadTalker) - Apache 2.0
- [Hallo2 GitHub](https://github.com/fudan-generative-vision/hallo2) - ICLR 2025

### Research Only (Non-Commercial)
- [FLOAT GitHub](https://github.com/deepbrainai-research/float) - CC BY-NC-ND 4.0

### SaaS Options
- [Duix.com](https://duix.com) - Streaming API, free tier available
- [Duix.Avatar GitHub](https://github.com/duixcom/Duix-Avatar) - Self-hosted

### Real-Time Browser (3D Stylized)
- [TalkingHead GitHub](https://github.com/met4citizen/TalkingHead)
- [Wawa-Lipsync Tutorial](https://wawasensei.dev/tuto/real-time-lipsync-web)

### Infrastructure
- [NVIDIA Audio2Face GitHub](https://github.com/NVIDIA/Audio2Face-3D)
- [NVIDIA Audio2Face NIM](https://build.nvidia.com/nvidia/audio2face-3d)

### Research & Surveys
- [Awesome Talking Head Synthesis](https://github.com/Kedreamix/Awesome-Talking-Head-Synthesis)
- [Talking Head Survey (July 2025)](https://arxiv.org/abs/2507.02900)
- [Best Open Source Lip-Sync Models 2025](https://www.pixazo.ai/blog/best-open-source-lip-sync-models)
- [HeyGen Alternatives (Hugging Face)](https://huggingface.co/blog/francesca-petracci/heygen-alternatives)
