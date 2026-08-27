import type { ComponentProps } from 'react';
import { ReaderScreen } from '../../features/reader/ui/ReaderScreen';
import type { ReaderScreenFactoryInput } from '../contract/appShellScreenContract';

export const createReaderScreenProps = (
  input: ReaderScreenFactoryInput
): ComponentProps<typeof ReaderScreen> => ({
  username: input.username,
  onBack: input.onBack,
  citations: input.citations,
  projects: input.projects,
  loading: input.dataLoading,
  pendingDeleteCitationIds: input.pendingDeleteCitationIds,
  sessionUserId: input.sessionUserId,
  initialMeta: input.initialMeta,
  onAddCitation: input.onAddCitation,
  onRetryCitationSave: input.onRetryCitationSave,
  onAddNote: input.onAddNote,
  onUpdateNote: input.onUpdateNote,
  onDeleteNote: input.onDeleteNote,
  onDeleteCitation: input.onDeleteCitation,
  onUpdateCitation: input.onUpdateCitation,
  onBulkUpdateCitationSource: input.onBulkUpdateCitationSource,
});
