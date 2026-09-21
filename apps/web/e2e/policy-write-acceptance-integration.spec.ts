import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { test, expect } from './fixtures/policy-acceptance-fixtures';

test.beforeEach(({}, info) => {
  test.skip(!info.project.metadata.policyAcceptance, 'Requires dedicated local acceptance harness');
});

test('C7 real automatic callers retain protection, ownership, and recover without provider calls', async ({
  policy: p,
}) => {
  await p.window.assertOwned();
  expect((await p.mutation({ global: true, enabled: false })).status).toBe(200);
  const input = join(p.options.directory, 'caller-input.json');
  writeFileSync(
    input,
    JSON.stringify({
      owner: p.adminId,
      directory: p.options.directory,
      control: p.options.control,
      controlToken: p.options.controlToken,
    }),
    { mode: 0o600 },
  );
  const database = new URL(process.env.TEST_DATABASE_URL ?? '');
  database.hostname = '127.0.0.1';
  database.port = String(p.options.databasePort);
  const execute = promisify(execFile);
  try {
    const result = await execute(
      process.execPath,
      [
        '--import',
        'tsx',
        '--conditions=react-server',
        join(__dirname, 'helpers/policy-caller-probe.ts'),
        input,
      ],
      {
        cwd: join(__dirname, '..'),
        timeout: 30000,
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'test',
          DOTENV_CONFIG_PATH: '/dev/null',
          TEST_DATABASE_URL: database.href,
          DATABASE_URL: database.href,
          DEV_DATABASE_URL: database.href,
        },
      },
    );
    writeFileSync(join(p.options.directory, 'caller-process.log'), result.stdout + result.stderr, {
      mode: 0o600,
    });
    expect(result.stdout).toContain('C7_PROBE_PASS');
  } catch (error) {
    if (error && typeof error === 'object' && 'stdout' in error && 'stderr' in error) {
      writeFileSync(
        join(p.options.directory, 'caller-process.log'),
        String(error.stdout) + String(error.stderr),
        { mode: 0o600 },
      );
    }
    throw error;
  }
  const evidence: unknown = JSON.parse(
    readFileSync(join(p.options.directory, 'caller-evidence.json'), 'utf8'),
  );
  const state = z.object({
    killSwitch: z.boolean(),
    killSwitchReason: z.string().nullable(),
    updatedAt: z.string(),
    status: z.string().optional(),
    enabledPercentage: z.number().optional(),
  });
  const terminal = z
    .object({ terminalPolicies: z.object({ global: state, voice: state }) })
    .parse(evidence);
  await p.window.acknowledge('global', terminal.terminalPolicies.global);
  await p.window.acknowledge('voice', terminal.terminalPolicies.voice);
  p.record('C7', evidence);
  await p.window.assertOwned();
});

test('C9 repeated actual fault cycles return owned connections timers and listeners to baseline', async ({
  policy: p,
}) => {
  const id = await p.flag();
  const observe = async () => {
    const response = await fetch(p.options.observer, {
      headers: { authorization: p.options.controlToken },
    });
    expect(response.status).toBe(200);
    return z
      .object({
        unhandled: z.number(),
        resources: z.record(z.string(), z.number()),
        listeners: z.record(z.string(), z.number()),
      })
      .parse(await response.json());
  };
  await p.control('/close-idle');
  await new Promise((resolve) => setTimeout(resolve, 250));
  const before = await observe();
  const cycles = [];
  for (let cycle = 0; cycle < 4; cycle++) {
    await p.control('/arm', { mode: 'outage', target: id });
    expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(503);
    await p.control('/release');
    expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
    expect((await p.mutation({ featureId: id, enabled: false })).status).toBe(200);
    await p.control('/close-idle');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const transport = await p.control('/stats');
    expect(transport).toMatchObject({ connections: 0, held: 0, timers: 0, socketListeners: 0 });
    const after = await observe();
    expect(after.unhandled).toBe(0);
    expect(after.listeners).toEqual(before.listeners);
    expect(after.resources.Timeout ?? 0).toBeLessThanOrEqual(before.resources.Timeout ?? 0);
    cycles.push({ cycle, transport, after });
  }
  p.record('C9', {
    method: 'Drain each owned proxy pool after acknowledged recovery; observe live app',
    before,
    cycles,
  });
});
