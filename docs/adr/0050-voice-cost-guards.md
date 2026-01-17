# ADR 0050: Voice Cost Guards

|                     |                                       |
| ------------------- | ------------------------------------- |
| **Status**          | Accepted                              |
| **Date**            | 2025-01-18                            |
| **Deciders**        | Roberto D'Angelo                      |
| **Technical Story** | V1Plan FASE 6.2.3 cost sustainability |

## Context and Problem Statement

MirrorBuddy uses Azure OpenAI Realtime API for voice interactions, which costs ~€0.04/min. Without guardrails, a single extended voice session could consume significant budget. V1Plan FASE 6.2.3 mandates cost sustainability controls.

**Key VC question from V1Plan:**

> "Cosa si rompe se l'utilizzo esplode?"
> Risposta: "Si rompe prima il costo, non il comportamento"

## Decision Drivers

- **Cost Control**: Voice is 20x more expensive than text per interaction
- **User Experience**: Degradation should be graceful, not abrupt
- **Investor Confidence**: Demonstrate cost sustainability for Seed round
- **V1Plan Compliance**: FASE 6.2.3 explicitly requires these guardrails

## Considered Options

1. No limits (trust users)
2. Hard limit only (abrupt cutoff)
3. Soft + Hard caps with graceful degradation
4. Per-user quotas with admin overrides

## Decision Outcome

**Chosen option**: "Soft + Hard caps with graceful degradation"

This provides warning before cutoff, maintains good UX, and prevents runaway costs.

## Implementation

### Duration Caps (`src/lib/metrics/voice-cost-guards.ts`)

| Threshold | Duration | Action                   |
| --------- | -------- | ------------------------ |
| Soft Cap  | 30 min   | Warning message to user  |
| Hard Cap  | 60 min   | Auto-switch to text chat |

### Cost Spike Protection

When session cost exceeds `P95 × 1.5` (rolling 7-day window):

1. Kill-switch activates for `voice_realtime` feature
2. 15-minute cooldown period
3. Auto-reactivation after cooldown

### API

```typescript
// Start tracking
startVoiceSession(sessionId, userId);

// Check during session (called by voice hook)
const check = updateVoiceDuration(sessionId, currentMinutes);
if (!check.allowed) {
  // Switch to text mode
  showMessage(check.message);
}

// End tracking
endVoiceSession(sessionId);

// Check if voice is allowed (spike protection)
const { allowed, reason } = isVoiceAllowed();
```

### Cost Thresholds (from V1Plan FASE 2.1.5)

| Metric             | GO Threshold | NO-GO Threshold |
| ------------------ | ------------ | --------------- |
| Cost/Session Text  | ≤ €0.05      | > €0.10         |
| Cost/Session Voice | ≤ €0.15      | > €0.30         |
| Spike Frequency    | ≤ 1/week     | > 5/week        |

### User Messages (Italian, age-appropriate)

- **Soft cap**: "Hai usato 30 minuti di voce. Rimangono 30 minuti prima del passaggio automatico a chat."
- **Hard cap**: "Limite voce raggiunto (60 min). Continuiamo in chat testuale."
- **Spike**: "Voce temporaneamente disabilitata per protezione costi. Riprova tra X minuti."

## Consequences

### Positive

- Prevents runaway voice costs
- Graceful degradation maintains UX
- Demonstrates cost discipline to investors
- Integrates with existing feature flags system

### Negative

- Users may be frustrated by limits
- Requires monitoring of P95 baseline
- Adds complexity to voice session flow

### Risks

| Risk                            | Mitigation                               |
| ------------------------------- | ---------------------------------------- |
| Limits too restrictive          | Monitor user feedback, adjust thresholds |
| Spike detection false positives | Require 10+ sessions for baseline        |
| Cooldown too short/long         | Configurable via constants               |

## Integration Points

- **Feature Flags**: Uses `activateKillSwitch("voice_realtime")` for spike protection
- **Session Metrics**: Uses `detectCostSpike()` from cost-tracking-service
- **Voice Hook**: Should call `updateVoiceDuration()` periodically
- **Admin Dashboard**: `CostPanel.tsx` displays active sessions and limits

## Related ADRs

- [ADR 0049: Enterprise Reliability Plan 49](./0049-enterprise-reliability-plan49.md)
- [ADR 0039: Deferred Production Items](./0039-deferred-production-items.md)

## References

- V1Plan.md FASE 6.2.3: Guardrail di sostenibilità
- docs/busplan/VoiceCostAnalysis-2026-01-02.md

---

_Plan 49 V1-Enterprise-Ready | January 2025_
