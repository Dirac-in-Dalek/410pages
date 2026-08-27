import { useCallback } from 'react';
import { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, Citation, Project } from '../types';
import { useArchiveViewState } from '../features/archive/logic/useArchiveViewState';
import { reorderByIndex } from '../features/archive/logic/archiveSort';
import { reorderBooks } from '../shared/api/bookApi';

export const useArchiveFilter = (
    citations: Citation[],
    authors: AuthorSource[],
    authorFolders: AuthorFolder[],
    authorFolderMemberships: AuthorFolderMembership[],
    books: BookSource[],
    projects: Project[],
    username: string,
    userId?: string
) => {
    const {
        searchTerm,
        setSearchTerm,
        filter,
        selectedProjectId,
        selectedBookId,
        selectedAuthorId,
        editorPrefill,
        sortField,
        dateDirection,
        pageDirection,
        isBookView,
        isAuthorView,
        isHomeView,
        handleDateSortClick,
        handlePageSortClick,
        handleBookSourceSelect,
        handleAuthorSourceSelect,
        handleProjectSelect,
        handleHomeSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle,
        getCurrentOrderedBooks,
        setBookOrderByAuthor
    } = useArchiveViewState({ citations, authors, authorFolders, authorFolderMemberships, books, projects, username });

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
        selectedProjectId,
        selectedBookId,
        selectedAuthorId,
        editorPrefill,
        sortField,
        dateDirection,
        pageDirection,
        isBookView,
        isAuthorView,
        isHomeView,
        handleDateSortClick,
        handlePageSortClick,
        handleBookSourceSelect,
        handleAuthorSourceSelect,
        handleReorderBookAt,
        handleProjectSelect,
        handleHomeSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle
    };
};
