/**
 * Demo Tool Plugin
 * Creates interactive HTML/CSS/JS visualizations for educational content
 * Integrates with maestro system and voice interface
 * Implements F-02 (Maestri can create tools) and F-03 (Tools integrate with system)
 */

import { z } from "zod";
import { ToolPlugin, ToolCategory, Permission } from "../plugin/types";
import { nanoid } from "nanoid";
import { chatCompletion } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";
import { sanitizeHtml } from "../handlers/demo-handler";
import type { ToolContext, ToolResult } from "@/types/tools";

/**
 * Input validation schema for demo creation
 * Supports three types of interactive visualizations
 */
const DemoInputSchema = z.object({
  topic: z.string().min(1).max(200),
  type: z
    .enum(["simulation", "visualization", "experiment"])
    .optional()
    .default("visualization"),
  title: z.string().min(1).max(100).optional(),
  concept: z.string().min(1).max(500).optional(),
  visualization: z.string().min(1).max(500).optional(),
  interaction: z.string().min(1).max(500).optional(),
  wowFactor: z.string().max(200).optional(),
});

/**
 * Generate interactive demo code from description
 * Leverages existing demo-handler logic
 */
async function generateDemoCode(args: {
  topic: string;
  type: string;
  title?: string;
  concept?: string;
  visualization?: string;
  interaction?: string;
  wowFactor?: string;
}) {
  const {
    topic,
    type,
    title = `Demo: ${topic}`,
    concept = topic,
    visualization = `Interactive visualization for ${topic}`,
    interaction = "Click and drag to explore",
    wowFactor,
  } = args;

  const prompt = `Crea una ${type} SPETTACOLARE e INTERATTIVA per:
TITOLO: ${title}
ARGOMENTO: ${topic}
TIPO: ${type}
CONCETTO: ${concept}
VISUALIZZAZIONE: ${visualization}
INTERAZIONE: ${interaction}
${wowFactor ? `WOW: ${wowFactor}` : ""}

Usa il template base con CSS e JS spettacolari (gradients, animazioni, particelle).
Rispondi SOLO con JSON valido: {"html":"...","css":"...","js":"..."}`;

  try {
    const result = await chatCompletion(
      [{ role: "user", content: prompt }],
      "Sei un generatore di codice. Rispondi SOLO con JSON valido.",
      { temperature: 0.7, maxTokens: 4000 },
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`Failed to parse demo code JSON for ${topic}`);
      return null;
    }

    const code = JSON.parse(jsonMatch[0]);
    return {
      html: code.html || "",
      css: code.css || "",
      js: code.js || "",
    };
  } catch (error) {
    logger.error(`Failed to generate demo code for ${topic}`, undefined, error);
    return null;
  }
}

/**
 * Demo Plugin - Creates interactive visualizations
 * Integrated with maestro voice system (F-01, F-13)
 * Addresses F-02 (Maestri can create tools) and F-03 (integration)
 */
export const demoPlugin: ToolPlugin = {
  id: "create_demo",
  name: "Demo Interattiva",
  category: ToolCategory.EDUCATIONAL,

  // Input schema for validation
  schema: DemoInputSchema,

  // Handler wraps demo creation logic
  handler: async (
    args: Record<string, unknown>,
    _context: ToolContext,
  ): Promise<ToolResult> => {
    try {
      const validated = DemoInputSchema.parse(args);
      const {
        topic,
        type,
        title = `Demo: ${topic}`,
        concept = topic,
        visualization = `Visualizzazione per ${topic}`,
        interaction = "Clicca e trascina per esplorare",
        wowFactor,
      } = validated;

      // Generate code from description
      const code = await generateDemoCode({
        topic,
        type,
        title,
        concept,
        visualization,
        interaction,
        wowFactor,
      });

      if (!code) {
        return {
          success: false,
          error: "Non è stato possibile generare il codice della demo",
        };
      }

      // Return sanitized demo data
      return {
        success: true,
        data: {
          id: nanoid(),
          title,
          type,
          topic,
          html: await sanitizeHtml(code.html),
          css: code.css,
          js: code.js,
          description: `${concept}: ${visualization}`,
        },
      };
    } catch (error) {
      logger.error("Demo handler error", undefined, error);
      return {
        success: false,
        error: `Errore nella creazione della demo: ${error instanceof Error ? error.message : "Sconosciuto"}`,
      };
    }
  },

  // Voice integration for maestro system
  // Supports dynamic template substitution with {topic}
  voicePrompt: {
    template: "Vuoi vedere una demo interattiva su {topic}?",
    requiresContext: ["topic"],
    fallback: "Vuoi creare una demo interattiva?",
  },

  voiceFeedback: {
    template: "Ecco la demo su {topic} pronta per esplorare!",
    requiresContext: ["topic"],
    fallback: "Ecco la demo pronta!",
  },

  voiceEnabled: true,

  // Voice triggers in Italian for maestro context
  triggers: [
    "demo",
    "mostra demo",
    "esempio",
    "simulazione",
    "visualizza",
    "interattivo",
  ],

  // No prerequisites - works standalone
  prerequisites: [],

  // Permissions required for voice output and content creation
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default demoPlugin;
