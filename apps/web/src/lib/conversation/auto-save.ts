type SaveHandler<T> = (payload: T) => Promise<void>;

export function createAutoSave<T>(save: SaveHandler<T>, delayMs = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (payload: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void save(payload);
    }, delayMs);
  };
}
