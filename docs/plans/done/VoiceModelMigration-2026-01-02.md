# Voice Model Migration: gpt-realtime → gpt-realtime-mini

**Data**: 2 Gennaio 2026
**Stato**: ARCHIVED - Incorporato in MasterPlan-v2.1-2026-01-02.md (WAVE 1)
**Priorità**: Alta
**Risparmio Stimato**: 80-90% sui costi voice

---

## ARCHIVAL NOTE (2026-01-02)

Questo piano è stato incorporato in: `docs/plans/doing/MasterPlan-v2.1-2026-01-02.md`
Vedere **WAVE 1: Voice Model Migration** per l'implementazione.

---

## Executive Summary

Azure ha rilasciato `gpt-realtime-mini` (versione 2025-12-15, GA) che offre lo stesso servizio voice realtime a ~10% del costo. Questo piano descrive la migrazione dal modello standard al mini.

### Impatto Economico

| Metrica | Prima (Standard) | Dopo (Mini) | Risparmio |
|---------|-----------------|-------------|-----------|
| Costo/min bidirezionale | $0.30 | ~$0.04 | 87% |
| Studente 30min/giorno | $198/mese | $26/mese | 87% |
| Margine tier Premium | 24% | 61% | +37pp |

---

## Analisi Codebase (2026-01-02)

### File Coinvolti

| File | Modifica Richiesta |
|------|-------------------|
| `src/server/realtime-proxy.ts` | Aggiungere logica hybrid (maestroId → deployment) |
| `.env.local` / `.env.production` | Aggiungere `AZURE_OPENAI_REALTIME_DEPLOYMENT_PREMIUM` |

### Stato Attuale

- Deployment singolo: `AZURE_OPENAI_REALTIME_DEPLOYMENT`
- Proxy già supporta Preview e GA API (linee 61-74)
- `maestroId` già passato via query param ma non usato per deployment selection
- Hook client (`use-voice-session.ts`) non richiede modifiche

### Decisione Architetturale

**Opzione B: Hybrid (Raccomandato)**
- Tutoring Maestri → gpt-realtime-mini
- MirrorBuddy → gpt-realtime (standard) per qualità emotiva

---

## Fasi di Implementazione

Vedere `MasterPlan-v2.1-2026-01-02.md` WAVE 1 per i dettagli completi.

### Checklist Originale

- [ ] Deploy gpt-realtime-mini su Azure
- [ ] Aggiornare env vars
- [ ] Modificare proxy con logica hybrid
- [ ] Test qualità 5 maestri + MirrorBuddy
- [ ] Rollout production
- [ ] Monitoring 7 giorni

---

## Fonti

- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [GPT Realtime Mini Pricing Analysis](https://www.eesel.ai/blog/gpt-realtime-mini-pricing)
- Documentazione interna: `docs/claude/voice-api.md`

---

*Archiviato: 2 Gennaio 2026*
*Successore: MasterPlan-v2.1-2026-01-02.md WAVE 1*
