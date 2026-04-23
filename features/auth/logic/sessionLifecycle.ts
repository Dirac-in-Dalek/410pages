import {
  clearAutoLoginEnabled,
  clearSupabaseSessionArtifacts,
  reconcileSupabaseSessionArtifacts,
} from '../policy/storage';

export function reconcilePersistedAuthSession(storageKey: string | null | undefined): void {
  if (!storageKey) {
    return;
  }

  reconcileSupabaseSessionArtifacts(storageKey);
}

export function clearPersistedAuthSession(storageKey: string | null | undefined): void {
  clearAutoLoginEnabled();

  if (!storageKey) {
    return;
  }

  clearSupabaseSessionArtifacts(storageKey);
}
