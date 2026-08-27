import { useState, useCallback, useEffect } from 'react';
import { Citation } from '../types';
import { formatCitationCopyText, writeTextToClipboard } from '../lib/citationCopy';

export const useBulkSelection = (
    filteredCitations: Citation[],
    session: any,
    resolveCitationId: (citationId: string) => Promise<string | null>,
    username: string,
    onAddCitationsToProject: (projectId: string, citationIds: string[]) => Promise<boolean>,
    onCreateProjectWithCitations: (name: string, citationIds: string[]) => Promise<boolean>
) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCopying, setIsCopying] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);

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
            setBulkError(null);
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setBulkError('선택한 항목을 복사하지 못했습니다. 다시 시도해 주세요.');
            setIsCopying(false);
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
            const didAdd = await onAddCitationsToProject(projectId, persistedIds);
            if (!didAdd) return;

            setSelectedIds(new Set());
            setBulkError(null);
        } catch (error) {
            console.error('Error batch adding to project:', error);
            setBulkError('선택한 항목을 폴더에 추가하지 못했습니다. 선택은 그대로 유지했습니다.');
        }
    };

    const handleBatchCreateAndAddToProject = async (folderName: string) => {
        if (!session || !folderName.trim() || selectedIds.size === 0) return false;
        try {
            const resolvedIds = await Promise.all(Array.from(selectedIds).map(resolveCitationId));
            if (resolvedIds.some((id) => !id)) {
                throw new Error('One or more selected items failed to save.');
            }
            const persistedIds = resolvedIds as string[];
            const didCreate = await onCreateProjectWithCitations(folderName.trim(), persistedIds);
            if (!didCreate) return false;
            setSelectedIds(new Set());
            setBulkError(null);
            return true;
        } catch (error) {
            console.error('Error creating batch folder:', error);
            setBulkError('새 폴더를 만들지 못했습니다. 이름과 선택은 그대로 유지했습니다.');
            return false;
        }
    };

    return {
        selectedIds,
        setSelectedIds,
        isCopying,
        bulkError,
        clearBulkError: () => setBulkError(null),
        reportBulkError: (message: string) => setBulkError(message),
        handleToggleSelect,
        handleSelectAll,
        handleBatchCopy,
        handleBatchAddToProject,
        handleBatchCreateAndAddToProject
    };
};
