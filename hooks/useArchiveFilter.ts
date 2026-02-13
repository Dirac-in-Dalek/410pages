import { useState, useMemo, useEffect, useCallback } from 'react';
import { Citation, Project, SidebarItem } from '../types';

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

const reorderByTarget = (source: string[], dragLabel: string, dropLabel: string): string[] => {
    const unique = Array.from(new Set(source));
    if (!unique.includes(dragLabel)) unique.push(dragLabel);
    if (!unique.includes(dropLabel)) unique.push(dropLabel);

    const fromIndex = unique.indexOf(dragLabel);
    const targetIndex = unique.indexOf(dropLabel);
    if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return unique;

    unique.splice(fromIndex, 1);
    const insertIndex = unique.indexOf(dropLabel);
    unique.splice(insertIndex, 0, dragLabel);
    return unique;
};

const reorderByIndex = (source: string[], dragLabel: string, dropIndex: number): string[] => {
    const unique = Array.from(new Set(source));
    if (!unique.includes(dragLabel)) unique.push(dragLabel);

    const fromIndex = unique.indexOf(dragLabel);
    if (fromIndex < 0) return unique;

    unique.splice(fromIndex, 1);
    const adjustedIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
    const safeIndex = Math.max(0, Math.min(adjustedIndex, unique.length));
    unique.splice(safeIndex, 0, dragLabel);
    return unique;
};

const applyCustomOrder = (labels: string[], order: string[]): string[] => {
    const rank = new Map(order.map((label, index) => [label, index]));
    return [...labels].sort((a, b) => {
        const aRank = rank.get(a);
        const bRank = rank.get(b);

        if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
        if (aRank !== undefined) return -1;
        if (bRank !== undefined) return 1;
        return a.localeCompare(b, 'ko');
    });
};

export const useArchiveFilter = (citations: Citation[], projects: Project[], username: string) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterState | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [editorPrefill, setEditorPrefill] = useState<{ author: string, book: string } | undefined>(undefined);
    const [sortField, setSortField] = useState<SortField>('date');
    const [dateDirection, setDateDirection] = useState<SortDirection>('desc');
    const [pageDirection, setPageDirection] = useState<SortDirection>('asc');
    const [authorOrder, setAuthorOrder] = useState<string[]>([]);
    const [bookOrderByAuthor, setBookOrderByAuthor] = useState<Record<string, string[]>>({});

    const authorOrderKey = `citationGraph.authorOrder.${username}`;
    const bookOrderKey = `citationGraph.bookOrderByAuthor.${username}`;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const rawAuthorOrder = localStorage.getItem(authorOrderKey);
            const parsedAuthorOrder = rawAuthorOrder ? JSON.parse(rawAuthorOrder) : [];
            setAuthorOrder(Array.isArray(parsedAuthorOrder) ? parsedAuthorOrder : []);
        } catch {
            setAuthorOrder([]);
        }

        try {
            const rawBookOrder = localStorage.getItem(bookOrderKey);
            const parsedBookOrder = rawBookOrder ? JSON.parse(rawBookOrder) : {};
            const normalized = parsedBookOrder && typeof parsedBookOrder === 'object' ? parsedBookOrder : {};
            setBookOrderByAuthor(normalized);
        } catch {
            setBookOrderByAuthor({});
        }
    }, [authorOrderKey, bookOrderKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(authorOrderKey, JSON.stringify(authorOrder));
    }, [authorOrderKey, authorOrder]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(bookOrderKey, JSON.stringify(bookOrderByAuthor));
    }, [bookOrderKey, bookOrderByAuthor]);

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
        const labels = Array.from(new Set(
            citations
                .map(c => (c.isSelf ? username : c.author))
                .filter(author => author && author !== username)
        ));
        return applyCustomOrder(labels, authorOrder);
    }, [citations, username, authorOrder]);

    const getCurrentOrderedBooks = useCallback((author: string) => {
        const labels = Array.from(new Set(
            citations
                .map(c => ({
                    author: c.isSelf ? username : c.author,
                    book: c.book
                }))
                .filter(row => row.author === author && row.book)
                .map(row => row.book)
        ));
        return applyCustomOrder(labels, bookOrderByAuthor[author] || []);
    }, [citations, username, bookOrderByAuthor]);

    const handleReorderAuthor = useCallback((dragAuthor: string, dropAuthor: string) => {
        if (!dragAuthor || !dropAuthor || dragAuthor === dropAuthor) return;
        setAuthorOrder(prev => reorderByTarget(prev, dragAuthor, dropAuthor));
    }, []);

    const handleReorderAuthorAt = useCallback((dragAuthor: string, dropIndex: number) => {
        if (!dragAuthor) return;
        const orderedAuthors = getCurrentOrderedAuthors();
        setAuthorOrder(reorderByIndex(orderedAuthors, dragAuthor, dropIndex));
    }, [getCurrentOrderedAuthors]);

    const handleReorderBook = useCallback((author: string, dragBook: string, dropBook: string) => {
        if (!author || !dragBook || !dropBook || dragBook === dropBook) return;
        setBookOrderByAuthor(prev => {
            const existing = prev[author] ?? [];
            return {
                ...prev,
                [author]: reorderByTarget(existing, dragBook, dropBook)
            };
        });
    }, []);

    const handleReorderBookAt = useCallback((author: string, dragBook: string, dropIndex: number) => {
        if (!author || !dragBook) return;
        const orderedBooks = getCurrentOrderedBooks(author);
        setBookOrderByAuthor(prev => {
            return {
                ...prev,
                [author]: reorderByIndex(orderedBooks, dragBook, dropIndex)
            };
        });
    }, [getCurrentOrderedBooks]);

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

        const authorsMap = new Map<string, Set<string>>();
        citations.forEach(c => {
            const effectiveAuthor = c.isSelf ? username : c.author;
            if (effectiveAuthor) {
                if (!authorsMap.has(effectiveAuthor)) authorsMap.set(effectiveAuthor, new Set());
                if (c.book) authorsMap.get(effectiveAuthor)?.add(c.book);
            }
        });

        const userBooks = authorsMap.get(username);
        if (userBooks) {
            const userBookLabels = applyCustomOrder(Array.from(userBooks), bookOrderByAuthor[username] || []);
            rootItems[0].children = userBookLabels.map(book => ({
                id: `book-${username}-${book}`,
                label: book,
                type: 'book',
                data: { author: username, book }
            }));
        }

        const orderedAuthors = applyCustomOrder(
            Array.from(authorsMap.keys()).filter(author => author !== username),
            authorOrder
        );

        const authorItems: SidebarItem[] = orderedAuthors
            .map(author => {
                const books = authorsMap.get(author) || new Set<string>();
                const orderedBooks = applyCustomOrder(Array.from(books), bookOrderByAuthor[author] || []);
                const bookItems: SidebarItem[] = orderedBooks.map(book => ({
                    id: `book-${author}-${book}`,
                    label: book,
                    type: 'book',
                    data: { author, book }
                }));
                return {
                    id: `author-${author}`,
                    label: author,
                    type: 'author',
                    data: { author },
                    children: bookItems.length > 0 ? bookItems : undefined
                };
            });

        return [...rootItems, ...authorItems];
    }, [citations, username, authorOrder, bookOrderByAuthor]);

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
        handleReorderAuthor,
        handleReorderAuthorAt,
        handleReorderBook,
        handleReorderBookAt,
        handleProjectSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle
    };
};
