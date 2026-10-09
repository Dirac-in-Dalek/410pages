import { RichTextEditor } from '../../../shared/ui/RichTextEditor';
import React from 'react';
import { CloudOff, PanelRightClose, X } from 'lucide-react';
import type { BookSource, TextFormatRange } from '../../../types';
import {
  BOOK_MEMO_DRAFT_MERGED_EVENT,
  readBookMemoDraftContent,
  removeBookMemoDraft,
  storeBookMemoDraft,
} from '../logic/bookMemoDraftStorage';
import { useModalFocus } from '../../../shared/ui/useModalFocus';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'recovered';

type BookMemoPanelProps = {
  userId: string;
  book: BookSource;
  onSave: (bookId: string, memo: string, formats?: TextFormatRange[], expectedText?: string) => Promise<boolean>;
  onClose?: () => void;
  mobile?: boolean;
  reading?: boolean;
};

export const BookMemoPanel: React.FC<BookMemoPanelProps> = ({
  userId,
  book,
  onSave,
  onClose,
  mobile = false,
  reading = false,
}) => {
  const initial = () => readBookMemoDraftContent(userId, book.id) ?? { text: book.memo ?? '', formats: book.memoFormats ?? [] };
  const [content, setContent] = React.useState(initial);
  const { text: memo, formats } = content;
  const savedMemosRef = React.useRef(new Map([[`${userId}:${book.id}`, book.memo ?? '']]));
  const [memoBookId, setMemoBookId] = React.useState(book.id);
  const [status, setStatus] = React.useState<SaveStatus>('idle');
  const [draftStorageFailed, setDraftStorageFailed] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const requestRef = React.useRef(0);
  const saveChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const memoRef = React.useRef(content);
  memoRef.current = content;
  const dialogRef = useModalFocus<HTMLElement>(mobile, () => onClose?.());
  const syncExternalDraft = React.useCallback(() => {
    const recoveredDraft = readBookMemoDraftContent(userId, book.id);
    const nextMemo = recoveredDraft ?? { text: book.memo ?? '', formats: book.memoFormats ?? [] };
    savedMemosRef.current.set(`${userId}:${book.id}`, book.memo ?? '');
    if (JSON.stringify(memoRef.current) === JSON.stringify(nextMemo)) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    requestRef.current += 1;
    setContent(nextMemo);
    setStatus(recoveredDraft === null ? 'idle' : 'recovered');
  }, [book.id, book.memo, book.memoFormats, userId]);

  React.useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    requestRef.current += 1;
    const recoveredDraft = readBookMemoDraftContent(userId, book.id);
    setContent(recoveredDraft ?? { text: book.memo ?? '', formats: book.memoFormats ?? [] });
    savedMemosRef.current.set(`${userId}:${book.id}`, book.memo ?? '');
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

  const persistMemo = async (next: { text: string; formats: TextFormatRange[] }, request: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setStatus('saving');
    let didSave = false;
    const save = saveChainRef.current.then(async () => {
      const ok = await onSave(book.id, next.text, next.formats, savedMemosRef.current.get(`${userId}:${book.id}`) ?? book.memo ?? '');
      if (ok) savedMemosRef.current.set(`${userId}:${book.id}`, next.text);
      return ok;
    });
    saveChainRef.current = save.then(() => undefined, () => undefined);
    try {
      didSave = await save;
    } catch {
      didSave = false;
    }
    if (didSave) {
      if (JSON.stringify(readBookMemoDraftContent(userId, book.id)) === JSON.stringify(next)) {
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

  const scheduleSave = (text: string, formats: TextFormatRange[]) => {
    const next = { text, formats };
    setContent(next);
    setDraftStorageFailed(!storeBookMemoDraft(userId, book.id, text, formats));
    setStatus('saving');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const request = ++requestRef.current;
    timerRef.current = window.setTimeout(() => void persistMemo(next, request), 800);
  };

  const saveNow = () => {
    setDraftStorageFailed(!storeBookMemoDraft(userId, book.id, memo, formats));
    void persistMemo(content, ++requestRef.current);
  };
  const showFooter = draftStorageFailed || status === 'failed' || status === 'recovered';

  return (
    <aside
      data-book-memo-panel
      data-book-memo-id={memoBookId}
      data-reading-memo={reading || undefined}
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
          <h2 id="book-memo-title" className="truncate text-base font-semibold">메모</h2>
        </div>
        <div aria-live="polite" className="flex items-center justify-end gap-1 whitespace-nowrap text-[0.74rem] text-[var(--text-muted)] empty:hidden">
          {status === 'saving' ? '저장 중…' : status === 'saved' ? '저장됨' : null}
          {status === 'failed' ? <><CloudOff size={13} /> 실패</> : null}
          {status === 'recovered' ? <><CloudOff size={13} /> 복구됨</> : null}
        </div>
        {onClose && !reading ? (
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]" aria-label={mobile ? '책 전체 메모 닫기' : '책 전체 메모 접기'}>
            {mobile ? <X size={18} /> : <PanelRightClose size={18} />}
          </button>
        ) : null}
      </header>
      <RichTextEditor key={`${userId}:${book.id}`} text={memo} formats={formats} onChange={scheduleSave}
        label="책 전체 메모" placeholder="책을 읽으며 떠오르는 생각들을 정리해보세요"
        className={`book-memo-rich flex-1 px-3 py-3 font-sans text-sm leading-6 ${reading ? '' : 'min-h-0 overflow-y-auto'}`} />
      {showFooter ? <footer className="flex min-h-11 items-center gap-2 px-3 py-1.5">
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
