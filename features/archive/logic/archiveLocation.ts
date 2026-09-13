export type ArchiveLocation = { book?: string; author?: string; folder?: string };
export type ArchiveHistoryMode = 'push' | 'replace' | false;

export function readArchiveLocation(ownerKey: string): ArchiveLocation {
  if (window.history.state?.archiveOwner && window.history.state.archiveOwner !== ownerKey) return {};
  const query = new URL(window.location.href).searchParams;
  return { book: query.get('book') || undefined, author: query.get('author') || undefined, folder: query.get('folder') || undefined };
}

export function writeArchiveLocation(location: ArchiveLocation, ownerKey: string | undefined, mode: ArchiveHistoryMode) {
  if (!ownerKey || !mode) return;
  const url = new URL(window.location.href);
  for (const key of ['book', 'author', 'folder'] as const) {
    if (location[key]) url.searchParams.set(key, location[key]);
    else url.searchParams.delete(key);
  }
  const state = { ...window.history.state, archiveOwner: ownerKey };
  if (mode === 'replace' || url.href === window.location.href) window.history.replaceState(state, '', url);
  else window.history.pushState(state, '', url);
}
