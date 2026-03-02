const listeners = new Set<() => void>();

export function subscribeLocalDataChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLocalDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}
