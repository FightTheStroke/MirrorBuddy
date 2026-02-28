import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('Legacy pattern audit (T4-02)', () => {
  it('removes plain-email fallback in auth/login query path', () => {
    const source = readSource('src/app/api/auth/login/route.ts');
    expect(source).not.toContain('{ email: identifier }');
  });

  it('removes plain-email fallback in direct invite duplicate lookup', () => {
    const source = readSource('src/app/api/invites/direct/route.ts');
    expect(source).not.toContain(
      '{ email }, // eslint-disable-line local-rules/require-email-hash-lookup',
    );
    expect(source).not.toContain('{ googleAccount: { email } }');
  });

  it('removes legacy quiz question fallback mapping', () => {
    const source = readSource('src/components/tools/quiz-tool.tsx');
    expect(source).not.toContain('const legacy = q as Partial');
    expect(source).not.toContain('legacy.question');
    expect(source).not.toContain('legacy.correctIndex');
  });

  it('migrates pendingToolRequest away from sessionStorage', () => {
    const source = readSource('src/components/maestros/use-maestro-session-logic.ts');
    expect(source).not.toContain("sessionStorage.getItem('pendingToolRequest')");
    expect(source).not.toContain("sessionStorage.removeItem('pendingToolRequest')");
  });

  it('documents intentional compatibility shims in tool executor', () => {
    const source = readSource('src/lib/tools/tool-executor.ts');
    const shimMarkers = source.match(/Intentional compatibility shim/g) ?? [];
    expect(shimMarkers.length).toBeGreaterThanOrEqual(7);
  });

  it('removes legacy wording from plugin factory migration helper', () => {
    const source = readSource('src/lib/tools/tool-executor-plugin-factory.ts');
    expect(source).not.toContain('legacy');
    expect(source).not.toContain('Map-based handlers');
  });
});
