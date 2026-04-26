import { useState } from 'react';
import type { ChapterBlock, Citation, Project } from '../../../types';
import type {
  ArchiveDataController,
  ArchiveSession,
} from '../contract/archiveMutationContract';
import { useArchiveMutations } from './useArchiveMutations';
import { useArchiveQuery } from './useArchiveQuery';

export const useArchiveDataController = (session: ArchiveSession): ArchiveDataController => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [chapterBlocksByBook, setChapterBlocksByBook] = useState<Record<string, ChapterBlock[]>>({});

  const query = useArchiveQuery({
    session,
    setCitations,
    setProjects,
    setChapterBlocksByBook,
  });

  const mutations = useArchiveMutations({
    session,
    projects,
    citations,
    setProjects,
    setCitations,
    setChapterBlocksByBook,
    fetchData: query.fetchData,
  });

  return {
    projects,
    setProjects,
    citations,
    setCitations,
    chapterBlocksByBook,
    loading: query.loading,
    fetchData: query.fetchData,
    handleLoadChapterBlocks: query.handleLoadChapterBlocks,
    ...mutations,
  };
};
