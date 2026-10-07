import React from 'react';
import { CloudOff, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import type { BookSource } from '../../../types';
import {
  BOOK_MEMO_DRAFT_MERGED_EVENT,
  readBookMemoDraft,
  removeBookMemoDraft,
  storeBookMemoDraft,
} from '../logic/bookMemoDraftStorage';
import { useModalFocus } from '../../../shared/ui/useModalFocus';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'recovered';

type BookMemoPanelProps = {
  userId: string;
  book: BookSource;
  onSave: (bookId: string, memo: string) => Promise<boolean>;
  onClose?: () => void;
  mobile?: boolean;
  reading?: boolean;
  readingCollapsed?: boolean;
  onToggleReading?: () => void;
};

export const BookMemoPanel: React.FC<BookMemoPanelProps> = ({
  userId,
  book,
  onSave,
  onClose,
  mobile = false,
  reading = false,
  readingCollapsed = false,
  onToggleReading,
}) => {
  const [memo, setMemo] = React.useState(() => readBookMemoDraft(userId, book.id) ?? book.memo ?? '');
  const [memoBookId, setMemoBookId] = React.useState(book.id);
  const [status, setStatus] = React.useState<SaveStatus>('idle');
  const [draftStorageFailed, setDraftStorageFailed] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const requestRef = React.useRef(0);
  const saveChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const memoRef = React.useRef(memo);
  memoRef.current = memo;
  const dialogRef = useModalFocus<HTMLElement>(mobile, () => onClose?.());
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!reading || !input) return;
    const grow = () => {
      const top = input.scrollTop;
      const readingScroll = input.closest<HTMLElement>('[data-reading-memo-scroll]');
      const readingTop = readingScroll?.scrollTop ?? 0;
      // Measure separately so the focused field never collapses during typing.
      const style = getComputedStyle(input);
      const sizer = document.createElement('textarea');
      sizer.value = input.value;
      sizer.tabIndex = -1;
      sizer.setAttribute('aria-hidden', 'true');
      Object.assign(sizer.style, {
        position: 'absolute', visibility: 'hidden', pointerEvents: 'none', overflow: 'hidden',
        height: '0px', minHeight: '0px', width: `${input.clientWidth}px`,
        font: style.font, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
        padding: style.padding, border: '0', boxSizing: style.boxSizing,
        whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap,
      });
      document.body.append(sizer);
      const minimumHeight = parseFloat(getComputedStyle(input).minHeight) || 360;
      const height = `${Math.max(minimumHeight, sizer.scrollHeight)}px`;
      sizer.remove();
      if (input.style.height !== height) input.style.height = height;
      input.scrollTop = top;
      if (readingScroll) readingScroll.scrollTop = readingTop;
    };
    grow();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(grow);
    if (input.parentElement) observer?.observe(input.parentElement);
    const preferences = new MutationObserver(grow);
    preferences.observe(document.documentElement, { attributes: true });
    const readingScope = input.closest('[data-reading-responsive]');
    if (readingScope && readingScope !== document.documentElement) {
      preferences.observe(readingScope, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    document.fonts?.addEventListener('loadingdone', grow);
    return () => { observer?.disconnect(); preferences.disconnect(); document.fonts?.removeEventListener('loadingdone', grow); };
  }, [memo, reading]);

  const syncExternalDraft = React.useCallback(() => {
    const recoveredDraft = readBookMemoDraft(userId, book.id);
    const nextMemo = recoveredDraft ?? book.memo ?? '';
    if (memoRef.current === nextMemo) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    requestRef.current += 1;
    setMemo(nextMemo);
    setStatus(recoveredDraft === null ? 'idle' : 'recovered');
  }, [book.id, book.memo, userId]);

  React.useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    requestRef.current += 1;
    const recoveredDraft = readBookMemoDraft(userId, book.id);
    setMemo(recoveredDraft ?? book.memo ?? '');
    setMemoBookId(book.id);
    setStatus(recoveredDraft === null ? 'idle' : 'recovered');
    setDraftStorageFailed(false);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [book.id, userId]);

  React.useEffect(() => {
    syncExternalDraft();
  }, [syncExternalDraft]);

  React.useEffect(() => {
    const handleMergedDraft = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; bookId: string }>).detail;
      if (detail?.userId === userId && detail.bookId === book.id) syncExternalDraft();
    };
    window.addEventListener(BOOK_MEMO_DRAFT_MERGED_EVENT, handleMergedDraft);
    return () => window.removeEventListener(BOOK_MEMO_DRAFT_MERGED_EVENT, handleMergedDraft);
  }, [book.id, syncExternalDraft, userId]);

  const persistMemo = async (nextMemo: string, request: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setStatus('saving');
    let didSave = false;
    const save = saveChainRef.current.then(() => onSave(book.id, nextMemo));
    saveChainRef.current = save.then(() => undefined, () => undefined);
    try {
      didSave = await save;
    } catch {
      didSave = false;
    }
    if (didSave) {
      if (readBookMemoDraft(userId, book.id) === nextMemo) {
        removeBookMemoDraft(userId, book.id);
      }
    }
    if (request !== requestRef.current) return;
    if (didSave) {
      setDraftStorageFailed(false);
      setStatus('saved');
    } else {
      setStatus('failed');
    }
  };

  const scheduleSave = (nextMemo: string) => {
    setMemo(nextMemo);
    setDraftStorageFailed(!storeBookMemoDraft(userId, book.id, nextMemo));
    setStatus('saving');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const request = ++requestRef.current;
    timerRef.current = window.setTimeout(() => void persistMemo(nextMemo, request), 800);
  };

  const saveNow = () => {
    setDraftStorageFailed(!storeBookMemoDraft(userId, book.id, memo));
    void persistMemo(memo, ++requestRef.current);
  };
  const showFooter = draftStorageFailed || status === 'failed' || status === 'recovered';

  return (
    <aside
      data-book-memo-panel
      data-book-memo-id={memoBookId}
      data-reading-memo={reading || undefined}
      data-reading-collapsed={reading && readingCollapsed || undefined}
      ref={dialogRef}
      tabIndex={-1}
      role={mobile ? 'dialog' : 'complementary'}
      aria-modal={mobile || undefined}
      aria-labelledby="book-memo-title"
      className={[
        'flex h-full min-h-0 flex-col bg-[var(--bg-card)] text-[var(--text-main)]',
        mobile ? 'rounded-t-2xl border-t border-[var(--border-main)] shadow-[var(--shadow-panel)]' : 'w-full shrink-0 border-l border-[var(--border-main)]',
      ].join(' ')}
    >
      <header className={['flex min-h-14 items-center gap-3 border-b border-[var(--border-main)] px-4', reading ? 'sticky top-0 z-10 bg-[var(--bg-card)]' : ''].join(' ')}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.72rem] text-[var(--text-muted)]">{book.title}</p>
          <h2 id="book-memo-title" className="text-base font-semibold">메모</h2>
        </div>
        <div aria-live="polite" className="flex items-center justify-end gap-1 text-[0.74rem] text-[var(--text-muted)] empty:hidden">
          {status === 'saving' ? '저장 중…' : status === 'saved' ? '저장됨' : null}
          {status === 'failed' ? <><CloudOff size={13} /> 실패</> : null}
          {status === 'recovered' ? <><CloudOff size={13} /> 복구됨</> : null}
        </div>
        {reading && onToggleReading ? (
          <button id="book-memo-open-button" type="button" data-passage-note-trigger onClick={onToggleReading}
            aria-label={readingCollapsed ? '메모 펼치기' : '메모 접기'} aria-expanded={!readingCollapsed}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]">
            {readingCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        ) : null}
        {onClose && !reading ? (
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]" aria-label={mobile ? '책 전체 메모 닫기' : '책 전체 메모 접기'}>
            {mobile ? <X size={18} /> : <PanelRightClose size={18} />}
          </button>
        ) : null}
      </header>
      <label aria-hidden={readingCollapsed || undefined} inert={readingCollapsed || undefined}
        style={{ visibility: readingCollapsed ? 'hidden' : 'visible' }}
        className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <span className="sr-only">책 전체 메모</span>
        <textarea
          ref={inputRef}
          aria-label="책 전체 메모"
          value={memo}
          onChange={(event) => scheduleSave(event.target.value)}
          placeholder="책 전체를 관통하는 생각, 질문, 다음에 볼 내용을 적어두세요."
          className="min-h-[12rem] flex-1 resize-none border-0 bg-transparent p-0 font-sans text-sm leading-6 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 focus:caret-[var(--text-main)]"
        />
      </label>
      {showFooter ? <footer aria-hidden={readingCollapsed || undefined} inert={readingCollapsed || undefined}
        style={{ visibility: readingCollapsed ? 'hidden' : 'visible' }}
        className="flex min-h-11 items-center gap-2 px-3 py-1.5">
        <p className="min-w-0 flex-1 text-[0.72rem] leading-5 text-[var(--text-muted)]">
          {draftStorageFailed
            ? '브라우저 임시 보관에 실패했습니다. 저장 실패 시 내용을 복사해 두세요.'
            : status === 'failed'
              ? '입력 내용은 이 브라우저에 임시 보관했습니다.'
              : status === 'recovered'
                ? '복구된 초안입니다. 확인 후 저장하세요.'
              : null}
        </p>
        {(status === 'failed' || status === 'recovered') ? <button
          type="button"
          onClick={saveNow}
          className="min-h-10 shrink-0 rounded-lg px-3.5 text-sm font-semibold text-[var(--text-secondary)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none"
        >
          {status === 'failed' ? '다시 저장' : '복구된 초안 저장'}
        </button> : null}
      </footer> : null}
    </aside>
  );
};
