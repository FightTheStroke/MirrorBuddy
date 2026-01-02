# Piano: Tools in Chat Navigation Issue

**Data**: 2026-01-02
**Problema**: I tool nella visualizzazione normale con i professori sballano la navigazione
**Priorita**: MEDIA
**Status**: [ ] DA DISCUTERE CON ROBERTO

---

## PROBLEMA

Quando un tool (mappa mentale, quiz, flashcard, demo) viene creato durante una conversazione chat con un maestro/professore, la navigazione nella pagina viene compromessa.

### Sintomi Osservati
- La pagina "salta" o si muove in modo inaspettato
- Lo scroll si comporta in modo errato
- L'utente perde il contesto di dove si trovava nella chat
- I tool occupano troppo spazio nella vista chat normale

---

## POSSIBILI SOLUZIONI DA DISCUTERE

### Opzione 1: Tool compatti inline
- Mostrare una versione miniatura/preview del tool nella chat
- Click per espandere in modal/fullscreen
- Pro: Mantiene contesto chat
- Contro: Richiede design di tutte le versioni compatte

### Opzione 2: Switch automatico a fullscreen
- Quando viene creato un tool, passare automaticamente a fullscreen
- Tornare alla chat quando si chiude il tool
- Pro: Tool sempre visibili correttamente
- Contro: Cambio di contesto brusco

### Opzione 3: Layout split-view
- Chat a sinistra, tool a destra (come gia esiste in qualche modo)
- Il tool non interferisce con lo scroll della chat
- Pro: Entrambi visibili
- Contro: Richiede piu spazio, mobile-unfriendly

### Opzione 4: Tool come card collapsed
- Tool mostrato come card espandibile nella chat
- Espandi inline per vedere, collassa per continuare chat
- Pro: Flessibile
- Contro: Complessita implementativa

---

## ANALISI NECESSARIA

Prima di implementare, verificare:

1. **Qual e' il breakpoint problematico?**
   - Mobile? Tablet? Desktop?
   - Solo alcuni tool o tutti?

2. **Cosa causa esattamente il "salto"?**
   - Resize del container?
   - Scroll automatico?
   - Re-render del layout?

3. **User testing**
   - Quale opzione preferirebbero gli studenti?
   - Quanto e' importante vedere tool e chat insieme?

---

## FILE COINVOLTI (da verificare)

| File | Ruolo |
|------|-------|
| `src/components/education/conversation-flow.tsx` | Container principale chat |
| `src/components/tools/tool-result.tsx` | Rendering dei tool inline |
| `src/components/tools/focus-tool-layout.tsx` | Layout fullscreen tool |
| CSS/Layout files | Stili che potrebbero causare salti |

---

## PROSSIMI PASSI

1. **[DA FARE]** Discussione con Roberto per definire approccio
2. **[DA FARE]** Analisi tecnica del problema esatto
3. **[DA FARE]** Prototipo della soluzione scelta
4. **[DA FARE]** Test con utenti reali

---

## NOTE

Questo problema impatta l'UX durante le sessioni di studio.
La soluzione deve funzionare su:
- Desktop (primary)
- Tablet (secondary)
- Mobile (best effort)

---

**STATO**: In attesa di discussione con Roberto per definire l'approccio preferito.
