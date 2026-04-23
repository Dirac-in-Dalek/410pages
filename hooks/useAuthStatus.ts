import { useEffect, useState } from 'react';
import {
    clearPersistedAuthSession,
    reconcilePersistedAuthSession,
} from '../features/auth/logic/sessionLifecycle';
import {
    buildFallbackProfileSnapshot,
    fetchProfileSnapshot,
    saveProfileDisplayName,
    uploadProfileAvatar,
} from '../features/profile/logic/profileAccount';
import { DEFAULT_USERNAME, clearCachedDisplayName } from '../features/profile/policy/displayNameCache';
import { getSupabaseClient, SUPABASE_AUTH_STORAGE_KEY } from '../lib/supabase';

export const useAuthStatus = () => {
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, activeSession: any) => {
    const fallbackProfile = buildFallbackProfileSnapshot(userId, activeSession);

    try {
      const profile = await fetchProfileSnapshot(userId, activeSession);
      setUsername(profile.username);
      setAvatarUrl(profile.avatarUrl);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUsername(fallbackProfile.username);
      setAvatarUrl(fallbackProfile.avatarUrl);
    } finally {
      setLoading(false);
    }
  };

  const applySession = (nextSession: any) => {
    setSession(nextSession);

    if (nextSession?.user?.id) {
      const fallbackProfile = buildFallbackProfileSnapshot(nextSession.user.id, nextSession);
      setUsername(fallbackProfile.username);
      setLoading(true);
      void fetchProfile(nextSession.user.id, nextSession);
      return;
    }

    setUsername(DEFAULT_USERNAME);
    setAvatarUrl(null);
    setLoading(false);
  };

  const handleUpdateUsername = async (newUsername: string) => {
    if (!session) return;

    try {
      const result = await saveProfileDisplayName(session.user.id, username, newUsername);

      if (result.ok && result.changed && result.username) {
        setUsername(result.username);
      }

      return result.ok;
    } catch (error) {
      console.error('Error updating username:', error);
      return false;
    }
  };

  const handleUpdateAvatar = async (file: File) => {
    if (!session || !file) return false;

    try {
      setAvatarUrl(await uploadProfileAvatar(session.user.id, file));
      return true;
    } catch (error) {
      console.error('Error updating avatar:', error);
      return false;
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      const { error } = await getSupabaseClient().auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      clearPersistedAuthSession(SUPABASE_AUTH_STORAGE_KEY);

      setSession(null);
      if (session?.user?.id) {
        clearCachedDisplayName(session.user.id);
      }
      setUsername(DEFAULT_USERNAME);
      setAvatarUrl(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    reconcilePersistedAuthSession(SUPABASE_AUTH_STORAGE_KEY);

    const supabase = getSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        applySession(session);
      })
      .catch((error) => {
        console.error('Error restoring session:', error);
        setSession(null);
        setUsername(DEFAULT_USERNAME);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    username,
    avatarUrl,
    loading,
    setLoading,
    handleUpdateUsername,
    handleUpdateAvatar,
    handleSignOut,
  };
};
