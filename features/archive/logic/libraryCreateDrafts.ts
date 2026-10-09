import { useState, useSyncExternalStore } from 'react';

type LibraryCreateDraft = { open: boolean; value: string; saving: boolean };
const EMPTY_DRAFT: LibraryCreateDraft = { open: false, value: '', saving: false };

/** Owned by the signed-in shell; creation survives layout changes and is scoped by author. */
export class LibraryCreateDraftStore extends Map<string, LibraryCreateDraft> {
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  patch(scope: string, update: Partial<LibraryCreateDraft>) {
    super.set(scope, { ...(this.get(scope) ?? EMPTY_DRAFT), ...update });
    this.listeners.forEach(listener => listener());
  }
}

export function useLibraryCreateDraft(scope: string, suppliedStore?: LibraryCreateDraftStore) {
  const [localStore] = useState(() => new LibraryCreateDraftStore());
  const store = suppliedStore ?? localStore;
  const draft = useSyncExternalStore(store.subscribe, () => store.get(scope) ?? EMPTY_DRAFT);
  return {
    draft,
    patch: (update: Partial<LibraryCreateDraft>) => store.patch(scope, update),
    beginSubmit: () => {
      if (store.get(scope)?.saving) return false;
      store.patch(scope, { saving: true });
      return true;
    },
  };
}
