'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useStagingDataFilter } from '@/hooks/use-staging-data-filter';
import { parseUserListQuery, userListUrl } from '@/lib/admin/user-list-query';
import type { UserListQuery } from '@/lib/admin/user-list-types';

export function useUserListNavigation(query: UserListQuery, stagingSpecified: boolean) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.search);
  const submitted = useRef<string | null>(null);
  const initialized = useRef(false);
  const { showStagingData, setShowStagingData } = useStagingDataFilter();

  const navigate = useCallback(
    (patch: Partial<UserListQuery>) => {
      const next = { ...query, ...patch };
      const checked = parseUserListQuery({
        tab: next.tab,
        page: String(next.page),
        pageSize: String(next.pageSize),
        staging: String(next.staging),
        search: next.search,
      });
      startTransition(() => router.push(userListUrl(checked), { scroll: false }));
    },
    [query, router],
  );

  useEffect(() => {
    const previous = submitted.current;
    submitted.current = null;
    setSearch((draft) => (previous !== null && draft !== previous ? draft : query.search));
  }, [query.search]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!stagingSpecified && showStagingData !== query.staging) {
      navigate({ staging: showStagingData, page: 1 });
    }
  }, [stagingSpecified, showStagingData, query.staging, navigate]);

  return {
    search,
    setSearch,
    pending,
    submitSearch: (value: string) => {
      setSearch(value);
      submitted.current = value;
      navigate({ search: value, page: 1 });
    },
    setTab: (tab: string) => {
      const parsed = parseUserListQuery({ tab });
      navigate({ tab: parsed.tab, page: 1 });
    },
    setStaging: (staging: boolean) => {
      setShowStagingData(staging);
      navigate({ staging, page: 1 });
    },
    setPage: (page: number) => navigate({ page }),
    setPageSize: (pageSize: number) => navigate({ pageSize, page: 1 }),
  };
}
