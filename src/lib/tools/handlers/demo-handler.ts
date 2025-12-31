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
 * Remove script elements using character-by-character state machine
 * This avoids regex-based multi-character bypass vulnerabilities
 */
function removeScriptElements(html: string): string {
  let result = '';
  let i = 0;
  const lowerHtml = html.toLowerCase();

  while (i < html.length) {
    // Check for opening script tag
    if (lowerHtml.substring(i, i + 7) === '<script') {
      // Find the end of this script element
      const closingTag = lowerHtml.indexOf('</script', i);
      if (closingTag !== -1) {
        // Skip to after the closing tag
        const endOfClosing = lowerHtml.indexOf('>', closingTag);
        i = endOfClosing !== -1 ? endOfClosing + 1 : html.length;
      } else {
        // No closing tag, skip to end
        i = html.length;
      }
    } else {
      result += html[i];
      i++;
    }
  }

  return result;
}

/**
 * Sanitize HTML to prevent XSS
 * Note: Multi-layer sanitization, the iframe sandbox provides main security
 */
function sanitizeHtml(html: string): string {
  // First pass: remove script elements entirely (state machine approach)
  let sanitized = removeScriptElements(html);

  // Remove event handlers by finding on* attributes
  // Use state machine to properly handle attribute context
  let result = '';
  let inTag = false;
  let i = 0;

  while (i < sanitized.length) {
    const char = sanitized[i];

    if (char === '<') {
      inTag = true;
      result += char;
      i++;
    } else if (char === '>') {
      inTag = false;
      result += char;
      i++;
    } else if (inTag && sanitized.substring(i).match(/^on[a-z]+\s*=/i)) {
      // Found event handler, replace with data attribute
      const match = sanitized.substring(i).match(/^on[a-z]+/i);
      if (match) {
        result += 'data-removed-' + match[0].substring(2);
        i += match[0].length;
      }
    } else {
      result += char;
      i++;
    }
  }

  sanitized = result;

  // Remove dangerous URL schemes (normalize and check)
  // Decode any HTML entities first
  const decoded = sanitized
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

  // Remove dangerous protocols
  sanitized = decoded
    .replace(/javascript\s*:/gi, 'removed:')
    .replace(/vbscript\s*:/gi, 'removed:')
    .replace(/data\s*:/gi, 'removed:');

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
