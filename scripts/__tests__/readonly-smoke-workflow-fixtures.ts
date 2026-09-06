import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';

const stepSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  run: z.string().optional(),
  uses: z.string().optional(),
  if: z.string().optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  with: z.record(z.string(), z.unknown()).optional(),
  'timeout-minutes': z.number().optional(),
});

const jobSchema = z.object({
  needs: z.array(z.string()),
  if: z.string(),
  'timeout-minutes': z.number(),
  env: z.record(z.string(), z.unknown()).optional(),
  outputs: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(stepSchema),
});

export function readSmokeWorkflow() {
  const workflow = z
    .object({ jobs: z.record(z.string(), z.unknown()) })
    .parse(YAML.parse(readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8')));
  return {
    execution: jobSchema.parse(workflow.jobs['sync-admin-credentials']),
    status: jobSchema.parse(workflow.jobs['post-deploy-smoke']),
  };
}

export function smokeStep(id: string) {
  const step = readSmokeWorkflow().execution.steps.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`Missing readonly smoke step: ${id}`);
  return step;
}

export function readRootScripts() {
  return z
    .object({ scripts: z.record(z.string(), z.string()) })
    .parse(JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))).scripts;
}
