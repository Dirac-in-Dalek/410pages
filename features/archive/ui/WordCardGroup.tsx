import React, { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import type { Citation } from '../../../types';
import { formatCitationRecoveryText, writeTextToClipboard } from '../../../lib/citationCopy';
import { WordCard } from './WordCard';

type WordCardGroupProps = {
  citations: Citation[];
  username: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, selected: boolean) => void;
  onRetrySave: (citationId: string) => void | Promise<unknown>;
  onUpdate: (id: string, data: Partial<Citation>) => boolean | void | Promise<boolean | void>;
};

export const WordCardGroup: React.FC<WordCardGroupProps> = ({
  citations,
  username,
  selectedIds,
  onToggleSelect,
  onRetrySave,
  onUpdate,
}) => {
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const failedCitations = citations.filter((citation) => citation.saveStatus === 'failed');

  const handleRetryFailed = () => {
    void Promise.allSettled(failedCitations.map((citation) => Promise.resolve(onRetrySave(citation.id))));
  };

  const handleCopyFailed = async () => {
    try {
      await writeTextToClipboard(
        failedCitations.map((citation) => formatCitationRecoveryText(citation, username)).join('\n\n')
      );
      setRecoveryCopied(true);
      window.setTimeout(() => setRecoveryCopied(false), 1600);
    } catch (error) {
      console.error('Failed to copy failed words:', error);
    }
  };

  return (
    <div className="min-w-0">
      <div role="list" aria-label="수집한 단어" className="flex min-w-0 flex-col">
        {citations.map((citation) => (
          <WordCard
            key={citation.id}
            citation={citation}
            isSelected={selectedIds.has(citation.id)}
            onToggleSelect={onToggleSelect}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {failedCitations.length > 0 ? (
        <div
          role="alert"
          className="mt-1.5 flex min-h-11 max-w-full items-center justify-between gap-3 rounded-lg bg-red-50 px-3 text-sm text-red-800 dark:bg-red-400/10 dark:text-red-100"
        >
          <span className="min-w-0">{failedCitations.length}개 저장 실패</span>
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void handleCopyFailed()}
              className="inline-flex min-h-10 touch-manipulation items-center gap-1.5 rounded-lg px-2 font-semibold transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10 motion-reduce:transition-none"
              aria-label={`저장에 실패한 단어 ${failedCitations.length}개 복사`}
            >
              <Copy size={14} />
              {recoveryCopied ? '복사됨' : '복사'}
            </button>
            <button
              type="button"
              onClick={handleRetryFailed}
              className="inline-flex min-h-10 touch-manipulation items-center gap-1.5 rounded-lg px-2 font-semibold transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10 motion-reduce:transition-none"
              aria-label={`저장에 실패한 단어 ${failedCitations.length}개 다시 시도`}
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
};
