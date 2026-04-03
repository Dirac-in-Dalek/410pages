import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
    clearAutoLoginEnabled,
    clearSupabaseSessionArtifacts,
    reconcileSupabaseSessionArtifacts,
} from '../lib/authStorage';
import { getSupabaseClient, SUPABASE_AUTH_STORAGE_KEY } from '../lib/supabase';

const DEFAULT_USERNAME = 'Researcher';
const PROFILE_DISPLAY_NAME_STORAGE_PREFIX = 'profileDisplayName:';

function getDisplayNameStorageKey(userId: string) {
    return `${PROFILE_DISPLAY_NAME_STORAGE_PREFIX}${userId}`;
}

function readCachedDisplayName(userId: string): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const cached = window.localStorage.getItem(getDisplayNameStorageKey(userId))?.trim();
        return cached || null;
    } catch {
        return null;
    }
}

function writeCachedDisplayName(userId: string, displayName: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(getDisplayNameStorageKey(userId), displayName);
    } catch {
        // Ignore localStorage write failures in restricted environments.
    }
}

function clearCachedDisplayName(userId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(getDisplayNameStorageKey(userId));
    } catch {
        // Ignore localStorage write failures in restricted environments.
    }
}

function readSessionDisplayName(session: any): string | null {
    const metadataName = session?.user?.user_metadata?.username;
    return typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null;
}

function resolveDisplayNameFallback(userId: string, session: any): string {
    return readCachedDisplayName(userId) || readSessionDisplayName(session) || DEFAULT_USERNAME;
}

export const useAuthStatus = () => {
    const [session, setSession] = useState<any>(null);
    const [username, setUsername] = useState(DEFAULT_USERNAME);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string, activeSession: any) => {
        const fallbackUsername = resolveDisplayNameFallback(userId, activeSession);

        try {
            const { data, error } = await getSupabaseClient()
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            const nextUsername = typeof data?.username === 'string' && data.username.trim()
                ? data.username.trim()
                : fallbackUsername;

            setUsername(nextUsername);
            setAvatarUrl(data?.avatar_url || null);
            writeCachedDisplayName(userId, nextUsername);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setUsername(fallbackUsername);
            setAvatarUrl(null);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUsername = async (newUsername: string) => {
        if (!session) return;
        const trimmed = newUsername.trim();
        if (!trimmed) return false;
        if (trimmed === username.trim()) return true;

        try {
            await api.updateProfile(session.user.id, { username: trimmed });
            setUsername(trimmed);
            writeCachedDisplayName(session.user.id, trimmed);
            return true;
        } catch (error) {
            console.error('Error updating username:', error);
            return false;
        }
    };

    const handleUpdateAvatar = async (file: File) => {
        if (!session || !file) return false;

        try {
            const nextAvatarUrl = await api.uploadProfileAvatar(session.user.id, file, avatarUrl);
            await api.updateProfile(session.user.id, { avatar_url: nextAvatarUrl });
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
            clearAutoLoginEnabled();

            if (SUPABASE_AUTH_STORAGE_KEY) {
                clearSupabaseSessionArtifacts(SUPABASE_AUTH_STORAGE_KEY);
            }

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
        if (SUPABASE_AUTH_STORAGE_KEY) {
            reconcileSupabaseSessionArtifacts(SUPABASE_AUTH_STORAGE_KEY);
        }

        const supabase = getSupabaseClient();

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
                if (session) {
                    setUsername(resolveDisplayNameFallback(session.user.id, session));
                    setLoading(true);
                    fetchProfile(session.user.id, session);
                } else {
                    setUsername(DEFAULT_USERNAME);
                    setAvatarUrl(null);
                    setLoading(false);
                }
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
            setSession(session);
            if (session) {
                setUsername(resolveDisplayNameFallback(session.user.id, session));
                setLoading(true);
                fetchProfile(session.user.id, session);
            } else {
                setUsername(DEFAULT_USERNAME);
                setAvatarUrl(null);
                setLoading(false);
            }
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
        handleSignOut
    };
};
