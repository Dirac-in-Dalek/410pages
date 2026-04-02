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
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await getSupabaseClient()
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            setUsername(data?.username || 'Researcher');
        } catch (error) {
            console.error('Error fetching profile:', error);
            setUsername('Researcher');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUsername = async (newUsername: string) => {
        if (!session) return;
        try {
            await api.updateProfile(session.user.id, newUsername);
            setUsername(newUsername);
        } catch (error) {
            console.error('Error updating username:', error);
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
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return {
        session,
        username,
        loading,
        setLoading,
        handleUpdateUsername,
        handleSignOut
    };
};
