/**
 * Mindmap Generation
 * Generate mindmaps from text using AI
 * Supports per-feature model selection (ADR 0073)
 */

import { chatCompletion } from "@/lib/ai/providers";
import { getDeploymentForModel } from "@/lib/ai/providers/deployment-mapping";
import type { MindmapData } from "@/types/tools";

/** Options for mindmap generation (ADR 0073 - per-feature AI config) */
interface MindmapOptions {
  /** AI model to use (from tier system) */
  model?: string;
  /** Temperature for AI responses (0-2) */
  temperature?: number;
  /** Maximum tokens for AI responses */
  maxTokens?: number;
}

/**
 * Generate mindmap from text using AI
 * @param text - Text content to generate mindmap from
 * @param title - Title for the mindmap
 * @param subject - Optional subject context
 * @param adaptiveInstruction - Optional adaptive learning instruction
 * @param options - Optional model from tier system (ADR 0073)
 */
export async function generateMindmap(
  text: string,
  title: string,
  subject?: string,
  adaptiveInstruction?: string,
  options?: MindmapOptions,
): Promise<MindmapData> {
  const adaptiveBlock = adaptiveInstruction ? `\n${adaptiveInstruction}\n` : "";
  const prompt = `Sei un tutor educativo. Crea una mappa mentale ben strutturata del seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ""}
${adaptiveBlock}

DOCUMENTO:
${text.substring(0, 8000)} ${text.length > 8000 ? "..." : ""}

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

  const deploymentName = options?.model
    ? getDeploymentForModel(options.model)
    : undefined;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    "Sei un tutor educativo. Rispondi SOLO con JSON valido, senza testo aggiuntivo.",
    {
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 1500,
      model: deploymentName,
    },
  );

  // Parse JSON response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse mindmap JSON");
  }

  const mindmapData = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!mindmapData.title || !Array.isArray(mindmapData.nodes)) {
    throw new Error("Invalid mindmap structure");
  }

  return {
    title: String(mindmapData.title),
    nodes: (
      mindmapData.nodes as Array<{
        id: string | number;
        label: string;
        parentId?: string | number;
      }>
    ).map((n) => ({
      id: String(n.id),
      label: String(n.label),
      parentId: n.parentId ? String(n.parentId) : null,
    })),
  };
}
