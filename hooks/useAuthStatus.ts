import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export const useAuthStatus = () => {
    const [session, setSession] = useState<any>(null);
    const [username, setUsername] = useState('Researcher');
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .single();

            if (data?.username) {
                setUsername(data.username);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
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
        await supabase.auth.signOut();
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
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
