import React from 'react';
import { Send, User, Book as BookIcon, Hash } from 'lucide-react';
import { CitationEditorProps } from '../contract/citationEntryContract';
import { useCitationEntryController } from '../logic/useCitationEntryController';

export const CitationEditor: React.FC<CitationEditorProps> = ({
  onAddCitation,
  prefillData,
  username,
  controlledValues,
  readOnly = false,
  hideSubmit = false,
  placeholder = '문장, 인용문 또는 단어를 입력하세요',
  sequentialPageEntry = false,
  autoFocusText = false,
  hideSourceFields = false,
}) => {
  const {
    values,
    isSubmitting,
    isDraggingOver,
    isSelf,
    canSubmit,
    isSequentialPageEntryActive,
    textareaRef,
    pageInputRef,
    updateValue,
    handleSubmit,
    focusPageInput,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useCitationEntryController({
    onAddCitation,
    prefillData,
    username,
    controlledValues,
    readOnly,
    sequentialPageEntry,
    autoFocusText,
  });

  return (
    <div
      className={`
        relative rounded-[1.25rem] border p-0.5 transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-[var(--accent-border)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] motion-reduce:transition-none
        ${isDraggingOver ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-ring)]' : 'border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-toolbar)]'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--bg-card)]/95">
          <div className="flex items-center font-medium text-[var(--accent)]">
            <BookIcon className="mr-2" />
            놓아서 출처 정보 채우기
          </div>
        </div>
      )}

      <div className="px-3 pt-3 pb-2.5">
        <textarea
          ref={textareaRef}
          value={values.text}
          readOnly={readOnly || isSubmitting}
          onChange={(event) => updateValue('text', event.target.value)}
          onKeyDown={async (event) => {
            if (readOnly || isSubmitting) return;
            if (event.nativeEvent.isComposing) return;
            if (event.key !== 'Enter') return;
            if (event.shiftKey) return;

            event.preventDefault();

            if (isSequentialPageEntryActive) {
              focusPageInput();
              return;
            }

            await handleSubmit();
          }}
          placeholder={placeholder}
          className="type-body-bounded min-h-[52px] w-full resize-none overflow-y-auto border-none bg-transparent px-2 py-1.5 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-[0_0_1rem_1rem] bg-[var(--bg-card)] p-1.5 sm:flex-nowrap">
        {!hideSourceFields && (
          <>
            <div className="flex min-h-11 min-w-0 basis-[calc(50%_-_0.1875rem)] items-center rounded-[0.9rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 transition-[border-color,box-shadow] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] sm:min-h-8 sm:flex-[1.15] sm:basis-auto motion-reduce:transition-none">
              <User size={12} className={`mr-2 ${isSelf ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`} />
              <input
                type="text"
                aria-label="저자"
                value={values.author}
                readOnly={readOnly || isSubmitting}
                onChange={(event) => updateValue('author', event.target.value)}
                onKeyDown={async (event) => {
                  if (readOnly || isSubmitting) return;
                  if (event.nativeEvent.isComposing) return;
                  if (event.key !== 'Enter') return;

                  event.preventDefault();
                  await handleSubmit();
                }}
                placeholder="저자"
                className="type-label-bounded min-h-11 w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 sm:min-h-8"
              />
            </div>

            <div className="flex min-h-11 min-w-0 basis-[calc(50%_-_0.1875rem)] items-center rounded-[0.9rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 transition-[border-color,box-shadow] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] sm:min-h-8 sm:flex-[1.15] sm:basis-auto motion-reduce:transition-none">
              <BookIcon size={12} className="mr-2 text-[var(--text-muted)]" />
              <input
                type="text"
                aria-label="책"
                value={values.book}
                readOnly={readOnly || isSubmitting}
                onChange={(event) => updateValue('book', event.target.value)}
                onKeyDown={async (event) => {
                  if (readOnly || isSubmitting) return;
                  if (event.nativeEvent.isComposing) return;
                  if (event.key !== 'Enter') return;

                  event.preventDefault();
                  await handleSubmit();
                }}
                placeholder="책"
                className="type-label-bounded min-h-11 w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 sm:min-h-8"
              />
            </div>
          </>
        )}

        <div className="ml-auto flex min-h-11 w-[7.5rem] min-w-0 flex-none items-center rounded-[0.9rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 transition-[border-color,box-shadow] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] sm:min-h-8 motion-reduce:transition-none">
          <Hash size={12} className="mr-2 shrink-0 text-[var(--text-muted)]" />
          <input
            ref={pageInputRef}
            type="text"
            aria-label="페이지"
            value={values.page}
            readOnly={readOnly || isSubmitting}
            onChange={(event) => updateValue('page', event.target.value)}
            onKeyDown={async (event) => {
              if (readOnly || isSubmitting) return;
              if (event.nativeEvent.isComposing) return;
              if (event.key !== 'Enter') return;

              event.preventDefault();
              if (event.shiftKey) return;

              await handleSubmit();
            }}
            placeholder="페이지"
            className="type-label-bounded min-h-11 w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 sm:min-h-8"
          />
        </div>

        {!hideSubmit && (
          <button
            type="button"
            aria-label="문장 저장"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            className={`
              inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[0.9rem] transition-[background-color,color,transform] active:scale-95 sm:h-8 sm:w-8 motion-reduce:transition-none
              ${canSubmit ? 'bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-strong)]' : 'bg-[var(--bg-input)] text-[var(--text-muted)] cursor-not-allowed'}
            `}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
