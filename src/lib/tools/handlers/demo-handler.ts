// ============================================================================
// DEMO HANDLER
// Two-stage architecture:
// 1. Maestro describes the demo creatively (what to visualize)
// 2. Technical agent generates HTML/CSS/JS code
// ============================================================================

import { registerToolHandler } from "../tool-executor";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import type { DemoData, ToolExecutionResult } from "@/types/tools";
import {
  validateCode,
  sanitizeHtml,
  validateDescription,
} from "./demo-validators";
import { generateDemoCode } from "./demo-code-generator";
import { DANGEROUS_JS_PATTERNS } from "./demo-handler/constants";

// Re-export validators for backward compatibility
export { validateCode, sanitizeHtml, DANGEROUS_JS_PATTERNS };

/**
 * Register the demo handler - accepts description, validates, generates code
 */
registerToolHandler(
  "create_demo",
  async (args): Promise<ToolExecutionResult> => {
    const { title, concept, visualization, interaction, wowFactor } = args as {
      title: string;
      concept: string;
      visualization: string;
      interaction: string;
      wowFactor?: string;
    };

    // Validate required fields
    if (!title || !concept || !visualization || !interaction) {
      return {
        success: false,
        toolId: nanoid(),
        toolType: "demo",
        error:
          "Mancano informazioni. Specifica: titolo, concetto, visualizzazione (cosa si vede), interazione (cosa può fare lo studente)",
      };
    }

    // Validate description quality
    const validation = validateDescription({ visualization, interaction });
    if (!validation.valid && validation.suggestions) {
      logger.info("Demo description needs refinement", {
        title,
        suggestions: validation.suggestions,
      });
      // We continue anyway but log for debugging - the AI generator will do its best
    }

    logger.info("Generating demo from description", {
      title,
      concept,
      visualizationLength: visualization.length,
      interactionLength: interaction.length,
    });

    // Generate code from description using technical agent
    const code = await generateDemoCode({
      title,
      concept,
      visualization,
      interaction,
      wowFactor,
    });

    if (!code) {
      return {
        success: false,
        toolId: nanoid(),
        toolType: "demo",
        error: "Failed to generate demo code",
      };
    }

    // Validate JavaScript
    if (code.js) {
      const jsValidation = validateCode(code.js);
      if (!jsValidation.safe) {
        logger.warn("Generated JS contains unsafe patterns, sanitizing", {
          violations: jsValidation.violations,
        });
        // Try to regenerate or return error
        return {
          success: false,
          toolId: nanoid(),
          toolType: "demo",
          error: "Generated code contains unsafe patterns. Please try again.",
        };
      }
    }

    const data: DemoData = {
      title: title.trim(),
      description: `${concept}: ${visualization}`,
      html: await sanitizeHtml(code.html),
      css: code.css,
      js: code.js,
    };

    return {
      success: true,
      toolId: nanoid(),
      toolType: "demo",
      data,
    };
  },
);
