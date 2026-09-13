import { getSupabaseClient } from '../../lib/supabase';
import type { AuthorSource } from '../../types';
import { requireActiveUser, GetOrCreateAuthorResult } from './libraryApiUtils';

type AuthorSourceRow = {
    id: string;
    name: string;
    sort_index: number | null;
    created_at: string;
    is_self: boolean;
};

const mapAuthorSourceRow = (row: AuthorSourceRow): AuthorSource => ({
    id: row.id,
    name: row.name,
    sortIndex: row.sort_index ?? null,
    createdAt: new Date(row.created_at).getTime(),
    isSelf: row.is_self,
});

type BookMergeInfo = {
    fromBookId: string;
    toBookId: string;
    toBookTitle: string;
    toBookSortIndex: number | null;
    toBookMemo: string;
};

type RenameAuthorResult = {
    merged: boolean;
    fromAuthorId: string;
    authorId: string;
    authorName: string;
    authorSortIndex: number | null;
    isSelf: boolean;
    folderId: string | null;
    bookMerges: BookMergeInfo[];
};

export async function fetchAuthors(userId: string) {
        const { data, error } = await getSupabaseClient()
            .from('authors')
            .select('id, name, sort_index, created_at, is_self')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((row: AuthorSourceRow) => mapAuthorSourceRow(row));
    }

export async function createAuthor(userId: string, name: string) {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author name is required');
        await requireActiveUser(userId, 'author creation');

        const { data, error } = await getSupabaseClient().rpc('get_or_create_author', {
            expected_user_id: userId,
            requested_name: trimmed,
        });
        if (error) throw error;
        const result = data as GetOrCreateAuthorResult;
        return {
            id: result.authorId,
            name: result.authorName,
            sortIndex: result.authorSortIndex,
            createdAt: new Date(result.authorCreatedAt).getTime(),
            isSelf: result.isSelf,
        } as AuthorSource;
    }

export async function reorderAuthors(userId: string, orderedAuthorIds: string[]) {
        await requireActiveUser(userId, 'author reorder');
        const { error } = await getSupabaseClient().rpc('reorder_authors', {
            ordered_author_ids: orderedAuthorIds,
        });
        if (error) throw error;
    }

export async function renameAuthor(userId: string, id: string, name: string): Promise<RenameAuthorResult> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author name is required');
        await requireActiveUser(userId, 'author rename');

        const { data, error } = await getSupabaseClient().rpc('rename_or_merge_author_with_folder', {
            source_author_id: id,
            requested_name: trimmed
        });
        if (error) throw error;
        return data as RenameAuthorResult;
    }
