import { getSupabaseClient } from '../../lib/supabase';
import type { AddCitationInput, Citation, CitationSourceInput, Note } from '../../types';
import { requireActiveUser, getNextSortIndex, BookSourceRow, mapBookSourceRow } from './libraryApiUtils';

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

    let authorId = '';
    let authorSortIndex: number | null = null;

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
        const { data, error } = await getSupabaseClient()
            .from('citations')
            .select(`
        *,
        book:books!citations_book_id_fkey(id, title, sort_index, author:authors(id, name, is_self, sort_index)),
        author:authors!citations_author_id_fkey(id, name, is_self, sort_index),
        notes(*)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((c: any) => {
            // Prioritize direct author, then book's author
            const authorObj = c.author || c.book?.author;
            return {
                id: c.id,
                kind: 'sentence',
                text: c.text,
                authorId: authorObj?.id,
                author: authorObj?.name || '',
                authorSortIndex: authorObj?.sort_index ?? null,
                isSelf: authorObj?.is_self || false,
                bookId: c.book?.id || undefined,
                book: c.book?.title || '',
                bookSortIndex: c.book?.sort_index ?? null,
                page: c.page || undefined,
                pageSort: c.page_sort || undefined,
                createdAt: new Date(c.created_at).getTime(),
                ...(c.created_at_sort == null ? {} : { createdAtSort: c.created_at_sort }),
                notes: (c.notes || []).map((n: any) => ({
                    id: n.id,
                    content: n.content,
                    createdAt: new Date(n.created_at).getTime()
                })),
                highlights: c.highlights || [],
                tags: []
            } as Citation;
        });
    }

export async function addCitation(userId: string, data: AddCitationInput) {
        if (data.createdAtSort !== undefined && (!Number.isFinite(data.createdAtSort) || !data.bookId)) throw new Error('Invalid citation position');
        const resolvedSource = data.bookId
            ? await resolveCitationSourceByBookId(userId, data.bookId)
            : await resolveCitationSource(userId, {
                author: data.author || '',
                book: data.book || ''
            });

        // 3. Insert Citation
        // We explicitly provide author_id. Trigger handle_citation_defaults will kick in if we sent nulls,
        // but we computed them for Book logic anyway.
        const payload = {
                ...(data.id ? { id: data.id } : {}),
                created_at_sort: data.createdAtSort ?? null,
                kind: 'sentence',
                text: data.text,
                book_id: resolvedSource.bookId,
                author_id: resolvedSource.authorId,
                page: data.page,
                page_sort: extractPageSort(data.page),
                ...(data.highlights !== undefined ? { highlights: data.highlights } : {}),
                user_id: userId
            };
        const citationWrite = getSupabaseClient().from('citations');
        const { data: citation, error } = await (data.id
            ? citationWrite.upsert(payload, { onConflict: 'id' })
            : citationWrite.insert(payload))
            .select(`
                *,
                book:books!citations_book_id_fkey(id, title, sort_index),
                author:authors!citations_author_id_fkey(id, name, is_self, sort_index)
            `)
            .single();

        if (error) {
            console.error('Supabase citation insert error:', error);
            throw error;
        }

        const mapped: Citation = {
            id: citation.id,
            kind: 'sentence',
            text: citation.text,
            authorId: citation.author?.id || resolvedSource.authorId,
            author: citation.author?.name || resolvedSource.authorName,
            authorSortIndex: citation.author?.sort_index ?? resolvedSource.authorSortIndex,
            isSelf: citation.author?.is_self ?? resolvedSource.isSelf,
            bookId: citation.book?.id || resolvedSource.bookId || undefined,
            book: citation.book?.title || resolvedSource.bookTitle,
            bookSortIndex: citation.book?.sort_index ?? resolvedSource.bookSortIndex,
            page: citation.page || undefined,
            pageSort: citation.page_sort ?? undefined,
            createdAt: new Date(citation.created_at).getTime(),
            ...(citation.created_at_sort == null ? {} : { createdAtSort: citation.created_at_sort }),
            notes: [],
            tags: [],
            highlights: citation.highlights || []
        };

        return mapped;
    }

export async function moveCitation(userId: string, bookId: string, id: string, createdAtSort: number) {
    if (!Number.isFinite(createdAtSort)) throw new Error('Invalid citation position');
    const { data, error } = await getSupabaseClient().from('citations')
        .update({ created_at_sort: createdAtSort })
        .eq('user_id', userId).eq('book_id', bookId).eq('id', id)
        .select('id, created_at_sort').single();
    if (error) throw error;
    return { createdAtSort: data.created_at_sort } as Pick<Citation, 'createdAtSort'>;
}

export async function updateCitation(userId: string, id: string, data: Partial<Citation>) {
        const localPatch: Partial<Citation> = {};
        const updateData: any = {};
        if (data.text !== undefined) {
            updateData.text = data.text;
            localPatch.text = data.text;
        }
        if (data.page !== undefined) {
            updateData.page = data.page;
            updateData.page_sort = extractPageSort(data.page);
            localPatch.page = data.page;
            localPatch.pageSort = extractPageSort(data.page);
        }
        if (data.highlights !== undefined) {
            updateData.highlights = data.highlights;
            localPatch.highlights = data.highlights;
        }

        if (data.author !== undefined || data.book !== undefined) {
            const { data: currentCitation, error: fetchCurrentError } = await getSupabaseClient()
                .from('citations')
                .select(`
                    author:authors!citations_author_id_fkey(name),
                    book:books!citations_book_id_fkey(title)
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

            const resolvedSource = await resolveCitationSource(userId, {
                author: data.author ?? currentAuthorName,
                book: data.book ?? currentBookTitle
            });

            updateData.author_id = resolvedSource.authorId;
            updateData.book_id = resolvedSource.bookId;

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

        const { error } = await getSupabaseClient()
            .from('citations')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return localPatch;
    }

export async function bulkUpdateCitationSource(userId: string, citationIds: string[], source: CitationSourceInput) {
        if (citationIds.length === 0) {
            return {
                updatedIds: [] as string[],
                updatedCount: 0,
                patch: {} as Partial<Citation>
            };
        }

        const resolvedSource = await resolveCitationSource(userId, source);

        const { data, error } = await getSupabaseClient()
            .from('citations')
            .update({
                author_id: resolvedSource.authorId,
                book_id: resolvedSource.bookId
            })
            .in('id', citationIds)
            .eq('user_id', userId)
            .select('id');
        if (error) throw error;

        const updatedIds = (data || []).map((item) => item.id as string);
        return {
            updatedIds,
            updatedCount: updatedIds.length,
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

export async function updateNote(userId: string, noteId: string, content: string) {
        const { error } = await getSupabaseClient()
            .from('notes')
            .update({ content })
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    }

export async function deleteNote(userId: string, noteId: string) {
        const { error } = await getSupabaseClient()
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    }
