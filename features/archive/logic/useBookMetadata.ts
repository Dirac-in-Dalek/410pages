import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase';

export type BookMetadata = {
  itemId: number;
  matchType?: 'book' | 'series-cover';
  title: string;
  author: string;
  isbn13: string;
  publisher?: string;
  publishedAt?: string;
  totalPages?: number | null;
  coverUrl: string | null;
  sourceUrl: string;
  tableOfContents: string;
};

const keyFor = (title: string, author: string) => `yes24-book.v1:${JSON.stringify([title, author])}`;
const pending = new Map<string, Promise<BookMetadata | null>>();
let queue: Promise<unknown> = Promise.resolve();

function validMetadata(value: unknown): value is BookMetadata {
  if (!value || typeof value !== 'object') return false;
  const item = value as BookMetadata;
  return Number.isSafeInteger(item.itemId) && item.itemId > 0 &&
    typeof item.title === 'string' && typeof item.author === 'string' && typeof item.isbn13 === 'string' &&
    typeof item.tableOfContents === 'string' &&
    (item.coverUrl === null || (typeof item.coverUrl === 'string' && item.coverUrl.startsWith('https://image.yes24.com/'))) &&
    item.sourceUrl === `https://www.yes24.com/product/goods/${item.itemId}`;
}

function readCached(key: string): BookMetadata | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return validMetadata(value) ? value : null;
  } catch { return null; }
}

export function forgetBookMetadata(title: string, author: string) {
  try { localStorage.removeItem(keyFor(title, author)); } catch { /* Display still falls back when storage is unavailable. */ }
}

export async function loadBookMetadata(title: string, author: string): Promise<BookMetadata | null> {
  if (!title.trim() || !author.trim()) return null;
  const key = keyFor(title, author);
  const cached = readCached(key);
  if (cached) return cached;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = queue.then(async () => {
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      if (!data.session?.access_token) return null;
      const response = await fetch(`/api/book-metadata?${new URLSearchParams({ title, author })}`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: AbortSignal.timeout(35000),
      });
      if (!response.ok) return null;
      const { metadata } = await response.json();
      if (!validMetadata(metadata)) return null;
      try { localStorage.setItem(key, JSON.stringify(metadata)); } catch { /* A cache failure must not hide a valid cover. */ }
      return metadata;
    } catch { return null; }
  });
  pending.set(key, request);
  queue = request;
  try { return await request; } finally { pending.delete(key); }
}

export function useBookMetadata(title: string, author: string, enabled = true) {
  const key = enabled ? keyFor(title, author) : '';
  const [result, setResult] = useState<{ key: string; metadata: BookMetadata | null }>(() => ({ key, metadata: key ? readCached(key) : null }));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loadBookMetadata(title, author).then(metadata => {
      if (active) setResult({ key, metadata });
    });
    return () => { active = false; };
  }, [key, title, author, enabled]);
  return result.key === key ? result.metadata : null;
}
