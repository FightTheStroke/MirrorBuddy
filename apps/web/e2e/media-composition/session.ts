import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { testSessionCookies } from '../helpers/durable-session';

export async function ownedSession(prisma: PrismaClient, userId: string, origin: string) {
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  assert.equal(owner.isTestData, true);
  assert.equal(owner.disabled, false);
  const secret = process.env.SESSION_SECRET;
  assert.ok(secret && secret.length >= 32);
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      '--import',
      'tsx',
      '--conditions=react-server',
      path.join(__dirname, '../helpers/session-token-command.ts'),
    ],
    {
      cwd: path.join(__dirname, '../..'),
      timeout: 15000,
      env: {
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        HOME: process.env.HOME,
        NODE_ENV: 'test',
        SESSION_SECRET: secret,
        DOTENV_CONFIG_PATH: '/dev/null',
        DATABASE_URL: process.env.DATABASE_URL,
        TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
        DEV_DATABASE_URL: process.env.DEV_DATABASE_URL,
      },
    },
  );
  const credential: unknown = JSON.parse(stdout);
  assert.ok(
    credential &&
      typeof credential === 'object' &&
      'token' in credential &&
      typeof credential.token === 'string' &&
      /^s2:[\w-]{43}\.[a-f0-9]{64}$/.test(credential.token) &&
      'handleHash' in credential &&
      typeof credential.handleHash === 'string' &&
      /^[a-f0-9]{64}$/.test(credential.handleHash),
  );
  const [clock] = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT statement_timestamp() AS now`;
  const issuedAt = clock.now;
  const expiresAt = new Date(issuedAt.getTime() + 30 * 60 * 1000);
  await prisma.authSession.create({
    data: {
      userId,
      handleHash: credential.handleHash,
      issuedAt,
      expiresAt,
      authVersion: owner.authVersion,
      legacyOrigin: false,
    },
  });
  return {
    handleHash: credential.handleHash,
    cookies: testSessionCookies(
      {
        token: credential.token,
        handleHash: credential.handleHash,
        userId,
        issuedAt,
        expiresAt,
      },
      origin,
    ),
  };
}
