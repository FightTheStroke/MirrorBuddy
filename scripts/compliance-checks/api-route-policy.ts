import ts from 'typescript';

export interface MutationPolicy {
  method: string;
  protected: boolean;
  admin: boolean;
  orderIssue: boolean;
  unresolved?: boolean;
}

export type ModuleLoader = (
  specifier: string,
  from: string,
) => { filename: string; content: string } | null;

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH = new Set(['withAuth', 'withAdmin', 'withAdminReadOnly']);

/** Inspect executed middleware arguments, never imports/comments or another HTTP method. */
export function inspectMutationRoutes(
  content: string | null | undefined,
  load?: ModuleLoader,
  filename = 'route.ts',
  ancestors = new Set<string>(),
): MutationPolicy[] {
  if (!content) return [];
  const visited = new Set(ancestors).add(filename);
  const source = ts.createSourceFile('route.ts', content, ts.ScriptTarget.Latest, true);
  const bindings = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const modulePath = statement.moduleSpecifier.text;
    if (
      modulePath !== '@/lib/api/pipe' &&
      modulePath !== '@/lib/api/middlewares' &&
      !modulePath.startsWith('@/lib/api/middlewares/')
    )
      continue;
    const imports = statement.importClause?.namedBindings;
    if (imports && ts.isNamedImports(imports)) {
      for (const item of imports.elements)
        bindings.set(item.name.text, item.propertyName?.text ?? item.name.text);
    }
  }
  const initializers = new Map<string, ts.Expression>();
  for (const statement of source.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      !(statement.declarationList.flags & ts.NodeFlags.Const)
    )
      continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        initializers.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  const results: MutationPolicy[] = [];
  function inspect(method: string, expression?: ts.Expression) {
    if (!MUTATIONS.has(method)) return;
    const seen = new Set<string>();
    while (expression && ts.isIdentifier(expression) && !seen.has(expression.text)) {
      seen.add(expression.text);
      expression = initializers.get(expression.text);
    }
    const chain: string[] = [];
    if (
      expression &&
      ts.isCallExpression(expression) &&
      ts.isCallExpression(expression.expression)
    ) {
      const pipeline = expression.expression;
      if (
        ts.isIdentifier(pipeline.expression) &&
        bindings.get(pipeline.expression.text) === 'pipe'
      ) {
        for (const argument of pipeline.arguments) {
          const identifier = ts.isCallExpression(argument) ? argument.expression : argument;
          if (ts.isIdentifier(identifier)) chain.push(bindings.get(identifier.text) ?? '');
        }
      }
    }
    const csrf = chain.indexOf('withCSRF');
    const auth = chain.findIndex((name) => AUTH.has(name));
    results.push({
      method,
      protected: csrf !== -1 || chain.includes('withCron'),
      admin: chain.includes('withAdmin'),
      orderIssue: csrf !== -1 && auth !== -1 && csrf > auth,
    });
  }
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const names =
        statement.exportClause && ts.isNamedExports(statement.exportClause)
          ? statement.exportClause.elements.filter((item) => !item.isTypeOnly)
          : undefined;
      if (!statement.moduleSpecifier) {
        for (const item of names ?? [])
          inspect(item.name.text, initializers.get(item.propertyName?.text ?? item.name.text));
        continue;
      }
      const target = ts.isStringLiteral(statement.moduleSpecifier)
        ? load?.(statement.moduleSpecifier.text, filename)
        : null;
      const policies =
        target && !visited.has(target.filename)
          ? inspectMutationRoutes(target.content, load, target.filename, visited)
          : null;
      const unresolved = (method: string): MutationPolicy => ({
        method,
        protected: false,
        admin: false,
        orderIssue: false,
        unresolved: true,
      });
      if (!names) {
        results.push(...(policies ?? [unresolved('*')]));
      } else {
        for (const item of names.filter((entry) => MUTATIONS.has(entry.name.text))) {
          const policy = policies?.find(
            (entry) => entry.method === (item.propertyName?.text ?? item.name.text),
          );
          results.push(policy ? { ...policy, method: item.name.text } : unresolved(item.name.text));
        }
      }
      continue;
    }
    const exported =
      ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          inspect(declaration.name.text, declaration.initializer);
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      inspect(statement.name.text);
    }
  }
  return results;
}
