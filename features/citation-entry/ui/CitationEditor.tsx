import React, { useEffect, useId, useRef } from 'react';
import { getChapterLevelDirection } from '../../archive/logic/chapterHierarchy';
import { ArrowLeft, ArrowRight, Check, Send, User, Book as BookIcon, Hash } from 'lucide-react';
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
  chapterMode = false,
  bookDepth,
  maxChapterDepth = 0,
  onChapterModeChange,
  onHierarchyKey,
  insertionLabel,
  focusRequest,
  draftScope,
  draftStore,

}) => {
  const isBookComposer = bookDepth !== undefined;
  const kindGroupId = useId();
  const kindGroupRef = useRef<HTMLDivElement>(null);
  const indentButtonRef = useRef<HTMLButtonElement>(null);
  const outdentButtonRef = useRef<HTMLButtonElement>(null);
  const locationId = `${kindGroupId}-location`;
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
    draftScope,
    draftStore,
    readOnly,
    sequentialPageEntry: sequentialPageEntry && !chapterMode,
    autoFocusText,
  });

  useEffect(() => {
    if (focusRequest && !kindGroupRef.current?.contains(document.activeElement)) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [focusRequest]);

  const depthControls = isBookComposer && chapterMode && onHierarchyKey && (
    <div role="group" aria-label="챕터 단계 변경" className="book-composer-depth-controls">
      {(bookDepth ?? 0) > 0 && <button
        ref={outdentButtonRef}
        type="button"
        aria-label="한 단계 상위로"
        title="한 단계 밖으로 · 상위"
        disabled={readOnly || isSubmitting}
        onPointerDown={event => event.preventDefault()}
        onClick={event => {
          const restoreFocus = document.activeElement === event.currentTarget && bookDepth === 1;
          onHierarchyKey('out');
          if (restoreFocus) window.requestAnimationFrame(() => indentButtonRef.current?.focus({ preventScroll: true }));
        }}
      ><ArrowLeft size={16} /></button>}
      <button
        ref={indentButtonRef}
        type="button"
        aria-label="한 단계 하위로"
        title={(bookDepth ?? 0) < maxChapterDepth ? '한 단계 안으로 · 하위' : '먼저 현재 단계의 챕터를 저장하세요'}
        disabled={readOnly || isSubmitting || (bookDepth ?? 0) >= maxChapterDepth}
        onPointerDown={event => event.preventDefault()}
        onClick={event => {
          const restoreFocus = document.activeElement === event.currentTarget && (bookDepth ?? 0) + 1 >= maxChapterDepth;
          onHierarchyKey('in');
          if (restoreFocus) window.requestAnimationFrame(() => outdentButtonRef.current?.focus({ preventScroll: true }));
        }}
      ><ArrowRight size={16} /></button>
    </div>
  );

  const editor = (
    <div
      key="input"
      className={`
        citation-composer ${bookDepth !== undefined ? 'book-citation-composer' : ''} relative rounded-xl border p-0.5 transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-[var(--accent-border)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] motion-reduce:transition-none
        ${isDraggingOver ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-ring)]' : 'border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-toolbar)]'}
      `}
      data-composer-depth={bookDepth}
      style={bookDepth === undefined ? undefined : { '--citation-depth': bookDepth } as React.CSSProperties}
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

      {insertionLabel && <span id={locationId} role="status" className={isBookComposer ? 'sr-only' : 'block px-4 pt-2 text-xs text-[var(--text-muted)]'}>{insertionLabel}</span>}
      <div className="citation-composer-text px-2 pt-2 pb-1">
        <textarea
          ref={textareaRef}
          rows={1}
          aria-label={chapterMode ? "챕터 제목 입력" : "인용문 입력"}
          aria-describedby={insertionLabel ? locationId : undefined}
          value={values.text}
          readOnly={readOnly || isSubmitting}
          onChange={(event) => updateValue('text', event.target.value)}
          onKeyDown={async (event) => {
            if (readOnly || isSubmitting) return;
            if (event.nativeEvent.isComposing) return;
            const direction = getChapterLevelDirection(event);
            if (direction && onHierarchyKey) {
              event.preventDefault();
              onHierarchyKey(direction);
              return;
            }
            if (event.key !== 'Enter') return;
            if (event.shiftKey) return;

            event.preventDefault();

            if (isSequentialPageEntryActive) {
              focusPageInput();
              return;
            }

            await handleSubmit();
          }}
          placeholder={chapterMode ? "챕터 제목" : placeholder}
          className="type-body-bounded min-h-[40px] w-full resize-none overflow-y-auto border-none bg-transparent px-2 py-1.5 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0"
        />
      </div>

      <div className={`flex flex-wrap items-center rounded-b-xl bg-[var(--bg-card)] p-1.5 ${isBookComposer ? 'book-composer-toolbar gap-3' : 'gap-1.5 sm:flex-nowrap'}`}>
        {onChapterModeChange && (isBookComposer ? (
          <div ref={kindGroupRef} role="radiogroup" aria-label="입력 종류" className="book-composer-kinds">
            {[{ value: false, label: '인용문' }, { value: true, label: '챕터' }].map(kind => (
              <label key={kind.label}>
                <input
                  type="radio"
                  name={kindGroupId}
                  value={kind.value ? 'chapter' : 'citation'}
                  checked={chapterMode === kind.value}
                  disabled={readOnly || isSubmitting}
                  onChange={() => onChapterModeChange(kind.value)}
                />
                <span>{kind.label}</span>
              </label>
            ))}
          </div>
        ) : <button type="button" role="switch" aria-label="챕터 입력" aria-checked={chapterMode}
          disabled={readOnly || isSubmitting} onClick={() => onChapterModeChange(!chapterMode)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <span aria-hidden="true" className={`flex h-5 w-9 rounded-full p-0.5 ${chapterMode ? 'bg-[var(--accent)]' : 'bg-[var(--text-muted)]'}`}>
            <span className={`h-4 w-4 rounded-full bg-white transition-transform ${chapterMode ? 'translate-x-4' : ''}`} />
          </span>{chapterMode ? '챕터' : '인용문'}
        </button>)}
        {!hideSourceFields && (
          <>
            <div className="flex min-h-11 min-w-0 basis-[calc(50%_-_0.1875rem)] items-center rounded-md border border-transparent bg-[var(--bg-input)] px-2.5 transition-[border-color,box-shadow] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] sm:min-h-8 sm:flex-[1.15] sm:basis-auto motion-reduce:transition-none">
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

            <div className="flex min-h-11 min-w-0 basis-[calc(50%_-_0.1875rem)] items-center rounded-md border border-transparent bg-[var(--bg-input)] px-2.5 transition-[border-color,box-shadow] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] sm:min-h-8 sm:flex-[1.15] sm:basis-auto motion-reduce:transition-none">
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

        <div className={isBookComposer ? 'book-composer-actions' : 'contents'}>
        {!chapterMode && <div className={`${isBookComposer ? 'book-composer-page' : ''} ml-auto flex min-h-11 w-[7.5rem] min-w-0 flex-none items-center rounded-md border border-transparent bg-[var(--bg-input)] px-2.5 transition-[border-color,box-shadow] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] sm:min-h-8 motion-reduce:transition-none`}>
          <Hash size={isBookComposer ? 16 : 12} className="mr-2 shrink-0 text-[var(--text-muted)]" />
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

        }
        {!hideSubmit && (
          <button
            type="button"
            aria-label={chapterMode ? "챕터 저장" : "문장 저장"}
            title={chapterMode ? "챕터 저장" : "문장 저장"}
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            className={`
              ${isBookComposer ? 'book-composer-submit' : ''} ${chapterMode ? 'ml-auto' : ''} inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-md transition-[background-color,color,transform] active:scale-95 sm:h-8 sm:w-8 motion-reduce:transition-none
              ${canSubmit ? 'bg-[var(--accent)] accent-button shadow-sm hover:bg-[var(--accent-strong)]' : 'bg-[var(--bg-input)] text-[var(--text-muted)] cursor-not-allowed'}
            `}
          >
            {isBookComposer ? <Check size={16} /> : <Send size={15} />}
          </button>
        )}
        </div>
      </div>
    </div>
  );

  return isBookComposer ? (
    <div className="book-composer-frame" style={{ '--citation-depth': bookDepth } as React.CSSProperties}>
      <div className="book-composer-row" data-depth-controls={Boolean(depthControls)}>
        {depthControls}
        {editor}
      </div>
    </div>
  ) : editor;
};
