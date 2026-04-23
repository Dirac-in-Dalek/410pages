import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArchiveViewStateInput, ArchiveViewStateResult } from '../contract/archiveViewContract';
import { buildArchiveTree, deriveAuthorOrder, deriveBookOrderByAuthor, getCurrentOrderedAuthors, getCurrentOrderedBooks } from './archiveTree';
import { DEFAULT_ARCHIVE_TITLE, sortFilteredCitations } from './archiveSort';

export const useArchiveViewState = ({
  citations,
  projects,
  username,
}: ArchiveViewStateInput): ArchiveViewStateResult => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ArchiveViewStateResult['filter']>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [editorPrefill, setEditorPrefill] = useState<ArchiveViewStateResult['editorPrefill']>(undefined);
  const [sortField, setSortField] = useState<ArchiveViewStateResult['sortField']>('date');
  const [dateDirection, setDateDirection] = useState<ArchiveViewStateResult['dateDirection']>('desc');
  const [pageDirection, setPageDirection] = useState<ArchiveViewStateResult['pageDirection']>('asc');
  const [authorOrder, setAuthorOrder] = useState<string[]>([]);
  const [bookOrderByAuthor, setBookOrderByAuthor] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setAuthorOrder(deriveAuthorOrder(citations, username));
  }, [citations, username]);

  useEffect(() => {
    setBookOrderByAuthor(deriveBookOrderByAuthor(citations));
  }, [citations]);

  const handleDateSortClick = () => {
    if (sortField === 'date') {
      setDateDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField('date');
  };

  const handlePageSortClick = () => {
    if (sortField === 'page') {
      setPageDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField('page');
  };

  const handleProjectSelect = (id: string | null) => {
    setSelectedProjectId(id);
    setSelectedBookId(null);
    setFilter(null);
    setSearchTerm('');
    setEditorPrefill(undefined);
  };

  const handleTreeItemClick = (item: NonNullable<ArchiveViewStateResult['treeData']>[number]) => {
    if (!item.data) return;

    setEditorPrefill({
      author: item.data.author,
      book: item.data.book || '',
    });
    setFilter({
      type: item.type === 'book' ? 'book' : 'author',
      value: item.type === 'book' ? item.data.book! : item.data.author,
      author: item.data.author,
    });
    setSelectedProjectId(null);
    setSelectedBookId(item.type === 'book' ? item.data.bookId || null : null);
    setSearchTerm('');
  };

  const readCurrentOrderedAuthors = useCallback(
    () => getCurrentOrderedAuthors(citations, username, authorOrder),
    [citations, username, authorOrder]
  );

  const readCurrentOrderedBooks = useCallback(
    (authorId: string) => getCurrentOrderedBooks(citations, authorId, bookOrderByAuthor),
    [citations, bookOrderByAuthor]
  );

  const treeData = useMemo(
    () => buildArchiveTree(citations, username, readCurrentOrderedAuthors(), readCurrentOrderedBooks),
    [citations, username, readCurrentOrderedAuthors, readCurrentOrderedBooks]
  );

  const filteredCitations = useMemo(() => {
    let result = citations;

    if (selectedProjectId) {
      const project = projects.find((entry) => entry.id === selectedProjectId);
      result = result.filter((citation) => project?.citationIds.includes(citation.id));
    } else if (filter) {
      if (filter.type === 'author') {
        result = result.filter((citation) => {
          const effectiveAuthor = citation.isSelf ? username : citation.author;
          return effectiveAuthor === filter.value;
        });
      } else if (filter.type === 'book') {
        result = result.filter((citation) => {
          const isSameBook = citation.book === filter.value;
          const effectiveAuthor = citation.isSelf ? username : citation.author;
          const isSameAuthor = !filter.author || effectiveAuthor === filter.author;
          return isSameBook && isSameAuthor;
        });
      }
    }

    if (searchTerm.trim()) {
      const normalized = searchTerm.toLowerCase();
      result = result.filter(
        (citation) =>
          citation.text.toLowerCase().includes(normalized) ||
          citation.author.toLowerCase().includes(normalized) ||
          citation.book.toLowerCase().includes(normalized)
      );
    }

    return sortFilteredCitations(result, sortField, dateDirection, pageDirection);
  }, [citations, selectedProjectId, projects, filter, searchTerm, username, sortField, dateDirection, pageDirection]);

  const viewTitle = useMemo(() => {
    if (searchTerm.trim()) return `Search: ${searchTerm}`;
    if (selectedProjectId) return projects.find((entry) => entry.id === selectedProjectId)?.name || 'Project';
    if (filter) return filter.value || (filter.type === 'author' ? 'Author View' : 'Book View');
    return DEFAULT_ARCHIVE_TITLE;
  }, [searchTerm, selectedProjectId, projects, filter]);

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
    isBookView: selectedBookId !== null,
    handleDateSortClick,
    handlePageSortClick,
    handleProjectSelect,
    handleTreeItemClick,
    treeData,
    filteredCitations,
    viewTitle,
    getCurrentOrderedAuthors: readCurrentOrderedAuthors,
    getCurrentOrderedBooks: readCurrentOrderedBooks,
    setAuthorOrder,
    setBookOrderByAuthor,
  };
};
