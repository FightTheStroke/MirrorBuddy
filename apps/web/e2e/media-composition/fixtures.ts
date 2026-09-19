import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { basename } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import type { Page } from '@playwright/test';
import { test as base, expect } from '../fixtures/base-fixtures';
import { acceptRequiredTerms } from '../fixtures/consent-journey-helpers';
import { ownedSession } from './session';

interface OwnedMedia {
  page: Page;
  prisma: PrismaClient;
  userId: string;
  helperBundle: string;
}

export const test = base.extend<{ media: OwnedMedia; privateRuntime: void }>({
  privateRuntime: [
    async ({ baseURL }, provideRuntime, info) => {
      test.skip(
        basename(info.config.configFile ?? '') !== 'playwright.config.media-composition.ts',
        'Requires the dedicated local media-composition configuration and owned runtime',
      );
      const runtime = info.project.metadata.composition;
      if (!process.env.C5_BROWSER_RUNTIME || !runtime || runtime.preparationOnly || !baseURL) {
        throw new Error('Dedicated media composition requires an owned C5 runtime manifest');
      }
      await provideRuntime();
    },
    { auto: true },
  ],
  media: async ({ browser, baseURL }, provideMedia, info) => {
    const runtime = info.project.metadata.composition;
    if (!runtime || runtime.preparationOnly || !baseURL || process.env.NODE_ENV === 'production') {
      throw new Error('Parent-released private runtime required; preparation is not execution');
    }
    const url = new URL(process.env.TEST_DATABASE_URL ?? '');
    expect(url.hostname).toBe('127.0.0.1');
    expect(url.port).not.toBe('5432');
    expect(url.port).toBe(String(runtime.databasePort));
    expect(process.env.DATABASE_URL).toBe(url.href);
    expect(process.env.DEV_DATABASE_URL).toBe(url.href);
    expect(new URL(baseURL).hostname).toBe('127.0.0.1');
    const pool = new Pool({ connectionString: url.href, max: 2 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
      reducedMotion: 'reduce',
    });
    const userId = randomUUID();
    const username = `c5-browser-${userId}`;
    const errors: string[] = [];
    let created = false;
    let handleHash: string | undefined;
    try {
      const rows = await prisma.$queryRaw<
        Array<{ directory: string; port: string; db: string; role: string }>
      >`
        SELECT current_setting('data_directory') AS directory, current_setting('port') AS port,
        current_database() AS db, current_user AS role`;
      expect(rows).toHaveLength(1);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Compares the server-reported directory with the owned PG directory supplied by the trusted local runner.
      expect(realpathSync(rows[0].directory)).toBe(realpathSync(runtime.dataDirectory));
      expect(rows[0]).toMatchObject({ port: url.port, db: 'mirrorbuddy_test', role: 'c5_owner' });
      expect(await prisma.user.count({ where: { id: runtime.sentinelId, isTestData: true } })).toBe(
        1,
      );
      expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
      await prisma.user.create({
        data: {
          id: userId,
          username,
          role: 'USER',
          isTestData: true,
          disabled: false,
          mustChangePassword: false,
          profile: { create: { name: 'Owned camera fixture', age: 16 } },
          settings: { create: {} },
          onboarding: {
            create: {
              hasCompletedOnboarding: true,
              onboardingCompletedAt: new Date(),
              currentStep: 'ready',
              isReplayMode: false,
              data: JSON.stringify({
                name: 'Owned camera fixture',
                age: 16,
                schoolLevel: 'superiore',
                learningDifferences: [],
                gender: 'other',
              }),
            },
          },
        },
      });
      created = true;
      await context.route('**/*', async (route) => {
        const requestUrl = new URL(route.request().url());
        if (
          requestUrl.origin !== baseURL ||
          /^\/api\/(?:chat|realtime|tts|voice|transcribe)(?:\/|$)/.test(requestUrl.pathname)
        ) {
          await route.abort('blockedbyclient');
          return;
        }
        await route.continue();
      });
      const session = await ownedSession(prisma, userId, baseURL);
      handleHash = session.handleHash;
      await context.addCookies(session.cookies);
      const authenticated = await context.request.get('/api/user');
      expect(authenticated.status()).toBe(200);
      expect((await authenticated.json()).id).toBe(userId);
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/it/astuccio');
      await acceptRequiredTerms(page);
      expect(await prisma.tosAcceptance.count({ where: { userId } })).toBe(1);
      await provideMedia({ page, prisma, userId, helperBundle: runtime.helperBundle });
    } finally {
      try {
        await context.close();
        const owned = created
          ? await prisma.material.findMany({ where: { userId }, select: { id: true } })
          : [];
        if (created) {
          await prisma.material.deleteMany({
            where: { userId, id: { in: owned.map((row) => row.id) } },
          });
          if (handleHash) await prisma.authSession.deleteMany({ where: { userId, handleHash } });
          expect(await prisma.authSession.count({ where: { userId } })).toBe(0);
          await prisma.user.deleteMany({ where: { id: userId, username, isTestData: true } });
          expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
          expect(await prisma.material.count({ where: { userId } })).toBe(0);
          expect(
            await prisma.user.count({ where: { id: runtime.sentinelId, isTestData: true } }),
          ).toBe(1);
        }
        await info.attach('owned-cleanup', {
          body: JSON.stringify({
            userId,
            materialIds: owned.map((row) => row.id),
            sentinelPreserved: created,
            scriptErrors: errors,
          }),
          contentType: 'application/json',
        });
      } finally {
        await prisma.$disconnect();
        if (!pool.ended) await pool.end();
      }
      expect(errors, 'Unexpected browser script errors are not filtered').toEqual([]);
    }
  },
});

export { expect };
