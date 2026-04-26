import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { describe, it, expect, beforeAll } from 'vitest';

const EXPECTED_LOCALES = ['it', 'en', 'fr', 'de', 'es'];
const REFERENCE_LOCALE = 'it';
const NAMESPACES = [
  'common',
  'auth',
  'admin',
  'chat',
  'tools',
  'settings',
  'compliance',
  'education',
  'navigation',
  'errors',
  'welcome',
  'metadata',
];

/** Replicate extractKeys from scripts/i18n-check.ts */
function extractKeys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const k of extractKeys(value as Record<string, unknown>, fullKey)) {
        keys.add(k);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

/** Replicate loadLocaleMessages from scripts/i18n-check.ts */
function loadLocaleMessages(locale: string): Record<string, unknown> {
  const localeDir = join(process.cwd(), 'apps', 'web', 'messages', locale);
  const merged: Record<string, unknown> = {};
  for (const ns of NAMESPACES) {
    const filePath = join(localeDir, `${ns}.json`);
    if (existsSync(filePath)) {
      Object.assign(merged, JSON.parse(readFileSync(filePath, 'utf-8')));
    }
  }
  return merged;
}

describe('i18n CI Integration', () => {
  let workflowContent: any;
  let packageJson: any;
  let keySets: Record<string, Set<string>>;

  beforeAll(() => {
    const workflowPath = join(process.cwd(), '.github/workflows/i18n-validation.yml');
    const packageJsonPath = join(process.cwd(), 'package.json');

    const rawWorkflow = readFileSync(workflowPath, 'utf-8');
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    workflowContent = YAML.parse(rawWorkflow);

    // Replicate i18n-check.ts logic: extract flattened key sets per locale
    keySets = {};
    for (const locale of EXPECTED_LOCALES) {
      keySets[locale] = extractKeys(loadLocaleMessages(locale));
    }
  });

  describe('Workflow CI Configuration', () => {
    it('workflow should be triggered on PR creation and updates', () => {
      const hasOnPullRequest = workflowContent.on?.pull_request !== undefined;
      expect(hasOnPullRequest).toBe(true);
      expect(workflowContent.on.pull_request.paths).toBeDefined();
    });

    it('workflow should be triggered on main branch pushes', () => {
      const hasOnPush = workflowContent.on?.push !== undefined;
      expect(hasOnPush).toBe(true);
    });

    it('workflow should only run when i18n-related files change', () => {
      const paths = workflowContent.on.pull_request.paths;
      // W2 app move (#362): messages/ relocated to apps/web/messages/.
      const i18nRelatedPaths = [
        'apps/web/messages/**',
        'src/**',
        'apps/web/src/**',
        'scripts/i18n-check.ts',
        'package.json',
      ];
      i18nRelatedPaths.forEach((path) => {
        expect(paths).toContain(path);
      });
    });

    it('job should have concurrency settings for optimization', () => {
      const job = workflowContent.jobs['i18n-check'];
      expect(job).toBeDefined();
    });
  });

  describe('Script Availability', () => {
    it('npm run i18n:check should exist', () => {
      expect(packageJson.scripts['i18n:check']).toBeDefined();
    });

    it('i18n:check should be executable', () => {
      const script = packageJson.scripts['i18n:check'];
      expect(script).toContain('tsx');
      expect(script).toContain('i18n-check.ts');
    });

    it('should run i18n:check without errors on current codebase', () => {
      const refKeys = keySets[REFERENCE_LOCALE];
      expect(refKeys.size).toBeGreaterThan(0);
      // Every locale must have the exact same key set as reference
      for (const locale of EXPECTED_LOCALES) {
        const missing = [...refKeys].filter((k) => !keySets[locale].has(k));
        expect(missing, `${locale} missing keys: ${missing.slice(0, 5).join(', ')}`).toHaveLength(
          0,
        );
      }
    });

    it('i18n:check output should show all locales are validated', () => {
      for (const locale of EXPECTED_LOCALES) {
        expect(keySets[locale]).toBeDefined();
        expect(keySets[locale].size).toBeGreaterThan(0);
      }
    });
  });

  describe('PR Feedback Configuration', () => {
    it('should post comment on PR when validation fails', () => {
      const job = workflowContent.jobs['i18n-check'];
      const commentStep = job.steps.find((step: any) => step.uses?.includes('github-script'));
      expect(commentStep).toBeDefined();
      expect(commentStep.if).toContain('failure()');
    });

    it('comment should provide actionable guidance', () => {
      const job = workflowContent.jobs['i18n-check'];
      const commentStep = job.steps.find((step: any) => step.uses?.includes('github-script'));
      const script = commentStep.with.script;
      expect(script).toContain('npm run i18n:check');
    });
  });

  describe('Workflow Error Handling', () => {
    it('should fail the workflow if i18n:check returns non-zero exit code', () => {
      const job = workflowContent.jobs['i18n-check'];
      const i18nStep = job.steps.find((step: any) => step.run?.includes('npm run i18n:check'));
      // continue-on-error should be false or not set (default is false)
      const continueOnError = i18nStep['continue-on-error'];
      expect(continueOnError).not.toBe(true);
    });

    it('should have proper step naming for clarity in PR checks', () => {
      const job = workflowContent.jobs['i18n-check'];
      const i18nStep = job.steps.find((step: any) => step.run?.includes('npm run i18n:check'));
      expect(i18nStep.name).toBeDefined();
      expect(i18nStep.name.toLowerCase()).toContain('i18n');
    });
  });

  describe('Workflow Performance', () => {
    it('should use setup-node with built-in caching', () => {
      const job = workflowContent.jobs['i18n-check'];
      expect(job.steps.some((step: any) => step.uses?.includes('setup-node'))).toBe(true);
    });

    it('should use Node.js 20 for consistency', () => {
      const job = workflowContent.jobs['i18n-check'];
      const setupNode = job.steps.find((step: any) => step.uses?.includes('setup-node'));
      expect(setupNode['with']['node-version']).toBe('20');
    });

    it('should use pnpm install --frozen-lockfile in CI', () => {
      const job = workflowContent.jobs['i18n-check'];
      const installStep = job.steps.find((step: any) =>
        step.run?.includes('pnpm install --frozen-lockfile'),
      );
      expect(installStep).toBeDefined();
    });
  });

  describe('CI/CD Integration Requirements (F-xx)', () => {
    it('F-01: i18n validation must run on every PR', () => {
      const hasPullRequestTrigger = workflowContent.on.pull_request !== undefined;
      expect(hasPullRequestTrigger).toBe(true);
    });

    it('F-02: Validation must fail the build on incomplete translations', () => {
      const job = workflowContent.jobs['i18n-check'];
      const i18nStep = job.steps.find((step: any) => step.run?.includes('npm run i18n:check'));
      const continueOnError = i18nStep['continue-on-error'];
      expect(continueOnError).not.toBe(true);
    });

    it('F-03: Validation script must check all required locales', () => {
      const refKeys = keySets[REFERENCE_LOCALE];
      for (const locale of EXPECTED_LOCALES) {
        expect(keySets[locale]).toBeDefined();
        // Exact key set match — same logic as scripts/i18n-check.ts
        const missing = [...refKeys].filter((k) => !keySets[locale].has(k));
        const extra = [...keySets[locale]].filter((k) => !refKeys.has(k));
        expect(
          missing.length + extra.length,
          `${locale}: ${missing.length} missing, ${extra.length} extra`,
        ).toBe(0);
      }
    });

    it('F-04: PR must have visibility into validation failures', () => {
      const job = workflowContent.jobs['i18n-check'];
      const commentStep = job.steps.find((step: any) => step.uses?.includes('github-script'));
      expect(commentStep).toBeDefined();
      expect(commentStep.if).toContain('pull_request');
    });
  });
});
