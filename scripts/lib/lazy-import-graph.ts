import ts from 'typescript';

export interface ImportEdge {
  specifier: string;
  name: string;
  dynamic?: boolean;
}
export interface RuntimeModule {
  edges: ImportEdge[];
  exports: Map<string, ImportEdge | undefined>;
  stars: string[];
  heavy: boolean;
  katex: boolean;
}

export function runtimeModule(source: ts.SourceFile, checker: ts.TypeChecker): RuntimeModule {
  const result: RuntimeModule = {
    edges: [],
    exports: new Map(),
    stars: [],
    heavy: false,
    katex: false,
  };
  const bindings = new Map<string, { symbol: ts.Symbol | undefined; edge: ImportEdge }>();
  const used = new Set<ts.Symbol>();
  const addBinding = (local: ts.Identifier, specifier: string, name: string) =>
    bindings.set(local.text, {
      symbol: checker.getSymbolAtLocation(local),
      edge: { specifier, name },
    });
  const noteHeavy = (specifier: string) => {
    if (specifier === 'recharts' || specifier.startsWith('recharts/')) result.heavy = true;
    if (specifier === 'katex' || specifier.startsWith('katex/')) result.katex = true;
  };

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause?.isTypeOnly) continue;
      if (!clause) {
        result.edges.push({ specifier, name: '*' });
        noteHeavy(specifier);
        continue;
      }
      if (clause.name) addBinding(clause.name, specifier, 'default');
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        addBinding(clause.namedBindings.name, specifier, '*');
      } else if (clause.namedBindings) {
        for (const binding of clause.namedBindings.elements) {
          if (!binding.isTypeOnly)
            addBinding(binding.name, specifier, binding.propertyName?.text ?? binding.name.text);
        }
      }
    }
    if (ts.isImportEqualsDeclaration(statement) && !statement.isTypeOnly) {
      const ref = statement.moduleReference;
      if (
        ts.isExternalModuleReference(ref) &&
        ref.expression &&
        ts.isStringLiteral(ref.expression)
      ) {
        addBinding(statement.name, ref.expression.text, '*');
      }
    }
  }
  const exportedNames = (name: ts.BindingName): string[] =>
    ts.isIdentifier(name)
      ? [name.text]
      : name.elements.flatMap((element) =>
          ts.isOmittedExpression(element) ? [] : exportedNames(element.name),
        );
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const specifier = statement.moduleSpecifier;
      const target = specifier && ts.isStringLiteral(specifier) ? specifier.text : undefined;
      if (!statement.exportClause && target) {
        result.stars.push(target);
        noteHeavy(target);
      } else if (statement.exportClause && ts.isNamespaceExport(statement.exportClause) && target) {
        result.exports.set(statement.exportClause.name.text, { specifier: target, name: '*' });
      } else if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const item of statement.exportClause.elements) {
          if (item.isTypeOnly) continue;
          const name = item.propertyName?.text ?? item.name.text;
          result.exports.set(
            item.name.text,
            target ? { specifier: target, name } : bindings.get(name)?.edge,
          );
        }
      }
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      result.exports.set(
        'default',
        ts.isIdentifier(statement.expression)
          ? bindings.get(statement.expression.text)?.edge
          : undefined,
      );
    }
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
      result.exports.set('default', undefined);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of exportedNames(declaration.name)) result.exports.set(name, undefined);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      result.exports.set(statement.name.text, undefined);
    }
  }
  function visit(node: ts.Node) {
    if (
      ts.isExpressionWithTypeArguments(node) &&
      ts.isHeritageClause(node.parent) &&
      node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
      (ts.isClassDeclaration(node.parent.parent) || ts.isClassExpression(node.parent.parent))
    ) {
      visit(node.expression);
      return;
    }
    if (
      ts.isImportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node) ||
      ts.isExportDeclaration(node) ||
      ts.isTypeNode(node) ||
      ts.isInterfaceDeclaration(node)
    )
      return;
    if (
      ts.isExportAssignment(node) &&
      ts.isIdentifier(node.expression) &&
      bindings.has(node.expression.text)
    )
      return;
    if (ts.isIdentifier(node)) {
      const symbol = ts.isShorthandPropertyAssignment(node.parent)
        ? checker.getShorthandAssignmentValueSymbol(node.parent)
        : checker.getSymbolAtLocation(node);
      if (symbol) used.add(symbol);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) {
        result.edges.push({
          specifier: '',
          name: '*',
          dynamic: node.expression.kind === ts.SyntaxKind.ImportKeyword,
        });
      } else {
        const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        result.edges.push({ specifier: argument.text, name: '*', dynamic });
        if (!dynamic) noteHeavy(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const binding of bindings.values()) {
    if ((binding.symbol && used.has(binding.symbol)) || binding.edge.specifier === 'katex') {
      result.edges.push(binding.edge);
      noteHeavy(binding.edge.specifier);
    }
  }
  for (const edge of result.exports.values()) {
    if (edge) noteHeavy(edge.specifier);
  }
  return result;
}
