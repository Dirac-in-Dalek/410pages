import React, { useState } from 'react';
import { AlertCircle, Pencil } from 'lucide-react';
import type { Citation } from '../../../types';
import { EditorialInlineRenameField } from '../../../shared/ui/sidebar/SidebarControls';

type WordCardProps = {
  citation: Citation;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onUpdate: (id: string, data: Partial<Citation>) => boolean | void | Promise<boolean | void>;
};

export const WordCard: React.FC<WordCardProps> = ({
  citation,
  isSelected,
  onToggleSelect,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(citation.text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFailed = citation.saveStatus === 'failed';
  const isSaving = citation.saveStatus === 'saving';

  const cancelEdit = () => {
    setEditText(citation.text);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const didUpdate = await Promise.resolve(onUpdate(citation.id, { text: trimmed }));
      if (didUpdate === false) return;
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="listitem"
      onDoubleClick={(event) => {
        if (isSaving) return;
        if ((event.target as HTMLElement).closest('button, input, label')) return;
        setEditText(citation.text);
        setIsEditing(true);
      }}
      className={[
        'group flex min-h-14 w-full items-start border-b border-[var(--border-main)] transition-[background-color,color] duration-150',
        isSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--sidebar-hover)]',
        isFailed ? 'bg-red-50/60 dark:bg-red-500/10' : '',
      ].join(' ')}
    >
      <label className="flex min-h-14 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          aria-label={`단어 선택: ${citation.text}`}
          onChange={(event) => onToggleSelect(citation.id, event.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-[var(--border-main)] text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        />
      </label>
      <div className="min-w-0 flex-1 px-1 py-4">
        {isEditing ? (
          <EditorialInlineRenameField value={editText} onChange={setEditText} onSubmit={() => void saveEdit()} onCancel={cancelEdit} placeholder="단어" confirmAriaLabel="단어 수정 저장" cancelAriaLabel="단어 수정 취소" />
        ) : (
          <>
            <span className="block break-words font-[var(--font-display-active)] text-[1.02rem] leading-7 text-[var(--text-main)]">{citation.text}</span>
            <span className="mt-1 block text-[0.76rem] text-[var(--text-muted)]">{new Date(citation.createdAt).toLocaleDateString('ko-KR')}</span>
          </>
        )}
      </div>
      {isFailed ? <AlertCircle size={16} aria-label="저장 실패" className="mt-5 shrink-0 text-red-600 dark:text-red-300" /> : null}
      {!isEditing ? (
        <button type="button" disabled={isSaving} onClick={() => { setEditText(citation.text); setIsEditing(true); }} className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-100 transition-[background-color,opacity,transform] hover:bg-[var(--bg-input)] focus-visible:opacity-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`단어 편집: ${citation.text}`}>
          <Pencil size={15} />
        </button>
      ) : null}
    </div>
  );
};
