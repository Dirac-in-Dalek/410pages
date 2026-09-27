import { generateBookPosition, getBookPosition } from '../../lib/bookOrder';
import { getSupabaseClient } from '../../lib/supabase';
import type { BookPosition } from '../../types';

type OrderedTable = 'citations' | 'chapter_blocks';

const ORDERED_TABLES: OrderedTable[] = ['citations', 'chapter_blocks'];
const MAX_ORDER_RETRIES = 3;

export const validateBookPosition = (position: BookPosition, message = 'Invalid book position') => {
    if (typeof position === 'number') {
        if (!Number.isFinite(position)) throw new Error(message);
        return position;
    }
    if (getBookPosition({ createdAtSort: 0, orderKey: position }) !== position) {
        throw new Error(message);
    }
    return position;
};

const findBoundaryKey = async (
    userId: string,
    bookId: string,
    after?: string,
): Promise<string | undefined> => {
    const reads = ORDERED_TABLES.map((table) => {
        let query = getSupabaseClient()
            .from(table)
            .select('order_key')
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .not('order_key', 'is', null);
        if (after !== undefined) query = query.gt('order_key', after);
        return query
            .order('order_key', { ascending: after !== undefined, nullsFirst: false })
            .limit(1)
            .maybeSingle();
    });
    const results = await Promise.all(reads);
    for (const result of results) {
        if (result.error) throw result.error;
    }
    const keys = results.flatMap(({ data }) =>
        typeof data?.order_key === 'string' ? [data.order_key] : []
    );
    if (keys.length === 0) return undefined;
    return after === undefined
        ? keys.reduce((max, key) => key > max ? key : max)
        : keys.reduce((min, key) => key < min ? key : min);
};

export const createAppendBookOrderKey = async (userId: string, bookId: string) =>
    generateBookPosition(await findBoundaryKey(userId, bookId));

export const isBookOrderConflict = (error: unknown) => {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '23505') return false;
    const record = error as Record<string, unknown>;
    const description = [record.message, record.details, record.constraint]
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    return description.includes('Duplicate book order key')
        || description.includes('book_order_key_unique')
        || description.includes('citations_book_order_unique')
        || description.includes('chapters_book_order_unique');
};

export const mutateWithBookOrderRetry = async <T extends { order_key?: string | null }>(
    userId: string,
    bookId: string,
    initialOrderKey: string,
    mutate: (orderKey: string) => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> => {
    let orderKey = validateBookPosition(initialOrderKey) as string;
    for (let attempt = 0; ; attempt += 1) {
        const { data, error } = await mutate(orderKey);
        if (!error) {
            if (!data || typeof data.order_key !== 'string') {
                throw new Error('Book order key missing from mutation response');
            }
            return data;
        }
        if (!isBookOrderConflict(error) || attempt === MAX_ORDER_RETRIES) throw error;
        orderKey = generateBookPosition(orderKey, await findBoundaryKey(userId, bookId, orderKey));
    }
};
