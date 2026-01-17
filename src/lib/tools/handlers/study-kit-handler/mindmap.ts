// ============================================================================
// STUDY KIT - MINDMAP GENERATION
// Generate mindmap from text using AI
// ============================================================================

import { chatCompletion } from '@/lib/ai/providers';
import type { MindmapData } from '@/types/tools';

/**
 * Generate mindmap from text using AI
 */
export async function generateMindmap(text: string, title: string, subject?: string): Promise<MindmapData> {
  const prompt = `Sei un tutor educativo. Crea una mappa mentale ben strutturata del seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ''}

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
    nodes: (mindmapData.nodes as Array<{ id: string | number; label: string; parentId?: string | number }>).map((n) => ({
      id: String(n.id),
      label: String(n.label),
      parentId: n.parentId ? String(n.parentId) : null,
    })),
  };
}
