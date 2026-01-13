/**
 * Tool Plugin System Constants
 * Centralized constants for security limits, Italian localized messages, and configuration
 *
 * Security: Defines limits to prevent DoS and memory exhaustion attacks
 * i18n: Italian strings centralized for future internationalization
 */

// =============================================================================
// SECURITY LIMITS
// =============================================================================

/**
 * Maximum transcript length in characters for trigger detection
 * Prevents memory exhaustion from excessively long transcripts
 */
export const MAX_TRANSCRIPT_LENGTH = 10000;

/**
 * Maximum DataChannel message size in bytes (64KB)
 * Prevents memory exhaustion from oversized messages
 */
export const MAX_MESSAGE_SIZE = 65536;

/**
 * Default tool execution timeout in milliseconds (30 seconds)
 * Prevents tools from hanging indefinitely
 */
export const DEFAULT_EXECUTION_TIMEOUT = 30000;

/**
 * Maximum tool ID length
 * Prevents resource exhaustion from long identifiers
 */
export const MAX_TOOL_ID_LENGTH = 64;

/**
 * Maximum voice prompt/feedback template length
 * Prevents memory issues from overly long templates
 */
export const MAX_TEMPLATE_LENGTH = 500;

// =============================================================================
// LOCALIZED MESSAGES (Italian - IT)
// =============================================================================

/**
 * Voice feedback messages for tool execution
 * Centralized for i18n support
 */
export const VOICE_MESSAGES = {
  /** When tool is not found in registry */
  TOOL_NOT_AVAILABLE: (toolId: string) => `Tool ${toolId} is not available.`,

  /** When tool execution completes without specific feedback */
  TOOL_EXECUTION_COMPLETED: (toolId: string) => `Tool ${toolId} execution completed.`,

  /** Default success message */
  DEFAULT_SUCCESS: 'Tool executed successfully.',

  /** Default fallback for unexpected states */
  EXECUTION_COMPLETED_FALLBACK: "L'esecuzione dello strumento è completata.",
} as const;

/**
 * Error messages in Italian for user feedback
 * Maps error codes to user-friendly messages
 */
export const ERROR_MESSAGES_IT = {
  PLUGIN_NOT_FOUND: 'Lo strumento non è disponibile.',
  VALIDATION_FAILED: 'I parametri forniti non sono validi.',
  PREREQUISITES_NOT_MET: 'Alcuni requisiti per lo strumento non sono stati soddisfatti.',
  PERMISSION_DENIED: 'Non hai il permesso di utilizzare questo strumento.',
  EXECUTION_FAILED: "Errore durante l'esecuzione dello strumento.",
  TIMEOUT: "L'esecuzione dello strumento ha impiegato troppo tempo.",
  UNKNOWN: 'Si è verificato un errore sconosciuto.',
} as const;

/**
 * Voice flow messages in Italian
 */
export const VOICE_FLOW_MESSAGES_IT = {
  /** No trigger detected in transcript */
  NO_TRIGGER_DETECTED: 'Non ho riconosciuto una richiesta di strumento. Prova a dire il nome dello strumento.',

  /** Trigger detected but unclear */
  UNCLEAR_REQUEST: 'Non ho riconosciuto una richiesta chiara. Puoi ripetere per favore?',

  /** Error during tool execution */
  EXECUTION_ERROR: "Si è verificato un errore durante l'esecuzione dello strumento.",
} as const;

/**
 * Proposal injector category labels in Italian
 */
export const CATEGORY_LABELS_IT: Record<string, string> = {
  create: 'Crea',
  upload: 'Carica',
  search: 'Ricerca',
  other: 'Strumenti',
} as const;

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input to prevent XSS attacks
 * Escapes HTML entities in user-provided content
 *
 * @param input - Potentially unsafe string
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object values recursively for safe display
 * Only sanitizes string values, preserves structure
 *
 * @param obj - Object with potentially unsafe string values
 * @returns Object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeInput(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }

  return result;
}

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

/**
 * Valid tool ID pattern: lowercase letters and underscores only
 */
export const TOOL_ID_PATTERN = /^[a-z_]+$/;

/**
 * Valid template variable pattern: alphanumeric with underscores
 */
export const TEMPLATE_VAR_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
