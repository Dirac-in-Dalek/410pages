import type { Citation, Highlight } from '../../../types';

const CITATION_DRAFT_STORAGE_PREFIX = 'citation-drafts.v1';

export const getCitationDraftStorageKey = (userId: string) =>
  `${CITATION_DRAFT_STORAGE_PREFIX}:${userId}`;

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const optionalString = (value: unknown) => typeof value === 'string' ? value : undefined;
const optionalNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const optionalNullableNumber = (value: unknown) => value === null ? null : optionalNumber(value);

const normalizeHighlights = (value: unknown): Highlight[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry): Highlight[] => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.start !== 'number' ||
      typeof candidate.end !== 'number'
    ) return [];
    return [{
      id: candidate.id,
      start: candidate.start,
      end: candidate.end,
      color: optionalString(candidate.color),
    }];
  });
};

const normalizeDraft = (value: unknown): Citation | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    (candidate.kind !== 'sentence' && candidate.kind !== 'word') ||
    typeof candidate.text !== 'string' ||
    typeof candidate.author !== 'string' ||
    typeof candidate.book !== 'string' ||
    typeof candidate.createdAt !== 'number'
  ) return null;

  return {
    id: candidate.id,
    kind: candidate.kind,
    text: candidate.text,
    authorId: optionalString(candidate.authorId),
    author: candidate.author,
    authorSortIndex: optionalNullableNumber(candidate.authorSortIndex),
    isSelf: typeof candidate.isSelf === 'boolean' ? candidate.isSelf : undefined,
    bookId: optionalString(candidate.bookId),
    book: candidate.book,
    bookSortIndex: optionalNullableNumber(candidate.bookSortIndex),
    page: optionalString(candidate.page),
    pageSort: optionalNumber(candidate.pageSort),
    notes: [],
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    highlights: normalizeHighlights(candidate.highlights),
    createdAt: candidate.createdAt,
    saveStatus: 'failed',
  };
};

export const readCitationDrafts = (userId: string): Citation[] => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(getCitationDraftStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.flatMap((entry): Citation[] => {
          const draft = normalizeDraft(entry);
          return draft ? [draft] : [];
        })
      : [];
  } catch {
    return [];
  }
};

export const storeCitationDraft = (userId: string, draft: Citation) => {
  const storage = getStorage();
  if (!storage) return false;
  const current = readCitationDrafts(userId);
  const next = [...current.filter((entry) => entry.id !== draft.id), draft];
  try {
    storage.setItem(getCitationDraftStorageKey(userId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const removeCitationDrafts = (userId: string, citationIds: Iterable<string>) => {
  const storage = getStorage();
  if (!storage) return false;
  const deletedIds = new Set(citationIds);
  const next = readCitationDrafts(userId).filter((entry) => !deletedIds.has(entry.id));
  try {
    if (next.length === 0) storage.removeItem(getCitationDraftStorageKey(userId));
    else storage.setItem(getCitationDraftStorageKey(userId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const removeCitationDraft = (userId: string, citationId: string) =>
  removeCitationDrafts(userId, [citationId]);
