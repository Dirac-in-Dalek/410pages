import { getSupabaseClient } from '../../lib/supabase';
import type { BookDeletePreview, BookSource, CreateBookInput, DeleteBookCascadeResult } from '../../types';
import { requireActiveUser, GetOrCreateAuthorResult, BookSourceRow, mapBookSourceRow } from './libraryApiUtils';

type GetOrCreateBookResult = GetOrCreateAuthorResult & {
    bookId: string;
    bookTitle: string;
    bookSortIndex: number | null;
    bookCreatedAt: string;
};

export type RenameBookResult = {
    merged: boolean;
    fromBookId: string;
    bookId: string;
    bookTitle: string;
    bookSortIndex: number | null;
    bookMemo: string;
};

export async function fetchBooks(userId: string) {
        const { data, error } = await getSupabaseClient()
            .from('books')
            .select(`
        id,
        title,
        memo,
        sort_index,
        created_at,
        author:authors(id, name, sort_index, is_self)
      `)
            .eq('user_id', userId)
            .order('sort_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []).map((row: BookSourceRow) => mapBookSourceRow(row));
    }

export async function deleteBookCascade(userId: string, bookId: string) {
        await requireActiveUser(userId, 'book deletion');
        const { data, error } = await getSupabaseClient().rpc('delete_book_cascade', {
            expected_user_id: userId,
            source_book_id: bookId,
        });
        if (error) throw error;
        return data as DeleteBookCascadeResult;
    }

export async function previewBookDeletion(userId: string, bookId: string) {
        await requireActiveUser(userId, 'book deletion preview');
        const { data, error } = await getSupabaseClient().rpc('preview_book_deletion', {
            expected_user_id: userId,
            source_book_id: bookId,
        });
        if (error) throw error;
        return data as BookDeletePreview;
    }

export async function createBook(userId: string, input: CreateBookInput) {
        const title = input.title.trim();
        if (!input.authorId || !title) throw new Error('Author and book title are required');
        await requireActiveUser(userId, 'book creation');

        const { data, error } = await getSupabaseClient().rpc('get_or_create_book', {
            expected_user_id: userId,
            source_author_id: input.authorId,
            requested_title: title,
        });
        if (error) throw error;
        const result = data as GetOrCreateBookResult;

        return {
            id: result.bookId,
            title: result.bookTitle,
            memo: '',
            sortIndex: result.bookSortIndex,
            createdAt: new Date(result.bookCreatedAt).getTime(),
            authorId: result.authorId,
            author: result.authorName,
            authorSortIndex: result.authorSortIndex,
            isSelf: result.isSelf,
        } as BookSource;
    }

export async function reorderBooks(userId: string, authorId: string, orderedBookIds: string[]) {
        await requireActiveUser(userId, 'book reorder');
        const { error } = await getSupabaseClient().rpc('reorder_books', {
            source_author_id: authorId,
            ordered_book_ids: orderedBookIds,
        });
        if (error) throw error;
    }

export async function renameBook(userId: string, id: string, name: string): Promise<RenameBookResult> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Book title is required');
        await requireActiveUser(userId, 'book rename');

        const { data, error } = await getSupabaseClient().rpc('rename_or_merge_book', {
            source_book_id: id,
            requested_title: trimmed
        });
        if (error) throw error;
        return data as RenameBookResult;
    }

export async function updateBookMemo(userId: string, id: string, memo: string) {
        await requireActiveUser(userId, 'book memo update');
        const { data, error } = await getSupabaseClient()
            .from('books')
            .update({ memo })
            .eq('id', id)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Book no longer exists');
    }
