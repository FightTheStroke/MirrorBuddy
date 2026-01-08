// ============================================================================
// DEMO HANDLER
// Two-stage architecture:
// 1. Maestro describes the demo creatively (what to visualize)
// 2. Technical agent generates HTML/CSS/JS code
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import { chatCompletion } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import type { DemoData, ToolExecutionResult } from '@/types/tools';

/**
 * Dangerous patterns to block in JavaScript code
 */
const DANGEROUS_JS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /document\.cookie/i, description: 'Cookie access' },
  { pattern: /localStorage/i, description: 'LocalStorage access' },
  { pattern: /sessionStorage/i, description: 'SessionStorage access' },
  { pattern: /indexedDB/i, description: 'IndexedDB access' },
  { pattern: /fetch\s*\(/i, description: 'Network fetch' },
  { pattern: /XMLHttpRequest/i, description: 'XHR request' },
  { pattern: /window\.open/i, description: 'Window open' },
  { pattern: /window\.location/i, description: 'Location manipulation' },
  { pattern: /eval\s*\(/i, description: 'Eval execution' },
  { pattern: /Function\s*\(/i, description: 'Function constructor' },
  { pattern: /new\s+Function/i, description: 'Function constructor' },
  { pattern: /import\s*\(/i, description: 'Dynamic import' },
  { pattern: /require\s*\(/i, description: 'CommonJS require' },
  { pattern: /postMessage/i, description: 'Cross-origin messaging' },
  { pattern: /navigator\.(geolocation|clipboard|mediaDevices)/i, description: 'Sensitive API access' },
];

function validateCode(code: string): { safe: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const { pattern, description } of DANGEROUS_JS_PATTERNS) {
    if (pattern.test(code)) {
      violations.push(description);
    }
  }
  return { safe: violations.length === 0, violations };
}

function sanitizeHtml(html: string): string {
  let sanitized = html;
  // Remove dangerous protocols
  sanitized = sanitized
    .replace(/javascript\s*:/gi, 'removed:')
    .replace(/vbscript\s*:/gi, 'removed:');
  return sanitized;
}

/**
 * Technical agent that generates HTML/CSS/JS from description
 */
async function generateDemoCode(description: {
  title: string;
  concept: string;
  visualization: string;
  interaction: string;
  wowFactor?: string;
}): Promise<{ html: string; css: string; js: string } | null> {
  const prompt = `Sei un esperto sviluppatore di demo interattive educative. Genera il codice per questa demo:

TITOLO: ${description.title}
CONCETTO: ${description.concept}
VISUALIZZAZIONE: ${description.visualization}
INTERAZIONE: ${description.interaction}
${description.wowFactor ? `EFFETTO WOW: ${description.wowFactor}` : ''}

REQUISITI TECNICI OBBLIGATORI:

1. VISUAL DESIGN MODERNO:
   - Background: gradiente colorato (es: linear-gradient(135deg, #667eea 0%, #764ba2 100%))
   - Card centrale bianca con border-radius: 20px e ombra morbida
   - Bottoni grandi colorati con hover effects (transform: scale(1.05))
   - Font leggibile (system-ui, min 16px)

2. ANIMAZIONI CANVAS:
   - Usa <canvas> per animazioni fluide
   - requestAnimationFrame per loop animazione
   - Particelle o elementi decorativi animati come sfondo

3. INTERATTIVITÀ:
   - Event listeners per click, input, mousemove
   - Feedback visivo immediato (colori, scale, movimento)
   - Stato che si aggiorna in tempo reale

4. ACCESSIBILITÀ:
   - Bottoni min 44x44px
   - Contrasto alto (testo scuro su sfondo chiaro)
   - @media (prefers-reduced-motion: reduce) per ridurre animazioni
   - Testo sempre leggibile

5. SICUREZZA:
   - NO fetch, localStorage, eval, Function constructor
   - Solo JavaScript vanilla
   - Auto-contenuto (no CDN esterni)

Rispondi SOLO con JSON valido (no markdown):
{"html":"...","css":"...","js":"..."}`;

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: prompt }],
      'Sei un generatore di codice. Rispondi SOLO con JSON valido.',
      { temperature: 0.7, maxTokens: 4000 }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Failed to parse demo code JSON');
      return null;
    }

    const code = JSON.parse(jsonMatch[0]);
    return {
      html: code.html || '',
      css: code.css || '',
      js: code.js || '',
    };
  } catch (error) {
    logger.error('Failed to generate demo code', { error });
    return null;
  }
}

/**
 * Register the demo handler - accepts description, generates code
 */
registerToolHandler('create_demo', async (args): Promise<ToolExecutionResult> => {
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
      toolType: 'demo',
      error: 'Title, concept, visualization, and interaction are required',
    };
  }

  logger.info('Generating demo from description', { title, concept });

  // Generate code from description using technical agent
  const code = await generateDemoCode({ title, concept, visualization, interaction, wowFactor });
  
  if (!code) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'demo',
      error: 'Failed to generate demo code',
    };
  }

  // Validate JavaScript
  if (code.js) {
    const jsValidation = validateCode(code.js);
    if (!jsValidation.safe) {
      logger.warn('Generated JS contains unsafe patterns, sanitizing', { violations: jsValidation.violations });
      // Try to regenerate or return error
      return {
        success: false,
        toolId: nanoid(),
        toolType: 'demo',
        error: 'Generated code contains unsafe patterns. Please try again.',
      };
    }
  }

  const data: DemoData = {
    title: title.trim(),
    description: `${concept}: ${visualization}`,
    html: sanitizeHtml(code.html),
    css: code.css,
    js: code.js,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'demo',
    data,
  };
});

export { validateCode, sanitizeHtml, DANGEROUS_JS_PATTERNS };
