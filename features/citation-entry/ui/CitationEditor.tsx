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
  placeholder = 'Write a quote, sentence, or field note...',
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
        relative rounded-[1.25rem] border p-0.5 transition-all duration-300 focus-within:border-[var(--accent-border)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)]
        ${isDraggingOver ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-ring)]' : 'border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-toolbar)]'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-card)]/80 rounded-lg backdrop-blur-sm pointer-events-none">
          <div className="text-[var(--accent)] font-medium flex items-center animate-bounce">
            <BookIcon className="mr-2" />
            Drop to auto-fill metadata
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

      <div className="rounded-[0_0_1rem_1rem] border-t border-[var(--border-main)] bg-[var(--bg-card)] p-1.5 flex flex-nowrap gap-1.5 items-center">
        {!hideSourceFields && (
          <>
            <div className="flex min-w-0 flex-[1.15] items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-[0.9rem] px-2.5 py-[0.3125rem] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
              <User size={12} className={`mr-2 ${isSelf ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`} />
              <input
                type="text"
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
                placeholder="Author"
                className="type-label-bounded w-full border-none p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent focus:outline-none focus:ring-0"
              />
            </div>

            <div className="flex min-w-0 flex-[1.15] items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-[0.9rem] px-2.5 py-[0.3125rem] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
              <BookIcon size={12} className="mr-2 text-[var(--text-muted)]" />
              <input
                type="text"
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
                placeholder="Book"
                className="type-label-bounded w-full border-none p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent focus:outline-none focus:ring-0"
              />
            </div>
          </>
        )}

        <div className="flex w-[4.75rem] min-w-0 items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-[0.9rem] px-2.5 py-[0.3125rem] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
          <Hash size={12} className="mr-2 text-[var(--text-muted)]" />
          <input
            ref={pageInputRef}
            type="text"
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
            placeholder="Page"
            className="type-label-bounded w-full border-none p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent focus:outline-none focus:ring-0"
          />
        </div>

        {!hideSubmit && (
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            className={`
              ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.9rem] transition-all
              ${canSubmit ? 'bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-strong)] hover:scale-105 active:scale-95' : 'bg-[var(--bg-input)] text-[var(--text-muted)] cursor-not-allowed'}
            `}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
