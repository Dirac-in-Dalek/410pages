import type { CitationEditDraft } from '../contract/citationCardContract';

/** Session-owned drafts stay reactive when a filtered card unmounts and returns. */
export class CitationEditDraftStore extends Map<string, CitationEditDraft> {
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  override set(id: string, draft: CitationEditDraft) {
    super.set(id, draft);
    this.listeners.forEach(listener => listener());
    return this;
  }
  override delete(id: string) {
    const removed = super.delete(id);
    if (removed) this.listeners.forEach(listener => listener());
    return removed;
  }
}
