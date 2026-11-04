const PARAM = 'conversationId';

export function readConversationParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(PARAM);
}

/** Ephemeral deep link on the current page: set only for persisted ids, cleared on new chat. */
export function writeConversationParam(id: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(PARAM, id);
  else if (!url.searchParams.has(PARAM)) return;
  else url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, '', url);
}
