// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = mkdtempSync(join(tmpdir(), 'mirrorbuddy-controls-'));
const main = join(fixture, 'main');
const feature = join(fixture, 'feature');

function fixtureEnv() {
  // Git hooks export repository-scoped variables that would override the fixture's cwd.
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
  );
}

function git(cwd: string, ...args: string[]) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: fixtureEnv(),
    timeout: 15000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function runHook(script: string, payload: object, cwd = root) {
  const env = fixtureEnv();
  delete env.MB_ALLOW_MAIN_WRITES;
  return spawnSync('bash', [join(root, script)], {
    cwd,
    env,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 15000,
  });
}

function patch(path: string) {
  return `*** Begin Patch\n*** Update File: ${path}\n@@\n-old\n+new\n*** End Patch\n`;
}

beforeAll(() => {
  for (const [path, branch] of [
    [main, 'main'],
    [feature, 'fix/test'],
  ]) {
    mkdirSync(join(path, 'src'), { recursive: true });
    git(path, 'init', '-q', '-b', branch);
    writeFileSync(join(path, 'src', 'example.ts'), 'export const value = 1;\n');
  }
});

afterAll(() => rmSync(fixture, { recursive: true, force: true }));

describe('project edit controls', { timeout: 20000 }, () => {
  it('isolates temporary repositories from an enclosing Git hook', () => {
    vi.stubEnv('GIT_DIR', join(feature, '.git'));
    vi.stubEnv('GIT_WORK_TREE', feature);
    try {
      expect(git(main, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
      const result = runHook('.claude/hooks/main-guard.sh', {
        tool_input: { path: join(main, 'src/example.ts') },
      });
      expect(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision).toBe('deny');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([true, false])('blocks main with raw patch input=%s', (raw) => {
    const path = join(main, 'src/example.ts');
    const result = runHook('.claude/hooks/main-guard.sh', {
      tool_input: raw ? patch(path) : { file_path: path },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('allows a feature target even when launched from main', () => {
    const result = runHook(
      '.claude/hooks/main-guard.sh',
      {
        tool_input: patch(join(feature, 'src/example.ts')),
      },
      main,
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('blocks a new directory on main', () => {
    const result = runHook('.claude/hooks/main-guard.sh', {
      tool_input: { path: join(main, 'src/new/nested/file.ts') },
    });
    expect(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it.each([false, true])(
    'denies multiple patch targets with structured output (Copilot=%s)',
    (copilot) => {
      const input = patch(join(feature, 'src/example.ts')).replace(
        '*** End Patch',
        `*** Update File: ${join(main, 'src/example.ts')}\n*** End Patch`,
      );
      const result = runHook(
        copilot ? '.copilot/hooks/check-worktree.sh' : '.claude/hooks/main-guard.sh',
        copilot ? { toolName: 'apply_patch', toolArgs: input } : { tool_input: input },
      );
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout);
      const decision = copilot ? output : output.hookSpecificOutput;
      expect(decision.permissionDecision).toBe('deny');
      expect(decision.permissionDecisionReason).toContain('could not validate');
    },
  );

  it('keeps every configured Copilot script available', () => {
    const config = JSON.parse(readFileSync(join(root, '.copilot/hooks.json'), 'utf8'));
    for (const hooks of Object.values(config.hooks) as { bash: string }[][]) {
      for (const hook of hooks) {
        const path = hook.bash.replace(/^bash /, '');
        expect(() => readFileSync(join(root, path))).not.toThrow();
      }
    }
  });

  it('emits a post-edit reminder for raw patches', () => {
    const result = runHook('.claude/hooks/post-edit-ts.sh', {
      tool_input: patch(join(feature, 'src/example.ts')),
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).hookSpecificOutput.additionalContext).toContain('ci:summary');
  });

  it('preserves the Copilot permission response on main', () => {
    const result = runHook('.copilot/hooks/check-worktree.sh', {
      toolName: 'apply_patch',
      toolArgs: patch(join(main, 'src/example.ts')),
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).permissionDecision).toBe('deny');
  });

  it('allows Copilot feature edits', () => {
    const result = runHook('.copilot/hooks/check-worktree.sh', {
      toolName: 'apply_patch',
      toolArgs: patch(join(feature, 'src/example.ts')),
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it.each([250, 251])('checks the exact line limit: %s', (lines) => {
    const path = join(feature, `src/lines-${lines}.ts`);
    writeFileSync(path, Array.from({ length: lines }, () => '// line').join('\n'));
    const result = runHook('.copilot/hooks/check-line-limit.sh', {
      toolName: 'apply_patch',
      toolArgs: patch(path),
    });
    expect(result.status).toBe(lines > 250 ? 1 : 0);
    if (lines > 250) expect(result.stderr).toContain('maximum 250');
  });
});
