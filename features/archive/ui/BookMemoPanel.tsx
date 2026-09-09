import React from 'react';
import { CloudOff, PanelRightClose, X } from 'lucide-react';
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
};

export const BookMemoPanel: React.FC<BookMemoPanelProps> = ({
  userId,
  book,
  onSave,
  onClose,
  mobile = false,
}) => {
  const [memo, setMemo] = React.useState(() => readBookMemoDraft(userId, book.id) ?? book.memo ?? '');
  const [status, setStatus] = React.useState<SaveStatus>('idle');
  const [draftStorageFailed, setDraftStorageFailed] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const requestRef = React.useRef(0);
  const saveChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const memoRef = React.useRef(memo);
  memoRef.current = memo;
  const dialogRef = useModalFocus<HTMLElement>(mobile, () => onClose?.());

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

  return (
    <aside
      data-book-memo-panel
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
      <header className="flex min-h-14 items-center gap-3 border-b border-[var(--border-main)] px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.72rem] text-[var(--text-muted)]">{book.title}</p>
          <h2 id="book-memo-title" className="text-sm font-semibold">메모</h2>
        </div>
        <div aria-live="polite" className="flex items-center justify-end gap-1 text-[0.74rem] text-[var(--text-muted)] empty:hidden">
          {status === 'failed' ? <><CloudOff size={13} /> 실패</> : null}
          {status === 'recovered' ? <><CloudOff size={13} /> 복구됨</> : null}
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]" aria-label={mobile ? '책 전체 메모 닫기' : '책 전체 메모 접기'}>
            {mobile ? <X size={18} /> : <PanelRightClose size={18} />}
          </button>
        ) : null}
      </header>
      <label className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <span className="sr-only">책 전체 메모</span>
        <textarea
          aria-label="책 전체 메모"
          value={memo}
          onChange={(event) => scheduleSave(event.target.value)}
          placeholder="책 전체를 관통하는 생각, 질문, 다음에 볼 내용을 적어두세요."
          className="min-h-[12rem] flex-1 resize-none border-0 bg-transparent p-0 font-sans text-sm leading-6 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 focus:caret-[var(--text-main)]"
        />
      </label>
      <footer className="flex min-h-11 items-center gap-2 px-3 py-1.5">
        <p className="min-w-0 flex-1 text-[0.72rem] leading-5 text-[var(--text-muted)]">
          {draftStorageFailed
            ? '브라우저 임시 보관에 실패했습니다. 저장 실패 시 내용을 복사해 두세요.'
            : status === 'failed'
              ? '입력 내용은 이 브라우저에 임시 보관했습니다.'
              : status === 'recovered'
                ? '복구된 초안입니다. 확인 후 저장하세요.'
              : null}
        </p>
        <button
          type="button"
          onClick={saveNow}
          className="min-h-10 shrink-0 rounded-lg px-3.5 text-sm font-semibold text-[var(--text-secondary)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none"
        >
          저장
        </button>
      </footer>
    </aside>
  );
};
