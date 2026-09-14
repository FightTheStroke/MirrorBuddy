import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { UsersTableRow } from '../users-table-row';
import { getTranslation } from '@/test/i18n-helpers';
import type { ListedUser } from '@/lib/admin/user-list-types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/admin/tier-change-modal', () => ({ TierChangeModal: () => null }));
vi.mock('@/components/admin/user-limit-override-modal', () => ({
  UserLimitOverrideModal: ({
    user,
  }: {
    user: { subscription: { tier: { chatLimitDaily: number } } };
  }) => (
    <tr>
      <td role="dialog">Limit {user.subscription.tier.chatLimitDaily}</td>
    </tr>
  ),
}));
const user: ListedUser = {
  id: 'user',
  username: 'alpha',
  email: 'alpha@example.com',
  role: 'USER',
  disabled: false,
  isTestData: false,
  createdAt: '2026-01-01T00:00:00Z',
  subscription: { id: 'subscription', tier: { id: 'base', code: 'BASE', name: 'Base' } },
};
const props = {
  user,
  isSelected: false,
  isLoading: false,
  availableTiers: [],
  onSelect: vi.fn(),
  onToggle: vi.fn(),
  onRoleToggle: vi.fn(),
  onResetPassword: vi.fn(),
  onDelete: vi.fn(),
};
const read = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', read);
  read.mockResolvedValue(
    Response.json({
      id: 'subscription',
      tier: {
        id: 'base',
        code: 'BASE',
        name: 'Base',
        chatLimitDaily: 10,
        voiceMinutesDaily: 5,
        toolsLimitDaily: 10,
        docsLimitTotal: 1,
        features: {},
      },
      overrideLimits: null,
      overrideFeatures: null,
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('minimized listing retains on-demand override capability', () => {
  it('loads single-user configuration only after the owner opens the existing override action', async () => {
    render(
      <table>
        <tbody>
          <UsersTableRow {...props} canManage />
        </tbody>
      </table>,
    );
    expect(read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: getTranslation('admin.overrideLimits1') }));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Limit 10'));
    expect(read).toHaveBeenCalledWith('/api/admin/subscriptions/subscription');
  });

  it('does not request editor configuration from the readonly view', () => {
    render(
      <table>
        <tbody>
          <UsersTableRow {...props} canManage={false} />
        </tbody>
      </table>,
    );
    const button = screen.getByRole('button', { name: getTranslation('admin.overrideLimits1') });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(read).not.toHaveBeenCalled();
  });

  it('does not open an editor for a different subscription than the requested row', async () => {
    read.mockResolvedValue(
      Response.json({
        id: 'other-subscription',
        tier: {
          id: 'base',
          code: 'BASE',
          name: 'Base',
          chatLimitDaily: 10,
          voiceMinutesDaily: 5,
          toolsLimitDaily: 10,
          docsLimitTotal: 1,
          features: {},
        },
        overrideLimits: null,
        overrideFeatures: null,
      }),
    );
    render(
      <table>
        <tbody>
          <UsersTableRow {...props} canManage />
        </tbody>
      </table>,
    );
    const button = screen.getByRole('button', { name: getTranslation('admin.overrideLimits1') });
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
