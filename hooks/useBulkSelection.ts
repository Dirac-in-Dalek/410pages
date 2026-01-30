import { useState, useCallback } from 'react';
import { Citation, Project } from '../types';
import { api } from '../lib/api';

export const useBulkSelection = (
    filteredCitations: Citation[],
    session: any,
    username: string,
    setCitations: React.Dispatch<React.SetStateAction<Citation[]>>,
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>
) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCopying, setIsCopying] = useState(false);

    const handleToggleSelect = useCallback((id: string, selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (selected) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const handleSelectAll = useCallback((select: boolean) => {
        if (select) {
            setSelectedIds(new Set(filteredCitations.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    }, [filteredCitations]);

    const handleBatchCopy = async () => {
        if (selectedIds.size === 0) return;
        setIsCopying(true);

        const selectedList = filteredCitations.filter(c => selectedIds.has(c.id));
        const copyText = selectedList.map(citation => {
            let text = `"${citation.text}"`;
            const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');
            if (!isSelf && citation.author) {
                text += ` — ${citation.author}`;
                if (citation.book) text += `, 『${citation.book}』`;
                if (citation.page) text += `, p.${citation.page}`;
            }
            return text;
        }).join('\n\n');

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(copyText);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = copyText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setIsCopying(false);
        }
    };

    const handleBatchDelete = async () => {
        if (!session || selectedIds.size === 0) return;
        try {
            const idsToDelete = Array.from(selectedIds);
            await Promise.all(idsToDelete.map((id: string) => api.deleteCitation(session.user.id, id)));

            setCitations(prev => prev.filter(c => !selectedIds.has(c.id)));
            setProjects(prev => prev.map(p => ({
                ...p,
                citationIds: p.citationIds.filter(cid => !selectedIds.has(cid))
            })));

            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error batch deleting:', error);
            throw error;
        }
    };

    const handleBatchAddToProject = async (projectId: string) => {
        if (!session || selectedIds.size === 0) return;
        try {
            await api.addCitationsToProject(session.user.id, projectId, Array.from(selectedIds));

            setProjects(prev => prev.map(p => {
                if (p.id === projectId) {
                    const newIds = Array.from(selectedIds).filter(cid => !p.citationIds.includes(cid));
                    return { ...p, citationIds: [...p.citationIds, ...newIds] };
                }
                return p;
            }));

            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error batch adding to project:', error);
        }
    };

    const handleBatchCreateAndAddToProject = async (folderName: string) => {
        if (!session || !folderName.trim() || selectedIds.size === 0) return;
        try {
            const newProject = await api.createProject(session.user.id, folderName);
            await api.addCitationsToProject(session.user.id, newProject.id, Array.from(selectedIds));

            setProjects(prev => [...prev, { ...newProject, citationIds: Array.from(selectedIds) }]);
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error creating batch folder:', error);
        }
    };

    return {
        selectedIds,
        setSelectedIds,
        isCopying,
        handleToggleSelect,
        handleSelectAll,
        handleBatchCopy,
        handleBatchDelete,
        handleBatchAddToProject,
        handleBatchCreateAndAddToProject
    };
};
