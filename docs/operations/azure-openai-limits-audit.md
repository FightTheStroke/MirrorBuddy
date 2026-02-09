# Azure OpenAI Limits Audit

**Date**: 2026-01-21
**Project**: MirrorBuddy
**Plan**: 064 - W1-ServiceDiscovery
**Task**: T1-05

## Executive Summary

This document provides a comprehensive audit of Azure OpenAI service limits, quotas, and configurations for the MirrorBuddy production environment.

**Critical Finding**: Endpoint URL mismatch between `.env` configuration and actual Azure resource.

---

## Resource Overview

| Property                  | Value                                                |
| ------------------------- | ---------------------------------------------------- |
| **Resource Name**         | aoai-virtualbpm-1763396587                           |
| **Resource Group**        | rg-virtualbpm-prod-we                                |
| **Location**              | West Europe                                          |
| **SKU**                   | S0 (Standard)                                        |
| **Subscription**          | MCAPS-Hybrid-REQ-120485-2025-roberdan                |
| **Subscription ID**       | 1e365e42-6fde-44fd-b145-8a2f16c04b05                 |
| **Endpoint**              | https://aoai-virtualbpm-1763396587.openai.azure.com/ |
| **Created**               | 2025-11-17T16:23:09Z                                 |
| **Public Network Access** | Enabled                                              |

---

## Configuration Mismatch (CRITICAL)

### Issue

`.env` file specifies incorrect endpoint URL.

**Configured in `.env`**:

```bash
AZURE_OPENAI_ENDPOINT=https://aoai-virtualbpm-prod.openai.azure.com/
```

**Actual Azure Resource**:

```bash
AZURE_OPENAI_ENDPOINT=https://aoai-virtualbpm-1763396587.openai.azure.com/
```

### Impact

- If the configured endpoint in `.env` is not resolving or aliased, API calls may fail
- This needs verification: either the .env is wrong, or there's a CNAME/alias setup

### Recommendation

**Priority: P0** - Verify which endpoint is correct and update configuration accordingly.

---

## Model Deployments

### 1. gpt-5-mini (Primary Chat Model)

| Property            | Value                |
| ------------------- | -------------------- |
| **Deployment Name** | gpt-5-mini           |
| **Model**           | gpt-5-mini           |
| **Version**         | 2025-08-07           |
| **SKU**             | GlobalStandard       |
| **Capacity**        | 100K TPM             |
| **Status**          | Succeeded            |
| **Created**         | 2025-11-17T16:24:53Z |

**Rate Limits**:

- **Requests Per Minute (RPM)**: 1,000
- **Tokens Per Minute (TPM)**: 100,000
- **Renewal Period**: 60 seconds

**Capabilities**:

- Chat Completion: ✓
- Assistants V2: ✓
- JSON Object Response: ✓
- Max Context: 128,000 tokens
- Max Output: 16,384 tokens

**Usage in MirrorBuddy**: Primary model for all maestri conversations, tools, and chat.

---

### 2. gpt-5-nano (Demo/Trial Model)

| Property            | Value                |
| ------------------- | -------------------- |
| **Deployment Name** | gpt-5-nano           |
| **Model**           | gpt-5-nano           |
| **Version**         | 2025-08-07           |
| **SKU**             | GlobalStandard       |
| **Capacity**        | 1K TPM               |
| **Status**          | Succeeded            |
| **Created**         | 2025-12-18T20:36:27Z |

**Rate Limits**:

- **Requests Per Minute (RPM)**: 1
- **Tokens Per Minute (TPM)**: 1,000
- **Renewal Period**: 60 seconds

**Capabilities**:

- Chat Completion: ✓
- Assistants V2: ✓

**Usage in MirrorBuddy**: Used for trial/demo tier.

**Note**: Extremely low capacity (1 RPM) - suitable for limited trial access.

---

## Missing Deployments (CRITICAL)

The following deployments are configured in `.env` but **NOT found** in Azure:

### 1. text-embedding-ada-002 (Embeddings)

```bash
# Configured in .env
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

**Impact**: RAG (semantic search) will NOT work without embeddings deployment.

**Required For**:

- Conversation memory search
- Knowledge base semantic search
- Similar question detection

**Recommendation**: Deploy immediately or configure alternative embedding model.

---

### 2. gpt-realtime (Voice)

```bash
# Configured in .env
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
```

**Impact**: Voice features (realtime audio) will NOT work.

**Required For**:

- Voice chat with maestri
- Ambient audio mode
- Real-time voice interaction

**Recommendation**: Deploy gpt-realtime (GA model, 2025-08-28) or gpt-realtime-mini.

---

### 3. tts-deployment (Text-to-Speech)

```bash
# Configured in .env
AZURE_OPENAI_TTS_DEPLOYMENT=tts-deployment
```

**Impact**: TTS features will fallback to browser speech synthesis.

**Required For**:

- Accessibility features
- Voice output for maestri responses
- Read-aloud functionality

**Recommendation**: Deploy tts-1 or tts-1-hd model.

---

## Account-Level Rate Limits

These limits apply to the entire Azure OpenAI account, regardless of deployment:

### API-Level Limits

| API                            | Limit            | Period     | Notes                   |
| ------------------------------ | ---------------- | ---------- | ----------------------- |
| **DALL-E POST**                | 30 requests      | 1 second   | Image generation        |
| **DALL-E Other**               | 30 requests      | 1 second   | Image operations        |
| **Assistants List**            | 120 requests     | 60 seconds | List assistants         |
| **Threads List**               | 120 requests     | 60 seconds | List threads            |
| **Vector Stores List**         | 120 requests     | 60 seconds | List vector stores      |
| **Vector Stores POST**         | 60 requests      | 1 second   | Create vector stores    |
| **Assistants/Threads/Vectors** | 100,000 requests | 1 second   | All other operations    |
| **Batches POST**               | 30 requests      | 60 seconds | Create batch jobs       |
| **Batches GET**                | 500 requests     | 60 seconds | Get batch status        |
| **Batches List**               | 100 requests     | 60 seconds | List batches            |
| **Moderations**                | 120 requests     | 60 seconds | Content moderation      |
| **OpenAI Default**             | 30 requests      | 1 second   | Fallback for /openai/\* |
| **Global Default**             | 30 requests      | 1 second   | Fallback for all paths  |

---

## Service Capabilities

### Fine-Tuning Limits

- **Max Fine-Tune Jobs**: 500
- **Max Concurrent Running Jobs**: 3
- **Max Global Standard Concurrent**: 3
- **Max Job Duration**: 720 hours (30 days)

### File Management Limits

- **Max User Files**: 100
- **Max Training File Size**: 512 MB (512,000,000 bytes)
- **Max File Import Duration**: 1 hour

### Evaluation Limits

- **Max Concurrent Evaluations**: 5
- **Max Evaluation Duration**: 5 hours

### Network & Security

- **Public Network Access**: Enabled
- **Private Endpoints**: None configured
- **Network ACLs**: None
- **Virtual Network**: Supported
- **Customer Managed Keys**: Supported
- **Trusted Services**: Microsoft.CognitiveServices, Microsoft.MachineLearningServices, Microsoft.Search, Microsoft.VideoIndexer

---

## Spending & Quota

### Budget Constraints

- **Azure Subscription Budget**: No budget limit found via `az consumption budget list`
- **Trial Mode Budget** (App-Level): 100 EUR/month (from `.env`: TRIAL_BUDGET_LIMIT_EUR)

**Note**: Azure subscription has no configured spending cap. Costs are pay-as-you-go with no hard limit.

### Regional Quota

- **West Europe Quota**: No specific quota limit returned by `az cognitiveservices usage list`
- **Deployment Capacity**: Controlled per-deployment (TPM allocations)

**Total Allocated Capacity**:

- gpt-5-mini: 100K TPM
- gpt-5-nano: 1K TPM
- **Total**: 101K TPM

---

## Usage Metrics (Last 48 Hours)

**Query Period**: 2026-01-20 00:00:00 to 2026-01-21 23:59:59

**Token Transactions**: No data returned (metric exists but no recent usage recorded).

**Interpretation**: Either no usage in last 48 hours, or metrics reporting has lag.

---

## Cost Optimization Recommendations

### 1. Model Selection Strategy

**Current**: gpt-5-mini (100K TPM capacity)
**Cost**: ~$0.15/$0.60 per 1M input/output tokens

**Recommendation**: Already using cost-effective mini model for primary workload. Good choice.

### 2. Voice Model Strategy (When Deployed)

`.env.example` suggests two-tier voice strategy:

```bash
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime        # Premium (MirrorBuddy only)
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-realtime-mini  # 80-90% cheaper
```

**Recommendation**: Deploy both tiers to optimize voice costs:

- Use mini for maestri, coaches, buddies
- Reserve premium for MirrorBuddy character

### 3. Embedding Model

**Options**:

- text-embedding-3-small (1536 dims, recommended, best quality)
- text-embedding-ada-002 (1536 dims, fallback)

**Recommendation**: Deploy text-embedding-3-small for better quality at similar cost.

---

## Compliance & Security

### F-03: Service Inventory

✓ Complete inventory documented
✓ Current plan: S0 (Standard) in West Europe
✓ All deployments listed with capacity allocations

### F-12: MCP/CLI Usage

✓ Azure CLI used for automated audit
✓ Commands documented for reproducibility
✓ JSON output captured for record-keeping

### F-13: Azure Compliance Analysis

✓ Azure resource configuration audited
✓ Rate limits documented per deployment
✓ Missing deployments identified and flagged

---

## Action Items

### Priority 0 (Immediate)

1. **Verify Endpoint URL**: Test if `aoai-virtualbpm-prod.openai.azure.com` is valid (CNAME alias?) or update `.env` to `aoai-virtualbpm-1763396587.openai.azure.com`
2. **Deploy Embeddings Model**: text-embedding-3-small or text-embedding-ada-002 (RAG broken without this)

### Priority 1 (Required for Features)

3. **Deploy Voice Model**: gpt-realtime or gpt-realtime-mini (voice features disabled without this)
4. **Deploy TTS Model**: tts-1 or tts-1-hd (TTS fallback to browser speech)

### Priority 2 (Optimization)

5. **Configure Spending Alert**: Set up Azure budget alerts at 50%, 80%, 100% of monthly threshold
6. **Enable Metrics Monitoring**: Verify TokenTransaction metrics are being collected
7. **Review gpt-4o and gpt-5-mini**: Determine if these low-capacity deployments are needed or can be removed

---

## Reproducibility

### Commands Used

```bash
# List all Azure OpenAI resources
az cognitiveservices account list --query "[?kind=='OpenAI']" -o json

# Get resource details
az cognitiveservices account show \
  --name aoai-virtualbpm-1763396587 \
  --resource-group rg-virtualbpm-prod-we -o json

# List deployments
az cognitiveservices account deployment list \
  --name aoai-virtualbpm-1763396587 \
  --resource-group rg-virtualbpm-prod-we -o json

# Get usage metrics
az monitor metrics list \
  --resource /subscriptions/1e365e42-6fde-44fd-b145-8a2f16c04b05/resourceGroups/rg-virtualbpm-prod-we/providers/Microsoft.CognitiveServices/accounts/aoai-virtualbpm-1763396587 \
  --metric "TokenTransaction" \
  --start-time 2026-01-20T00:00:00Z \
  --end-time 2026-01-21T23:59:59Z \
  --interval PT1H -o json

# Check budgets
az consumption budget list --resource-group rg-virtualbpm-prod-we -o json
```

---

## References

- Azure OpenAI Service Documentation: https://learn.microsoft.com/en-us/azure/ai-services/openai/
- Model Pricing: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
- Rate Limits: https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits
- ADR 0028: PostgreSQL + pgvector
- ADR 0033: RAG System
- ADR 0056: Trial Mode
