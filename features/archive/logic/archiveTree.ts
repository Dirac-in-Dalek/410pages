import { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, Citation, SidebarItem } from '../../../types';
import { OrderedLabelItem } from '../contract/archiveViewContract';
import { pickPreferredBook, sortByIndexThenLabel } from './archiveSort';

type AuthorNode = {
  id: string;
  label: string;
  books: Map<string, OrderedLabelItem>;
};

type LatestAuthorItem = Pick<OrderedLabelItem, 'id' | 'label'> & {
  activityAt: number;
  sortIndex?: number | null;
};

const sortTreeAuthors = <T extends LatestAuthorItem>(items: T[]) =>
  [...items].sort((a, b) => {
    if (typeof a.sortIndex === 'number' && typeof b.sortIndex === 'number' && a.sortIndex !== b.sortIndex) {
      return a.sortIndex - b.sortIndex;
    }
    if (typeof a.sortIndex === 'number') return -1;
    if (typeof b.sortIndex === 'number') return 1;
    if (a.activityAt !== b.activityAt) return b.activityAt - a.activityAt;
    return a.label.localeCompare(b.label, 'ko');
  });

const isPersistedSentence = (citation: Citation) =>
  citation.saveStatus !== 'saving' &&
  citation.saveStatus !== 'failed';

const getAuthorActivityById = (authors: AuthorSource[], citations: Citation[]) => {
  const activityByAuthorId = new Map(authors.map((author) => [author.id, author.createdAt]));
  citations.forEach((citation) => {
    if (!citation.authorId || !isPersistedSentence(citation)) return;
    activityByAuthorId.set(
      citation.authorId,
      Math.max(activityByAuthorId.get(citation.authorId) ?? 0, citation.createdAt)
    );
  });
  return activityByAuthorId;
};

export const sortAuthorsByActivity = (authors: AuthorSource[], citations: Citation[]) => {
  const activityByAuthorId = getAuthorActivityById(authors, citations);
  return [...authors].sort((a, b) => {
    const activityDifference = (activityByAuthorId.get(b.id) ?? 0) - (activityByAuthorId.get(a.id) ?? 0);
    return activityDifference || a.name.localeCompare(b.name, 'ko');
  });
};

export const deriveAuthorOrder = (
  citations: Citation[],
  username: string,
  books: BookSource[] = [],
  persistedAuthors: AuthorSource[] = []
) => {
  const authorMap = new Map<string, LatestAuthorItem>();
  const activityByAuthorId = getAuthorActivityById(persistedAuthors, citations);

  persistedAuthors.forEach((author) => {
    if (author.isSelf || !author.id) return;
    authorMap.set(author.id, {
      id: author.id,
      label: author.name,
      activityAt: activityByAuthorId.get(author.id) ?? 0,
      sortIndex: author.sortIndex,
    });
  });

  books.forEach((book) => {
    if (!book.authorId) return;
    const label = book.isSelf ? username : book.author;
    if (!label || label === username) return;

    const existing = authorMap.get(book.authorId);
    if (existing) return;

    authorMap.set(book.authorId, {
      id: book.authorId,
      label,
      activityAt: activityByAuthorId.get(book.authorId) ?? 0,
      sortIndex: book.authorSortIndex,
    });
  });

  citations.reduce<Map<string, LatestAuthorItem>>((authors, citation) => {
    if (!citation.authorId) return authors;
    const label = citation.isSelf ? username : citation.author;
    if (!label || label === username) return authors;

    const existing = authors.get(citation.authorId);
    if (existing) return authors;

    authors.set(citation.authorId, {
      id: citation.authorId,
      label,
      activityAt: activityByAuthorId.get(citation.authorId) ?? 0,
      sortIndex: citation.authorSortIndex,
    });
    return authors;
  }, authorMap);

  return sortTreeAuthors(Array.from(authorMap.values())).map((row) => row.id);
};

export const findRecentlyCitedBooks = (
  citations: Citation[],
  books: BookSource[],
  limit = 3
): BookSource[] => {
  const latestByBookId = new Map<string, number>();
  citations.forEach((citation) => {
    if (!citation.bookId || !isPersistedSentence(citation)) return;
    latestByBookId.set(
      citation.bookId,
      Math.max(latestByBookId.get(citation.bookId) ?? 0, citation.createdAt)
    );
  });

  return books
    .filter((book) => latestByBookId.has(book.id))
    .sort((a, b) => (latestByBookId.get(b.id) ?? 0) - (latestByBookId.get(a.id) ?? 0))
    .slice(0, limit);
};

export const deriveBookOrderByAuthor = (citations: Citation[], books: BookSource[] = []) => {
  const grouped: Record<string, string[]> = {};
  const byAuthor = new Map<string, Map<string, OrderedLabelItem>>();

  books.forEach((book) => {
    if (!book.authorId || !book.id || !book.title) return;
    const existing = byAuthor.get(book.authorId) || new Map<string, OrderedLabelItem>();
    existing.set(book.id, {
      id: book.id,
      label: book.title,
      sortIndex: book.sortIndex,
    });
    byAuthor.set(book.authorId, existing);
  });

  citations.forEach((citation) => {
    if (!citation.authorId || !citation.bookId || !citation.book) return;
    const existing = byAuthor.get(citation.authorId) || new Map<string, OrderedLabelItem>();
    if (!existing.has(citation.bookId)) {
      existing.set(citation.bookId, {
        id: citation.bookId,
        label: citation.book,
        sortIndex: citation.bookSortIndex,
      });
    }
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
  books: BookSource[] = [],
  authors: AuthorSource[] = [],
  authorOrder: string[] = []
) => {
  const sorted = deriveAuthorOrder(citations, username, books, authors);
  if (authorOrder.length === 0) return sorted;
  const rank = new Map(authorOrder.map((id, index) => [id, index] as const));
  return [...sorted].sort((a, b) => {
    const aRank = rank.get(a);
    const bRank = rank.get(b);
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return 0;
  });
};

export const getCurrentOrderedBooks = (
  citations: Citation[],
  books: BookSource[],
  authorId: string,
  bookOrderByAuthor: Record<string, string[]>
) => {
  const map = new Map<string, OrderedLabelItem>();
  books.forEach((book) => {
    if (!book.authorId || book.authorId !== authorId || !book.id || !book.title) return;
    map.set(book.id, {
      id: book.id,
      label: book.title,
      sortIndex: book.sortIndex,
    });
  });

  citations.forEach((citation) => {
    if (!citation.authorId || citation.authorId !== authorId || !citation.bookId || !citation.book) return;
    if (!map.has(citation.bookId)) {
      map.set(citation.bookId, {
        id: citation.bookId,
        label: citation.book,
        sortIndex: citation.bookSortIndex,
      });
    }
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

const buildAuthorMap = (
  citations: Citation[],
  books: BookSource[],
  username: string,
  persistedAuthors: AuthorSource[] = []
) => {
  const authorsMap = new Map<string, AuthorNode>();

  persistedAuthors.forEach((author) => {
    authorsMap.set(author.id, {
      id: author.id,
      label: author.isSelf ? username : author.name.trim() || '이름 없는 저자',
      books: new Map(),
    });
  });

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
  getOrderedBooks: (authorId: string) => string[],
  authors: AuthorSource[] = [],
  authorFolders?: AuthorFolder[],
  authorFolderMemberships?: AuthorFolderMembership[]
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

  const authorsMap = buildAuthorMap(citations, books, username, authors);
  const persistedSelfAuthorId = authors.find((author) => author.isSelf)?.id;
  const userAuthor = Array.from(authorsMap.values()).find((author) =>
    persistedSelfAuthorId ? author.id === persistedSelfAuthorId : author.label === username
  );

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

  const nonUserAuthors = Array.from(authorsMap.values()).filter((author) => author.id !== userAuthor?.id);
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

  if (!authorFolders || !authorFolderMemberships) return [...rootItems, ...authorItems];

  const membershipByAuthorId = new Map(
    authorFolderMemberships.map((membership) => [membership.authorId, membership.folderId])
  );
  const authorItemsByFolder = new Map<string, SidebarItem[]>();
  const looseAuthorItems: SidebarItem[] = [];
  authorItems.forEach((item) => {
    const folderId = item.data?.authorId ? membershipByAuthorId.get(item.data.authorId) : undefined;
    if (!folderId || !authorFolders.some((folder) => folder.id === folderId)) {
      looseAuthorItems.push(item);
      return;
    }
    const items = authorItemsByFolder.get(folderId) || [];
    items.push(item);
    authorItemsByFolder.set(folderId, items);
  });

  const folderItems: SidebarItem[] = [...authorFolders]
    .sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt)
    .map((folder) => ({
      id: `author-folder-${folder.id}`,
      label: folder.name,
      type: 'author_folder',
      data: { folderId: folder.id, author: '', book: '' },
      children: authorItemsByFolder.get(folder.id) || [],
    }));
  return [...rootItems, ...folderItems, ...looseAuthorItems];
};
