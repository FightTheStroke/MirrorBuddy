/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hydrateWhenOnline } from '../hydrate-when-online';

const offline = () => new TypeError('Failed to fetch');

afterEach(() => {
  vi.useRealTimers();
});

// Sentry MIRRORBUDDY-32: when the connection dropped during page load the
// student's data stayed empty until a manual reload, and it was reported as a fault.
describe('hydrateWhenOnline', () => {
  it('loads again when the connection comes back', async () => {
    const load = vi.fn().mockRejectedValueOnce(offline()).mockResolvedValueOnce(undefined);
    const done = hydrateWhenOnline(load, { isActive: () => true, retryDelayMs: 60_000 });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event('online'));

    await expect(done).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('retries after a pause even without an online event, then gives up quietly', async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockRejectedValue(offline());
    const done = hydrateWhenOnline(load, { isActive: () => true, retryDelayMs: 1000, attempts: 3 });
    const outcome = expect(done).rejects.toBeInstanceOf(TypeError);

    await vi.advanceTimersByTimeAsync(5000);

    await outcome;
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('does not retry real failures', async () => {
    const failure = new Error('Store hydration failed (500)');
    const load = vi.fn().mockRejectedValue(failure);

    await expect(hydrateWhenOnline(load, { isActive: () => true })).rejects.toBe(failure);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('stops retrying once the page no longer needs the data', async () => {
    let active = true;
    const load = vi.fn().mockRejectedValue(offline());
    const done = hydrateWhenOnline(load, { isActive: () => active, retryDelayMs: 60_000 });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    active = false;
    window.dispatchEvent(new Event('online'));

    await expect(done).rejects.toBeInstanceOf(TypeError);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
