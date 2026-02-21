import { supabase } from './supabase';
import { Citation, CitationSourceInput, Note, Project } from '../types';

const extractPageSort = (page: string | undefined): number | undefined => {
    if (!page) return undefined;
    const match = page.match(/\d+/);
    return match ? parseInt(match[0], 10) : undefined;
};

const getNextSortIndex = async (
    table: 'projects' | 'authors' | 'books',
    userId: string,
    filters: Record<string, string> = {}
) => {
    let query = supabase
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

type ResolvedCitationSource = {
    authorId: string;
    authorName: string;
    authorSortIndex: number | null;
    isSelf: boolean;
    bookId: string | null;
    bookTitle: string;
    bookSortIndex: number | null;
};

type BookMergeInfo = {
    fromBookId: string;
    toBookId: string;
    toBookTitle: string;
    toBookSortIndex: number | null;
};

type RenameAuthorResult = {
    merged: boolean;
    fromAuthorId: string;
    authorId: string;
    authorName: string;
    authorSortIndex: number | null;
    isSelf: boolean;
    bookMerges: BookMergeInfo[];
};

type RenameBookResult = {
    merged: boolean;
    fromBookId: string;
    bookId: string;
    bookTitle: string;
    bookSortIndex: number | null;
};

const resolveCitationSource = async (
    userId: string,
    source: CitationSourceInput
): Promise<ResolvedCitationSource> => {
    let authorName = source.author?.trim() || '';
    const bookTitle = source.book?.trim() || '';

    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
    const currentUsername = profile?.username || 'Researcher';

    const isSelf = !authorName || authorName === currentUsername;
    if (isSelf) {
        authorName = currentUsername;
    }

    const { data: authorData, error: authorError } = await supabase
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
            const { error: authorSyncError } = await supabase
                .from('authors')
                .update({ name: currentUsername })
                .eq('id', authorId)
                .eq('user_id', userId);
            if (authorSyncError) throw authorSyncError;
        }
    } else {
        const nextAuthorSortIndex = await getNextSortIndex('authors', userId);
        const { data: newAuthor, error: createAuthorError } = await supabase
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

    const { data: bookData, error: bookError } = await supabase
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
    const { data: newBook, error: createBookError } = await supabase
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

export const api = {
    // Profiles
    async updateProfile(userId: string, username: string) {
        const { error } = await supabase
            .from('profiles')
            .upsert({ id: userId, username });
        if (error) throw error;
    },

    // Citations
    async fetchCitations() {
        const { data, error } = await supabase
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
                notes: (c.notes || []).map((n: any) => ({
                    id: n.id,
                    content: n.content,
                    createdAt: new Date(n.created_at).getTime()
                })),
                highlights: c.highlights || [],
                tags: []
            } as Citation;
        });
    },

    async addCitation(userId: string, data: Omit<Citation, 'id' | 'createdAt' | 'notes'>) {
        const resolvedSource = await resolveCitationSource(userId, {
            author: data.author || '',
            book: data.book || ''
        });

        // 3. Insert Citation
        // We explicitly provide author_id. Trigger handle_citation_defaults will kick in if we sent nulls, 
        // but we computed them for Book logic anyway.
        const { data: citation, error } = await supabase
            .from('citations')
            .insert({
                text: data.text,
                book_id: resolvedSource.bookId,
                author_id: resolvedSource.authorId,
                page: data.page,
                page_sort: extractPageSort(data.page),
                user_id: userId
            })
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
            text: citation.text,
            authorId: citation.author?.id || resolvedSource.authorId,
            author: citation.author?.name || resolvedSource.authorName,
            authorSortIndex: citation.author?.sort_index ?? resolvedSource.authorSortIndex,
            isSelf: citation.author?.is_self ?? resolvedSource.isSelf,
            bookId: citation.book?.id || resolvedSource.bookId || undefined,
            book: citation.book?.title || resolvedSource.bookTitle,
            bookSortIndex: citation.book?.sort_index ?? resolvedSource.bookSortIndex,
            page: citation.page,
            pageSort: citation.page_sort,
            createdAt: new Date(citation.created_at).getTime(),
            notes: [],
            tags: []
        };

        return mapped;
    },

    async updateCitation(userId: string, id: string, data: Partial<Citation>) {
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
            const { data: currentCitation, error: fetchCurrentError } = await supabase
                .from('citations')
                .select(`
                    author:authors!citations_author_id_fkey(name),
                    book:books!citations_book_id_fkey(title)
                `)
                .eq('id', id)
                .eq('user_id', userId)
                .single();
            if (fetchCurrentError) throw fetchCurrentError;

            const resolvedSource = await resolveCitationSource(userId, {
                author: data.author ?? currentCitation.author?.name ?? '',
                book: data.book ?? currentCitation.book?.title ?? ''
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

        const { error } = await supabase
            .from('citations')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return localPatch;
    },

    async bulkUpdateCitationSource(userId: string, citationIds: string[], source: CitationSourceInput) {
        if (citationIds.length === 0) {
            return {
                updatedIds: [] as string[],
                updatedCount: 0,
                patch: {} as Partial<Citation>
            };
        }

        const resolvedSource = await resolveCitationSource(userId, source);

        const { data, error } = await supabase
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
    },

    async deleteCitation(userId: string, id: string) {
        const { error } = await supabase
            .from('citations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    },

    // Notes
    async addNote(userId: string, citationId: string, content: string) {
        const { data, error } = await supabase
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
    },

    async updateNote(userId: string, noteId: string, content: string) {
        const { error } = await supabase
            .from('notes')
            .update({ content })
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async deleteNote(userId: string, noteId: string) {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    // Projects
    async fetchProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select(`
        *,
        project_citations(citation_id)
      `)
            .order('sort_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            sortIndex: p.sort_index ?? null,
            citationIds: p.project_citations.map((pc: any) => pc.citation_id)
        } as Project));
    },

    async createProject(userId: string, name: string) {
        const nextSortIndex = await getNextSortIndex('projects', userId);
        const { data, error } = await supabase
            .from('projects')
            .insert({ name, user_id: userId, sort_index: nextSortIndex })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            sortIndex: data.sort_index ?? null,
            citationIds: []
        } as Project;
    },

    async reorderProjects(userId: string, orderedProjectIds: string[]) {
        const results = await Promise.all(
            orderedProjectIds.map((projectId, index) =>
                supabase
                    .from('projects')
                    .update({ sort_index: index })
                    .eq('id', projectId)
                    .eq('user_id', userId)
            )
        );
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;
    },

    async reorderAuthors(userId: string, orderedAuthorIds: string[]) {
        const results = await Promise.all(
            orderedAuthorIds.map((authorId, index) =>
                supabase
                    .from('authors')
                    .update({ sort_index: index })
                    .eq('id', authorId)
                    .eq('user_id', userId)
            )
        );
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;
    },

    async reorderBooks(userId: string, authorId: string, orderedBookIds: string[]) {
        const results = await Promise.all(
            orderedBookIds.map((bookId, index) =>
                supabase
                    .from('books')
                    .update({ sort_index: index })
                    .eq('id', bookId)
                    .eq('author_id', authorId)
                    .eq('user_id', userId)
            )
        );
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;
    },

    async renameProject(userId: string, id: string, name: string) {
        const { error } = await supabase
            .from('projects')
            .update({ name })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async renameAuthor(userId: string, id: string, name: string): Promise<RenameAuthorResult> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author name is required');

        const { data: sourceAuthor, error: sourceAuthorError } = await supabase
            .from('authors')
            .select('id, name, sort_index, is_self')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        if (sourceAuthorError) throw sourceAuthorError;

        if (sourceAuthor.name === trimmed) {
            return {
                merged: false,
                fromAuthorId: sourceAuthor.id,
                authorId: sourceAuthor.id,
                authorName: sourceAuthor.name,
                authorSortIndex: sourceAuthor.sort_index ?? null,
                isSelf: sourceAuthor.is_self,
                bookMerges: []
            };
        }

        const { data: existingAuthor, error: existingAuthorError } = await supabase
            .from('authors')
            .select('id, name, sort_index, is_self')
            .eq('user_id', userId)
            .eq('name', trimmed)
            .neq('id', id)
            .maybeSingle();
        if (existingAuthorError) throw existingAuthorError;

        if (!existingAuthor) {
            const { data: updatedAuthor, error: renameAuthorError } = await supabase
                .from('authors')
                .update({ name: trimmed })
                .eq('id', id)
                .eq('user_id', userId)
                .select('id, name, sort_index, is_self')
                .single();
            if (renameAuthorError) throw renameAuthorError;

            return {
                merged: false,
                fromAuthorId: updatedAuthor.id,
                authorId: updatedAuthor.id,
                authorName: updatedAuthor.name,
                authorSortIndex: updatedAuthor.sort_index ?? null,
                isSelf: updatedAuthor.is_self,
                bookMerges: []
            };
        }

        const { data: sourceBooks, error: sourceBooksError } = await supabase
            .from('books')
            .select('id, title')
            .eq('user_id', userId)
            .eq('author_id', id);
        if (sourceBooksError) throw sourceBooksError;

        const { data: existingAuthorBooks, error: existingAuthorBooksError } = await supabase
            .from('books')
            .select('id, title, sort_index')
            .eq('user_id', userId)
            .eq('author_id', existingAuthor.id);
        if (existingAuthorBooksError) throw existingAuthorBooksError;

        const existingBookByTitle = new Map(
            (existingAuthorBooks || []).map((book) => [book.title.trim(), book])
        );
        const bookMerges: BookMergeInfo[] = [];

        for (const sourceBook of sourceBooks || []) {
            const normalizedTitle = sourceBook.title.trim();
            const conflict = existingBookByTitle.get(normalizedTitle);

            if (conflict) {
                const { error: moveCitationError } = await supabase
                    .from('citations')
                    .update({ book_id: conflict.id })
                    .eq('user_id', userId)
                    .eq('book_id', sourceBook.id);
                if (moveCitationError) throw moveCitationError;

                const { error: deleteBookError } = await supabase
                    .from('books')
                    .delete()
                    .eq('id', sourceBook.id)
                    .eq('user_id', userId);
                if (deleteBookError) throw deleteBookError;

                bookMerges.push({
                    fromBookId: sourceBook.id,
                    toBookId: conflict.id,
                    toBookTitle: conflict.title,
                    toBookSortIndex: conflict.sort_index ?? null
                });
            } else {
                const { error: moveBookOwnerError } = await supabase
                    .from('books')
                    .update({ author_id: existingAuthor.id })
                    .eq('id', sourceBook.id)
                    .eq('user_id', userId);
                if (moveBookOwnerError) throw moveBookOwnerError;
            }
        }

        const { error: moveCitationAuthorError } = await supabase
            .from('citations')
            .update({ author_id: existingAuthor.id })
            .eq('user_id', userId)
            .eq('author_id', id);
        if (moveCitationAuthorError) throw moveCitationAuthorError;

        const { error: deleteSourceAuthorError } = await supabase
            .from('authors')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (deleteSourceAuthorError) throw deleteSourceAuthorError;

        return {
            merged: true,
            fromAuthorId: id,
            authorId: existingAuthor.id,
            authorName: existingAuthor.name,
            authorSortIndex: existingAuthor.sort_index ?? null,
            isSelf: existingAuthor.is_self,
            bookMerges
        };
    },

    async renameBook(userId: string, id: string, name: string): Promise<RenameBookResult> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Book title is required');

        const { data: sourceBook, error: sourceBookError } = await supabase
            .from('books')
            .select('id, title, author_id, sort_index')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        if (sourceBookError) throw sourceBookError;

        if (sourceBook.title === trimmed) {
            return {
                merged: false,
                fromBookId: sourceBook.id,
                bookId: sourceBook.id,
                bookTitle: sourceBook.title,
                bookSortIndex: sourceBook.sort_index ?? null
            };
        }

        const { data: existingBook, error: existingBookError } = await supabase
            .from('books')
            .select('id, title, sort_index')
            .eq('user_id', userId)
            .eq('author_id', sourceBook.author_id)
            .eq('title', trimmed)
            .neq('id', id)
            .maybeSingle();
        if (existingBookError) throw existingBookError;

        if (existingBook) {
            const { error: moveCitationError } = await supabase
                .from('citations')
                .update({ book_id: existingBook.id })
                .eq('user_id', userId)
                .eq('book_id', id);
            if (moveCitationError) throw moveCitationError;

            const { error: deleteSourceBookError } = await supabase
                .from('books')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);
            if (deleteSourceBookError) throw deleteSourceBookError;

            return {
                merged: true,
                fromBookId: id,
                bookId: existingBook.id,
                bookTitle: existingBook.title,
                bookSortIndex: existingBook.sort_index ?? null
            };
        }

        const { data: updatedBook, error: renameBookError } = await supabase
            .from('books')
            .update({ title: trimmed })
            .eq('id', id)
            .eq('user_id', userId)
            .select('id, title, sort_index')
            .single();
        if (renameBookError) throw renameBookError;

        return {
            merged: false,
            fromBookId: updatedBook.id,
            bookId: updatedBook.id,
            bookTitle: updatedBook.title,
            bookSortIndex: updatedBook.sort_index ?? null
        };
    },

    async deleteProject(userId: string, id: string) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async addCitationToProject(userId: string, projectId: string, citationId: string) {
        const { error } = await supabase
            .from('project_citations')
            .upsert({ project_id: projectId, citation_id: citationId });

        if (error) throw error;
    },

    async addCitationsToProject(userId: string, projectId: string, citationIds: string[]) {
        if (citationIds.length === 0) return;

        const records = citationIds.map(cid => ({
            project_id: projectId,
            citation_id: cid
        }));

        const { error } = await supabase
            .from('project_citations')
            .upsert(records, { onConflict: 'project_id, citation_id', ignoreDuplicates: true });

        if (error) throw error;
    }
};
