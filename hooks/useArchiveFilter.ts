import { useCallback } from 'react';
import { Citation, Project } from '../types';
import { useArchiveViewState } from '../features/archive/logic/useArchiveViewState';
import { reorderByIndex } from '../features/archive/logic/archiveSort';
import { reorderAuthors, reorderBooks } from '../shared/api';

export const useArchiveFilter = (citations: Citation[], projects: Project[], username: string, userId?: string) => {
    const {
        searchTerm,
        setSearchTerm,
        filter,
        setFilter,
        selectedProjectId,
        setSelectedProjectId,
        selectedBookId,
        editorPrefill,
        sortField,
        dateDirection,
        pageDirection,
        isBookView,
        handleDateSortClick,
        handlePageSortClick,
        handleProjectSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle,
        getCurrentOrderedAuthors,
        getCurrentOrderedBooks,
        setAuthorOrder,
        setBookOrderByAuthor
    } = useArchiveViewState({ citations, projects, username });

    const handleReorderAuthorAt = useCallback(async (dragAuthorId: string, dropIndex: number) => {
        if (!dragAuthorId || !userId) return;
        const orderedAuthors = getCurrentOrderedAuthors();
        const next = reorderByIndex(orderedAuthors, dragAuthorId, dropIndex);
        setAuthorOrder(next);
        try {
            await reorderAuthors(userId, next);
        } catch (error) {
            console.error('Error reordering authors:', error);
        }
    }, [getCurrentOrderedAuthors, userId]);

    const handleReorderBookAt = useCallback(async (authorId: string, dragBookId: string, dropIndex: number) => {
        if (!authorId || !dragBookId || !userId) return;
        const orderedBooks = getCurrentOrderedBooks(authorId);
        const next = reorderByIndex(orderedBooks, dragBookId, dropIndex);
        setBookOrderByAuthor(prev => ({
            ...prev,
            [authorId]: next
        }));
        try {
            await reorderBooks(userId, authorId, next);
        } catch (error) {
            console.error('Error reordering books:', error);
            setBookOrderByAuthor(prev => ({
                ...prev,
                [authorId]: orderedBooks
            }));
        }
    }, [getCurrentOrderedBooks, userId]);

    return {
        searchTerm,
        setSearchTerm,
        filter,
        setFilter,
        selectedProjectId,
        setSelectedProjectId,
        selectedBookId,
        editorPrefill,
        sortField,
        dateDirection,
        pageDirection,
        isBookView,
        handleDateSortClick,
        handlePageSortClick,
        handleReorderAuthorAt,
        handleReorderBookAt,
        handleProjectSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle
    };
};
