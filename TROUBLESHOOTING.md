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

*Coming soon in next subtask*

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
