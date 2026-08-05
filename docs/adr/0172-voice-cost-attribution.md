# ADR 0172: Per-user voice cost attribution from Azure's own usage block

**Status**: Accepted
**Date**: 2026-08-05
**Deciders**: Roberto D'Angelo

## Context

Azure bills realtime voice per token, and an audio token costs roughly an order
of magnitude more than a text one. Before this, the only visible number was the
monthly total on the Azure portal. We could not answer the questions that
actually matter for a service given to children:

- What does one student cost per day, per week, per month?
- Is the total driven by many users or by one long session left open?
- Which maestri are expensive?

Without those answers, capacity and tier limits were guesses.

## Decision

**Attribute cost from the `usage` block Azure sends on every `response.done`.**

Rejected alternative: measuring wall-clock session minutes. It is trivial to
implement and wrong in a way that matters — a session left open on a table
would be billed like a conversation, and a child who listens more than they
speak would look identical to one who talks constantly.

Three constraints follow from the feature being about accuracy:

1. **The user comes from the session, never the request body.** A cost report
   nobody can forge is the only kind worth keeping.

2. **The model is resolved server-side.** `response.done` frequently omits
   `response.model`, and a client-side default prices every turn at the premium
   rate. The ingestion route repeats the token endpoint's deployment
   precedence, feature flags included. Where the answer is unknowable, the
   premium model is assumed: overstating is recoverable, understating is not.

3. **Cached tokens are subtracted before pricing.** Azure counts them inside
   `input_token_details`, so pricing the cached bucket separately charges them
   twice. The result is clamped so cache can never credit money back.

**Recording is best-effort and never blocks the conversation.** A failed write
is logged and dropped. For a child mid-sentence, an accounting gap is a far
better outcome than a stall.

**The admin console and the CLI call the same functions.** A dashboard and a
script that disagree about the bill are worse than either on its own. This
forced a split: `voice-usage-queries.ts` and `voice-usage-types.ts` take the
Prisma client as a parameter and import nothing from Next, because the service
module pulls in `server-only` and throws the moment a plain Node script loads
it.

## Consequences

**Good**

- Cost per user, per maestro, per day — in `/admin/voice-costs` and from the
  shell via `npm run voice:costs`.
- Rates are overridable in production through `AZURE_VOICE_RATES_JSON`, so an
  Azure price change does not require a deploy.
- An unknown model prices at the dearest known rate, so a new deployment
  appearing in production shows up as expensive rather than free.

**Bad**

- **No history.** Nothing in the old schema recorded per-turn tokens, so spend
  before this shipped cannot be reconstructed, only attributed going forward.
- Figures are our arithmetic over Azure's counters, not Azure's invoice. They
  should be treated as an operational signal and reconciled against billing
  before anyone is charged on their basis.
- When Azure omits the cached token split, the cached count is attributed to
  audio, since voice traffic is overwhelmingly audio. Sessions unusually heavy
  in cached _text_ will be slightly overstated.

## References

- `docs/voice-costs.md` — how to read the numbers
- `apps/web/src/lib/metrics/voice-pricing.ts` — rate card and pricing rules
- `apps/web/src/lib/metrics/voice-model.ts` — server-side model resolution
- ADR 0165, ADR 0169 — the deployment precedence this mirrors
