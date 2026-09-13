import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

export const E2E_SESSION_SECRET = 'e2e-test-session-secret-32-characters-min';
const execute = promisify(execFile);

/** Keep server-only module conditions out of the Playwright browser-test process. */
export async function createFixtureToken(): Promise<{ token: string; handleHash: string }> {
  const { stdout } = await execute(
    process.execPath,
    [
      '--import',
      'tsx',
      '--conditions=react-server',
      path.join(__dirname, 'session-token-command.ts'),
    ],
    {
      cwd: path.join(__dirname, '../..'),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        SESSION_SECRET: E2E_SESSION_SECRET,
        DOTENV_CONFIG_PATH: '/dev/null',
      },
      timeout: 15000,
    },
  );
  const value: unknown = JSON.parse(stdout);
  if (
    !value ||
    typeof value !== 'object' ||
    !('token' in value) ||
    !('handleHash' in value) ||
    typeof value.token !== 'string' ||
    !/^s2:[\w-]{43}\.[a-f0-9]{64}$/.test(value.token) ||
    typeof value.handleHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.handleHash)
  ) {
    throw new Error('Native fixture token generation failed');
  }
  return { token: value.token, handleHash: value.handleHash };
}
