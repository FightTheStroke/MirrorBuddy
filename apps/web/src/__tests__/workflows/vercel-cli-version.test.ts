import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const LAST_KNOWN_GOOD_VERCEL_CLI = '56.3.2';

interface WorkflowStep {
  name?: string;
  run?: string;
}

interface Workflow {
  env?: Record<string, string>;
  jobs: Record<string, { steps: WorkflowStep[] }>;
}

function readWorkflow(fileName: string): Workflow {
  return YAML.parse(
    readFileSync(join(process.cwd(), '.github/workflows', fileName), 'utf-8'),
  ) as Workflow;
}

function vercelInstallCommands(workflow: Workflow): string[] {
  return Object.values(workflow.jobs).flatMap((job) =>
    job.steps
      .filter((step) => step.name === 'Install Vercel CLI')
      .map((step) => step.run)
      .filter((command): command is string => command !== undefined),
  );
}

describe('Vercel CLI workflow version', () => {
  it.each(['ci.yml', 'promote-to-production.yml'])(
    'pins the validated CLI version in %s',
    (fileName) => {
      const workflow = readWorkflow(fileName);

      expect(workflow.env?.VERCEL_CLI_VERSION).toBe(LAST_KNOWN_GOOD_VERCEL_CLI);
      expect(vercelInstallCommands(workflow)).not.toHaveLength(0);
      expect(vercelInstallCommands(workflow)).toEqual(
        expect.arrayContaining(['npm install -g "vercel@${VERCEL_CLI_VERSION}"']),
      );
      expect(JSON.stringify(workflow)).not.toContain('vercel@latest');
    },
  );
});
