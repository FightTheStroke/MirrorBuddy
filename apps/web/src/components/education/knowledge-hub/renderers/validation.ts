/**
 * Runtime type validation for Knowledge Hub renderers
 *
 * Provides type guards to validate material data before rendering.
 * Helps catch malformed data and provides meaningful error messages.
 */

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Validate mindmap data structure
 */
export function isValidMindmapData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Must have either markdown or nodes
  const hasMarkdown = isString(data.markdown);
  const hasNodes = isArray(data.nodes);
  return hasMarkdown || hasNodes;
}

/**
 * Validate quiz data structure
 */
export function isValidQuizData(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isArray(data.questions)) return false;
  // Validate each question has required fields
  return data.questions.every(
    (q) =>
      isObject(q) &&
      isString(q.question) &&
      isArray(q.options) &&
      q.options.every((o) => isObject(o) && isString(o.text))
  );
}

/**
 * Validate flashcard data structure
 */
export function isValidFlashcardData(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isArray(data.cards)) return false;
  return data.cards.every(
    (c) => isObject(c) && isString(c.front) && isString(c.back)
  );
}

/**
 * Validate summary data structure
 */
export function isValidSummaryData(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isArray(data.sections)) return false;
  return data.sections.every(
    (s) => isObject(s) && (isString(s.title) || isString(s.content))
  );
}

/**
 * Validate chart data structure
 */
export function isValidChartData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Type is optional but must be valid if present
  if (data.type !== undefined) {
    const validTypes = ['line', 'bar', 'pie', 'scatter', 'area'];
    if (!validTypes.includes(data.type as string)) return false;
  }
  // Data object with labels and datasets
  if (data.data !== undefined) {
    if (!isObject(data.data)) return false;
  }
  return true;
}

/**
 * Validate diagram data structure
 */
export function isValidDiagramData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Must have code (mermaid syntax)
  return isString(data.code) && data.code.length > 0;
}

/**
 * Validate timeline data structure
 */
export function isValidTimelineData(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isArray(data.events)) return false;
  return data.events.every(
    (e) => isObject(e) && isString(e.date) && isString(e.title)
  );
}

/**
 * Validate formula data structure
 */
export function isValidFormulaData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Must have formula string
  return isString(data.formula) && data.formula.length > 0;
}

/**
 * Validate homework data structure
 */
export function isValidHomeworkData(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isArray(data.tasks)) return false;
  return data.tasks.every(
    (t) => isObject(t) && isString(t.description)
  );
}

/**
 * Validate demo data structure
 */
export function isValidDemoData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Must have at least one of html, css, js, or code
  const hasComponents = isString(data.html) || isString(data.css) || isString(data.js);
  const hasCode = isString(data.code);
  return hasComponents || hasCode;
}

/**
 * Validate image data structure
 */
export function isValidImageData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Must have src URL
  return isString(data.src) && data.src.length > 0;
}

/**
 * Validate PDF data structure
 */
export function isValidPdfData(data: unknown): boolean {
  if (!isObject(data)) return false;
  // Must have url
  return isString(data.url) && data.url.length > 0;
}

/**
 * Validation result with error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Get validation function for a tool type
 */
export function getValidator(
  toolType: string
): ((data: unknown) => boolean) | null {
  const validators: Record<string, (data: unknown) => boolean> = {
    mindmap: isValidMindmapData,
    quiz: isValidQuizData,
    flashcard: isValidFlashcardData,
    summary: isValidSummaryData,
    chart: isValidChartData,
    diagram: isValidDiagramData,
    timeline: isValidTimelineData,
    formula: isValidFormulaData,
    homework: isValidHomeworkData,
    demo: isValidDemoData,
    webcam: isValidImageData,
    pdf: isValidPdfData,
  };
  return validators[toolType] || null;
}

/**
 * Validate data for a specific tool type
 */
export function validateRendererData(
  toolType: string,
  data: unknown
): ValidationResult {
  const validator = getValidator(toolType);

  if (!validator) {
    return { valid: true }; // No validator = accept any data
  }

  const valid = validator(data);
  return {
    valid,
    error: valid ? undefined : `Invalid data format for ${toolType} renderer`,
  };
}
