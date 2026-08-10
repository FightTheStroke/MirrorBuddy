/**
 * Unit tests for RobotPairingCard — Settings › Integrations.
 * Covers the explainer/buy affordances (visible to everyone, even without a
 * robot) and the pairing-code generation flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RobotPairingCard } from './robot-pairing-card';

vi.mock('next-intl', () => ({
  // Identity translator: assert against the raw keys.
  useTranslations: () => (key: string) => key,
}));

const csrfFetch = vi.fn();
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: (...args: unknown[]) => csrfFetch(...args) };
});

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ devices: [] }),
  }) as unknown as typeof fetch;
});

describe('RobotPairingCard', () => {
  it('explains what the robot is and lists its features to everyone', async () => {
    render(<RobotPairingCard />);

    expect(screen.getByText('whatIsTitle')).toBeInTheDocument();
    expect(screen.getByText('whatIsBody')).toBeInTheDocument();
    for (const key of [
      'featureEyes',
      'featureVoice',
      'featureCamera',
      'featureMovement',
      'featureStop',
    ]) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getByText('noRobots')).toBeInTheDocument());
  });

  it('offers a safe external buy link for people without a robot', () => {
    render(<RobotPairingCard />);

    const buy = screen.getByRole('link', { name: /buyCta/ });
    expect(buy).toHaveAttribute('href', 'https://pollen-robotics.com/reachy-mini/');
    expect(buy).toHaveAttribute?.('target', '_blank');
    expect(buy).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows the three connection steps', () => {
    render(<RobotPairingCard />);
    expect(screen.getByText('step1')).toBeInTheDocument();
    expect(screen.getByText('step2')).toBeInTheDocument();
    expect(screen.getByText('step3')).toBeInTheDocument();
  });

  it('generates a pairing code on demand', async () => {
    csrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ code: '123456', expiresAt: new Date().toISOString() }),
    });
    render(<RobotPairingCard />);

    await userEvent.click(screen.getByText('generateCode'));

    await waitFor(() => expect(screen.getByText('123456')).toBeInTheDocument());
    expect(csrfFetch).toHaveBeenCalledWith(
      '/api/devices/pair-code',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('tells the parent why the code could not be generated (rate limited)', async () => {
    csrfFetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    render(<RobotPairingCard />);

    await userEvent.click(screen.getByText('generateCode'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('errorRateLimit');
  });

  it('asks the parent to sign in again when the session is gone', async () => {
    csrfFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    render(<RobotPairingCard />);

    await userEvent.click(screen.getByText('generateCode'));

    expect(await screen.findByRole('alert')).toHaveTextContent('errorAuth');
  });

  it('reports a network failure instead of failing silently', async () => {
    csrfFetch.mockRejectedValue(new Error('offline'));
    render(<RobotPairingCard />);

    await userEvent.click(screen.getByText('generateCode'));

    expect(await screen.findByRole('alert')).toHaveTextContent('errorNetwork');
  });

  it('clears a previous error once a code is generated', async () => {
    csrfFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    render(<RobotPairingCard />);

    await userEvent.click(screen.getByText('generateCode'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    csrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: '654321', expiresAt: new Date().toISOString() }),
    });
    await userEvent.click(screen.getByText('generateCode'));

    await waitFor(() => expect(screen.getByText('654321')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * Regression: a parent generated a code, typed it on the robot, the robot paired —
 * and this page kept saying "no robot connected", because the device list was read
 * once at mount and nothing ever told the browser the pairing had happened.
 */
describe('RobotPairingCard — noticing that the robot paired', () => {
  const robot = (id: string) => ({
    id,
    label: 'Reachy Mini',
    pairedAt: new Date().toISOString(),
    lastSeenAt: null,
    createdAt: new Date().toISOString(),
  });

  /** Devices currently returned by /api/devices; mutate mid-test to simulate pairing. */
  let listed: ReturnType<typeof robot>[] = [];

  const tick = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  const renderCard = async () => {
    await act(async () => {
      render(<RobotPairingCard />);
    });
  };

  const clickGenerate = async () => {
    fireEvent.click(screen.getByText('generateCode'));
    await tick(0);
  };

  const setup = (initial: ReturnType<typeof robot>[] = []) => {
    listed = initial;
    global.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ devices: listed }),
    })) as unknown as typeof fetch;
    vi.useFakeTimers();
  };

  const issueCode = (code: string, ttlMs = 10 * 60 * 1000) =>
    csrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ code, expiresAt: new Date(Date.now() + ttlMs).toISOString() }),
    });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the robot as soon as it pairs, with no page reload', async () => {
    setup();
    issueCode('123456');
    await renderCard();

    await clickGenerate();
    expect(screen.getByText('123456')).toBeInTheDocument();

    listed = [robot('dev-1')]; // the robot redeems the code

    await tick(3500);
    expect(screen.queryByText('noRobots')).not.toBeInTheDocument();
    expect(screen.getByText('Reachy Mini')).toBeInTheDocument();
  });

  it('puts the code away once it has been used', async () => {
    setup();
    issueCode('123456');
    await renderCard();

    await clickGenerate();
    listed = [robot('dev-1')];

    await tick(3500);
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
  });

  it('keeps showing the code when the only robot listed is one paired earlier', async () => {
    setup([robot('old-robot')]);
    issueCode('654321');
    await renderCard();

    await clickGenerate();

    await tick(9000); // three polls, no new robot
    expect(screen.getByText('654321')).toBeInTheDocument();
  });

  it('drops an expired code instead of leaving a dead number on screen', async () => {
    setup();
    issueCode('111222', 5000);
    await renderCard();

    await clickGenerate();
    expect(screen.getByText('111222')).toBeInTheDocument();

    await tick(7000);
    expect(screen.queryByText('111222')).not.toBeInTheDocument();
  });

  it('does not poll the server while no code is outstanding', async () => {
    setup();
    await renderCard();
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    await tick(30_000);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });
});
