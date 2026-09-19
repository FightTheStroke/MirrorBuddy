/* eslint-disable react-hooks/rules-of-hooks */
import { randomUUID } from 'node:crypto';
import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { test as base, expect } from './base-fixtures';
import type { APIRequestContext } from '@playwright/test';
import { getPrismaClient, disconnectPrisma } from '../helpers/prisma-setup';
import { issueTestSession, testSessionCookies } from '../helpers/durable-session';
import { claimPolicyWindow } from '../helpers/policy-window';
import { policyTestDatabaseEnabled } from '../../src/test/policy-test-environment';

const optionsSchema = z.object({
  runId: z.string().uuid(),
  origin: z.string().url(),
  control: z.string().url(),
  observer: z.string().url(),
  controlToken: z.string().min(16),
  directory: z.string().min(1),
  databasePort: z.number().int().positive().max(65535),
});
type Options = z.infer<typeof optionsSchema>;
type Prisma = ReturnType<typeof getPrismaClient>;
export interface PolicyAcceptance {
  options: Options;
  prisma: Prisma;
  adminId: string;
  admin: APIRequestContext;
  member: APIRequestContext;
  anonymous: APIRequestContext;
  cookies: ReturnType<typeof testSessionCookies>;
  flag(name?: string): Promise<string>;
  mutation(
    data: unknown,
    path?: string,
    request?: APIRequestContext,
  ): Promise<{
    status: number;
    body: unknown;
  }>;
  control(
    path: string,
    data?: unknown,
  ): Promise<{
    connections: number;
    held: number;
    timers: number;
    socketListeners: number;
    events: Array<{ at: string; kind: string; target?: string }>;
  }>;
  effective(id: string): Promise<{ killSwitch: boolean; killSwitchReason?: string | null }>;
  record(name: string, evidence: unknown): void;
  window: Awaited<ReturnType<typeof claimPolicyWindow>>;
}

export const test = base.extend<object, { policy: PolicyAcceptance }>({
  policy: [
    async ({ playwright }, use, info) => {
      const options = optionsSchema.parse(info.config.metadata.policyAcceptance);
      if (
        !policyTestDatabaseEnabled() ||
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL === '1'
      )
        throw new Error('Explicit non-production policy target required');
      for (const address of [options.origin, options.control, options.observer]) {
        if (!['localhost', '127.0.0.1'].includes(new URL(address).hostname)) {
          throw new Error('Only isolated loopback acceptance processes are allowed');
        }
      }
      const prisma = getPrismaClient();
      const adminId = `policy-admin-${randomUUID()}`;
      const memberId = `policy-member-${randomUUID()}`;
      const flags: string[] = [];
      const contexts: APIRequestContext[] = [];
      let window: Awaited<ReturnType<typeof claimPolicyWindow>> | undefined;
      const record = (name: string, evidence: unknown) =>
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted runner metadata supplies the directory; basename is fixed.
        appendFileSync(
          join(options.directory, 'case-evidence.jsonl'),
          JSON.stringify({ at: new Date().toISOString(), name, evidence }) + '\n',
        );
      try {
        for (const [id, role] of [
          [adminId, 'ADMIN'],
          [memberId, 'USER'],
        ] as const) {
          await prisma.user.create({
            data: {
              id,
              role,
              isTestData: true,
              disabled: false,
              email: `${id}@example.com`,
              username: id,
              profile: { create: { name: 'Policy acceptance fixture', age: 18 } },
              settings: { create: {} },
              onboarding: {
                create: {
                  hasCompletedOnboarding: true,
                  currentStep: 'ready',
                  isReplayMode: false,
                  onboardingCompletedAt: new Date(),
                  data: '{}',
                },
              },
              tosAcceptances: { create: { version: '1.0', acceptedAt: new Date() } },
            },
          });
        }
        const session = await issueTestSession(prisma, adminId);
        const cookies = testSessionCookies(session, options.origin);
        const memberSession = await issueTestSession(prisma, memberId);
        for (const authCookies of [
          cookies,
          testSessionCookies(memberSession, options.origin),
          [],
        ]) {
          contexts.push(
            await playwright.request.newContext({
              baseURL: options.origin,
              storageState: { cookies: authCookies, origins: [] },
            }),
          );
        }
        const [admin, member, anonymous] = contexts;
        window = await claimPolicyWindow(prisma, adminId, options.directory);
        const policy: PolicyAcceptance = {
          options,
          prisma,
          adminId,
          cookies,
          admin,
          member,
          anonymous,
          record,
          window,
          async flag(name) {
            const id = `policy-final-${randomUUID()}`;
            flags.push(id);
            await prisma.featureFlag.create({
              data: {
                id,
                name: name ?? id,
                description: 'Owned policy acceptance fixture',
                status: 'enabled',
                enabledPercentage: 73,
                killSwitch: false,
                metadata: { retained: true },
              },
            });
            const seeded = await this.mutation({
              featureId: id,
              update: { metadata: { warmed: true } },
            });
            expect(seeded.status).toBe(200);
            return id;
          },
          async mutation(data, path = '/api/admin/feature-flags', request = admin) {
            const tokenResponse = await request.get('/api/session');
            expect(tokenResponse.status()).toBe(200);
            const token = z.object({ csrfToken: z.string() }).parse(await tokenResponse.json());
            const response = await request.post(path, {
              data,
              headers: { 'x-csrf-token': token.csrfToken },
              timeout: 20000,
            });
            const body: unknown = await response.json();
            if (response.status() === 200) await this.window.acknowledgeResponse(data, body);
            return { status: response.status(), body };
          },
          async control(path, data) {
            const response = await fetch(`${options.control}${path}`, {
              method: data ? 'POST' : 'GET',
              headers: { authorization: options.controlToken, 'content-type': 'application/json' },
              ...(data && { body: JSON.stringify(data) }),
            });
            if (!response.ok) throw new Error(`Fault control failed: ${response.status}`);
            return response.json();
          },
          async effective(id) {
            const response = await admin.get('/api/admin/feature-flags');
            expect(response.status()).toBe(200);
            const body = z
              .object({
                flags: z.array(
                  z.object({
                    id: z.string(),
                    killSwitch: z.boolean(),
                    killSwitchReason: z.string().nullable().optional(),
                  }),
                ),
              })
              .parse(await response.json());
            const flag = body.flags.find((flag) => flag.id === id);
            if (!flag) throw new Error('Owned effective policy missing');
            return flag;
          },
        };
        await use(policy);
      } finally {
        for (const context of contexts) await context.dispose();
        try {
          if (window) await window.restore();
        } finally {
          await prisma.adminAuditLog.deleteMany({ where: { adminId } });
          await prisma.featureFlag.deleteMany({ where: { id: { in: flags } } });
          await prisma.user.deleteMany({
            where: { id: { in: [adminId, memberId] }, isTestData: true },
          });
          const remaining = {
            flags: await prisma.featureFlag.count({ where: { id: { in: flags } } }),
            users: await prisma.user.count({ where: { id: { in: [adminId, memberId] } } }),
            audits: await prisma.adminAuditLog.count({ where: { adminId } }),
            sessions: await prisma.authSession.count({
              where: { userId: { in: [adminId, memberId] } },
            }),
          };
          // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted runner metadata supplies the directory; basename is fixed.
          writeFileSync(join(options.directory, 'owned-cleanup.json'), JSON.stringify(remaining));
          expect(remaining).toEqual({ flags: 0, users: 0, audits: 0, sessions: 0 });
          await disconnectPrisma();
        }
      }
    },
    { scope: 'worker' },
  ],
});
export { expect };
