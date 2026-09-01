import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArchiveViewStateInput, ArchiveViewStateResult } from '../contract/archiveViewContract';
import { buildArchiveTree, deriveBookOrderByAuthor, getCurrentOrderedAuthors, getCurrentOrderedBooks } from './archiveTree';
import { DEFAULT_ARCHIVE_TITLE, sortFilteredCitations } from './archiveSort';

const EMPTY_AUTHORS: NonNullable<ArchiveViewStateInput['authors']> = [];

const reconcileOrder = (current: string[], derived: string[]) => {
  const derivedIds = new Set(derived);
  const retained = current.filter((id) => derivedIds.has(id));
  const retainedIds = new Set(retained);
  return [...retained, ...derived.filter((id) => !retainedIds.has(id))];
};

const isSameOrder = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

export const useArchiveViewState = ({
  citations,
  authors: inputAuthors,
  authorFolders = [],
  authorFolderMemberships = [],
  books,
  projects,
  username,
}: ArchiveViewStateInput): ArchiveViewStateResult => {
  const authors = inputAuthors ?? EMPTY_AUTHORS;
  const [searchTerm, setSearchTermState] = useState('');
  const [filter, setFilter] = useState<ArchiveViewStateResult['filter']>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isHomeView, setIsHomeView] = useState(true);
  const [sortField, setSortField] = useState<ArchiveViewStateResult['sortField']>('date');
  const [dateDirection, setDateDirection] = useState<ArchiveViewStateResult['dateDirection']>('desc');
  const [pageDirection, setPageDirection] = useState<ArchiveViewStateResult['pageDirection']>('asc');
  const [bookOrderByAuthor, setBookOrderByAuthor] = useState<Record<string, string[]>>({});
  const [authorOrder, setAuthorOrder] = useState<string[]>([]);
  const canonicalAuthorOrderKey = authors
    .map((author) => `${author.id}:${author.sortIndex ?? ''}`)
    .sort()
    .join('|');
  const canonicalBookOrderKey = books
    .map((book) => `${book.id}:${book.authorId}:${book.sortIndex ?? ''}`)
    .sort()
    .join('|');
  const canonicalAuthorOrderKeyRef = useRef<string | null>(null);
  const canonicalBookOrderKeyRef = useRef<string | null>(null);

  const setSearchTerm: ArchiveViewStateResult['setSearchTerm'] = (nextValue) => {
    if (typeof nextValue === 'function') {
      setSearchTermState(nextValue);
      setIsHomeView(false);
      return;
    }
    setSearchTermState(nextValue);
    setIsHomeView(nextValue.trim() ? false : selectedBookId === null && selectedProjectId === null && filter === null);
  };

  useEffect(() => {
    const derivedAuthors = getCurrentOrderedAuthors(citations, username, books, authors);
    const authorSourceChanged = canonicalAuthorOrderKeyRef.current !== canonicalAuthorOrderKey;
    canonicalAuthorOrderKeyRef.current = canonicalAuthorOrderKey;
    setAuthorOrder((current) => {
      const next = authorSourceChanged ? derivedAuthors : reconcileOrder(current, derivedAuthors);
      return isSameOrder(current, next) ? current : next;
    });
    const derivedBooks = deriveBookOrderByAuthor(citations, books);
    const bookSourceChanged = canonicalBookOrderKeyRef.current !== canonicalBookOrderKey;
    canonicalBookOrderKeyRef.current = canonicalBookOrderKey;
    setBookOrderByAuthor((current) => {
      const next = Object.fromEntries(Object.entries(derivedBooks).map(([authorId, ids]) => [
        authorId,
        bookSourceChanged ? ids : reconcileOrder(current[authorId] || [], ids),
      ]));
      const keys = Object.keys(next);
      return keys.length === Object.keys(current).length && keys.every((authorId) =>
        isSameOrder(current[authorId] || [], next[authorId])
      ) ? current : next;
    });
  }, [authors, books, canonicalAuthorOrderKey, canonicalBookOrderKey, citations, username]);

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
    setIsHomeView(id === null);
    setSelectedProjectId(id);
    setSelectedBookId(null);
    setFilter(null);
    setSearchTermState('');
  };

  const handleHomeSelect = () => handleProjectSelect(null);

  const handleAuthorSourceSelect = useCallback((author: { id: string; name: string }) => {
    setIsHomeView(false);
    setFilter({
      type: 'author',
      authorId: author.id,
      value: author.name,
    });
    setSelectedProjectId(null);
    setSelectedBookId(null);
    setSearchTermState('');
  }, []);

  const handleBookSourceSelect = useCallback((book: { id: string; title: string; authorId: string; author: string }) => {
    setIsHomeView(false);
    setFilter({
      type: 'book',
      bookId: book.id,
      authorId: book.authorId,
      value: book.title,
      author: book.author,
    });
    setSelectedProjectId(null);
    setSelectedBookId(book.id);
    setSortField('date');
    setDateDirection('asc');
    setSearchTermState('');
  }, []);

  const handleTreeItemClick = (item: NonNullable<ArchiveViewStateResult['treeData']>[number]) => {
    if (!item.data || (item.type !== 'author' && item.type !== 'book' && item.type !== 'root')) return;

    if (item.type === 'book') {
      if (!item.data.bookId) return;
      const book = books.find((entry) => entry.id === item.data?.bookId);
      if (book) handleBookSourceSelect(book);
      return;
    }

    if (!item.data.authorId) return;
    handleAuthorSourceSelect({ id: item.data.authorId, name: item.data.author });
  };

  useEffect(() => {
    if (!filter) return;
    if (filter.type === 'book' && !books.some((book) => book.id === filter.bookId)) {
      const author = authors.find((entry) => entry.id === filter.authorId);
      if (author) {
        setFilter({
          type: 'author',
          authorId: author.id,
          value: author.isSelf ? username : author.name.trim() || '이름 없는 저자',
        });
        setSelectedBookId(null);
        return;
      }
      setFilter(null);
      setSelectedBookId(null);
      setIsHomeView(true);
      return;
    }

    if (
      filter.type === 'author' &&
      !authors.some((author) => author.id === filter.authorId) &&
      !books.some((book) => book.authorId === filter.authorId)
    ) {
      setFilter(null);
      setSelectedBookId(null);
      setIsHomeView(true);
    }
  }, [authors, books, filter, username]);

  const resolvedFilter = useMemo<ArchiveViewStateResult['filter']>(() => {
    if (!filter) return null;

    if (filter.type === 'book') {
      const book = books.find((entry) => entry.id === filter.bookId);
      return book
        ? {
            ...filter,
            authorId: book.authorId,
            value: book.title,
            author: book.author,
          }
        : filter;
    }

    const author = authors.find((entry) => entry.id === filter.authorId);
    if (author) return { ...filter, value: author.isSelf ? username : author.name.trim() || '이름 없는 저자' };
    const authorBook = books.find((entry) => entry.authorId === filter.authorId);
    return authorBook ? { ...filter, value: authorBook.author } : filter;
  }, [authors, books, filter, username]);

  const editorPrefill = useMemo<ArchiveViewStateResult['editorPrefill']>(() => {
    if (!resolvedFilter) return undefined;
    if (resolvedFilter.type === 'book') {
      return {
        author: resolvedFilter.author,
        book: resolvedFilter.value,
        bookId: resolvedFilter.bookId,
      };
    }
    return { author: resolvedFilter.value, book: '' };
  }, [resolvedFilter]);

  const readCurrentOrderedAuthors = useCallback(
    () => getCurrentOrderedAuthors(citations, username, books, authors, authorOrder),
    [authorOrder, authors, books, citations, username]
  );

  const readCurrentOrderedBooks = useCallback(
    (authorId: string) => getCurrentOrderedBooks(citations, books, authorId, bookOrderByAuthor),
    [books, citations, bookOrderByAuthor]
  );

  const treeData = useMemo(
    () => buildArchiveTree(
      citations,
      books,
      username,
      readCurrentOrderedAuthors(),
      readCurrentOrderedBooks,
      authors,
      authorFolders,
      authorFolderMemberships
    ),
    [authorFolderMemberships, authorFolders, authors, books, citations, username, readCurrentOrderedAuthors, readCurrentOrderedBooks]
  );

  const filteredCitations = useMemo(() => {
    let result = citations;

    if (selectedProjectId) {
      const project = projects.find((entry) => entry.id === selectedProjectId);
      result = result.filter((citation) => project?.citationIds.includes(citation.id));
    } else if (filter?.type === 'author') {
      result = result.filter((citation) => citation.authorId === filter.authorId);
    } else if (filter?.type === 'book') {
      result = result.filter((citation) => citation.bookId === filter.bookId);
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
  }, [citations, selectedProjectId, projects, filter, searchTerm, sortField, dateDirection, pageDirection]);

  const viewTitle = useMemo(() => {
    if (searchTerm.trim()) return `Search: ${searchTerm}`;
    if (selectedProjectId) return projects.find((entry) => entry.id === selectedProjectId)?.name || 'Project';
    if (resolvedFilter) return resolvedFilter.value || (resolvedFilter.type === 'author' ? 'Author View' : 'Book View');
    return DEFAULT_ARCHIVE_TITLE;
  }, [searchTerm, selectedProjectId, projects, resolvedFilter]);

  return {
    searchTerm,
    setSearchTerm,
    filter: resolvedFilter,
    selectedProjectId,
    selectedBookId,
    selectedAuthorId: resolvedFilter?.authorId ?? null,
    isHomeView,
    editorPrefill,
    sortField,
    dateDirection,
    pageDirection,
    isBookView: selectedBookId !== null,
    isAuthorView: resolvedFilter?.type === 'author' && selectedBookId === null,
    handleDateSortClick,
    handlePageSortClick,
    handleProjectSelect,
    handleHomeSelect,
    handleTreeItemClick,
    handleAuthorSourceSelect,
    handleBookSourceSelect,
    treeData,
    filteredCitations,
    viewTitle,
    getCurrentOrderedBooks: readCurrentOrderedBooks,
    getCurrentOrderedAuthors: readCurrentOrderedAuthors,
    setAuthorOrder,
    setBookOrderByAuthor,
  };
};
