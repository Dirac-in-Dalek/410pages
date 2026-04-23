export {
  AUTO_LOGIN_STORAGE_KEY,
  REMEMBERED_EMAIL_STORAGE_KEY,
  clearAutoLoginEnabled,
  clearRememberedEmail,
  clearSupabaseSessionArtifacts,
  createAuthStorageAdapter,
  readAutoLoginEnabled,
  readRememberedEmail,
  reconcileSupabaseSessionArtifacts,
  setAutoLoginEnabled,
  setRememberedEmail,
} from '../features/auth/policy/storage';
