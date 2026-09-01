import { useCallback, useRef, useState } from 'react';
import { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, Citation, Project } from '../types';
import { useArchiveViewState } from '../features/archive/logic/useArchiveViewState';
import { reorderByIndex } from '../features/archive/logic/archiveSort';
import { reorderBooks } from '../shared/api/bookApi';
import { reorderAuthors } from '../shared/api/authorApi';

export const useArchiveFilter = (
    citations: Citation[],
    authors: AuthorSource[],
    authorFolders: AuthorFolder[],
    authorFolderMemberships: AuthorFolderMembership[],
    books: BookSource[],
    projects: Project[],
    username: string,
    userId?: string,
    onOrderPersisted?: () => void | Promise<void>
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
        getCurrentOrderedAuthors,
        setAuthorOrder,
        setBookOrderByAuthor
    } = useArchiveViewState({ citations, authors, authorFolders, authorFolderMemberships, books, projects, username });
    const [libraryOrderError, setLibraryOrderError] = useState<string | null>(null);
    const [authorOrderSaving, setAuthorOrderSaving] = useState(false);
    const [bookOrderSaving, setBookOrderSaving] = useState(false);
    const authorReorderInFlightRef = useRef(false);
    const bookReorderInFlightRef = useRef(false);

    const handleReorderAuthorAt = useCallback(async (
        groupAuthorIds: string[],
        dragAuthorId: string,
        dropIndex: number
    ) => {
        if (!dragAuthorId || !userId || !groupAuthorIds.includes(dragAuthorId) || authorReorderInFlightRef.current) return false;
        authorReorderInFlightRef.current = true;
        setAuthorOrderSaving(true);
        const orderedAuthors = getCurrentOrderedAuthors();
        const nextGroup = reorderByIndex(groupAuthorIds, dragAuthorId, dropIndex);
        const groupIds = new Set(groupAuthorIds);
        let groupIndex = 0;
        const next = orderedAuthors.map((authorId) =>
            groupIds.has(authorId) ? nextGroup[groupIndex++] : authorId
        );
        setAuthorOrder(next);
        setLibraryOrderError(null);
        try {
            await reorderAuthors(userId, next);
            try {
                await Promise.resolve(onOrderPersisted?.());
            } catch (refreshError) {
                console.error('Error refreshing authors after reorder:', refreshError);
            }
            return true;
        } catch (error) {
            console.error('Error reordering authors:', error);
            setAuthorOrder(orderedAuthors);
            setLibraryOrderError('저자 순서를 저장하지 못해 이전 순서로 되돌렸습니다.');
            return false;
        } finally {
            authorReorderInFlightRef.current = false;
            setAuthorOrderSaving(false);
        }
    }, [getCurrentOrderedAuthors, onOrderPersisted, userId]);

    const handleReorderBookAt = useCallback(async (authorId: string, dragBookId: string, dropIndex: number) => {
        if (!authorId || !dragBookId || !userId || bookReorderInFlightRef.current) return false;
        bookReorderInFlightRef.current = true;
        setBookOrderSaving(true);
        const orderedBooks = getCurrentOrderedBooks(authorId);
        const next = reorderByIndex(orderedBooks, dragBookId, dropIndex);
        setBookOrderByAuthor(prev => ({
            ...prev,
            [authorId]: next
        }));
        try {
            await reorderBooks(userId, authorId, next);
            try {
                await Promise.resolve(onOrderPersisted?.());
            } catch (refreshError) {
                console.error('Error refreshing books after reorder:', refreshError);
            }
            setLibraryOrderError(null);
            return true;
        } catch (error) {
            console.error('Error reordering books:', error);
            setBookOrderByAuthor(prev => ({
                ...prev,
                [authorId]: orderedBooks
            }));
            setLibraryOrderError('책 순서를 저장하지 못해 이전 순서로 되돌렸습니다.');
            return false;
        } finally {
            bookReorderInFlightRef.current = false;
            setBookOrderSaving(false);
        }
    }, [getCurrentOrderedBooks, onOrderPersisted, userId]);

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
        handleReorderAuthorAt,
        handleReorderBookAt,
        handleProjectSelect,
        handleHomeSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle,
        libraryOrderError,
        libraryOrderSaving: authorOrderSaving || bookOrderSaving,
        clearLibraryOrderError: () => setLibraryOrderError(null)
    };
};
