# Voice costs

Azure bills realtime voice per token, not per minute, and the price of an audio
token is roughly an order of magnitude above a text one. Until this landed we
could see the total on the Azure portal and nothing else: not which user, not
which maestro, not whether a single long session was carrying the month.

This documents how the numbers are produced and where to read them.

## Where the numbers come from

Azure sends a `usage` block on every `response.done`. It is the only honest
source: wall-clock minutes would charge silence the same as speech, and a
session left open on a table would look like a heavy user.

```
response.done
  └─ response.usage
       ├─ input_tokens  { audio_tokens, text_tokens, cached_tokens }
       └─ output_tokens { audio_tokens, text_tokens }
```

The browser forwards that block verbatim to `POST /api/metrics/voice-usage`.
Two things are deliberately **not** taken from the browser:

- **The user.** Taken from the session. A cost report is only worth having if
  nobody can bill someone else's conversation to another account.
- **The model.** `response.done` frequently omits it, and a client-side default
  would price every turn at the premium rate. The route resolves the deployment
  itself (`lib/metrics/voice-model.ts`), repeating the token endpoint's
  precedence — V21 → V2 → V15 → legacy — with the same feature flags.

If nothing is configured the premium model is assumed. Overstating the bill is
recoverable; quietly understating it is not.

## Pricing

Rates live in `lib/metrics/voice-pricing.ts` and can be overridden in
production without a deploy via `AZURE_VOICE_RATES_JSON`:

```jsonc
{
  "gpt-realtime": {
    "audioIn": 32.0, // EUR per million tokens
    "audioOut": 64.0,
    "textIn": 4.0,
    "textOut": 16.0,
    "cachedIn": 0.4,
  },
}
```

Two rules worth knowing:

- **Cached tokens are not billed twice.** Azure counts them _inside_
  `input_token_details`, so the cached part is subtracted from the input
  buckets and priced at `cachedIn`, clamped so it can never credit money back.
- **An unknown model is priced at the dearest known rate**, never at zero. A
  new deployment appearing in production should show up as expensive, not free.

## Reading the numbers

**Admin console** — `/admin/voice-costs`: total, active users, cost per user,
a per-day series and a per-user table sorted dearest first.

**CLI** — the same functions, so the two can never disagree:

```bash
npm run voice:costs                    # today, every user
npm run voice:costs -- --period week   # day | week | month
npm run voice:costs -- --user <userId> # one user
npm run voice:costs -- --json          # for piping
```

The CLI imports `packages/db` directly rather than the app's db shim, which
pulls in `server-only` and throws outside Next. Anything the CLI needs must
live in `voice-usage-queries.ts` or `voice-usage-types.ts`, never in
`voice-usage-service.ts`.

## What this cannot tell you

There is **no history before this shipped**. Nothing in the old schema recorded
per-turn tokens, so earlier spend cannot be reconstructed — only attributed
going forward. Rows are also written best-effort: a failed report is logged and
dropped rather than surfaced, because an accounting gap is a better outcome
than a conversation that stops mid-sentence for a child.
