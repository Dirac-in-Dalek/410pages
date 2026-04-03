import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
    clearAutoLoginEnabled,
    clearSupabaseSessionArtifacts,
    reconcileSupabaseSessionArtifacts,
} from '../lib/authStorage';
import { getSupabaseClient, SUPABASE_AUTH_STORAGE_KEY } from '../lib/supabase';

export const useAuthStatus = () => {
    const [session, setSession] = useState<any>(null);
    const [username, setUsername] = useState('Researcher');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await getSupabaseClient()
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            setUsername(data?.username || 'Researcher');
            setAvatarUrl(data?.avatar_url || null);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setUsername('Researcher');
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
            setUsername('Researcher');
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
                    setLoading(true);
                fetchProfile(session.user.id);
            } else {
                setUsername('Researcher');
                setAvatarUrl(null);
                setLoading(false);
            }
        })
            .catch((error) => {
                console.error('Error restoring session:', error);
                setSession(null);
                setUsername('Researcher');
                setLoading(false);
            });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                fetchProfile(session.user.id);
            } else {
                setUsername('Researcher');
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
