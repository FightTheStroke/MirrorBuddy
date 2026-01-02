# Voice Cost Analysis & Tier Strategy

**Date**: January 2, 2026
**Author**: Technical analysis based on real Azure costs
**Status**: Working document

---

## Real Costs (Measured Today)

From `az rest` query on subscription `8015083b-adad-42ff-922d-feaed61c5d62`:

| Service | Last 30 Days | Daily Average |
|---------|-------------|---------------|
| Azure App Service | $26.68 | $0.83 |
| Foundry Models (AI) | $11.45 | $0.36 |
| **Total** | **$38.13** | **$1.19** |

This is **development usage** - occasional testing, no real students.

---

## Voice Cost Reality Check

### Azure Realtime API Pricing (Gennaio 2026)

#### Modello Standard (`gpt-realtime`)
| Component | Price | Source |
|-----------|-------|--------|
| Audio input | $0.06/min | Azure pricing page |
| Audio output | $0.24/min | Azure pricing page |
| **Bidirectional conversation** | **$0.30/min** | Combined |

#### Modello Mini (`gpt-realtime-mini`) - **NUOVO, DISPONIBILE**
| Component | Price | Risparmio |
|-----------|-------|-----------|
| Audio input | $0.006/min | 90% |
| Audio output | $0.024/min | 90% |
| **Bidirectional conversation** | **~$0.03-0.05/min** | **80-90%** |

> **IMPORTANTE**: `gpt-realtime-mini` (versione 2025-12-15) è ora GA su Azure swedencentral.
> Basato su GPT-4o-mini invece di GPT-4o. Qualità leggermente inferiore ma sufficiente per tutoring.

### Cost Per Student Scenarios

| Usage Pattern | Standard ($0.30/min) | **Mini (~$0.04/min)** | Risparmio |
|---------------|---------------------|----------------------|-----------|
| 15 min/day x 22 days | $99 | **$13.20** | 87% |
| 30 min/day x 22 days | $198 | **$26.40** | 87% |
| 60 min/day x 22 days | $396 | **$52.80** | 87% |

**Con Mini, voice diventa economicamente sostenibile!**

**Text chat comparison**: ~$0.005 per exchange = ~$2-3/month for heavy use

**Voice Standard è 100x più costoso del text. Voice Mini è solo ~10-15x più costoso.**

---

## Open Source Alternatives (Research)

### For TTS (Text-to-Speech)

| Project | Quality | Self-hosted | Italian Support | Notes |
|---------|---------|-------------|-----------------|-------|
| [Chatterbox-Turbo](https://github.com/resemble-ai/chatterbox) | High | Yes | English only (for now) | 3B params, <200ms latency |
| [Orpheus TTS](https://ollama.com/legraphista/Orpheus) | High | Ollama | English | 8 voices, emotion tags |
| [Piper TTS](https://github.com/rhasspy/piper) | Good | Yes | **Yes** | Fast, many languages |
| [ChatTTS](https://github.com/2noise/ChatTTS) | High | Yes | English/Chinese | Dialog-optimized |

**Winner for Italian**: Piper TTS - has Italian voices, fast, fully offline.

### For STT (Speech-to-Text)

| Project | Quality | Self-hosted | Italian Support |
|---------|---------|-------------|-----------------|
| [Whisper](https://github.com/openai/whisper) | Excellent | Yes | **Yes** |
| [Vosk](https://alphacephei.com/vosk/) | Good | Yes | **Yes** |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Excellent | Yes | **Yes** |

**Winner**: faster-whisper - Whisper quality with 4x speed.

### For Conversational AI (LLM)

| Model | Quality vs GPT-4o | Cost | Italian |
|-------|-------------------|------|---------|
| GPT-4o-mini | 80% | $0.00015/1K tokens | Yes |
| Llama 3.2 (Ollama) | 70% | Free (local) | Decent |
| Mistral 7B | 65% | Free (local) | Good |
| Phi-3 | 60% | Free (local) | OK |

**For Maestros/Coaches**: GPT-4o-mini is probably sufficient for most tutoring tasks. The "personality" comes from the system prompt, not the model intelligence.

### Voice Conversation Frameworks

| Framework | What it does | Self-hosted |
|-----------|--------------|-------------|
| [LiveKit Agents](https://github.com/livekit/agents) | Full voice AI pipeline | Yes |
| [Pipecat](https://github.com/pipecat-ai/pipecat) | Voice-first AI agents | Yes |
| [local-talking-llm](https://github.com/vndee/local-talking-llm) | Whisper + Ollama + Chatterbox | Yes |

**Problem**: None of these match Azure Realtime's quality for **conversational** voice. They're good for:
- Command-response (ask question, wait, get answer)
- Not good for: natural back-and-forth, interruptions, emotional nuance

---

## Practical Tier Options

### Option A: Text-Only Base (Accessible)

| Feature | Included |
|---------|----------|
| All 17 Maestros | Yes |
| All educational tools | Yes |
| Voice | No |
| Price target | EUR 9.90/month |
| Estimated COGS | EUR 1-2/month |
| Margin | 80-90% |

**Can mini models work?** Yes, probably. The Maestro "intelligence" is mostly:
- Following the persona in system prompt
- Being patient and encouraging
- Breaking down concepts

This doesn't need GPT-4o. GPT-4o-mini or even a well-prompted Llama would work.

### Option B: Hybrid (Text + Limited Voice) - **CON GPT-REALTIME-MINI**

| Feature | Included |
|---------|----------|
| Everything in Option A | Yes |
| Voice sessions | 60 min/month |
| Additional voice | EUR 0.05/min |
| Price target | EUR 14.90/month |
| Estimated COGS | EUR 2 (text) + EUR 2.40 (voice) = EUR 4.40 |
| Margin | **~70%** |

**Con Mini possiamo offrire più minuti a prezzo inferiore con margine migliore!**

### Option C: Voice-First Premium - **CON GPT-REALTIME-MINI**

| Feature | Included |
|---------|----------|
| Everything in Option A | Yes |
| Voice sessions | 240 min/month |
| Priority features | Yes |
| Additional voice | EUR 0.04/min |
| Price target | EUR 29.90/month |
| Estimated COGS | EUR 2 (text) + EUR 9.60 (voice) = EUR 11.60 |
| Margin | **~61%** |

**Con Mini il tier Premium diventa sostenibile!** Margine del 61% vs 24% con modello standard.

### Option D: Self-Hosted Voice (Future)

| Component | Solution | Cost |
|-----------|----------|------|
| STT | faster-whisper | Free (compute) |
| LLM | Ollama (Llama 3.2) | Free (compute) |
| TTS | Piper (Italian) | Free (compute) |
| Server | Mac Mini M4 or GPU server | ~EUR 50/month |

**Monthly cost for unlimited voice**: ~EUR 50-100 fixed (server costs)

**Trade-offs**:
- Lower quality than Azure Realtime
- Not truly "conversational" (more turn-based)
- Requires DevOps to maintain
- But: Predictable costs, no per-minute charges

---

## Recommendation

### Short Term (Launch)

1. **Start with text-only tier** at EUR 9.90
   - Use GPT-4o-mini for Maestros (test quality first)
   - Prove the educational value before adding voice

2. **Add voice as premium add-on** at EUR 0.30/min pay-as-you-go
   - No included minutes initially
   - See actual usage patterns
   - Adjust based on data

### Medium Term (6 months)

3. **Introduce hybrid tier** with caps based on real data
   - If avg user wants 20 min/month voice, include 30 min
   - Price accordingly

4. **Experiment with self-hosted voice**
   - Set up Piper + faster-whisper + Ollama
   - Offer as "beta" alternative (lower quality, unlimited)

### Long Term (12+ months)

5. **Wait for Azure price drops**
   - Realtime pricing expected to drop 30-50% by 2027-2028
   - Current caps can be relaxed then

6. **Consider institutional pricing**
   - Schools have budget for tools
   - Pooled minutes make sense for classroom use

---

## Unit Economics Summary

| Tier | Price | COGS | Margin | Break-even users* |
|------|-------|------|--------|-------------------|
| Text-only | EUR 9.90 | EUR 2 | 80% | ~350 |
| Hybrid | EUR 19.90 | EUR 11 | 45% | ~650 |
| Premium | EUR 49.90 | EUR 38 | 24% | ~900 |

*At EUR 1000/month fixed costs (hosting, support, etc.)

---

## Questions to Answer with Data

Before finalizing pricing:

1. **Do students actually want voice?** Or is text fine for most?
2. **How long are typical sessions?** 10 min? 30 min? 60 min?
3. **Does GPT-4o-mini work for tutoring?** A/B test quality
4. **What's the Italian market willing to pay?** Survey families

---

## Next Steps

1. [ ] Implement usage tracking (text exchanges, voice minutes)
2. [ ] Test GPT-4o-mini quality for Maestro conversations
3. [ ] Set up Piper TTS for Italian voice synthesis (local)
4. [ ] Create Stripe integration with Italian VAT
5. [ ] Beta launch with text-only + voice pay-as-you-go

---

## Sources

- [LiveKit Agents](https://github.com/livekit/agents) - Voice AI framework
- [Pipecat](https://github.com/pipecat-ai/pipecat) - Voice-first AI
- [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) - Open source TTS
- [Piper TTS](https://github.com/rhasspy/piper) - Fast TTS with Italian
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) - Fast STT
- [Orpheus TTS on Ollama](https://ollama.com/legraphista/Orpheus) - Ollama voice model
- [local-talking-llm](https://github.com/vndee/local-talking-llm) - Full local voice stack
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
