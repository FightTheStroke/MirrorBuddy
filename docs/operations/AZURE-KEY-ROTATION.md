# Rotating the Azure OpenAI key

The key that lets MirrorBuddy speak lives in **four** places. Rotating it means
updating all four. Getting the order wrong takes the voice away from a child
mid-sentence; skipping a store leaves a dead key lying around until something
that needs it fails at the worst moment.

That is not hypothetical. On **28 August 2026** the key was regenerated in the
Azure portal at 10:33 and the GitHub secrets were updated at 10:40 — seven
minutes during which continuous integration held a key Azure had already
revoked. The `kv-virtualbpm-prod` copy was never updated at all: it had been
dead since **29 November 2025** and nobody noticed for nine months.

## The four stores

| Store                  | Holds                                                   | How to update                                                   |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Azure account          | `key1` and `key2` on `aoai-virtualbpm-prod`             | Azure portal, or `az cognitiveservices account keys regenerate` |
| Vercel production      | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_REALTIME_API_KEY` | `vercel env rm` + `vercel env add`                              |
| GitHub Actions secrets | the same two names                                      | `gh secret set`                                                 |
| `kv-virtualbpm-prod`   | `azure-openai-api-key`, `azure-openai-realtime-api-key` | `az keyvault secret set`                                        |

Azure gives you two keys precisely so a rotation never needs a gap. Use that.

## The order (ADR 0173)

1. **Read the standby key.** Production is on one of the two; the other is the
   one you are about to move to.

   ```bash
   SUB=8015083b-adad-42ff-922d-feaed61c5d62
   az cognitiveservices account keys list \
     --name aoai-virtualbpm-prod --resource-group rg-virtualbpm-prod \
     --subscription $SUB --query key2 -o tsv
   ```

2. **Write it to every consumer, before revoking anything.** Vercel first
   (it serves the children), then GitHub Actions, then the Key Vault.

3. **Redeploy** so Vercel actually serves the new value, and confirm the voice
   works on the live site.

4. **Only now regenerate the old key**, which revokes it.

   ```bash
   az cognitiveservices account keys regenerate \
     --name aoai-virtualbpm-prod --resource-group rg-virtualbpm-prod \
     --subscription $SUB --key-name Key1
   ```

Never step 4 first. Revoking a key that is still in use is an outage, and the
people it hits are students in the middle of a lesson.

## Proving it worked

```bash
AZURE_OPENAI_ENDPOINT="https://aoai-virtualbpm-prod.openai.azure.com/" \
  ./scripts/check-azure-key-drift.sh
```

The check asks Azure whether each store's key still works — the only question
that matters, and one that needs no permission to read the key itself. It runs
weekly in `.github/workflows/infra-monitor.yml` (job **Azure Key Drift**), so a
store left behind now surfaces within seven days instead of nine months.

## The endpoint drifts too

A live key against the wrong address is just as dead as a revoked one. The
GitHub Actions secret `AZURE_OPENAI_ENDPOINT` held a bare `-` from February to
August 2026: `curl` read the request URL as one of its own options, and the
drift check reported a dead key — blaming the store that was fine. Both the
check and the **Azure OpenAI Models** job now reject an endpoint that is not an
`https://` URL and say so, instead of accusing the key.

Every store holds the same address, and Azure is the source of truth for it:

```bash
az cognitiveservices account show \
  --name aoai-virtualbpm-prod --resource-group rg-virtualbpm-prod \
  --subscription 8015083b-adad-42ff-922d-feaed61c5d62 \
  --query properties.endpoint -o tsv
```

The realtime traffic uses that same address — the resource exposes one endpoint
for every API, realtime included — so `AZURE_OPENAI_REALTIME_ENDPOINT` is never
a different host, only a different deployment name.
