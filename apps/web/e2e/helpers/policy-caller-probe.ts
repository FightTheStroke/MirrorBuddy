import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { policyTestDatabaseEnabled } from '../../src/test/policy-test-environment';

async function main() {
  if (!policyTestDatabaseEnabled() || process.env.NODE_ENV !== 'test') {
    throw new Error('Explicit local test environment required before application imports');
  }
  const input = z
    .object({
      owner: z.string().startsWith('policy-admin-'),
      directory: z.string(),
      control: z.string().url(),
      controlToken: z.string().min(16),
    })
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- CLI input file comes from the trusted local acceptance runner.
    .parse(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  if (new URL(input.control).hostname !== '127.0.0.1') throw new Error('Loopback control required');
  const [flags, writer, degradation, voice, { prisma, dbPool }] = await Promise.all([
    import('../../src/lib/feature-flags/feature-flags-service'),
    import('../../src/lib/feature-flags/policy-writer'),
    import('../../src/lib/degradation/degradation-service'),
    import('../../src/lib/metrics/voice-spike-policy'),
    import('../../src/lib/db'),
  ]);
  const id = 'voice_realtime';
  const resources = () =>
    process
      .getActiveResourcesInfo()
      .reduce<
        Record<string, number>
      >((all, name) => ({ ...all, [name]: (all[name] ?? 0) + 1 }), {});
  const baseline = resources();
  const listenerBaseline = process.listenerCount('unhandledRejection');
  let unhandled = 0;
  const rejection = () => {
    unhandled++;
  };
  process.on('unhandledRejection', rejection);
  const control = async (path: string, mode?: string) => {
    const response = await fetch(`${input.control}${path}`, {
      method: mode ? 'POST' : 'GET',
      headers: { authorization: input.controlToken, 'content-type': 'application/json' },
      ...(mode && { body: JSON.stringify({ mode, target: id }) }),
    });
    assert.equal(response.status, 200);
    return z
      .object({
        held: z.number(),
        events: z.array(z.object({ kind: z.string(), target: z.string().optional() })),
      })
      .parse(await response.json());
  };
  const writes = async () =>
    (await control('/stats')).events.filter(
      (event) => event.target === id && event.kind === 'policy-write',
    ).length;
  const waitFor = async (condition: () => boolean | Promise<boolean>) => {
    const deadline = Date.now() + 4000;
    while (!(await condition())) {
      if (Date.now() > deadline) throw new Error('Bounded caller observation timeout');
      await delay(10);
    }
  };
  const admin = (patch: Parameters<typeof writer.beginFeaturePolicyWrite>[1]) =>
    writer.beginFeaturePolicyWrite(id, patch, 'admin').completion;
  const barrier = () => {
    assert.equal(flags.getFlag(id)?.status, 'enabled');
    return admin({ status: 'enabled', updatedBy: input.owner });
  };
  const reset = async () => {
    voice.resetVoiceSpikePolicy();
    degradation._resetState();
    const result = await admin({ killSwitch: false, status: 'enabled', enabledPercentage: 100 });
    assert.equal(result.persistence, 'confirmed');
  };
  const evidence: Record<string, unknown> = {};
  try {
    assert.equal(
      (await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).updatedBy,
      input.owner,
    );
    assert.equal(
      (await prisma.globalConfig.findUniqueOrThrow({ where: { id: 'global' } })).updatedBy,
      input.owner,
    );
    await flags.initializeFlags();
    await reset();
    await control('/arm', 'outage');
    const prior = await writes();
    degradation.degradeFeature(id, 'disable', 'Owned acceptance stop');
    assert.equal(flags.getFlag(id)?.killSwitch, true);
    assert.equal(degradation.getFallbackBehavior(id), 'disable');
    await waitFor(async () => (await writes()) > prior);
    await control('/release');
    await barrier();
    assert.equal((await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch, false);
    await flags.reloadFlags();
    assert.equal(flags.getFlag(id)?.killSwitch, true);
    await control('/arm', 'outage');
    const recovery = degradation.recoverFeature(id, 'Owned failed recovery');
    assert.equal(degradation.recoverFeature(id, 'Deduplicated recovery'), recovery);
    await recovery;
    assert.equal(degradation.getFallbackBehavior(id), 'disable');
    assert.equal(
      degradation.getRecentEvents().filter((event) => event.newState === 'enabled').length,
      0,
    );
    await control('/release');
    const beforeSamples = await writes();
    degradation.registerRule({
      featureId: id,
      triggerConditions: { maxLatencyMs: 10000, maxErrorRate: 1 },
      fallbackBehavior: 'disable',
      recoveryConditions: { minSuccessRate: 0.9 },
    });
    for (let n = 0; n < 4; n++) degradation.recordHealthCheck('azure-realtime', true, 1);
    await delay(60);
    assert.equal(await writes(), beforeSamples);
    await degradation.recoverFeature(id, 'Explicit owned recovery');
    assert.equal(degradation.getFallbackBehavior(id), null);
    assert.equal(flags.getFlag(id)?.killSwitch, false);
    assert.equal(flags.getFlag(id)?.status, 'enabled');
    evidence.degradation = {
      failedStopSurvivedReload: true,
      deduplicated: true,
      healthRetries: 0,
      explicitRecovered: true,
    };

    await reset();
    voice.stopVoiceForSpike('First owned spike', 300);
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    await barrier();
    await delay(100);
    voice.stopVoiceForSpike('Second owned spike', 500);
    await barrier();
    const beforeOldTimer = await writes();
    await delay(250);
    assert.equal(await writes(), beforeOldTimer);
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    await waitFor(() => voice.voicePolicyAllowance().allowed);
    assert.equal((await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch, false);
    evidence.spikes = { oldTimerCancelled: true, secondCooldownConfirmed: true };
    voice.stopVoiceForSpike('Failed owned cooldown release', 150);
    await barrier();
    await control('/arm', 'outage');
    const beforeFailedRelease = await writes();
    await waitFor(async () => (await writes()) > beforeFailedRelease);
    await control('/release');
    await barrier();
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    assert.equal((await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch, true);
    await admin({ killSwitch: false });
    assert.equal(voice.voicePolicyAllowance().allowed, true);
    evidence.failedVoiceRelease = { blocked: true, adminRecoveredWithoutOrphanLatch: true };
    await reset();
    await control('/arm', 'outage');
    const beforeFailedStop = await writes();
    voice.stopVoiceForSpike('Failed owned voice stop', 500);
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    await waitFor(async () => (await writes()) > beforeFailedStop);
    await control('/release');
    await barrier();
    assert.equal((await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch, false);
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    voice.resetVoiceSpikePolicy();
    const beforeCancelledTimer = await writes();
    await delay(550);
    assert.equal(await writes(), beforeCancelledTimer);
    evidence.failedVoiceStop = { locallyBlocked: true, resetCancelledTimer: true };

    await reset();
    await admin({ killSwitch: true, killSwitchReason: 'Another owner stop' });
    voice.stopVoiceForSpike('Must not own an admin stop', 120);
    await barrier();
    const beforeUnownedTimer = await writes();
    await delay(200);
    assert.equal(await writes(), beforeUnownedTimer);
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    await admin({ killSwitch: false });
    assert.equal(voice.voicePolicyAllowance().allowed, true);
    await writer.beginGlobalPolicyWrite(
      {
        killSwitch: true,
        killSwitchReason: 'Owned global control',
        updatedBy: input.owner,
      },
      'admin',
    ).completion;
    assert.equal(voice.voicePolicyAllowance().allowed, false);
    await writer.beginGlobalPolicyWrite({ killSwitch: false, updatedBy: input.owner }, 'admin')
      .completion;
    evidence.ownership = { adminStopRetained: true, globalStopRespected: true };
    evidence.terminalPolicies = {
      global: await prisma.globalConfig.findUniqueOrThrow({
        where: { id: 'global' },
        select: { killSwitch: true, killSwitchReason: true, updatedAt: true },
      }),
      voice: await prisma.featureFlag.findUniqueOrThrow({
        where: { id },
        select: {
          killSwitch: true,
          killSwitchReason: true,
          status: true,
          enabledPercentage: true,
          updatedAt: true,
        },
      }),
    };
  } finally {
    voice.resetVoiceSpikePolicy();
    degradation._resetState();
    await control('/release');
    await prisma.$disconnect();
    await dbPool.end();
    await delay(60);
    process.removeListener('unhandledRejection', rejection);
    const after = resources();
    evidence.resources = {
      baseline,
      after,
      listenerBaseline,
      listenerAfter: process.listenerCount('unhandledRejection'),
      unhandled,
    };
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Trusted runner-config directory and fixed evidence basename.
    writeFileSync(join(input.directory, 'caller-evidence.json'), JSON.stringify(evidence), {
      mode: 0o600,
    });
    assert.equal(unhandled, 0);
    assert.equal(process.listenerCount('unhandledRejection'), listenerBaseline);
    assert.ok((after.Timeout ?? 0) <= (baseline.Timeout ?? 0));
  }
  console.log('C7_PROBE_PASS');
}

main().catch((error: unknown) => {
  console.error('C7_PROBE_FAILED', error instanceof Error ? error.name : 'Unknown');
  if (error instanceof assert.AssertionError) console.error(error.message);
  if (error instanceof z.ZodError) {
    console.error(
      JSON.stringify(error.issues.map(({ code, path, message }) => ({ code, path, message }))),
    );
  }
  process.exitCode = 1;
});
