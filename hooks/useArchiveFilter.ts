import { useState, useMemo } from 'react';
import { Citation, Project, SidebarItem } from '../types';

interface FilterState {
    type: 'author' | 'book';
    value: string;
    author?: string;
}

export const useArchiveFilter = (citations: Citation[], projects: Project[], username: string) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterState | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [editorPrefill, setEditorPrefill] = useState<{ author: string, book: string } | undefined>(undefined);

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
            rootItems[0].children = Array.from(userBooks).map(book => ({
                id: `book-${username}-${book}`,
                label: book,
                type: 'book',
                data: { author: username, book }
            }));
            rootItems[0].children.sort((a, b) => a.label.localeCompare(b.label));
        }

        const authorItems: SidebarItem[] = Array.from(authorsMap.entries())
            .filter(([author]) => author !== username)
            .map(([author, books]) => {
                const bookItems: SidebarItem[] = Array.from(books).map(book => ({
                    id: `book-${author}-${book}`,
                    label: book,
                    type: 'book',
                    data: { author, book }
                }));
                bookItems.sort((a, b) => a.label.localeCompare(b.label));
                return {
                    id: `author-${author}`,
                    label: author,
                    type: 'author',
                    data: { author },
                    children: bookItems.length > 0 ? bookItems : undefined
                };
            });

        authorItems.sort((a, b) => a.label.localeCompare(b.label));
        return [...rootItems, ...authorItems];
    }, [citations, username]);

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

        return result;
    }, [citations, selectedProjectId, projects, filter, searchTerm, username]);

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
        handleProjectSelect,
        handleTreeItemClick,
        treeData,
        filteredCitations,
        viewTitle
    };
};
