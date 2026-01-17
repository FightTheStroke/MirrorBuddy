// ============================================================================
// STUDY KIT - QUIZ GENERATION
// Generate quiz from text using AI
// ============================================================================

import { chatCompletion } from '@/lib/ai/providers';
import type { QuizData } from '@/types/tools';

/**
 * Generate quiz from text using AI
 */
export async function generateQuiz(text: string, title: string, subject?: string): Promise<QuizData> {
  const prompt = `Sei un tutor educativo. Crea un quiz con 5 domande a risposta multipla sul seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ''}

DOCUMENTO:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Crea 5 domande con:
- 4 opzioni ciascuna
- Una sola risposta corretta
- Spiegazione della risposta corretta
- Difficoltà crescente

Rispondi SOLO con JSON valido:
{
  "topic": "Argomento del quiz",
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
    }>).map((q) => ({
      question: String(q.question),
      options: q.options.map((o) => String(o)),
      correctIndex: Number(q.correctIndex),
      explanation: q.explanation ? String(q.explanation) : undefined,
    })),
  };
}
