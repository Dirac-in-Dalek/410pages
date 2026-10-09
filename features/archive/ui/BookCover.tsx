import React, { useState } from 'react';
import { forgetBookMetadata, useBookMetadata } from '../logic/useBookMetadata';

export function BookCover({ title, author }: { title: string; author: string }) {
  const metadata = useBookMetadata(title, author);
  const [loadedUrl, setLoadedUrl] = useState('');
  const [failedUrl, setFailedUrl] = useState('');
  const coverUrl = metadata?.coverUrl;
  if (!coverUrl || failedUrl === coverUrl) return null;
  return (
    <img
      src={coverUrl}
      alt={`${title} 표지`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={() => setLoadedUrl(coverUrl)}
      onError={() => { setFailedUrl(coverUrl); forgetBookMetadata(title, author); }}
      className={`absolute inset-0 h-full w-full bg-[var(--bg-card)] object-contain ${loadedUrl === coverUrl ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
