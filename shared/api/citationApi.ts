import { api } from '../../lib/api';
import type { AddCitationInput, Citation, CitationSourceInput } from '../../types';

export const fetchCitations = () => api.fetchCitations();

export const addCitation = (userId: string, data: AddCitationInput) =>
  api.addCitation(userId, data);

export const updateCitation = (userId: string, citationId: string, data: Partial<Citation>) =>
  api.updateCitation(userId, citationId, data);

export const deleteCitation = (userId: string, citationId: string) =>
  api.deleteCitation(userId, citationId);

export const bulkUpdateCitationSource = (
  userId: string,
  citationIds: string[],
  source: CitationSourceInput
) => api.bulkUpdateCitationSource(userId, citationIds, source);

export const addNote = (userId: string, citationId: string, content: string) =>
  api.addNote(userId, citationId, content);

export const updateNote = (userId: string, noteId: string, content: string) =>
  api.updateNote(userId, noteId, content);

export const deleteNote = (userId: string, noteId: string) =>
  api.deleteNote(userId, noteId);
