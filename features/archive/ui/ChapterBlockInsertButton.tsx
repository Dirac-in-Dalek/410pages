import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { changeChapterDepth, getChapterLevelDirection } from '../logic/chapterHierarchy';

interface ChapterBlockInsertButtonProps {
  isEditing: boolean;
  label?: string;
  disabled?: boolean;
  previousDepth?: number;
  onDepthPreview?: (id: string, depth?: number) => void;
  onOpen: () => void;
  onCancel?: () => void;
  onSubmit: (label: string, depth?: number) => boolean | void | Promise<boolean | void>;
}

export const ChapterBlockInsertButton: React.FC<ChapterBlockInsertButtonProps> = ({
  isEditing,
  label = '챕터 추가',
  disabled = false,
  previousDepth,
  onDepthPreview,
  onOpen,
  onCancel,
  onSubmit,
}) => {
  const [canSubmit, setCanSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depth, setDepth] = useState(previousDepth ?? 0);
  const draftId = React.useId();
  useEffect(() => {
    if (!isEditing || !onDepthPreview) return;
    onDepthPreview(draftId, depth);
    return () => onDepthPreview(draftId);
  }, [draftId, isEditing, depth, onDepthPreview]);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setCanSubmit(false);
    setDepth(previousDepth ?? 0);
  };

  useEffect(() => {
    if (!isEditing) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (isSubmitting) return;
      if (formRef.current?.contains(event.target as Node)) return;
      resetInput();
      onCancel?.();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isEditing, isSubmitting, onCancel]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = inputRef.current?.value.trim() ?? '';
    if (!trimmed || isSubmitting || disabled) return;

    setIsSubmitting(true);
    let didSave: boolean | void;
    try {
      didSave = await Promise.resolve(depth === 0 ? onSubmit(trimmed) : onSubmit(trimmed, depth));
    } catch {
      didSave = false;
    } finally {
      setIsSubmitting(false);
    }
    if (didSave === false) return;
    resetInput();
    onCancel?.();
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        aria-label={label}
        className="chapter-insert-trigger"
        style={{ '--chapter-depth': previousDepth ?? 0 } as React.CSSProperties}
        onClick={() => { setDepth(previousDepth ?? 0); onOpen(); }}
        disabled={disabled}
      >
        <span className="chapter-insert-label"><Plus size={12} />{label.includes("삽입") ? "여기에 삽입" : "챕터 추가"}</span>
      </button>
    );
  }

  return (
    <form ref={formRef} data-chapter-node={draftId} data-chapter-depth={depth}
      style={{ '--chapter-depth': depth } as React.CSSProperties}
      className="chapter-row chapter-new-row" onSubmit={handleSubmit}>
      <span data-chapter-anchor className="chapter-control chapter-fold" aria-hidden="true" />
      <input
        ref={inputRef}
        aria-label="챕터 제목"
        className="chapter-title-input"
        autoFocus
        disabled={isSubmitting || disabled}
        placeholder="챕터 제목"
        onInput={(event) => setCanSubmit(event.currentTarget.value.trim().length > 0)}
        onKeyDown={(event) => {
          const direction = getChapterLevelDirection(event);
          if (direction) {
            event.preventDefault();
            setDepth(current => changeChapterDepth(current, previousDepth, direction));
            return;
          }
          if (event.key === 'Enter' && event.nativeEvent.isComposing) {
            event.preventDefault();
            return;
          }

          if (event.key === 'Escape') {
            resetInput();
            onCancel?.();
          }
        }}
      />
      <button
        type="submit"
        aria-label="챕터 저장"
        className="chapter-control chapter-action-primary chapter-save"
        disabled={!canSubmit || isSubmitting || disabled}
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        aria-label="챕터 취소"
        className="chapter-control chapter-action-secondary"
        onClick={() => {
          resetInput();
          onCancel?.();
        }}
        disabled={isSubmitting}
      >
        <X size={14} />
      </button>
      <p role="status" className="chapter-hint">{depth === 0 ? '상위 단계' : `하위 ${depth}단계`} · 제목 맨 앞에서 Tab/Space로 하위, Delete/Backspace로 상위</p>
    </form>
  );
};
