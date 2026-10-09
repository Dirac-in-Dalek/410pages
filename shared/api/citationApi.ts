import type { Tables, TablesUpdate } from './database.types';
import type { Highlight } from '../../types';
import { fetchAllRows } from './pagination';
import { requireMutationRow } from './mutationResult';
import type { CitationUpdate } from '../../types';
import { normalizeTextFormats } from '../logic/textFormats';
import { saveTextFormatting } from './textFormattingApi';
import type { TextFormatRange } from '../../types';
import { getSupabaseClient } from '../../lib/supabase';
import { compareBookPositions, generateBookPosition, getBookPosition, legacyOrderKey } from '../../lib/bookOrder';
import type { AddCitationInput, BookPosition, Citation, CitationSourceInput, Note } from '../../types';
import { requireActiveUser, getNextSortIndex, BookSourceRow, mapBookSourceRow } from './libraryApiUtils';
import { createAppendBookOrderKey, isBookOrderConflict, mutateWithBookOrderRetry, validateBookPosition } from './bookOrderApi';

const extractPageSort = (page: string | undefined): number | undefined => {
    if (!page) return undefined;
    const match = page.match(/\d+/);
    return match ? parseInt(match[0], 10) : undefined;
};

type ResolvedCitationSource = {
    authorId: string;
    authorName: string;
    authorSortIndex: number | null;
    isSelf: boolean;
    bookId: string | null;
    bookTitle: string;
    bookSortIndex: number | null;
};

type SourceAuthor = Pick<Tables<'authors'>, 'id' | 'name' | 'sort_index' | 'is_self'>;
type StoredCitationRow = Tables<'citations'> & {
    author?: SourceAuthor | null;
    book?: (Pick<Tables<'books'>, 'id' | 'title' | 'sort_index'> & { author?: SourceAuthor | null }) | null;
    notes?: Tables<'notes'>[];
};

const readHighlights = (value: unknown): Highlight[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        if (typeof row.id !== 'string' || typeof row.start !== 'number' || typeof row.end !== 'number') return [];
        return [{ id: row.id, start: row.start, end: row.end,
            ...(typeof row.color === 'string' ? { color: row.color } : {}) }];
    });
};

const mapStoredCitation = (citation: StoredCitationRow, resolvedSource?: ResolvedCitationSource): Citation => ({
    id: citation.id,
    kind: 'sentence',
    text: citation.text,
    authorId: citation.author?.id || resolvedSource?.authorId,
    author: citation.author?.name || resolvedSource?.authorName || '',
    authorSortIndex: citation.author?.sort_index ?? resolvedSource?.authorSortIndex ?? null,
    isSelf: citation.author?.is_self ?? resolvedSource?.isSelf ?? false,
    bookId: citation.book?.id || resolvedSource?.bookId || undefined,
    book: citation.book?.title || resolvedSource?.bookTitle || '',
    bookSortIndex: citation.book?.sort_index ?? resolvedSource?.bookSortIndex ?? null,
    page: citation.page || undefined,
    pageSort: citation.page_sort ?? undefined,
    createdAt: new Date(citation.created_at).getTime(),
    ...(citation.created_at_sort == null ? {} : { createdAtSort: citation.created_at_sort }),
    ...(citation.order_key == null ? {} : { orderKey: citation.order_key }),
    notes: (citation.notes || []).map((note) => ({
        id: note.id,
        content: note.content,
        textFormats: normalizeTextFormats(note.text_formats, note.content.length),
        createdAt: new Date(note.created_at).getTime(),
    })),
    tags: [],
    highlights: readHighlights(citation.highlights),
    textFormats: normalizeTextFormats(citation.text_formats, citation.text.length),
});

const fetchCitationById = async (userId: string, id: string) => {
    const { data, error } = await getSupabaseClient().from('citations')
        .select(`
            *,
            book:books!citations_book_id_fkey(id, title, sort_index),
            author:authors!citations_author_id_fkey(id, name, is_self, sort_index),
            notes(*)
        `)
        .eq('user_id', userId)
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    return data;
};

const resolveCitationSource = async (
    userId: string,
    source: CitationSourceInput
): Promise<ResolvedCitationSource> => {
    let authorName = source.author?.trim() || '';
    const bookTitle = source.book?.trim() || '';

    const { data: profile } = await getSupabaseClient()
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
    const currentUsername = profile?.username || 'Researcher';

    const isSelf = !authorName || authorName === currentUsername;
    if (isSelf) {
        authorName = currentUsername;
    }

    const { data: authorData, error: authorError } = await getSupabaseClient()
        .from('authors')
        .select('id, name, sort_index, is_self')
        .eq('user_id', userId)
        .eq(isSelf ? 'is_self' : 'name', isSelf ? true : authorName)
        .maybeSingle();
    if (authorError) throw authorError;

    let authorId: string;
    let authorSortIndex: number | null;

    if (authorData) {
        authorId = authorData.id;
        authorSortIndex = authorData.sort_index ?? null;

        if (isSelf && authorData.name !== currentUsername) {
            const { error: authorSyncError } = await getSupabaseClient()
                .from('authors')
                .update({ name: currentUsername })
                .eq('id', authorId)
                .eq('user_id', userId);
            if (authorSyncError) throw authorSyncError;
        }
    } else {
        const nextAuthorSortIndex = await getNextSortIndex('authors', userId);
        const { data: newAuthor, error: createAuthorError } = await getSupabaseClient()
            .from('authors')
            .insert({
                name: authorName,
                user_id: userId,
                is_self: isSelf,
                sort_index: nextAuthorSortIndex
            })
            .select('id, sort_index')
            .single();
        if (createAuthorError) throw createAuthorError;
        authorId = newAuthor.id;
        authorSortIndex = newAuthor.sort_index ?? null;
    }

    if (!bookTitle) {
        return {
            authorId,
            authorName,
            authorSortIndex,
            isSelf,
            bookId: null,
            bookTitle: '',
            bookSortIndex: null
        };
    }

    const { data: bookData, error: bookError } = await getSupabaseClient()
        .from('books')
        .select('id, sort_index')
        .eq('title', bookTitle)
        .eq('author_id', authorId)
        .eq('user_id', userId)
        .maybeSingle();
    if (bookError) throw bookError;

    if (bookData) {
        return {
            authorId,
            authorName,
            authorSortIndex,
            isSelf,
            bookId: bookData.id,
            bookTitle,
            bookSortIndex: bookData.sort_index ?? null
        };
    }

    const nextBookSortIndex = await getNextSortIndex('books', userId, { author_id: authorId });
    const { data: newBook, error: createBookError } = await getSupabaseClient()
        .from('books')
        .insert({
            title: bookTitle,
            author_id: authorId,
            user_id: userId,
            sort_index: nextBookSortIndex
        })
        .select('id, sort_index')
        .single();
    if (createBookError) throw createBookError;

    return {
        authorId,
        authorName,
        authorSortIndex,
        isSelf,
        bookId: newBook.id,
        bookTitle,
        bookSortIndex: newBook.sort_index ?? null
    };
};

const resolveCitationSourceByBookId = async (
    userId: string,
    bookId: string
): Promise<ResolvedCitationSource> => {
    const { data, error } = await getSupabaseClient()
        .from('books')
        .select(`
            id,
            title,
            sort_index,
            created_at,
            author:authors(id, name, sort_index, is_self)
        `)
        .eq('id', bookId)
        .eq('user_id', userId)
        .single();
    if (error) throw error;

    const book = mapBookSourceRow(data as BookSourceRow);
    return {
        authorId: book.authorId,
        authorName: book.author,
        authorSortIndex: book.authorSortIndex,
        isSelf: book.isSelf,
        bookId: book.id,
        bookTitle: book.title,
        bookSortIndex: book.sortIndex,
    };
};

export async function fetchCitations() {
    const [citations, notes] = await Promise.all([
        fetchAllRows((from, to) => getSupabaseClient().from('citations').select(`
            *,
            book:books!citations_book_id_fkey(id, title, sort_index, author:authors(id, name, is_self, sort_index)),
            author:authors!citations_author_id_fkey(id, name, is_self, sort_index)
        `).order('created_at', { ascending: false }).order('id').range(from, to)),
        fetchAllRows((from, to) => getSupabaseClient().from('notes').select('*')
            .order('created_at').order('id').range(from, to)),
    ]);
    const notesByCitation = new Map<string, typeof notes>();
    for (const note of notes) {
        const group = notesByCitation.get(note.citation_id) ?? [];
        group.push(note);
        notesByCitation.set(note.citation_id, group);
    }
    return citations.map(citation => mapStoredCitation({
        ...citation,
        author: citation.author ?? citation.book?.author,
        notes: notesByCitation.get(citation.id) ?? [],
    }));
}

export async function addCitation(userId: string, data: AddCitationInput) {
        if (data.createdAtSort !== undefined && (!Number.isFinite(data.createdAtSort) || !data.bookId)) throw new Error('Invalid citation position');
        if (data.createdAt !== undefined && !Number.isFinite(data.createdAt)) throw new Error('Invalid citation creation time');
        if (data.orderKey !== undefined) validateBookPosition(data.orderKey, 'Invalid citation position');
        const resolvedSource = data.bookId
            ? await resolveCitationSourceByBookId(userId, data.bookId)
            : await resolveCitationSource(userId, {
                author: data.author || '',
                book: data.book || ''
            });

        let existingOrderKey: string | undefined;
        let existingCreatedAtSort: number | null | undefined;
        let existingCreatedAt: string | undefined;
        if (data.id) {
            const existing = await fetchCitationById(userId, data.id);
            if (existing) {
                existingCreatedAtSort = existing.created_at_sort ?? null;
                existingCreatedAt = existing.created_at;
                if (existing.book?.id === resolvedSource.bookId && typeof existing.order_key === 'string') {
                    validateBookPosition(existing.order_key);
                    existingOrderKey = existing.order_key;
                }
            }
        }

        if (!resolvedSource.bookId && data.orderKey !== undefined) throw new Error('Invalid citation position');
        const initialOrderKey = resolvedSource.bookId
            ? existingOrderKey
                ?? data.orderKey
                ?? (data.createdAtSort === undefined
                    ? await createAppendBookOrderKey(userId, resolvedSource.bookId)
                    : legacyOrderKey(data.createdAtSort))
            : undefined;

        const createPayload = (orderKey: string | null) => ({
                ...(data.id ? { id: data.id } : {}),
                created_at_sort: existingCreatedAtSort !== undefined
                    ? existingCreatedAtSort
                    : data.createdAtSort ?? null,
                ...(existingCreatedAt !== undefined
                    ? { created_at: existingCreatedAt }
                    : data.createdAt === undefined ? {} : { created_at: new Date(data.createdAt).toISOString() }),
                order_key: orderKey,
                kind: 'sentence',
                text: data.text,
                book_id: resolvedSource.bookId,
                author_id: resolvedSource.authorId,
                page: data.page,
                page_sort: extractPageSort(data.page),
                ...(data.highlights !== undefined ? { highlights: data.highlights.map(highlight => ({ ...highlight })) } : {}),
                ...(data.textFormats !== undefined ? { text_formats: data.textFormats } : {}),
                user_id: userId
            });
        const write = (orderKey: string | null) => {
            const citationWrite = getSupabaseClient().from('citations');
            const mutation = data.id
                ? citationWrite.upsert(createPayload(orderKey), { onConflict: 'id' })
                : citationWrite.insert(createPayload(orderKey));
            return mutation.select(`
                *,
                book:books!citations_book_id_fkey(id, title, sort_index),
                author:authors!citations_author_id_fkey(id, name, is_self, sort_index)
            `)
            .single();
        };
        let citation: StoredCitationRow;
        if (resolvedSource.bookId && initialOrderKey) {
            citation = await mutateWithBookOrderRetry<StoredCitationRow>(userId, resolvedSource.bookId, initialOrderKey, write);
        } else {
            const { data: stored, error } = await write(null);
            if (error) throw error;
            citation = stored;
        }
        return mapStoredCitation(citation, resolvedSource);
    }

export async function moveCitation(userId: string, bookId: string, id: string, position: BookPosition) {
    validateBookPosition(position, 'Invalid citation position');
    const mutate = (patch: { created_at_sort: number } | { order_key: string }) => getSupabaseClient().from('citations')
        .update(patch)
        .eq('user_id', userId).eq('book_id', bookId).eq('id', id)
        .select('id, created_at_sort, order_key').single();
    if (typeof position === 'number') {
        const { data, error } = await mutate({ created_at_sort: position });
        if (error) throw error;
        return {
            ...(data.created_at_sort == null ? {} : { createdAtSort: data.created_at_sort }),
            ...(data.order_key == null ? {} : { orderKey: data.order_key }),
        } as Pick<Citation, 'createdAtSort' | 'orderKey'>;
    }
    const data = await mutateWithBookOrderRetry(userId, bookId, position, (orderKey) => mutate({ order_key: orderKey }));
    return {
        ...(data.created_at_sort == null ? {} : { createdAtSort: data.created_at_sort }),
        orderKey: data.order_key,
    } as Pick<Citation, 'createdAtSort' | 'orderKey'>;
}

export async function updateCitation(userId: string, id: string, data: CitationUpdate, expectedText?: string) {
        if (expectedText !== undefined && data.textFormats !== undefined &&
            data.author === undefined && data.book === undefined && data.page === undefined) {
            await saveTextFormatting(userId, 'citation', id, expectedText, data.text ?? expectedText, data.textFormats);
            return { ...data, ...(data.page === null ? { page: undefined } : {}) } as Partial<Citation>;
        }
        const localPatch: Partial<Citation> = {};
        const updateData: TablesUpdate<'citations'> = {};
        let destinationBookId: string | null | undefined;
        if (data.text !== undefined) {
            updateData.text = data.text;
            localPatch.text = data.text;
        }
        if (data.page !== undefined) {
            updateData.page = data.page || null;
            updateData.page_sort = extractPageSort(data.page ?? undefined) ?? null;
            localPatch.page = data.page || undefined;
            localPatch.pageSort = extractPageSort(data.page ?? undefined);
        }
        if (data.textFormats !== undefined) {
            updateData.text_formats = expectedText === undefined ? data.textFormats
                : normalizeTextFormats(data.textFormats, (data.text ?? expectedText).length);
            localPatch.textFormats = data.textFormats;
        }
        if (data.highlights !== undefined) {
            updateData.highlights = data.highlights.map(highlight => ({ ...highlight }));
            localPatch.highlights = data.highlights;
        }

        if (data.author !== undefined || data.book !== undefined) {
            const { data: currentCitation, error: fetchCurrentError } = await getSupabaseClient()
                .from('citations')
                .select(`
                    author:authors!citations_author_id_fkey(name),
                    book:books!citations_book_id_fkey(id, title)
                `)
                .eq('id', id)
                .eq('user_id', userId)
                .single();
            if (fetchCurrentError) throw fetchCurrentError;

            const currentAuthorRecord = Array.isArray(currentCitation.author)
                ? currentCitation.author[0]
                : currentCitation.author;
            const currentBookRecord = Array.isArray(currentCitation.book)
                ? currentCitation.book[0]
                : currentCitation.book;
            const currentAuthorName =
                currentAuthorRecord &&
                typeof currentAuthorRecord === 'object' &&
                'name' in currentAuthorRecord &&
                typeof currentAuthorRecord.name === 'string'
                    ? currentAuthorRecord.name
                    : '';
            const currentBookTitle =
                currentBookRecord &&
                typeof currentBookRecord === 'object' &&
                'title' in currentBookRecord &&
                typeof currentBookRecord.title === 'string'
                    ? currentBookRecord.title
                    : '';
            const currentBookId =
                currentBookRecord &&
                typeof currentBookRecord === 'object' &&
                'id' in currentBookRecord &&
                typeof currentBookRecord.id === 'string'
                    ? currentBookRecord.id
                    : null;

            const resolvedSource = await resolveCitationSource(userId, {
                author: data.author ?? currentAuthorName,
                book: data.book ?? currentBookTitle
            });

            updateData.author_id = resolvedSource.authorId;
            updateData.book_id = resolvedSource.bookId;
            if (currentBookId !== resolvedSource.bookId) {
                destinationBookId = resolvedSource.bookId;
                updateData.order_key = null;
                localPatch.orderKey = undefined;
            }

            localPatch.authorId = resolvedSource.authorId;
            localPatch.author = resolvedSource.authorName;
            localPatch.authorSortIndex = resolvedSource.authorSortIndex;
            localPatch.isSelf = resolvedSource.isSelf;
            localPatch.bookId = resolvedSource.bookId || undefined;
            localPatch.book = resolvedSource.bookTitle;
            localPatch.bookSortIndex = resolvedSource.bookSortIndex;
        }

        if (Object.keys(updateData).length === 0) {
            return localPatch;
        }

        if (destinationBookId) {
            const initialOrderKey = await createAppendBookOrderKey(userId, destinationBookId);
            const stored = await mutateWithBookOrderRetry(userId, destinationBookId, initialOrderKey, (orderKey) => {
                let query = getSupabaseClient().from('citations')
                    .update({ ...updateData, order_key: orderKey })
                    .eq('id', id)
                    .eq('user_id', userId);
                if (expectedText !== undefined) query = query.eq('text', expectedText);
                return query.select('id, order_key').single();
            });
            localPatch.orderKey = stored.order_key ?? undefined;
        } else {
            let query = getSupabaseClient()
                .from('citations')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId);
            if (expectedText !== undefined) query = query.eq('text', expectedText);
            const { data: updated, error } = await query.select('id').maybeSingle();
            requireMutationRow(updated, error, 'Citation');
        }
        return localPatch;
    }

export async function bulkUpdateCitationSource(userId: string, citationIds: string[], source: CitationSourceInput) {
        if (citationIds.length === 0) {
            return {
                updatedIds: [] as string[],
                updatedCount: 0,
                patch: {} as Partial<Citation>,
                orderKeys: {} as Record<string, string | undefined>,
            };
        }

        const resolvedSource = await resolveCitationSource(userId, source);
        const requestedIds = [...new Set(citationIds)];
        const { data: currentRows, error: currentRowsError } = await getSupabaseClient()
            .from('citations')
            .select('id, book_id, order_key, created_at_sort, created_at')
            .in('id', requestedIds)
            .eq('user_id', userId);
        if (currentRowsError) throw currentRowsError;
        if ((currentRows || []).length !== requestedIds.length) {
            throw new Error('Some citations could not be updated');
        }
        const orderedRows = [...(currentRows || [])].sort((left, right) => {
            const leftBook = left.book_id ?? '';
            const rightBook = right.book_id ?? '';
            if (leftBook !== rightBook) return leftBook < rightBook ? -1 : 1;
            const leftPosition = getBookPosition({
                createdAtSort: left.created_at_sort ?? new Date(left.created_at).getTime(),
                orderKey: left.order_key ?? undefined,
            });
            const rightPosition = getBookPosition({
                createdAtSort: right.created_at_sort ?? new Date(right.created_at).getTime(),
                orderKey: right.order_key ?? undefined,
            });
            const positionOrder = compareBookPositions(leftPosition, rightPosition);
            return positionOrder || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
        });

        const createOrderKeyMap = async () => {
            const map: Record<string, string | null> = {};
            if (!resolvedSource.bookId) {
                for (const row of orderedRows) map[row.id] = null;
                return map;
            }
            let appended: string | undefined;
            for (const row of orderedRows) {
                if (row.book_id === resolvedSource.bookId && typeof row.order_key === 'string') {
                    try {
                        validateBookPosition(row.order_key);
                        map[row.id] = row.order_key;
                        continue;
                    } catch {
                        // A stale invalid key is treated like a move and replaced below.
                    }
                }
                appended = appended === undefined
                    ? await createAppendBookOrderKey(userId, resolvedSource.bookId)
                    : generateBookPosition(appended);
                map[row.id] = appended;
            }
            return map;
        };

        let acceptedRows: Array<{ id: string; order_key: string | null }> | null = null;
        let orderKeyMap = await createOrderKeyMap();
        const expectedPositions = Object.fromEntries(orderedRows.map((row) => [row.id, {
            book_id: row.book_id,
            order_key: row.order_key,
        }]));
        for (let attempt = 0; attempt <= 3; attempt += 1) {
            const { data, error } = await getSupabaseClient().rpc('bulk_update_citation_source', {
                expected_user_id: userId,
                citation_ids: orderedRows.map((row) => row.id),
                destination_author_id: resolvedSource.authorId,
                destination_book_id: resolvedSource.bookId,
                destination_order_keys: orderKeyMap,
                expected_positions: expectedPositions,
            });
            if (!error) {
                acceptedRows = data || [];
                break;
            }
            if (!isBookOrderConflict(error) || attempt === 3) throw error;
            orderKeyMap = await createOrderKeyMap();
        }
        if (!acceptedRows) throw new Error('Bulk citation source update returned no result');

        const updatedIds = acceptedRows.map((row) => row.id);
        const orderKeys = Object.fromEntries(acceptedRows.map((row) => [row.id, row.order_key ?? undefined]));
        return {
            updatedIds,
            updatedCount: updatedIds.length,
            orderKeys,
            patch: {
                authorId: resolvedSource.authorId,
                author: resolvedSource.authorName,
                authorSortIndex: resolvedSource.authorSortIndex,
                isSelf: resolvedSource.isSelf,
                bookId: resolvedSource.bookId || undefined,
                book: resolvedSource.bookTitle,
                bookSortIndex: resolvedSource.bookSortIndex
            } as Partial<Citation>
        };
    }

export async function deleteCitations(userId: string, ids: string[]) {
        if (ids.length === 0) return;
        const supabase = getSupabaseClient();
        await requireActiveUser(userId, 'deletion');
        const { error } = await supabase
            .from('citations')
            .delete()
            .in('id', ids)
            .eq('user_id', userId);
        if (error) throw error;
    }

export async function addNote(userId: string, citationId: string, content: string) {
        const { data, error } = await getSupabaseClient()
            .from('notes')
            .insert({ citation_id: citationId, content, user_id: userId })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            content: data.content,
            createdAt: new Date(data.created_at).getTime()
        } as Note;
    }

export async function updateNote(userId: string, noteId: string, content: string, formats?: TextFormatRange[], expectedText?: string) {
        if (formats !== undefined && expectedText !== undefined) {
            await saveTextFormatting(userId, 'note', noteId, expectedText, content, formats);
            return;
        }
        const { data, error } = await getSupabaseClient()
            .from('notes')
            .update({ content, ...(formats === undefined ? {} : { text_formats: formats }) })
            .eq('id', noteId)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();
        requireMutationRow(data, error, 'Note');
    }

export async function deleteNote(userId: string, noteId: string) {
        const { error } = await getSupabaseClient()
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    }
