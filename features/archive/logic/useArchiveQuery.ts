import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, Citation, Project } from '../../../types';
import { fetchAuthors } from '../../../shared/api/authorApi';
import { fetchAuthorFolders } from '../../../shared/api/authorFolderApi';
import { fetchChapterBlocks } from '../../../shared/api/chapterBlockApi';
import { fetchCitations } from '../../../shared/api/citationApi';
import { fetchBooks } from '../../../shared/api/bookApi';
import { fetchProjects } from '../../../shared/api/projectApi';
import type {
  ArchiveQueryController,
  ArchiveSession,
  ChapterBlocksByBook,
} from '../contract/archiveMutationContract';
import { mergeChapterBlocksByBook, mergeFetchedCitations } from './archiveLocalPatch';
import { readCitationDrafts } from './citationDraftStorage';

type UseArchiveQueryOptions = {
  session: ArchiveSession;
  setCitations: Dispatch<SetStateAction<Citation[]>>;
  setAuthors: Dispatch<SetStateAction<AuthorSource[]>>;
  setAuthorFolders: Dispatch<SetStateAction<AuthorFolder[]>>;
  setAuthorFolderMemberships: Dispatch<SetStateAction<AuthorFolderMembership[]>>;
  setBooks: Dispatch<SetStateAction<BookSource[]>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setChapterBlocksByBook: Dispatch<SetStateAction<ChapterBlocksByBook>>;
};

export const useArchiveQuery = ({
  session,
  setCitations,
  setAuthors,
  setAuthorFolders,
  setAuthorFolderMemberships,
  setBooks,
  setProjects,
  setChapterBlocksByBook,
}: UseArchiveQueryOptions): ArchiveQueryController & { invalidateAuthorFolderLoad: () => void } => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authorFolderLoading, setAuthorFolderLoading] = useState(false);
  const [authorFolderLoadError, setAuthorFolderLoadError] = useState<string | null>(null);
  const [chapterLoadError, setChapterLoadError] = useState<string | null>(null);
  const [chapterLoadingBookId, setChapterLoadingBookId] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);
  const authorFolderRequestGenerationRef = useRef(0);
  const activeDataRequestCountRef = useRef(0);
  const chapterViewGenerationRef = useRef(0);
  const chapterRequestGenerationByBookRef = useRef(new Map<string, number>());
  const activeChapterBookIdRef = useRef<string | null>(null);
  const ownerId = session?.user.id ?? null;
  const previousOwnerIdRef = useRef(ownerId);

  useEffect(() => {
    const didOwnerChange = previousOwnerIdRef.current !== ownerId;
    previousOwnerIdRef.current = ownerId;
    const restoredDrafts = ownerId ? readCitationDrafts(ownerId) : [];
    setCitations((current) => {
      if (didOwnerChange) return restoredDrafts;
      const currentIds = new Set(current.map((citation) => citation.id));
      return [...restoredDrafts.filter((citation) => !currentIds.has(citation.id)), ...current];
    });
    if (didOwnerChange) {
      setAuthors([]);
      setAuthorFolders([]);
      setAuthorFolderMemberships([]);
      setBooks([]);
      setProjects([]);
      setChapterBlocksByBook({});
    }
    requestGenerationRef.current += 1;
    authorFolderRequestGenerationRef.current += 1;
    chapterViewGenerationRef.current += 1;
    chapterRequestGenerationByBookRef.current.clear();
    activeChapterBookIdRef.current = null;
    setLoading(false);
    setLoadError(null);
    setAuthorFolderLoading(false);
    setAuthorFolderLoadError(null);
    setChapterLoadError(null);
    setChapterLoadingBookId(null);
    return () => {
      requestGenerationRef.current += 1;
      authorFolderRequestGenerationRef.current += 1;
      chapterViewGenerationRef.current += 1;
      chapterRequestGenerationByBookRef.current.clear();
      activeChapterBookIdRef.current = null;
    };
  }, [ownerId]);

  const retryAuthorFolders = useCallback(async () => {
    const requestGeneration = ++authorFolderRequestGenerationRef.current;
    setAuthorFolderLoading(true);
    setAuthorFolderLoadError(null);
    try {
      const data = ownerId
        ? await fetchAuthorFolders(ownerId)
        : { folders: [], memberships: [] };
      if (requestGeneration !== authorFolderRequestGenerationRef.current) return;
      setAuthorFolders(data.folders);
      setAuthorFolderMemberships(data.memberships);
    } catch (error) {
      console.error('Error fetching author folders:', error);
      if (requestGeneration === authorFolderRequestGenerationRef.current) {
        setAuthorFolderLoadError('저자 폴더를 불러오지 못했습니다.');
      }
    } finally {
      if (requestGeneration === authorFolderRequestGenerationRef.current) {
        setAuthorFolderLoading(false);
      }
    }
  }, [ownerId, setAuthorFolderMemberships, setAuthorFolders]);

  const invalidateAuthorFolderLoad = useCallback(() => {
    authorFolderRequestGenerationRef.current += 1;
    setAuthorFolderLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    activeDataRequestCountRef.current += 1;
    setLoading(true);
    setLoadError(null);
    void retryAuthorFolders();
    try {
      const [citationsData, authorsData, booksData, projectsData] = await Promise.all([
        fetchCitations(),
        ownerId ? fetchAuthors(ownerId) : Promise.resolve([]),
        ownerId ? fetchBooks(ownerId) : Promise.resolve([]),
        fetchProjects(),
      ]);
      if (requestGeneration !== requestGenerationRef.current) return;
      const authorById = new Map(authorsData.map((author) => [author.id, author]));
      setCitations((current) => mergeFetchedCitations(current, citationsData));
      setAuthors(authorsData);
      setBooks(booksData.map((book) => {
        const author = authorById.get(book.authorId);
        return author ? {
          ...book,
          author: author.name,
          authorSortIndex: author.sortIndex,
          isSelf: author.isSelf,
        } : book;
      }));
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (requestGeneration === requestGenerationRef.current) {
        setLoadError('책장을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
      }
    } finally {
      activeDataRequestCountRef.current = Math.max(0, activeDataRequestCountRef.current - 1);
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [ownerId, retryAuthorFolders, setAuthors, setBooks, setCitations, setProjects]);

  const invalidateDataLoad = useCallback(() => {
    const shouldRefresh = activeDataRequestCountRef.current > 0;
    requestGenerationRef.current += 1;
    setLoading(false);
    if (shouldRefresh) void fetchData();
  }, [fetchData]);

  const loadChapterBlocks = useCallback(
    async (bookId: string, foreground: boolean) => {
      if (!ownerId) {
        return;
      }
      const requestGeneration = (chapterRequestGenerationByBookRef.current.get(bookId) ?? 0) + 1;
      chapterRequestGenerationByBookRef.current.set(bookId, requestGeneration);
      const viewGeneration = foreground ? ++chapterViewGenerationRef.current : null;
      const takesOverForeground = !foreground && activeChapterBookIdRef.current === bookId;
      const takeoverViewGeneration = takesOverForeground ? chapterViewGenerationRef.current : null;
      if (foreground) {
        activeChapterBookIdRef.current = bookId;
        setChapterLoadError(null);
        setChapterLoadingBookId(bookId);
      }

      try {
        const chapterBlocks = await fetchChapterBlocks(ownerId, bookId);
        if (requestGeneration !== chapterRequestGenerationByBookRef.current.get(bookId)) return;
        setChapterBlocksByBook((current) => mergeChapterBlocksByBook(current, bookId, chapterBlocks));
        if (
          (foreground && viewGeneration === chapterViewGenerationRef.current) ||
          (takesOverForeground && takeoverViewGeneration === chapterViewGenerationRef.current)
        ) {
          setChapterLoadError(null);
        }
      } catch (error) {
        console.error('Error fetching chapter blocks:', error);
        const isCurrentRequest =
          requestGeneration === chapterRequestGenerationByBookRef.current.get(bookId);
        const ownsVisibleBook =
          (foreground && viewGeneration === chapterViewGenerationRef.current) ||
          (takesOverForeground && takeoverViewGeneration === chapterViewGenerationRef.current);
        if (isCurrentRequest && ownsVisibleBook) {
          setChapterLoadError('챕터를 불러오지 못했습니다. 다시 시도해 주세요.');
        }
      } finally {
        const isCurrentRequest =
          requestGeneration === chapterRequestGenerationByBookRef.current.get(bookId);
        const ownsVisibleBook =
          (foreground && viewGeneration === chapterViewGenerationRef.current) ||
          (takesOverForeground && takeoverViewGeneration === chapterViewGenerationRef.current);
        if (isCurrentRequest && ownsVisibleBook) {
          activeChapterBookIdRef.current = null;
          setChapterLoadingBookId(null);
        }
      }
    },
    [ownerId, setChapterBlocksByBook]
  );

  const handleLoadChapterBlocks = useCallback(
    (bookId: string) => loadChapterBlocks(bookId, true),
    [loadChapterBlocks]
  );

  const refreshChapterBlocks = useCallback(
    (bookId: string) => loadChapterBlocks(bookId, false),
    [loadChapterBlocks]
  );

  const cancelChapterBlockLoad = useCallback(() => {
    const activeBookId = activeChapterBookIdRef.current;
    if (activeBookId) {
      chapterRequestGenerationByBookRef.current.set(
        activeBookId,
        (chapterRequestGenerationByBookRef.current.get(activeBookId) ?? 0) + 1
      );
    }
    activeChapterBookIdRef.current = null;
    chapterViewGenerationRef.current += 1;
    setChapterLoadError(null);
    setChapterLoadingBookId(null);
  }, []);

  return {
    loading,
    loadError,
    authorFolderLoading,
    authorFolderLoadError,
    chapterLoadError,
    chapterLoadingBookId,
    fetchData,
    retryAuthorFolders,
    invalidateAuthorFolderLoad,
    invalidateDataLoad,
    handleLoadChapterBlocks,
    refreshChapterBlocks,
    cancelChapterBlockLoad,
  };
};
