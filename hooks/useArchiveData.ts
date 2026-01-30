import { useState, useCallback } from 'react';
import { Citation, Project } from '../types';
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

    const handleAddCitation = async (data: Omit<Citation, 'id' | 'createdAt' | 'notes'>) => {
        if (!session) return;
        try {
            const newCitation = await api.addCitation(session.user.id, data);
            setCitations(prev => [newCitation, ...prev]);
        } catch (error) {
            console.error('Error adding citation:', error);
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
            await api.updateCitation(session.user.id, id, data);
            setCitations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
        } catch (error) {
            console.error('Error updating citation:', error);
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
        handleCreateProject,
        handleRenameProject,
        handleDeleteProject,
        handleDropCitationToProject
    };
};
