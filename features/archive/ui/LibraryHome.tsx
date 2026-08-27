import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import type { AuthorDeletePreview, AuthorSource, BookSource, Citation, DeleteAuthorCascadeResult } from '../../../types';
import { AuthorDeleteDialog } from './AuthorDeleteDialog';
import { handleMenuKeyboardNavigation } from '../../../shared/ui/sidebar/SidebarControls';
import { sortAuthorsByActivity } from '../logic/archiveTree';

type LibraryHomeProps = {
  authors: AuthorSource[];
  books: BookSource[];
  citations: Citation[];
  username: string;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void | Promise<void>;
  onCreateAuthor: (name: string) => Promise<AuthorSource | undefined>;
  onAuthorSelect: (author: AuthorSource) => void;
  onRenameAuthor: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  isMobileApp: boolean;
};

export const LibraryHome: React.FC<LibraryHomeProps> = ({
  authors = [],
  books = [],
  citations = [],
  username,
  loading,
  loadError,
  onRetry,
  onCreateAuthor,
  onAuthorSelect,
  onRenameAuthor,
  onDeleteAuthor,
  onPreviewAuthorDelete,
  isMobileApp,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuAuthorId, setActiveMenuAuthorId] = useState<string | null>(null);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [deletingAuthor, setDeletingAuthor] = useState<{ author: AuthorSource; preview: AuthorDeletePreview } | null>(null);
  const submitInFlightRef = useRef(false);
  const renameInFlightRef = useRef(false);
  const orderedAuthors = sortAuthorsByActivity(authors, citations);

  useEffect(() => {
    if (!activeMenuAuthorId) return;
    document.getElementById(`home-author-menu-${activeMenuAuthorId}`)?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const close = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest(`[data-home-author-menu="${activeMenuAuthorId}"]`)) {
        setActiveMenuAuthorId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        document.querySelector<HTMLButtonElement>(`button[data-home-author-menu="${activeMenuAuthorId}"]`)?.focus();
        setActiveMenuAuthorId(null);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeMenuAuthorId]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const author = await onCreateAuthor(trimmed);
      if (!author) return;
      setName('');
      setIsAdding(false);
      onAuthorSelect(author);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const startRename = (author: AuthorSource) => {
    setEditingAuthorId(author.id);
    setEditingName(author.name);
    setActiveMenuAuthorId(null);
  };

  const submitRename = async (authorId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed || renameInFlightRef.current) return;
    renameInFlightRef.current = true;
    setIsSubmittingRename(true);
    try {
      const didRename = await Promise.resolve(onRenameAuthor(authorId, trimmed));
      if (didRename === false) return;
      setEditingAuthorId(null);
      setEditingName('');
    } finally {
      renameInFlightRef.current = false;
      setIsSubmittingRename(false);
    }
  };

  const requestDelete = async (author: AuthorSource) => {
    setActiveMenuAuthorId(null);
    const preview = await onPreviewAuthorDelete(author.id);
    if (preview) setDeletingAuthor({ author, preview });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[76rem] px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pt-14">
        <header className="mb-10 flex items-end justify-between gap-5 border-b border-[var(--border-main)] pb-5">
          <div>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Authors</p>
            <h1 className="font-[var(--font-display-active)] text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--text-main)]">저자를 고르세요</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">저자를 열면 그 사람이 쓴 책과 저장한 문장이 이어집니다.</p>
          </div>
          <div className="hidden items-center gap-2 text-sm text-[var(--text-muted)] sm:flex">
            <UserRound size={16} />
            <span className="tabular-nums">{authors.length}명</span>
          </div>
        </header>

        {loadError ? (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
            <span>{loadError}</span>
            <button type="button" onClick={() => void onRetry()} className="min-h-10 rounded-lg px-3 font-semibold transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10 motion-reduce:transition-none">다시 시도</button>
          </div>
        ) : null}

        {loading && authors.length === 0 ? (
          <div className="py-24 text-center text-sm text-[var(--text-muted)]" role="status">저자를 불러오는 중…</div>
        ) : authors.length > 0 || !loadError ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 xl:grid-cols-5">
            <div className="min-w-0">
              {isAdding ? (
                <form
                  className="flex aspect-[0.82] flex-col justify-between rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-2 ring-[var(--accent-ring)]"
                  onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}
                  onSubmit={(event) => { event.preventDefault(); void submit(); }}
                >
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)]">새 저자</p>
                    <label className="mt-4 block">
                      <span className="sr-only">저자 이름</span>
                      <input autoFocus aria-label="저자 이름" value={name} onChange={(event) => setName(event.target.value)} placeholder="이름을 입력하세요" className="w-full border-0 border-b border-[var(--border-main)] bg-transparent px-0 py-2 font-[var(--font-display-active)] text-lg font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-0" />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={isSubmitting} onClick={() => { setIsAdding(false); setName(''); }} className="min-h-10 flex-1 rounded-lg px-2 text-sm text-[var(--text-muted)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95">취소</button>
                    <button type="submit" disabled={!name.trim() || isSubmitting} className="min-h-10 flex-1 rounded-lg bg-[var(--accent)] px-2 text-sm font-semibold text-white transition-[background-color,transform] active:scale-95 disabled:opacity-50">{isSubmitting ? '추가 중' : '추가'}</button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setIsAdding(true)} className="group flex aspect-[0.82] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-[background-color,transform] hover:-translate-y-1 hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-card)] shadow-[var(--shadow-card)]"><Plus size={21} /></span>
                  <span className="text-sm font-semibold">저자 추가</span>
                </button>
              )}
            </div>

            {orderedAuthors.map((author) => {
              const displayName = author.isSelf ? username : author.name.trim() || '이름 없는 저자';
              const bookCount = books.filter((book) => book.authorId === author.id).length;
              if (editingAuthorId === author.id) {
                return (
                  <form key={author.id} onSubmit={(event) => { event.preventDefault(); void submitRename(author.id); }} className="flex aspect-[0.82] min-w-0 flex-col justify-between rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-2 ring-[var(--accent-ring)]">
                    <div>
                      <p className="text-xs font-semibold text-[var(--accent)]">저자 이름 변경</p>
                      <input autoFocus aria-label={`${displayName} 이름 변경`} value={editingName} disabled={isSubmittingRename} onChange={(event) => setEditingName(event.target.value)} className="mt-4 w-full border-0 border-b border-[var(--border-main)] bg-transparent px-0 py-2 font-[var(--font-display-active)] text-lg font-semibold text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-0" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={isSubmittingRename} onClick={() => { setEditingAuthorId(null); setEditingName(''); }} className="min-h-10 flex-1 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] active:scale-95">취소</button>
                      <button type="submit" disabled={!editingName.trim() || isSubmittingRename} className="min-h-10 flex-1 rounded-lg bg-[var(--accent)] text-sm font-semibold text-white active:scale-95 disabled:opacity-50">저장</button>
                    </div>
                  </form>
                );
              }
              return (
                <div key={author.id} className="group relative min-w-0" onContextMenu={(event) => { if (author.isSelf) return; event.preventDefault(); setActiveMenuAuthorId(author.id); }}>
                  <button type="button" onClick={() => onAuthorSelect(author)} aria-label={`${displayName}의 책 보기`} className="min-w-0 w-full text-left transition-transform duration-200 active:scale-95 motion-reduce:transition-none">
                  <span className="relative flex aspect-[0.82] flex-col overflow-hidden rounded-xl bg-[var(--bg-card)] p-5 shadow-[0_10px_24px_rgba(31,29,27,0.1)] transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_16px_30px_rgba(31,29,27,0.15)] motion-reduce:transition-none">
                    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[var(--accent)] opacity-80" />
                    <span className="flex h-full min-h-0 flex-col items-center justify-center text-center">
                      <span className="line-clamp-3 break-words font-[var(--font-display-active)] text-[clamp(1.25rem,2.5vw,1.65rem)] font-semibold leading-[1.3] tracking-[-0.02em] text-[var(--text-main)]">{displayName}</span>
                      <span className="mt-3 text-xs tabular-nums text-[var(--text-muted)]">책 {bookCount}권</span>
                    </span>
                  </span>
                  </button>
                  {!author.isSelf ? (
                    <button type="button" data-home-author-menu={author.id} aria-label={`${displayName} 관리`} aria-haspopup="menu" aria-controls={`home-author-menu-${author.id}`} aria-expanded={activeMenuAuthorId === author.id} onClick={(event) => { event.stopPropagation(); setActiveMenuAuthorId((current) => current === author.id ? null : author.id); }} className={["absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-card)] text-[var(--text-main)] shadow-[var(--shadow-card)] transition-[opacity,transform] active:scale-95", isMobileApp ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'].join(' ')}>
                      <MoreHorizontal size={18} />
                    </button>
                  ) : null}
                  {activeMenuAuthorId === author.id ? (
                    <div id={`home-author-menu-${author.id}`} data-home-author-menu={author.id} role="menu" onKeyDown={handleMenuKeyboardNavigation} className="absolute bottom-3 right-[3.25rem] z-20 w-24 rounded-xl bg-[var(--bg-card)] p-1 shadow-[var(--shadow-popover)]">
                      <button type="button" role="menuitem" onClick={() => startRename(author)} className="flex min-h-10 w-full items-center gap-1.5 rounded-lg px-2 text-left text-sm hover:bg-[var(--sidebar-hover)]"><Pencil size={13} />이름 변경</button>
                      <button type="button" role="menuitem" onClick={() => void requestDelete(author)} className="flex min-h-10 w-full items-center gap-1.5 rounded-lg px-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={13} />삭제</button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      {deletingAuthor ? (
        <AuthorDeleteDialog authorId={deletingAuthor.author.id} authorName={deletingAuthor.author.name} bookCount={deletingAuthor.preview.bookCount} citationCount={deletingAuthor.preview.citationCount} onClose={() => setDeletingAuthor(null)} onDelete={onDeleteAuthor} />
      ) : null}
    </div>
  );
};
