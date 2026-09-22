// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Every case here spawns real shell scripts; the 5s default is not a realistic
// budget for subprocess work and turns machine load into spurious failures.
vi.setConfig({ testTimeout: 30_000 });

const root = resolve(import.meta.dirname, '../..');
const fixtures: string[] = [];
function put(rootPath: string, file: string, content: string) {
  const path = join(rootPath, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
function fixture(script: string) {
  const path = mkdtempSync(join(tmpdir(), 'release-docs-'));
  fixtures.push(path);
  mkdirSync(join(path, 'scripts'));
  copyFileSync(join(root, 'scripts', script), join(path, 'scripts', script));
  return path;
}
function run(path: string, script: string) {
  const result = spawnSync('bash', [join(path, 'scripts', script)], {
    cwd: path,
    encoding: 'utf8',
    timeout: 15_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}
afterEach(() =>
  fixtures.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);

function architecture() {
  const path = fixture('check-architecture-diagrams.sh');
  put(path, 'VERSION', '1.2.3\n');
  put(path, 'docs/adr/0001-storage.md', '# ADR 0001: Storage\n');
  let document = '**Version**: 1.2.3\n';
  for (let i = 1; i <= 29; i++) {
    document += `## ${i}. ${i === 19 ? 'Compliance' : 'Architecture'}\n`;
    if (i === 19) {
      for (let j = 1; j <= 21; j++) {
        document += `### 19.${j} Requirement\n\`\`\`mermaid\ngraph LR\nA --> B\n\`\`\`\n`;
      }
    } else {
      document += '```mermaid\ngraph LR\nA --> B\n```\n';
    }
  }
  put(path, 'ARCHITECTURE-DIAGRAMS.md', document + 'ADR 0001: Storage\n_Version: 1.2.3_\n');
  return path;
}

function docCode(quote = "'") {
  const path = fixture('doc-code-audit.sh');
  put(
    path,
    'README.md',
    `## Trial Mode
| Chat messages | 10 | Conversations with Maestri |
| Voice time | 5 minutes |
| Tool calls | 10 |
| Documents | 1 |
No per-Maestro cap (ADR 0168).
---
| \`healthy\` | OK |
| \`degraded\` | Warning |
| \`unhealthy\` | Failed |
`,
  );
  put(
    path,
    'apps/web/src/lib/tier/tier-fallbacks.ts',
    `if (code === TierCode.TRIAL) {
return {
chatLimitDaily: 10,
voiceMinutesDaily: 5,
toolsLimitDaily: 10,
docsLimitTotal: 1,
};
}`,
  );
  put(
    path,
    'apps/web/src/lib/ai/providers/deployment-mapping.ts',
    `// Global aliases only: voice routes do not select a model by user tier (ADR 0169).
  'gpt-realtime': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-realtime',
  'gpt-realtime-1.5': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 || 'gpt-realtime-1.5',
`,
  );
  put(
    path,
    'apps/web/src/app/api/health/route.ts',
    ['healthy', 'degraded', 'unhealthy'].map((status) => `${quote}${status}${quote}`).join('\n'),
  );
  put(
    path,
    'apps/web/vercel.json',
    '{ "path": "/api/cron/metrics-push",\n"schedule": "*/5 * * * *"\n}',
  );
  put(path, 'docs/operations/CRON-JOBS.md', 'Metrics push: 5 minutes\n');
  return path;
}

describe('native documentation/code audit', () => {
  it.each(["'", '"'])('accepts current monorepo paths and %s status literals', (quote) => {
    const result = run(docCode(quote), 'doc-code-audit.sh');
    expect(result.output).toContain('No per-tier voice model configuration');
    expect(result.output).toContain('Global voice deployment configuration present');
    expect(result.status).toBe(0);
  });
  it.each(['chatLimitDaily', 'voiceMinutesDaily', 'toolsLimitDaily', 'docsLimitTotal'])(
    'rejects a real %s mismatch',
    (field) => {
      const path = docCode();
      const file = join(path, 'apps/web/src/lib/tier/tier-fallbacks.ts');
      writeFileSync(
        file,
        readFileSync(file, 'utf8').replace(new RegExp(`${field}: \\d+`), `${field}: 99`),
      );
      const result = run(path, 'doc-code-audit.sh');
      expect(result.output).toMatch(/FAIL.*mismatch/);
      expect(result.status).toBe(1);
    },
  );
  it('rejects the removed Maestro cap instead of silently accepting it', () => {
    const path = docCode();
    const file = join(path, 'README.md');
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace('No per-Maestro cap (ADR 0168).', '| Maestri | 3 |'),
    );
    expect(run(path, 'doc-code-audit.sh').status).toBe(1);
  });
  it('does not count unhealthy as healthy', () => {
    const path = docCode();
    put(path, 'apps/web/src/app/api/health/route.ts', "'unhealthy'\n'degraded'\n");
    expect(run(path, 'doc-code-audit.sh').status).toBe(1);
  });
  it('rejects a restored per-tier realtimeModel', () => {
    const path = docCode();
    const file = join(path, 'apps/web/src/lib/tier/tier-fallbacks.ts');
    const content = readFileSync(file, 'utf8') + "\nrealtimeModel: 'gpt-realtime-mini',\n";
    writeFileSync(file, content);
    const result = run(path, 'doc-code-audit.sh');
    expect(result.output).toContain('per-tier voice model configuration');
    expect(result.status).toBe(1);
  });
  it.each([
    'export const DEPLOYMENTS = {};\n',
    "// 'gpt-realtime': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT,\n",
    "/*\n'gpt-realtime': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT,\n*/\n",
  ])('rejects missing or commented-out global voice configuration: %s', (configuration) => {
    const path = docCode();
    put(path, 'apps/web/src/lib/ai/providers/deployment-mapping.ts', configuration);
    const result = run(path, 'doc-code-audit.sh');
    expect(result.output).toContain('global voice deployment configuration');
    expect(result.status).toBe(1);
  });
  it('still rejects a deprecated voice model name', () => {
    const path = docCode();
    put(
      path,
      'apps/web/src/lib/tier/tier-fallbacks.ts',
      "realtimeModel: 'gpt-4o-realtime-preview',\n",
    );
    const result = run(path, 'doc-code-audit.sh');
    expect(result.output).toContain('deprecated voice model');
    expect(result.status).toBe(1);
  });
  it('fails if a required input is a directory', () => {
    const path = docCode();
    rmSync(join(path, 'apps/web/src/lib/tier/tier-fallbacks.ts'));
    mkdirSync(join(path, 'apps/web/src/lib/tier/tier-fallbacks.ts'));
    expect(run(path, 'doc-code-audit.sh').status).toBe(1);
  });
});

describe('native architecture audit', () => {
  it('accepts consistent current metadata without changing documentation', () => {
    const path = architecture();
    const before = readFileSync(join(path, 'ARCHITECTURE-DIAGRAMS.md'), 'utf8');
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(0);
    expect(readFileSync(join(path, 'ARCHITECTURE-DIAGRAMS.md'), 'utf8')).toBe(before);
  });
  it('rejects mutually matching stale versions', () => {
    const path = architecture();
    put(path, 'VERSION', '1.2.4\n');
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(1);
  });
  it('rejects missing release metadata', () => {
    const path = architecture();
    rmSync(join(path, 'VERSION'));
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(1);
  });
  it('does not count incidental numbers as ADR references', () => {
    const path = architecture();
    const file = join(path, 'ARCHITECTURE-DIAGRAMS.md');
    writeFileSync(file, readFileSync(file, 'utf8').replace('ADR 0001: Storage', 'counter=90001'));
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(1);
  });
  it('requires sections added since the original 25-section document', () => {
    const path = architecture();
    const file = join(path, 'ARCHITECTURE-DIAGRAMS.md');
    writeFileSync(file, readFileSync(file, 'utf8').replace('## 29. Architecture', '## Removed'));
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(1);
  });
  it('rejects an empty ADR directory', () => {
    const path = architecture();
    rmSync(join(path, 'docs/adr/0001-storage.md'));
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(1);
  });
  it('blocks duplicate ADR numbers rather than merging their coverage', () => {
    const path = architecture();
    put(path, 'docs/adr/0001-other.md', '# ADR 0001: Another decision\n');
    const result = run(path, 'check-architecture-diagrams.sh');
    expect(result.status).toBe(1);
    expect(result.output).toContain('Duplicate ADR number 0001');
  });
  it('does not echo invalid version-file contents', () => {
    const path = architecture();
    put(path, 'VERSION', 'SYNTHETIC_PRIVATE_CANARY');
    const result = run(path, 'check-architecture-diagrams.sh');
    expect(result.status).toBe(1);
    expect(result.output).not.toContain('SYNTHETIC_PRIVATE_CANARY');
  });
  it('rejects a missing Mermaid closing fence even with unrelated fences present', () => {
    const path = architecture();
    const file = join(path, 'ARCHITECTURE-DIAGRAMS.md');
    writeFileSync(file, readFileSync(file, 'utf8') + '```mermaid\ngraph LR\nA --> B\n');
    expect(run(path, 'check-architecture-diagrams.sh').status).toBe(1);
  });
  it('keeps the legacy sync command read-only and refuses to invent ADR coverage', () => {
    const path = architecture();
    copyFileSync(
      join(root, 'scripts/sync-architecture-diagrams.sh'),
      join(path, 'scripts/sync-architecture-diagrams.sh'),
    );
    put(path, 'docs/adr/0002-auth.md', '# ADR 0002: Auth\n');
    const before = readFileSync(join(path, 'ARCHITECTURE-DIAGRAMS.md'), 'utf8');
    expect(run(path, 'sync-architecture-diagrams.sh').status).toBe(1);
    expect(readFileSync(join(path, 'ARCHITECTURE-DIAGRAMS.md'), 'utf8')).toBe(before);
  });
});
