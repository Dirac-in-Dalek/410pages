import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArchiveViewStateInput, ArchiveViewStateResult } from '../contract/archiveViewContract';
import { buildArchiveTree, deriveBookOrderByAuthor, findLatestCitationBook, getCurrentOrderedAuthors, getCurrentOrderedBooks } from './archiveTree';
import { DEFAULT_ARCHIVE_TITLE, sortFilteredCitations } from './archiveSort';

export const useArchiveViewState = ({
  citations,
  books,
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
  const [bookOrderByAuthor, setBookOrderByAuthor] = useState<Record<string, string[]>>({});
  const didApplyInitialBookRef = useRef(false);

  useEffect(() => {
    setBookOrderByAuthor(deriveBookOrderByAuthor(citations, books));
  }, [books, citations]);

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

  const handleBookSourceSelect = useCallback((book: { id: string; title: string; authorId: string; author: string }) => {
    setEditorPrefill({
      author: book.author,
      book: book.title,
    });
    setFilter({
      type: 'book',
      value: book.title,
      author: book.author,
    });
    setSelectedProjectId(null);
    setSelectedBookId(book.id);
    setSearchTerm('');
  }, []);

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

  useEffect(() => {
    if (didApplyInitialBookRef.current) return;
    if (citations.length === 0) return;

    const latestBook = findLatestCitationBook(citations, books);
    if (!latestBook) return;

    didApplyInitialBookRef.current = true;
    handleBookSourceSelect(latestBook);
  }, [books, citations, handleBookSourceSelect]);

  const readCurrentOrderedAuthors = useCallback(
    () => getCurrentOrderedAuthors(citations, username, books),
    [books, citations, username]
  );

  const readCurrentOrderedBooks = useCallback(
    (authorId: string) => getCurrentOrderedBooks(citations, books, authorId, bookOrderByAuthor),
    [books, citations, bookOrderByAuthor]
  );

  const treeData = useMemo(
    () => buildArchiveTree(citations, books, username, readCurrentOrderedAuthors(), readCurrentOrderedBooks),
    [books, citations, username, readCurrentOrderedAuthors, readCurrentOrderedBooks]
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
    handleBookSourceSelect,
    treeData,
    filteredCitations,
    viewTitle,
    getCurrentOrderedAuthors: readCurrentOrderedAuthors,
    getCurrentOrderedBooks: readCurrentOrderedBooks,
    setBookOrderByAuthor,
  };
};
