import { BookSource, Citation, SidebarItem } from '../../../types';
import { OrderedLabelItem } from '../contract/archiveViewContract';
import { normalizeBookKey, pickPreferredBook, sortByIndexThenLabel } from './archiveSort';

type AuthorNode = {
  id: string;
  label: string;
  books: Map<string, OrderedLabelItem>;
};

type LatestAuthorItem = Pick<OrderedLabelItem, 'id' | 'label'> & {
  latestCitationAt: number;
};

const sortByLatestCitationThenLabel = <T extends LatestAuthorItem>(items: T[]) =>
  [...items].sort((a, b) => {
    if (a.latestCitationAt !== b.latestCitationAt) return b.latestCitationAt - a.latestCitationAt;
    return a.label.localeCompare(b.label, 'ko');
  });

export const deriveAuthorOrder = (citations: Citation[], username: string, books: BookSource[] = []) => {
  const authorMap = new Map<string, LatestAuthorItem>();

  books.forEach((book) => {
    if (!book.authorId) return;
    const label = book.isSelf ? username : book.author;
    if (!label || label === username) return;

    const existing = authorMap.get(book.authorId);
    if (existing) {
      existing.latestCitationAt = Math.max(existing.latestCitationAt, book.createdAt);
      return;
    }

    authorMap.set(book.authorId, {
      id: book.authorId,
      label,
      latestCitationAt: book.createdAt,
    });
  });

  citations.reduce<Map<string, LatestAuthorItem>>((authors, citation) => {
      if (!citation.authorId) return authors;
      const label = citation.isSelf ? username : citation.author;
      if (!label || label === username) return authors;

      const existing = authors.get(citation.authorId);
      if (existing) {
        existing.latestCitationAt = Math.max(existing.latestCitationAt, citation.createdAt);
        return authors;
      }

      authors.set(citation.authorId, {
        id: citation.authorId,
        label,
        latestCitationAt: citation.createdAt,
      });
      return authors;
    }, authorMap);

  return sortByLatestCitationThenLabel(Array.from(authorMap.values())).map((row) => row.id);
};

export const findLatestCitationBook = (
  citations: Citation[],
  books: BookSource[]
): BookSource | null => {
  const latestCitation = citations
    .filter((citation) => citation.bookId && citation.book)
    .reduce<Citation | null>((latest, citation) => {
      if (!latest || citation.createdAt > latest.createdAt) return citation;
      return latest;
    }, null);

  if (!latestCitation?.bookId) return null;

  const persistedBook = books.find((book) => book.id === latestCitation.bookId);
  if (persistedBook) return persistedBook;

  if (!latestCitation.authorId) return null;

  return {
    id: latestCitation.bookId,
    title: latestCitation.book,
    sortIndex: latestCitation.bookSortIndex ?? null,
    createdAt: latestCitation.createdAt,
    authorId: latestCitation.authorId,
    author: latestCitation.author,
    authorSortIndex: latestCitation.authorSortIndex ?? null,
    isSelf: Boolean(latestCitation.isSelf),
  };
};

export const deriveBookOrderByAuthor = (citations: Citation[], books: BookSource[] = []) => {
  const grouped: Record<string, string[]> = {};
  const byAuthor = new Map<string, Map<string, OrderedLabelItem>>();

  books.forEach((book) => {
    if (!book.authorId || !book.id || !book.title) return;
    const existing = byAuthor.get(book.authorId) || new Map<string, OrderedLabelItem>();
    const key = normalizeBookKey(book.title);
    existing.set(
      key,
      pickPreferredBook(existing.get(key), {
        id: book.id,
        label: book.title,
        sortIndex: book.sortIndex,
      })
    );
    byAuthor.set(book.authorId, existing);
  });

  citations.forEach((citation) => {
    if (!citation.authorId || !citation.bookId || !citation.book) return;
    const existing = byAuthor.get(citation.authorId) || new Map<string, OrderedLabelItem>();
    const key = normalizeBookKey(citation.book);
    existing.set(
      key,
      pickPreferredBook(existing.get(key), {
        id: citation.bookId,
        label: citation.book,
        sortIndex: citation.bookSortIndex,
      })
    );
    byAuthor.set(citation.authorId, existing);
  });

  byAuthor.forEach((books, authorId) => {
    grouped[authorId] = sortByIndexThenLabel(Array.from(books.values())).map((book) => book.id);
  });

  return grouped;
};

export const getCurrentOrderedAuthors = (
  citations: Citation[],
  username: string,
  books: BookSource[] = []
) => deriveAuthorOrder(citations, username, books);

export const getCurrentOrderedBooks = (
  citations: Citation[],
  books: BookSource[],
  authorId: string,
  bookOrderByAuthor: Record<string, string[]>
) => {
  const map = new Map<string, OrderedLabelItem>();
  books.forEach((book) => {
    if (!book.authorId || book.authorId !== authorId || !book.id || !book.title) return;
    const key = normalizeBookKey(book.title);
    map.set(
      key,
      pickPreferredBook(map.get(key), {
        id: book.id,
        label: book.title,
        sortIndex: book.sortIndex,
      })
    );
  });

  citations.forEach((citation) => {
    if (!citation.authorId || citation.authorId !== authorId || !citation.bookId || !citation.book) return;
    const key = normalizeBookKey(citation.book);
    map.set(
      key,
      pickPreferredBook(map.get(key), {
        id: citation.bookId,
        label: citation.book,
        sortIndex: citation.bookSortIndex,
      })
    );
  });

  const sorted = sortByIndexThenLabel(Array.from(map.values()));
  const order = bookOrderByAuthor[authorId] || [];
  if (order.length === 0) return sorted.map((row) => row.id);

  const rank = new Map(order.map((id, index) => [id, index] as const));
  return [...sorted]
    .sort((a, b) => {
      const aRank = rank.get(a.id);
      const bRank = rank.get(b.id);
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;
      return 0;
    })
    .map((row) => row.id);
};

const buildAuthorMap = (citations: Citation[], books: BookSource[], username: string) => {
  const authorsMap = new Map<string, AuthorNode>();

  books.forEach((book) => {
    if (!book.authorId || !book.author) return;

    if (!authorsMap.has(book.authorId)) {
      authorsMap.set(book.authorId, {
        id: book.authorId,
        label: book.isSelf ? username : book.author,
        books: new Map(),
      });
    }

    const authorBooks = authorsMap.get(book.authorId)?.books;
    if (authorBooks) {
      authorBooks.set(
        book.id,
        pickPreferredBook(authorBooks.get(book.id), {
          id: book.id,
          label: book.title,
          sortIndex: book.sortIndex,
        })
      );
    }
  });

  citations.forEach((citation) => {
    if (!citation.authorId) return;
    const effectiveAuthor = citation.isSelf ? username : citation.author;
    if (!effectiveAuthor) return;

    if (!authorsMap.has(citation.authorId)) {
      authorsMap.set(citation.authorId, {
        id: citation.authorId,
        label: effectiveAuthor,
        books: new Map(),
      });
    }

    if (citation.bookId && citation.book) {
      const authorBooks = authorsMap.get(citation.authorId)?.books;
      if (authorBooks) {
        authorBooks.set(
          citation.bookId,
          pickPreferredBook(authorBooks.get(citation.bookId), {
            id: citation.bookId,
            label: citation.book,
            sortIndex: citation.bookSortIndex,
          })
        );
      }
    }
  });

  return authorsMap;
};

export const buildArchiveTree = (
  citations: Citation[],
  books: BookSource[],
  username: string,
  orderedAuthorIds: string[],
  getOrderedBooks: (authorId: string) => string[]
): SidebarItem[] => {
  const rootId = 'root-user';
  const rootItems: SidebarItem[] = [
    {
      id: rootId,
      label: username,
      type: 'root',
      data: { author: username, book: '' },
    },
  ];

  const authorsMap = buildAuthorMap(citations, books, username);
  const userAuthor = Array.from(authorsMap.values()).find((author) => author.label === username);

  if (userAuthor) {
    rootItems[0].data = { authorId: userAuthor.id, author: username, book: '' };
    rootItems[0].children = getOrderedBooks(userAuthor.id)
      .map((bookId) => userAuthor.books.get(bookId))
      .filter(Boolean)
      .map((book) => ({
        id: `book-${userAuthor.id}-${book!.id}`,
        label: book!.label,
        type: 'book' as const,
        data: { authorId: userAuthor.id, author: username, bookId: book!.id, book: book!.label },
      }));
  }

  const nonUserAuthors = Array.from(authorsMap.values()).filter((author) => author.label !== username);
  const authorById = new Map(nonUserAuthors.map((author) => [author.id, author]));

  const authorItems: SidebarItem[] = orderedAuthorIds
    .map((authorId) => authorById.get(authorId))
    .filter(Boolean)
    .map((author) => {
      const bookItems: SidebarItem[] = getOrderedBooks(author!.id)
        .map((bookId) => author!.books.get(bookId))
        .filter(Boolean)
        .map((book) => ({
          id: `book-${author!.id}-${book!.id}`,
          label: book!.label,
          type: 'book' as const,
          data: { authorId: author!.id, author: author!.label, bookId: book!.id, book: book!.label },
        }));

      return {
        id: `author-${author!.id}`,
        label: author!.label,
        type: 'author',
        data: { authorId: author!.id, author: author!.label },
        children: bookItems.length > 0 ? bookItems : undefined,
      };
    });

  return [...rootItems, ...authorItems];
};
