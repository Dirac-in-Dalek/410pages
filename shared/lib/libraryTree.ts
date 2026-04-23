import type { SidebarItem } from '../../types';

export type LibrarySelectedFilter = {
  type: 'author' | 'book';
  value: string;
  author?: string;
} | null;

const DEFAULT_EXPANDED_NODE_IDS = ['root-user'];

export const createDefaultExpandedLibraryNodes = () => new Set(DEFAULT_EXPANDED_NODE_IDS);

export const toggleExpandedLibraryNode = (expandedNodes: Set<string>, id: string) => {
  const next = new Set(expandedNodes);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export const ensureExpandedLibraryNode = (expandedNodes: Set<string>, id: string) => {
  if (expandedNodes.has(id)) {
    return expandedNodes;
  }

  const next = new Set(expandedNodes);
  next.add(id);
  return next;
};

export const getLibraryTreePaddingLeft = (depth: number) => depth * 12 + 12;

export const isLibraryTreeItemActive = (
  item: SidebarItem,
  selectedFilter?: LibrarySelectedFilter
) => {
  if (!selectedFilter) return false;
  if (item.type !== 'author' && item.type !== 'book') return false;

  const itemValue = item.type === 'book' ? item.data?.book : item.data?.author;
  if (selectedFilter.type !== item.type || selectedFilter.value !== itemValue) {
    return false;
  }

  if (item.type !== 'book') {
    return true;
  }

  return selectedFilter.author === item.data?.author;
};
