/**
 * Constants for Demo Handler
 */

/**
 * Dangerous patterns to block in JavaScript code
 */
export const DANGEROUS_JS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
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
