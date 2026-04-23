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
        relative rounded-xl border-2 transition-all duration-300 p-1
        ${isDraggingOver ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-ring)]' : 'border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm'}
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

      <div className="p-3.5">
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
          className="type-body-bounded w-full placeholder:text-[var(--text-muted)] text-[var(--text-main)] border-none resize-none focus:ring-0 bg-transparent p-0 min-h-[72px] overflow-y-auto"
        />
      </div>

      <div className="bg-[var(--bg-sidebar)] rounded-b-lg border-t border-[var(--border-main)] p-1.5 flex flex-nowrap gap-1.5 items-center">
        <div className="flex min-w-0 flex-[1.2] items-center bg-[var(--bg-card)] border border-[var(--border-main)] rounded-md px-2 py-1 focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
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
            className="type-label-bounded w-full border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        <div className="flex min-w-0 flex-[1.2] items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
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
            className="type-label-bounded w-full border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        <div className="flex w-[5rem] min-w-0 items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
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
            className="type-label-bounded w-full border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {!hideSubmit && (
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            className={`
              ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all
              ${canSubmit ? 'bg-[var(--accent)] text-white shadow-md hover:bg-[var(--accent-strong)] hover:scale-105 active:scale-95' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] cursor-not-allowed'}
            `}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
