import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAuthStorageAdapter } from './authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSupabaseProjectRef(url: string | undefined): string | null {
    if (!url) {
        return null;
    }

    try {
        return new URL(url).hostname.split('.')[0] || null;
    } catch {
        console.warn('Invalid Supabase URL');
        return null;
    }
}

export const SUPABASE_AUTH_STORAGE_KEY = (() => {
    const projectRef = getSupabaseProjectRef(supabaseUrl);
    return projectRef ? `sb-${projectRef}-auth-token` : '';
})();

let client: SupabaseClient | null = null;
let hasWarnedMissingConfig = false;

function createSupabaseBrowserClient(): SupabaseClient {
    if ((!supabaseUrl || !supabaseAnonKey) && !hasWarnedMissingConfig) {
        console.warn('Missing Supabase Environment Variables');
        hasWarnedMissingConfig = true;
    }

    return createClient(supabaseUrl || '', supabaseAnonKey || '', {
        auth: {
            persistSession: true,
            storage: createAuthStorageAdapter(),
            ...(SUPABASE_AUTH_STORAGE_KEY ? { storageKey: SUPABASE_AUTH_STORAGE_KEY } : {}),
        },
    });
}

export function getSupabaseClient(): SupabaseClient {
    if (!client) {
        client = createSupabaseBrowserClient();
    }

    return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, property) {
        const instance = getSupabaseClient();
        const value = Reflect.get(instance as object, property, instance);

        return typeof value === 'function' ? value.bind(instance) : value;
    },
}) as SupabaseClient;
