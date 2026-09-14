'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableCell } from '@/components/ui/table';
import {
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  Settings,
  ExternalLink,
  Shield,
  ShieldOff,
  KeyRound,
} from 'lucide-react';
import { TierChangeModal } from '@/components/admin/tier-change-modal';
import { UserLimitOverrideModal } from '@/components/admin/user-limit-override-modal';
import { useTranslations } from 'next-intl';
import type { ListedUser as User } from '@/lib/admin/user-list-types';
import { useUserLimitDetails } from './use-user-limit-details';

interface Tier {
  id: string;
  code: string;
  name: string;
}

interface UsersTableRowProps {
  canManage: boolean;
  user: User;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRoleToggle: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  availableTiers: Tier[];
}

function getTierDisplay(user: User): {
  name: string;
  variant: 'success' | 'warning' | 'neutral';
} {
  const tierName = user.subscription?.tier.name || 'Base';
  const tierCode = user.subscription?.tier.code || 'BASE';

  // Determine variant based on tier code
  let variant: 'success' | 'warning' | 'neutral' = 'neutral';
  if (tierCode === 'PRO') {
    variant = 'success';
  } else if (tierCode === 'TRIAL') {
    variant = 'warning';
  }

  return { name: tierName, variant };
}

export function UsersTableRow({
  canManage,
  user,
  isSelected,
  isLoading,
  onSelect,
  onToggle,
  onRoleToggle,
  onResetPassword,
  onDelete,
  availableTiers,
}: UsersTableRowProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [showTierModal, setShowTierModal] = useState(false);
  const limits = useUserLimitDetails(user.subscription?.id);
  const tierDisplay = getTierDisplay(user);

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    router.push(`/admin/users/${user.id}`);
  };

  return (
    <>
      <tr className="border-b hover:bg-accent cursor-pointer" onClick={handleRowClick}>
        {canManage && (
          <TableCell className="px-3 py-3 w-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              disabled={isLoading}
              aria-label={t('users.pagination.selectUser', { username: user.username ?? user.id })}
              className="rounded"
            />
          </TableCell>
        )}
        <TableCell className="font-medium">{user.username || '—'}</TableCell>
        <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
        <TableCell>
          <StatusBadge variant={user.role === 'ADMIN' ? 'warning' : 'neutral'}>
            {user.role}
          </StatusBadge>
        </TableCell>
        <TableCell>
          <StatusBadge variant={tierDisplay.variant}>{tierDisplay.name}</StatusBadge>
        </TableCell>
        <TableCell>
          <StatusBadge variant={user.disabled ? 'disabled' : 'active'}>
            {user.disabled ? 'Disabled' : 'Active'}
          </StatusBadge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTierModal(true)}
              disabled={isLoading || !canManage}
              className="text-xs h-11 px-3"
              aria-label={t('changeTier1')}
              title={t('changeTier')}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void limits.load()}
              disabled={isLoading || limits.loading || !user.subscription || !canManage}
              className="text-xs h-11 px-3"
              aria-label={t('overrideLimits1')}
              title={t('overrideLimits')}
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggle}
              disabled={isLoading || !canManage}
              className="text-xs h-11 px-3"
              aria-label={user.disabled ? t('enableUser') : t('disableUser')}
            >
              {user.disabled ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRoleToggle}
              disabled={isLoading || !canManage}
              className="text-xs h-11 px-3"
              aria-label={user.role === 'ADMIN' ? t('demoteToUser') : t('promoteToAdmin')}
              title={user.role === 'ADMIN' ? t('demoteToUser') : t('promoteToAdmin')}
            >
              {user.role === 'ADMIN' ? (
                <ShieldOff className="w-3 h-3" />
              ) : (
                <Shield className="w-3 h-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onResetPassword}
              disabled={isLoading || !user.email || !canManage}
              className="text-xs h-11 px-3"
              aria-label={t('resetPassword')}
              title={!user.email ? t('resetPasswordNoEmail') : t('resetPassword')}
            >
              <KeyRound className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={isLoading || !canManage}
              className="text-xs h-11 px-3 text-red-600"
              aria-label={t('deleteUser')}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/admin/users/${user.id}`)}
              className="text-xs h-11 px-3"
              aria-label={t('viewUserDetails')}
              title={t('viewDetails')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </tr>

      {canManage && (
        <TierChangeModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
          onSuccess={() => {
            // Reload the page to show updated tier
            window.location.reload();
          }}
          user={{
            id: user.id,
            username: user.username,
            email: user.email,
            currentTier: user.subscription?.tier,
          }}
          availableTiers={availableTiers}
        />
      )}

      {canManage && limits.details && (
        <UserLimitOverrideModal
          isOpen
          onClose={limits.close}
          onSuccess={() => {
            // Reload the page to show updated overrides
            window.location.reload();
          }}
          user={{
            id: user.id,
            username: user.username,
            email: user.email,
            subscription: limits.details,
          }}
        />
      )}
    </>
  );
}
