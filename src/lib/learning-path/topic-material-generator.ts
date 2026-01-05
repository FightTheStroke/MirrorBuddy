// ============================================================================
// TOPIC MATERIAL GENERATOR
// Generate contextualized study materials (flashcards, quiz, mindmap) per topic
// Plan 8 MVP - Wave 2: Learning Path Generation [F-12]
// ============================================================================

import { chatCompletion } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import type { FlashcardData, QuizData, MindmapData } from '@/types/tools';

/**
 * Topic information for material generation
 */
export interface TopicContext {
  title: string;
  description: string;
  keyConcepts: string[];
  textExcerpt: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Generated materials for a topic
 */
export interface TopicMaterials {
  flashcards: FlashcardData;
  quiz: QuizData;
  mindmap?: MindmapData;
}

/**
 * Options for material generation
 */
export interface MaterialGenerationOptions {
  flashcardCount?: number;
  quizQuestionCount?: number;
  includeMindmap?: boolean;
}

const DEFAULT_OPTIONS: Required<MaterialGenerationOptions> = {
  flashcardCount: 5,
  quizQuestionCount: 3,
  includeMindmap: false,
};

/**
 * Generate flashcards for a specific topic
 * [F-12] Materiali contestualizzati per topic
 */
export async function generateTopicFlashcards(
  topic: TopicContext,
  count: number = 5
): Promise<FlashcardData> {
  logger.info('Generating topic flashcards', { topic: topic.title, count });

  const prompt = `Sei un tutor educativo. Crea ${count} flashcard per questo argomento.

ARGOMENTO: ${topic.title}
DESCRIZIONE: ${topic.description}
CONCETTI CHIAVE: ${topic.keyConcepts.join(', ')}
DIFFICOLTÀ: ${topic.difficulty}

TESTO DI RIFERIMENTO:
${topic.textExcerpt.substring(0, 3000)}

ISTRUZIONI:
1. Ogni flashcard deve avere un fronte (domanda) e un retro (risposta)
2. Usa linguaggio chiaro, adatto a studenti con DSA
3. Frasi brevi e concetti atomici
4. Copri i concetti chiave dell'argomento
5. Difficoltà appropriata al livello indicato

Rispondi SOLO con JSON valido:
{
  "topic": "${topic.title}",
  "cards": [
    {"front": "Domanda?", "back": "Risposta"}
  ]
}`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un tutor educativo. Rispondi SOLO con JSON valido.',
    { temperature: 0.7, maxTokens: 1500 }
  );

  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse flashcards JSON');
  }

  const data = JSON.parse(jsonMatch[0]);
  return {
    topic: data.topic || topic.title,
    cards: data.cards.map((c: { front: string; back: string }) => ({
      front: String(c.front),
      back: String(c.back),
    })),
  };
}

/**
 * Generate mini-quiz for a specific topic
 * [F-12] Materiali contestualizzati per topic
 */
export async function generateTopicQuiz(
  topic: TopicContext,
  questionCount: number = 3
): Promise<QuizData> {
  logger.info('Generating topic quiz', { topic: topic.title, questionCount });

  const prompt = `Sei un tutor educativo. Crea un mini-quiz con ${questionCount} domande su questo argomento.

ARGOMENTO: ${topic.title}
DESCRIZIONE: ${topic.description}
CONCETTI CHIAVE: ${topic.keyConcepts.join(', ')}
DIFFICOLTÀ: ${topic.difficulty}

TESTO DI RIFERIMENTO:
${topic.textExcerpt.substring(0, 3000)}

ISTRUZIONI:
1. ${questionCount} domande a risposta multipla
2. 4 opzioni per domanda
3. Una sola risposta corretta
4. Spiegazione per ogni risposta
5. Domande chiare e non ambigue
6. Adatte al livello di difficoltà indicato

Rispondi SOLO con JSON valido:
{
  "topic": "${topic.title}",
  "questions": [
    {
      "question": "Testo domanda?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Spiegazione"
    }
  ]
}`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un tutor educativo. Rispondi SOLO con JSON valido.',
    { temperature: 0.7, maxTokens: 1500 }
  );

  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse quiz JSON');
  }

  const data = JSON.parse(jsonMatch[0]);
  return {
    topic: data.topic || topic.title,
    questions: data.questions.map(
      (q: { question: string; options: string[]; correctIndex: number; explanation?: string }) => ({
        question: String(q.question),
        options: q.options.map((o: string) => String(o)),
        correctIndex: Number(q.correctIndex),
        explanation: q.explanation ? String(q.explanation) : undefined,
      })
    ),
  };
}

/**
 * Generate mindmap for a specific topic
 * [F-12] Materiali contestualizzati per topic
 */
export async function generateTopicMindmap(topic: TopicContext): Promise<MindmapData> {
  logger.info('Generating topic mindmap', { topic: topic.title });

  const prompt = `Sei un tutor educativo. Crea una mappa mentale per questo argomento.

ARGOMENTO: ${topic.title}
DESCRIZIONE: ${topic.description}
CONCETTI CHIAVE: ${topic.keyConcepts.join(', ')}

TESTO DI RIFERIMENTO:
${topic.textExcerpt.substring(0, 3000)}

ISTRUZIONI:
1. Usa il titolo come nodo centrale
2. 3-5 rami principali (concetti chiave)
3. 2-3 sotto-nodi per ogni ramo
4. Etichette brevi (max 5 parole)
5. Struttura chiara e gerarchica

Rispondi SOLO con JSON valido:
{
  "title": "${topic.title}",
  "nodes": [
    {"id": "1", "label": "Concetto 1"},
    {"id": "1a", "label": "Sotto-concetto", "parentId": "1"}
  ]
}`;

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    'Sei un tutor educativo. Rispondi SOLO con JSON valido.',
    { temperature: 0.7, maxTokens: 1000 }
  );

  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse mindmap JSON');
  }

  const data = JSON.parse(jsonMatch[0]);
  return {
    title: data.title || topic.title,
    nodes: data.nodes.map(
      (n: { id: string | number; label: string; parentId?: string | number }) => ({
        id: String(n.id),
        label: String(n.label),
        parentId: n.parentId ? String(n.parentId) : null,
      })
    ),
  };
}

/**
 * Generate all materials for a topic
 * [F-12] Materiali contestualizzati per topic
 */
export async function generateTopicMaterials(
  topic: TopicContext,
  options: MaterialGenerationOptions = {}
): Promise<TopicMaterials> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  logger.info('Generating all topic materials', {
    topic: topic.title,
    options: opts,
  });

  // Generate flashcards and quiz in parallel
  const [flashcards, quiz] = await Promise.all([
    generateTopicFlashcards(topic, opts.flashcardCount),
    generateTopicQuiz(topic, opts.quizQuestionCount),
  ]);

  // Mindmap is optional
  let mindmap: MindmapData | undefined;
  if (opts.includeMindmap) {
    mindmap = await generateTopicMindmap(topic);
  }

  logger.info('Topic materials generated', {
    topic: topic.title,
    flashcardCount: flashcards.cards.length,
    quizQuestionCount: quiz.questions.length,
    hasMindmap: !!mindmap,
  });

  return {
    flashcards,
    quiz,
    mindmap,
  };
}
