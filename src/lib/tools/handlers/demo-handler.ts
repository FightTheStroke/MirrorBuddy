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
 * Note: Basic sanitization, the iframe sandbox provides main security
 */
function sanitizeHtml(html: string): string {
  // Remove script tags (JS should be in the js field)
  let sanitized = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=/gi, ' data-removed-handler=');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, 'removed:');

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
