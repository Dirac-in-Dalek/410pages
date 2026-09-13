import { getSupabaseClient } from '../../lib/supabase';
import type { ChapterBlock, CreateChapterBlockInput } from '../../types';

type ChapterBlockRow = {
    id: string;
    book_id: string;
    label: string;
    depth?: number;
    page_sort: number | null;
    created_at_sort: number;
    created_at: string;
};

const mapChapterBlockRow = (row: ChapterBlockRow): ChapterBlock => ({
    id: row.id,
    bookId: row.book_id,
    label: row.label,
    ...(row.depth == null ? {} : { depth: row.depth }),
    pageSort: row.page_sort ?? undefined,
    createdAtSort: row.created_at_sort,
    createdAt: new Date(row.created_at).getTime(),
});

export async function fetchChapterBlocks(userId: string, bookId: string) {
        const { data, error } = await getSupabaseClient()
            .from('chapter_blocks')
            .select('*')
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .order('created_at_sort', { ascending: true });
        if (error) throw error;
        return (data || []).map(mapChapterBlockRow);
    }

export async function createChapterBlock(userId: string, input: CreateChapterBlockInput) {
        if (input.depth !== undefined && (!Number.isInteger(input.depth) || input.depth < 0)) throw new Error('Invalid chapter depth');
        const { data, error } = await getSupabaseClient()
            .from('chapter_blocks')
            .insert({
                book_id: input.bookId,
                label: input.label,
                ...(input.depth === undefined ? {} : { depth: input.depth }),
                page_sort: input.pageSort,
                created_at_sort: input.createdAtSort,
                user_id: userId,
            })
            .select('*')
            .single();
        if (error) throw error;
        return mapChapterBlockRow(data);
    }

export async function moveChapterBlock(userId: string, bookId: string, id: string, createdAtSort: number, depth?: number) {
        if (!Number.isFinite(createdAtSort)) throw new Error('Invalid chapter position');
        if (depth !== undefined && (!Number.isInteger(depth) || depth < 0)) throw new Error('Invalid chapter depth');
        const { data, error } = await getSupabaseClient().from('chapter_blocks')
            .update({ created_at_sort: createdAtSort, ...(depth === undefined ? {} : { depth }) }).eq('user_id', userId).eq('book_id', bookId).eq('id', id)
            .select('*').single();
        if (error) throw error;
        return mapChapterBlockRow(data);
    }

export async function renameChapterBlock(userId: string, bookId: string, id: string, label: string, depth?: number) {
        const trimmed = label.trim();
        if (!trimmed) throw new Error('Chapter title is required');
        if (depth !== undefined && (!Number.isInteger(depth) || depth < 0)) throw new Error('Invalid chapter depth');
        const { data, error } = await getSupabaseClient().from('chapter_blocks')
            .update({ label: trimmed, ...(depth === undefined ? {} : { depth }) }).eq('user_id', userId).eq('book_id', bookId).eq('id', id)
            .select('*').single();
        if (error) throw error;
        return mapChapterBlockRow(data);
    }

export async function deleteChapterBlock(userId: string, id: string) {
        const { error } = await getSupabaseClient()
            .from('chapter_blocks')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    }
