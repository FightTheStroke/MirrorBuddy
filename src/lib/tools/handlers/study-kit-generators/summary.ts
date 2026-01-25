/**
 * Summary Generation
 * Generate summaries from text using AI
 * Supports per-feature model selection (ADR 0073)
 */

import { chatCompletion } from "@/lib/ai/providers";
import { getDeploymentForModel } from "@/lib/ai/providers/deployment-mapping";

/** Options for summary generation (ADR 0073 - per-feature AI config) */
interface SummaryOptions {
  /** AI model to use (from tier system) */
  model?: string;
  /** Temperature for AI responses (0-2) */
  temperature?: number;
  /** Maximum tokens for AI responses */
  maxTokens?: number;
}

/**
 * Generate summary from text using AI
 * @param text - Text content to summarize
 * @param title - Title for the summary
 * @param subject - Optional subject context
 * @param adaptiveInstruction - Optional adaptive learning instruction
 * @param options - Optional model from tier system (ADR 0073)
 */
export async function generateSummary(
  text: string,
  title: string,
  subject?: string,
  adaptiveInstruction?: string,
  options?: SummaryOptions,
): Promise<string> {
  const adaptiveBlock = adaptiveInstruction ? `\n${adaptiveInstruction}\n` : "";
  const prompt = `Sei un tutor educativo. Crea un riassunto chiaro e strutturato del seguente documento.

Titolo: ${title}
${subject ? `Materia: ${subject}` : ""}
${adaptiveBlock}

DOCUMENTO:
${text.substring(0, 8000)} ${text.length > 8000 ? "..." : ""}

Crea un riassunto in italiano di massimo 500 parole che:
- Identifica i concetti chiave
- Organizza le informazioni in modo logico
- Usa un linguaggio chiaro e accessibile
- È adatto per studenti con DSA/ADHD`;

  const deploymentName = options?.model
    ? getDeploymentForModel(options.model)
    : undefined;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    "Sei un tutor educativo esperto in didattica inclusiva per studenti con DSA e ADHD.",
    {
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2000,
      model: deploymentName,
    },
  );

  return result.content.trim();
}
