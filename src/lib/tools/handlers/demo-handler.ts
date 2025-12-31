// ============================================================================
// DEMO HANDLER
// Creates HTML/JS interactive simulations
// Security: Validates code before execution
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { DemoData, ToolExecutionResult } from '@/types/tools';

/**
 * Dangerous patterns to block in JavaScript code
 * Safety: Prevents data exfiltration and malicious actions
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

/**
 * Validate code for dangerous patterns
 */
function validateCode(code: string): { safe: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const { pattern, description } of DANGEROUS_JS_PATTERNS) {
    if (pattern.test(code)) {
      violations.push(description);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Sanitize HTML to prevent XSS
 * Note: Multi-layer sanitization, the iframe sandbox provides main security
 */
function sanitizeHtml(html: string): string {
  let sanitized = html;

  // Remove script tags (comprehensive: handles variations, attributes, whitespace)
  // Loop to handle nested or malformed tags
  let previousLength: number;
  do {
    previousLength = sanitized.length;
    // Handle all script tag variations including self-closing and malformed
    sanitized = sanitized.replace(/<\s*script[^>]*>/gi, '');
    sanitized = sanitized.replace(/<\s*\/\s*script\s*>/gi, '');
  } while (sanitized.length !== previousLength);

  // Remove event handlers (comprehensive: handles all on* attributes)
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=/gi, ' data-removed-handler=');

  // Remove javascript:, vbscript:, data: URLs (comprehensive: handles encoding and whitespace)
  // First decode HTML entities that could be used for bypass
  sanitized = sanitized.replace(/&#x?[0-9a-f]+;?/gi, '');
  // Check for dangerous protocols with optional whitespace/newlines
  sanitized = sanitized.replace(/\b(javascript|vbscript|data)\s*:/gi, 'removed:');
  // Also remove variations with whitespace between characters
  sanitized = sanitized.replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, 'removed:');

  return sanitized;
}

/**
 * Register the demo handler
 */
registerToolHandler('create_demo', async (args): Promise<ToolExecutionResult> => {
  const { title, description, html, css, js } = args as {
    title: string;
    description?: string;
    html: string;
    css?: string;
    js?: string;
  };

  // Validate title
  if (!title || typeof title !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'demo',
      error: 'Title is required and must be a string',
    };
  }

  // Validate HTML
  if (!html || typeof html !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'demo',
      error: 'HTML content is required',
    };
  }

  // Validate JavaScript if provided
  if (js) {
    const jsValidation = validateCode(js);
    if (!jsValidation.safe) {
      return {
        success: false,
        toolId: nanoid(),
        toolType: 'demo',
        error: `JavaScript contains blocked patterns: ${jsValidation.violations.join(', ')}`,
      };
    }
  }

  // Sanitize HTML
  const sanitizedHtml = sanitizeHtml(html);

  const data: DemoData = {
    title: title.trim(),
    description: description?.trim(),
    html: sanitizedHtml,
    css: css?.trim() || '',
    js: js?.trim() || '',
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'demo',
    data,
  };
});

export { validateCode, sanitizeHtml, DANGEROUS_JS_PATTERNS };
