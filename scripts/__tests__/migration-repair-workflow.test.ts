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

  it('reads by default and offers only the two Prisma repair outcomes', () => {
    const action = workflow.split('      action:')[1]?.split('      confirm:')[0] ?? '';
    expect(action).toContain('default: status');
    expect(action).toMatch(/options:\s*\n\s*- status\s*\n\s*- applied\s*\n\s*- rolled-back/);
  });

  it('refuses to write without the exact confirmation word', () => {
    const guard = workflow
      .split('- name: Require an explicit confirmation before any write')[1]
      ?.split('- name:')[0];
    expect(guard).toContain("if: inputs.action != 'status'");
    expect(guard).toContain('"$CONFIRM" != "REPAIR"');
    expect(guard).toContain('exit 1');
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
    expect(repair).toContain('npx prisma migrate resolve "--${ACTION}" "$MIGRATION"');
  });

  it('never echoes the database credentials it is given', () => {
    expect(workflow).not.toMatch(/echo[^\n]*(DATABASE_URL|DIRECT_URL)/);
    expect(workflow).not.toContain('env | ');
  });
});
