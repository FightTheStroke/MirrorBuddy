/**
 * Study Kit Generators
 * AI-powered generation of study materials (summary, mindmap, demo, quiz)
 * Issue: Wave 2 - Auto-generate study kit from PDF upload
 */

import { chatCompletion } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import type { MindmapData, QuizData, DemoData } from '@/types/tools';
import type { StudyKit } from '@/types/study-kit';
import { extractTextFromPDF } from './study-kit-extraction';
import { buildAdaptiveInstruction, getAdaptiveContextForUser } from '@/lib/education/adaptive-difficulty';

const normalizeDifficulty = (value?: number): 1 | 2 | 3 | 4 | 5 | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(1, rounded)) as 1 | 2 | 3 | 4 | 5;
};

/**
 * Generate summary from text using AI
 */
export async function generateSummary(
  text: string,
  title: string,
  subject?: string,
  adaptiveInstruction?: string
): Promise<string> {
  const adaptiveBlock = adaptiveInstruction ? `\n${adaptiveInstruction}\n` : '';
  const prompt = `Sei un tutor educativo. Crea un riassunto chiaro e strutturato del seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ''}
${adaptiveBlock}

DOCUMENTO:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Crea un riassunto in italiano di massimo 500 parole che:
- Identifica i concetti chiave
- Organizza le informazioni in modo logico
- Usa un linguaggio chiaro e accessibile
- È adatto per studenti con DSA/ADHD`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un tutor educativo esperto in didattica inclusiva per studenti con DSA e ADHD.',
    { temperature: 0.7, maxTokens: 2000 }
  );

  return result.content.trim();
}

/**
 * Generate mindmap from text using AI
 */
export async function generateMindmap(
  text: string,
  title: string,
  subject?: string,
  adaptiveInstruction?: string
): Promise<MindmapData> {
  const adaptiveBlock = adaptiveInstruction ? `\n${adaptiveInstruction}\n` : '';
  const prompt = `Sei un tutor educativo. Crea una mappa mentale ben strutturata del seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ''}
${adaptiveBlock}

DOCUMENTO:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Crea una mappa mentale con:
- 4-6 rami principali (concetti chiave)
- 2-4 sotto-concetti per ogni ramo
- Etichette brevi e chiare (max 5 parole)

Rispondi SOLO con un JSON valido in questo formato:
{
  "title": "Titolo della mappa",
  "nodes": [
    {"id": "1", "label": "Ramo 1"},
    {"id": "1a", "label": "Sotto-concetto 1", "parentId": "1"},
    {"id": "1b", "label": "Sotto-concetto 2", "parentId": "1"}
  ]
}`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un tutor educativo. Rispondi SOLO con JSON valido, senza testo aggiuntivo.',
    { temperature: 0.7, maxTokens: 1500 }
  );

  // Parse JSON response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse mindmap JSON');
  }

  const mindmapData = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!mindmapData.title || !Array.isArray(mindmapData.nodes)) {
    throw new Error('Invalid mindmap structure');
  }

  return {
    title: String(mindmapData.title),
    nodes: (mindmapData.nodes as Array<{
      id: string | number;
      label: string;
      parentId?: string | number;
    }>).map((n) => ({
      id: String(n.id),
      label: String(n.label),
      parentId: n.parentId ? String(n.parentId) : null,
    })),
  };
}

/**
 * Generate interactive demo from text using AI
 */
export async function generateDemo(
  text: string,
  title: string,
  subject?: string
): Promise<DemoData | null> {
  // Only generate demo for STEM subjects
  const stemSubjects = [
    'matematica',
    'fisica',
    'chimica',
    'biologia',
    'scienze',
    'informatica',
    'mathematics',
    'physics',
    'chemistry',
    'biology',
    'science',
    'computer',
    'scienza',
    'scientifico',
    'fisico',
    'chimico',
    'biologico',
    'stem',
    's.t.e.m.',
    'ingegneria',
    'engineering',
    'tecnologia',
    'technology',
  ];

  const subjectLower = subject?.toLowerCase() || '';
  const isSTEM = stemSubjects.some((s) => subjectLower.includes(s.toLowerCase()));

  if (!isSTEM) {
    logger.info('Skipping demo generation for non-STEM subject', {
      subject,
      subjectLower,
    });
    return null;
  }

  logger.info('Generating demo for STEM subject', { subject, title });

  const prompt = `Crea una demo HTML/CSS/JS SPETTACOLARE per: "${title}" (${subject})

CONTENUTO DA VISUALIZZARE:
${text.substring(0, 4000)}

REQUISITI OBBLIGATORI:
1. USA CANVAS per animazioni fluide (no SVG statico)
2. COLORI VIVACI: usa gradienti (#667eea→#764ba2, #f093fb→#f5576c, #4facfe→#00f2fe)
3. ANIMAZIONI: tutto deve muoversi, pulsare, reagire
4. INTERATTIVITÀ: click, drag, slider che cambiano tutto in tempo reale
5. EFFETTI PARTICELLE: aggiungi particelle animate come sfondo

ESEMPIO DI STILE CSS DA USARE:
body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
.card { background: rgba(255,255,255,0.95); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; border-radius: 50px; font-size: 18px; cursor: pointer; transform: scale(1); transition: all 0.3s ease; }
button:hover { transform: scale(1.1); box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5); }

ESEMPIO DI ANIMAZIONE CANVAS DA USARE:
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
function animate() { ctx.clearRect(0,0,canvas.width,canvas.height); /* draw stuff */ requestAnimationFrame(animate); }
animate();

PER MATEMATICA (moltiplicazioni, addizioni, ecc):
- Mostra BLOCCHI COLORATI che si moltiplicano visivamente
- ANIMAZIONI di blocchi che appaiono uno per uno
- NUMERI GRANDI che cambiano con effetto contatore
- CONFETTI quando la risposta è corretta
- SUONI simulati con feedback visivo (flash, shake)

STRUTTURA OBBLIGATORIA:
- Container centrato con max-width: 800px
- Canvas a schermo pieno come sfondo animato
- Card centrale con controlli
- Bottoni grandi e colorati
- Risultato mostrato in grande con animazione

Rispondi SOLO con JSON valido (no markdown, no commenti):
{"title":"...","description":"...","html":"...","css":"...","js":"..."}`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un esperto di visualizzazioni interattive. Genera SOLO JSON valido con demo spettacolari.',
    { temperature: 0.8, maxTokens: 4000 }
  );

  // Parse JSON response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn('Failed to parse demo JSON');
    return null;
  }

  try {
    const demoData = JSON.parse(jsonMatch[0]);
    return {
      title: demoData.title || title,
      description: demoData.description,
      html: demoData.html || '',
      css: demoData.css || '',
      js: demoData.js || '',
    };
  } catch (error) {
    logger.error('Failed to parse demo JSON', { error });
    return null;
  }
}

/**
 * Generate quiz from text using AI
 */
export async function generateQuiz(
  text: string,
  title: string,
  subject?: string,
  adaptiveInstruction?: string
): Promise<QuizData> {
  const adaptiveBlock = adaptiveInstruction ? `\n${adaptiveInstruction}\n` : '';
  const prompt = `Sei un tutor educativo. Crea un quiz con 5 domande a risposta multipla sul seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ''}
${adaptiveBlock}

DOCUMENTO:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

  Crea 5 domande con:
  - 4 opzioni ciascuna
  - Una sola risposta corretta
  - Spiegazione della risposta corretta
  - Difficoltà crescente (indica difficulty 1-5 per ogni domanda)

Rispondi SOLO con JSON valido:
{
  "topic": "Argomento del quiz",
  "questions": [
    {
      "question": "Testo domanda?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Spiegazione",
      "difficulty": 3
    }
  ]
}`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un tutor educativo. Rispondi SOLO con JSON valido.',
    { temperature: 0.7, maxTokens: 2000 }
  );

  // Parse JSON response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse quiz JSON');
  }

  const quizData = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!quizData.topic || !Array.isArray(quizData.questions)) {
    throw new Error('Invalid quiz structure');
  }

  return {
    topic: String(quizData.topic),
    questions: (quizData.questions as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
      difficulty?: number;
    }>).map((q) => ({
      question: String(q.question),
      options: q.options.map((o) => String(o)),
      correctIndex: Number(q.correctIndex),
      explanation: q.explanation ? String(q.explanation) : undefined,
      difficulty: normalizeDifficulty(typeof q.difficulty === 'number' ? Number(q.difficulty) : undefined),
    })),
  };
}

/**
 * Process PDF and generate complete study kit
 */
export async function processStudyKit(
  pdfBuffer: Buffer,
  title: string,
  subject?: string,
  onProgress?: (step: string, progress: number) => void,
  userId?: string
): Promise<Omit<StudyKit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  try {
    let adaptiveInstruction: string | undefined;
    if (userId) {
      try {
        const context = await getAdaptiveContextForUser(userId, {
          subject,
          baselineDifficulty: 3,
          pragmatic: true,
        });
        adaptiveInstruction = buildAdaptiveInstruction(context);
      } catch (error) {
        logger.warn('Adaptive context unavailable for study kit', { error: String(error) });
      }
    }

    // Step 1: Extract text from PDF
    onProgress?.('parsing', 0.1);
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer);
    const wordCount = text.split(/\s+/).length;

    logger.info('Extracted PDF text', { pageCount, wordCount });

    // Step 2: Generate summary
    onProgress?.('generating_summary', 0.25);
    const summary = await generateSummary(text, title, subject, adaptiveInstruction);
    logger.info('Generated summary');

    // Step 3: Generate mindmap
    onProgress?.('generating_mindmap', 0.45);
    const mindmap = await generateMindmap(text, title, subject, adaptiveInstruction);
    logger.info('Generated mindmap');

    // Step 4: Generate demo (optional for STEM)
    onProgress?.('generating_demo', 0.65);
    const demo = await generateDemo(text, title, subject);
    if (demo) {
      logger.info('Generated demo');
    }

    // Step 5: Generate quiz
    onProgress?.('generating_quiz', 0.85);
    const quiz = await generateQuiz(text, title, subject, adaptiveInstruction);
    logger.info('Generated quiz');

    onProgress?.('complete', 1.0);

    return {
      sourceFile: 'uploaded.pdf',
      title,
      summary,
      mindmap,
      demo: demo || undefined,
      quiz,
      status: 'ready',
      subject,
      pageCount,
      wordCount,
    };
  } catch (error) {
    logger.error('Failed to process study kit', { error });
    throw error;
  }
}
