// ============================================================================
// TOOL PARAMETER SCHEMAS
// Centralized schema definitions for structured parameter extraction
// ============================================================================

/**
 * Definition of a single parameter for a tool
 */
export interface ParameterDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  required: boolean;
  description: string;
  enumValues?: string[];
  defaultValue?: unknown;
}

/**
 * Schema for a tool's parameters
 */
export interface ToolParameterSchema {
  toolName: string;
  parameters: ParameterDefinition[];
  extractionHint: string; // Hint for AI-based extraction
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// QUIZ SCHEMA
// ============================================================================

const quizSchema: ToolParameterSchema = {
  toolName: "quiz",
  parameters: [
    {
      name: "topic",
      type: "string",
      required: true,
      description: "The subject or topic for the quiz",
    },
    {
      name: "questionCount",
      type: "number",
      required: false,
      description: "Number of questions in the quiz",
      defaultValue: 5,
    },
    {
      name: "difficulty",
      type: "number",
      required: false,
      description: "Difficulty level (2=easy, 3=medium, 4=hard)",
    },
  ],
  extractionHint:
    "Look for topic keywords (sulla, della, di) and numbers indicating question count. Difficulty keywords: facile/easy=2, medio/medium=3, difficile/hard=4.",
};

// ============================================================================
// FLASHCARD SCHEMA
// ============================================================================

const flashcardSchema: ToolParameterSchema = {
  toolName: "flashcard",
  parameters: [
    {
      name: "topic",
      type: "string",
      required: true,
      description: "The subject for flashcards",
    },
    {
      name: "count",
      type: "number",
      required: false,
      description: "Number of flashcards to create",
      defaultValue: 8,
    },
  ],
  extractionHint:
    'Extract topic after keywords like "sui", "sulla", "sulle". Look for numbers between 3-30 for card count.',
};

// ============================================================================
// MINDMAP SCHEMA
// ============================================================================

const mindmapSchema: ToolParameterSchema = {
  toolName: "mindmap",
  parameters: [
    {
      name: "title",
      type: "string",
      required: true,
      description: "Central concept or title for the mind map",
    },
  ],
  extractionHint:
    'Extract the main concept/topic from the transcript. Look for keywords: "mappa", "schema", "concetto".',
};

// ============================================================================
// FORMULA SCHEMA
// ============================================================================

const formulaSchema: ToolParameterSchema = {
  toolName: "formula",
  parameters: [
    {
      name: "description",
      type: "string",
      required: true,
      description: "Name or description of the formula",
    },
  ],
  extractionHint:
    'Extract the formula name/description after "formula" keyword. Look for patterns: "formula della/del/di [description]".',
};

// ============================================================================
// CHART SCHEMA
// ============================================================================

const chartSchema: ToolParameterSchema = {
  toolName: "chart",
  parameters: [
    {
      name: "chartType",
      type: "enum",
      required: false,
      description: "Type of chart to create",
      enumValues: [
        "bar",
        "line",
        "pie",
        "doughnut",
        "scatter",
        "radar",
        "polarArea",
      ],
      defaultValue: "bar",
    },
    {
      name: "title",
      type: "string",
      required: true,
      description: "Title or data topic for the chart",
    },
  ],
  extractionHint:
    "Extract chart type from keywords: barre/bar, lineare/line, torta/pie, ciambella/doughnut, dispersione/scatter, radar, polare/polarArea. Extract title after della/di keywords.",
};

// ============================================================================
// SUMMARY SCHEMA
// ============================================================================

const summarySchema: ToolParameterSchema = {
  toolName: "summary",
  parameters: [
    {
      name: "topic",
      type: "string",
      required: true,
      description: "Topic to summarize",
    },
    {
      name: "length",
      type: "enum",
      required: false,
      description: "Length of summary",
      enumValues: ["short", "medium", "long"],
      defaultValue: "medium",
    },
  ],
  extractionHint:
    "Extract topic after della/di/sulla keywords. Detect length: breve/short, medio/medium, lungo/long, dettagliato/long.",
};

// ============================================================================
// HOMEWORK SCHEMA
// ============================================================================

const homeworkSchema: ToolParameterSchema = {
  toolName: "homework",
  parameters: [
    {
      name: "topic",
      type: "string",
      required: true,
      description: "Subject or topic for homework",
    },
    {
      name: "difficulty",
      type: "enum",
      required: false,
      description: "Difficulty level for homework",
      enumValues: ["easy", "medium", "hard"],
    },
  ],
  extractionHint:
    'Extract subject from patterns like "compiti di [subject]" or "esercizio di [subject]". Detect difficulty: facile/easy, medio/medium, difficile/hard.',
};

// ============================================================================
// PDF SCHEMA
// ============================================================================

const pdfSchema: ToolParameterSchema = {
  toolName: "pdf",
  parameters: [],
  extractionHint:
    "PDF tool typically does not require parameters. May use document context from conversation.",
};

// ============================================================================
// WEBCAM SCHEMA
// ============================================================================

const webcamSchema: ToolParameterSchema = {
  toolName: "webcam",
  parameters: [],
  extractionHint:
    "Webcam tool typically does not require parameters. May use activity context from conversation.",
};

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

export const TOOL_SCHEMAS: Record<string, ToolParameterSchema> = {
  quiz: quizSchema,
  flashcard: flashcardSchema,
  mindmap: mindmapSchema,
  formula: formulaSchema,
  chart: chartSchema,
  summary: summarySchema,
  homework: homeworkSchema,
  pdf: pdfSchema,
  webcam: webcamSchema,
};

// Helper functions are exported from tool-parameter-validators.ts
