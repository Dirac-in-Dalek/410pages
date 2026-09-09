import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, MoreHorizontal, Pencil, Plus, Quote, Trash2 } from 'lucide-react';
import type { AuthorSource, BookDeletePreview, BookSource, Citation, CreateBookInput, DeleteBookCascadeResult } from '../../../types';
import { BookDeleteDialog } from './BookDeleteDialog';
import { BookCover } from './BookCover';
import { handleMenuKeyboardNavigation } from '../../../shared/ui/sidebar/SidebarControls';

type AuthorBooksProps = {
  author: AuthorSource;
  username: string;
  books: BookSource[];
  citations: Citation[];
  isMobileApp: boolean;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void | Promise<void>;
  onBack: () => void;
  onCreateBook: (input: CreateBookInput) => Promise<BookSource | undefined>;
  onBookSelect: (book: BookSource) => void;
  onReadPdf: (book: BookSource) => void;
  onBeforeReadPdf: () => boolean;
  onContinuePdf?: () => void;
  onRenameBook: (bookId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteBook: (bookId: string) => Promise<DeleteBookCascadeResult | undefined>;
  onPreviewBookDelete: (bookId: string) => Promise<BookDeletePreview | undefined>;
};

export const AuthorBooks: React.FC<AuthorBooksProps> = ({
  author, username, books, citations, isMobileApp, loading, loadError,
  onRetry, onBack, onCreateBook, onBookSelect, onReadPdf, onBeforeReadPdf, onContinuePdf,
  onRenameBook, onDeleteBook, onPreviewBookDelete,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [deletingBook, setDeletingBook] = useState<{ book: BookSource; preview: BookDeletePreview } | null>(null);
  const submitInFlightRef = useRef(false);
  const renameInFlightRef = useRef(false);
  const authorName = author.isSelf ? username : author.name.trim() || '이름 없는 저자';
  const authorBooks = books.filter((book) => book.authorId === author.id);
  const citationCountByBook = new Map<string, number>();
  citations.forEach((citation) => {
    if (citation.bookId) {
      citationCountByBook.set(citation.bookId, (citationCountByBook.get(citation.bookId) ?? 0) + 1);
    }
  });

  useEffect(() => {
    if (!activeMenuBookId) return;
    document.getElementById(`author-book-menu-${activeMenuBookId}`)?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const close = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest(`[data-author-book-menu="${activeMenuBookId}"]`)) {
        setActiveMenuBookId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        document.querySelector<HTMLButtonElement>(`button[data-author-book-menu="${activeMenuBookId}"]`)?.focus();
        setActiveMenuBookId(null);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeMenuBookId]);

  const submit = async (destination: 'citation' | 'pdf') => {
    const trimmed = title.trim();
    if (!trimmed || submitInFlightRef.current) return;
    if (destination === 'pdf' && !onBeforeReadPdf()) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const book = await onCreateBook({ authorId: author.id, title: trimmed });
      if (!book) return;
      setTitle('');
      setIsAdding(false);
      if (destination === 'pdf') onReadPdf(book);
      else onBookSelect(book);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const startRename = (book: BookSource) => {
    setEditingBookId(book.id);
    setEditingTitle(book.title);
    setActiveMenuBookId(null);
  };

  const submitRename = async (bookId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed || renameInFlightRef.current) return;
    renameInFlightRef.current = true;
    setIsSubmittingRename(true);
    try {
      const didRename = await Promise.resolve(onRenameBook(bookId, trimmed));
      if (didRename === false) return;
      setEditingBookId(null);
      setEditingTitle('');
    } finally {
      renameInFlightRef.current = false;
      setIsSubmittingRename(false);
    }
  };

  const requestDelete = async (book: BookSource) => {
    setActiveMenuBookId(null);
    const preview = await onPreviewBookDelete(book.id);
    if (preview) setDeletingBook({ book, preview });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[76rem] px-5 pb-20 pt-7 sm:px-8 lg:px-12 lg:pt-10">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--text-muted)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95">
          <ArrowLeft size={16} /> 저자
        </button>
        <header className="mb-10 border-b border-[var(--border-main)] pb-5">
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">저자 / 책</p>
          <h1 className="font-[var(--font-display-active)] text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--text-main)]">{authorName}</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">읽을 책을 고르거나 새 책을 추가하세요.</p>
          {!isMobileApp && onContinuePdf ? (
            <button type="button" onClick={onContinuePdf} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--bg-input)] px-3 text-sm font-semibold text-[var(--text-main)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95">
              <BookOpen size={15} /> 읽던 PDF 계속하기
            </button>
          ) : null}
        </header>

        {loadError ? (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
            <span>{loadError}</span>
            <button type="button" onClick={() => void onRetry()} className="min-h-10 rounded-lg px-3 font-semibold transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10">다시 시도</button>
          </div>
        ) : null}

        {loading && authorBooks.length === 0 ? (
          <div className="py-24 text-center text-sm text-[var(--text-muted)]" role="status">책을 불러오는 중…</div>
        ) : authorBooks.length > 0 || !loadError ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 xl:grid-cols-5">
            <div className="min-w-0">
              {isAdding ? (
                <form
                  className="flex aspect-[0.69] flex-col justify-between rounded-r-xl rounded-l-[0.35rem] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-2 ring-[var(--accent-ring)]"
                  onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}
                  onSubmit={(event) => { event.preventDefault(); void submit('citation'); }}
                >
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)]">{authorName}의 새 책</p>
                    <input autoFocus aria-label="책 제목" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="책 제목" className="mt-4 w-full border-0 border-b border-[var(--border-main)] bg-transparent px-0 py-2 font-[var(--font-display-active)] text-lg font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-0" />
                  </div>
                  <div className="space-y-2">
                    <button type="submit" disabled={!title.trim() || isSubmitting} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-2 text-sm font-semibold text-white transition-[background-color,transform] active:scale-95 disabled:opacity-50"><Quote size={15} />시작</button>
                    {!isMobileApp ? <button type="button" disabled={!title.trim() || isSubmitting} onClick={() => void submit('pdf')} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--bg-input)] px-2 text-sm font-semibold text-[var(--text-main)] transition-[background-color,transform] active:scale-95 disabled:opacity-50"><BookOpen size={15} />PDF로 추가하기</button> : null}
                    <button type="button" disabled={isSubmitting} onClick={() => { setIsAdding(false); setTitle(''); }} className="min-h-9 w-full rounded-lg text-sm text-[var(--text-muted)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95">취소</button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setIsAdding(true)} className="group flex aspect-[0.69] w-full flex-col items-center justify-center rounded-r-xl rounded-l-[0.35rem] border-2 border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-[background-color,transform] hover:-translate-y-1 hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-card)] shadow-[var(--shadow-card)]"><Plus size={21} /></span>
                  <span className="text-sm font-semibold">책 추가</span>
                </button>
              )}
            </div>

            {authorBooks.map((book, index) => editingBookId === book.id ? (
              <form key={book.id} onSubmit={(event) => { event.preventDefault(); void submitRename(book.id); }} className="flex aspect-[0.69] min-w-0 flex-col justify-between rounded-r-xl rounded-l-[0.35rem] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-2 ring-[var(--accent-ring)]">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)]">책 이름 변경</p>
                  <input autoFocus aria-label={`${book.title} 이름 변경`} value={editingTitle} disabled={isSubmittingRename} onChange={(event) => setEditingTitle(event.target.value)} className="mt-4 w-full border-0 border-b border-[var(--border-main)] bg-transparent px-0 py-2 font-[var(--font-display-active)] text-lg font-semibold text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-0" />
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={isSubmittingRename} onClick={() => { setEditingBookId(null); setEditingTitle(''); }} className="min-h-10 flex-1 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] active:scale-95">취소</button>
                  <button type="submit" disabled={!editingTitle.trim() || isSubmittingRename} className="min-h-10 flex-1 rounded-lg bg-[var(--accent)] text-sm font-semibold text-white active:scale-95 disabled:opacity-50">저장</button>
                </div>
              </form>
            ) : (
              <div key={book.id} className="group relative min-w-0" onContextMenu={(event) => { event.preventDefault(); setActiveMenuBookId(book.id); }}>
              <button type="button" onClick={() => onBookSelect(book)} className="min-w-0 w-full text-left transition-transform duration-200 active:scale-95 motion-reduce:transition-none" aria-label={`${book.title} 열기`}>
                <span className="relative block aspect-[0.69] overflow-hidden rounded-r-xl rounded-l-[0.35rem] bg-[var(--bg-card)] px-5 pb-5 pt-6 shadow-[0_12px_26px_rgba(31,29,27,0.12),inset_1px_0_rgba(255,255,255,0.5)] transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_32px_rgba(31,29,27,0.16)] motion-reduce:transition-none">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2 bg-[var(--accent)] opacity-90" />
                  <span aria-hidden="true" className="absolute inset-y-0 left-2 w-px bg-[var(--accent-border)]" />
                  <span className="flex h-full flex-col">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">410 · {String(index + 1).padStart(2, '0')}</span>
                    <span className="mt-5 line-clamp-4 font-[var(--font-display-active)] text-[clamp(1rem,2.2vw,1.35rem)] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--text-main)]">{book.title}</span>
                  </span>
                  <BookCover title={book.title} author={authorName} />
                  <span className="absolute bottom-3 left-4 rounded bg-[var(--bg-card)] px-2 py-1 text-xs tabular-nums text-[var(--text-muted)]">{citationCountByBook.get(book.id) ?? 0}문장</span>
                </span>
              </button>
              <button type="button" data-author-book-menu={book.id} aria-label={`${book.title} 관리`} aria-haspopup="menu" aria-controls={`author-book-menu-${book.id}`} aria-expanded={activeMenuBookId === book.id} onClick={(event) => { event.stopPropagation(); setActiveMenuBookId((current) => current === book.id ? null : book.id); }} className={["absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-card)] text-[var(--text-main)] shadow-[var(--shadow-card)] transition-[opacity,transform] active:scale-95", isMobileApp ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'].join(' ')}>
                <MoreHorizontal size={18} />
              </button>
              {activeMenuBookId === book.id ? (
                <div id={`author-book-menu-${book.id}`} data-author-book-menu={book.id} role="menu" onKeyDown={handleMenuKeyboardNavigation} className="absolute bottom-3 right-[3.25rem] z-20 w-24 rounded-xl bg-[var(--bg-card)] p-1 shadow-[var(--shadow-popover)]">
                  <button type="button" role="menuitem" onClick={() => startRename(book)} className="flex min-h-10 w-full items-center gap-1.5 rounded-lg px-2 text-left text-sm hover:bg-[var(--sidebar-hover)]"><Pencil size={13} />이름 변경</button>
                  <button type="button" role="menuitem" onClick={() => void requestDelete(book)} className="flex min-h-10 w-full items-center gap-1.5 rounded-lg px-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={13} />삭제</button>
                </div>
              ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {deletingBook ? (
        <BookDeleteDialog bookId={deletingBook.book.id} bookTitle={deletingBook.book.title} citationCount={deletingBook.preview.citationCount} onClose={() => setDeletingBook(null)} onDelete={onDeleteBook} />
      ) : null}
    </div>
  );
};
