'use client';

import { useEffect, useRef, useState } from 'react';
import { collectUserSelection } from '@/lib/admin/user-list-export';
import type { ListedUser, UserListQuery } from '@/lib/admin/user-list-types';

type SelectedUser = Pick<ListedUser, 'id' | 'username' | 'email'>;

export function useUserListSelection(query: UserListQuery) {
  const scope = `${query.tab}\0${query.search}\0${query.staging}`;
  const [state, setState] = useState({
    scope,
    selected: new Map<string, SelectedUser>(),
    loading: false,
    error: false,
  });
  const request = useRef<AbortController | null>(null);
  if (state.scope !== scope) {
    setState({ scope, selected: new Map(), loading: false, error: false });
  }
  useEffect(() => () => request.current?.abort(), [scope]);
  const update = (change: (selected: Map<string, SelectedUser>) => Map<string, SelectedUser>) =>
    setState((previous) =>
      previous.scope === scope ? { ...previous, selected: change(previous.selected) } : previous,
    );
  const toggle = (user: ListedUser) =>
    update((selected) => {
      const next = new Map(selected);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, { id: user.id, username: user.username, email: user.email });
      return next;
    });
  const togglePage = (users: ListedUser[]) =>
    update((selected) => {
      const allSelected = users.every((user) => selected.has(user.id));
      const next = new Map(selected);
      for (const user of users) {
        if (allSelected) next.delete(user.id);
        else next.set(user.id, { id: user.id, username: user.username, email: user.email });
      }
      return next;
    });
  const selectMatching = async () => {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setState((previous) => ({ ...previous, loading: true, error: false }));
    try {
      const rows = await collectUserSelection(query, (url) =>
        fetch(url, { signal: controller.signal }),
      );
      if (!controller.signal.aborted) update(() => new Map(rows.map((user) => [user.id, user])));
    } catch {
      if (!controller.signal.aborted)
        setState((previous) =>
          previous.scope === scope ? { ...previous, error: true } : previous,
        );
    } finally {
      if (request.current === controller) {
        setState((previous) =>
          previous.scope === scope ? { ...previous, loading: false } : previous,
        );
      }
    }
  };
  return {
    selected: state.selected,
    loading: state.loading,
    error: state.error,
    toggle,
    togglePage,
    clear: () => update(() => new Map()),
    selectMatching,
  };
}
