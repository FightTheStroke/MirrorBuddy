import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildSourceIdentity,
  productionConfigFile,
  proofRoute,
  verifyBuildProofResponse,
} from './lib/production-build-proof.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

/**
 * @param {string} command @param {string[]} args @param {number} timeout
 * @param {Record<string, string>} [extraEnv]
 */
function execute(command, args, timeout = 60_000, extraEnv) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
      ...(extraEnv ? { env: { ...process.env, ...extraEnv } } : {}),
    }).trim();
  } catch {
    // Neither credentials nor remote build output belong in error diagnostics.
    throw new Error(`${command} operation failed`);
  }
}

/** @param {string} output @returns {Record<string, unknown>} */
function object(output) {
  try {
    const result = JSON.parse(output);
    if (result && typeof result === 'object' && !Array.isArray(result)) return result;
  } catch {
    // Fail closed on non-JSON CLI output.
  }
  throw new Error('Invalid deployment metadata');
}

/** @param {unknown} value */
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/** @param {unknown} value */
function deploymentHost(value) {
  if (typeof value !== 'string') throw new Error('Missing deployment URL');
  const host = value.replace(/^https:\/\//, '');
  if (host.trim() !== host || !/^[a-z0-9-]+\.vercel\.app$/.test(host)) {
    throw new Error('Invalid deployment URL');
  }
  return host;
}

/** @param {unknown} input */
export async function deployValidatedProduction(input) {
  const env = record(input);
  /** @param {string} name @param {RegExp} pattern */
  const required = (name, pattern) => {
    const value = env[name];
    if (typeof value !== 'string' || value.trim() !== value || !pattern.test(value)) {
      throw new Error(`Invalid ${name}`);
    }
    return value;
  };
  const sha = required('GITHUB_SHA', /^[a-f0-9]{40}$/);
  const run = `${required('GITHUB_RUN_ID', /^\d+$/)}-${required('GITHUB_RUN_ATTEMPT', /^\d+$/)}`;
  const project = required('VERCEL_PROJECT_ID', /^prj_[A-Za-z0-9_]+$/);
  const org = required('VERCEL_ORG_ID', /^team_[A-Za-z0-9_]+$/);
  const token = required('VERCEL_TOKEN', /^\S+$/);
  required('VERCEL_CLI_VERSION', /^56\.3\.2$/);
  if (resolve(process.cwd()) !== resolve(root))
    throw new Error('Run from the source checkout root');
  if (
    execute('git', ['rev-parse', 'HEAD']) !== sha ||
    execute('git', ['status', '--porcelain', '--untracked-files=all'])
  ) {
    throw new Error('Production source is not the clean expected commit');
  }
  if (execute('git', ['ls-files', '--', 'vercel.json'])) {
    throw new Error('Tracked root vercel.json conflicts with the application configuration');
  }
  const identity = buildSourceIdentity(root);
  if (
    existsSync('apps/web/public/production-build-proof.js') ||
    existsSync('.vercel/output') ||
    existsSync('apps/web/.next')
  )
    throw new Error('Production upload contains prior build output');
  /** @param {string[]} args @param {number} [timeout] */
  const vercel = (args, timeout) => {
    // The `curl` subcommand forwards every argument it does not consume to curl
    // itself, so `--token` and `--scope` must reach it through the environment.
    if (args[0] === 'curl') {
      return execute('vercel', args, timeout, {
        VERCEL_TOKEN: token,
        VERCEL_ORG_ID: org,
        VERCEL_PROJECT_ID: project,
      });
    }
    const separator = args.includes('--') ? args.indexOf('--') : args.length;
    return execute(
      'vercel',
      [...args.slice(0, separator), '--token', token, '--scope', org, ...args.slice(separator)],
      timeout,
    );
  };
  if (vercel(['--version']) !== '56.3.2') throw new Error('Unqualified Vercel CLI version');

  // --force creates a fresh source build; --skip-domain withholds production aliases.
  // No prebuilt output, environment override, environment download or log retrieval.
  const deployment = object(
    vercel(
      [
        'deploy',
        '--prod',
        '--skip-domain',
        '--force',
        '--yes',
        '--format=json',
        '--local-config',
        productionConfigFile,
        // CLI source deployments do not inherit Git integration metadata. Pass
        // only the already-validated clean HEAD so the remote proof can bind
        // the build to this exact source; no credential or runtime value crosses.
        '--build-env',
        `VERCEL_GIT_COMMIT_SHA=${sha}`,
        '--meta',
        `verifiedSourceCommit=${sha}`,
        '--meta',
        `productionBuildRun=${run}`,
      ],
      1_200_000,
    ),
  );
  const id = deployment.id;
  const host = deploymentHost(deployment.url);
  if (
    typeof id !== 'string' ||
    !/^dpl_[A-Za-z0-9_]+$/.test(id) ||
    deployment.target !== 'production' ||
    deployment.readyState !== 'READY' ||
    deployment.error
  ) {
    throw new Error('Production source build is not ready');
  }
  // List is scoped to the same project and run, and exposes metadata, not env values.
  const listing = object(
    vercel(['list', project, '--prod', '--format=json', '--meta', `productionBuildRun=${run}`]),
  );
  const entries = listing.deployments;
  if (!Array.isArray(entries) || entries.length !== 1)
    throw new Error('Ambiguous source deployment');
  const candidate = record(entries[0]);
  const meta = record(candidate.meta);
  // List entries expose no deployment id; the auto-generated host is unique per
  // deployment, so host equality binds this entry to the build just created.
  if (
    deploymentHost(candidate.url) !== host ||
    candidate.target !== 'production' ||
    candidate.customEnvironment ||
    candidate.state !== 'READY' ||
    meta.verifiedSourceCommit !== sha ||
    meta.productionBuildRun !== run
  ) {
    throw new Error('Production deployment does not match the expected source build');
  }
  // READY and caller-supplied metadata are correlation, not proof of execution.
  // CLI authentication obtains the project's protection token without disabling protection.
  const response = vercel([
    'curl',
    proofRoute,
    '--deployment',
    id,
    '--yes',
    '--',
    '--silent',
    '--show-error',
    '--fail',
    '--no-location',
    '--max-redirs',
    '0',
    '--proto',
    '=https',
    '--max-time',
    '30',
    '--write-out',
    '\n%{http_code}',
  ]);
  verifyBuildProofResponse(response, {
    sourceCommit: sha,
    deploymentId: id,
    projectId: project,
    ...identity,
  });

  // A production-target promote aliases this ID; it does not rebuild preview output.
  vercel(['promote', id, '--timeout=0', '--yes']);
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      const aliases = ['mirrorbuddy.org', 'www.mirrorbuddy.org'].map((domain) =>
        object(vercel(['inspect', domain, '--format=json'])),
      );
      if (
        aliases.every(
          (alias) =>
            alias.id === id &&
            alias.target === 'production' &&
            alias.readyState === 'READY' &&
            deploymentHost(alias.url) === host,
        )
      ) {
        const health = await fetch('https://www.mirrorbuddy.org/api/health', {
          signal: AbortSignal.timeout(10_000),
          redirect: 'error',
        });
        if (health.status === 200) {
          console.log(`Production source ${sha} verified live as ${id}`);
          return;
        }
      }
    } catch {
      // Alias propagation and health failures remain failures until positively verified.
    }
    if (attempt < 44) await setTimeout(20_000);
  }
  throw new Error('Production aliases did not resolve to the validated healthy deployment');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  deployValidatedProduction(process.env).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Production deployment failed');
    process.exitCode = 1;
  });
}
