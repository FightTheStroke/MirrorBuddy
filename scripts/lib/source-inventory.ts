import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const excludedDirectories = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'generated',
  'worktrees',
  'playwright-report',
  'test-results',
]);

export function isTestFile(file: string): boolean {
  return /(?:^|\/)(?:__tests__|__mocks__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
}

export function inventoryFiles(root: string, directory: string, rejectLinks = true): string[] {
  if (!root || !directory) throw new Error('Source inventory requires a root and directory');
  const absolute = resolve(realpathSync(root), directory);
  if (rejectLinks && realpathSync(absolute) !== absolute) {
    throw new Error(`Source inventory refuses a linked directory: ${directory}`);
  }
  if (!lstatSync(absolute).isDirectory() || lstatSync(absolute).isSymbolicLink()) {
    throw new Error(`Invalid source directory: ${directory}`);
  }
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (excludedDirectories.has(entry.name) || (entry.isDirectory() && entry.name.startsWith('.')))
      continue;
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      if (rejectLinks) throw new Error(`Source inventory refuses a symbolic link: ${file}`);
      continue;
    }
    if (entry.isDirectory()) files.push(...inventoryFiles(root, file, rejectLinks));
    else if (entry.isFile()) files.push(file);
  }
  return files.sort();
}

export function sourceFiles(root: string): string[] {
  const files = ['apps/web/src', 'packages']
    .flatMap((directory) => inventoryFiles(root, directory))
    .filter((file) => /\.tsx?$/.test(file));
  if (files.length === 0) throw new Error('Source inventory is empty');
  return files;
}
export function lineCount(content: string): number {
  if (!content) return 0;
  return content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
}

export function sourceFile(root: string, file: string): ts.SourceFile {
  const text = readFileSync(join(root, file), 'utf8');
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
}

export function commentLocations(source: ts.SourceFile, pattern: RegExp): string[] {
  const locations = new Set<string>();
  const visited = new Set<number>();
  function inspect(ranges: ts.CommentRange[] | undefined) {
    for (const range of ranges ?? []) {
      if (visited.has(range.pos)) continue;
      visited.add(range.pos);
      let offset = range.pos;
      for (const line of source.text.slice(range.pos, range.end).split('\n')) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          locations.add(
            `${source.fileName}:${source.getLineAndCharacterOfPosition(offset).line + 1}`,
          );
        }
        offset += line.length + 1;
      }
    }
  }
  function visit(node: ts.Node) {
    inspect(ts.getLeadingCommentRanges(source.text, node.pos));
    inspect(ts.getTrailingCommentRanges(source.text, node.end));
    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...locations];
}

export function backupFiles(root: string): string[] {
  return inventoryFiles(root, '.', false)
    .filter((file) => /\.(?:bak|old|orig|backup)$/.test(file))
    .map((file) => relative(root, resolve(root, file)));
}
