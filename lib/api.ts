import { getSupabaseClient } from './supabase';
import { AddCitationInput, AuthorDeletePreview, AuthorFolder, AuthorFolderMembership, AuthorSource, BookDeletePreview, BookSource, ChapterBlock, Citation, CitationSourceInput, CreateBookInput, CreateChapterBlockInput, DeleteAuthorCascadeResult, DeleteBookCascadeResult, Note, Project } from '../types';

export const PROFILE_AVATAR_BUCKET = 'profile-avatars';
const PROFILE_AVATAR_PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/`;
const PROFILE_AVATAR_OBJECT_NAME = 'avatar';
const PROFILE_AVATAR_CACHE_CONTROL = '0';

const extractPageSort = (page: string | undefined): number | undefined => {
    if (!page) return undefined;
    const match = page.match(/\d+/);
    return match ? parseInt(match[0], 10) : undefined;
};

const getProfileAvatarObjectPath = (userId: string) =>
    `${userId}/${PROFILE_AVATAR_OBJECT_NAME}`;

type ChapterBlockRow = {
    id: string;
    book_id: string;
    label: string;
    page_sort: number | null;
    created_at_sort: number;
    created_at: string;
};

type BookSourceRow = {
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

type AuthorSourceRow = {
    id: string;
    name: string;
    sort_index: number | null;
    created_at: string;
    is_self: boolean;
};

type GetOrCreateAuthorResult = {
    authorId: string;
    authorName: string;
    authorSortIndex: number | null;
    authorCreatedAt: string;
    isSelf: boolean;
};

type GetOrCreateBookResult = GetOrCreateAuthorResult & {
    bookId: string;
    bookTitle: string;
    bookSortIndex: number | null;
    bookCreatedAt: string;
};

const mapChapterBlockRow = (row: ChapterBlockRow): ChapterBlock => ({
    id: row.id,
    bookId: row.book_id,
    label: row.label,
    pageSort: row.page_sort ?? undefined,
    createdAtSort: row.created_at_sort,
    createdAt: new Date(row.created_at).getTime(),
});

const mapBookSourceRow = (row: BookSourceRow): BookSource => {
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

const mapAuthorSourceRow = (row: AuthorSourceRow): AuthorSource => ({
    id: row.id,
    name: row.name,
    sortIndex: row.sort_index ?? null,
    createdAt: new Date(row.created_at).getTime(),
    isSelf: row.is_self,
});

export const resolveStoredProfileAvatarPath = (avatarPath?: string | null) => {
    if (!avatarPath) {
        return null;
    }

    if (!avatarPath.includes('://')) {
        return avatarPath;
    }

    try {
        const { pathname } = new URL(avatarPath);
        if (!pathname.startsWith(PROFILE_AVATAR_PUBLIC_PATH_PREFIX)) {
            return null;
        }

        return decodeURIComponent(pathname.slice(PROFILE_AVATAR_PUBLIC_PATH_PREFIX.length));
    } catch {
        return null;
    }
};

const getNextSortIndex = async (
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

const requireActiveUser = async (userId: string, action: string) => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error || data.session?.user.id !== userId) {
        throw error || new Error(`Active user changed before ${action}`);
    }
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

type RenameBookResult = {
    merged: boolean;
    fromBookId: string;
    bookId: string;
    bookTitle: string;
    bookSortIndex: number | null;
    bookMemo: string;
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

export const api = {
    resolveStoredProfileAvatarPath,

    // Profiles
    async updateProfile(
        userId: string,
        profilePatch: { username?: string; avatar_path?: string | null }
    ) {
        const { error } = await getSupabaseClient()
            .from('profiles')
            .upsert({ id: userId, ...profilePatch });
        if (error) throw error;
    },

    getProfileAvatarPublicUrl(objectPath: string, version?: number) {
        const { data } = getSupabaseClient()
            .storage
            .from(PROFILE_AVATAR_BUCKET)
            .getPublicUrl(objectPath);

        return typeof version === 'number'
            ? `${data.publicUrl}?v=${version}`
            : data.publicUrl;
    },

    async uploadProfileAvatar(userId: string, file: File) {
        const objectPath = getProfileAvatarObjectPath(userId);
        const avatarStorage = getSupabaseClient()
            .storage
            .from(PROFILE_AVATAR_BUCKET);

        const { error } = await avatarStorage.upload(objectPath, file, {
            upsert: true,
            contentType: file.type || undefined,
            cacheControl: PROFILE_AVATAR_CACHE_CONTROL,
        });

        if (error) throw error;

        return objectPath;
    },

    async fetchBooks(userId: string) {
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
    },

    async fetchAuthors(userId: string) {
        const { data, error } = await getSupabaseClient()
            .from('authors')
            .select('id, name, sort_index, created_at, is_self')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((row: AuthorSourceRow) => mapAuthorSourceRow(row));
    },

    async fetchAuthorFolders(userId: string) {
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
    },

    async createAuthorFolder(userId: string, name: string) {
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
    },

    async renameAuthorFolder(userId: string, folderId: string, name: string) {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author folder name is required');
        const { error } = await getSupabaseClient()
            .from('author_folders')
            .update({ name: trimmed })
            .eq('id', folderId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async deleteAuthorFolder(userId: string, folderId: string) {
        const { error } = await getSupabaseClient()
            .from('author_folders')
            .delete()
            .eq('id', folderId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async moveAuthorToFolder(userId: string, authorId: string, folderId: string) {
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
    },

    async removeAuthorFromFolder(userId: string, authorId: string) {
        const { error } = await getSupabaseClient()
            .from('author_folder_memberships')
            .delete()
            .eq('author_id', authorId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async deleteAuthorCascade(userId: string, authorId: string) {
        await requireActiveUser(userId, 'author deletion');
        const { data, error } = await getSupabaseClient().rpc('delete_author_cascade', {
            expected_user_id: userId,
            source_author_id: authorId,
        });
        if (error) throw error;
        return data as DeleteAuthorCascadeResult;
    },

    async previewAuthorDeletion(userId: string, authorId: string) {
        await requireActiveUser(userId, 'author deletion preview');
        const { data, error } = await getSupabaseClient().rpc('preview_author_deletion', {
            expected_user_id: userId,
            source_author_id: authorId,
        });
        if (error) throw error;
        return data as AuthorDeletePreview;
    },

    async deleteBookCascade(userId: string, bookId: string) {
        await requireActiveUser(userId, 'book deletion');
        const { data, error } = await getSupabaseClient().rpc('delete_book_cascade', {
            expected_user_id: userId,
            source_book_id: bookId,
        });
        if (error) throw error;
        return data as DeleteBookCascadeResult;
    },

    async previewBookDeletion(userId: string, bookId: string) {
        await requireActiveUser(userId, 'book deletion preview');
        const { data, error } = await getSupabaseClient().rpc('preview_book_deletion', {
            expected_user_id: userId,
            source_book_id: bookId,
        });
        if (error) throw error;
        return data as BookDeletePreview;
    },

    async createAuthor(userId: string, name: string) {
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
    },

    async createBook(userId: string, input: CreateBookInput) {
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
    },

    async fetchChapterBlocks(userId: string, bookId: string) {
        const { data, error } = await getSupabaseClient()
            .from('chapter_blocks')
            .select('*')
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .order('created_at_sort', { ascending: true });
        if (error) throw error;
        return (data || []).map(mapChapterBlockRow);
    },

    async createChapterBlock(userId: string, input: CreateChapterBlockInput) {
        const { data, error } = await getSupabaseClient()
            .from('chapter_blocks')
            .insert({
                book_id: input.bookId,
                label: input.label,
                page_sort: input.pageSort,
                created_at_sort: input.createdAtSort,
                user_id: userId,
            })
            .select('*')
            .single();
        if (error) throw error;
        return mapChapterBlockRow(data);
    },

    async moveChapterBlock(userId: string, bookId: string, id: string, createdAtSort: number) {
        if (!Number.isFinite(createdAtSort)) throw new Error('Invalid chapter position');
        const { data, error } = await getSupabaseClient().from('chapter_blocks')
            .update({ created_at_sort: createdAtSort }).eq('user_id', userId).eq('book_id', bookId).eq('id', id)
            .select('*').single();
        if (error) throw error;
        return mapChapterBlockRow(data);
    },

    async renameChapterBlock(userId: string, bookId: string, id: string, label: string) {
        const trimmed = label.trim();
        if (!trimmed) throw new Error('Chapter title is required');
        const { data, error } = await getSupabaseClient().from('chapter_blocks')
            .update({ label: trimmed }).eq('user_id', userId).eq('book_id', bookId).eq('id', id)
            .select('*').single();
        if (error) throw error;
        return mapChapterBlockRow(data);
    },

    async deleteChapterBlock(userId: string, id: string) {
        const { error } = await getSupabaseClient()
            .from('chapter_blocks')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    // Citations
    async fetchCitations() {
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

    async addCitation(userId: string, data: AddCitationInput) {
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
            notes: [],
            tags: [],
            highlights: citation.highlights || []
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
    },

    async deleteCitations(userId: string, ids: string[]) {
        if (ids.length === 0) return;
        const supabase = getSupabaseClient();
        await requireActiveUser(userId, 'deletion');
        const { error } = await supabase
            .from('citations')
            .delete()
            .in('id', ids)
            .eq('user_id', userId);
        if (error) throw error;
    },

    // Notes
    async addNote(userId: string, citationId: string, content: string) {
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
    },

    async updateNote(userId: string, noteId: string, content: string) {
        const { error } = await getSupabaseClient()
            .from('notes')
            .update({ content })
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async deleteNote(userId: string, noteId: string) {
        const { error } = await getSupabaseClient()
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    // Projects
    async fetchProjects() {
        const { data, error } = await getSupabaseClient()
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
        const { data, error } = await getSupabaseClient()
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
                getSupabaseClient()
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
        await requireActiveUser(userId, 'author reorder');
        const { error } = await getSupabaseClient().rpc('reorder_authors', {
            ordered_author_ids: orderedAuthorIds,
        });
        if (error) throw error;
    },

    async reorderBooks(userId: string, authorId: string, orderedBookIds: string[]) {
        await requireActiveUser(userId, 'book reorder');
        const { error } = await getSupabaseClient().rpc('reorder_books', {
            source_author_id: authorId,
            ordered_book_ids: orderedBookIds,
        });
        if (error) throw error;
    },

    async renameProject(userId: string, id: string, name: string) {
        const { error } = await getSupabaseClient()
            .from('projects')
            .update({ name })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async renameAuthor(userId: string, id: string, name: string): Promise<RenameAuthorResult> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Author name is required');
        await requireActiveUser(userId, 'author rename');

        const { data, error } = await getSupabaseClient().rpc('rename_or_merge_author_with_folder', {
            source_author_id: id,
            requested_name: trimmed
        });
        if (error) throw error;
        return data as RenameAuthorResult;
    },

    async renameBook(userId: string, id: string, name: string): Promise<RenameBookResult> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Book title is required');
        await requireActiveUser(userId, 'book rename');

        const { data, error } = await getSupabaseClient().rpc('rename_or_merge_book', {
            source_book_id: id,
            requested_title: trimmed
        });
        if (error) throw error;
        return data as RenameBookResult;
    },

    async updateBookMemo(userId: string, id: string, memo: string) {
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
    },

    async deleteProject(userId: string, id: string) {
        const { error } = await getSupabaseClient()
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async addCitationToProject(_userId: string, projectId: string, citationId: string) {
        const { error } = await getSupabaseClient()
            .from('project_citations')
            .upsert({ project_id: projectId, citation_id: citationId });

        if (error) throw error;
    },

    async addCitationsToProject(_userId: string, projectId: string, citationIds: string[]) {
        if (citationIds.length === 0) return;

        const records = citationIds.map(cid => ({
            project_id: projectId,
            citation_id: cid
        }));

        const { error } = await getSupabaseClient()
            .from('project_citations')
            .upsert(records, { onConflict: 'project_id, citation_id', ignoreDuplicates: true });

        if (error) throw error;
    }
};
