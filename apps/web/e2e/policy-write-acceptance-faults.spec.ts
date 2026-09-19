import { test, expect } from './fixtures/policy-acceptance-fixtures';

test.beforeEach(({}, info) => {
  test.skip(!info.project.metadata.policyAcceptance, 'Requires dedicated local acceptance harness');
});

test('C3 a real write outage retains effective protection without success audit', async ({
  policy: p,
}) => {
  const id = await p.flag();
  const audits = await p.prisma.adminAuditLog.count({ where: { entityId: id } });
  await p.control('/arm', { mode: 'outage', target: id });
  const failed = await p.mutation({ featureId: id, enabled: true, reason: 'owned outage stop' });
  expect(failed.status).toBe(503);
  expect(failed.body).toMatchObject({
    success: false,
    persistence: 'unconfirmed',
    scope: 'instance',
    code: 'FLAG_POLICY_WRITE_UNCONFIRMED',
    effective: { killSwitch: true },
  });
  expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(false);
  expect(await p.prisma.adminAuditLog.count({ where: { entityId: id } })).toBe(audits);
  expect(await p.effective(id)).toMatchObject({ killSwitch: true });
  await p.control('/release');
  const metadata = await p.mutation({ featureId: id, update: { metadata: { afterOutage: true } } });
  expect(metadata.status).toBe(200);
  expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(false);
  expect(await p.effective(id)).toMatchObject({ killSwitch: true });
  expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
  expect((await p.mutation({ featureId: id, enabled: false })).status).toBe(200);
  await p.record('C3', { failed: failed.body, durableStopAtFailure: false, auditUnchanged: true });
});

test('C4 pending and failed releases stay restrictive until a current confirmation', async ({
  policy: p,
}) => {
  const id = await p.flag();
  expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
  await p.control('/arm', { mode: 'hold-ack', target: id });
  let settled = false;
  const pending = p.mutation({ featureId: id, enabled: false }).then((result) => {
    settled = true;
    return result;
  });
  await expect.poll(async () => (await p.control('/stats')).held).toBe(1);
  expect(settled).toBe(false);
  expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(false);
  expect(await p.effective(id)).toMatchObject({ killSwitch: true });
  await p.control('/release');
  expect((await pending).status).toBe(200);
  expect(await p.effective(id)).toMatchObject({ killSwitch: false });
  expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
  const audits = await p.prisma.adminAuditLog.count({ where: { entityId: id } });
  await p.control('/arm', { mode: 'outage', target: id });
  const failed = await p.mutation({ featureId: id, enabled: false });
  expect(failed.status).toBe(503);
  expect(failed.body).toMatchObject({ effective: { killSwitch: true } });
  expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(true);
  expect(await p.prisma.adminAuditLog.count({ where: { entityId: id } })).toBe(audits);
  expect(await p.effective(id)).toMatchObject({ killSwitch: true });
  await p.control('/release');
  expect((await p.mutation({ featureId: id, enabled: false })).status).toBe(200);
  await p.record('C4', { pendingCommittedButProtected: true, failedReleaseStatus: failed.status });
});

test('C5 real COMMIT acknowledgement loss is unconfirmed even though DB committed', async ({
  policy: p,
}) => {
  const id = await p.flag();
  expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
  const audits = await p.prisma.adminAuditLog.count({ where: { entityId: id } });
  await p.control('/arm', { mode: 'lost-ack', target: id });
  const failed = await p.mutation({ featureId: id, enabled: false });
  expect(failed.status).toBe(503);
  expect(failed.body).toMatchObject({
    persistence: 'unconfirmed',
    effective: { killSwitch: true },
  });
  const committed = await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } });
  expect(committed.killSwitch).toBe(false);
  expect(await p.prisma.adminAuditLog.count({ where: { entityId: id } })).toBe(audits);
  expect(await p.effective(id)).toMatchObject({ killSwitch: true });
  const transport = await p.control('/stats');
  expect(
    transport.events.filter(
      (event: { target?: string; kind: string }) =>
        event.target === id && event.kind === 'commit-response-cut',
    ),
  ).toHaveLength(1);
  expect(
    transport.events.filter(
      (event: { target?: string; kind: string }) =>
        event.target === id && event.kind === 'policy-write',
    ),
  ).toHaveLength(1);
  const metadata = await p.mutation({
    featureId: id,
    update: { metadata: { afterCommitLoss: true } },
  });
  expect(metadata.status).toBe(200);
  expect(await p.effective(id)).toMatchObject({ killSwitch: true });
  expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(false);
  const retry = await p.mutation({ featureId: id, enabled: false });
  expect(retry.status).toBe(200);
  expect(await p.effective(id)).toMatchObject({ killSwitch: false });
  await p.record('C5', {
    failed: failed.body,
    directCommittedKillSwitch: committed.killSwitch,
    committedAt: committed.updatedAt.toISOString(),
    transport,
    retry: retry.body,
  });
});

for (const queued of [false, true]) {
  test(`C6 ${queued ? 'queued' : 'in-flight'} release is superseded by a newer stop`, async ({
    policy: p,
  }) => {
    const id = await p.flag();
    expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
    const audits = await p.prisma.adminAuditLog.count({ where: { entityId: id } });
    await p.control('/arm', { mode: 'hold-ack', target: id });
    const first = queued
      ? p.mutation({ featureId: id, update: { metadata: { queueBarrier: true } } })
      : p.mutation({ featureId: id, enabled: false });
    await expect.poll(async () => (await p.control('/stats')).held).toBe(1);
    const release = queued ? p.mutation({ featureId: id, enabled: false }) : first;
    if (queued) await new Promise((resolve) => setTimeout(resolve, 50));
    const stop = p.mutation({ featureId: id, enabled: true, reason: 'new owned stop' });
    await expect.poll(async () => (await p.effective(id)).killSwitchReason).toBe('new owned stop');
    await p.control('/release');
    const superseded = await release;
    expect(superseded.status).toBe(409);
    expect(superseded.body).toMatchObject({
      success: false,
      superseded: true,
      persistence: queued ? 'skipped' : 'confirmed',
      effective: { killSwitch: true },
    });
    expect((await stop).status).toBe(200);
    if (queued) expect((await first).status).toBe(200);
    expect(await p.effective(id)).toMatchObject({
      killSwitch: true,
      killSwitchReason: 'new owned stop',
    });
    expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(true);
    expect(await p.prisma.adminAuditLog.count({ where: { entityId: id } })).toBe(
      audits + (queued ? 2 : 1),
    );
    await p.record(`C6-${queued ? 'queued' : 'in-flight'}`, superseded.body);
  });
}
