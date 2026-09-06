import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

const source = (file: string) => readFileSync(join(process.cwd(), 'apps/web/src', file), 'utf8');
const clients = [
  'app/layout.tsx',
  'components/providers.tsx',
  'app/[locale]/page.tsx',
  'app/[locale]/login/page.tsx',
  'app/[locale]/change-password/page.tsx',
  'app/change-password/change-password-client.tsx',
  'app/[locale]/reset-password/page.tsx',
  'app/[locale]/welcome/components/landing-page.tsx',
  'app/[locale]/welcome/hooks/use-existing-user-data.ts',
  'components/profile/genitori-view.tsx',
  'components/conversation/components/voice-call-panel.tsx',
  'components/conversation/components/voice-call-overlay.tsx',
  'components/voice/voice-session/handlers.ts',
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
