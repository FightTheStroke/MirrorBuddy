import { describe, expect, it } from 'vitest';
import { PolicyWriteCoordinator } from '../policy-write-coordinator';
import type { PolicyState } from '../policy-write-types';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture(initial: Partial<PolicyState> = {}) {
  let state: PolicyState = {
    killSwitch: false,
    status: 'enabled',
    enabledPercentage: 100,
    ...initial,
  };
  const coordinator = new PolicyWriteCoordinator(
    () => state,
    (_key, patch) => {
      state = {
        ...state,
        ...patch,
        metadata: { ...state.metadata, ...patch.metadata },
      };
    },
  );
  return { coordinator, read: () => state };
}

describe('policy write acknowledgement state machine', () => {
  it('does not grant release ownership before database safety is known', async () => {
    const { coordinator } = fixture({ safetyKnown: false });
    const stop = coordinator.write('voice', { killSwitch: true }, 'voice-cost', async () => {});
    expect(stop.activation).toBeUndefined();
    await stop.completion;
  });

  it('does not invalidate a queued recovery because a metadata actor changed', async () => {
    const { coordinator, read } = fixture();
    const stop = coordinator.write('voice', { killSwitch: true }, 'voice-cost', async () => {});
    await stop.completion;
    const held = deferred();
    const metadata = coordinator.write(
      'voice',
      { metadata: { held: true } },
      'admin',
      () => held.promise,
    );
    const recovery = coordinator.write(
      'voice',
      { killSwitch: false, updatedBy: 'voice' },
      'voice-cost',
      async () => {},
      stop.activation,
    );
    const audit = coordinator.write(
      'voice',
      { metadata: { note: 'audit' }, updatedBy: 'admin' },
      'admin',
      async () => {},
    );
    held.resolve();
    await metadata.completion;
    expect(await recovery.completion).toMatchObject({
      persistence: 'confirmed',
      superseded: false,
    });
    await audit.completion;
    expect(read().killSwitch).toBe(false);
  });

  it.each([undefined, 'enabled' as const])(
    'protects synchronously even with mixed status %s',
    async (status) => {
      const { coordinator, read } = fixture();
      const delivery = deferred();
      const operation = coordinator.write(
        'voice',
        { killSwitch: true, killSwitchReason: 'cost', ...(status && { status }) },
        'voice-cost',
        () => delivery.promise,
      );
      expect(read().killSwitch).toBe(true);
      const rejected = expect(operation.completion).rejects.toMatchObject({
        code: 'FLAG_POLICY_WRITE_UNCONFIRMED',
        persistence: 'unconfirmed',
      });
      delivery.reject(new Error('connection lost'));
      await rejected;
      expect(read().killSwitch).toBe(true);
    },
  );

  it('does not release before acknowledgement and survives a failed queue entry', async () => {
    const { coordinator, read } = fixture({ killSwitch: true });
    const delivery = deferred();
    const first = coordinator.write(
      'voice',
      { killSwitch: false },
      'admin',
      () => delivery.promise,
    );
    expect(read().killSwitch).toBe(true);
    const rejected = expect(first.completion).rejects.toThrow();
    delivery.reject(new Error('no acknowledgement'));
    await rejected;
    const second = coordinator.write('voice', { killSwitch: false }, 'admin', async () => {});
    expect(read().killSwitch).toBe(true);
    expect(await second.completion).toMatchObject({ persistence: 'confirmed', superseded: false });
    expect(read().killSwitch).toBe(false);
  });

  it('does not let an in-flight release override a newer activation', async () => {
    const { coordinator, read } = fixture({ killSwitch: true });
    const delivery = deferred();
    const release = coordinator.write(
      'voice',
      { killSwitch: false },
      'admin',
      () => delivery.promise,
    );
    await Promise.resolve();
    const stop = coordinator.write('voice', { killSwitch: true }, 'admin', async () => {});
    delivery.resolve();
    expect(await release.completion).toMatchObject({ persistence: 'confirmed', superseded: true });
    expect(read().killSwitch).toBe(true);
    await stop.completion;
  });

  it('skips a queued release superseded by a newer stop without submitting it', async () => {
    const { coordinator, read } = fixture({ killSwitch: true });
    const held = deferred();
    const metadata = coordinator.write(
      'voice',
      { metadata: { note: 'held' } },
      'admin',
      () => held.promise,
    );
    let submitted = false;
    const release = coordinator.write('voice', { killSwitch: false }, 'admin', async () => {
      submitted = true;
    });
    const stop = coordinator.write('voice', { killSwitch: true }, 'admin', async () => {});
    held.resolve();
    await metadata.completion;
    expect(await release.completion).toMatchObject({ persistence: 'skipped', superseded: true });
    await stop.completion;
    expect(submitted).toBe(false);
    expect(read().killSwitch).toBe(true);
  });

  it('preserves safety ownership through metadata but denies overlapping sources', async () => {
    const { coordinator, read } = fixture();
    const activation = coordinator.write(
      'voice',
      { killSwitch: true },
      'voice-cost',
      async () => {},
    );
    await activation.completion;
    expect(activation.activation).toBeDefined();
    await coordinator.write('voice', { metadata: { note: 'audit' } }, 'admin', async () => {})
      .completion;
    const release = coordinator.write(
      'voice',
      { killSwitch: false },
      'voice-cost',
      async () => {},
      activation.activation,
    );
    await release.completion;
    expect(read().killSwitch).toBe(false);
    const cost = coordinator.write('voice', { killSwitch: true }, 'voice-cost', async () => {});
    await cost.completion;
    await coordinator.write('voice', { killSwitch: true }, 'admin', async () => {}).completion;
    const unsafe = coordinator.write(
      'voice',
      { killSwitch: false },
      'voice-cost',
      async () => {},
      cost.activation,
    );
    expect(await unsafe.completion).toMatchObject({ persistence: 'skipped' });
    expect(read().killSwitch).toBe(true);
  });

  it('never grants automatic release ownership of a pre-existing unknown stop', async () => {
    const { coordinator } = fixture({ killSwitch: true });
    const stop = coordinator.write('voice', { killSwitch: true }, 'voice-cost', async () => {});
    expect(stop.activation).toBeUndefined();
    await stop.completion;
    expect(
      await coordinator.write('voice', { killSwitch: false }, 'voice-cost', async () => {})
        .completion,
    ).toMatchObject({ persistence: 'skipped' });
  });

  it('does not bypass a partial rollout by immediately marking it degraded', async () => {
    const { coordinator, read } = fixture({ enabledPercentage: 20 });
    const delivery = deferred();
    const operation = coordinator.write(
      'voice',
      { status: 'degraded' },
      'admin',
      () => delivery.promise,
    );
    expect(read().status).toBe('enabled');
    delivery.resolve();
    await operation.completion;
    expect(read().status).toBe('degraded');
  });

  it('invalidates late completions on reset without delaying unrelated controls', async () => {
    const { coordinator, read } = fixture({ killSwitch: true });
    const held = deferred();
    const old = coordinator.write('voice', { killSwitch: false }, 'admin', () => held.promise);
    await Promise.resolve();
    const independent = coordinator.write(
      'quiz',
      { metadata: { ok: true } },
      'admin',
      async () => {},
    );
    expect(await independent.completion).toMatchObject({ persistence: 'confirmed' });
    coordinator.reset();
    held.resolve();
    expect(await old.completion).toMatchObject({ superseded: true });
    expect(read().killSwitch).toBe(true);
  });
});
