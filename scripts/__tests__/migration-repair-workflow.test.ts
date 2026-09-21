// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const workflow = readFileSync(join(repository, '.github/workflows/migration-repair.yml'), 'utf8');

describe('production migration repair workflow', () => {
  it('can only be started by hand', () => {
    const triggers = workflow.split('\non:')[1]?.split('\npermissions:')[0] ?? '';
    expect(triggers).toContain('workflow_dispatch:');
    for (const automatic of ['push:', 'pull_request:', 'schedule:', 'repository_dispatch:']) {
      expect(triggers).not.toContain(automatic);
    }
  });

  it('reads by default and offers only the repair outcome Prisma needs here', () => {
    const action = workflow.split('      action:')[1]?.split('      confirm:')[0] ?? '';
    expect(action).toContain('default: status');
    // Both read-only actions precede the only writing one, which keeps the
    // dangerous choice last in the dispatch form rather than adjacent to status.
    expect(action).toMatch(/options:\s*\n\s*- status\s*\n\s*- orphans\s*\n\s*- applied\s*\n/);
    expect(action).not.toContain('rolled-back');
  });

  it('refuses to write without the exact confirmation word', () => {
    const guard = workflow
      .split('- name: Require an explicit confirmation before any write')[1]
      ?.split('- name:')[0];
    // Named explicitly rather than "not status": a third read-only action would
    // otherwise inherit the write path the moment it is added.
    expect(guard).toContain("if: inputs.action == 'applied'");
    expect(guard).toContain('"$CONFIRM" != "REPAIR"');
    expect(guard).toContain('exit 1');
  });

  it('keeps the orphan count read-only', () => {
    const count = workflow
      .split('- name: Count the rows the migration would remove')[1]
      ?.split('- name:')[0];
    expect(count).toContain("if: inputs.action == 'orphans'");
    expect(count).toContain('scripts/count-migration-orphans.ts');
    for (const writing of ['- name: Resolve the failed migration', '- name: Confirm the repair']) {
      const step = workflow.split(writing)[1]?.split('- name:')[0] ?? '';
      expect(step).toContain("inputs.action == 'applied'");
    }
  });

  it('accepts only a migration that exists in the checked-out source', () => {
    const guard = workflow
      .split('- name: Validate the requested migration exists in this source')[1]
      ?.split('- name:')[0];
    expect(guard).toContain('apps/web/prisma/migrations/${MIGRATION}/migration.sql');
    expect(guard).toContain('*[!0-9a-zA-Z_-]* |');
    const repair = workflow.split('- name: Resolve the failed migration')[1]?.split('- name:')[0];
    expect(workflow.indexOf('- name: Validate the requested migration exists')).toBeLessThan(
      workflow.indexOf('- name: Resolve the failed migration'),
    );
    expect(repair).toContain('pnpm exec prisma migrate resolve "--${ACTION}" "$MIGRATION"');
    // Prisma's datasource banner carries the host, so its output must not reach the log.
    expect(repair).toContain('>/tmp/resolve.log 2>&1');
  });

  it('waits for a human reviewer before it can reach production credentials', () => {
    expect(workflow).toMatch(/\n {4}environment: database-repair\n/);
  });

  it('checks the real migration state before and after writing', () => {
    const before = workflow
      .split('- name: Confirm the migration is really failed')[1]
      ?.split('- name:')[0];
    expect(before).toContain('scripts/check-failed-migration.ts "$MIGRATION" "$EXPECT"');
    expect(workflow.indexOf('- name: Confirm the migration is really failed')).toBeLessThan(
      workflow.indexOf('- name: Resolve the failed migration'),
    );
    const after = workflow.split('- name: Confirm the repair landed')[1];
    expect(after).toContain('scripts/check-failed-migration.ts "$MIGRATION" applied');
    expect(workflow.indexOf('- name: Resolve the failed migration')).toBeLessThan(
      workflow.indexOf('- name: Confirm the repair landed'),
    );
  });

  it('lets no Prisma command write its datasource banner to the public log', () => {
    expect(workflow).not.toContain('prisma migrate status');
    // `migrate` and `db` subcommands alike print the datasource host, and the
    // redirect order matters: `2>&1 >file` would still send stderr to the log.
    const commands = [...workflow.matchAll(/^.*\bprisma (?:migrate|db) .*$/gm)].map(
      ([line]) => line,
    );
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(command).toContain('>/tmp/resolve.log 2>&1');
    }
  });

  it('installs without running package lifecycle scripts', () => {
    expect(workflow).toContain('pnpm install --frozen-lockfile --ignore-scripts');
    // Skipping every install hook also skips the Prisma engine download the CLI needs.
    expect(workflow).toContain('pnpm rebuild @prisma/engines');
  });

  it('never echoes the database credentials it is given', () => {
    expect(workflow).not.toMatch(/echo[^\n]*(DATABASE_URL|DIRECT_URL)/);
    expect(workflow).not.toContain('env | ');
  });
});
