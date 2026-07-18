import React, { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import type { Citation } from '../../../types';
import { writeTextToClipboard } from '../../../lib/citationCopy';

type WordCardProps = {
  citation: Citation;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onRetrySave: (citationId: string) => void | Promise<unknown>;
};

export const WordCard: React.FC<WordCardProps> = ({
  citation,
  isSelected,
  onToggleSelect,
  onRetrySave,
}) => {
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [recoveryCopyFailed, setRecoveryCopyFailed] = useState(false);
  const isFailed = citation.saveStatus === 'failed';
  const recoveryId = isFailed ? `word-recovery-${citation.id}` : undefined;

  const handleRecoveryCopy = async () => {
    try {
      await writeTextToClipboard(citation.text);
      setRecoveryCopyFailed(false);
      setRecoveryCopied(true);
      window.setTimeout(() => setRecoveryCopied(false), 1600);
    } catch (error) {
      console.error('Failed to copy word recovery text:', error);
      setRecoveryCopied(false);
      setRecoveryCopyFailed(true);
    }
  };

  return (
    <div role="listitem" className="flex min-w-0 flex-col items-start">
      <div
        aria-describedby={recoveryId}
        className={`flex min-h-10 max-w-full items-center rounded-lg shadow-[0_1px_2px_rgba(28,22,16,0.04)] transition-[background-color,border-color] duration-150 motion-reduce:transition-none ${
          isSelected
            ? 'border border-[var(--accent-border)] bg-[var(--accent-soft)]'
            : 'border border-[var(--border-main)] bg-[var(--bg-card)]'
        }`}
      >
        <label className="flex min-h-10 min-w-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg active:scale-95">
          <input
            type="checkbox"
            checked={isSelected}
            aria-label={`Select word: ${citation.text}`}
            onChange={(event) => onToggleSelect(citation.id, event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-[var(--border-main)] text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          />
        </label>
        <span className="type-body max-w-full whitespace-nowrap py-2 pr-3 text-[var(--text-main)]">
          {citation.text}
        </span>
      </div>

      {isFailed ? (
        <div
          id={recoveryId}
          role="alert"
          className="mt-1 flex min-h-10 items-center gap-1 rounded-lg bg-[var(--bg-input)] px-2 text-[0.72rem] text-red-600 shadow-[0_1px_2px_rgba(28,22,16,0.04)]"
        >
          <span className="whitespace-nowrap">저장 실패</span>
          {recoveryCopyFailed ? <span className="whitespace-nowrap">복사 실패</span> : null}
          <button
            type="button"
            aria-label={`Copy failed word: ${citation.text}`}
            onClick={() => void handleRecoveryCopy()}
            className="inline-flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-[color,transform] duration-150 hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none"
          >
            {recoveryCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            aria-label={`Retry saving word: ${citation.text}`}
            onClick={() => void onRetrySave(citation.id)}
            className="inline-flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-lg text-[var(--accent)] transition-[color,transform] duration-150 hover:text-[var(--accent-strong)] active:scale-95 motion-reduce:transition-none"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
};
