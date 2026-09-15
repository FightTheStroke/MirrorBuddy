/* eslint-disable security/detect-non-literal-fs-filename -- Only canonical source paths and private fixed-name artifacts are accessed. */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  browserInventory,
  canonicalScope,
  context,
  declaredUnitInventory,
  equalScope,
  positive,
  privateArtifact,
  readArtifact,
  requireScope,
  sourcePath,
  unitInventory,
} from './release-evidence-scope-policy.mjs';

const commands = {
  unit: ['node_modules/vitest/vitest.mjs', 'list', '--root', 'apps/web', '--allowOnly=false'],
  e2e: [
    'node_modules/@playwright/test/cli.js',
    'test',
    '--config=apps/web/playwright.config.ts',
    '--list',
    '--reporter=json',
    '--forbid-only',
  ],
};
const browserEnvironment = { E2E_TESTS: '1' };
const profile = (kind) => ({
  policy: 'mirrorbuddy-declared-release-scope-v1',
  command: ['node', ...commands[kind], ...(kind === 'unit' ? ['--json=<private-output>'] : [])],
  ...(kind === 'unit'
    ? {
        filesCommand: ['node', ...commands.unit, '--filesOnly', '--json=<private-output>'],
        declarationsCommand: [
          'node',
          'scripts/lib/release-evidence-scope.mjs',
          '--collect-declarations',
          '<private-output>',
        ],
        declarationsProfile: {
          api: 'vitest/node.createVitest.collect',
          root: 'apps/web',
          watch: false,
          allowOnly: false,
        },
      }
    : {
        environment: { ...browserEnvironment },
        outputEnvironment: 'PLAYWRIGHT_JSON_OUTPUT_FILE=<private-output>',
      }),
});

function discover(kind, directory, root, filesOnly = false) {
  const name = filesOnly ? 'files.json' : 'inventory.json';
  const output = privateArtifact(directory, name, true);
  const args = [...commands[kind]];
  if (kind === 'unit') args.push(...(filesOnly ? ['--filesOnly'] : []), `--json=${output}`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      ...(kind === 'e2e' ? { ...browserEnvironment, PLAYWRIGHT_JSON_OUTPUT_FILE: output } : {}),
    },
    stdio: 'ignore',
    timeout: 300_000,
  });
  requireScope(result?.status === 0 && !result.error && !result.signal);
  // Native reporters inherit the caller's umask; discovery remains inside a 0700 directory.
  chmodSync(privateArtifact(directory, name), 0o600);
  return readArtifact(directory, name);
}

function declarations(directory, root) {
  const output = privateArtifact(directory, 'declarations.json', true);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--collect-declarations', output],
    {
      cwd: root,
      env: process.env,
      stdio: 'ignore',
      timeout: 300_000,
    },
  );
  requireScope(result?.status === 0 && !result.error && !result.signal);
  return readArtifact(directory, 'declarations.json');
}

/**
 * Synchronously capture the full native declaration inventory immediately before a real run.
 * Returns the scope written to <kind>.scope.json (0600); the caller must hash that artifact.
 * Unit discovery also reconciles canonical filesystem tests and coverage paths.
 */
export function captureExpectedScope(kind, directory, sourceRoot) {
  let temporary;
  try {
    const { root, dir } = context(kind, directory, sourceRoot);
    const output = privateArtifact(dir, `${kind}.scope.json`, true);
    temporary = mkdtempSync(join(dir, `.${kind}-scope-`));
    const inventory = discover(kind, temporary, root);
    let declared;
    if (kind === 'unit') {
      const canonical = canonicalScope(root);
      const eligible = unitInventory(
        root,
        inventory,
        discover(kind, temporary, root, true),
        canonical.files,
      );
      declared = {
        files: declaredUnitInventory(root, declarations(temporary, root), eligible),
        coverage: canonical.coverage,
      };
    } else declared = browserInventory(root, inventory);
    const scope = { version: 1, kind, sourceRoot: root, profile: profile(kind), ...declared };
    writeFileSync(output, `${JSON.stringify(scope)}\n`, { mode: 0o600 });
    return scope;
  } catch {
    throw new Error('Release scope capture failed');
  } finally {
    try {
      if (temporary) rmSync(temporary, { recursive: true, force: true });
    } catch {
      throw new Error('Release scope cleanup failed');
    }
  }
}

function validateUnitScope(scope, directory, root) {
  const canonical = canonicalScope(root);
  requireScope(Array.isArray(scope.files));
  equalScope(
    scope.files.map((item) => item?.file),
    canonical.files,
  );
  equalScope(scope.coverage, canonical.coverage);
  let total = 0;
  const files = scope.files.map((item) => {
    requireScope(Number.isSafeInteger(item.cases) && item.cases >= 0);
    total += item.cases;
    return { file: item.file, cases: item.cases };
  });
  requireScope(positive(total));
  const unit = readArtifact(directory, 'unit.json');
  requireScope(Array.isArray(unit?.testResults) && unit.numTotalTests === total);
  const actual = unit.testResults
    .map((suite) => {
      requireScope(typeof suite?.name === 'string' && isAbsolute(suite.name));
      requireScope(Array.isArray(suite.assertionResults));
      for (const assertion of suite.assertionResults) {
        requireScope(
          typeof assertion?.title === 'string' && Array.isArray(assertion.ancestorTitles),
        );
        requireScope(assertion.ancestorTitles.every((title) => typeof title === 'string'));
      }
      return { file: sourcePath(root, suite.name), cases: suite.assertionResults.length };
    })
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  equalScope(actual, files);
  const coverage = readArtifact(directory, 'coverage.json');
  requireScope(coverage && typeof coverage === 'object' && !Array.isArray(coverage));
  const paths = new Set(
    Object.entries(coverage).map(([file, data]) => {
      requireScope(isAbsolute(file) && typeof data?.path === 'string' && data.path === file);
      return sourcePath(root, file);
    }),
  );
  requireScope(canonical.coverage.every((file) => paths.has(file)));
  return { files, coverage: canonical.coverage };
}

/**
 * Read-only, subprocess-free comparison against unit.json + coverage.json or e2e.json.
 * Returns the validated scope; throws a payload-free error for invalid/missing evidence.
 * Execution outcomes and coverage percentages remain the native parser's responsibility.
 */
export function validateExpectedScope(kind, directory, sourceRoot) {
  try {
    const { root, dir } = context(kind, directory, sourceRoot);
    const scope = readArtifact(dir, `${kind}.scope.json`);
    requireScope(scope && scope.version === 1 && scope.kind === kind && scope.sourceRoot === root);
    equalScope(scope.profile, profile(kind));
    const declared =
      kind === 'unit'
        ? validateUnitScope(scope, dir, root)
        : browserInventory(root, readArtifact(dir, 'e2e.json'));
    equalScope(scope, { version: 1, kind, sourceRoot: root, profile: profile(kind), ...declared });
    return scope;
  } catch {
    throw new Error('Release scope validation failed');
  }
}

// CLI list omits skips; the public collection API counts every declaration without running it.
async function collectDeclarations(output) {
  let vitest;
  try {
    requireScope(typeof output === 'string');
    const { root, dir } = context('unit', dirname(output), process.cwd());
    requireScope(output === privateArtifact(dir, 'declarations.json', true));
    const require = createRequire(join(root, 'package.json'));
    const { createVitest } = await import(pathToFileURL(require.resolve('vitest/node')).href);
    vitest = await createVitest('test', {
      root: join(root, 'apps/web'),
      watch: false,
      allowOnly: false,
    });
    const { testModules, unhandledErrors } = await vitest.collect();
    requireScope(unhandledErrors.length === 0 && testModules.length > 0 && !process.exitCode);
    function checkErrors(suite) {
      requireScope(suite.errors().length === 0);
      for (const child of suite.children) {
        if (child.type === 'suite') checkErrors(child);
      }
    }
    const files = testModules.map((module) => {
      checkErrors(module);
      const tests = [...module.children.allTests()];
      return {
        file: module.moduleId,
        cases: tests.length,
        eligible: tests.filter((test) => test.result().state !== 'skipped').length,
      };
    });
    writeFileSync(output, JSON.stringify(files), { mode: 0o600, flag: 'wx' });
  } finally {
    if (vitest) await vitest.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    requireScope(process.argv.length === 4 && process.argv[2] === '--collect-declarations');
    await collectDeclarations(process.argv[3]);
  } catch {
    process.exitCode = 1;
  }
}
