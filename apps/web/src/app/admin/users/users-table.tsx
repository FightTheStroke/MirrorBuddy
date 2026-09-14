'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { useUserActions } from '@/hooks/use-user-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableEmpty,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/admin/responsive-table';
import { ResetPasswordModal } from '@/components/admin/reset-password-modal';
import type { ListedTier, ListedUser, UserListPage } from '@/lib/admin/user-list-types';
import { UsersBulkActions } from './users-bulk-actions';
import { UsersTrashToolbar } from './users-trash-toolbar';
import { UsersTableRow } from './users-table-row';
import { UsersTrashRow } from './users-trash-row';
import { UsersListControls } from './users-list-controls';
import { UsersPagination } from './users-pagination';
import { useUserListNavigation } from './use-user-list-navigation';
import { useUserListSelection } from './use-user-list-selection';

export function UsersTable({
  listing,
  availableTiers,
  canManage,
  stagingSpecified = true,
}: {
  listing: UserListPage;
  availableTiers: ListedTier[];
  canManage: boolean;
  stagingSpecified?: boolean;
}) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const navigation = useUserListNavigation(listing.query, stagingSpecified);
  const selection = useUserListSelection(listing.query);
  const selected = selection.selected;
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<ListedUser | null>(null);
  const { isLoading: actionLoading, error, handleAction } = useUserActions();
  const refresh = async () => {
    router.refresh();
  };
  const trash = listing.query.tab === 'trash';
  const allPageSelected =
    listing.users.length > 0 && listing.users.every((user) => selected.has(user.id));

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const id = userToDelete;
    setUserToDelete(null);
    await handleAction(id, 'delete', undefined, refresh);
  };

  return (
    <div aria-busy={navigation.pending}>
      {selection.error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {t('pagination.loadFailed')}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      <UsersListControls
        listing={listing}
        {...navigation}
        pending={navigation.pending || selection.loading}
      />
      {trash && canManage && (
        <UsersTrashToolbar count={listing.trashTotal} onEmptyComplete={() => router.refresh()} />
      )}
      <UsersPagination
        listing={listing}
        pending={navigation.pending || selection.loading}
        onPage={navigation.setPage}
        onPageSize={navigation.setPageSize}
      />
      {canManage && !trash && (
        <Button
          className="mb-3"
          variant="outline"
          disabled={navigation.pending || selection.loading || listing.total === 0}
          onClick={() => void selection.selectMatching()}
        >
          {t('pagination.selectMatching', { count: listing.total })}
        </Button>
      )}
      <ResponsiveTable caption={t('pageTitle')}>
        <Table>
          <TableHeader>
            <TableRow>
              {!trash && canManage && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => selection.togglePage(listing.users)}
                    disabled={navigation.pending || selection.loading}
                    aria-label={t('pagination.selectPage')}
                    className="rounded"
                  />
                </TableHead>
              )}
              <TableHead>{t('table.username')}</TableHead>
              <TableHead>{t('table.email')}</TableHead>
              {!trash && (
                <>
                  <TableHead>{t('table.role')}</TableHead>
                  <TableHead>{t('table.tier')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                </>
              )}
              <TableHead>{trash ? t('table.deleted') : t('table.created')}</TableHead>
              <TableHead>{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trash
              ? listing.backups.map((backup) => (
                  <UsersTrashRow
                    key={backup.userId}
                    backup={backup}
                    canManage={canManage}
                    isLoading={actionLoading === backup.userId}
                    onRestore={() => handleAction(backup.userId, 'restore', undefined, refresh)}
                  />
                ))
              : listing.users.map((user) => (
                  <UsersTableRow
                    key={user.id}
                    user={user}
                    canManage={canManage}
                    isSelected={selected.has(user.id)}
                    isLoading={actionLoading === user.id || navigation.pending || selection.loading}
                    onSelect={() => selection.toggle(user)}
                    onToggle={() => handleAction(user.id, 'toggle', user.disabled, refresh)}
                    onRoleToggle={() => handleAction(user.id, 'roleToggle', user.role, refresh)}
                    onResetPassword={() => setResetPasswordUser(user)}
                    onDelete={() => setUserToDelete(user.id)}
                    availableTiers={availableTiers}
                  />
                ))}
          </TableBody>
        </Table>
      </ResponsiveTable>
      {!trash && listing.users.length === 0 && <TableEmpty>{t('emptyMessage')}</TableEmpty>}
      {trash && listing.backups.length === 0 && <TableEmpty>{t('trashEmpty')}</TableEmpty>}
      {canManage && !trash && (
        <UsersBulkActions
          selectedIds={new Set(selected.keys())}
          onClearSelection={selection.clear}
          onActionComplete={() => router.refresh()}
          users={[...selected.values()]}
          availableTiers={availableTiers}
        />
      )}
      <Dialog
        open={canManage && userToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('areYouSureYouWantToDeleteThisUserThisActionCannotB')}{' '}
              {t('undoneTheUserWillBeMovedToTrashAndCanBeRestoredWit')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('deleteUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {canManage && resetPasswordUser && (
        <ResetPasswordModal
          isOpen
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => router.refresh()}
          user={{
            id: resetPasswordUser.id,
            username: resetPasswordUser.username,
            email: resetPasswordUser.email,
          }}
        />
      )}
    </div>
  );
}
