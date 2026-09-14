import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminCounts } from '../admin-counts-service';

const db = vi.hoisted(() => ({
  inviteRequest: { count: vi.fn() },
  user: { count: vi.fn() },
  userActivity: { groupBy: vi.fn() },
  safetyEvent: { count: vi.fn() },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));

describe('admin counts metric truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.inviteRequest.count.mockResolvedValue(0);
    db.user.count.mockResolvedValue(8);
    db.safetyEvent.count.mockResolvedValue(0);
  });

  it('never queries ephemeral activity for daily users', async () => {
    const counts = await getAdminCounts();
    expect(db.userActivity.groupBy).not.toHaveBeenCalled();
    expect(counts.activeUsers24h).toBeNull();
    expect(counts.metrics.activeUsers24h.unavailabilityReason).toBe('retentionWindow');
    expect(counts.metrics.totalUsers.value).toBe(8);
    expect(counts.metrics.systemAlerts).toMatchObject({ value: 0, status: 'measured' });
  });

  it('keeps safety collection failure distinct from zero without losing other counts', async () => {
    db.safetyEvent.count.mockRejectedValue(new Error('synthetic database failure'));
    const counts = await getAdminCounts();
    expect(counts.systemAlerts).toBeNull();
    expect(counts.metrics.systemAlerts.status).toBe('failed');
    expect(counts.totalUsers).toBe(8);
  });
});
