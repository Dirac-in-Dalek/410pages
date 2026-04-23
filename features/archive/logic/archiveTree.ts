import { Citation, SidebarItem } from '../../../types';
import { OrderedLabelItem } from '../contract/archiveViewContract';
import { normalizeBookKey, pickPreferredBook, sortByIndexThenLabel } from './archiveSort';

type AuthorNode = {
  id: string;
  label: string;
  sortIndex?: number | null;
  books: Map<string, OrderedLabelItem>;
};

export const deriveAuthorOrder = (citations: Citation[], username: string) =>
  sortByIndexThenLabel(
    Array.from(
      new Map(
        citations
          .filter((citation) => citation.authorId && (citation.isSelf ? username : citation.author) !== username)
          .map((citation) => [
            citation.authorId!,
            {
              id: citation.authorId!,
              label: citation.isSelf ? username : citation.author,
              sortIndex: citation.authorSortIndex,
            },
          ])
      ).values()
    )
  ).map((row) => row.id);

export const deriveBookOrderByAuthor = (citations: Citation[]) => {
  const grouped: Record<string, string[]> = {};
  const byAuthor = new Map<string, Map<string, OrderedLabelItem>>();

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
  authorOrder: string[]
) => {
  const map = new Map<string, OrderedLabelItem>();
  citations.forEach((citation) => {
    if (!citation.authorId) return;
    const label = citation.isSelf ? username : citation.author;
    if (!label || label === username) return;
    if (!map.has(citation.authorId)) {
      map.set(citation.authorId, {
        id: citation.authorId,
        label,
        sortIndex: citation.authorSortIndex,
      });
    }
  });

  const sorted = sortByIndexThenLabel(Array.from(map.values()));
  if (authorOrder.length === 0) return sorted.map((row) => row.id);

  const rank = new Map(authorOrder.map((id, index) => [id, index] as const));
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

export const getCurrentOrderedBooks = (
  citations: Citation[],
  authorId: string,
  bookOrderByAuthor: Record<string, string[]>
) => {
  const map = new Map<string, OrderedLabelItem>();
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

const buildAuthorMap = (citations: Citation[], username: string) => {
  const authorsMap = new Map<string, AuthorNode>();

  citations.forEach((citation) => {
    if (!citation.authorId) return;
    const effectiveAuthor = citation.isSelf ? username : citation.author;
    if (!effectiveAuthor) return;

    if (!authorsMap.has(citation.authorId)) {
      authorsMap.set(citation.authorId, {
        id: citation.authorId,
        label: effectiveAuthor,
        sortIndex: citation.authorSortIndex,
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

  const authorsMap = buildAuthorMap(citations, username);
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
