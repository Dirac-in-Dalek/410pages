import { Citation } from '../../../types';
import { OrderedLabelItem, SortDirection, SortField } from '../contract/archiveViewContract';

export const DEFAULT_ARCHIVE_TITLE = 'Dashboard';

export const getPageNumber = (citation: Citation): number | undefined => {
  if (typeof citation.pageSort === 'number') return citation.pageSort;
  if (!citation.page) return undefined;
  const match = citation.page.match(/\d+/);
  if (!match) return undefined;
  return Number(match[0]);
};

export const reorderByIndex = (source: string[], dragId: string, dropIndex: number): string[] => {
  const unique = Array.from(new Set(source));
  if (!unique.includes(dragId)) unique.push(dragId);

  const fromIndex = unique.indexOf(dragId);
  if (fromIndex < 0) return unique;

  unique.splice(fromIndex, 1);
  const adjustedIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
  const safeIndex = Math.max(0, Math.min(adjustedIndex, unique.length));
  unique.splice(safeIndex, 0, dragId);
  return unique;
};

export const sortByIndexThenLabel = <T extends OrderedLabelItem>(items: T[]) =>
  [...items].sort((a, b) => {
    const aSort = a.sortIndex;
    const bSort = b.sortIndex;
    if (typeof aSort === 'number' && typeof bSort === 'number' && aSort !== bSort) return aSort - bSort;
    if (typeof aSort === 'number') return -1;
    if (typeof bSort === 'number') return 1;
    return a.label.localeCompare(b.label, 'ko');
  });

export const normalizeBookKey = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const pickPreferredBook = (
  current: OrderedLabelItem | undefined,
  candidate: OrderedLabelItem
) => {
  if (!current) return candidate;
  const currentSort = current.sortIndex;
  const candidateSort = candidate.sortIndex;
  if (typeof currentSort !== 'number' && typeof candidateSort === 'number') return candidate;
  if (typeof currentSort === 'number' && typeof candidateSort === 'number' && candidateSort < currentSort) {
    return candidate;
  }
  return current;
};

export const sortFilteredCitations = (
  citations: Citation[],
  sortField: SortField,
  dateDirection: SortDirection,
  pageDirection: SortDirection
) =>
  [...citations].sort((a, b) => {
    if (sortField === 'date') {
      return dateDirection === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    }

    const aPage = getPageNumber(a);
    const bPage = getPageNumber(b);
    const isAscending = pageDirection === 'asc';

    if (aPage === undefined && bPage === undefined) {
      return b.createdAt - a.createdAt;
    }

    if (aPage === undefined) return 1;
    if (bPage === undefined) return -1;

    if (aPage !== bPage) {
      return isAscending ? aPage - bPage : bPage - aPage;
    }

    return b.createdAt - a.createdAt;
  });
