type Factory<T> = () => Promise<T>;

const inflight = new Map<string, Promise<unknown>>();

export function getOrCreateCachedRequest<T>(key: string, factory: Factory<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const created = factory().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, created);
  return created;
}
