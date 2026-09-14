import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const productionBuildCommand = 'tsx ../../scripts/build-with-production-proof.ts';
export const proofRoute = '/production-build-proof.js';
export const proofFile = `apps/web/public${proofRoute}`;
export const nextBuildIdFile = 'apps/web/.next/BUILD_ID';
export const proofSources = [
  'vercel.json',
  'package.json',
  'pnpm-lock.yaml',
  'apps/web/package.json',
  'apps/web/next.config.ts',
  'apps/web/next.config.mobile.ts',
  'scripts/check-production-env.ts',
  'scripts/lib/production-env-policy.ts',
  'scripts/build-with-production-proof.ts',
  'scripts/lib/production-build-proof.mjs',
];

/** @param {unknown} input */
export function assertBuildConfiguration(input) {
  const config = input && typeof input === 'object' ? input : {};
  if (
    !('buildCommand' in config) ||
    config.buildCommand !== productionBuildCommand ||
    !('ignoreCommand' in config) ||
    config.ignoreCommand !== null ||
    !('git' in config) ||
    !config.git ||
    typeof config.git !== 'object' ||
    !('deploymentEnabled' in config.git) ||
    config.git.deploymentEnabled !== false ||
    ['builds', 'framework', 'outputDirectory'].some((key) => key in config)
  )
    throw new Error('Unqualified production build or skip-build configuration');
}

/** @param {string} root */
export function buildSourceIdentity(root) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Root is the source checkout, never runtime metadata.
  assertBuildConfiguration(JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')));
  /** @param {string[]} paths */
  const digest = (paths) => {
    const hash = createHash('sha256');
    for (const path of paths) {
      hash.update(`${path}\0`);
      hash.update(
        createHash('sha256')
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- Paths come exclusively from the fixed proofSources allowlist.
          .update(readFileSync(join(root, path)))
          .digest(),
      );
    }
    return hash.digest('hex');
  };
  return {
    configHash: digest(proofSources.slice(0, 6)),
    validatorHash: digest(proofSources.slice(6)),
  };
}

/**
 * Strict projection: receipt content contains no environment names or values.
 * @param {unknown} input
 * @param {{sourceCommit: string, deploymentId: string, projectId: string,
 * configHash: string, validatorHash: string}} expected
 */
export function verifyBuildProof(input, expected) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !expected)
    throw new Error('Missing production build execution proof');
  const proof = /** @type {Record<string, unknown>} */ (input);
  const required = {
    schema: 1,
    target: 'production',
    valuesValidated: true,
    buildCompleted: true,
    ...expected,
  };
  if (
    Object.keys(proof).length !== Object.keys(required).length + 1 ||
    Object.entries(required).some(([key, value]) => proof[key] !== value) ||
    typeof proof.nextBuildId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(proof.nextBuildId)
  )
    throw new Error('Production build execution proof does not match the source deployment');
}

/** @param {string} response @param {Parameters<typeof verifyBuildProof>[1]} expected */
export function verifyBuildProofResponse(response, expected) {
  if (typeof response !== 'string' || response.length > 4096 || !response.endsWith('\n200'))
    throw new Error('Production build proof HTTP response is not successful');
  let proof;
  try {
    proof = JSON.parse(response.slice(0, -4));
  } catch {
    throw new Error('Invalid production build proof response');
  }
  verifyBuildProof(proof, expected);
}
