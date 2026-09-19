import { writeFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

interface AcknowledgedPolicy {
  killSwitch: boolean;
  killSwitchReason?: string | null;
  status?: string;
  enabledPercentage?: number;
  updatedAt?: string;
}

export async function claimPolicyWindow(prisma: PrismaClient, owner: string, directory: string) {
  const path = join(directory, '..', 'c3-final-policy-window.lock');
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted local-runner directory and fixed lock basename.
  const descriptor = openSync(path, 'wx', 0o600);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Descriptor from the exclusive local lock opened above.
  writeFileSync(descriptor, JSON.stringify({ owner, directory, at: new Date().toISOString() }));
  closeSync(descriptor);
  const global = await prisma.globalConfig.findUnique({ where: { id: 'global' } });
  const voice = await prisma.featureFlag.findUnique({ where: { id: 'voice_realtime' } });
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted local-runner directory and fixed backup basename.
  writeFileSync(join(directory, 'policy-window-backup.json'), JSON.stringify({ global, voice }), {
    mode: 0o600,
  });
  if (!global || !voice) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Only the fixed local lock created above is removed.
    unlinkSync(path);
    throw new Error('Canonical test policies must exist; no guessed baseline creation');
  }
  const claimed = await prisma.$transaction(async (tx) => {
    const g = await tx.globalConfig.updateMany({
      where: { id: global.id, updatedAt: global.updatedAt },
      data: { updatedBy: owner },
    });
    const v = await tx.featureFlag.updateMany({
      where: { id: voice.id, updatedAt: voice.updatedAt },
      data: { updatedBy: owner },
    });
    if (g.count !== 1 || v.count !== 1) throw new Error('Policy window ownership conflict');
    return {
      global: await tx.globalConfig.findUniqueOrThrow({ where: { id: global.id } }),
      voice: await tx.featureFlag.findUniqueOrThrow({ where: { id: voice.id } }),
    };
  });
  const expected = { ...claimed };
  const unaffected = (row: object, fields: string[]) =>
    JSON.stringify(
      Object.fromEntries(Object.entries(row).filter(([key]) => !fields.includes(key))),
    );
  const mutable = ['killSwitch', 'killSwitchReason', 'updatedBy', 'updatedAt'];
  return {
    async acknowledgeResponse(data: unknown, body: unknown) {
      const input = z
        .object({
          global: z.boolean().optional(),
          action: z.string().optional(),
          featureId: z.string().optional(),
        })
        .passthrough()
        .parse(data);
      const kind =
        input.global || input.action === 'kill-switch'
          ? 'global'
          : input.featureId === 'voice_realtime'
            ? 'voice'
            : undefined;
      if (!kind) return;
      const receipt = z.object({
        effective: z.object({
          killSwitch: z.boolean(),
          killSwitchReason: z.string().nullable().optional(),
          status: z.string(),
          enabledPercentage: z.number(),
        }),
      });
      const outer = receipt.safeParse(body);
      const effective = outer.success
        ? outer.data.effective
        : receipt.parse(z.object({ data: z.unknown() }).parse(body).data).effective;
      await this.acknowledge(kind, effective);
    },
    async acknowledge(kind: 'global' | 'voice', policy: AcknowledgedPolicy) {
      const row =
        kind === 'global'
          ? await prisma.globalConfig.findUniqueOrThrow({ where: { id: global.id } })
          : await prisma.featureFlag.findUniqueOrThrow({ where: { id: voice.id } });
      const fields = kind === 'global' ? mutable : [...mutable, 'status', 'enabledPercentage'];
      if (
        row.updatedBy !== owner ||
        row.killSwitch !== policy.killSwitch ||
        row.killSwitchReason !== (policy.killSwitchReason ?? null) ||
        (policy.updatedAt && row.updatedAt.toISOString() !== policy.updatedAt) ||
        unaffected(row, fields) !== unaffected(kind === 'global' ? global : voice, fields)
      ) {
        throw new Error('Acknowledged policy no longer matches owned database state');
      }
      if ('status' in row) {
        if (row.status !== policy.status || row.enabledPercentage !== policy.enabledPercentage) {
          throw new Error('Acknowledged voice policy changed externally');
        }
        expected.voice = row;
      } else {
        expected.global = row;
      }
    },
    async assertOwned() {
      const g = await prisma.globalConfig.findUniqueOrThrow({ where: { id: global.id } });
      const v = await prisma.featureFlag.findUniqueOrThrow({ where: { id: voice.id } });
      if (
        JSON.stringify(g) !== JSON.stringify(expected.global) ||
        JSON.stringify(v) !== JSON.stringify(expected.voice)
      ) {
        throw new Error('External policy change: stop without overwriting it');
      }
      return { global: g, voice: v };
    },
    async restore() {
      const current = await this.assertOwned();
      await prisma.$transaction(async (tx) => {
        const g = await tx.globalConfig.updateMany({
          where: { id: global.id, updatedBy: owner, updatedAt: current.global.updatedAt },
          data: {
            killSwitch: global.killSwitch,
            killSwitchReason: global.killSwitchReason,
            updatedBy: global.updatedBy,
            updatedAt: global.updatedAt,
          },
        });
        const v = await tx.featureFlag.updateMany({
          where: { id: voice.id, updatedBy: owner, updatedAt: current.voice.updatedAt },
          data: {
            killSwitch: voice.killSwitch,
            killSwitchReason: voice.killSwitchReason,
            status: voice.status,
            enabledPercentage: voice.enabledPercentage,
            updatedBy: voice.updatedBy,
            updatedAt: voice.updatedAt,
          },
        });
        if (g.count !== 1 || v.count !== 1) throw new Error('CAS restore refused external change');
      });
      const restored = {
        global: await prisma.globalConfig.findUnique({ where: { id: global.id } }),
        voice: await prisma.featureFlag.findUnique({ where: { id: voice.id } }),
      };
      if (JSON.stringify(restored) !== JSON.stringify({ global, voice })) {
        throw new Error('Policy window restoration mismatch');
      }
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted local-runner directory and fixed evidence basename.
      writeFileSync(
        join(directory, 'policy-window-restored.json'),
        JSON.stringify({
          restored: true,
          comparedAllFields: true,
          at: new Date().toISOString(),
        }),
      );
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Only the owned local lock is removed after verified restoration.
      unlinkSync(path);
    },
  };
}
