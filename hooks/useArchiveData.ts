import { useState, useCallback } from 'react';
import { AddCitationInput, AddCitationResult, BulkSourceUpdateResult, Citation, CitationSourceInput, Project } from '../types';
import { api } from '../lib/api';

export const useArchiveData = (session: any) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [citations, setCitations] = useState<Citation[]>([]);
    const [loading, setLoading] = useState(false);
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [citationsData, projectsData] = await Promise.all([
                api.fetchCitations(),
                api.fetchProjects()
            ]);
            setCitations(citationsData);
            setProjects(projectsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAddCitation = async (data: AddCitationInput): Promise<AddCitationResult> => {
        if (!session) {
            return { ok: false, error: new Error('No active session') };
        }
        try {
            const newCitation = await api.addCitation(session.user.id, data);
            setCitations(prev => [newCitation, ...prev]);
            return { ok: true, citationId: newCitation.id };
        } catch (error) {
            console.error('Error adding citation:', error);
            return { ok: false, error };
        }
    };

    const handleAddNote = async (citationId: string, content: string) => {
        if (!session) return;
        try {
            const newNote = await api.addNote(session.user.id, citationId, content);
            setCitations(prev => prev.map(c => {
                if (c.id === citationId) {
                    return { ...c, notes: [...c.notes, newNote] };
                }
                return c;
            }));
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleUpdateNote = async (citationId: string, noteId: string, content: string) => {
        if (!session) return;
        try {
            await api.updateNote(session.user.id, noteId, content);
            setCitations(prev => prev.map(c => {
                if (c.id === citationId) {
                    return {
                        ...c,
                        notes: c.notes.map(n => n.id === noteId ? { ...n, content } : n)
                    };
                }
                return c;
            }));
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDeleteNote = async (citationId: string, noteId: string) => {
        if (!session) return;
        try {
            await api.deleteNote(session.user.id, noteId);
            setCitations(prev => prev.map(c => {
                if (c.id === citationId) {
                    return {
                        ...c,
                        notes: c.notes.filter(n => n.id !== noteId)
                    };
                }
                return c;
            }));
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleDeleteCitation = async (id: string) => {
        if (!session) return;
        try {
            await api.deleteCitation(session.user.id, id);
            setCitations(prev => prev.filter(c => c.id !== id));
            setProjects(prev => prev.map(p => ({
                ...p,
                citationIds: p.citationIds.filter(cid => cid !== id)
            })));
        } catch (error) {
            console.error('Error deleting citation:', error);
        }
    };

    const handleUpdateCitation = async (id: string, data: Partial<Citation>) => {
        if (!session) return;
        try {
            const patch = await api.updateCitation(session.user.id, id, data);
            setCitations(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
        } catch (error) {
            console.error('Error updating citation:', error);
        }
    };

    const handleBulkUpdateCitationSource = async (
        citationIds: string[],
        source: CitationSourceInput
    ): Promise<BulkSourceUpdateResult> => {
        if (!session) return { ok: false, error: new Error('No active session') };
        if (citationIds.length === 0) return { ok: true, updatedCount: 0 };

        try {
            const result = await api.bulkUpdateCitationSource(session.user.id, citationIds, source);
            const updatedIdSet = new Set(result.updatedIds);
            setCitations((prev) =>
                prev.map((citation) => (updatedIdSet.has(citation.id) ? { ...citation, ...result.patch } : citation))
            );
            return { ok: true, updatedCount: result.updatedCount };
        } catch (error) {
            console.error('Error bulk updating citation source:', error);
            return { ok: false, error };
        }
    };

    const handleCreateProject = async (name: string) => {
        if (!session) return;
        try {
            const newProject = await api.createProject(session.user.id, name);
            setProjects(prev => [...prev, newProject]);
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    const handleRenameProject = async (id: string, name: string) => {
        if (!session) return;
        try {
            await api.renameProject(session.user.id, id, name);
            setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
        } catch (error) {
            console.error('Error renaming project:', error);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!session) return;
        try {
            await api.deleteProject(session.user.id, id);
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const handleRenameAuthor = async (authorId: string, name: string) => {
        if (!session) return;
        const trimmed = name.trim();
        if (!trimmed) return;

        try {
            const result = await api.renameAuthor(session.user.id, authorId, trimmed);
            const bookMergeMap = new Map(
                result.bookMerges.map((merge) => [
                    merge.fromBookId,
                    {
                        toBookId: merge.toBookId,
                        toBookTitle: merge.toBookTitle,
                        toBookSortIndex: merge.toBookSortIndex
                    }
                ])
            );

            setCitations(prev =>
                prev.map(citation => {
                    let nextCitation = citation;

                    if (citation.authorId === result.fromAuthorId) {
                        nextCitation = {
                            ...nextCitation,
                            authorId: result.authorId,
                            author: result.authorName,
                            authorSortIndex: result.authorSortIndex,
                            isSelf: result.isSelf
                        };
                    }

                    if (citation.bookId && bookMergeMap.has(citation.bookId)) {
                        const mergeTarget = bookMergeMap.get(citation.bookId)!;
                        nextCitation = {
                            ...nextCitation,
                            bookId: mergeTarget.toBookId,
                            book: mergeTarget.toBookTitle,
                            bookSortIndex: mergeTarget.toBookSortIndex
                        };
                    }

                    return nextCitation;
                })
            );
        } catch (error) {
            console.error('Error renaming author:', error);
        }
    };

    const handleRenameBook = async (bookId: string, name: string) => {
        if (!session) return;
        const trimmed = name.trim();
        if (!trimmed) return;

        try {
            const result = await api.renameBook(session.user.id, bookId, trimmed);
            setCitations(prev =>
                prev.map(citation =>
                    citation.bookId === result.fromBookId
                        ? {
                            ...citation,
                            bookId: result.bookId,
                            book: result.bookTitle,
                            bookSortIndex: result.bookSortIndex
                        }
                        : citation
                )
            );
        } catch (error) {
            console.error('Error renaming book:', error);
        }
    };

    const handleReorderProjects = async (dragIndex: number, dropIndex: number) => {
        if (!session) return;
        const userId = session.user.id;
        if (dragIndex < 0 || dragIndex >= projects.length) return;

        const next = [...projects];
        const [moved] = next.splice(dragIndex, 1);
        if (!moved) return;

        const adjustedIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
        const safeIndex = Math.max(0, Math.min(adjustedIndex, next.length));
        next.splice(safeIndex, 0, moved);
        setProjects(next);

        try {
            const orderedIds = next.map(p => p.id);
            if (orderedIds.length > 0) {
                await api.reorderProjects(userId, orderedIds);
            }
        } catch (error) {
            console.error('Error reordering projects:', error);
            await fetchData();
        }
    };

    const handleDropCitationToProject = async (projectId: string, citationId: string) => {
        if (!session) return;
        try {
            await api.addCitationToProject(session.user.id, projectId, citationId);
            setProjects(prev => prev.map(p => {
                if (p.id === projectId && !p.citationIds.includes(citationId)) {
                    return { ...p, citationIds: [...p.citationIds, citationId] };
                }
                return p;
            }));
        } catch (error) {
            console.error('Error adding citation to project:', error);
        }
    };

    return {
        projects,
        setProjects,
        citations,
        setCitations,
        loading,
        fetchData,
        handleAddCitation,
        handleAddNote,
        handleUpdateNote,
        handleDeleteNote,
        handleDeleteCitation,
        handleUpdateCitation,
        handleBulkUpdateCitationSource,
        handleCreateProject,
        handleRenameProject,
        handleDeleteProject,
        handleRenameAuthor,
        handleRenameBook,
        handleReorderProjects,
        handleDropCitationToProject
    };
};
