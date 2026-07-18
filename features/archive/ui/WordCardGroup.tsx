import React from 'react';
import type { Citation } from '../../../types';
import { WordCard } from './WordCard';

type WordCardGroupProps = {
  citations: Citation[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, selected: boolean) => void;
  onRetrySave: (citationId: string) => void | Promise<unknown>;
};

export const WordCardGroup: React.FC<WordCardGroupProps> = ({
  citations,
  selectedIds,
  onToggleSelect,
  onRetrySave,
}) => (
  <div
    role="list"
    aria-label="Collected words"
    className="mb-2.5 flex flex-wrap items-start gap-1.5 px-1 sm:gap-2"
  >
    {citations.map((citation) => (
      <WordCard
        key={citation.id}
        citation={citation}
        isSelected={selectedIds.has(citation.id)}
        onToggleSelect={onToggleSelect}
        onRetrySave={onRetrySave}
      />
    ))}
  </div>
);
