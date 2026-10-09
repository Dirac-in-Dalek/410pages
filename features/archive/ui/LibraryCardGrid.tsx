import React from 'react';

export function LibraryCardGrid({ children, books = false }: { children: React.ReactNode; books?: boolean }) {
  return (
    <div className="library-gallery">
      <div className={`library-card-grid${books ? ' library-card-grid--books' : ''}`}>{children}</div>
    </div>
  );
}
