import type { CitationEditorValues } from '../contract/citationEntryContract';
import type { BookInsertion } from '../../archive/logic/bookInsertion';

export type BookComposerDraft = {
  values?: CitationEditorValues;
  insertion?: BookInsertion | null;
  chapterMode?: boolean;
  saving?: boolean;
  error?: string;
  revealInsertion?: BookInsertion;
};

/** Owned by the signed-in shell, so layout and book screens can remount safely. */
export class BookComposerDraftStore extends Map<string, BookComposerDraft> {
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  patch(id: string, update: Partial<BookComposerDraft>) {
    super.set(id, { ...this.get(id), ...update });
    this.listeners.forEach(listener => listener());
  }
}
