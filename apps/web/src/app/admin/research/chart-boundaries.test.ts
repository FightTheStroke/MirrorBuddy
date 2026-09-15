import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));

function source(file: string) {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
}

function imports(file: string, visited = new Set<string>()): Set<string> {
  if (visited.has(file)) return new Set();
  visited.add(file);
  const dependencies = new Set<string>();
  for (const node of source(file).statements) {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) continue;
    if (ts.isExportDeclaration(node) && node.isTypeOnly) continue;
    const name = node.moduleSpecifier.text;
    dependencies.add(name);
    if (!name.startsWith('.')) continue;
    const target = ['.tsx', '.ts', '/index.tsx', '/index.ts']
      .map((extension) => resolve(dirname(file), name + extension))
      .find(existsSync);
    if (!target) throw new Error(`Unresolved local import: ${name}`);
    for (const dependency of imports(target, visited)) dependencies.add(dependency);
  }
  return dependencies;
}

describe('research chart import boundaries', () => {
  it.each(['page.tsx', 'ab-testing/page.tsx'])('%s has no eager Recharts dependency', (entry) => {
    expect([...imports(resolve(root, entry))]).not.toContain('recharts');
  });

  it.each([
    ['stats-cards.tsx', './stats-chart'],
    ['heatmap-drill-down.tsx', './heatmap-progression-chart'],
    ['ab-testing/page.tsx', './results-bar-chart'],
  ])('%s renders a real next/dynamic chart edge', (owner, chart) => {
    const tree = source(resolve(root, owner));
    let dynamicName: string | undefined;
    for (const node of tree.statements) {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === 'next/dynamic'
      ) {
        dynamicName = node.importClause?.name?.text;
      }
    }
    expect(dynamicName).toBeTruthy();
    const dynamicComponents: string[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) &&
        node.initializer.expression.text === dynamicName
      ) {
        const call = node.initializer;
        let hasChartImport = false;
        function inspect(child: ts.Node) {
          if (
            ts.isCallExpression(child) &&
            child.expression.kind === ts.SyntaxKind.ImportKeyword &&
            child.arguments[0] &&
            ts.isStringLiteral(child.arguments[0]) &&
            child.arguments[0].text === chart
          )
            hasChartImport = true;
          ts.forEachChild(child, inspect);
        }
        ts.forEachChild(call, inspect);
        if (hasChartImport) {
          expect(call.arguments[1]?.getText(tree)).toContain('ssr: false');
          expect(call.arguments[1]?.getText(tree)).toContain('loading:');
          dynamicComponents.push(node.name.text);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    expect(dynamicComponents).toHaveLength(1);
    expect(tree.text).toMatch(new RegExp(`<${dynamicComponents[0]}[\\s/>]`));
    expect(imports(resolve(dirname(tree.fileName), chart + '.tsx'))).toContain('recharts');
  });
});
