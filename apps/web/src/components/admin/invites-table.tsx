'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { User, Mail, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export interface InviteRequest {
  id: string;
  email: string;
  name: string;
  motivation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  trialSessionId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  generatedUsername: string | null;
  isDirect?: boolean | null;
}

interface InvitesTableProps {
  invites: InviteRequest[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  showCheckboxes?: boolean;
}

export function InvitesTable({
  invites,
  selectedIds,
  onSelectionChange,
  showCheckboxes = true,
}: InvitesTableProps) {
  const t = useTranslations('admin');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingInvites = invites.filter((i) => i.status === 'PENDING');
  const allSelected =
    pendingInvites.length > 0 && pendingInvites.every((i) => selectedIds.has(i.id));
  const someSelected = pendingInvites.some((i) => selectedIds.has(i.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(pendingInvites.map((i) => i.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (invites.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
        <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400">{t('invites.noRequestsFound')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
        {showCheckboxes && pendingInvites.length > 0 && (
          <div className="flex items-center">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={handleSelectAll}
              aria-label={t('invites.selectAll')}
            />
          </div>
        )}
        <div className={cn(!showCheckboxes && 'col-span-2')}>{t('invites.request')}</div>
        <div>{t('invites.status')}</div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {invites.map((invite) => (
          <InviteRow
            key={invite.id}
            invite={invite}
            isSelected={selectedIds.has(invite.id)}
            isExpanded={expandedId === invite.id}
            onToggleSelect={() => handleSelectOne(invite.id)}
            onToggleExpand={() => setExpandedId(expandedId === invite.id ? null : invite.id)}
            showCheckbox={showCheckboxes && invite.status === 'PENDING'}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
}

interface InviteRowProps {
  invite: InviteRequest;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  showCheckbox: boolean;
  formatDate: (date: string) => string;
}

function InviteRow({
  invite,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  showCheckbox,
  formatDate,
}: InviteRowProps) {
  const t = useTranslations('admin');
  return (
    <div className={cn('transition-colors', isSelected && 'bg-indigo-50 dark:bg-indigo-900/20')}>
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 items-center">
        {/* Checkbox column */}
        <div className="flex items-center">
          {showCheckbox ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              aria-label={t("selezionaInvite", { name: invite.name })}
            />
          ) : (
            <div className="w-5" /> // Spacer
          )}
        </div>

        {/* Main content */}
        <button onClick={onToggleExpand} className="flex items-start gap-3 text-left min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900 dark:text-white truncate">
                {invite.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{invite.email}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="shrink-0">{formatDate(invite.createdAt)}</span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          )}
        </button>

        {/* Status badge */}
        <InviteStatusBadge status={invite.status} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-12">
          <InviteDetails invite={invite} />
        </div>
      )}
    </div>
  );
}

function InviteDetails({ invite }: { invite: InviteRequest }) {
  const t = useTranslations('admin');

  return (
    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('invites.motivation')}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap ml-6">
        {invite.motivation}
      </p>

      {invite.isDirect && (
        <p className="mt-3 ml-6 text-sm text-indigo-600 dark:text-indigo-400">
          {t('invites.directAdminInvite')}
        </p>
      )}

      {invite.generatedUsername && (
        <p className="mt-3 ml-6 text-sm text-green-600 dark:text-green-400">
          {t('invites.username')}: {invite.generatedUsername}
        </p>
      )}

      {invite.rejectionReason && (
        <p className="mt-3 ml-6 text-sm text-red-600 dark:text-red-400">
          {t('invites.rejectionReason')}: {invite.rejectionReason}
        </p>
      )}
    </div>
  );
}

function InviteStatusBadge({ status }: { status: InviteRequest['status'] }) {
  const t = useTranslations('admin');

  const labels = {
    PENDING: t('invites.statusPending'),
    APPROVED: t('invites.statusApproved'),
    REJECTED: t('invites.statusRejected'),
  };

  const variants = {
    PENDING: 'pending' as const,
    APPROVED: 'approved' as const,
    REJECTED: 'rejected' as const,
  };

  return <StatusBadge variant={variants[status]}>{labels[status]}</StatusBadge>;
}

export default InvitesTable;
