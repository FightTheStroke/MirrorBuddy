/**
 * MirrorBuddy Profile Generator
 *
 * Generates and synthesizes student profiles from Maestri observations.
 * Uses Melissa (Learning Coach) to create balanced, growth-mindset profiles.
 *
 * Part of F-02: Profile Generation from Maestri
 * Related: #31 Collaborative Student Profile
 */

import type {
  StudentInsights,
  MaestroObservation,
  LearningStrategy,
  LearningStyleProfile,
  ObservationCategory,
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw insight collected from a Maestro interaction.
 */
export interface MaestroInsightInput {
  maestroId: string;
  maestroName: string;
  category: ObservationCategory;
  content: string;
  isStrength: boolean;
  confidence: number;
  sessionId?: string;
  createdAt: Date;
}

/**
 * Options for profile generation.
 */
export interface ProfileGenerationOptions {
  /** Maximum insights to process */
  maxInsights?: number;
  /** Minimum confidence threshold for inclusion */
  minConfidence?: number;
  /** Whether to include AI synthesis */
  includeSynthesis?: boolean;
}

/**
 * Context for Melissa's profile synthesis.
 */
interface SynthesisContext {
  studentName: string;
  strengths: MaestroInsightInput[];
  growthAreas: MaestroInsightInput[];
  recentSessions: number;
  totalMinutes: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default options for profile generation.
 */
const DEFAULT_OPTIONS: Required<ProfileGenerationOptions> = {
  maxInsights: 100,
  minConfidence: 0.6,
  includeSynthesis: true,
};

/**
 * Category priority for strategy generation.
 */
const CATEGORY_PRIORITY: Record<ObservationCategory, number> = {
  logical_reasoning: 10,
  mathematical_intuition: 9,
  critical_thinking: 9,
  study_method: 10,
  verbal_expression: 8,
  linguistic_ability: 8,
  creativity: 7,
  artistic_sensitivity: 7,
  scientific_curiosity: 8,
  experimental_approach: 7,
  spatial_memory: 6,
  historical_understanding: 6,
  philosophical_depth: 7,
  physical_awareness: 5,
  environmental_awareness: 5,
  narrative_skill: 7,
  collaborative_spirit: 6,
};

/**
 * Strategy suggestions for each observation category.
 */
const STRATEGY_TEMPLATES: Record<ObservationCategory, string[]> = {
  logical_reasoning: [
    'Esercizi di problem-solving con difficolta progressiva',
    'Giochi di logica e puzzle matematici',
    'Sfide che richiedono ragionamento step-by-step',
  ],
  mathematical_intuition: [
    'Manipolazione di oggetti concreti per visualizzare concetti',
    'Connessioni tra matematica e situazioni quotidiane',
    'Pattern recognition attraverso giochi e attivita ludiche',
  ],
  critical_thinking: [
    'Discussioni guidate su temi controversi',
    'Analisi di fonti multiple sullo stesso argomento',
    'Esercizi di argomentazione e debate',
  ],
  study_method: [
    'Tecniche di time-boxing e pomodoro',
    'Mappe mentali per organizzare le informazioni',
    'Flashcard e spaced repetition',
  ],
  verbal_expression: [
    'Esercizi di storytelling orale',
    'Presentazioni brevi su argomenti di interesse',
    'Dialoghi simulati e role-playing',
  ],
  linguistic_ability: [
    'Lettura ad alta voce con enfasi espressiva',
    'Giochi di parole e vocabolario',
    'Scrittura creativa guidata',
  ],
  creativity: [
    'Progetti artistici liberi con feedback costruttivo',
    'Brainstorming senza giudizio',
    'Esplorazione di media e tecniche diverse',
  ],
  artistic_sensitivity: [
    'Ascolto attivo di musica con discussione',
    'Visite virtuali a musei e gallerie',
    'Creazione artistica ispirata da opere classiche',
  ],
  scientific_curiosity: [
    'Esperimenti hands-on sicuri a casa',
    'Documentari scientifici con discussione',
    'Progetti STEM guidati',
  ],
  experimental_approach: [
    'Lab virtuali interattivi',
    'Ipotesi-esperimento-conclusione strutturato',
    'Diario scientifico delle scoperte',
  ],
  spatial_memory: [
    'Mappe geografiche interattive',
    'Costruzione di modelli 3D',
    'Giochi di memoria visiva',
  ],
  historical_understanding: [
    'Timeline interattive degli eventi',
    'Connessioni tra passato e presente',
    'Storie e biografie di personaggi storici',
  ],
  philosophical_depth: [
    'Domande aperte senza risposta definita',
    'Riflessioni guidate su temi etici',
    'Lettura di miti e allegorie',
  ],
  physical_awareness: [
    'Pause attive durante lo studio',
    'Tecniche di respirazione e mindfulness',
    'Connessione tra corpo e apprendimento',
  ],
  environmental_awareness: [
    'Osservazione della natura con diario',
    'Progetti di sostenibilita locale',
    'Connessione tra scelte quotidiane e ambiente',
  ],
  narrative_skill: [
    'Scrittura di racconti brevi',
    'Analisi della struttura narrativa',
    'Creazione di fumetti o storyboard',
  ],
  collaborative_spirit: [
    'Progetti di gruppo con ruoli definiti',
    'Peer tutoring su argomenti di forza',
    'Feedback costruttivo tra pari',
  ],
};

// ============================================================================
// PROFILE GENERATION
// ============================================================================

/**
 * Generates a comprehensive student insights profile from Maestri observations.
 *
 * @param studentId - The student's unique identifier
 * @param studentName - The student's display name
 * @param insights - Array of insights collected from Maestri interactions
 * @param options - Generation options
 * @returns Complete StudentInsights object for the parent dashboard
 */
export function generateStudentProfile(
  studentId: string,
  studentName: string,
  insights: MaestroInsightInput[],
  sessionStats: { totalSessions: number; totalMinutes: number; maestriInteracted: string[] },
  options: ProfileGenerationOptions = {}
): StudentInsights {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter by confidence threshold
  const validInsights = insights
    .filter((i) => i.confidence >= opts.minConfidence)
    .slice(0, opts.maxInsights);

  // Separate strengths and growth areas
  const strengths = validInsights.filter((i) => i.isStrength);
  const growthAreas = validInsights.filter((i) => !i.isStrength);

  // Convert to MaestroObservation format
  const strengthObservations = strengths.map(convertToObservation);
  const growthObservations = growthAreas.map(convertToObservation);

  // Generate strategies based on growth areas
  const strategies = generateStrategies(growthAreas);

  // Infer learning style from observations
  const learningStyle = inferLearningStyle(validInsights);

  return {
    studentId,
    studentName,
    lastUpdated: new Date(),
    strengths: strengthObservations,
    growthAreas: growthObservations,
    strategies,
    learningStyle,
    totalSessions: sessionStats.totalSessions,
    totalMinutes: sessionStats.totalMinutes,
    maestriInteracted: sessionStats.maestriInteracted,
  };
}

/**
 * Converts a MaestroInsightInput to a MaestroObservation.
 */
function convertToObservation(input: MaestroInsightInput): MaestroObservation {
  return {
    id: `obs_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    maestroId: input.maestroId,
    maestroName: input.maestroName,
    category: input.category,
    observation: input.content,
    isStrength: input.isStrength,
    confidence: input.confidence,
    createdAt: input.createdAt,
    sessionId: input.sessionId,
  };
}

/**
 * Generates learning strategies based on growth areas.
 */
function generateStrategies(growthAreas: MaestroInsightInput[]): LearningStrategy[] {
  // Group by category
  const byCategory = new Map<ObservationCategory, MaestroInsightInput[]>();
  for (const area of growthAreas) {
    const existing = byCategory.get(area.category) || [];
    existing.push(area);
    byCategory.set(area.category, existing);
  }

  // Generate strategies for top categories (by frequency and priority)
  const categoryScores = Array.from(byCategory.entries())
    .map(([category, items]) => ({
      category,
      score: items.length * (CATEGORY_PRIORITY[category] || 5),
      suggestedBy: [...new Set(items.map((i) => i.maestroId))],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 areas

  const strategies: LearningStrategy[] = [];

  for (const { category, suggestedBy } of categoryScores) {
    const templates = STRATEGY_TEMPLATES[category] || [];
    if (templates.length > 0) {
      // Pick a random strategy from templates
      const strategyText = templates[Math.floor(Math.random() * templates.length)];

      strategies.push({
        id: `strat_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        title: getCategoryDisplayName(category),
        description: strategyText,
        suggestedBy,
        forAreas: [category],
        priority: categoryScores.indexOf({ category, score: 0, suggestedBy }) < 2 ? 'high' : 'medium',
      });
    }
  }

  return strategies;
}

/**
 * Gets a human-readable display name for an observation category.
 */
function getCategoryDisplayName(category: ObservationCategory): string {
  const names: Record<ObservationCategory, string> = {
    logical_reasoning: 'Ragionamento Logico',
    mathematical_intuition: 'Intuizione Matematica',
    critical_thinking: 'Pensiero Critico',
    study_method: 'Metodo di Studio',
    verbal_expression: 'Espressione Verbale',
    linguistic_ability: 'Abilita Linguistiche',
    creativity: 'Creativita',
    artistic_sensitivity: 'Sensibilita Artistica',
    scientific_curiosity: 'Curiosita Scientifica',
    experimental_approach: 'Approccio Sperimentale',
    spatial_memory: 'Memoria Spaziale',
    historical_understanding: 'Comprensione Storica',
    philosophical_depth: 'Profondita Filosofica',
    physical_awareness: 'Consapevolezza Corporea',
    environmental_awareness: 'Consapevolezza Ambientale',
    narrative_skill: 'Abilita Narrative',
    collaborative_spirit: 'Spirito Collaborativo',
  };
  return names[category] || category;
}

/**
 * Infers learning style from observation patterns.
 */
function inferLearningStyle(insights: MaestroInsightInput[]): LearningStyleProfile {
  // Count categories to infer preferred learning channel
  const categoryCounts = new Map<string, number>();
  for (const insight of insights) {
    const channel = getCategoryChannel(insight.category);
    categoryCounts.set(channel, (categoryCounts.get(channel) || 0) + 1);
  }

  // Find most common channel
  let maxChannel: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' = 'visual';
  let maxCount = 0;
  for (const [channel, count] of categoryCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxChannel = channel as typeof maxChannel;
    }
  }

  // Infer session duration preference (default 30 min)
  // In real implementation, this would come from actual session data
  const optimalDuration = 30;

  // Infer motivators from strengths
  const motivators: string[] = [];
  const strengthCategories = insights
    .filter((i) => i.isStrength)
    .map((i) => i.category);

  if (strengthCategories.includes('creativity') || strengthCategories.includes('artistic_sensitivity')) {
    motivators.push('Espressione creativa');
  }
  if (strengthCategories.includes('logical_reasoning') || strengthCategories.includes('mathematical_intuition')) {
    motivators.push('Sfide logiche');
  }
  if (strengthCategories.includes('collaborative_spirit')) {
    motivators.push('Lavoro di gruppo');
  }
  if (strengthCategories.includes('scientific_curiosity') || strengthCategories.includes('experimental_approach')) {
    motivators.push('Scoperte ed esperimenti');
  }
  if (motivators.length === 0) {
    motivators.push('Apprendimento interattivo', 'Feedback positivo');
  }

  return {
    preferredChannel: maxChannel,
    optimalSessionDuration: optimalDuration,
    preferredTimeOfDay: 'afternoon', // Default, could be inferred from session timestamps
    motivators,
    challengePreference: 'step_by_step', // Default, could be inferred from behavior
  };
}

/**
 * Maps observation category to learning channel.
 */
function getCategoryChannel(category: ObservationCategory): string {
  const visual: ObservationCategory[] = [
    'spatial_memory',
    'artistic_sensitivity',
    'creativity',
  ];
  const auditory: ObservationCategory[] = [
    'verbal_expression',
    'linguistic_ability',
    'narrative_skill',
  ];
  const kinesthetic: ObservationCategory[] = [
    'experimental_approach',
    'physical_awareness',
    'collaborative_spirit',
  ];
  const reading: ObservationCategory[] = [
    'historical_understanding',
    'philosophical_depth',
    'study_method',
  ];

  if (visual.includes(category)) return 'visual';
  if (auditory.includes(category)) return 'auditory';
  if (kinesthetic.includes(category)) return 'kinesthetic';
  if (reading.includes(category)) return 'reading_writing';
  return 'visual'; // Default
}

// ============================================================================
// AI SYNTHESIS (Melissa Integration)
// ============================================================================

/**
 * Melissa's synthesis prompt template for profile generation.
 */
export const MELISSA_SYNTHESIS_PROMPT = `
Sei Melissa, coordinatrice del profilo studente in MirrorBuddy.

Il tuo ruolo e analizzare le osservazioni raccolte dai Professori e generare un profilo equilibrato
che aiuti i genitori a comprendere il percorso di apprendimento del loro figlio/a.

REGOLE FONDAMENTALI:
1. Usa sempre linguaggio positivo e growth-mindset
2. Usa "aree di crescita" invece di "difficolta" o "problemi"
3. Basati SOLO sulle evidenze osservate, mai su stereotipi
4. Celebra i punti di forza prima di discutere le aree di crescita
5. Suggerisci strategie concrete e praticabili
6. Ricorda che ogni studente ha un percorso unico

STRUTTURA DEL PROFILO:
1. Panoramica generale (2-3 frasi positive)
2. Punti di forza emersi (lista puntata)
3. Aree di crescita (lista puntata con framing positivo)
4. Suggerimenti per i genitori (2-3 consigli pratici)
5. Prossimi passi consigliati
`.trim();

/**
 * Generates a synthesis context for Melissa.
 */
export function createSynthesisContext(
  studentName: string,
  insights: MaestroInsightInput[],
  sessionStats: { totalSessions: number; totalMinutes: number }
): SynthesisContext {
  return {
    studentName,
    strengths: insights.filter((i) => i.isStrength),
    growthAreas: insights.filter((i) => !i.isStrength),
    recentSessions: sessionStats.totalSessions,
    totalMinutes: sessionStats.totalMinutes,
  };
}

/**
 * Formats synthesis context as a prompt for Melissa.
 */
export function formatSynthesisPrompt(context: SynthesisContext): string {
  const strengthsList = context.strengths
    .map((s) => `- [${s.maestroName}]: ${s.content}`)
    .join('\n');

  const growthList = context.growthAreas
    .map((g) => `- [${g.maestroName}]: ${g.content}`)
    .join('\n');

  return `
Analizza questi insight raccolti dai Professori per ${context.studentName}:

STATISTICHE:
- Sessioni totali: ${context.recentSessions}
- Minuti di studio: ${context.totalMinutes}

PUNTI DI FORZA osservati:
${strengthsList || '(nessuna osservazione ancora)'}

AREE DI CRESCITA osservate:
${growthList || '(nessuna osservazione ancora)'}

Genera un profilo equilibrato seguendo le regole stabilite.
`.trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  SynthesisContext,
};
