# Piano 10 Gennaio 2026: Stabilizzazione e Knowledge Graph

## Metadata

| Campo | Valore |
|-------|--------|
| **Data** | 10 Gennaio 2026 |
| **Autore** | Claude + Roberto |
| **Branch** | `main` (o feature branch per ogni wave) |
| **Stato** | Draft - In attesa approvazione |
| **Effort Totale** | 10-14 giorni |
| **Costo** | €0 (usa infrastruttura esistente) |

## Contesto

MirrorBuddy presenta fragilità in diverse aree che rallentano lo sviluppo:

1. **Voice**: WebSocket proxy con dual API, no timeout, connessioni zombie
2. **Astuccio**: Stato frammentato su 4+ useState, routes duplicate
3. **Tools**: Race condition auto-save, contenuto duplicato in Message + Material
4. **Database**: SQLite non scala, RAG costruito ma non integrato
5. **Graph**: Nessuna relazione tra materiali, no semantic search

### Vincoli

- Azure OpenAI Realtime: GRATIS (mantenere)
- OpenAI diretto: NON disponibile (no accesso voice API)
- Supabase: già in uso su Vercel
- Budget: €0

---

## Waves

| Wave | Nome | Effort | Branch | Dipendenze | File |
|------|------|--------|--------|------------|------|
| 1 | Stabilizzazione Base | 3-4 giorni | `feature/wave1-stabilization` | - | [Parte 1](./Plan10Jan-wave1-part1.md), [Parte 2](./Plan10Jan-wave1-part2.md) |
| 2 | [Database Migration](./Plan10Jan-wave2.md) | 2-3 giorni | `feature/wave2-postgres` | Wave 1 | 4 task |
| 3 | Knowledge Graph | 3-4 giorni | `feature/wave3-knowledge-graph` | Wave 2 | [Parte 1](./Plan10Jan-wave3-part1.md), [Parte 2](./Plan10Jan-wave3-part2.md) |
| 4 | [Semantic Integration](./Plan10Jan-wave4.md) | 2-3 giorni | `feature/wave4-semantic` | Wave 2, 3 | 4 task |

---

## Checklist Finale

### Pre-merge ogni Wave

```bash
# Thor verification script
npm run lint
npm run typecheck
npm run build
npm run test

# DB integrity
npx prisma validate
npx prisma migrate status

# No secrets committed
git diff --cached | grep -i "api_key\|secret\|password"
```

### Definition of Done

- [ ] Tutti i task della wave completati
- [ ] Thor verification passa
- [ ] No regressioni (test esistenti passano)
- [ ] PR reviewed e merged
- [ ] Changelog aggiornato

---

## Appendice: File Reference

| Area | File Principale | Linee |
|------|-----------------|-------|
| WebSocket Proxy | `src/server/realtime-proxy.ts` | 259 |
| Voice Session | `src/components/voice/voice-session.tsx` | 249 |
| Tool Executor | `src/lib/tools/tool-executor.ts` | 175 |
| Tool Persistence | `src/lib/tools/tool-persistence.ts` | 375 |
| Tool Display | `src/components/tools/tool-result-display.tsx` | 535 |
| Astuccio | `src/app/astuccio/components/astuccio-view.tsx` | 222 |
| Prisma Schema | `prisma/schema.prisma` | 1300 |
| RAG Service | `src/lib/rag/retrieval-service.ts` | ~200 |
| Embedding | `src/lib/rag/embedding-service.ts` | ~150 |

---

## Approvazione

| Ruolo | Nome | Data | Firma |
|-------|------|------|-------|
| Product Owner | Roberto | | |
| Tech Lead | Claude | 10/01/2026 | |
| QA (Thor) | | | |
