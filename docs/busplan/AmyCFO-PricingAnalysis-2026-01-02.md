# ConvergioEdu Financial Analysis: Pricing & Unit Economics

**Date**: January 2, 2026
**Author**: Amy (CFO Analysis)
**Classification**: CONFIDENTIAL - Financial Planning
**Status**: Executive Decision Document

---

## TL;DR - Executive Summary

| Metric | Value | Confidence |
|--------|-------|------------|
| Recommended launch price (text) | EUR 9.90/month | HIGH |
| Recommended voice add-on | EUR 0.35/min PAYG | HIGH |
| Target gross margin | 65%+ blended | MEDIUM |
| Break-even (B2C only) | 450 subscribers | MEDIUM |
| Voice unlimited tier viable? | NOT YET | HIGH |
| Self-hosted voice ROI | Positive at 180+ voice-min/month pooled | MEDIUM |

**Bottom line**: Launch text-only at EUR 9.90, voice as pay-as-you-go at EUR 0.35/min. Self-hosted voice becomes attractive only at scale (10+ heavy voice users). Do NOT bundle unlimited voice until Azure prices drop 50%+ or self-hosted quality improves.

---

## 1. Cost Structure Deep Dive

### 1.1 Actual Azure Costs (January 2026)

| Line Item | Monthly Cost | Cost Basis |
|-----------|-------------|------------|
| Azure App Service (B1) | $26.68 | Fixed |
| Azure Foundry Models (GPT-4o) | $11.45 | Variable (dev usage) |
| **Total Current** | **$38.13** | Dev environment |

At scale, I project:

| Users | App Service | AI (text) | AI (voice) | DB/Other | Total |
|-------|-------------|-----------|------------|----------|-------|
| 100 | $50 | $50 | $1,500* | $20 | $1,620 |
| 500 | $75 | $200 | $7,500* | $50 | $7,825 |
| 2,000 | $150 | $600 | $30,000* | $100 | $30,850 |
| 10,000 | $400 | $2,500 | $150,000* | $300 | $153,200 |

*Assumes 30% of users use voice, averaging 15 min/month each

### 1.2 Per-Unit Cost Breakdown

#### Text Chat (GPT-4o)
```
Average exchange: 500 input + 300 output tokens
Input cost: 500 × $0.0025/1K = $0.00125
Output cost: 300 × $0.01/1K = $0.003
Total per exchange: $0.00425

Heavy user (50 exchanges/day × 22 days): $4.68/month
Typical user (15 exchanges/day × 15 days): $0.96/month
Light user (5 exchanges/day × 10 days): $0.21/month
```

#### Text Chat (GPT-4o-mini) - RECOMMENDED
```
Average exchange: 500 input + 300 output tokens
Input cost: 500 × $0.00015/1K = $0.000075
Output cost: 300 × $0.0006/1K = $0.00018
Total per exchange: $0.000255

Heavy user: $0.28/month (94% savings)
Typical user: $0.06/month
Light user: $0.01/month
```

**Decision**: Use GPT-4o-mini for 90% of Maestro interactions. Text cost becomes negligible.

#### Voice (Azure Realtime API)
```
Bidirectional: $0.30/minute (input $0.06 + output $0.24)

Per session:
- 10 min session: $3.00
- 30 min session: $9.00
- 60 min session: $18.00

Per student/month (22 school days):
- 5 min/day: $33.00
- 15 min/day: $99.00
- 30 min/day: $198.00
- 60 min/day: $396.00
```

### 1.3 Voice vs Text Cost Ratio

| Metric | Text (mini) | Voice | Ratio |
|--------|-------------|-------|-------|
| Cost per minute of interaction | $0.003 | $0.30 | **100x** |
| Cost for 30 min session | $0.08 | $9.00 | **112x** |
| Monthly heavy user | $0.28 | $198 | **707x** |

**Voice is catastrophically more expensive than text.** This is the central constraint.

---

## 2. Unit Economics by Tier

### Tier 1: Gratuito (Free)

| Component | Value |
|-----------|-------|
| Price | EUR 0 |
| Text limit | 10 messages/day |
| Voice | None |
| Expected COGS/user/month | EUR 0.15 |
| Conversion target | 5% to paid |
| CAC contribution | Marketing funnel |
| Strategic value | User acquisition, word-of-mouth |

**Unit economics**: Loss leader. Acceptable cost of acquisition.

### Tier 2: Studente (Text-Only Core)

| Component | Value |
|-----------|-------|
| Price | EUR 9.90/month |
| Price (annual) | EUR 89/year (EUR 7.42/month) |
| Text | Unlimited (GPT-4o-mini) |
| Voice | None included |
| All Maestros | Yes (17) |
| All tools | Yes |
| Expected COGS | EUR 0.50 (text) + EUR 1.50 (infra) = EUR 2.00 |
| **Gross margin** | **80%** |
| Contribution margin | EUR 7.90/user/month |

**Break-even calculation (Tier 2 only)**:
```
Fixed monthly costs (estimated):
- Hosting/infra: EUR 200
- Support (0.25 FTE): EUR 750
- Tools/SaaS: EUR 100
- Total: EUR 1,050

Break-even = EUR 1,050 / EUR 7.90 = 133 subscribers
With buffer (1.5x): 200 subscribers minimum
```

### Tier 3: Studente Plus (Hybrid)

| Component | Value |
|-----------|-------|
| Price | EUR 19.90/month |
| Price (annual) | EUR 179/year (EUR 14.92/month) |
| Text | Unlimited (GPT-4o-mini, escalate to 4o when needed) |
| Voice included | 30 min/month |
| Additional voice | EUR 0.35/min |
| Voice hard cap | 90 min/month |
| Expected COGS | EUR 1.00 (text) + EUR 9.00 (voice) + EUR 2.00 (infra) = EUR 12.00 |
| **Gross margin** | **40%** |
| Contribution margin | EUR 7.90/user/month |

**Sensitivity on voice usage**:

| Voice minutes used | COGS | Margin |
|--------------------|------|--------|
| 0 min (text-only user) | EUR 3.00 | 85% |
| 15 min | EUR 7.50 | 62% |
| 30 min (included cap) | EUR 12.00 | 40% |
| 60 min (overage) | EUR 12 + EUR 10.50 overage revenue = NET EUR 21.50 | 52%* |
| 90 min (hard cap) | EUR 12 + EUR 21 overage revenue = NET EUR 31.50 | 60%* |

*Overage revenue improves margin for heavy users

### Tier 4: Voce Premium (Voice-Heavy)

| Component | Value |
|-----------|-------|
| Price | EUR 49.90/month |
| Price (annual) | EUR 449/year (EUR 37.42/month) |
| Text | Unlimited (GPT-4o) |
| Voice included | 120 min/month |
| Additional voice | EUR 0.30/min |
| Voice hard cap | 240 min/month |
| Priority support | Yes |
| Expected COGS (at cap) | EUR 2.00 (text) + EUR 36.00 (voice) + EUR 3.00 (infra) = EUR 41.00 |
| **Gross margin (at cap)** | **18%** |
| **Gross margin (at 60 min)** | **64%** |

**Risk**: If users consistently hit 120 min, this tier is barely profitable.

**Mitigation**:
- Most users won't hit cap (behavioral data from similar products shows ~40% utilization)
- Hard cap prevents catastrophic losses
- Overage revenue for over-cap users

---

## 3. Break-Even Analysis

### 3.1 Monthly Fixed Cost Assumptions

| Category | Amount | Notes |
|----------|--------|-------|
| Cloud infrastructure | EUR 300 | App hosting, DB, CDN |
| Support (0.5 FTE) | EUR 1,500 | Customer service |
| Tools & services | EUR 200 | Analytics, monitoring |
| Payment processing | 2.9% + EUR 0.25 | Stripe fees |
| **Total fixed** | **EUR 2,000** | Pre-scale |

### 3.2 Break-Even by Scenario

#### Scenario A: 100% Studente Tier
```
Contribution margin: EUR 7.90
Payment processing: EUR 0.54 (5.4%)
Net contribution: EUR 7.36

Break-even: EUR 2,000 / EUR 7.36 = 272 subscribers
```

#### Scenario B: 70% Studente / 30% Studente Plus
```
Blended contribution:
- Studente: EUR 7.36 × 0.7 = EUR 5.15
- Plus: EUR 7.32 × 0.3 = EUR 2.20
- Blended: EUR 7.35/user

Break-even: EUR 2,000 / EUR 7.35 = 272 subscribers
```

#### Scenario C: 60% Studente / 30% Plus / 10% Premium
```
Blended contribution:
- Studente: EUR 7.36 × 0.6 = EUR 4.42
- Plus: EUR 7.32 × 0.3 = EUR 2.20
- Premium: EUR 7.45 × 0.1 = EUR 0.75
- Blended: EUR 7.37/user

Break-even: EUR 2,000 / EUR 7.37 = 271 subscribers
```

**Key insight**: Contribution margin is similar across tiers when voice is capped properly. The variable is usage pattern within tiers.

### 3.3 Break-Even Timeline

| Month | Subscribers | MRR | Costs | Profit/Loss |
|-------|-------------|-----|-------|-------------|
| 1 | 50 | EUR 495 | EUR 2,100 | (EUR 1,605) |
| 2 | 100 | EUR 990 | EUR 2,200 | (EUR 1,210) |
| 3 | 175 | EUR 1,733 | EUR 2,350 | (EUR 617) |
| 4 | 275 | EUR 2,723 | EUR 2,550 | EUR 173 |
| 5 | 400 | EUR 3,960 | EUR 2,800 | EUR 1,160 |
| 6 | 550 | EUR 5,445 | EUR 3,100 | EUR 2,345 |

**Break-even month**: Month 4 (at ~275 subscribers)

---

## 4. Sensitivity Analysis

### 4.1 Voice Usage Sensitivity (Critical Variable)

What if voice usage is higher than expected?

| Scenario | Avg Voice Min/User | Blended COGS | Blended Margin |
|----------|-------------------|--------------|----------------|
| Optimistic | 10 min | EUR 4.00 | 75% |
| Base case | 20 min | EUR 7.00 | 60% |
| Pessimistic | 35 min | EUR 11.50 | 45% |
| Catastrophic | 50 min | EUR 16.00 | 30% |

**Mitigation**: Hard caps make "catastrophic" impossible.

### 4.2 Model Cost Sensitivity

What if Azure prices change?

| Azure Price Change | Impact on COGS | Impact on Margin |
|-------------------|----------------|------------------|
| -30% (expected by 2027) | -25% | +8 points |
| -50% (expected by 2028) | -40% | +15 points |
| +20% (worst case) | +15% | -5 points |

**Recommendation**: Build in 20% cost buffer to pricing. Monitor Azure roadmap quarterly.

### 4.3 User Mix Sensitivity

What if premium tier adoption is higher than expected?

| Premium Adoption | Voice COGS Impact | Net Margin |
|-----------------|-------------------|------------|
| 5% (base) | Low | 60% |
| 10% | +EUR 1,000/month at 200 users | 55% |
| 20% | +EUR 3,000/month at 200 users | 45% |

**Mitigation**: If premium adoption exceeds 15%, consider raising Premium price or tightening caps.

### 4.4 Churn Sensitivity

| Monthly Churn | LTV (Studente) | CAC Ceiling |
|---------------|----------------|-------------|
| 3% | EUR 330 | EUR 100 |
| 5% | EUR 198 | EUR 60 |
| 8% | EUR 124 | EUR 40 |
| 12% | EUR 83 | EUR 25 |

EdTech typical churn: 5-8% monthly. Target: <5%.

---

## 5. Self-Hosted Voice Analysis

### 5.1 Infrastructure Cost

| Component | Monthly Cost |
|-----------|-------------|
| Mac Mini M4 (lease or amortized) | EUR 50-80 |
| Colocation/bandwidth | EUR 20-30 |
| Maintenance overhead | EUR 20 |
| **Total** | **EUR 90-130/month** |

Alternative: GPU cloud server (Lambda Labs, etc.)
- ~EUR 100-200/month for dedicated GPU
- More scalable but higher cost

### 5.2 Self-Hosted Stack (Realistic)

| Component | Solution | Quality vs Azure |
|-----------|----------|------------------|
| STT | faster-whisper (large-v3) | 95% |
| LLM | Ollama (Llama 3.2 8B) | 70% for tutoring |
| TTS | Piper (Italian voices) | 75% |
| **Overall experience** | | **70-75%** |

**Critical limitation**: Not truly conversational. Turn-based only. No interruptions.

### 5.3 Break-Even: Self-Hosted vs Azure

```
Azure cost per voice minute: EUR 0.28 (~$0.30)
Self-hosted fixed cost: EUR 100/month

Break-even minutes: EUR 100 / EUR 0.28 = 357 minutes/month

At 10 students using 30 min voice: 300 min/month = NOT PROFITABLE
At 15 students using 30 min voice: 450 min/month = EUR 26 savings
At 20 students using 30 min voice: 600 min/month = EUR 68 savings
At 50 students using 30 min voice: 1,500 min/month = EUR 320 savings
```

**Decision point**: Self-hosted voice becomes attractive at **15+ students with significant voice usage** (30+ min/month each).

### 5.4 Self-Hosted Recommendation

| Timeline | Action |
|----------|--------|
| Now | Do NOT invest. Focus on core product. |
| When 500+ subscribers | Begin testing self-hosted stack in parallel |
| When 1,000+ subscribers | Offer as "beta" option for unlimited voice |
| When 2,000+ subscribers | Consider hybrid (self-hosted for casual, Azure for premium) |

---

## 6. B2B (Schools) Analysis

### 6.1 School Package Economics

| Package | Price/Year | Students | Per-Student | Voice Pool | Voice COGS | Margin |
|---------|-----------|----------|-------------|------------|------------|--------|
| Classe | EUR 890 | 25 | EUR 35.60 | 500 min | EUR 140 | 70% |
| Scuola S | EUR 3,900 | 150 | EUR 26 | 2,500 min | EUR 700 | 72% |
| Scuola M | EUR 9,900 | 400 | EUR 24.75 | 6,000 min | EUR 1,680 | 75% |
| Scuola L | EUR 24,900 | 1,000 | EUR 24.90 | 15,000 min | EUR 4,200 | 78% |

**Key insight**: B2B has HIGHER margins than B2C because:
1. Pooled voice usage is more efficient (not every student uses every minute)
2. Lower support cost per student
3. Lower payment processing % on larger transactions
4. Multi-year contracts possible

### 6.2 B2B Sales Cycle Considerations

| Factor | Impact |
|--------|--------|
| Italian school budget cycle | Sept-Oct primary window |
| Decision timeline | 3-6 months |
| POV requirements | Free pilot (30-60 days) |
| Procurement | Often requires competitive bids |

**Recommendation**: Start B2B sales in March-April 2026 for September adoption.

---

## 7. Financial Projections (18 Months)

### 7.1 Conservative Scenario

| Quarter | B2C Subs | B2B Students | MRR | COGS | Gross Profit |
|---------|----------|--------------|-----|------|--------------|
| Q2 2026 | 200 | 0 | EUR 2,100 | EUR 600 | EUR 1,500 |
| Q3 2026 | 500 | 100 | EUR 5,700 | EUR 1,800 | EUR 3,900 |
| Q4 2026 | 900 | 400 | EUR 10,900 | EUR 3,500 | EUR 7,400 |
| Q1 2027 | 1,300 | 800 | EUR 16,100 | EUR 5,200 | EUR 10,900 |
| Q2 2027 | 1,800 | 1,200 | EUR 22,200 | EUR 7,100 | EUR 15,100 |
| Q3 2027 | 2,500 | 1,800 | EUR 30,300 | EUR 9,700 | EUR 20,600 |

**ARR at Q3 2027**: EUR 363,600

### 7.2 Optimistic Scenario

| Quarter | B2C Subs | B2B Students | MRR | ARR |
|---------|----------|--------------|-----|-----|
| Q3 2027 | 5,000 | 4,000 | EUR 62,000 | EUR 744,000 |

### 7.3 Pessimistic Scenario

| Quarter | B2C Subs | B2B Students | MRR | ARR |
|---------|----------|--------------|-----|-----|
| Q3 2027 | 1,000 | 500 | EUR 13,500 | EUR 162,000 |

---

## 8. Risk Matrix

| Risk | Probability | Financial Impact | Mitigation |
|------|-------------|------------------|------------|
| Azure voice prices increase | 10% | EUR -2K/month at 500 users | Multi-provider strategy, caps |
| Azure voice prices DON'T decrease | 30% | Limits margin expansion | Keep conservative caps |
| Higher-than-expected voice usage | 40% | EUR -3K/month at 500 users | Hard caps enforced |
| High churn (>8%) | 35% | Halves LTV | Focus on engagement, outcomes |
| B2B sales cycle >9 months | 50% | Delays cash flow | Start early, pilot programs |
| Italian economic downturn | 20% | -20% demand | Annual prepay discounts |
| Competitor with free voice | 15% | -30% market share | DSA specialization moat |

---

## 9. Recommendations

### 9.1 Pricing Structure (Final)

| Tier | Price | Voice | Target |
|------|-------|-------|--------|
| Gratuito | EUR 0 | 0 | Funnel |
| Studente | EUR 9.90/mo | PAYG EUR 0.35/min | Core |
| Studente Plus | EUR 19.90/mo | 30 min incl | Accessibility |
| Voce Premium | EUR 49.90/mo | 120 min incl | Heavy users |

**Annual discounts**: 15% off (roughly 2 months free)

### 9.2 Strategic Decisions

1. **Use GPT-4o-mini for 90% of text interactions** - Quality is sufficient, cost is negligible

2. **Do NOT launch unlimited voice tier** - Financially suicidal until costs drop 50%+

3. **Voice must have hard caps** - Non-negotiable. 90 min max for Plus, 240 min max for Premium

4. **B2B is the path to profitability** - Higher margins, lower support, predictable revenue

5. **Self-hosted voice: wait 12 months** - Quality gap too large, complexity too high for now

6. **Plan for Azure price drops** - Build contracts that can benefit from cost reductions

### 9.3 Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Gross margin (blended) | >60% | <50% |
| Voice minutes/user/month | <25 | >40 |
| Monthly churn | <5% | >8% |
| CAC payback | <4 months | >6 months |
| NRR (net revenue retention) | >100% | <90% |

### 9.4 Decision Points

| Milestone | Action |
|-----------|--------|
| 300 subscribers | Validate unit economics assumptions |
| 1,000 subscribers | Begin self-hosted voice R&D |
| 2,500 subscribers | Evaluate Premium tier profitability |
| 5,000 subscribers | Consider raising new funding |

---

## 10. Conclusion

ConvergioEdu can be a profitable business with the right pricing structure. The key constraints are:

1. **Voice is expensive** - 100x text cost. Must be capped or pay-as-you-go.
2. **Text is cheap** - With GPT-4o-mini, essentially negligible.
3. **B2B has better unit economics** - Prioritize school sales.
4. **Self-hosted voice is not ready** - Quality gap and complexity are deal-breakers.

**The path to profitability**:
- Launch at EUR 9.90 with text-only as the core value
- Add voice as premium/PAYG, not bundled unlimited
- Pursue B2B aggressively starting Q1 2026
- Reach 300 subscribers by Month 6, 1,000 by Month 12
- Break-even at Month 4-5 with current cost structure

**Financial health check**: Re-evaluate these projections after 90 days of real usage data. Adjust caps and pricing based on actual behavior, not assumptions.

---

*Document prepared for executive decision-making. Numbers based on January 2026 Azure pricing and market research. Review quarterly.*
