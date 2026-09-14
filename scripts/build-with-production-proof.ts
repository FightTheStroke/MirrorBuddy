import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProductionEnvironment } from './check-production-env';
import {
  buildSourceIdentity,
  nextBuildIdFile,
  proofFile,
  verifyBuildProof,
} from './lib/production-build-proof.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

try {
  // A cached receipt or BUILD_ID must never survive a failed/skipped invocation.
  rmSync(join(root, proofFile), { force: true });
  rmSync(join(root, nextBuildIdFile), { force: true });
  try {
    console.log(checkProductionEnvironment(['build'], process.env));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Environment validation failed');
    throw new Error('Environment validation failed');
  }
  const production = (process.env.VERCEL_TARGET_ENV ?? process.env.VERCEL_ENV) === 'production';
  const identity = buildSourceIdentity(root);
  const binding = {
    sourceCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? '',
    projectId: process.env.VERCEL_PROJECT_ID ?? '',
    ...identity,
  };
  if (
    production &&
    (process.env.VERCEL !== '1' ||
      !/^[a-f0-9]{40}$/.test(binding.sourceCommit) ||
      !/^dpl_[A-Za-z0-9_]+$/.test(binding.deploymentId) ||
      !/^prj_[A-Za-z0-9_]+$/.test(binding.projectId))
  )
    throw new Error('Missing production build runtime identity');

  const build = spawnSync('npm', ['run', 'vercel-build'], { cwd: root, stdio: 'inherit' });
  if (build.error || build.signal || build.status !== 0) {
    process.exitCode = build.status && build.status > 0 ? build.status : 1;
    throw new Error('Validated build process failed');
  }
  if (production) {
    const current = buildSourceIdentity(root);
    if (
      current.configHash !== identity.configHash ||
      current.validatorHash !== identity.validatorHash
    )
      throw new Error('Production build source changed during execution');
    const receipt = {
      schema: 1,
      target: 'production',
      valuesValidated: true,
      buildCompleted: true,
      ...binding,
      nextBuildId: readFileSync(join(root, nextBuildIdFile), 'utf8').trim(),
    };
    verifyBuildProof(receipt, binding);
    mkdirSync(dirname(join(root, proofFile)), { recursive: true });
    writeFileSync(join(root, proofFile), `${JSON.stringify(receipt)}\n`, { flag: 'wx' });
    console.log('Production build execution receipt created');
  }
} catch {
  // Captured errors may include private build paths or runtime data.
  console.error('Production build/value gate failed; no promotable execution proof');
  process.exitCode ||= 1;
}
