# MirrorBuddy Voice Strategy - Revised Analysis

**Date**: January 2, 2026
**Author**: Amy Chen, CFO
**Status**: REVISED - Responding to Founder's Feedback

---

## PART 1: Executive Summary

### Mission Statement

> **"Super affordable for disabled students like Mario. Make non-disabled users pay premium, but disabled students must have unlimited voice/accessibility features always available."**

This is not just a business constraint - it IS the business. MirrorBuddy exists to serve students with learning differences. Every pricing decision must answer: "Can Mario afford unlimited voice?"

### Open Source Commitment

**MirrorBuddy will ALWAYS have an open source version.**

| Version | License | Features | Target |
|---------|---------|----------|--------|
| **MirrorBuddy OSS** | Apache 2.0 | Core Maestros, basic tools, self-hostable | Developers, schools, NGOs |
| **MirrorBuddy Cloud** | Proprietary | Hosted service, voice, premium features | Families, students |

**Why Open Source Matters**:
1. **Mission alignment**: Education is a right - code should be accessible too
2. **Trust**: Families can verify what their children use
3. **Community**: Contributors improve the platform for everyone
4. **Sustainability**: If MirrorBuddy disappears, the code lives on
5. **Adoption**: Schools and governments prefer open source for procurement

**What's Open Source**:
- All 17 Maestro personalities and prompts
- FSRS flashcard algorithm
- Accessibility features and profiles
- Core educational tools (mind maps, quizzes)
- Self-hosted voice stack configuration

**What's Cloud-Only (Proprietary)**:
- Hosted infrastructure and scaling
- Premium voice quality (Azure integration)
- Parent dashboard analytics
- Real-time sync across devices
- Customer support

### The Challenge

| Founder's Requirement | Previous Plan | This Plan |
|----------------------|---------------|-----------|
| Voice per day | 30 minutes | **2 hours** |
| DSA student price | EUR 9.90-14.90 | **EUR 0-9.90** |
| Pricing complexity | 5 tiers | **3 tiers** |
| Mission alignment | Secondary | **Primary** |

### The Solution: Hybrid Self-Hosted + Robin Hood Model

**RECOMMENDED PRICING** (Simple, like Netflix):

| Tier | Monthly Price | Target User | Voice Included |
|------|---------------|-------------|----------------|
| **MirrorBuddy Free** | EUR 0 | All students | 30 min/day (self-hosted) |
| **MirrorBuddy Pro** | EUR 9.90 | DSA-certified students | **UNLIMITED** (self-hosted) |
| **MirrorBuddy Premium** | EUR 24.90 | Non-DSA families | UNLIMITED (hybrid quality) |

### Key Numbers

| Metric | Value |
|--------|-------|
| Self-hosted voice cost | EUR 0.002-0.004/minute |
| Azure voice cost | EUR 0.05-0.08/minute |
| Cost reduction | **95%** |
| DSA cross-subsidy from Premium | EUR 7.50/user/month |
| Break-even user mix | 30% Premium, 50% Pro, 20% Free |
| Mac Mini M4 cluster (3 units) | EUR 2,400 one-time |
| Monthly voice infrastructure | EUR 150-300/month |

### Recommendation

**APPROVE the hybrid self-hosted model.** By investing EUR 5,000-10,000 in infrastructure and adopting open-source voice AI, we can offer unlimited voice to DSA students at EUR 9.90/month while remaining sustainable.

---

## PART 2: Voice Technology Research

### 2.1 State-of-the-Art Open Source Voice Models (2025-2026)

#### Speech-to-Text (STT) - Top Performers

| Model | WER | Speed | GPU Required | License |
|-------|-----|-------|--------------|---------|
| **NVIDIA Canary Qwen 2.5B** | 5.63% | Fast | Yes (4GB) | Apache 2.0 |
| **IBM Granite Speech 3.3 8B** | 5.85% | Medium | Yes (8GB) | Apache 2.0 |
| **SenseVoice-Small** (Alibaba) | <5% | **5-15x faster than Whisper** | Optional | Apache 2.0 |
| **Whisper Large V3 Turbo** | ~5-6% | 5.4x faster than V2 | Yes (4GB) | MIT |
| **Moshi/Kyutai** | ~6% | **Real-time (200ms)** | Yes (4GB) | CC-BY 4.0 |

**Recommendation**: SenseVoice-Small for speed, Whisper Large V3 Turbo for accuracy.

#### Text-to-Speech (TTS) - Top Performers

| Model | Quality Rank | Speed | Size | Voice Cloning | License |
|-------|--------------|-------|------|---------------|---------|
| **Kokoro-82M** | #1 TTS Arena | **<0.3s** | 82M | No | Apache 2.0 |
| **OpenAudio S1** (Fish Speech) | #1 TTS Arena 2 | 1:7 RTF | 4B/0.5B | Yes (10-30s) | Apache 2.0 |
| **CosyVoice 3.0** (Alibaba) | Top 3 | Real-time | 0.5B | Yes (3-10s) | Apache 2.0 |
| **Higgs Audio V2** | Top trending | Fast | 3B | Yes | Apache 2.0 |
| **Moshi/Kyutai TTS** | Excellent | **200ms latency** | 1.6B | No | Apache 2.0 |

**Recommendation**: Kokoro-82M for speed/efficiency, CosyVoice 3.0 for multilingual + cloning.

### 2.2 Chinese Voice AI Breakthroughs (Alibaba FunAudioLLM)

#### SenseVoice (STT)
- **400,000+ hours training data**
- 50+ languages supported
- **5-15x faster than Whisper** (same accuracy)
- Includes emotion recognition and audio event detection
- Perfect for detecting student frustration/engagement

#### CosyVoice 3.0 (TTS)
- 9 languages: Chinese, English, Japanese, Korean, German, Spanish, French, Italian, Russian
- **18+ Chinese dialects** (useful for international expansion)
- Voice cloning with 3-10 seconds of audio
- 0.81% Character Error Rate (excellent)
- Streaming support for real-time interaction

**Strategic Value**: Free, Apache 2.0 licensed, production-ready, maintained by Alibaba.

### 2.3 French Voice AI (Moshi by Kyutai)

#### Key Innovation: Full-Duplex Conversation
- **Listens and speaks simultaneously** (like a human)
- 200ms latency (feels instantaneous)
- 70 different emotions and styles
- Multiple accents including French
- 7B parameter model, runs on consumer GPUs

#### Technical Architecture
- Mimi neural audio codec (state-of-the-art)
- Helium 7B base language model
- Two-channel I/O system (simultaneous listen/speak)

**Strategic Value**: The only open-source model with true real-time conversation like GPT-4o Advanced Voice.

### 2.4 Self-Hosted Voice Stack Options

#### Option A: LiveKit + Pipecat (RECOMMENDED)

| Component | Technology | Role |
|-----------|------------|------|
| **Transport** | LiveKit (WebRTC) | Real-time audio streaming |
| **Orchestration** | Pipecat | Pipeline management |
| **STT** | SenseVoice-Small or Whisper | Speech recognition |
| **LLM** | Ollama (Llama 3.2 / Mistral) | Response generation |
| **TTS** | Kokoro-82M or CosyVoice | Voice synthesis |

**Advantages**:
- Fully open-source (Apache 2.0)
- Self-hosted = no per-minute costs
- LiveKit handles WebRTC complexity
- Pipecat integrates all AI services
- Can scale on Kubernetes

#### Option B: Moshi Full-Stack

| Component | Technology |
|-----------|------------|
| **Everything** | Moshi (end-to-end) |

**Advantages**:
- Single model handles STT + LLM + TTS
- 200ms latency (best-in-class)
- True full-duplex conversation

**Disadvantages**:
- 7B model requires more GPU
- Less flexible than modular approach

### 2.5 Hardware Cost Analysis

#### Option 1: Mac Mini M4 Cluster (RECOMMENDED for startup)

| Configuration | Price | Capability |
|---------------|-------|------------|
| Mac Mini M4 (24GB) x 3 | EUR 2,400 | 10-15 concurrent voice sessions |
| Mac Mini M4 Pro (48GB) x 2 | EUR 4,200 | 20-30 concurrent voice sessions |
| Mac Mini M4 Pro (64GB) x 3 | EUR 7,500 | 40-50 concurrent voice sessions |

**Performance on M4**:
- Whisper Large V3: 27x faster than real-time
- LLM (7B Q4): 45-50 tokens/second
- Kokoro TTS: <0.3 seconds latency
- **Can run 24/7 with minimal electricity** (~10W idle, ~40W active)

#### Option 2: GPU Cloud (RunPod/Lambda Labs)

| GPU | Hourly Cost | Monthly (24/7) | Capability |
|-----|-------------|----------------|------------|
| RTX 4090 | $0.34/hr | ~$250 | 15-20 concurrent sessions |
| A100 40GB | $0.40/hr | ~$290 | 30-40 concurrent sessions |
| H100 80GB | $1.99/hr | ~$1,450 | 60-80 concurrent sessions |

**Recommendation**: Start with Mac Mini M4 cluster (one-time cost), move to cloud when scaling.

### 2.6 Cost Per Minute Analysis

#### Self-Hosted (Mac Mini M4 Cluster)

| Component | Cost/Minute | Notes |
|-----------|-------------|-------|
| STT (SenseVoice) | EUR 0.0005 | Amortized hardware |
| LLM (Llama 3.2 8B) | EUR 0.001 | Amortized hardware |
| TTS (Kokoro) | EUR 0.0005 | Amortized hardware |
| Bandwidth | EUR 0.0001 | 32-64 kbps Opus |
| **Total** | **EUR 0.002** | |

#### Self-Hosted (GPU Cloud - RunPod RTX 4090)

| Component | Cost/Minute | Notes |
|-----------|-------------|-------|
| STT | EUR 0.002 | Shared GPU time |
| LLM | EUR 0.003 | Shared GPU time |
| TTS | EUR 0.002 | Shared GPU time |
| **Total** | **EUR 0.007** | |

#### Azure/OpenAI (Current)

| Component | Cost/Minute | Notes |
|-----------|-------------|-------|
| Azure STT | EUR 0.016 | Standard pricing |
| Azure OpenAI (GPT-4o) | EUR 0.02 | Token-based |
| Azure TTS | EUR 0.016 | Neural voices |
| **Total** | **EUR 0.052** | |

#### OpenAI Realtime API

| Component | Cost/Minute | Notes |
|-----------|-------------|-------|
| Audio input | EUR 0.06 | |
| Audio output | EUR 0.24 | |
| **Total** | **EUR 0.30+** | Real-world: ~EUR 1/min |

### 2.7 Bandwidth and Storage Costs

#### Voice Streaming Bandwidth

| Quality | Bitrate | Data/Hour | Monthly Cost (1TB) |
|---------|---------|-----------|-------------------|
| Standard (Opus) | 32 kbps | 14.4 MB | ~EUR 5 (Cloudflare) |
| Good (Opus) | 64 kbps | 28.8 MB | ~EUR 10 |
| High (Opus) | 128 kbps | 57.6 MB | ~EUR 20 |

**1000 students x 2 hours/day x 30 days = 1,728 GB/month at 64 kbps**

**Cost**: EUR 15-20/month on Cloudflare or Hetzner

#### Conversation History Storage

| Scenario | Storage/Month | Cost/Month |
|----------|---------------|------------|
| Text transcripts only | ~50 MB per 1000 users | < EUR 1 |
| Audio recordings (optional) | ~50 GB per 1000 users | ~EUR 5 |

**Recommendation**: Store text transcripts only, regenerate audio on-demand.

---

## PART 3: Competitive Analysis

### 3.1 How Competitors Offer "Unlimited" Voice

#### ChatGPT Plus ($20/month) - Advanced Voice Mode

**The Secret**:
1. **Loss leader**: Voice is a premium feature that drives subscriptions
2. **Rate limiting**: "Nearly unlimited" = soft daily limits, then falls back to GPT-4o mini
3. **Internal models**: GPT-4o is trained in-house, marginal cost is low
4. **Scale economics**: 200M+ users amortize infrastructure costs
5. **Token optimization**: Cached audio inputs reduce costs by 80%

**What "unlimited" actually means**:
- Free users: GPT-4o mini voice with hourly limits
- Plus users: GPT-4o voice with daily soft limits, then mini
- Pro users ($200/month): True unlimited GPT-4o voice

**Lesson for MirrorBuddy**: "Unlimited" can mean "generous limits that feel unlimited for normal use."

#### Character.AI - Free Voice

**The Secret**:
1. **Self-hosted TTS only**: Uses internal voice synthesis, not external APIs
2. **No STT in free tier**: Users type, Character speaks
3. **Simple voices**: Pre-generated voice library, not real-time cloning
4. **Freemium upsell**: Voice chat drives Pro conversions
5. **In-house AI**: Custom models, no OpenAI/Anthropic costs

**What's free**:
- Character Voice for all users (TTS only)
- Users can create and share voices

**What's paid (c.ai+)**:
- Voice calls (bidirectional)
- Advanced features

**Lesson for MirrorBuddy**: We can offer TTS-only voice for free tier.

#### Replika - Free Voice (Limited)

**The Secret**:
1. **In-house LLM**: Not using GPT-4 or Claude (custom emotional AI)
2. **Voice is upsell driver**: Free voice limited, Pro unlimited
3. **Relationship monetization**: 25% of users pay for "romantic" mode
4. **Voice as premium hook**: Voice calls are Pro-only

**Pricing**:
- Free: Basic text chat only
- Pro ($7.99-19.99/month): Unlimited voice calls, romantic mode

**Lesson for MirrorBuddy**: Emotional connection drives conversions. Our "Maestros" can have this effect.

#### Perplexity Pro ($20/month)

**The Secret**:
1. **Voice is secondary**: Primary value is search/research
2. **Standard STT/TTS**: Not advanced conversational voice
3. **Text-first architecture**: Voice is transcribe-respond-speak

**Lesson for MirrorBuddy**: Voice doesn't need to be the primary feature to be valuable.

### 3.2 Industry Cost Benchmarks

| Provider | Voice Cost/Minute | Business Model |
|----------|-------------------|----------------|
| OpenAI Realtime API | EUR 0.30-1.00 | Premium/API |
| Azure Speech | EUR 0.03-0.05 | Enterprise |
| Google Speech | EUR 0.02-0.04 | Enterprise |
| Deepgram | EUR 0.01-0.02 | Volume |
| Self-hosted (open source) | EUR 0.002-0.01 | Infrastructure |
| Character.AI | ~EUR 0.001 | In-house |

### 3.3 Key Insight: The Real Secret

**Companies offering "unlimited" voice are doing one or more of these:**

1. **Building in-house models** (Character.AI, Replika, OpenAI)
2. **Using open-source models** (emerging players)
3. **Loss-leading on voice** to drive other revenue
4. **Defining "unlimited" loosely** (soft caps, quality degradation)
5. **Cross-subsidizing** from other user segments

**MirrorBuddy can do #2, #3, and #5.**

---

## PART 4: Creative Pricing Models

### 4.1 Robin Hood Model (Non-Disabled Subsidize Disabled)

#### The Math

| User Segment | % of Users | Price | Revenue/User | Voice Cost/User | Net/User |
|--------------|------------|-------|--------------|-----------------|----------|
| Premium (Non-DSA) | 30% | EUR 24.90 | EUR 24.90 | EUR 3.60 | **+EUR 21.30** |
| Pro (DSA) | 50% | EUR 9.90 | EUR 9.90 | EUR 7.20 | **+EUR 2.70** |
| Free | 20% | EUR 0 | EUR 0 | EUR 1.80 | **-EUR 1.80** |

**Assumptions**:
- 2 hours/day voice for Pro/Premium, 30 min/day for Free
- Self-hosted cost: EUR 0.002/minute
- 1000 users

**Monthly Revenue**: EUR 12,420
**Monthly Voice Cost**: EUR 4,320
**Gross Margin**: EUR 8,100 (65%)

#### Cross-Subsidy Analysis

Each Premium user subsidizes:
- 2.4 Free users' voice costs
- 0.5 Pro users' margin gap

**Sustainability**: Works if Premium segment is at least 25% of user base.

### 4.2 Netflix with Ads Model

#### Educational Sponsor Concept

Instead of intrusive ads, partner with:
- Educational publishers (Pearson, McGraw-Hill)
- Universities and colleges
- EdTech companies (Duolingo, Khan Academy)
- Government education programs

#### Realistic Ad Revenue (Education Apps)

| Ad Format | eCPM (EUR) | Impressions/User/Day | Revenue/User/Month |
|-----------|------------|---------------------|-------------------|
| Banner | EUR 0.50-1.50 | 20 | EUR 0.30-0.90 |
| Interstitial | EUR 5-8 | 2 | EUR 0.30-0.48 |
| Rewarded Video | EUR 15-30 | 1 | EUR 0.45-0.90 |
| **Total** | | | **EUR 1.05-2.28** |

**Problem**: Ad revenue (EUR 1-2/user/month) cannot cover voice costs (EUR 3-7/user/month for heavy users).

**Verdict**: Ads can supplement but not replace subscription revenue.

#### Hybrid Ad Model

| Tier | Ads | Price | Voice |
|------|-----|-------|-------|
| Free with Ads | Educational sponsors | EUR 0 | 30 min/day |
| Free without Ads | None | EUR 0 | 15 min/day |
| Pro | None | EUR 9.90 | Unlimited |

**Ad revenue offsets ~20-30% of Free tier costs.**

### 4.3 Hybrid Self-Hosted Model (RECOMMENDED)

#### Quality Tiers

| Quality Level | Technology | When Used | Cost/Min |
|---------------|------------|-----------|----------|
| **Premium** | Azure OpenAI + Neural TTS | First 30 min/day (Premium) | EUR 0.05 |
| **Standard** | Self-hosted (Kokoro + Llama) | After 30 min or Pro tier | EUR 0.002 |
| **Economy** | Self-hosted (fast models) | High load / Free tier | EUR 0.001 |

#### User Experience

**Premium Users (EUR 24.90)**:
- First 30 min: Azure quality (best voices, GPT-4o)
- After 30 min: Self-hosted (still good, slightly less natural)
- User can toggle "High Quality Mode" to burn through Azure minutes faster

**Pro Users - DSA (EUR 9.90)**:
- Unlimited self-hosted voice
- Self-hosted quality is 90-95% as good as Azure
- Occasional Azure bursts for complex educational content

**Free Users**:
- 30 min/day self-hosted voice
- Lower priority during peak times

#### Why This Works

1. **Azure for demos/first impressions**: New users experience best quality
2. **Self-hosted for heavy use**: Cost-effective for 2+ hours/day
3. **User choice**: Premium users can trade quality for quantity
4. **DSA students get unlimited**: Mission accomplished

### 4.4 Pooled Minutes Model (For Schools)

#### School Bulk Pricing

| Package | Minutes/Month | Price/Month | Per-Minute |
|---------|---------------|-------------|------------|
| Starter (10 students) | 3,000 | EUR 49 | EUR 0.016 |
| Standard (50 students) | 18,000 | EUR 199 | EUR 0.011 |
| Plus (200 students) | 90,000 | EUR 699 | EUR 0.008 |
| Unlimited (500+ students) | Unlimited | EUR 1,499 | N/A |

#### How It Works

1. School purchases pool of minutes
2. Students share pool (no individual limits)
3. Unused minutes roll over (max 3 months)
4. Dashboard shows usage per student
5. Auto-upgrade suggestions when pool runs low

**Advantage**: Schools get predictable costs, students get flexibility.

---

## PART 5: Revised Pricing Recommendation

### The Final Answer: 3 Simple Tiers

Following Netflix/Claude/OpenAI simplicity:

| Tier | Price | Who It's For | Voice | Quality |
|------|-------|--------------|-------|---------|
| **MirrorBuddy Free** | EUR 0 | Everyone | 30 min/day | Self-hosted |
| **MirrorBuddy Pro** | EUR 9.90/month | DSA-certified students | **UNLIMITED** | Self-hosted |
| **MirrorBuddy Premium** | EUR 24.90/month | Non-DSA families | **UNLIMITED** | Hybrid (Azure + Self-hosted) |

### What Each Tier Includes

#### Free (EUR 0)

| Feature | Included |
|---------|----------|
| Voice conversation | 30 min/day |
| All 17 Maestros | Yes |
| FSRS flashcards | Basic (100 cards) |
| Mind maps | View only |
| Quizzes | 5/day |
| Gamification | Basic |
| Accessibility features | All |

#### Pro - DSA (EUR 9.90/month)

| Feature | Included |
|---------|----------|
| Voice conversation | **UNLIMITED** |
| All 17 Maestros | Yes |
| FSRS flashcards | Unlimited |
| Mind maps | Create + share |
| Quizzes | Unlimited |
| Gamification | Full |
| Accessibility features | All + personalization |
| Parent dashboard | Yes |
| Progress reports | Weekly |

**DSA Verification**: Upload DSA certification document, reviewed within 24 hours.

#### Premium - Non-DSA (EUR 24.90/month)

| Feature | Included |
|---------|----------|
| Voice conversation | **UNLIMITED** (hybrid quality) |
| Azure quality voice | First 60 min/day |
| All 17 Maestros | Yes |
| FSRS flashcards | Unlimited |
| Mind maps | Create + share + collaborate |
| Quizzes | Unlimited + custom |
| Gamification | Full + family challenges |
| Accessibility features | All + personalization |
| Parent dashboard | Yes + multi-child |
| Progress reports | Daily + insights |
| Priority support | Yes |

### DSA Student Journey

```
Mario's Story:
1. Signs up for Free tier
2. Uses 30 min/day voice, loves it
3. Parents upload DSA certification
4. Verified within 24 hours
5. Automatically upgraded to Pro at EUR 9.90
6. Gets UNLIMITED voice forever
7. Cost to MirrorBuddy: ~EUR 7.20/month
8. Subsidized by Premium users
```

### Annual Pricing (Optional)

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Pro | EUR 9.90 | EUR 89/year | 25% |
| Premium | EUR 24.90 | EUR 224/year | 25% |

---

## PART 6: Financial Model

### 6.1 Infrastructure Investment Required

#### Phase 1: MVP (0-1,000 users)

| Item | Cost | Type |
|------|------|------|
| Mac Mini M4 (24GB) x 3 | EUR 2,400 | One-time |
| Cloudflare bandwidth | EUR 50/month | Recurring |
| LiveKit Cloud (starter) | EUR 0 | Free tier |
| Azure backup (limited) | EUR 100/month | Recurring |
| **Total Initial** | **EUR 2,400** | |
| **Total Monthly** | **EUR 150** | |

#### Phase 2: Growth (1,000-10,000 users)

| Item | Cost | Type |
|------|------|------|
| Mac Mini M4 Pro (64GB) x 3 | EUR 7,500 | One-time |
| GPU Cloud (RunPod reserve) | EUR 500/month | Recurring |
| Cloudflare Pro | EUR 200/month | Recurring |
| Azure backup (scaled) | EUR 300/month | Recurring |
| LiveKit self-hosted | EUR 0 | Open source |
| **Total Initial** | **EUR 7,500** | |
| **Total Monthly** | **EUR 1,000** | |

#### Phase 3: Scale (10,000+ users)

| Item | Cost | Type |
|------|------|------|
| Dedicated GPU servers | EUR 3,000/month | Recurring |
| Multi-region Cloudflare | EUR 500/month | Recurring |
| Azure for Premium quality | EUR 1,000/month | Recurring |
| Kubernetes cluster | EUR 500/month | Recurring |
| **Total Monthly** | **EUR 5,000** | |

### 6.2 Revenue Projections

#### Year 1: 5,000 Users

| Segment | Users | Price | Monthly Revenue |
|---------|-------|-------|-----------------|
| Free | 1,000 (20%) | EUR 0 | EUR 0 |
| Pro (DSA) | 2,500 (50%) | EUR 9.90 | EUR 24,750 |
| Premium | 1,500 (30%) | EUR 24.90 | EUR 37,350 |
| **Total** | **5,000** | | **EUR 62,100/month** |

**Annual Revenue**: EUR 745,200

| Expense | Monthly | Annual |
|---------|---------|--------|
| Voice infrastructure | EUR 1,000 | EUR 12,000 |
| Azure backup | EUR 500 | EUR 6,000 |
| Other (servers, support) | EUR 2,000 | EUR 24,000 |
| **Total Costs** | **EUR 3,500** | **EUR 42,000** |

**Gross Profit**: EUR 703,200 (94% margin)

#### Year 2: 20,000 Users

| Segment | Users | Price | Monthly Revenue |
|---------|-------|-------|-----------------|
| Free | 4,000 (20%) | EUR 0 | EUR 0 |
| Pro (DSA) | 10,000 (50%) | EUR 9.90 | EUR 99,000 |
| Premium | 6,000 (30%) | EUR 24.90 | EUR 149,400 |
| **Total** | **20,000** | | **EUR 248,400/month** |

**Annual Revenue**: EUR 2,980,800

| Expense | Monthly | Annual |
|---------|---------|--------|
| Voice infrastructure | EUR 5,000 | EUR 60,000 |
| Team (engineering, support) | EUR 15,000 | EUR 180,000 |
| Marketing | EUR 5,000 | EUR 60,000 |
| Other | EUR 3,000 | EUR 36,000 |
| **Total Costs** | **EUR 28,000** | **EUR 336,000** |

**Gross Profit**: EUR 2,644,800 (89% margin)

### 6.3 Break-Even Analysis

#### Minimum Viable Mix for Sustainability

| Scenario | Free | Pro | Premium | Monthly Costs | Result |
|----------|------|-----|---------|---------------|--------|
| **Sustainable** | 20% | 50% | 30% | EUR 3,500 | Profitable |
| **Tight** | 30% | 50% | 20% | EUR 3,500 | Break-even |
| **Unsustainable** | 40% | 50% | 10% | EUR 3,500 | Loss |

**Key Insight**: We need at least 20% Premium users to subsidize DSA students.

#### Sensitivity Analysis

| Variable | Change | Impact on Profit |
|----------|--------|------------------|
| DSA adoption +10% | 50% -> 60% | -EUR 4,950/month |
| Premium adoption +5% | 30% -> 35% | +EUR 6,225/month |
| Self-hosted cost +50% | EUR 0.002 -> 0.003 | -EUR 500/month |
| User growth +20% | 5,000 -> 6,000 | +EUR 12,420/month |

### 6.4 Funding Requirements

#### Bootstrap Path (Lean)

| Phase | Duration | Funding Needed |
|-------|----------|----------------|
| MVP | 3 months | EUR 10,000 |
| Beta (1,000 users) | 6 months | EUR 25,000 |
| Launch (5,000 users) | 12 months | EUR 0 (self-sustaining) |

**Total**: EUR 35,000 to reach profitability

#### Accelerated Path (Growth)

| Phase | Duration | Funding Needed |
|-------|----------|----------------|
| MVP | 2 months | EUR 15,000 |
| Beta + Marketing | 4 months | EUR 50,000 |
| Scale (10,000 users) | 6 months | EUR 100,000 |

**Total**: EUR 165,000 to reach scale faster

### 6.5 Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Open-source models degrade | Low | Medium | Multiple model fallbacks |
| Azure costs spike | Medium | Low | Self-hosted is primary |
| Premium adoption <20% | Medium | High | Increase Premium value, school partnerships |
| DSA verification fraud | Low | Low | Random audits, revocation policy |
| Hardware failure | Medium | Medium | Redundant Mac Mini cluster |
| Competitor undercuts | Medium | Medium | Mission differentiation, quality |

### 6.6 Path to Profitability

```
Month 1-3: MVP Development
- Build self-hosted voice stack
- Integrate LiveKit + Pipecat
- Test with 100 beta users
- Cost: EUR 10,000

Month 4-6: Beta Launch
- 1,000 users (word of mouth)
- Fine-tune voice quality
- DSA verification process
- Revenue: EUR 10,000/month
- Cost: EUR 5,000/month
- Net: +EUR 5,000/month

Month 7-12: Growth
- 5,000 users (marketing + schools)
- Revenue: EUR 62,000/month
- Cost: EUR 15,000/month
- Net: +EUR 47,000/month

Month 12+: Scale
- Self-sustaining
- Expand to new markets
- Add premium features
```

---

## Appendix A: Research Sources

### Voice AI Models
- [Top Open-Source TTS Models - Modal](https://modal.com/blog/open-source-tts)
- [Best Open-Source TTS 2026 - BentoML](https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models)
- [Open Source STT Models 2025 - Modal](https://modal.com/blog/open-source-stt)
- [Hugging Face Speech-to-Speech](https://github.com/huggingface/speech-to-speech)
- [Llasa TTS - Hugging Face Blog](https://huggingface.co/blog/srinivasbilla/llasa-tts)
- [Best Open Source STT Benchmarks - Northflank](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2025-benchmarks)

### Chinese Voice AI
- [FunAudioLLM Paper](https://arxiv.org/html/2407.04051v1)
- [CosyVoice 2025 Guide](https://dev.to/czmilo/cosyvoice-2025-complete-guide-the-ultimate-multi-lingual-text-to-speech-solution-4l39)
- [SenseVoice GitHub](https://github.com/FunAudioLLM/SenseVoice)
- [Fun-CosyVoice 3.0 Guide](https://apatero.com/blog/fun-cosyvoice-3-0-multilingual-tts-complete-guide-2025)

### French Voice AI (Moshi)
- [Moshi GitHub](https://github.com/kyutai-labs/moshi)
- [Kyutai TTS](https://kyutai.org/tts)
- [Moshi on Hugging Face](https://huggingface.co/kyutai/tts-1.6b-en_fr)

### Self-Hosted Voice
- [LiveKit Agents](https://github.com/livekit/agents)
- [Pipecat Framework](https://docs.pipecat.ai/server/services/tts/piper)
- [Self-Hosted AI Stack Guide](https://brainsteam.co.uk/2025/4/6/adding-voice-to-selfhosted-ai/)
- [TTS Models Compared - Inferless](https://www.inferless.com/learn/comparing-different-text-to-speech---tts--models-part-2)

### OpenAI Voice
- [OpenAI Voice Mode FAQ](https://help.openai.com/en/articles/8400625-voice-mode-faq)
- [OpenAI Realtime API](https://openai.com/index/introducing-the-realtime-api/)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Realtime API Pricing Calculator](https://skywork.ai/blog/agent/openai-realtime-api-pricing-2025-cost-calculator/)

### GPU Cloud Pricing
- [RunPod Pricing](https://www.runpod.io/pricing)
- [Lambda Labs Pricing](https://lambda.ai/pricing)
- [GPU Price Comparison 2025](https://getdeploying.com/gpus)

### Mac Mini M4 Performance
- [Mac Mini M4 Pro for Local AI](https://www.arsturn.com/blog/mac-mini-m4-pro-local-ai-review)
- [Ollama LLM Benchmarks M4](https://www.linkedin.com/pulse/benchmarking-local-ollama-llms-apple-m4-pro-vs-rtx-3060-dmitry-markov-6vlce)
- [M4 Mac for Local LLMs](https://medium.com/@kjmcs2048/why-i-chose-the-mac-mini-m4-for-my-personal-llm-and-local-rag-setup-1c3f0155df74)

### Competitive Analysis
- [Character Voice Blog](https://blog.character.ai/character-voice-for-everyone/)
- [Replika Overview](https://www.eesel.ai/blog/replika-ai)
- [Replika Business Model](https://en.wikipedia.org/wiki/Replika)

### Cost Analysis
- [Whisper API Pricing](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)
- [Azure Speech Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/)
- [STT API Pricing Breakdown](https://deepgram.com/learn/speech-to-text-api-pricing-breakdown-2025)
- [AI Voice Agent Calculator](https://softcery.com/ai-voice-agents-calculator)

### Ad Revenue
- [Mobile App Ad Revenue 2025](https://www.monetizemore.com/blog/how-much-ad-revenue-can-apps-generate/)
- [Mobile Advertising CPM Rates](https://www.businessofapps.com/ads/research/mobile-app-advertising-cpm-rates/)

### Kokoro & Fish Speech
- [Kokoro-82M Hugging Face](https://huggingface.co/hexgrad/Kokoro-82M)
- [Fish Speech GitHub](https://github.com/fishaudio/fish-speech)
- [OpenAudio S1](https://speech.fish.audio/)

---

## Appendix B: Technical Implementation Roadmap

### Week 1-2: Voice Stack Setup

```bash
# Mac Mini M4 Setup
brew install python@3.11
pip install pipecat-ai livekit-agents

# Install voice models
pip install lightning-whisper-mlx  # STT
pip install kokoro-tts             # TTS
ollama pull llama3.2:8b            # LLM
```

### Week 3-4: Integration

```typescript
// LiveKit + Pipecat integration
const voiceAgent = new VoiceAgent({
  stt: 'whisper-mlx',
  llm: 'ollama/llama3.2:8b',
  tts: 'kokoro-82m',
  transport: 'livekit'
});

// Quality tier switching
if (user.tier === 'premium' && user.azureMinutes > 0) {
  voiceAgent.usePremiumStack();
} else {
  voiceAgent.useSelfHostedStack();
}
```

### Week 5-6: Testing & Optimization

1. Latency benchmarks (<500ms target)
2. Quality A/B testing (Azure vs self-hosted)
3. Load testing (concurrent sessions)
4. DSA verification flow

---

**Document prepared by Amy Chen, CFO**
**Reviewed by: [Pending founder review]**
**Next action: Technical feasibility review with engineering team**
