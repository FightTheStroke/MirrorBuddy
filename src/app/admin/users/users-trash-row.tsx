'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { TableCell } from '@/components/ui/table';
import { ArchiveRestore } from 'lucide-react';

interface DeletedUserBackup {
  userId: string;
  email: string | null;
  username: string | null;
  deletedAt: string;
}

interface UsersTrashRowProps {
  backup: DeletedUserBackup;
  isLoading: boolean;
  onRestore: () => void;
}

export function UsersTrashRow({ backup, isLoading, onRestore }: UsersTrashRowProps) {
  const t = useTranslations('admin');

  return (
    <tr className="border-b hover:bg-accent">
      <TableCell>{backup.username || '—'}</TableCell>
      <TableCell className="text-muted-foreground">{backup.email || '—'}</TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(backup.deletedAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={onRestore} disabled={isLoading}>
          <ArchiveRestore className="w-3 h-3 mr-1" />
          {t('users.restore')}
        </Button>
      </TableCell>
    </tr>
  );
}
