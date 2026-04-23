import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Citation, Project } from '../../../types';
import { fetchChapterBlocks } from '../../../shared/api/chapterBlockApi';
import { fetchCitations } from '../../../shared/api/citationApi';
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
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setChapterBlocksByBook: Dispatch<SetStateAction<ChapterBlocksByBook>>;
};

export const useArchiveQuery = ({
  session,
  setCitations,
  setProjects,
  setChapterBlocksByBook,
}: UseArchiveQueryOptions): ArchiveQueryController => {
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [citationsData, projectsData] = await Promise.all([
        fetchCitations(),
        fetchProjects(),
      ]);
      setCitations(citationsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [setCitations, setProjects]);

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
