import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Citation, Project } from '../types';
import { api } from '../lib/api';
import { formatCitationCopyText, writeTextToClipboard } from '../lib/citationCopy';

export const useBulkSelection = (
    filteredCitations: Citation[],
    session: any,
    resolveCitationId: (citationId: string) => Promise<string | null>,
    username: string,
    setCitations: Dispatch<SetStateAction<Citation[]>>,
    setProjects: Dispatch<SetStateAction<Project[]>>
) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        const visibleIds = new Set<string>(filteredCitations.map((citation) => citation.id));
        const persistedIdByOptimisticId = new Map<string, string>();
        filteredCitations.forEach((citation) => {
            if (citation.optimisticOriginId) {
                persistedIdByOptimisticId.set(citation.optimisticOriginId, citation.id);
            }
        });

        setSelectedIds((current: Set<string>) => {
            const next = new Set<string>();
            current.forEach((id) => {
                const persistedId = persistedIdByOptimisticId.get(id);
                if (persistedId && visibleIds.has(persistedId)) {
                    next.add(persistedId);
                } else if (visibleIds.has(id)) {
                    next.add(id);
                }
            });
            const isUnchanged =
                next.size === current.size && [...next].every((id) => current.has(id));
            return isUnchanged ? current : next;
        });
    }, [filteredCitations]);

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

    const handleBatchCopy = async (includeNotes: boolean = false) => {
        if (selectedIds.size === 0) return;
        setIsCopying(true);

        const selectedList = filteredCitations.filter(c => selectedIds.has(c.id));
        const copyText = selectedList
            .map(citation => formatCitationCopyText(citation, username, includeNotes))
            .join('\n\n');

        try {
            await writeTextToClipboard(copyText);
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
            const resolvedIds = await Promise.all(idsToDelete.map(resolveCitationId));
            const persistedIds = resolvedIds.filter((id): id is string => Boolean(id));
            await Promise.all(persistedIds.map((id) => api.deleteCitation(session.user.id, id)));
            const localIdsToDelete = new Set([...idsToDelete, ...persistedIds]);

            setCitations(prev => prev.filter(c =>
                !localIdsToDelete.has(c.id) &&
                (!c.optimisticOriginId || !localIdsToDelete.has(c.optimisticOriginId))
            ));
            setProjects(prev => prev.map(p => ({
                ...p,
                citationIds: p.citationIds.filter(cid => !localIdsToDelete.has(cid))
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
            const resolvedIds = await Promise.all(Array.from(selectedIds).map(resolveCitationId));
            if (resolvedIds.some((id) => !id)) {
                throw new Error('One or more selected items failed to save.');
            }
            const persistedIds = resolvedIds as string[];
            await api.addCitationsToProject(session.user.id, projectId, persistedIds);

            setProjects(prev => prev.map(p => {
                if (p.id === projectId) {
                    const newIds = persistedIds.filter(cid => !p.citationIds.includes(cid));
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
            const resolvedIds = await Promise.all(Array.from(selectedIds).map(resolveCitationId));
            if (resolvedIds.some((id) => !id)) {
                throw new Error('One or more selected items failed to save.');
            }
            const persistedIds = resolvedIds as string[];
            const newProject = await api.createProject(session.user.id, folderName);
            await api.addCitationsToProject(session.user.id, newProject.id, persistedIds);

            setProjects(prev => [...prev, { ...newProject, citationIds: persistedIds }]);
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
