import { getSupabaseClient } from '../../lib/supabase';
import type { BookSource } from '../../types';

export type BookSourceRow = {
    id: string;
    title: string;
    memo: string | null;
    sort_index: number | null;
    created_at: string;
    author?: {
        id: string;
        name: string;
        sort_index: number | null;
        is_self: boolean;
    } | Array<{
        id: string;
        name: string;
        sort_index: number | null;
        is_self: boolean;
    }> | null;
};

export type GetOrCreateAuthorResult = {
    authorId: string;
    authorName: string;
    authorSortIndex: number | null;
    authorCreatedAt: string;
    isSelf: boolean;
};

export const mapBookSourceRow = (row: BookSourceRow): BookSource => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
        id: row.id,
        title: row.title,
        memo: row.memo || '',
        sortIndex: row.sort_index ?? null,
        createdAt: new Date(row.created_at).getTime(),
        authorId: author?.id || '',
        author: author?.name || '',
        authorSortIndex: author?.sort_index ?? null,
        isSelf: author?.is_self || false,
    };
};

export const getNextSortIndex = async (
    table: 'projects' | 'authors' | 'books' | 'author_folders',
    userId: string,
    filters: Record<string, string> = {}
) => {
    let query = getSupabaseClient()
        .from(table)
        .select('sort_index')
        .eq('user_id', userId)
        .order('sort_index', { ascending: false, nullsFirst: false })
        .limit(1);

    Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
    });

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return (data?.sort_index ?? -1) + 1;
};

export const requireActiveUser = async (userId: string, action: string) => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error || data.session?.user.id !== userId) {
        throw error || new Error(`Active user changed before ${action}`);
    }
};
