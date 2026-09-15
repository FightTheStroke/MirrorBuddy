#!/usr/bin/env npx tsx
import ts from 'typescript';
import { commentLocations, isTestFile, sourceFile, sourceFiles } from './lib/source-inventory';

function check(mode: string | undefined) {
  if (mode !== 'hygiene' && mode !== 'rigor') throw new Error('Expected hygiene or rigor mode');
  const markers: string[] = [];
  const consoles: string[] = [];
  const suppressions: string[] = [];
  const unsafeTypes: string[] = [];
  for (const file of sourceFiles(process.cwd())) {
    if (mode === 'hygiene' && isTestFile(file)) continue;
    const source = sourceFile(process.cwd(), file);
    suppressions.push(...commentLocations(source, /@ts-(?:ignore|nocheck)\b/));
    markers.push(...commentLocations(source, /\b(?:TODO|FIXME|HACK|XXX):/));
    function visit(node: ts.Node) {
      const location = `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
      if (!isTestFile(file) && node.kind === ts.SyntaxKind.AnyKeyword) unsafeTypes.push(location);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const { expression, name } = node.expression;
        if (
          ts.isIdentifier(expression) &&
          expression.text === 'console' &&
          /^(?:log|warn|error|debug|info)$/.test(name.text) &&
          !/(?:logger|demo-html-builder)/.test(file)
        )
          consoles.push(location);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  if (mode === 'hygiene') {
    console.log(`TODO_COUNT=${markers.length}\nCONSOLE_COUNT=${consoles.length}`);
    for (const location of [...markers, ...consoles]) console.log(location);
    return markers.length + consoles.length === 0;
  }
  for (const location of suppressions) console.log(`TS_IGNORE:${location}`);
  for (const location of unsafeTypes) console.log(`ANY_TYPE:${location}`);
  return suppressions.length + unsafeTypes.length === 0;
}

try {
  process.exitCode = check(process.argv[2]) ? 0 : 1;
} catch (error) {
  console.error(
    'Source quality scan failed:',
    error instanceof Error ? error.message : 'unknown error',
  );
  process.exitCode = 1;
}
