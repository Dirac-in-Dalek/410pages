import type { BookViewItem } from '../../../types';

export const buildCitationRenderRows = (orderedItems: BookViewItem[]) =>
  orderedItems.map(item => item.type === 'citation'
    ? { type: 'sentence' as const, id: item.id, citation: item.citation, pageSort: item.pageSort, createdAtSort: item.createdAtSort }
    : item);
