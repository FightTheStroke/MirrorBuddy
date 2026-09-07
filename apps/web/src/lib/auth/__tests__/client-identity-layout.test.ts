import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

const source = (file: string) => readFileSync(join(process.cwd(), 'apps/web/src', file), 'utf8');
const maestroLogic = 'components/maestros/use-maestro-session-logic.ts';
const clients = [
  'app/layout.tsx',
  'components/providers.tsx',
  'app/[locale]/page.tsx',
  'app/[locale]/login/page.tsx',
  'app/[locale]/change-password/page.tsx',
  'app/[locale]/reset-password/page.tsx',
  'app/[locale]/welcome/components/landing-page.tsx',
  'app/[locale]/welcome/hooks/use-existing-user-data.ts',
  'components/profile/genitori-view.tsx',
  'components/conversation/components/voice-call-panel.tsx',
  'components/conversation/components/voice-call-overlay.tsx',
  maestroLogic,
  'components/conversation/hooks/use-conversation-inactivity.ts',
  'components/conversation/hooks/use-conversation-handlers.ts',
  'components/conversation/hooks/use-message-sender.ts',
  'components/conversation/hooks/use-message-sending.ts',
  'components/education/flashcards-view/hooks/use-flashcards-view.ts',
  'components/tools/tool-panel.tsx',
  'components/settings/sections/privacy-settings.tsx',
  'app/admin/invites/page.tsx',
  'lib/stores/onboarding-store.ts',
  'lib/stores/use-store-sync.ts',
  'lib/stores/conversation-flow-store/slices/character-slice.ts',
  'lib/stores/conversation-flow-store/persistence.ts',
  'lib/hooks/use-saved-materials/hooks/use-demos.ts',
  'lib/hooks/use-saved-materials/hooks/use-quizzes.ts',
  'lib/hooks/use-saved-materials/hooks/use-mindmaps.ts',
  'lib/hooks/use-saved-materials/hooks/use-saved-tools.ts',
  'lib/hooks/use-saved-materials/hooks/use-flashcard-decks.ts',
  'lib/hooks/use-saved-materials/hooks/use-homework-sessions.ts',
];

function assertGuardedMaestroClose(contents: string) {
  const file = ts.createSourceFile(maestroLogic, contents, ts.ScriptTarget.Latest, true);
  const callbacks: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'handleEndSession' &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      callbacks.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  expect(callbacks).toHaveLength(1);
  const callback = callbacks[0].arguments[0];
  if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)) {
    throw new Error('Missing canonical Maestro close callback');
  }
  const statements = callback.body.statements;
  const persistence = statements.find(ts.isTryStatement);
  if (!persistence?.catchClause) throw new Error('Missing guarded Maestro persistence');
  expect(persistence.tryBlock.getText(file)).toContain("await csrfFetch('/api/learnings/extract'");
  expect(persistence.catchClause.block.getText(file)).toContain('evaluation.savedToDiary = false');
  const completion = statements.find(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      ts.isIdentifier(statement.expression.expression) &&
      statement.expression.expression.text === 'endSession',
  );
  expect(completion?.getStart(file)).toBeGreaterThan(persistence.end);
}

describe('root identity wiring and client syntax compatibility', () => {
  it('root server identity seeds providers before consent, preserving the CSP nonce', () => {
    expect(source('app/layout.tsx')).toContain('await getServerIdentity()');
    expect(source('app/layout.tsx')).toContain(
      '<Providers nonce={nonce} initialIdentity={initialIdentity}>',
    );
    const providers = source('components/providers.tsx');
    expect(providers.indexOf('<IdentityProvider')).toBeLessThan(
      providers.indexOf('<ConditionalUnifiedConsent>'),
    );
    expect(providers).toContain('nonce={nonce}');
    expect(source('lib/auth/client-auth.ts')).not.toContain('document.cookie');
  });
  it('canonical Maestro close preserves completion after a failed diary save', () => {
    assertGuardedMaestroClose(source(maestroLogic));
  });
  it.each([
    ['close callback', 'const handleEndSession =', 'const unrelatedCallback ='],
    ['diary request', '/api/learnings/extract', '/api/unrelated'],
    ['failure result', 'evaluation.savedToDiary = false', 'evaluation.savedToDiary = true'],
    ['session completion', 'endSession();', ''],
  ])('rejects source-reader fixtures missing %s', (_name, before, after) => {
    const contents = source(maestroLogic);
    expect(contents).toContain(before);
    expect(() => assertGuardedMaestroClose(contents.replaceAll(before, after))).toThrow();
  });
  it.each(clients)('%s remains syntactically valid TypeScript/TSX', (fileName) => {
    const result = ts.transpileModule(source(fileName), {
      fileName,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
      },
    });
    expect(
      result.diagnostics?.filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      ),
    ).toEqual([]);
  });
});
