#!/usr/bin/env node
/**
 * Convert kebab-case keys to camelCase in JSON translation files
 * ADR 0091: i18n Key Naming Convention
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, '../messages');

// Convert kebab-case to camelCase
const toCamelCase = (str) => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Check if string is kebab-case
// Limited regex to prevent ReDoS: max 50 chars, simple pattern, no nested quantifiers
const isKebabCase = (str) => {
  if (typeof str !== 'string' || str.length > 50) return false;
  // Safe: limited to 50 chars, simple pattern with no nested quantifiers
  // eslint-disable-next-line security/detect-unsafe-regex
  return /^[a-z]+(-[a-z]+)+$/.test(str);
};

// Recursively process JSON object
const processObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(processObject);
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = isKebabCase(key) ? toCamelCase(key) : key;
    result[newKey] = processObject(value);
  }
  return result;
};

// Validate path is within messages directory to prevent directory traversal
const validatePath = (filePath, baseDir) => {
  const resolved = path.resolve(filePath);
  const base = path.resolve(baseDir);
  return resolved.startsWith(base);
};

// Process all JSON files in messages directory
const processDirectory = (dir) => {
  // Validate directory path
  if (!validatePath(dir, messagesDir)) {
    throw new Error(`Invalid directory path: ${dir}`);
  }
  
  // Safe: path validated above to prevent directory traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalFixed = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Validate full path before using
    if (!validatePath(fullPath, messagesDir)) {
      console.warn(`Skipping invalid path: ${fullPath}`);
      continue;
    }
    
    if (entry.isDirectory()) {
      totalFixed += processDirectory(fullPath);
    } else if (entry.name.endsWith('.json')) {
      // Safe: path validated above to prevent directory traversal
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const content = fs.readFileSync(fullPath, 'utf-8');
      const original = JSON.parse(content);
      const fixed = processObject(original);
      
      // Check if anything changed
      const originalStr = JSON.stringify(original, null, 2);
      const fixedStr = JSON.stringify(fixed, null, 2);
      
      if (originalStr !== fixedStr) {
        // Safe: path validated above to prevent directory traversal
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(fullPath, fixedStr + '\n');
        // Limited regex to prevent ReDoS: simple pattern, no nested quantifiers
        // Safe: simple pattern, limited input (JSON string), no nested quantifiers
        // eslint-disable-next-line security/detect-unsafe-regex
        const kebabKeyPattern = /"[a-z]+-[a-z]+(-[a-z]+)*"\s*:/g;
        const matches = originalStr.match(kebabKeyPattern);
        const keysFixed = matches ? matches.length : 0;
        console.log(`Fixed ${keysFixed} keys in ${path.relative(messagesDir, fullPath)}`);
        totalFixed += keysFixed;
      }
    }
  }
  return totalFixed;
};

console.log('Converting kebab-case keys to camelCase in translation files...\n');
const total = processDirectory(messagesDir);
console.log(`\nTotal keys converted: ${total}`);
