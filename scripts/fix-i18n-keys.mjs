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
const isKebabCase = (str) => /^[a-z]+(-[a-z]+)+$/.test(str);

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

// Process all JSON files in messages directory
const processDirectory = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalFixed = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      totalFixed += processDirectory(fullPath);
    } else if (entry.name.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const original = JSON.parse(content);
      const fixed = processObject(original);
      
      // Check if anything changed
      const originalStr = JSON.stringify(original, null, 2);
      const fixedStr = JSON.stringify(fixed, null, 2);
      
      if (originalStr !== fixedStr) {
        fs.writeFileSync(fullPath, fixedStr + '\n');
        const keysFixed = (originalStr.match(/"[a-z]+-[a-z]+(-[a-z]+)*"\s*:/g) || []).length;
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
