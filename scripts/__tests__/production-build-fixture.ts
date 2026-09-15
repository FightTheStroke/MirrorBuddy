import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { proofSources, proofFile, productionConfigFile } from '../lib/production-build-proof.mjs';
import { criticalProductionEnv } from '../lib/production-env-policy';

export const root = resolve(import.meta.dirname, '../..');
export const sourceCommit = 'a'.repeat(40);
export const productionValues = () => ({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_TARGET_ENV: 'production',
  VERCEL_GIT_COMMIT_SHA: sourceCommit,
  VERCEL_DEPLOYMENT_ID: 'dpl_synthetic',
  VERCEL_PROJECT_ID: 'prj_synthetic',
  ...Object.fromEntries(criticalProductionEnv.map(({ name }) => [name, 'synthetic-value'])),
});

export function buildFixture() {
  const directory = join(root, '.safe-prepush-runtime', `proof-${randomUUID()}`);
  mkdirSync(directory, { recursive: true });
  for (const file of [...proofSources, 'scripts/deploy-validated-production.mjs']) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    copyFileSync(join(root, file), join(directory, file));
  }
  symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
  const bin = join(directory, 'bin');
  mkdirSync(bin);
  const env = {
    PATH: `${bin}:${dirname(process.execPath)}:${process.env.PATH ?? '/usr/bin:/bin'}`,
    TMPDIR: directory,
    DOTENV_CONFIG_PATH: '/dev/null',
  };
  const executable = (name: string, code: string) => {
    const path = join(bin, name);
    writeFileSync(path, `#!${process.execPath}\n${code}`);
    chmodSync(path, 0o755);
  };
  const invoke = (values: NodeJS.ProcessEnv) => {
    const { buildCommand } = JSON.parse(
      readFileSync(join(directory, productionConfigFile), 'utf8'),
    );
    return spawnSync(
      '/bin/bash',
      [
        '-e',
        '-o',
        'pipefail',
        '-c',
        `tsx() { "${process.execPath}" --import tsx "$@"; }\n${buildCommand}`,
      ],
      {
        // Vercel executes buildCommand from the configured apps/web project root,
        // not from the repository root. Keep the process test faithful to that
        // boundary so path regressions fail before a production deployment.
        cwd: join(directory, 'apps/web'),
        env: { ...env, ...values, PATH: env.PATH },
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
  };
  return {
    directory,
    env,
    executable,
    invoke,
    clean: () => rmSync(directory, { recursive: true, force: true }),
    receipt: () => JSON.parse(readFileSync(join(directory, proofFile), 'utf8')),
    build: (values: NodeJS.ProcessEnv, status = 0, createBuildId = true) => {
      executable(
        'npm',
        `
const fs = require('node:fs');
if (JSON.stringify(process.argv.slice(2)) !== '["run","vercel-build"]') process.exit(99);
console.log('BUILD_REQUESTED');
${createBuildId ? "fs.mkdirSync('apps/web/.next', {recursive: true}); fs.writeFileSync('apps/web/.next/BUILD_ID', 'synthetic-next-build');" : ''}
process.exit(${status});
`,
      );
      return invoke(values);
    },
  };
}
