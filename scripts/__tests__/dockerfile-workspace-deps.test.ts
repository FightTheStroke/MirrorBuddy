// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dockerfile = readFileSync(join(repo, 'Dockerfile'), 'utf8');
const npmrc = readFileSync(join(repo, '.npmrc'), 'utf8');
const workflow = readFileSync(join(repo, '.github/workflows/ci.yml'), 'utf8');

const stage = (name: string) =>
  dockerfile.match(
    new RegExp(`^FROM .* AS ${name}$\\n[\\s\\S]*?(?=^FROM |$(?![\\s\\S]))`, 'm'),
  )?.[0] ?? '';

describe('Dockerfile workspace dependency resolution', () => {
  it('copies .npmrc into the deps stage so pnpm hoists workspace-only dependencies', () => {
    const deps = stage('deps');
    expect(deps).not.toBe('');
    const install = deps.match(/^COPY .*pnpm-lock\.yaml.*$/m)?.[0] ?? '';
    expect(install).toContain('.npmrc');
  });

  it('keeps the hoisted linker that the builder stage relies on', () => {
    expect(npmrc).toMatch(/^node-linker=hoisted$/m);
  });

  it('copies only the root node_modules into the builder, which requires hoisting', () => {
    const builder = stage('builder');
    expect(builder).toContain('COPY --from=deps /app/node_modules ./node_modules');
  });
});

describe('deployment gate', () => {
  it('does not depend on a docker job, since nothing consumes the image', () => {
    expect(workflow).not.toMatch(/^ {2}docker:$/m);
    expect(workflow).not.toContain('needs.docker.result');
  });
});
