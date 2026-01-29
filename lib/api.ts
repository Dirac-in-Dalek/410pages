import { supabase } from './supabase';
import { Citation, Project, Note } from '../types';

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
        book:books!citations_book_id_fkey(id, title, author:authors(id, name, is_self)),
        author:authors!citations_author_id_fkey(id, name, is_self),
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
                author: authorObj?.name || '',
                isSelf: authorObj?.is_self || false,
                book: c.book?.title || '',
                page: c.page ? Number(c.page) : undefined,
                createdAt: new Date(c.created_at).getTime(),
                notes: (c.notes || []).map((n: any) => ({
                    id: n.id,
                    content: n.content,
                    createdAt: new Date(n.created_at).getTime()
                })),
                tags: []
            } as Citation;
        });
    },

    async addCitation(userId: string, data: Omit<Citation, 'id' | 'createdAt' | 'notes'>) {
        let authorId: string | null = null;
        let bookId: string | null = null;

        let authorName = data.author?.trim() || '';
        const bookTitle = data.book?.trim() || '';

        // 1. Resolve Author
        // If author is empty, we treat it as 'Self'.
        // We need to find the author ID for the UI logic, OR we rely on DB trigger.
        // However, to create a BOOK, we MUST have an author_id on the client side if we strictly follow relations.
        // Let's find/create the author explicitly.

        let isSelf = false;

        // Fetch current username to check if input matches or if input is empty
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();
        const currentUsername = profile?.username || 'Researcher';

        if (!authorName || authorName === currentUsername) {
            authorName = currentUsername;
            isSelf = true;
        }

        // 1. Resolve Author
        // Find or create author based on name and user_id. 
        // If it's a self-citation, we look for the record where is_self = true.
        const { data: authorData, error: authorError } = await supabase
            .from('authors')
            .select('id, name')
            .eq('user_id', userId)
            .eq(isSelf ? 'is_self' : 'name', isSelf ? true : authorName)
            .maybeSingle();

        if (authorError) throw authorError;

        if (authorData) {
            authorId = authorData.id;
            // Name sync check
            if (isSelf && authorData.name !== currentUsername) {
                await supabase.from('authors').update({ name: currentUsername }).eq('id', authorId);
            }
        } else {
            const { data: newAuthor, error: createAuthorError } = await supabase
                .from('authors')
                .insert({ name: authorName, user_id: userId, is_self: isSelf })
                .select('id')
                .single();
            if (createAuthorError) throw createAuthorError;
            authorId = newAuthor.id;
        }

        // 2. Resolve Book (only if title is provided)
        if (bookTitle) {
            const { data: bookData, error: bookError } = await supabase
                .from('books')
                .select('id')
                .eq('title', bookTitle)
                .eq('author_id', authorId)
                .eq('user_id', userId)
                .maybeSingle();

            if (bookError) throw bookError;

            if (bookData) {
                bookId = bookData.id;
            } else {
                const { data: newBook, error: createBookError } = await supabase
                    .from('books')
                    .insert({ title: bookTitle, author_id: authorId, user_id: userId })
                    .select('id')
                    .single();
                if (createBookError) throw createBookError;
                bookId = newBook.id;
            }
        }

        // 3. Insert Citation
        // We explicitly provide author_id. Trigger handle_citation_defaults will kick in if we sent nulls, 
        // but we computed them for Book logic anyway.
        const { data: citation, error } = await supabase
            .from('citations')
            .insert({
                text: data.text,
                book_id: bookId,
                author_id: authorId, // <--- New field
                page: data.page,
                user_id: userId
            })
            .select(`
                *,
                book:books!citations_book_id_fkey(id, title),
                author:authors!citations_author_id_fkey(id, name, is_self)
            `)
            .single();

        if (error) {
            console.error('Supabase citation insert error:', error);
            throw error;
        }

        const mapped: Citation = {
            id: citation.id,
            text: citation.text,
            author: citation.author?.name || authorName,
            isSelf: citation.author?.is_self || isSelf,
            book: citation.book?.title || bookTitle,
            page: citation.page,
            createdAt: new Date(citation.created_at).getTime(),
            notes: [],
            tags: []
        };

        return mapped;
    },

    async updateCitation(userId: string, id: string, data: Partial<Citation>) {
        const updateData: any = {};
        if (data.text !== undefined) updateData.text = data.text;
        if (data.page !== undefined) updateData.page = data.page;

        const { error } = await supabase
            .from('citations')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
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
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            citationIds: p.project_citations.map((pc: any) => pc.citation_id)
        } as Project));
    },

    async createProject(userId: string, name: string) {
        const { data, error } = await supabase
            .from('projects')
            .insert({ name, user_id: userId })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            citationIds: []
        } as Project;
    },

    async renameProject(userId: string, id: string, name: string) {
        const { error } = await supabase
            .from('projects')
            .update({ name })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
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
    }
};
