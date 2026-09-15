import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  validateProductionMetadata,
  validateProductionValues,
  validateSentryMetadata,
} from './lib/production-env-policy';

export function checkProductionEnvironment(args: string[], env: unknown): string {
  if (args?.length === 1 && args[0] === 'build') {
    const values = env && typeof env === 'object' ? (env as Record<string, unknown>) : {};
    const target = values.VERCEL_TARGET_ENV ?? values.VERCEL_ENV;
    if (
      typeof target !== 'string' ||
      (values.VERCEL_ENV !== undefined && values.VERCEL_ENV !== target)
    )
      throw new Error('Missing or inconsistent deployment target');
    const failures = validateProductionValues(env, target);
    if (failures.length) throw new Error(failures.join('\n'));
    return `${target} environment values verified (target policy and newline integrity).`;
  }
  if (args?.length === 1 && args[0] === 'values') {
    const failures = validateProductionValues(env);
    if (failures.length) throw new Error(failures.join('\n'));
    return 'Production environment values verified (presence and newline integrity).';
  }
  if (
    args?.length !== 2 ||
    !['metadata', 'sentry-metadata', 'release-metadata'].includes(args[0]) ||
    !args[1]?.trim()
  ) {
    throw new Error(
      'Usage: check-production-env.ts metadata|sentry-metadata|release-metadata <linked-directory> | values | build',
    );
  }
  const values = env && typeof env === 'object' ? (env as Record<string, unknown>) : {};
  const token = values.VERCEL_TOKEN;
  if (token !== undefined && (typeof token !== 'string' || /[\r\n]/.test(token))) {
    throw new Error('Invalid Vercel CLI credential');
  }
  const cliArgs = ['env', 'ls', 'production', '--format=json', '--cwd', args[1]];
  if (typeof token === 'string' && token.trim()) cliArgs.push('--token', token);
  let output: string;
  try {
    // env ls does not request decryption; never print its payload.
    output = execFileSync('vercel', cliArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });
  } catch {
    throw new Error('Unable to retrieve production environment metadata');
  }
  let metadata: unknown;
  try {
    metadata = JSON.parse(output);
  } catch {
    throw new Error('Invalid production environment metadata');
  }
  if (args[0] === 'sentry-metadata' || args[0] === 'release-metadata') {
    validateSentryMetadata(metadata);
    if (args[0] === 'release-metadata') {
      validateProductionMetadata(metadata);
      return 'Production and Sentry environment names verified; values are checked only in the deployment runtime.';
    }
    return 'Sentry environment names verified; values are checked only in the deployment runtime.';
  }
  validateProductionMetadata(metadata);
  return 'Production environment names verified; values are checked only in the deployment runtime.';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(checkProductionEnvironment(process.argv.slice(2), process.env));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Production environment validation failed',
    );
    process.exitCode = 1;
  }
}
