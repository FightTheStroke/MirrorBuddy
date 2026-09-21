import { test, expect } from './fixtures/policy-acceptance-fixtures';
import { z } from 'zod';

test.beforeEach(({}, info) => {
  test.skip(!info.config.metadata.policyAcceptance, 'Dedicated isolated acceptance only');
});

test('C1 every policy mutation branch confirms concrete state and attributed audit', async ({
  policy: p,
}) => {
  const id = await p.flag();
  const operations = [
    {
      path: '/api/admin/feature-flags',
      data: { featureId: id, update: { status: 'disabled' } },
      kill: false,
      status: 'disabled',
    },
    {
      path: '/api/admin/feature-flags',
      data: { featureId: id, update: { status: 'enabled', metadata: { accepted: true } } },
      kill: false,
      status: 'enabled',
    },
    {
      path: '/api/admin/feature-flags',
      data: { featureId: id, enabled: true, reason: 'acceptance stop' },
      kill: true,
      status: 'enabled',
    },
    {
      path: '/api/admin/feature-flags',
      data: { featureId: id, enabled: false },
      kill: false,
      status: 'enabled',
    },
    {
      path: '/api/admin/control-panel',
      data: { action: 'feature-flag', data: { flagId: id, update: { enabledPercentage: 61 } } },
      kill: false,
      status: 'enabled',
    },
  ];
  for (const operation of operations) {
    const before = await p.prisma.adminAuditLog.count({ where: { adminId: p.adminId } });
    const result = await p.mutation(operation.data, operation.path);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject(
      operation.path.endsWith('control-panel')
        ? {
            success: true,
            data: { persistence: 'confirmed', effective: { killSwitch: operation.kill } },
          }
        : {
            success: true,
            persistence: 'confirmed',
            scope: 'instance',
            effective: { killSwitch: operation.kill },
          },
    );
    expect(await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).toMatchObject({
      killSwitch: operation.kill,
      status: operation.status,
      updatedBy: p.adminId,
    });
    expect(await p.prisma.adminAuditLog.count({ where: { adminId: p.adminId } })).toBe(before + 1);
    p.record('C1-feature', {
      path: operation.path,
      status: result.status,
      branch: operation.data,
      confirmed: true,
    });
  }
  const csrf = await (await p.admin.get('/api/session')).json();
  const stopped = await p.admin.delete(
    `/api/admin/feature-flags?id=${id}&reason=delete-acceptance`,
    {
      headers: { 'x-csrf-token': csrf.csrfToken },
    },
  );
  expect(stopped.status()).toBe(200);
  expect(await stopped.json()).toMatchObject({
    persistence: 'confirmed',
    effective: { killSwitch: true },
  });
  expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(true);
  const audit = await p.prisma.adminAuditLog.findFirst({
    where: { adminId: p.adminId, entityId: id },
    orderBy: { createdAt: 'desc' },
  });
  expect(audit).toMatchObject({ action: 'UPDATE_FEATURE_POLICY', entityId: id });
  p.record('C1-delete', { status: 200, durableStop: true, attributedAudit: true });

  for (const path of ['/api/admin/feature-flags', '/api/admin/control-panel']) {
    for (const enabled of [true, false]) {
      await p.window.assertOwned();
      const before = await p.prisma.adminAuditLog.count({
        where: { adminId: p.adminId, entityId: 'global' },
      });
      const result = await p.mutation(
        path.endsWith('control-panel')
          ? {
              action: 'kill-switch',
              data: { isEnabled: enabled, reason: 'owned acceptance window' },
            }
          : { global: true, enabled, reason: 'owned acceptance window' },
        path,
      );
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject(
        path.endsWith('control-panel')
          ? {
              success: true,
              data: { persistence: 'confirmed', effective: { killSwitch: enabled } },
            }
          : { success: true, persistence: 'confirmed', effective: { killSwitch: enabled } },
      );
      expect(
        await p.prisma.globalConfig.findUniqueOrThrow({ where: { id: 'global' } }),
      ).toMatchObject({ killSwitch: enabled, updatedBy: p.adminId });
      expect(
        await p.prisma.adminAuditLog.count({ where: { adminId: p.adminId, entityId: 'global' } }),
      ).toBe(before + 1);
      p.record('C1-global', { path, enabled, status: 200, durable: true, attributedAudit: true });
    }
  }
});

test('C2 actual auth roles and CSRF reject writes without DB or audit changes', async ({
  policy: p,
}) => {
  const id = await p.flag();
  const before = await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } });
  const audits = await p.prisma.adminAuditLog.count({ where: { adminId: p.adminId } });
  for (const path of ['/api/admin/feature-flags', '/api/admin/control-panel']) {
    const data = path.endsWith('control-panel')
      ? {
          action: 'feature-flag',
          data: { flagId: id, update: { killSwitch: true, killSwitchReason: 'denied' } },
        }
      : { featureId: id, enabled: true, reason: 'denied' };
    const anonymous = await p.mutation(data, path, p.anonymous);
    const member = await p.mutation(data, path, p.member);
    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(403);
    const missing = await p.admin.post(path, { data });
    const invalid = await p.admin.post(path, { data, headers: { 'x-csrf-token': 'invalid' } });
    expect(missing.status()).toBe(403);
    expect(invalid.status()).toBe(403);
    p.record('C2-auth-csrf', { path, statuses: [401, 403, 403, 403] });
  }
  for (const [request, status] of [
    [p.anonymous, 401],
    [p.member, 403],
  ] as const) {
    const csrf = z
      .object({ csrfToken: z.string() })
      .parse(await (await request.get('/api/session')).json());
    expect(
      (
        await request.delete(`/api/admin/feature-flags?id=${id}`, {
          headers: { 'x-csrf-token': csrf.csrfToken },
        })
      ).status(),
    ).toBe(status);
  }
  expect((await p.admin.delete(`/api/admin/feature-flags?id=${id}`)).status()).toBe(403);
  expect(
    (
      await p.admin.delete(`/api/admin/feature-flags?id=${id}`, {
        headers: { 'x-csrf-token': 'invalid' },
      })
    ).status(),
  ).toBe(403);
  p.record('C2-delete-auth-csrf', { statuses: [401, 403, 403, 403] });
  expect(await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).toEqual(before);
  expect(await p.prisma.adminAuditLog.count({ where: { adminId: p.adminId } })).toBe(audits);
  expect((await p.mutation({ featureId: `${id}-absent`, enabled: true })).status).toBe(404);
  expect((await p.mutation({ featureId: id, enabled: 'invalid' })).status).toBe(400);
  p.record('C2-unchanged', {
    databaseUnchanged: true,
    auditUnchanged: true,
    unknown: 404,
    invalid: 400,
  });
});
