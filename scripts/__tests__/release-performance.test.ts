// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, symlinkSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Subprocess and cold-import work exceeds the 5 s default on a loaded machine.
vi.setConfig({ testTimeout: 30_000 });

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mb-release-perf-'));
  roots.push(root);
  mkdirSync(join(root, 'apps/web/src'), { recursive: true });
  mkdirSync(join(root, 'packages'), { recursive: true });
  writeFileSync(join(root, 'apps/web/src/index.ts'), 'export {};');
  writeFileSync(
    join(root, 'apps/web/tsconfig.json'),
    JSON.stringify({
      compilerOptions: { moduleResolution: 'bundler', paths: { '@/*': ['./src/*'] } },
    }),
  );
  return root;
}
function check(root: string, fn: string) {
  return spawnSync(
    'bash',
    [
      '-c',
      'set -euo pipefail; source "$1"; if "$2"; then :; fi; exit "$FAILED"',
      'release-performance-test',
      join(repository, 'scripts/perf-checks/bundle.sh'),
      fn,
    ],
    { cwd: root, encoding: 'utf8', timeout: 20_000 },
  );
}
function orchestrate(root: string, chunks = true) {
  mkdirSync(join(root, 'scripts/perf-checks'), { recursive: true });
  for (const name of ['common', 'bundle', 'memory', 'database']) {
    const file = `scripts/perf-checks/${name}.sh`;
    copyFileSync(join(repository, file), join(root, file));
  }
  copyFileSync(join(repository, 'scripts/perf-check.sh'), join(root, 'scripts/perf-check.sh'));
  const lazyCheck = 'scripts/check-lazy-loading.ts';
  symlinkSync(join(repository, lazyCheck), join(root, lazyCheck));
  symlinkSync(join(repository, 'node_modules'), join(root, 'node_modules'), 'dir');
  mkdirSync(join(root, 'apps/web/public/maestri'), { recursive: true });
  writeFileSync(join(root, 'apps/web/public/maestri/avatar.webp'), 'fixture');
  if (chunks) {
    mkdirSync(join(root, 'apps/web/.next/static/chunks'), { recursive: true });
    writeFileSync(join(root, 'apps/web/.next/static/chunks/test.js'), ';');
  }
  return spawnSync('bash', [join(root, 'scripts/perf-check.sh')], {
    cwd: tmpdir(),
    encoding: 'utf8',
    timeout: 20000,
  });
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
describe('release performance checks use application paths', () => {
  it.each([1, 2, 5, 6])(
    'emits numeric performance subcriterion %s from the real orchestration',
    (criterion) => {
      const root = fixture();
      if (criterion === 1) {
        mkdirSync(join(root, 'apps/web/public/maestri'), { recursive: true });
        writeFileSync(join(root, 'apps/web/public/maestri/avatar.png'), 'fixture');
      }
      if (criterion === 2)
        writeFileSync(join(root, 'apps/web/src/index.ts'), 'new EventSource("/events");');
      if (criterion === 6) writeFileSync(join(root, 'apps/web/src/index.ts'), 'import "katex";');
      const result = orchestrate(root, criterion !== 5);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`__PERF_FAILURE__ criterion=${criterion} exit=1\n`);
    },
  );

  it('finds the actual app avatars', () => {
    const root = fixture();
    mkdirSync(join(root, 'apps/web/public/maestri'), { recursive: true });
    writeFileSync(join(root, 'apps/web/public/maestri/example.webp'), 'fixture');
    const result = check(root, 'check_images');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('All 1 avatars');
  });

  describe('release file-size inventory', () => {
    function sizeCheck(large: boolean, strict: boolean, missing = false) {
      const root = fixture();
      for (const dir of ['scripts', 'docs', 'apps/web/e2e']) {
        mkdirSync(join(root, dir), { recursive: true });
      }
      if (large) writeFileSync(join(root, 'apps/web/src/large.ts'), ';\n'.repeat(251));
      if (missing) rmSync(join(root, 'apps/web/src'), { recursive: true });
      return spawnSync(
        'bash',
        [join(repository, 'scripts/check-file-size.sh'), ...(strict ? ['--strict'] : [])],
        { cwd: root, encoding: 'utf8', timeout: 20_000 },
      );
    }
    it('counts real app files in strict mode', () => {
      const result = sizeCheck(true, true);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('apps/web/src/large.ts (251 lines)');
    });
    it('preserves warning-only behavior unless strict was requested', () => {
      const result = sizeCheck(true, false);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('apps/web/src/large.ts (251 lines)');
    });
    it('fails when required source directories cannot be inspected', () => {
      expect(sizeCheck(false, false, true).status).toBe(1);
    });
  });
  it('does not pass a missing image directory as zero valid avatars', () => {
    expect(check(fixture(), 'check_images').status).toBe(1);
  });
  it('rejects non-WebP app avatars', () => {
    const root = fixture();
    mkdirSync(join(root, 'apps/web/public/maestri'), { recursive: true });
    writeFileSync(join(root, 'apps/web/public/maestri/example.png'), 'fixture');
    expect(check(root, 'check_images').status).toBe(1);
  });
  it('does not pass missing build chunks', () => {
    expect(check(fixture(), 'check_bundle_size').status).toBe(1);
  });
  it('finds static heavy imports in packages with either quote style', () => {
    const root = fixture();
    writeFileSync(join(root, 'packages/static.ts'), 'import katex from "katex";');
    expect(check(root, 'check_lazy_loading').status).toBe(1);
  });
  it('accepts KaTeX stylesheet with the JavaScript runtime dynamically loaded', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'apps/web/src/index.ts'),
      'import "katex/dist/katex.min.css"; const load = () => import("katex");',
    );
    const result = orchestrate(root);
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Static KaTeX import');
  });
  it.each(['katex', 'katex/dist/katex.js'])(
    'still rejects static KaTeX runtime %s',
    (specifier) => {
      const root = fixture();
      writeFileSync(join(root, 'apps/web/src/index.ts'), `import "${specifier}";`);
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    },
  );
  it('accepts an inspected source tree without heavy imports', () => {
    expect(check(fixture(), 'check_lazy_loading').status).toBe(0);
  });
  it('reports a missing source root as failure, not no matches', () => {
    const root = fixture();
    rmSync(join(root, 'apps/web/src'), { recursive: true });
    expect(check(root, 'check_lazy_loading').status).toBe(1);
  });

  describe('Recharts runtime reachability', () => {
    function chartFixture(entry: string) {
      const root = fixture();
      writeFileSync(
        join(root, 'apps/web/src/chart.ts'),
        'import { BarChart } from "recharts"; export const Chart = BarChart;',
      );
      writeFileSync(
        join(root, 'apps/web/src/barrel.ts'),
        'export { Chart } from "./chart"; export const Other = 1;',
      );
      writeFileSync(join(root, 'apps/web/src/index.ts'), entry);
      return root;
    }
    it('does not require an unused named barrel export to be lazy', () => {
      const root = chartFixture('import { Other } from "./barrel"; console.log(Other);');
      const result = check(root, 'check_lazy_loading');
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('unreferenced');
    });
    it('rejects the same symbol when consumed statically through a barrel', () => {
      expect(
        check(
          chartFixture('import { Chart } from "./barrel"; console.log(Chart);'),
          'check_lazy_loading',
        ).status,
      ).toBe(1);
    });
    it('accepts a real dynamic boundary using the configured app alias', () => {
      expect(
        check(chartFixture('const load = () => import("@/barrel");'), 'check_lazy_loading').status,
      ).toBe(0);
    });
    it('rejects mixed eager and dynamic imports of the same component', () => {
      const root = chartFixture(
        'import { Chart } from "./chart"; console.log(Chart); const load = () => import("./chart");',
      );
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    });
    it('does not use an unrelated same-basename dynamic import as evidence', () => {
      const root = chartFixture(
        'import { Chart } from "./chart"; console.log(Chart); const load = () => import("./other/chart");',
      );
      mkdirSync(join(root, 'apps/web/src/other'));
      writeFileSync(join(root, 'apps/web/src/other/chart.ts'), 'export const Other = 1;');
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    });
    it('ignores type-only heavy imports', () => {
      const root = chartFixture(
        'import type { Chart } from "./chart"; export type T = typeof Chart;',
      );
      writeFileSync(join(root, 'packages/types.ts'), 'import type { KatexOptions } from "katex";');
      expect(check(root, 'check_lazy_loading').status).toBe(0);
    });
    it('fails closed when a live local import cannot be resolved', () => {
      const root = chartFixture('import { Missing } from "@/missing"; console.log(Missing);');
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    });
    it.each([
      'export { Chart as Display } from "./chart"; export const Other = 1;',
      'import { Chart } from "./chart"; export { Chart as Display }; export const Other = 1;',
      'export * from "./chart"; export const Other = 1;',
    ])('tracks selected symbols through re-exports: %s', (barrel) => {
      const root = chartFixture('import { Other } from "./barrel"; console.log(Other);');
      writeFileSync(join(root, 'apps/web/src/barrel.ts'), barrel);
      expect(check(root, 'check_lazy_loading').status).toBe(0);
      const name = barrel.includes('Display') ? 'Display' : 'Chart';
      writeFileSync(
        join(root, 'apps/web/src/index.ts'),
        `import { ${name} } from "./barrel"; console.log(${name});`,
      );
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    });
    it('rejects eager star re-exports of the heavy library itself', () => {
      const root = chartFixture('import { BarChart } from "./barrel"; console.log(BarChart);');
      writeFileSync(join(root, 'apps/web/src/barrel.ts'), 'export * from "recharts";');
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    });
    it('fails when a configured workspace runtime module is unresolved', () => {
      const root = chartFixture('import { Chart } from "@fixture/charts"; console.log(Chart);');
      mkdirSync(join(root, 'packages/charts'));
      writeFileSync(join(root, 'packages/charts/package.json'), '{"name":"@fixture/charts"}');
      expect(check(root, 'check_lazy_loading').status).toBe(1);
    });
  });
});
