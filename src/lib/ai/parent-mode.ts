/**
 * Parent Mode for Maestri - Issue #63
 *
 * When a parent initiates a conversation with a Maestro about their child,
 * the Maestro adapts their communication style to be more formal and
 * provides insights based on the child's Learning records.
 */

// Define Learning interface locally (Prisma types unavailable at build time)
interface Learning {
  id: string;
  userId: string;
  category: string;
  insight: string;
  confidence: number;
  occurrences: number;
  firstObserved: Date;
  lastObserved: Date;
  conversationId: string | null;
  maestroId: string | null;
  subject: string | null;
  metadata: string | null;
}

/**
 * Parent mode instructions that wrap around the Maestro's system prompt
 */
export const PARENT_MODE_PREAMBLE = `
## MODALITA GENITORE - Conversazione con un Genitore

Stai parlando con il GENITORE dello studente, NON con lo studente.

### Adattamenti Comunicativi

**Tono e Linguaggio:**
- Usa un linguaggio formale e professionale (dare del "Lei")
- Mantieni un tono rassicurante ma professionale
- Evita gergo tecnico pedagogico - spiega in modo accessibile
- Sii empatico ma obiettivo nelle osservazioni

**Contenuto:**
- Condividi osservazioni specifiche sul percorso di apprendimento del figlio/a
- Offri suggerimenti pratici per supportare l'apprendimento a casa
- Spiega le strategie didattiche che stai utilizzando
- Rispondi a domande sui progressi e sulle difficolta

**Cosa NON Fare:**
- NON usare il tono giocoso che usi con lo studente
- NON fare battute o usare emoji
- NON minimizzare le difficolta
- NON dare diagnosi o valutazioni cliniche
- NON fare promesse sui risultati
- NON condividere informazioni su altri studenti

### Struttura delle Risposte

1. **Accoglienza**: Saluta cordialmente il genitore
2. **Contesto**: Riassumi brevemente le interazioni con lo studente
3. **Osservazioni**: Condividi insight specifici e concreti
4. **Suggerimenti**: Offri consigli pratici per casa
5. **Apertura**: Invita a fare domande

### Disclaimer AI

Ricorda sempre che sei un assistente AI educativo. Se il genitore chiede
valutazioni mediche, psicologiche o diagnostiche, indirizzalo verso
professionisti qualificati.
`;

/**
 * Formats Learning entries into context for the Maestro
 */
export function formatLearningsForParentMode(
  learnings: Learning[],
  studentName: string
): string {
  if (learnings.length === 0) {
    return `\nNon ho ancora abbastanza osservazioni su ${studentName} per fornire un quadro completo.
Le sessioni di studio future mi permetteranno di conoscere meglio il suo percorso di apprendimento.\n`;
  }

  // Group learnings by category
  const byCategory = learnings.reduce((acc, learning) => {
    const cat = learning.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(learning);
    return acc;
  }, {} as Record<string, Learning[]>);

  // Sort by confidence (high confidence = strengths, low confidence = growth areas)
  const strengths = learnings
    .filter(l => l.confidence >= 0.7)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const growthAreas = learnings
    .filter(l => l.confidence < 0.5)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 5);

  let context = `\n## Osservazioni su ${studentName}\n\n`;

  if (strengths.length > 0) {
    context += `### Punti di Forza Osservati\n`;
    for (const s of strengths) {
      context += `- ${s.insight} (osservato ${s.occurrences} ${s.occurrences === 1 ? 'volta' : 'volte'})\n`;
    }
    context += '\n';
  }

  if (growthAreas.length > 0) {
    context += `### Aree di Crescita\n`;
    for (const g of growthAreas) {
      context += `- ${g.insight} (osservato ${g.occurrences} ${g.occurrences === 1 ? 'volta' : 'volte'})\n`;
    }
    context += '\n';
  }

  // Category breakdown
  const categoryLabels: Record<string, string> = {
    learning_preference: 'Preferenze di Apprendimento',
    emotional_response: 'Risposte Emotive',
    struggle_pattern: 'Difficolta Ricorrenti',
    strength_area: 'Aree di Forza',
    interest_topic: 'Interessi Particolari',
    social_learning: 'Apprendimento Sociale',
    attention_pattern: 'Pattern di Attenzione',
    memory_strategy: 'Strategie di Memorizzazione',
  };

  context += `### Osservazioni per Categoria\n`;
  for (const [category, items] of Object.entries(byCategory)) {
    const label = categoryLabels[category] || category;
    context += `\n**${label}:**\n`;
    for (const item of items.slice(0, 3)) {
      context += `- ${item.insight}\n`;
    }
  }

  return context;
}

/**
 * Generates the complete parent mode system prompt
 */
export function generateParentModePrompt(
  maestroSystemPrompt: string,
  learnings: Learning[],
  studentName: string
): string {
  const learningsContext = formatLearningsForParentMode(learnings, studentName);

  return `${maestroSystemPrompt}

${PARENT_MODE_PREAMBLE}

${learningsContext}

---

Rispondi sempre in italiano e ricorda: stai parlando con il genitore di ${studentName}, non con lo studente.
`;
}

/**
 * Initial greeting for parent mode conversation
 */
export function getParentModeGreeting(
  maestroDisplayName: string,
  studentName: string,
  hasLearnings: boolean
): string {
  if (hasLearnings) {
    return `Buongiorno! Sono ${maestroDisplayName} e sono lieto/a di parlare con Lei del percorso di apprendimento di ${studentName}.

Ho avuto modo di interagire con ${studentName} durante le nostre sessioni di studio e ho raccolto alcune osservazioni che spero Le saranno utili.

Come posso aiutarLa oggi?`;
  }

  return `Buongiorno! Sono ${maestroDisplayName}.

Non ho ancora avuto molte interazioni con ${studentName}, quindi le mie osservazioni sono ancora limitate. Tuttavia, sono a Sua disposizione per rispondere alle Sue domande e per discutere di come possiamo supportare al meglio il percorso di apprendimento.

Come posso esserLe utile?`;
}
