// Compatibility entry point for existing profile callers and API regression tests.
import { resolveStoredProfileAvatarPath, updateProfile, getProfileAvatarPublicUrl, uploadProfileAvatar } from '../shared/api/profileApi';
import { fetchAuthors, createAuthor, reorderAuthors, renameAuthor } from '../shared/api/authorApi';
import { fetchAuthorFolders, createAuthorFolder, renameAuthorFolder, deleteAuthorFolder, moveAuthorToFolder, removeAuthorFromFolder, deleteAuthorCascade, previewAuthorDeletion } from '../shared/api/authorFolderApi';
import { fetchBooks, deleteBookCascade, previewBookDeletion, createBook, reorderBooks, renameBook, updateBookMemo } from '../shared/api/bookApi';
import { fetchChapterBlocks, createChapterBlock, moveChapterBlock, renameChapterBlock, deleteChapterBlock } from '../shared/api/chapterBlockApi';
import { fetchCitations, addCitation, updateCitation, bulkUpdateCitationSource, deleteCitations, addNote, updateNote, deleteNote } from '../shared/api/citationApi';
import { fetchProjects, createProject, reorderProjects, renameProject, deleteProject, addCitationToProject, addCitationsToProject } from '../shared/api/projectApi';
export { PROFILE_AVATAR_BUCKET, resolveStoredProfileAvatarPath } from '../shared/api/profileApi';

export const api = {
  resolveStoredProfileAvatarPath,
  updateProfile,
  getProfileAvatarPublicUrl,
  uploadProfileAvatar,
  fetchBooks,
  fetchAuthors,
  fetchAuthorFolders,
  createAuthorFolder,
  renameAuthorFolder,
  deleteAuthorFolder,
  moveAuthorToFolder,
  removeAuthorFromFolder,
  deleteAuthorCascade,
  previewAuthorDeletion,
  deleteBookCascade,
  previewBookDeletion,
  createAuthor,
  createBook,
  fetchChapterBlocks,
  createChapterBlock,
  moveChapterBlock,
  renameChapterBlock,
  deleteChapterBlock,
  fetchCitations,
  addCitation,
  updateCitation,
  bulkUpdateCitationSource,
  deleteCitations,
  addNote,
  updateNote,
  deleteNote,
  fetchProjects,
  createProject,
  reorderProjects,
  reorderAuthors,
  reorderBooks,
  renameProject,
  renameAuthor,
  renameBook,
  updateBookMemo,
  deleteProject,
  addCitationToProject,
  addCitationsToProject,
};
