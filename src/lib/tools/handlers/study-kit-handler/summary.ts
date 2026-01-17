// ============================================================================
// STUDY KIT - SUMMARY GENERATION
// Generate summary from text using AI
// ============================================================================

import { chatCompletion } from '@/lib/ai/providers';

/**
 * Generate summary from text using AI
 */
export async function generateSummary(text: string, title: string, subject?: string): Promise<string> {
  const prompt = `Sei un tutor educativo. Crea un riassunto chiaro e strutturato del seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ''}

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
