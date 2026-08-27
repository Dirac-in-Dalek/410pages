import { useState } from 'react';
import type { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, ChapterBlock, Citation, Project } from '../../../types';
import type {
  ArchiveDataController,
  ArchiveSession,
} from '../contract/archiveMutationContract';
import { useArchiveMutations } from './useArchiveMutations';
import { useArchiveQuery } from './useArchiveQuery';

export const useArchiveDataController = (session: ArchiveSession): ArchiveDataController => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [authors, setAuthors] = useState<AuthorSource[]>([]);
  const [authorFolders, setAuthorFolders] = useState<AuthorFolder[]>([]);
  const [authorFolderMemberships, setAuthorFolderMemberships] = useState<AuthorFolderMembership[]>([]);
  const [books, setBooks] = useState<BookSource[]>([]);
  const [chapterBlocksByBook, setChapterBlocksByBook] = useState<Record<string, ChapterBlock[]>>({});

  const query = useArchiveQuery({
    session,
    setCitations,
    setAuthors,
    setAuthorFolders,
    setAuthorFolderMemberships,
    setBooks,
    setProjects,
    setChapterBlocksByBook,
  });

  const mutations = useArchiveMutations({
    session,
    projects,
    citations,
    authors,
    books,
    authorFolderMemberships,
    setProjects,
    setCitations,
    setAuthors,
    setAuthorFolders,
    setAuthorFolderMemberships,
    setBooks,
    setChapterBlocksByBook,
    invalidateDataLoad: query.invalidateDataLoad,
    invalidateAuthorFolderLoad: query.invalidateAuthorFolderLoad,
    refreshAuthorFolders: query.retryAuthorFolders,
    refreshChapterBlocks: query.refreshChapterBlocks,
  });

  return {
    projects,
    citations,
    authors,
    authorFolders,
    authorFolderMemberships,
    books,
    chapterBlocksByBook,
    loading: query.loading,
    loadError: query.loadError,
    authorFolderLoading: query.authorFolderLoading,
    authorFolderLoadError: query.authorFolderLoadError,
    chapterLoadError: query.chapterLoadError,
    chapterLoadingBookId: query.chapterLoadingBookId,
    fetchData: query.fetchData,
    retryAuthorFolders: query.retryAuthorFolders,
    invalidateDataLoad: query.invalidateDataLoad,
    handleLoadChapterBlocks: query.handleLoadChapterBlocks,
    refreshChapterBlocks: query.refreshChapterBlocks,
    cancelChapterBlockLoad: query.cancelChapterBlockLoad,
    ...mutations,
  };
};
