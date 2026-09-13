import { getSupabaseClient } from '../../lib/supabase';
import type { AuthorDeletePreview, AuthorFolder, AuthorFolderMembership, DeleteAuthorCascadeResult } from '../../types';
import { requireActiveUser, getNextSortIndex } from './libraryApiUtils';



export async function fetchAuthorFolders(userId: string) {
        const [{ data: folderRows, error: folderError }, { data: membershipRows, error: membershipError }] = await Promise.all([
            getSupabaseClient()
                .from('author_folders')
                .select('id, name, sort_index, created_at')
                .eq('user_id', userId)
                .order('sort_index', { ascending: true })
                .order('created_at', { ascending: true }),
            getSupabaseClient()
                .from('author_folder_memberships')
                .select('author_id, folder_id, created_at')
                .eq('user_id', userId),
        ]);
        if (folderError) throw folderError;
        if (membershipError) throw membershipError;
        return {
            folders: (folderRows || []).map((row) => ({
                id: row.id,
                name: row.name,
                sortIndex: row.sort_index,
                createdAt: new Date(row.created_at).getTime(),
            } as AuthorFolder)),
            memberships: (membershipRows || []).map((row) => ({
                authorId: row.author_id,
                folderId: row.folder_id,
                createdAt: new Date(row.created_at).getTime(),
            } as AuthorFolderMembership)),
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
        const { error } = await getSupabaseClient()
            .from('author_folders')
            .update({ name: trimmed })
            .eq('id', folderId)
            .eq('user_id', userId);
        if (error) throw error;
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
        return data as DeleteAuthorCascadeResult;
    }

export async function previewAuthorDeletion(userId: string, authorId: string) {
        await requireActiveUser(userId, 'author deletion preview');
        const { data, error } = await getSupabaseClient().rpc('preview_author_deletion', {
            expected_user_id: userId,
            source_author_id: authorId,
        });
        if (error) throw error;
        return data as AuthorDeletePreview;
    }
