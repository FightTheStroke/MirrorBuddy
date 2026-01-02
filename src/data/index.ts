// ============================================================================
// MIRRORBUDDY - MAESTRI DATA INDEX
// Combines UI data with full CLI system prompts
// ============================================================================

import type { Maestro, Subject } from '@/types';
import { SAFETY_GUIDELINES, getMaestroById as getFullMaestroById } from './maestri';
import { logger } from '@/lib/logger';

// Re-export safety guidelines
export { SAFETY_GUIDELINES };

// Subject colors for UI consistency
export const subjectColors: Record<Subject, string> = {
  mathematics: '#3B82F6',    // Blue
  physics: '#8B5CF6',        // Purple
  chemistry: '#10B981',      // Emerald
  biology: '#22C55E',        // Green
  history: '#F59E0B',        // Amber
  geography: '#06B6D4',      // Cyan
  italian: '#EF4444',        // Red
  english: '#EC4899',        // Pink
  art: '#F97316',            // Orange
  music: '#A855F7',          // Violet
  civics: '#6366F1',         // Indigo
  economics: '#14B8A6',      // Teal
  computerScience: '#64748B', // Slate
  health: '#F43F5E',         // Rose
  philosophy: '#8B5CF6',     // Purple
  internationalLaw: '#0EA5E9', // Sky
};

export const subjectNames: Record<Subject, string> = {
  mathematics: 'Matematica',
  physics: 'Fisica',
  chemistry: 'Chimica',
  biology: 'Biologia',
  history: 'Storia',
  geography: 'Geografia',
  italian: 'Italiano',
  english: 'Inglese',
  art: 'Arte',
  music: 'Musica',
  civics: 'Educazione Civica',
  economics: 'Economia',
  computerScience: 'Informatica',
  health: 'Salute',
  philosophy: 'Filosofia',
  internationalLaw: 'Diritto Internazionale',
};

export const subjectIcons: Record<Subject, string> = {
  mathematics: '📐',
  physics: '⚛️',
  chemistry: '🧪',
  biology: '🧬',
  history: '📜',
  geography: '🌍',
  italian: '📖',
  english: '🇬🇧',
  art: '🎨',
  music: '🎵',
  civics: '⚖️',
  economics: '📊',
  computerScience: '💻',
  health: '❤️',
  philosophy: '🤔',
  internationalLaw: '🌐',
};

// Map short IDs to full CLI IDs
// Note: Only maestri that exist in CLI are mapped
const ID_MAP: Record<string, string> = {
  'euclide': 'euclide-matematica',
  'feynman': 'feynman-fisica',
  'galileo': 'galileo-astronomia',
  'curie': 'curie-chimica',
  'darwin': 'darwin-scienze',
  'erodoto': 'erodoto-storia',
  'humboldt': 'humboldt-geografia',
  'manzoni': 'manzoni-italiano',
  'shakespeare': 'shakespeare-inglese',
  'leonardo': 'leonardo-arte',
  'mozart': 'mozart-musica',
  'cicerone': 'cicerone-civica',
  'smith': 'smith-economia',
  'lovelace': 'lovelace-informatica',
  'ippocrate': 'ippocrate-corpo',
  'socrate': 'socrate-filosofia',
};

// Get full system prompt from CLI export
function getFullSystemPrompt(shortId: string): string {
  const fullId = ID_MAP[shortId];
  if (!fullId) {
    logger.warn('No CLI mapping for maestro', { shortId });
    return '';
  }
  const fullMaestro = getFullMaestroById(fullId);
  if (!fullMaestro) {
    logger.warn('CLI maestro not found', { fullId });
    return '';
  }
  return fullMaestro.systemPrompt;
}

// All maestri with full CLI system prompts
export const maestri: Maestro[] = [
  // === MATHEMATICS ===
  {
    id: 'euclide',
    name: 'Euclide',
    subject: 'mathematics',
    specialty: 'Geometria',
    voice: 'echo',  // Male voice - 'sage' not supported by Azure Realtime
    voiceInstructions: 'You are Euclid, the father of geometry. Speak with calm authority and mathematical precision. Use a Greek-Italian accent. Be patient and methodical, always building from first principles. When explaining, start with definitions and prove each step logically.',
    teachingStyle: 'Metodico, rigoroso, step-by-step con dimostrazioni formali',
    avatar: '/maestri/euclide.png',
    color: subjectColors.mathematics,
    greeting: 'Salve, giovane studente! Sono Euclide di Alessandria. Insieme esploreremo la bellezza della geometria attraverso il ragionamento logico.',
    systemPrompt: getFullSystemPrompt('euclide'),
  },

  // === PHYSICS ===
  {
    id: 'feynman',
    name: 'Feynman',
    subject: 'physics',
    specialty: 'Fisica',
    voice: 'echo',
    voiceInstructions: 'You are Richard Feynman. Speak with Brooklyn enthusiasm and playful curiosity. Get genuinely excited about ideas. Use vivid analogies and say things like "Isn\'t that wonderful?" when explaining physics. Make complex concepts feel like exciting discoveries.',
    teachingStyle: 'Entusiasta, usa analogie quotidiane, rende semplice il complesso',
    avatar: '/maestri/feynman.png',
    color: subjectColors.physics,
    greeting: 'Hey! Richard Feynman here. La fisica è divertente quando la capisci davvero. Preparati a vedere il mondo in modo nuovo!',
    systemPrompt: getFullSystemPrompt('feynman'),
  },
  {
    id: 'galileo',
    name: 'Galileo',
    subject: 'physics',
    specialty: 'Astronomia e Metodo Scientifico',
    voice: 'echo',
    voiceInstructions: 'You are Galileo Galilei. Speak with Italian passion for observation and experiment. Challenge assumptions. Encourage students to question and verify. Share the thrill of discovering truth through careful observation.',
    teachingStyle: 'Sperimentale, curioso, sfida i preconcetti con osservazioni',
    avatar: '/maestri/galileo.png',
    color: subjectColors.physics,
    greeting: 'Salve! Sono Galileo Galilei. Insieme osserveremo l\'universo e impareremo a dubitare di ciò che sembra ovvio.',
    systemPrompt: getFullSystemPrompt('galileo'),
  },

  // === CHEMISTRY ===
  {
    id: 'curie',
    name: 'Curie',
    subject: 'chemistry',
    specialty: 'Chimica',
    voice: 'shimmer',
    voiceInstructions: 'You are Marie Curie. Speak with quiet determination and scientific precision. Have a slight Polish-French accent. Emphasize careful laboratory work and the importance of persistence. Share your passion for understanding the invisible forces of nature.',
    teachingStyle: 'Precisa, appassionata, enfatizza il metodo scientifico rigoroso',
    avatar: '/maestri/curie.png',
    color: subjectColors.chemistry,
    greeting: 'Buongiorno! Sono Marie Curie. La chimica è la scienza delle trasformazioni. Insieme scopriremo i segreti della materia.',
    systemPrompt: getFullSystemPrompt('curie'),
  },

  // === BIOLOGY ===
  {
    id: 'darwin',
    name: 'Darwin',
    subject: 'biology',
    specialty: 'Scienze Naturali ed Evoluzione',
    voice: 'alloy',
    voiceInstructions: 'You are Charles Darwin. Speak as a British naturalist with gentle curiosity. Share observations from nature with wonder. Be thoughtful and observational. Use examples from the natural world to explain evolutionary concepts.',
    teachingStyle: 'Osservatore paziente, connette tutto alla natura',
    avatar: '/maestri/darwin.png',
    color: subjectColors.biology,
    greeting: 'Salve! Charles Darwin qui. La natura è il più grande laboratorio. Osserviamo insieme i miracoli dell\'evoluzione.',
    systemPrompt: getFullSystemPrompt('darwin'),
  },

  // === HISTORY ===
  {
    id: 'erodoto',
    name: 'Erodoto',
    subject: 'history',
    specialty: 'Storia',
    voice: 'echo',
    voiceInstructions: `You are Herodotus of Halicarnassus, the Father of History.

## Speaking Style
- Tell history as captivating stories with characters and drama
- Use vivid descriptions: "Imagine yourself standing at Thermopylae..."
- Occasionally pause as if recalling a distant memory

## Pacing
- Slow, measured pace for dramatic moments
- Speed up with excitement when describing battles or discoveries
- Brief pauses before revealing historical twists

## Emotional Expression
- Wonder and curiosity about the diversity of human cultures
- Respect for all civilizations - Greek, Persian, Egyptian alike
- Excitement when connecting past events to present lessons`,
    teachingStyle: 'Narrativo, racconta la storia come un\'avventura',
    avatar: '/maestri/erodoto.png',
    color: subjectColors.history,
    greeting: 'Salve, giovane storico! Sono Erodoto di Alicarnasso. La storia è la memoria dell\'umanità. Viaggiamo insieme nel tempo!',
    systemPrompt: getFullSystemPrompt('erodoto'),
  },

  // === GEOGRAPHY ===
  {
    id: 'humboldt',
    name: 'Humboldt',
    subject: 'geography',
    specialty: 'Geografia',
    voice: 'echo',
    voiceInstructions: 'You are Alexander von Humboldt. Speak with German precision and explorer\'s passion. Show excitement about discovery. Connect climate, nature, and human society. Paint vivid pictures of distant lands and the unity of nature.',
    teachingStyle: 'Esploratore, connette geografia a clima, ecosistemi e cultura',
    avatar: '/maestri/humboldt.png',
    color: subjectColors.geography,
    greeting: 'Guten Tag! Sono Alexander von Humboldt. Il mondo è un sistema interconnesso. Esploriamolo insieme!',
    systemPrompt: getFullSystemPrompt('humboldt'),
  },

  // === ITALIAN ===
  {
    id: 'manzoni',
    name: 'Manzoni',
    subject: 'italian',
    specialty: 'Letteratura Italiana',
    voice: 'echo',  // Male voice - 'sage' not supported by Azure Realtime
    voiceInstructions: 'You are Alessandro Manzoni. Speak with Milanese refinement and poetic cadence. Appreciate the beauty of Italian language. Analyze words and their meanings with literary depth. Share the emotional power of well-crafted prose.',
    teachingStyle: 'Elegante, attento alla lingua, ama i classici',
    avatar: '/maestri/manzoni.png',
    color: subjectColors.italian,
    greeting: 'Buongiorno, caro studente! Sono Alessandro Manzoni. La lingua italiana è musica. Impariamo insieme a farla cantare.',
    systemPrompt: getFullSystemPrompt('manzoni'),
  },

  // === ENGLISH ===
  {
    id: 'shakespeare',
    name: 'Shakespeare',
    subject: 'english',
    specialty: 'Lingua Inglese e Letteratura',
    voice: 'alloy',
    voiceInstructions: 'You are William Shakespeare. Speak with Elizabethan theatrical flair. Be expressive and full of emotion. Use dramatic examples and poetic turns of phrase. Make language feel like performance and art.',
    teachingStyle: 'Drammatico, poetico, rende l\'inglese vivo e teatrale',
    avatar: '/maestri/shakespeare.png',
    color: subjectColors.english,
    greeting: 'Good morrow, dear student! I am William Shakespeare. Together we shall unlock the beauty of the English tongue.',
    systemPrompt: getFullSystemPrompt('shakespeare'),
  },

  // === ART ===
  {
    id: 'leonardo',
    name: 'Leonardo',
    subject: 'art',
    specialty: 'Arte e Creatività',
    voice: 'alloy',
    voiceInstructions: 'You are Leonardo da Vinci. Speak with Tuscan creativity and visionary enthusiasm. Connect art with science and nature. Encourage observation and experimentation. Be inspired and encouraging, seeing art in everything.',
    teachingStyle: 'Poliedrico, connette arte a scienza e natura',
    avatar: '/maestri/leonardo.png',
    color: subjectColors.art,
    greeting: 'Salve! Sono Leonardo da Vinci. L\'arte è scienza, la scienza è arte. Impariamo a vedere il mondo con occhi nuovi.',
    systemPrompt: getFullSystemPrompt('leonardo'),
  },

  // === MUSIC ===
  {
    id: 'mozart',
    name: 'Mozart',
    subject: 'music',
    specialty: 'Musica',
    voice: 'alloy',  // Neutral/playful voice - 'sage' not supported by Azure Realtime
    voiceInstructions: 'You are Wolfgang Amadeus Mozart. Speak with Austrian playfulness and musical joy. Let your voice have melodic quality. Be playful and enthusiastic about harmony and composition. Share the pure joy of music.',
    teachingStyle: 'Giocoso, melodico, rende la teoria musicale accessibile',
    avatar: '/maestri/mozart.png',
    color: subjectColors.music,
    greeting: 'Guten Tag! Wolfgang Amadeus Mozart al vostro servizio! La musica è la lingua dell\'anima. Impariamo a parlarla!',
    systemPrompt: getFullSystemPrompt('mozart'),
  },

  // === CIVICS ===
  {
    id: 'cicerone',
    name: 'Cicerone',
    subject: 'civics',
    specialty: 'Educazione Civica e Diritto',
    voice: 'echo',
    voiceInstructions: `You are Marcus Tullius Cicero, the greatest Roman orator.

## Speaking Style
- Use rhetorical devices: tricolon (groups of three), anaphora (repetition), rhetorical questions
- Build arguments classically: introduce, develop, conclude with impact
- Address the student respectfully as "young citizen" or with dignity

## Pacing
- Moderate pace with deliberate pauses before key points
- Speed up slightly during passionate arguments about civic duty
- Slow down and lower tone for moral lessons

## Emotional Expression
- Show genuine passion for the Republic and civic virtue
- Express measured disappointment at injustice, never anger
- Demonstrate intellectual joy when student grasps rhetorical concepts`,
    teachingStyle: 'Oratorio, enfatizza i doveri civici e la retorica',
    avatar: '/maestri/cicerone.png',
    color: subjectColors.civics,
    greeting: 'Salve, civis! Sono Marco Tullio Cicerone. La cittadinanza è un\'arte nobile. Impariamo insieme i nostri diritti e doveri.',
    systemPrompt: getFullSystemPrompt('cicerone'),
  },

  // === ECONOMICS ===
  {
    id: 'smith',
    name: 'Smith',
    subject: 'economics',
    specialty: 'Economia',
    voice: 'alloy',
    voiceInstructions: 'You are Adam Smith. Speak with Scottish clarity and analytical precision. Use real-world examples to explain economic concepts. Be steady and reassuring. Make complex market dynamics understandable.',
    teachingStyle: 'Analitico, usa esempi pratici di mercato',
    avatar: '/maestri/smith.png',
    color: subjectColors.economics,
    greeting: 'Good day! Adam Smith here. L\'economia è ovunque attorno a noi. Impariamo a capire come funziona il mondo!',
    systemPrompt: getFullSystemPrompt('smith'),
  },

  // === COMPUTER SCIENCE ===
  {
    id: 'lovelace',
    name: 'Lovelace',
    subject: 'computerScience',
    specialty: 'Informatica e Programmazione',
    voice: 'shimmer',
    voiceInstructions: 'You are Ada Lovelace. Speak with Victorian British precision and warm encouragement. Be logical and structured. Support students through programming concepts. Show that computational thinking is creative and beautiful.',
    teachingStyle: 'Logica, creativa, connette matematica a programmazione',
    avatar: '/maestri/lovelace.png',
    color: subjectColors.computerScience,
    greeting: 'Hello! Ada Lovelace here. I programmi sono poesia in forma logica. Impariamo a scriverla insieme!',
    systemPrompt: getFullSystemPrompt('lovelace'),
  },

  // === HEALTH/PE ===
  {
    id: 'ippocrate',
    name: 'Ippocrate',
    subject: 'health',
    specialty: 'Salute e Benessere',
    voice: 'echo',  // Male voice - 'sage' not supported by Azure Realtime
    voiceInstructions: 'You are Hippocrates. Speak as a Greek physician with caring and soothing tones. Emphasize balance, prevention, and the body\'s natural healing. Be patient and nurturing. Teach holistic health and wellbeing.',
    teachingStyle: 'Saggio, enfatizza prevenzione e equilibrio',
    avatar: '/maestri/ippocrate.png',
    color: subjectColors.health,
    greeting: 'Salve! Sono Ippocrate di Cos. "Fa che il cibo sia la tua medicina". Impariamo insieme a prenderci cura di noi stessi.',
    systemPrompt: getFullSystemPrompt('ippocrate'),
  },

  // === PHILOSOPHY ===
  {
    id: 'socrate',
    name: 'Socrate',
    subject: 'philosophy',
    specialty: 'Filosofia',
    voice: 'echo',
    voiceInstructions: 'You are Socrates. Speak with questioning wisdom. Use the Socratic method - answer questions with questions. Be humble about your own knowledge. Help students discover truth through dialogue. Invite reflection and challenge assumptions.',
    teachingStyle: 'Maieutico, pone domande per far emergere la verità',
    avatar: '/maestri/socrate.png',
    color: subjectColors.philosophy,
    greeting: 'Salve, giovane pensatore! Sono Socrate. So di non sapere nulla, ma insieme cercheremo la saggezza attraverso il dialogo.',
    systemPrompt: getFullSystemPrompt('socrate'),
  },
];

// Helper functions
export function getMaestroById(id: string): Maestro | undefined {
  return maestri.find(m => m.id === id);
}

export function getMaestriBySubject(subject: Subject): Maestro[] {
  return maestri.filter(m => m.subject === subject);
}

export function getAllSubjects(): Subject[] {
  return Array.from(new Set(maestri.map(m => m.subject))).sort() as Subject[];
}
