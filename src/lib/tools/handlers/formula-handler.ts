// ============================================================================
// FORMULA HANDLER
// Generates and validates KaTeX/LaTeX formulas for mathematical rendering
// ============================================================================

import { registerToolHandler } from "../tool-executor";
import { nanoid } from "nanoid";
import { chatCompletion, getDeploymentForModel } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier";
import type {
  FormulaData,
  ToolExecutionResult,
  ToolContext,
} from "@/types/tools";

/**
 * Check if string looks like LaTeX code
 */
function isLatex(input: string): boolean {
  const latexPatterns = [
    /\\[a-zA-Z]+/, // LaTeX commands: \frac, \sqrt, etc.
    /\^[{]?[^}]+[}]?/, // Superscripts: ^2, ^{10}
    /_[{]?[^}]+[}]?/, // Subscripts: _n, _{max}
    /\\left|\\right/, // Delimiters
    /\\sum|\\int|\\prod/, // Operators
  ];
  return latexPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate LaTeX syntax (basic checks)
 */
function validateLatex(latex: string): { valid: boolean; error?: string } {
  // Check for balanced braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (braceCount < 0) {
      return {
        valid: false,
        error: "Unbalanced braces: closing } without opening {",
      };
    }
  }
  if (braceCount !== 0) {
    return {
      valid: false,
      error: `Unbalanced braces: ${braceCount} unclosed {`,
    };
  }

  // Check for balanced \left and \right
  const leftCount = (latex.match(/\\left/g) || []).length;
  const rightCount = (latex.match(/\\right/g) || []).length;
  if (leftCount !== rightCount) {
    return {
      valid: false,
      error: `Unbalanced delimiters: ${leftCount} \\left vs ${rightCount} \\right`,
    };
  }

  return { valid: true };
}

/**
 * Generate LaTeX from natural language description using AI
 */
async function generateLatexFromDescription(
  description: string,
  userId?: string,
): Promise<{ latex: string; explanation?: string } | null> {
  const prompt = `Converti questa descrizione matematica in LaTeX valido per KaTeX:

"${description}"

Regole:
1. Usa sintassi LaTeX standard (KaTeX-compatible)
2. Per frazioni: \\frac{numeratore}{denominatore}
3. Per radici: \\sqrt{x} o \\sqrt[n]{x}
4. Per potenze: x^{2} o x^{n}
5. Per pedici: x_{n} o x_{i}
6. Per simboli greci: \\alpha, \\beta, \\pi, etc.
7. Per operatori: \\sum, \\int, \\prod, \\lim
8. Per limiti: \\lim_{x \\to 0}
9. Per matrici: \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}

Esempi:
- "teorema di pitagora" → "a^{2} + b^{2} = c^{2}"
- "formula quadratica" → "x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}"
- "integrale da 0 a infinito di e alla meno x" → "\\int_{0}^{\\infty} e^{-x} dx"

Rispondi SOLO con JSON (no markdown):
{"latex":"...","explanation":"breve spiegazione in italiano"}`;

  try {
    // Get AI config from tier (ADR 0073)
    const aiConfig = await tierService.getFeatureAIConfigForUser(
      userId ?? null,
      "formula",
    );
    const deploymentName = getDeploymentForModel(aiConfig.model);

    const result = await chatCompletion(
      [{ role: "user", content: prompt }],
      "Sei un esperto di notazione matematica LaTeX. Rispondi SOLO con JSON valido.",
      {
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        model: deploymentName,
      },
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("Failed to parse LaTeX generation JSON");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      latex: parsed.latex || "",
      explanation: parsed.explanation,
    };
  } catch (error) {
    logger.error(
      "Failed to generate LaTeX from description",
      { description },
      error,
    );
    return null;
  }
}

/**
 * Register the formula handler
 */
registerToolHandler(
  "create_formula",
  async (args, context: ToolContext): Promise<ToolExecutionResult> => {
    const { latex: inputLatex, description: inputDescription } = args as {
      latex?: string;
      description?: string;
    };
    const userId = context?.userId;

    // Validate input - must have either latex or description
    if (!inputLatex && !inputDescription) {
      return {
        success: false,
        toolId: nanoid(),
        toolType: "formula",
        error: "Specifica una formula LaTeX o una descrizione matematica",
      };
    }

    let latex: string;
    let description: string | undefined;
    let displayMode: "inline" | "block" = "block";

    // Case 1: LaTeX string provided
    if (inputLatex) {
      latex = inputLatex.trim();

      // Validate LaTeX syntax
      const validation = validateLatex(latex);
      if (!validation.valid) {
        return {
          success: false,
          toolId: nanoid(),
          toolType: "formula",
          error: `LaTeX non valido: ${validation.error}`,
        };
      }

      description = inputDescription;

      // Determine display mode based on complexity
      displayMode =
        latex.length > 30 || latex.includes("\\int") || latex.includes("\\sum")
          ? "block"
          : "inline";

      logger.info("Formula handler: LaTeX provided directly", {
        latexLength: latex.length,
        displayMode,
      });
    }
    // Case 2: Description provided, generate LaTeX
    else if (inputDescription) {
      // Check if description is actually LaTeX
      if (isLatex(inputDescription)) {
        latex = inputDescription.trim();

        const validation = validateLatex(latex);
        if (!validation.valid) {
          return {
            success: false,
            toolId: nanoid(),
            toolType: "formula",
            error: `LaTeX non valido: ${validation.error}`,
          };
        }

        description = undefined;
        displayMode = latex.length > 30 ? "block" : "inline";

        logger.info("Formula handler: Description was LaTeX", {
          latexLength: latex.length,
        });
      } else {
        // Generate LaTeX from natural language
        logger.info("Formula handler: Generating LaTeX from description", {
          descriptionLength: inputDescription.length,
        });

        const generated = await generateLatexFromDescription(
          inputDescription,
          userId,
        );

        if (!generated || !generated.latex) {
          return {
            success: false,
            toolId: nanoid(),
            toolType: "formula",
            error:
              "Non sono riuscito a generare la formula. Prova a specificare il LaTeX direttamente.",
          };
        }

        latex = generated.latex;
        description = generated.explanation || inputDescription;
        displayMode = latex.length > 30 ? "block" : "inline";

        logger.info("Formula handler: LaTeX generated successfully", {
          generatedLength: latex.length,
          displayMode,
        });
      }
    } else {
      // Should never reach here due to initial validation
      return {
        success: false,
        toolId: nanoid(),
        toolType: "formula",
        error: "Input non valido",
      };
    }

    const data: FormulaData = {
      latex,
      description,
      displayMode,
    };

    return {
      success: true,
      toolId: nanoid(),
      toolType: "formula",
      data,
    };
  },
);

export { isLatex, validateLatex, generateLatexFromDescription };
