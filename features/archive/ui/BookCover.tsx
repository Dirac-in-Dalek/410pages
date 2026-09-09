import React, { useState } from 'react';
import { forgetBookMetadata, useBookMetadata } from '../logic/useBookMetadata';

export function BookCover({ title, author }: { title: string; author: string }) {
  const metadata = useBookMetadata(title, author);
  const [loadedUrl, setLoadedUrl] = useState('');
  const [failedUrl, setFailedUrl] = useState('');
  if (!metadata?.coverUrl || failedUrl === metadata.coverUrl) return null;
  return (
    <img
      src={metadata.coverUrl}
      alt={`${title} 표지`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={() => setLoadedUrl(metadata.coverUrl)}
      onError={() => { setFailedUrl(metadata.coverUrl); forgetBookMetadata(title, author); }}
      className={`absolute inset-0 h-full w-full bg-[var(--bg-card)] object-contain ${loadedUrl === metadata.coverUrl ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
