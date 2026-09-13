'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StagingDataToggle } from '@/components/admin/staging-data-toggle';
import type { UserListPage } from '@/lib/admin/user-list-types';
import { UsersSearch } from './users-search';
import { UsersExport } from './users-export';

export function UsersListControls({
  listing,
  search,
  pending,
  setSearch,
  submitSearch,
  setTab,
  setStaging,
}: {
  listing: UserListPage;
  search: string;
  pending: boolean;
  setSearch: (value: string) => void;
  submitSearch: (value: string) => void;
  setTab: (value: string) => void;
  setStaging: (value: boolean) => void;
}) {
  const t = useTranslations('admin.users');
  const tabs = [
    { value: 'all', icon: '\u{1F465}', count: listing.totalUsers },
    { value: 'active', icon: '\u2713' },
    { value: 'disabled', icon: '\u{1F6AB}' },
    { value: 'trash', icon: '\u{1F5D1}', count: listing.trashTotal },
  ];
  return (
    <>
      {listing.query.tab !== 'trash' && (
        <div className="mb-4">
          <StagingDataToggle
            showStagingData={listing.query.staging}
            onToggle={setStaging}
            hiddenCount={!listing.query.staging ? listing.stagingCount : undefined}
          />
        </div>
      )}
      <Tabs value={listing.query.tab} onValueChange={setTab}>
        <TabsList className="mb-4 overflow-x-auto snap-x snap-mandatory md:overflow-visible md:snap-none">
          {tabs.map((tab) => {
            const label = `${t(`tabs.${tab.value}`)}${tab.count === undefined ? '' : ` (${tab.count})`}`;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                title={label}
                disabled={pending}
                className="min-h-11 min-w-11 md:min-w-auto"
              >
                <span className="sr-only">{label}</span>
                <span className="md:hidden">{tab.icon}</span>
                <span className="hidden md:inline">{label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <UsersSearch
            value={search}
            onChange={setSearch}
            onSubmit={submitSearch}
            disabled={pending}
          />
        </div>
        {listing.query.tab !== 'trash' && (
          <UsersExport query={listing.query} disabled={pending || listing.total === 0} />
        )}
      </div>
    </>
  );
}
