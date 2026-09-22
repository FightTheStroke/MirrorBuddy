// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkout,
  cleanupRoots,
  DOCUMENTED,
  documentation,
  OUTSIDE_CHECKOUT,
  plant,
  registryModule,
  remove,
  run,
  SOURCE_ROOTS,
  UNDOCUMENTED,
  usage,
  validateScript,
} from './env-var-audit-fixture';

afterEach(cleanupRoots);

// Legacy copies exercise declaration failures before monorepo discovery is repaired.
const documentedUsage = {
  'src/fixture-usage.ts': usage(DOCUMENTED),
  'apps/web/src/fixture-usage.ts': usage(DOCUMENTED),
};

describe('env-var-audit source coverage', () => {
  it.each(SOURCE_ROOTS)('warns about an undocumented variable used in %s', (directory) => {
    const root = checkout({ files: { [`${directory}/fixture-usage.ts`]: usage(UNDOCUMENTED) } });

    const outcome = run(root);

    expect(outcome.status, 'undocumented variables warn, they do not block').toBe(0);
    expect(outcome.output).toContain(UNDOCUMENTED);
    expect(outcome.output).toContain('.env.example');
  });

  it('observes the fixture rather than another checkout', () => {
    checkout({ files: { 'apps/web/src/fixture-usage.ts': usage(OUTSIDE_CHECKOUT) } });
    const root = checkout({ files: { 'apps/web/src/fixture-usage.ts': usage(UNDOCUMENTED) } });

    const outcome = run(root);

    expect(outcome.output).toContain(UNDOCUMENTED);
    expect(outcome.output).not.toContain(OUTSIDE_CHECKOUT);
  });

  it('has a positive discovery control for the original legacy-root scanner', () => {
    const root = checkout({
      files: {
        'src/fixture-usage.ts': usage(UNDOCUMENTED),
        'apps/web/src/fixture-usage.ts': usage(UNDOCUMENTED),
      },
    });

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).toContain(UNDOCUMENTED);
    expect(outcome.output).toContain('.env.example');
  });

  it('reads shell scripts that hold their own process.env references', () => {
    const root = checkout({
      files: {
        'src/fixture-usage.ts': usage(UNDOCUMENTED),
        'scripts/fixture-sync.sh': `#!/usr/bin/env bash\nnode -e 'process.env.${UNDOCUMENTED}'\n`,
      },
    });

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).toContain(UNDOCUMENTED);
  });

  it('ignores build output inside a package instead of its source', () => {
    const root = checkout({
      files: {
        ...documentedUsage,
        'packages/ui/dist/fixture-usage.js': usage(UNDOCUMENTED),
      },
    });

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).toContain('All 1 environment variables properly documented');
    expect(outcome.output).not.toContain(UNDOCUMENTED);
  });
});

describe('env-var-audit declaration sources', () => {
  it('accepts a variable declared in the production-env-policy registry', () => {
    const root = checkout({ files: documentedUsage });

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).not.toContain('WARN');
  });

  it('accepts a variable declared inline in validate-pre-deploy', () => {
    const root = checkout({ files: documentedUsage, registry: [], inline: [DOCUMENTED] });

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).not.toContain('WARN');
  });

  it('warns when a documented variable is declared nowhere', () => {
    const root = checkout({
      files: { 'apps/web/src/fixture-usage.ts': usage(UNDOCUMENTED) },
      documented: [DOCUMENTED, UNDOCUMENTED],
    });

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).toContain(UNDOCUMENTED);
    expect(outcome.output).toContain('validate-pre-deploy.ts');
  });

  it('stays silent for a fully documented and declared checkout', () => {
    const root = checkout({ files: documentedUsage });
    plant(root, 'scripts/validate-pre-deploy.ts', validateScript([]) + usage(DOCUMENTED));

    const outcome = run(root);

    expect(outcome.status).toBe(0);
    expect(outcome.output).not.toContain('WARN');
    expect(outcome.output).not.toContain(UNDOCUMENTED);
  });
});

describe('env-var-audit rejects declaration look-alikes', () => {
  const lookAlike = (policy: string, validate: string) => {
    const root = checkout({ files: documentedUsage, registry: [], inline: [] });
    plant(root, 'scripts/lib/production-env-policy.ts', policy);
    plant(root, 'scripts/validate-pre-deploy.ts', validate);
    return run(root);
  };

  const expectWarned = (outcome: ReturnType<typeof run>) => {
    expect(outcome.status).toBe(0);
    expect(outcome.output).toContain(DOCUMENTED);
    expect(outcome.output).toContain('validate-pre-deploy.ts');
  };

  it('rejects a quoted name outside the registry array', () => {
    const policy = `${registryModule([])}export const other = '${DOCUMENTED}';\n`;

    expectWarned(lookAlike(policy, validateScript([])));
  });

  it('rejects a commented-out registry entry', () => {
    const policy =
      `export const criticalProductionEnv = [\n  // '${DOCUMENTED}',\n` +
      `].map((name) => ({ name }));\n`;

    expectWarned(lookAlike(policy, validateScript([])));
  });

  it('rejects a commented-out inline entry', () => {
    const validate = `${validateScript([])}// { name: '${DOCUMENTED}' }\n`;

    expectWarned(lookAlike(registryModule([]), validate));
  });

  it('rejects an inline entry in a comment trailing real code', () => {
    const validate = `${validateScript([])}const unrelated = 1; // { name: '${DOCUMENTED}' }\n`;

    expectWarned(lookAlike(registryModule([]), validate));
  });

  it('rejects prose that merely contains a process.env reference', () => {
    const validate =
      `${validateScript([])}export const note = ` +
      `'set process.env.${DOCUMENTED} before deploying';\n`;

    expectWarned(lookAlike(registryModule([]), validate));
  });
});

describe('env-var-audit search failures', () => {
  it('fails when an expected source root is missing', () => {
    const root = checkout({ omitRoots: ['apps/web/src'] });

    const outcome = run(root);

    expect(outcome.status, 'a missing source root is an infrastructure failure').not.toBe(0);
    expect(outcome.output).toContain('apps/web/src');
  });

  it.each([
    '.env.example',
    'scripts/lib/production-env-policy.ts',
    'scripts/lib/collect-declared-env.mjs',
  ])('fails when %s is missing', (relative) => {
    const root = checkout({ files: documentedUsage });
    remove(root, relative);

    const outcome = run(root);

    expect(outcome.status, 'a missing documentation file must fail').not.toBe(0);
    expect(outcome.output).toContain(relative);
  });

  it('fails when the search utility itself errors', () => {
    const root = checkout({ files: { 'apps/web/src/fixture-usage.ts': usage(DOCUMENTED) } });

    const outcome = run(root, { search: 'failing' });

    expect(outcome.status, 'a broken search must fail closed').not.toBe(0);
    expect(outcome.status, 'engine errors are distinct from findings').not.toBe(1);
  });

  it('succeeds on a valid checkout that genuinely has no references', () => {
    const root = checkout({ documented: [], registry: [] });
    plant(root, '.env.example', documentation([]));

    const outcome = run(root);

    expect(outcome.status, 'an honest empty scan is not a failure').toBe(0);
    expect(outcome.output).not.toContain('WARN');
  });

  it.each([
    ['bin/node', 'node'],
    ['node_modules/typescript', 'typescript'],
  ])('fails when reader dependency %s is missing', (relative, name) => {
    const root = checkout({ files: documentedUsage });
    remove(root, relative);

    const outcome = run(root);

    expect(outcome.status).toBe(2);
    expect(outcome.output).toContain(name);
  });
});
