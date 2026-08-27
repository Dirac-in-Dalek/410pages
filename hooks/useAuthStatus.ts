import { useEffect, useRef, useState } from 'react';
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const sessionGenerationRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchProfile = async (userId: string, activeSession: any, generation: number) => {
    const fallbackProfile = buildFallbackProfileSnapshot(userId, activeSession);
    const isCurrent = () =>
      isMountedRef.current &&
      sessionGenerationRef.current === generation &&
      currentUserIdRef.current === userId;

    try {
      const profile = await fetchProfileSnapshot(userId, activeSession);
      if (!isCurrent()) return;
      setUsername(profile.username);
      setAvatarUrl(profile.avatarUrl);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (!isCurrent()) return;
      setUsername(fallbackProfile.username);
      setAvatarUrl(fallbackProfile.avatarUrl);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  const applySession = (nextSession: any) => {
    const generation = ++sessionGenerationRef.current;
    currentUserIdRef.current = nextSession?.user?.id ?? null;
    setSession(nextSession);

    if (nextSession?.user?.id) {
      const fallbackProfile = buildFallbackProfileSnapshot(nextSession.user.id, nextSession);
      setUsername(fallbackProfile.username);
      setAvatarUrl(fallbackProfile.avatarUrl);
      setLoading(true);
      void fetchProfile(nextSession.user.id, nextSession, generation);
      return;
    }

    setUsername(DEFAULT_USERNAME);
    setAvatarUrl(null);
    setLoading(false);
  };

  const handleUpdateUsername = async (newUsername: string) => {
    if (!session) return;
    const userId = session.user.id;

    try {
      const result = await saveProfileDisplayName(userId, username, newUsername);

      if (currentUserIdRef.current === userId && result.ok && result.changed && result.username) {
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
    const userId = session.user.id;

    try {
      const nextAvatarUrl = await uploadProfileAvatar(userId, file);
      if (currentUserIdRef.current !== userId) return false;
      setAvatarUrl(nextAvatarUrl);
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

      sessionGenerationRef.current += 1;
      currentUserIdRef.current = null;
      setSession(null);
      if (session?.user?.id) {
        clearCachedDisplayName(session.user.id);
      }
      setUsername(DEFAULT_USERNAME);
      setAvatarUrl(null);
      setIsPasswordRecovery(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    reconcilePersistedAuthSession(SUPABASE_AUTH_STORAGE_KEY);

    const supabase = getSupabaseClient();

    const restoreGeneration = sessionGenerationRef.current;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMountedRef.current || sessionGenerationRef.current !== restoreGeneration) return;
        applySession(session);
      })
      .catch((error) => {
        if (!isMountedRef.current || sessionGenerationRef.current !== restoreGeneration) return;
        console.error('Error restoring session:', error);
        setSession(null);
        setUsername(DEFAULT_USERNAME);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        applySession(session);
        return;
      }

      if (!session) {
        setIsPasswordRecovery(false);
      }
      applySession(session);
    });

    return () => {
      isMountedRef.current = false;
      sessionGenerationRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    username,
    avatarUrl,
    loading,
    isPasswordRecovery,
    setLoading,
    completePasswordRecovery: () => setIsPasswordRecovery(false),
    handleUpdateUsername,
    handleUpdateAvatar,
    handleSignOut,
  };
};
