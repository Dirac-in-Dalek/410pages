import { parseAuthorDeleteResult, parseAuthorDeletePreview } from './libraryMutationResults';
import { fetchAllRows } from './pagination';
import { getSupabaseClient } from '../../lib/supabase';
import type { AuthorFolder, AuthorFolderMembership } from '../../types';
import { requireActiveUser, getNextSortIndex } from './libraryApiUtils';
import { requireMutationRow } from './mutationResult';



export async function fetchAuthorFolders(userId: string) {
    const [folders, memberships] = await Promise.all([
        fetchAllRows((from, to) => getSupabaseClient().from('author_folders')
            .select('id, name, sort_index, created_at').eq('user_id', userId)
            .order('sort_index').order('created_at').order('id').range(from, to)),
        fetchAllRows((from, to) => getSupabaseClient().from('author_folder_memberships')
            .select('author_id, folder_id, created_at').eq('user_id', userId)
            .order('author_id').range(from, to)),
    ]);
    return {
        folders: folders.map(row => ({ id: row.id, name: row.name, sortIndex: row.sort_index,
            createdAt: new Date(row.created_at).getTime() } as AuthorFolder)),
        memberships: memberships.map(row => ({ authorId: row.author_id, folderId: row.folder_id,
            createdAt: new Date(row.created_at).getTime() } as AuthorFolderMembership)),
    };
}

export async function createAuthorFolder(userId: string, name: string) {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author folder name is required');
        const sortIndex = await getNextSortIndex('author_folders', userId);
        const { data, error } = await getSupabaseClient()
            .from('author_folders')
            .insert({ user_id: userId, name: trimmed, sort_index: sortIndex })
            .select('id, name, sort_index, created_at')
            .single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            sortIndex: data.sort_index,
            createdAt: new Date(data.created_at).getTime(),
        } as AuthorFolder;
    }

export async function renameAuthorFolder(userId: string, folderId: string, name: string) {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author folder name is required');
        const { data, error } = await getSupabaseClient()
            .from('author_folders')
            .update({ name: trimmed })
            .eq('id', folderId)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();
        requireMutationRow(data, error, 'Author folder');
    }

export async function deleteAuthorFolder(userId: string, folderId: string) {
        const { error } = await getSupabaseClient()
            .from('author_folders')
            .delete()
            .eq('id', folderId)
            .eq('user_id', userId);
        if (error) throw error;
    }

export async function moveAuthorToFolder(userId: string, authorId: string, folderId: string) {
        const { data, error } = await getSupabaseClient()
            .from('author_folder_memberships')
            .upsert({ author_id: authorId, folder_id: folderId, user_id: userId }, { onConflict: 'author_id' })
            .select('author_id, folder_id, created_at')
            .single();
        if (error) throw error;
        return {
            authorId: data.author_id,
            folderId: data.folder_id,
            createdAt: new Date(data.created_at).getTime(),
        } as AuthorFolderMembership;
    }

export async function removeAuthorFromFolder(userId: string, authorId: string) {
        const { error } = await getSupabaseClient()
            .from('author_folder_memberships')
            .delete()
            .eq('author_id', authorId)
            .eq('user_id', userId);
        if (error) throw error;
    }

export async function deleteAuthorCascade(userId: string, authorId: string) {
        await requireActiveUser(userId, 'author deletion');
        const { data, error } = await getSupabaseClient().rpc('delete_author_cascade', {
            expected_user_id: userId,
            source_author_id: authorId,
        });
        if (error) throw error;
        return parseAuthorDeleteResult(data);
    }

export async function previewAuthorDeletion(userId: string, authorId: string) {
        await requireActiveUser(userId, 'author deletion preview');
        const { data, error } = await getSupabaseClient().rpc('preview_author_deletion', {
            expected_user_id: userId,
            source_author_id: authorId,
        });
        if (error) throw error;
        return parseAuthorDeletePreview(data);
    }
