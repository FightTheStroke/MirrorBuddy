# Voice Model Migration: gpt-realtime → gpt-realtime-mini

**Data**: 2 Gennaio 2026
**Stato**: Da Implementare
**Priorità**: Alta
**Risparmio Stimato**: 80-90% sui costi voice

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

## Fase 1: Deploy Modello Mini su Azure

### Prerequisiti
- [x] Verificato disponibilità modello in swedencentral
- [x] Verificato versione GA: `2025-12-15`
- [ ] Quota sufficiente per nuovo deployment

### Comandi

```bash
# 1. Verifica quota disponibile
az cognitiveservices account list-skus \
  --resource-group rg-virtualbpm-prod \
  --name aoai-virtualbpm-prod \
  --query "[?name=='gpt-realtime-mini']"

# 2. Deploy nuovo modello
az cognitiveservices account deployment create \
  --resource-group rg-virtualbpm-prod \
  --name aoai-virtualbpm-prod \
  --deployment-name gpt-realtime-mini \
  --model-name gpt-realtime-mini \
  --model-version 2025-12-15 \
  --sku-name Standard \
  --sku-capacity 1

# 3. Verifica deployment
az cognitiveservices account deployment show \
  --resource-group rg-virtualbpm-prod \
  --name aoai-virtualbpm-prod \
  --deployment-name gpt-realtime-mini
```

### Output Atteso
- Deployment `gpt-realtime-mini` attivo
- Endpoint: `https://aoai-virtualbpm-prod.openai.azure.com/`

---

## Fase 2: Configurazione Ambiente Dev

### File da Modificare

**`.env.local`** (dev):
```bash
# Cambiare da:
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime

# A:
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime-mini
```

### Verifica Compatibilità API

Il modello mini usa la stessa API del modello standard. Verificare:

1. **Event names**: Dovrebbero essere identici (GA API format)
2. **Session config**: Stessi parametri supportati
3. **Voices**: Stesse voci disponibili

```typescript
// Nessuna modifica necessaria in:
// - src/lib/hooks/use-voice-session.ts
// - src/server/realtime-proxy.ts
// Solo cambio env var
```

---

## Fase 3: Test Qualità

### Scenari di Test

| Test | Maestro | Durata | Cosa Verificare |
|------|---------|--------|-----------------|
| Tutoring base | Socrate | 5 min | Comprensione, fluidità |
| Spiegazione concetti | Dante | 5 min | Qualità narrativa |
| Matematica | Pitagora | 5 min | Precisione risposte |
| Supporto emotivo | MirrorBuddy | 10 min | Empatia, sfumature |
| Onboarding | Coach | 3 min | Chiarezza istruzioni |

### Criteri Accettazione

- [ ] Latenza percepita equivalente o migliore
- [ ] Qualità audio comparabile
- [ ] Comprensione italiano: nessuna regressione
- [ ] Personalità Maestri: mantenuta (system prompt funziona)
- [ ] Turn detection: funziona correttamente
- [ ] Interruzioni: gestite correttamente

### Metriche da Raccogliere

```typescript
// Durante test, loggare:
interface VoiceQualityMetrics {
  sessionId: string;
  model: 'gpt-realtime' | 'gpt-realtime-mini';
  maestro: string;
  latencyMs: number;        // Tempo risposta
  turnCount: number;        // Numero turni
  interruptionCount: number;// Interruzioni
  userRating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
```

---

## Fase 4: Decisione MirrorBuddy

MirrorBuddy (supporto emotivo) richiede sfumature emotive. Opzioni:

### Opzione A: Tutto Mini
- Pro: Semplice, costi uniformi
- Contro: Potenziale perdita qualità emotiva

### Opzione B: Hybrid (Raccomandato)
- Tutoring Maestri → Mini
- MirrorBuddy → Standard
- Implementazione: Check `characterId` in `realtime-proxy.ts`

```typescript
// In src/server/realtime-proxy.ts
const deployment = characterId === 'mirrorbuddy'
  ? process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_PREMIUM // standard
  : process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;        // mini
```

### Opzione C: Test e Decide
- Testa MirrorBuddy con Mini
- Se qualità accettabile → tutto Mini
- Se no → Opzione B

---

## Fase 5: Rollout Production

### Checklist Pre-Rollout

- [ ] Tutti i test Fase 3 passati
- [ ] Decisione MirrorBuddy presa
- [ ] Backup env vars attuali
- [ ] Piano rollback pronto

### Procedura

```bash
# 1. Aggiorna .env.production
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime-mini

# 2. Deploy
npm run build
# ... deploy procedure ...

# 3. Verifica
curl https://convergioedu.com/api/realtime/status
# Deve mostrare deployment: gpt-realtime-mini
```

### Rollback (se necessario)

```bash
# Ripristina env var
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime

# Redeploy
```

---

## Fase 6: Monitoring Post-Rollout

### Metriche da Monitorare (7 giorni)

| Metrica | Target | Alert |
|---------|--------|-------|
| Latenza media | < 500ms | > 800ms |
| Error rate | < 1% | > 5% |
| Session duration | invariata | -30% |
| User complaints | 0 | > 3 |

### Dashboard

Aggiungere a telemetry:
- `voice_model` tag per distinguere standard vs mini
- Confronto metriche pre/post migrazione

---

## Timeline Stimata

| Fase | Durata | Dipendenze |
|------|--------|------------|
| 1. Deploy Azure | 30 min | - |
| 2. Config Dev | 10 min | Fase 1 |
| 3. Test Qualità | 2-4 ore | Fase 2 |
| 4. Decisione MirrorBuddy | 1 ora | Fase 3 |
| 5. Rollout Prod | 1 ora | Fase 4 |
| 6. Monitoring | 7 giorni | Fase 5 |

**Totale pre-prod**: ~1 giorno
**Monitoring**: 1 settimana

---

## Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Qualità inferiore | Media | Alto | Test approfonditi Fase 3, rollback ready |
| API incompatibile | Bassa | Alto | Stesso formato GA API |
| Latenza peggiore | Bassa | Medio | Modello più piccolo = più veloce |
| Voci diverse | Molto bassa | Basso | Stesse voci Azure |

---

## Conclusione

La migrazione a `gpt-realtime-mini` è a basso rischio e alto impatto economico. Il modello è GA, usa la stessa API, e promette 80-90% di risparmio. L'unico punto di attenzione è la qualità per MirrorBuddy, risolvibile con approccio hybrid.

**Raccomandazione**: Procedere con Fase 1-3 immediatamente, valutare risultati, poi decidere su MirrorBuddy.

---

## Fonti

- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [GPT Realtime Mini Pricing Analysis](https://www.eesel.ai/blog/gpt-realtime-mini-pricing)
- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- Documentazione interna: `docs/claude/voice-api.md`
