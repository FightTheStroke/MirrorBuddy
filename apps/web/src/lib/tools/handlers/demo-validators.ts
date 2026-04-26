// ============================================================================
// DEMO VALIDATORS
// Validation and sanitization utilities for demo generation
//
// VERCEL FIX: JSDOM and DOMPurify are initialized lazily to avoid
// breaking the entire chat API when the module loads on Vercel.
// See ADR 0053: Vercel Runtime Constraints
// ============================================================================

import { DANGEROUS_JS_PATTERNS } from "./demo-handler/constants";

// Lazy-initialized DOMPurify instance
// Only created when sanitizeHtml is called, not at module load time
let purifyInstance: ReturnType<typeof import("dompurify").default> | null =
  null;

async function getPurify(): Promise<
  ReturnType<typeof import("dompurify").default>
> {
  if (!purifyInstance) {
    // Dynamic imports to avoid breaking chat API at module load
    const { JSDOM } = await import("jsdom");
    const DOMPurify = (await import("dompurify")).default;
    const jsdomWindow = new JSDOM("").window;
    // JSDOM's Window type doesn't match DOMPurify's WindowLike exactly
    // but it works at runtime - use double cast to satisfy TypeScript
    purifyInstance = DOMPurify(
      jsdomWindow as unknown as Window & typeof globalThis,
    );
  }
  return purifyInstance;
}

// Configure DOMPurify to be strict about XSS prevention
export const PURIFY_CONFIG = {
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onfocus",
    "onblur",
  ],
  ALLOW_DATA_ATTR: false,
  USE_PROFILES: { html: true },
};

/**
 * Validate JavaScript code for dangerous patterns.
 * This is a BLOCKLIST check, not HTML sanitization.
 * HTML sanitization is handled separately by DOMPurify.
 * lgtm[js/bad-tag-filter]
 */
export function validateCode(code: string): {
  safe: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  for (const { pattern, description } of DANGEROUS_JS_PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(code)) {
      violations.push(description);
    }
  }
  return { safe: violations.length === 0, violations };
}

/**
 * Sanitize HTML using DOMPurify - battle-tested XSS prevention library.
 * DOMPurify properly handles all edge cases including:
 * - Script injection, event handlers, javascript: URLs
 * - Unicode/multi-byte character obfuscation attacks
 * - Nested tags, malformed HTML, and encoding tricks
 * See: https://github.com/cure53/DOMPurify
 * lgtm[js/incomplete-multi-character-sanitization]
 *
 * VERCEL FIX: Now async to support lazy initialization of JSDOM/DOMPurify
 */
export async function sanitizeHtml(html: string): Promise<string> {
  if (!html) return "";
  const purify = await getPurify();
  return purify.sanitize(html, PURIFY_CONFIG);
}

/**
 * Validate and enhance the maestro's description
 * Returns suggestions if description is too vague
 */
export function validateDescription(description: {
  visualization: string;
  interaction: string;
}): { valid: boolean; suggestions?: string[] } {
  const suggestions: string[] = [];

  // Check for visual elements
  const visualKeywords = [
    "blocchi",
    "griglia",
    "cerchi",
    "timeline",
    "mappa",
    "grafico",
    "particelle",
    "forme",
    "elementi",
    "punti",
    "linea",
    "barra",
    "torta",
    "albero",
    "diagramma",
  ];
  const hasVisual = visualKeywords.some((k) =>
    description.visualization.toLowerCase().includes(k),
  );
  if (!hasVisual) {
    suggestions.push(
      "Specifica il tipo di elemento visivo: blocchi, griglia, timeline, mappa, grafico, particelle",
    );
  }

  // Check for interaction type
  const interactionKeywords = [
    "slider",
    "click",
    "trascina",
    "drag",
    "hover",
    "input",
    "bottone",
    "seleziona",
    "cambia",
    "muovi",
    "scrolla",
    "naviga",
  ];
  const hasInteraction = interactionKeywords.some((k) =>
    description.interaction.toLowerCase().includes(k),
  );
  if (!hasInteraction) {
    suggestions.push(
      "Specifica il tipo di interazione: slider, click, drag & drop, hover, bottoni",
    );
  }

  // Check for quantities (helps generate better demos)
  const hasNumbers =
    /\d+/.test(description.visualization) ||
    ["alcuni", "pochi", "molti", "tanti"].some((w) =>
      description.visualization.toLowerCase().includes(w),
    );
  if (!hasNumbers) {
    suggestions.push(
      'Indica quantità specifiche: "5 blocchi", "3 righe", "una dozzina di particelle"',
    );
  }

  return {
    valid: suggestions.length === 0,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
