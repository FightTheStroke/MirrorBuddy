# MirrorBuddy Troubleshooting Guide

> Solutions to common development and deployment issues

---

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Azure OpenAI Issues](#azure-openai-issues)
- [Database Issues](#database-issues)
- [Voice Session Issues](#voice-session-issues)
- [Build & Development Issues](#build--development-issues)
- [Ollama Issues](#ollama-issues)
- [Environment Configuration](#environment-configuration)
- [Getting Help](#getting-help)

---

## Quick Diagnosis

**Find your issue by symptom:**

| Symptom | Likely Cause | Quick Fix | Section |
|---------|--------------|-----------|---------|
| "API key is invalid" | Wrong credentials or endpoint | Check `.env.local` matches Azure Portal | [Azure OpenAI](#azure-openai-issues) |
| Voice button does nothing | Missing Realtime API config | Verify `AZURE_OPENAI_REALTIME_*` vars | [Voice Sessions](#voice-session-issues) |
| "Deployment not found" | Wrong deployment name | Check Azure Portal deployment name | [Azure OpenAI](#azure-openai-issues) |
| Database connection failed | PostgreSQL not running | Start PostgreSQL: `brew services start postgresql` | [Database](#database-issues) |
| "pgvector extension not found" | pgvector not installed | Install: `brew install pgvector` (macOS) | [Database](#database-issues) |
| Prisma errors on startup | Schema out of sync | Run: `npx prisma generate && npx prisma db push` | [Database](#database-issues) |
| Microphone not working | Browser permissions denied | Enable mic in browser settings | [Voice Sessions](#voice-session-issues) |
| Voice cuts out after 5 sec | Wrong audio format | Check sample rate: 24000 Hz, PCM16 | [Voice Sessions](#voice-session-issues) |
| WebSocket connection failed | Not using HTTPS in prod | Deploy with HTTPS or use localhost | [Voice Sessions](#voice-session-issues) |
| Build fails with TS errors | Stale TypeScript cache | Run: `npm run typecheck` then fix errors | [Build & Development](#build--development-issues) |
| `npm install` fails | Package conflicts | Delete `node_modules` & `package-lock.json`, reinstall | [Build & Development](#build--development-issues) |
| Ollama connection refused | Ollama not running | Start: `ollama serve` | [Ollama](#ollama-issues) |
| "Model not found" (Ollama) | Model not pulled | Pull model: `ollama pull llama3.2` | [Ollama](#ollama-issues) |
| Environment variable ignored | Wrong file name | Use `.env.local` (not `.env`) | [Environment](#environment-configuration) |
| AI responses are slow | Using Ollama without GPU | Switch to Azure OpenAI or add GPU | [Ollama](#ollama-issues) |

---

## Azure OpenAI Issues

### Authentication & Connection

#### Problem: "API key is invalid" or "401 Unauthorized"

**Cause:** Wrong API key or endpoint URL

**Solution:**
1. Verify credentials match Azure Portal:
   ```bash
   # In Azure Portal → Your OpenAI Resource → Keys and Endpoint
   # Copy EXACTLY as shown
   ```

2. Check `.env.local` format:
   ```bash
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-key-here
   ```

3. **Common mistakes:**
   - Missing `https://` in endpoint
   - Extra `/` at end of endpoint
   - Using OpenAI API key instead of Azure OpenAI key
   - Key from wrong Azure subscription

4. Test connection:
   ```bash
   curl https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview \
     -H "api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   ```

#### Problem: "Deployment not found" or "404 Not Found"

**Cause:** Deployment name in code doesn't match Azure Portal

**Solution:**
1. List your actual deployments:
   ```bash
   # In Azure Portal → Your OpenAI Resource → Model deployments
   ```

2. Match `.env.local` to deployment names:
   ```bash
   AZURE_OPENAI_DEPLOYMENT=gpt-4o              # For chat
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime  # For voice
   ```

3. **IMPORTANT:** Use deployment name, NOT model name:
   - ✅ Correct: `gpt-4o` (your deployment name)
   - ❌ Wrong: `gpt-4o-2024-08-06` (model ID)

---

### Preview vs GA API (CRITICAL)

> ⚠️ **This is the #1 cause of "voice works but no audio plays"**

#### Problem: Voice connects but audio never plays

**Cause:** Code expects wrong event names for your API version

**Background:** Azure has TWO versions with DIFFERENT event names:

| Aspect | Preview API | GA API |
|--------|-------------|--------|
| Deployment | `gpt-4o-realtime-preview` | `gpt-realtime` |
| URL Path | `/openai/realtime` | `/openai/v1/realtime` |
| Audio event | `response.audio.delta` | `response.output_audio.delta` |
| Transcript event | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

**Solution:**
1. Check your deployment name in Azure Portal
2. Our code handles BOTH formats automatically (see `src/server/realtime-proxy.ts:61`)
3. If you modify voice code, ALWAYS handle both event names:
   ```typescript
   case 'response.output_audio.delta':  // GA API
   case 'response.audio.delta':         // Preview API
     playAudio(event.delta);
     break;
   ```

**Reference:** See `docs/technical/AZURE_REALTIME_API.md` for full details

---

### Voice/Realtime API Configuration

#### Problem: Voice button doesn't appear or is disabled

**Cause:** Missing Realtime API environment variables

**Solution:**
1. Ensure ALL three vars are set:
   ```bash
   AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_REALTIME_API_KEY=your-key
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime
   ```

2. Verify deployment exists in Azure Portal

3. Restart dev server after changing `.env.local`

#### Problem: "Invalid value: 'gpt-4o-transcribe'. Supported values are: 'whisper-1'"

**Cause:** Using wrong transcription model in Realtime API

**Solution:**
- Realtime API ONLY supports `whisper-1` for transcription
- `gpt-4o-transcribe` is only for `/audio/transcriptions` endpoint
- Our code uses correct model (`src/lib/hooks/use-voice-session.ts:524`)

**Reference:** See `docs/claude/voice-api.md` → "Trascrizione Audio" section

#### Problem: Voice session config fails with "Invalid session"

**Cause:** Wrong format for Preview vs GA API

**Solution:**
1. For Preview API (`gpt-4o-realtime-preview`):
   ```typescript
   {
     type: 'session.update',
     session: {
       voice: 'alloy',  // FLAT in session
       instructions: '...',
       input_audio_format: 'pcm16',
       turn_detection: { type: 'server_vad', ... }
     }
   }
   ```

2. For GA API (`gpt-realtime`):
   - Format may differ (see Azure docs)
   - Our proxy auto-detects and adjusts

3. Check proxy logs for exact error:
   ```bash
   # Dev server shows WebSocket proxy logs
   npm run dev
   ```

---

### Model Availability & Cost

#### Problem: "Model 'gpt-realtime-mini' not found"

**Cause:** Model not deployed in your Azure resource

**Solution:**
1. Deploy via Azure Portal or CLI:
   ```bash
   az cognitiveservices account deployment create \
     --resource-group rg-virtualbpm-prod \
     --name aoai-virtualbpm-prod \
     --deployment-name gpt-realtime-mini \
     --model-name gpt-realtime-mini \
     --model-version 2025-12-15 \
     --sku-name Standard \
     --sku-capacity 1
   ```

2. Update `.env.local`:
   ```bash
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime-mini
   ```

#### Choosing Between Models

| Use Case | Model | Cost/min | When to Use |
|----------|-------|----------|-------------|
| Tutoring, Onboarding | `gpt-realtime-mini` | ~$0.03-0.05 | **Recommended** - 90% cheaper |
| Emotional support | `gpt-realtime` | ~$0.30 | When nuance matters |
| Testing | `gpt-realtime-mini` | ~$0.03-0.05 | Always use for dev |

**Reference:** See `docs/claude/voice-api.md` → "Modelli Disponibili" for full comparison

---

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `"Deployment not found"` | Wrong deployment name | Match Azure Portal exactly |
| `"Invalid api-version"` | Using Preview param on GA | Remove `api-version` for GA |
| `"Invalid model"` | Using `model=` on Preview | Use `deployment=` for Preview |
| `"Rate limit exceeded"` | Too many requests | Check Azure quota, add delay |
| `"Content filtered"` | Response blocked by filter | Review content policy settings |
| `"Insufficient quota"` | Tokens per minute exceeded | Increase TPM in deployment |

---

### Debugging Checklist

1. **Test basic connection first:**
   ```bash
   # Use test-voice page
   npm run dev
   # Navigate to http://localhost:3000/test-voice
   ```

2. **Check browser console:** Look for WebSocket errors

3. **Check server logs:** See proxy connection logs in terminal

4. **Verify all env vars:**
   ```bash
   # Should print all values
   node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.AZURE_OPENAI_ENDPOINT)"
   ```

5. **Test deployments directly:**
   ```bash
   curl "https://your-resource.openai.azure.com/openai/deployments?api-version=2024-08-01-preview" \
     -H "api-key: your-key"
   ```

---

### Related Documentation

- **Full API reference:** `docs/technical/AZURE_REALTIME_API.md`
- **Voice configuration:** `docs/claude/voice-api.md`
- **Setup guide:** `SETUP.md` → "Azure OpenAI Configuration"

---

## Database Issues

*Coming soon in next subtask*

---

## Voice Session Issues

*Coming soon in next subtask*

---

## Build & Development Issues

*Coming soon in next subtask*

---

## Ollama Issues

*Coming soon in next subtask*

---

## Environment Configuration

*Coming soon in next subtask*

---

## Getting Help

*Coming soon in next subtask*

---

**See also:** [SETUP.md](SETUP.md) | [README.md](README.md) | [CONTRIBUTING.md](CONTRIBUTING.md)
