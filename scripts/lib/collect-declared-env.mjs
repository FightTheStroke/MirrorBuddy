#!/usr/bin/env node
// Parse declarations without importing the validator or evaluating its source.
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const files = process.argv.slice(2);
const names = new Set();
const validName = /^[A-Z_][A-Z0-9_]*$/;

if (files.length === 0) {
  console.error('usage: collect-declared-env.mjs <file...>');
  process.exit(2);
}

const addName = (name) => {
  if (typeof name === 'string' && validName.test(name)) names.add(name);
};

const isEnvContainer = (node) =>
  node &&
  ts.isPropertyAccessExpression(node) &&
  node.name.text === 'env' &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'process';

const arrayLiteralOf = (node) => {
  if (!node) return undefined;
  let current = node;
  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    current = current.expression.expression;
  }
  return ts.isArrayLiteralExpression(current) ? current : undefined;
};

const visit = (node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    const elements = arrayLiteralOf(node.initializer)?.elements ?? [];
    if (node.name.text === 'criticalProductionEnv') {
      for (const element of elements) {
        if (ts.isStringLiteralLike(element)) addName(element.text);
      }
    }
    if (node.name.text === 'optional') {
      for (const element of elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        for (const property of element.properties) {
          if (
            ts.isPropertyAssignment(property) &&
            !ts.isComputedPropertyName(property.name) &&
            property.name.text === 'name' &&
            ts.isStringLiteralLike(property.initializer)
          ) {
            addName(property.initializer.text);
          }
        }
      }
    }
  }
  if (ts.isPropertyAccessExpression(node) && isEnvContainer(node.expression)) {
    addName(node.name.text);
  }
  if (
    ts.isElementAccessExpression(node) &&
    isEnvContainer(node.expression) &&
    node.argumentExpression &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    addName(node.argumentExpression.text);
  }
  ts.forEachChild(node, visit);
};

for (const file of files) {
  let text;
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Paths are declaration sources passed by the build scripts, never runtime input.
    text = readFileSync(file, 'utf8');
  } catch (error) {
    console.error(`cannot read ${file}: ${error?.code ?? 'unreadable'}`);
    process.exit(2);
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (!Array.isArray(source.parseDiagnostics) || source.parseDiagnostics.length > 0) {
    console.error(`cannot parse declaration source: ${file}`);
    process.exit(2);
  }
  visit(source);
}

for (const name of [...names].sort()) console.log(name);
