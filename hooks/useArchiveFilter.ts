import { useState, useMemo, useEffect, useCallback } from 'react';
import { Citation, Project, SidebarItem } from '../types';
import { api } from '../lib/api';

interface FilterState {
    type: 'author' | 'book';
    value: string;
    author?: string;
}

type SortField = 'date' | 'page';
type SortDirection = 'asc' | 'desc';

const getPageNumber = (citation: Citation): number | undefined => {
    if (typeof citation.pageSort === 'number') return citation.pageSort;
    if (!citation.page) return undefined;
    const match = citation.page.match(/\d+/);
    if (!match) return undefined;
    return Number(match[0]);
};

const reorderByIndex = (source: string[], dragId: string, dropIndex: number): string[] => {
    const unique = Array.from(new Set(source));
    if (!unique.includes(dragId)) unique.push(dragId);

    const fromIndex = unique.indexOf(dragId);
    if (fromIndex < 0) return unique;

    unique.splice(fromIndex, 1);
    const adjustedIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
    const safeIndex = Math.max(0, Math.min(adjustedIndex, unique.length));
    unique.splice(safeIndex, 0, dragId);
    return unique;
};

const sortByIndexThenLabel = <T extends { sortIndex?: number | null; label: string }>(items: T[]) => {
    return [...items].sort((a, b) => {
        const aSort = a.sortIndex;
        const bSort = b.sortIndex;
        if (typeof aSort === 'number' && typeof bSort === 'number' && aSort !== bSort) return aSort - bSort;
        if (typeof aSort === 'number') return -1;
        if (typeof bSort === 'number') return 1;
        return a.label.localeCompare(b.label, 'ko');
    });
};

const normalizeBookKey = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const pickPreferredBook = (
    current: { id: string; label: string; sortIndex?: number | null } | undefined,
    candidate: { id: string; label: string; sortIndex?: number | null }
) => {
    if (!current) return candidate;
    const currentSort = current.sortIndex;
    const candidateSort = candidate.sortIndex;
    if (typeof currentSort !== 'number' && typeof candidateSort === 'number') return candidate;
    if (typeof currentSort === 'number' && typeof candidateSort === 'number' && candidateSort < currentSort) {
        return candidate;
    }
    return current;
};

export const useArchiveFilter = (citations: Citation[], projects: Project[], username: string, userId?: string) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterState | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [editorPrefill, setEditorPrefill] = useState<{ author: string, book: string } | undefined>(undefined);
    const [sortField, setSortField] = useState<SortField>('date');
    const [dateDirection, setDateDirection] = useState<SortDirection>('desc');
    const [pageDirection, setPageDirection] = useState<SortDirection>('asc');
    const [authorOrder, setAuthorOrder] = useState<string[]>([]);
    const [bookOrderByAuthor, setBookOrderByAuthor] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const authorRows = sortByIndexThenLabel(
            Array.from(
                new Map(
                    citations
                        .filter(c => c.authorId && (c.isSelf ? username : c.author) !== username)
                        .map(c => [c.authorId!, {
                            id: c.authorId!,
                            label: c.isSelf ? username : c.author,
                            sortIndex: c.authorSortIndex
                        }])
                ).values()
            )
        );
        setAuthorOrder(authorRows.map(row => row.id));
    }, [citations, username]);

    useEffect(() => {
        const grouped: Record<string, string[]> = {};
        const byAuthor = new Map<string, Map<string, { id: string; label: string; sortIndex?: number | null }>>();

        citations.forEach(c => {
            if (!c.authorId || !c.bookId || !c.book) return;
            const existing = byAuthor.get(c.authorId) || new Map<string, { id: string; label: string; sortIndex?: number | null }>();
            const key = normalizeBookKey(c.book);
            existing.set(
                key,
                pickPreferredBook(existing.get(key), {
                    id: c.bookId,
                    label: c.book,
                    sortIndex: c.bookSortIndex
                })
            );
            byAuthor.set(c.authorId, existing);
        });

        byAuthor.forEach((books, authorId) => {
            grouped[authorId] = sortByIndexThenLabel(Array.from(books.values())).map(book => book.id);
        });

        setBookOrderByAuthor(grouped);
    }, [citations]);

    const handleDateSortClick = () => {
        if (sortField === 'date') {
            setDateDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortField('date');
    };

    const handlePageSortClick = () => {
        if (sortField === 'page') {
            setPageDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortField('page');
    };

    const handleProjectSelect = (id: string | null) => {
        setSelectedProjectId(id);
        setFilter(null);
        setSearchTerm('');
        setEditorPrefill(undefined);
    };

    const handleTreeItemClick = (item: SidebarItem) => {
        if (item.data) {
            setEditorPrefill({
                author: item.data.author,
                book: item.data.book || ''
            });
            setFilter({
                type: item.type === 'book' ? 'book' : 'author',
                value: item.type === 'book' ? item.data.book! : item.data.author,
                author: item.data.author
            });
            setSelectedProjectId(null);
            setSearchTerm('');
        }
    };

    const getCurrentOrderedAuthors = useCallback(() => {
        const map = new Map<string, { id: string; label: string; sortIndex?: number | null }>();
        citations.forEach(c => {
            if (!c.authorId) return;
            const label = c.isSelf ? username : c.author;
            if (!label || label === username) return;
            if (!map.has(c.authorId)) {
                map.set(c.authorId, { id: c.authorId, label, sortIndex: c.authorSortIndex });
            }
        });

        const sorted = sortByIndexThenLabel(Array.from(map.values()));
        if (authorOrder.length === 0) return sorted.map(row => row.id);
        const rank = new Map(authorOrder.map((id, index) => [id, index]));
        return [...sorted]
            .sort((a, b) => {
                const aRank = rank.get(a.id);
                const bRank = rank.get(b.id);
                if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
                if (aRank !== undefined) return -1;
                if (bRank !== undefined) return 1;
                return 0;
            })
            .map(row => row.id);
    }, [citations, username, authorOrder]);

    const getCurrentOrderedBooks = useCallback((authorId: string) => {
        const map = new Map<string, { id: string; label: string; sortIndex?: number | null }>();
        citations.forEach(c => {
            if (!c.authorId || c.authorId !== authorId || !c.bookId || !c.book) return;
            const key = normalizeBookKey(c.book);
            map.set(
                key,
                pickPreferredBook(map.get(key), {
                    id: c.bookId,
                    label: c.book,
                    sortIndex: c.bookSortIndex
                })
            );
        });

        const sorted = sortByIndexThenLabel(Array.from(map.values()));
        const order = bookOrderByAuthor[authorId] || [];
        if (order.length === 0) return sorted.map(row => row.id);
        const rank = new Map(order.map((id, index) => [id, index]));
        return [...sorted]
            .sort((a, b) => {
                const aRank = rank.get(a.id);
                const bRank = rank.get(b.id);
                if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
                if (aRank !== undefined) return -1;
                if (bRank !== undefined) return 1;
                return 0;
            })
            .map(row => row.id);
    }, [citations, bookOrderByAuthor]);

    const handleReorderAuthorAt = useCallback(async (dragAuthorId: string, dropIndex: number) => {
        if (!dragAuthorId || !userId) return;
        const orderedAuthors = getCurrentOrderedAuthors();
        const next = reorderByIndex(orderedAuthors, dragAuthorId, dropIndex);
        setAuthorOrder(next);
        try {
            await api.reorderAuthors(userId, next);
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
            await api.reorderBooks(userId, authorId, next);
        } catch (error) {
            console.error('Error reordering books:', error);
            setBookOrderByAuthor(prev => ({
                ...prev,
                [authorId]: orderedBooks
            }));
        }
    }, [getCurrentOrderedBooks, userId]);

    const treeData = useMemo(() => {
        const rootID = 'root-user';
        const rootItems: SidebarItem[] = [
            {
                id: rootID,
                label: username,
                type: 'root',
                data: { author: username, book: '' }
            }
        ];

        const authorsMap = new Map<string, {
            id: string;
            label: string;
            sortIndex?: number | null;
            books: Map<string, { id: string; label: string; sortIndex?: number | null }>;
        }>();

        citations.forEach(c => {
            if (!c.authorId) return;
            const effectiveAuthor = c.isSelf ? username : c.author;
            if (!effectiveAuthor) return;

            if (!authorsMap.has(c.authorId)) {
                authorsMap.set(c.authorId, {
                    id: c.authorId,
                    label: effectiveAuthor,
                    sortIndex: c.authorSortIndex,
                    books: new Map()
                });
            }

            if (c.bookId && c.book) {
                const authorBooks = authorsMap.get(c.authorId)?.books;
                if (authorBooks) {
                    authorBooks.set(
                        c.bookId,
                        pickPreferredBook(authorBooks.get(c.bookId), {
                            id: c.bookId,
                            label: c.book,
                            sortIndex: c.bookSortIndex
                        })
                    );
                }
            }
        });

        const userAuthor = Array.from(authorsMap.values()).find(author => author.label === username);
        if (userAuthor) {
            rootItems[0].data = { authorId: userAuthor.id, author: username, book: '' };
            const orderedUserBookIds = getCurrentOrderedBooks(userAuthor.id);
            const userBookById = userAuthor.books;
            rootItems[0].children = orderedUserBookIds
                .map(bookId => userBookById.get(bookId))
                .filter(Boolean)
                .map(book => ({
                    id: `book-${userAuthor.id}-${book!.id}`,
                    label: book!.label,
                    type: 'book' as const,
                    data: { authorId: userAuthor.id, author: username, bookId: book!.id, book: book!.label }
                }));
        }

        const nonUserAuthors = Array.from(authorsMap.values()).filter(author => author.label !== username);
        const authorById = new Map(nonUserAuthors.map(author => [author.id, author]));
        const orderedAuthorIds = getCurrentOrderedAuthors();

        const authorItems: SidebarItem[] = orderedAuthorIds
            .map(authorId => authorById.get(authorId))
            .filter(Boolean)
            .map(author => {
                const orderedBookIds = getCurrentOrderedBooks(author!.id);
                const bookItems: SidebarItem[] = orderedBookIds
                    .map(bookId => author!.books.get(bookId))
                    .filter(Boolean)
                    .map(book => ({
                        id: `book-${author!.id}-${book!.id}`,
                        label: book!.label,
                        type: 'book' as const,
                        data: { authorId: author!.id, author: author!.label, bookId: book!.id, book: book!.label }
                    }));
                return {
                    id: `author-${author!.id}`,
                    label: author!.label,
                    type: 'author',
                    data: { authorId: author!.id, author: author!.label },
                    children: bookItems.length > 0 ? bookItems : undefined
                };
            });

        return [...rootItems, ...authorItems];
    }, [citations, username, getCurrentOrderedAuthors, getCurrentOrderedBooks]);

    const filteredCitations = useMemo(() => {
        let result = citations;

        if (selectedProjectId) {
            const project = projects.find(p => p.id === selectedProjectId);
            result = result.filter(c => project?.citationIds.includes(c.id));
        } else if (filter) {
            if (filter.type === 'author') {
                result = result.filter(c => {
                    const effectiveAuthor = c.isSelf ? username : c.author;
                    return effectiveAuthor === filter.value;
                });
            } else if (filter.type === 'book') {
                result = result.filter(c => {
                    const isSameBook = c.book === filter.value;
                    const effectiveAuthor = c.isSelf ? username : c.author;
                    const isSameAuthor = !filter.author || effectiveAuthor === filter.author;
                    return isSameBook && isSameAuthor;
                });
            }
        }

        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            result = result.filter(c =>
                c.text.toLowerCase().includes(s) ||
                c.author.toLowerCase().includes(s) ||
                c.book.toLowerCase().includes(s)
            );
        }

        const sortedResult = [...result].sort((a, b) => {
            if (sortField === 'date') {
                return dateDirection === 'asc'
                    ? a.createdAt - b.createdAt
                    : b.createdAt - a.createdAt;
            }

            const aPage = getPageNumber(a);
            const bPage = getPageNumber(b);
            const isAscending = pageDirection === 'asc';

            if (aPage === undefined && bPage === undefined) {
                return b.createdAt - a.createdAt;
            }

            if (aPage === undefined) return 1;
            if (bPage === undefined) return -1;

            if (aPage !== bPage) {
                return isAscending ? aPage - bPage : bPage - aPage;
            }

            return b.createdAt - a.createdAt;
        });

        return sortedResult;
    }, [citations, selectedProjectId, projects, filter, searchTerm, username, sortField, dateDirection, pageDirection]);

    const viewTitle = useMemo(() => {
        if (searchTerm.trim()) return `Search: ${searchTerm}`;
        if (selectedProjectId) return projects.find(p => p.id === selectedProjectId)?.name || 'Project';
        if (filter) return filter.value || (filter.type === 'author' ? 'Author View' : 'Book View');
        return 'The Archive';
    }, [searchTerm, selectedProjectId, projects, filter]);

    return {
        searchTerm,
        setSearchTerm,
        filter,
        setFilter,
        selectedProjectId,
        setSelectedProjectId,
        editorPrefill,
        sortField,
        dateDirection,
        pageDirection,
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
