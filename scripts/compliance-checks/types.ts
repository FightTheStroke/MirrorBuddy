import fs from 'fs';
import path from 'path';

export interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  category: string;
}

export const projectRoot = process.cwd();

export function resolve(...segments: string[]): string {
  return path.join(projectRoot, ...segments);
}

export function fileExists(relPath: string): boolean {
  return fs.existsSync(resolve(relPath));
}

export function dirExists(relPath: string): boolean {
  const full = resolve(relPath);
  return fs.existsSync(full) && fs.statSync(full).isDirectory();
}

export function readFile(relPath: string): string | null {
  const full = resolve(relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}

export function fileSize(relPath: string): number {
  const full = resolve(relPath);
  if (!fs.existsSync(full)) return 0;
  return fs.statSync(full).size;
}

/** Recursively find files matching a pattern under a directory. */
export function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const fullDir = resolve(dir);
  if (!fs.existsSync(fullDir)) return results;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        walk(entryPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(entryPath);
      }
    }
  }
  walk(fullDir);
  return results;
}

/** Check if a file's content contains a specific string. */
export function fileContains(relPath: string, needle: string): boolean {
  const content = readFile(relPath);
  return content !== null && content.includes(needle);
}

/** Check if a file's content matches a regex. */
export function fileMatches(relPath: string, pattern: RegExp): boolean {
  const content = readFile(relPath);
  return content !== null && pattern.test(content);
}
