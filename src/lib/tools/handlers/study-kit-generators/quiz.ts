/**
 * Quiz Generation
 * Generate quizzes from text using AI
 */

import { chatCompletion } from '@/lib/ai/providers';
import type { QuizData } from '@/types/tools';

const normalizeDifficulty = (value?: number): 1 | 2 | 3 | 4 | 5 | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(1, rounded)) as 1 | 2 | 3 | 4 | 5;
};

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
