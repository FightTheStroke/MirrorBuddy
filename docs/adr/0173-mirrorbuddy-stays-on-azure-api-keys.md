# ADR 0173: MirrorBuddy stays on Azure OpenAI API keys

**Status**: Accepted — 26 August 2026
**Context**: attempted migration to keyless Entra/OIDC, blocked by tenant policy

## The point, in one sentence

MirrorBuddy keeps authenticating to Azure OpenAI with an **API key** — not
because it is the better choice, but because the only alternative, OIDC
federation between Vercel and Entra, is **forbidden by Microsoft tenant
policy**, at a level nobody on this project can change.

This ADR exists for one precise reason: **to stop someone from attempting the
migration again.** The block is invisible from the code. Without this document,
the next person who reads `AZURE_OPENAI_API_KEY` in a config file reasonably
concludes "this is an oversight, I'll fix it" and spends a day reaching the same
wall.

## What was tried, and how it failed

Three experiments measured on 2026-08-26 — not hypotheses.

| Attempt                                                       | Outcome                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Federated credential on a **managed identity**                | **Refused.** Policy `CloudGov_FIC_MIDeny` at the root management group             |
| Federated credential on an **app registration** (fallback)    | **Refused.** `ServiceManagementReference field is required` — needs Service Tree   |
| Entra token → call Azure OpenAI with no `api-key`             | **Works** (HTTP 200), but only from a local identity, not from Vercel              |

The policy allows `allowGitHub`, `allowAWS`, `allowAKS` and other issuers. It
**does not allow Vercel**. This is not a misconfiguration: it is a list, and
Vercel is not on it.

The third experiment matters because it separates two things that look like
one: **the policy blocks *federation*, not Entra.** A workload running on a
machine already authenticated in the tenant can go keyless today — which is
exactly what the other consumer of the same resource did. Vercel is the
federated case, and the federated case is the one refused.

## The two ways out, and why both are closed

1. **Request a CloudGov exception** for issuer `oidc.vercel.com`
   (`https://aka.ms/msificpolicy`). Not available: this is not a request this
   project can file.
2. **Move the Azure OpenAI resource into a FightTheStroke-controlled tenant.**
   Not available: that tenant does not exist and will not be created.

Both were considered and explicitly ruled out. If either ever opens, reopen this
ADR — and with it, migration tasks T1/T2/T4/T9/T10/T11/T12/T14/T15 become live
again; they are moot today only because the key stays.

## What changes anyway, and what does not

### The blast radius halved, and not by accident

Resource `aoai-virtualbpm-prod` hosts **23 deployments** and is shared with a
second product. Azure OpenAI keys are **account-scoped, not
deployment-scoped**: a leaked key opens all 23, not only MirrorBuddy's.

Until 2026-08-26, **two** products held a key on that resource. Since that date
the second one moved to Entra and **holds none**. That does not remove the risk,
but it halves the number of places a key can escape from, and produces one
concrete gain: key rotation is now a **single-consumer** operation, executable
without coordinating two systems.

### Rotation — the procedure, now that it is single-consumer

Azure OpenAI keeps two keys precisely for this: rotate one while the other
carries traffic.

```bash
# 1. read key 2 (the one NOT in use)
KEY2=$(az cognitiveservices account keys list -n aoai-virtualbpm-prod \
        -g rg-virtualbpm-prod --query key2 -o tsv)

# 2. put key 2 in BOTH places that hold a key, then redeploy Vercel
#    Vercel:  AZURE_OPENAI_API_KEY  (serves the app)
#    GitHub:  secrets.AZURE_OPENAI_API_KEY  (used by .github/workflows/
#             infra-monitor.yml — jobs `azure-models` and `usage-alerts`
#             authenticate to this same resource)
gh secret set AZURE_OPENAI_API_KEY --repo FightTheStroke/MirrorBuddy --body "$KEY2"

# 3. prove key 2 actually WORKS, with an authenticated call
#    (%/ strips a trailing slash: the endpoint carries one, and "//openai"
#     is a 404 that would read as "the key is bad")
ENDPOINT="${AZURE_OPENAI_ENDPOINT%/}"
curl -fsS "${ENDPOINT}/openai/models?api-version=2024-10-21" \
     -H "api-key: ${KEY2}" >/dev/null && echo "key 2 authenticates"

# 4. only now regenerate key 1, which nobody uses any more
az cognitiveservices account keys regenerate -n aoai-virtualbpm-prod \
   -g rg-virtualbpm-prod --key-name key1
```

Two things about this runbook are load-bearing.

**The order.** Regenerating before traffic has moved turns the AI off for
children mid-session.

**Step 3 must be an authenticated call, and `/api/health` cannot be that call.**
`checkAIProvider()` returns `pass` on `!!(AZURE_OPENAI_ENDPOINT &&
AZURE_OPENAI_API_KEY)` — it asserts the variables are *non-empty*, and never
contacts Azure. A mistyped key 2 therefore makes the health check green, right
before step 4 destroys the only key that worked. A verification that cannot fail
is worse than no verification: it does not merely fail to catch the error, it
*authorises* the destructive step. The probe above is the same authenticated
`api-key` request `infra-monitor.yml` already makes, which is what makes it a
real check.

**Two places, not one.** Updating Vercel alone leaves `secrets.AZURE_OPENAI_API_KEY`
holding key 1. After step 4 the scheduled `azure-models` job starts failing and
`usage-alerts` silently loses accurate Azure monitoring — a monitor that has
stopped monitoring, which is the failure mode hardest to notice.

### What must NOT be done

- **`disableLocalAuth` on the resource.** It would kill MirrorBuddy instantly:
  key authentication is exactly what that flag disables. It stays `null`
  deliberately.
- **A separate Azure OpenAI resource to shrink the blast radius.** Technically
  right, disproportionate here: MirrorBuddy's AI spend is **$42.80 over six
  months** (ADR 0142), and recreating 23 deployments with their quota costs more
  than the risk it removes. MirrorBuddy is a hackathon project and is treated
  as one.
- **An Azure resource name containing `mirrorbuddy` or `fightthestroke`.**
  Standing operator constraint.

## Residual risk, declared

Three things remain true, and should be read as accepted rather than solved:

1. **A leaked key opens 23 deployments**, not just ours. Mitigated by: pre-commit
   secret scanning (ADR 0072), the key living only in Vercel environment
   variables and never in the repository, and the upstream error-body
   sanitisation introduced on 2026-08-26 — a value that reaches an error message
   eventually reaches a log.
2. **The key does not expire.** No API key does. The rotation procedure above is
   the only defence, and it should be used at the first suspicion.
3. **Continuity.** MirrorBuddy's AI lives in the Azure subscription of the
   operator's employer. **The day that relationship ends, MirrorBuddy's AI
   stops.** It is not a security problem and it is outside this ADR's scope, but
   since it had not been written down anywhere, it is written here.

## Consequences

- `!!(endpoint && apiKey)` as an *availability* test is **correct** and should be
  left alone: it answers "is a provider configured on this deployment", and it
  would only have become wrong if the key had gone away. It is **not** a
  liveness test, and the rotation runbook above is explicit about not borrowing
  it as one — the same expression is right for one question and dangerous for
  the other.
- Diagnostic screens **must** keep mentioning the key: the key exists, and a
  diagnostic that hides it is lying.
- Anyone reading `AZURE_OPENAI_API_KEY` in configuration and suspecting an
  oversight: it is not one. It is this ADR.
