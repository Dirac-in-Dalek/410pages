import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BookSource, Citation, Project } from '../../../types';
import { fetchChapterBlocks } from '../../../shared/api/chapterBlockApi';
import { fetchCitations } from '../../../shared/api/citationApi';
import { fetchBooks } from '../../../shared/api/bookApi';
import { fetchProjects } from '../../../shared/api/projectApi';
import type {
  ArchiveQueryController,
  ArchiveSession,
  ChapterBlocksByBook,
} from '../contract/archiveMutationContract';
import { mergeChapterBlocksByBook } from './archiveLocalPatch';

type UseArchiveQueryOptions = {
  session: ArchiveSession;
  setCitations: Dispatch<SetStateAction<Citation[]>>;
  setBooks: Dispatch<SetStateAction<BookSource[]>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setChapterBlocksByBook: Dispatch<SetStateAction<ChapterBlocksByBook>>;
};

export const useArchiveQuery = ({
  session,
  setCitations,
  setBooks,
  setProjects,
  setChapterBlocksByBook,
}: UseArchiveQueryOptions): ArchiveQueryController => {
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [citationsData, booksData, projectsData] = await Promise.all([
        fetchCitations(),
        session ? fetchBooks(session.user.id) : Promise.resolve([]),
        fetchProjects(),
      ]);
      setCitations(citationsData);
      setBooks(booksData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [session, setBooks, setCitations, setProjects]);

  const handleLoadChapterBlocks = useCallback(
    async (bookId: string) => {
      if (!session) {
        return;
      }

      try {
        const chapterBlocks = await fetchChapterBlocks(session.user.id, bookId);
        setChapterBlocksByBook((current) => mergeChapterBlocksByBook(current, bookId, chapterBlocks));
      } catch (error) {
        console.error('Error fetching chapter blocks:', error);
      }
    },
    [session, setChapterBlocksByBook]
  );

  return {
    loading,
    fetchData,
    handleLoadChapterBlocks,
  };
};
